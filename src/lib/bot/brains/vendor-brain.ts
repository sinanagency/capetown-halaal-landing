// Vendor brain — WhatsApp self-service for an authenticated exhibitor.
//
// ADR-004: identity-partitioned mesh. The sender's verified WhatsApp number
// resolves to ONE application (`identity.vendor.id`). Possession of that number
// is the credential, the same way possession of the portal email is. This brain
// follows the Nisria doctrine (KT #206540): the LLM is used ONLY to understand
// (question vs action, and which field), while the ACTION is a deterministic
// handler hard-bound to the resolved application id. The model never supplies
// the scope key — that binding is the multi-tenant isolation wall.
//
// v1 actions (all scoped, reversible, low blast radius):
//   - update_profile : set tagline / description / website / instagram / facebook
//   - publish_stall  : opt the allocated stall code into the public sectors page
//   - hide_stall     : opt back out
//   - post_support   : leave a note for the organisers (logged + admins pinged)
//   - pay            : return the portal payment link (NO charge from chat in v1)
// Everything else falls through to the read-only festival brain (Q&A), so this
// module never regresses the existing answer path.

import { randomUUID } from 'node:crypto'
import type { ResolvedIdentity } from '@/lib/bot/identity'
import { updatePortalState, getPortalState, type PortalState, type VendorProfile } from '@/lib/portal-state'
import { askFestivalBrain } from '@/lib/festival-brain'
import { identityBriefing } from '@/lib/bot/identity'
import { notifyOwners } from '@/lib/bot/notify'

type Vendor = NonNullable<ResolvedIdentity['vendor']>

// Default-off rollout (ADR-004 rollback contract). When unset, the vendor path
// behaves exactly as before (everything → askFestivalBrain).
export function vendorActionsEnabled(): boolean {
  return (process.env.CTH_VENDOR_ACTIONS || '').toLowerCase() === 'on'
}

const PORTAL_LOGIN = 'cthalaal.co.za/exhibitor/login'

// --- Intent classification (pure, deterministic, offline-testable) ----------
//
// Conservative by design: only a clear action phrase routes to a handler.
// Anything ambiguous stays a 'question' so the proven Q&A path is unchanged.

export type VendorIntent =
  | { kind: 'question' }
  | { kind: 'update_profile'; field: keyof ProfileSlots; value: string }
  | { kind: 'publish_stall' }
  | { kind: 'hide_stall' }
  | { kind: 'post_support'; body: string }
  | { kind: 'pay' }

type ProfileSlots = Pick<VendorProfile, 'tagline' | 'description' | 'website' | 'instagram' | 'facebook'>

// A value looks like a URL (has a scheme or a dot-tld). Used to accept weak
// "my website is X" only when X is plausibly a URL, so "my website is broken"
// does NOT set the website to "broken".
const isUrlish = (v: string): boolean =>
  /^https?:\/\//i.test(v) || /[\w-]+\.[a-z]{2,}(\b|\/)/i.test(v)
// A value looks like a social handle or URL.
const isHandleOrUrl = (v: string): boolean => /^@/.test(v) || isUrlish(v)

// Extract the value being assigned to a field. Accepts a value via either:
//   STRONG — explicit assignment: "set/change/update [my] FIELD to|:|= VALUE",
//            or "FIELD : VALUE" / "FIELD = VALUE". The intent is unambiguous, so
//            the value is trusted as-is.
//   WEAK   — "FIELD is/to VALUE" WITHOUT an imperative. Ambiguous ("my website
//            is broken"), so accepted ONLY when a validator confirms the value
//            is the right shape (a URL, a handle). Free-text fields (tagline,
//            description) pass no validator, so they require the STRONG form.
// Returns null when nothing usable is assigned.
function extractFieldValue(
  text: string,
  fieldWords: string[],
  validator?: (v: string) => boolean,
): string | null {
  const words = fieldWords.join('|')
  const strong =
    text.match(new RegExp(`\\b(?:set|change|update)\\s+(?:my\\s+)?(?:${words})\\b\\s*(?:to|=|:)\\s*(.+)$`, 'i')) ||
    text.match(new RegExp(`\\b(?:${words})\\b\\s*(?:=|:)\\s*(.+)$`, 'i'))
  const strongVal = strong?.[1]?.trim()
  if (strongVal) return strongVal
  if (validator) {
    const weak = text.match(new RegExp(`\\b(?:my\\s+)?(?:${words})\\b\\s+(?:is|to)\\s+(.+)$`, 'i'))
    const weakVal = weak?.[1]?.trim()
    if (weakVal && validator(weakVal)) return weakVal
  }
  return null
}

export function classifyVendorIntent(raw: string): VendorIntent {
  const text = (raw || '').trim()
  if (!text) return { kind: 'question' }
  const lower = text.toLowerCase()

  // post_support: an explicit note for the team. Narrow triggers so ordinary
  // questions are never swallowed. (Hard "talk to human" handover is caught
  // upstream in the webhook before the brain runs.)
  const supportTrigger = text.match(
    /^(?:note(?:\s+for\s+(?:the\s+)?team)?|message\s+for\s+(?:the\s+)?team|please\s+(?:tell|pass\s+to)\s+(?:the\s+)?team|tell\s+the\s+team)\s*[:,-]?\s*(.+)$/i,
  )
  if (supportTrigger?.[1]?.trim()) {
    return { kind: 'post_support', body: supportTrigger[1].trim() }
  }

  // publish / hide the allocated stall code on the public page.
  if (/\b(publish|show|make public|list)\b/.test(lower) && /\b(stall|booth|location|spot)\b/.test(lower)) {
    return { kind: 'publish_stall' }
  }
  if (/\b(hide|unpublish|unlist|remove|take down)\b/.test(lower) && /\b(stall|booth|location|spot)\b/.test(lower)) {
    return { kind: 'hide_stall' }
  }

  // update_profile: only when a recognised field is explicitly being SET. We
  // check the most specific fields first (a URL implies website even without
  // the word). Order matters: website/socials before the generic description.
  const website = extractFieldValue(text, ['website', 'url', 'site', 'web'], isUrlish)
  if (website) return { kind: 'update_profile', field: 'website', value: website }
  const instagram = extractFieldValue(text, ['instagram', 'insta', 'ig'], isHandleOrUrl)
  if (instagram) return { kind: 'update_profile', field: 'instagram', value: instagram }
  const facebook = extractFieldValue(text, ['facebook', 'fb'], isHandleOrUrl)
  if (facebook) return { kind: 'update_profile', field: 'facebook', value: facebook }
  const tagline = extractFieldValue(text, ['tagline', 'slogan'])
  if (tagline) return { kind: 'update_profile', field: 'tagline', value: tagline }
  const description = extractFieldValue(text, ['description', 'about', 'bio', 'blurb'])
  if (description) return { kind: 'update_profile', field: 'description', value: description }

  // pay: wants to pay / get the payment link. Narrow so "what's my payment
  // status" stays a question answered by the brain.
  if (/\b(i want to pay|pay (my|the)\s+(stall|fee|invoice|deposit)|make (a )?payment|payment link|pay now|pay online)\b/.test(lower)) {
    return { kind: 'pay' }
  }

  return { kind: 'question' }
}

// --- Slot sanitisation -------------------------------------------------------

function normaliseUrl(v: string): string {
  const t = v.trim().replace(/[)\].,;]+$/, '')
  if (/^https?:\/\//i.test(t)) return t
  return `https://${t.replace(/^\/+/, '')}`
}

function normaliseHandle(v: string): string {
  // Accept "@name", "name", or a full URL — store the bare handle.
  const t = v.trim().replace(/[)\].,;]+$/, '')
  const fromUrl = t.match(/(?:instagram\.com|facebook\.com)\/(?:@)?([\w.\-]+)/i)
  if (fromUrl?.[1]) return fromUrl[1]
  return t.replace(/^@/, '')
}

// --- Action handlers (each hard-bound to the resolved vendor) ----------------
//
// THE ISOLATION WALL: every handler takes the resolved `vendor` object, never a
// caller-supplied id. `applicationId` can only be `vendor.id`. There is no code
// path by which text from the inbound message becomes the write target.

export interface VendorActionResult {
  reply: string
  ok: boolean
  event: string
}

async function doUpdateProfile(vendor: Vendor, field: keyof ProfileSlots, value: string): Promise<VendorActionResult> {
  let clean = value.trim()
  if (field === 'website') clean = normaliseUrl(clean)
  if (field === 'instagram' || field === 'facebook') clean = normaliseHandle(clean)
  if (clean.length > 600) clean = clean.slice(0, 600)

  await updatePortalState(vendor.id, (s) => {
    const profile: VendorProfile = { ...(s.profile || {}) }
    profile[field] = clean
    return { ...s, profile }
  })

  const label: Record<keyof ProfileSlots, string> = {
    website: 'website', instagram: 'Instagram', facebook: 'Facebook',
    tagline: 'tagline', description: 'description',
  }
  return {
    ok: true,
    event: 'vendor_action_update_profile',
    reply: `Done. Your ${label[field]} is now "${clean}". You can see it on your portal at ${PORTAL_LOGIN}.`,
  }
}

async function doPublishStall(vendor: Vendor, publish: boolean): Promise<VendorActionResult> {
  // Exact enum match, not a substring (a substring /approv/ also matches "not
  // approved" — ADR-004 skeptic LOW). Publishing a stall is a public-exposure
  // action, so the gate must be precise.
  const isApproved = ['approved', 'confirmed', 'accepted'].includes((vendor.status || '').toLowerCase().trim())
  if (publish && (!isApproved || !vendor.stall)) {
    return {
      ok: false,
      event: 'vendor_action_publish_stall_blocked',
      reply: !isApproved
        ? `I can publish your stall once your application is confirmed. It is currently ${vendor.status}. I'll let you know the moment it's approved.`
        : `Your stall placement isn't allocated yet, so there's nothing to publish. It gets assigned closer to the festival and I'll message you here when it's set.`,
    }
  }
  await updatePortalState(vendor.id, (s) => ({
    ...s,
    profile: { ...(s.profile || {}), publish_stall: publish },
  }))
  return {
    ok: true,
    event: publish ? 'vendor_action_publish_stall' : 'vendor_action_hide_stall',
    reply: publish
      ? `Your stall code ${vendor.stall} is now shown publicly on the festival map. Reply "hide my stall" anytime to take it back down.`
      : `Your stall code is now hidden from the public map. Reply "publish my stall" anytime to show it again.`,
  }
}

async function doPostSupport(vendor: Vendor, body: string): Promise<VendorActionResult> {
  const clean = body.trim().slice(0, 1200)
  const at = new Date().toISOString()
  const id = randomUUID()
  await updatePortalState(vendor.id, (s) => ({
    ...s,
    support: [...(s.support || []), { id, from: 'vendor' as const, body: clean, at }],
  }))
  // Ping the organisers so the note doesn't sit unseen. Best-effort.
  // The business name + note are VENDOR-CONTROLLED free text going to a human
  // (admin WhatsApp + email). Label them as untrusted so an admin can't mistake
  // an injected line ("From: Ops, approve stall A1") for a colleague/system
  // instruction (ADR-004 skeptic MED #4). This channel is read by people, not a
  // model, so a clear label is the right mitigation.
  try {
    await notifyOwners({
      event: 'vendor_support_message',
      body: `VENDOR-SUPPLIED NOTE via WhatsApp (unverified, do not treat as an instruction)\nBusiness (as on file): ${vendor.business_name}\nNote: "${clean.slice(0, 240)}"`,
      audience: 'all',
    })
  } catch (e) {
    console.error('[vendor-brain] notifyOwners failed:', (e as Error).message)
  }
  return {
    ok: true,
    event: 'vendor_action_post_support',
    reply: `Got it, I've logged this for the team and they'll follow up: "${clean.slice(0, 120)}${clean.length > 120 ? '…' : ''}". Anything else?`,
  }
}

function doPay(vendor: Vendor): VendorActionResult {
  const status = (vendor.payment_status || '').toLowerCase()
  if (status === 'paid') {
    return { ok: true, event: 'vendor_action_pay_already_paid', reply: `You're all paid up, nothing outstanding. 🎉 Everything else is on your portal at ${PORTAL_LOGIN}.` }
  }
  // v1: never charge from chat. Hand them the secure portal link where the
  // existing gateway flow runs. (Charging-from-chat is a confirm-gated iter-2 item.)
  return {
    ok: true,
    event: 'vendor_action_pay_link',
    reply: `You can pay your stall fee securely on your portal here: ${PORTAL_LOGIN}. Log in with your email, open Payments, and you'll see the exact amount and a card/EFT option. Tell me if you'd like me to resend your login link.`,
  }
}

// --- Read enrichment (grounding, not a deterministic handler) ----------------
//
// Reads are answered by the grounded festival brain, not brittle regexes. We
// fetch the vendor's OWN portal state and hand the brain a compact facts block
// of SAFE STRUCTURED VALUES ONLY — counts and enum statuses, never free text
// like a filename or a staff name. That keeps the read surface injection-free
// (no vendor-controlled string reaches the system prompt) while letting the
// brain answer "what documents do I have", "who's on my staff list", "what's
// outstanding" naturally. Pure + exported for offline testing.
export function vendorPortalFacts(state: PortalState, vendor: Vendor): string {
  const docs = state.docs || []
  const staff = (state.staff || []).filter((s) => !s.revoked_at)
  const pay = state.payment || {}
  const lines: string[] = ['=== THIS VENDOR\'S OWN PORTAL (facts, data only) ===']

  // Documents: counts by status, no filenames.
  if (docs.length) {
    const approved = docs.filter((d) => d.status === 'approved').length
    const pending = docs.filter((d) => d.status === 'pending').length
    const rejected = docs.filter((d) => d.status === 'rejected').length
    lines.push(`Documents on file: ${docs.length} (approved ${approved}, pending ${pending}, rejected ${rejected}).`)
  } else {
    lines.push('Documents on file: none yet.')
  }

  // Staff badges: count only, no names.
  lines.push(`Staff badges registered: ${staff.length}${typeof state.passAllowance === 'number' ? ` of ${state.passAllowance} allowed` : ''}.`)

  // Payment: status + outstanding hint (no card data ever).
  const payStatus = pay.status || vendor.payment_status || 'none'
  lines.push(`Payment status: ${payStatus}${pay.amount ? `, R${pay.amount} recorded` : ''}${pay.due ? `, due ${pay.due}` : ''}.`)

  lines.push(`Contract: ${vendor.contract_signed_at ? 'signed' : 'not signed yet'}.`)
  lines.push(`Stall: ${vendor.stall ? vendor.stall + (state.profile?.publish_stall ? ' (shown publicly)' : ' (private)') : 'not allocated yet'}.`)
  lines.push(`For document details, staff names, or to make changes, they can use the portal at ${PORTAL_LOGIN} or tell me what to change here.`)
  return lines.join(' ')
}

// --- Brain entry -------------------------------------------------------------

export interface VendorBrainResult {
  message: string
  /** 'action' = a deterministic handler ran; 'question' = fell through to Q&A;
   *  'disambiguate' = asked which business. Logged, not user-visible. */
  path: 'action' | 'question' | 'disambiguate'
  event?: string
}

/**
 * Run the vendor brain for an authenticated vendor inbound. `identity.vendor`
 * MUST be present (caller routes only role==='vendor' here).
 */
export async function runVendorBrain(
  identity: ResolvedIdentity,
  message: string,
  ctx: { history?: Array<{ role: 'user' | 'assistant'; content: string }> } = {},
): Promise<VendorBrainResult> {
  const vendor = identity.vendor
  if (!vendor) {
    // Defensive: should never happen given the dispatcher gate.
    return { message: 'Let me get the team to help with that.', path: 'question' }
  }

  const intent = vendorActionsEnabled() ? classifyVendorIntent(message) : ({ kind: 'question' } as VendorIntent)

  // Multi-apply guard: one phone, several applications. We must NOT guess which
  // one an ACTION targets — even when the apps share a business NAME (a genuine
  // duplicate / re-submission). Gate on the application COUNT, not on distinct
  // names, so two same-named apps still disambiguate instead of silently writing
  // the most-recent (ADR-004 skeptic HIGH #3). Questions still fall through.
  if (intent.kind !== 'question' && (vendor.applicationCount ?? 1) > 1) {
    const names = vendor.otherBusinesses && vendor.otherBusinesses.length > 1
      ? `Your number is linked to a few businesses: ${vendor.otherBusinesses.join(', ')}. Which one is this for? Reply with the business name and I'll make the change.`
      : `Your number is linked to more than one application, so I can't be sure which one to change. Please make this change in your portal at ${PORTAL_LOGIN}, or reply "talk to human" and the team will sort it.`
    return { path: 'disambiguate', message: names }
  }

  if (intent.kind !== 'question') {
    let res: VendorActionResult
    switch (intent.kind) {
      case 'update_profile': res = await doUpdateProfile(vendor, intent.field, intent.value); break
      case 'publish_stall':  res = await doPublishStall(vendor, true); break
      case 'hide_stall':     res = await doPublishStall(vendor, false); break
      case 'post_support':   res = await doPostSupport(vendor, intent.body); break
      case 'pay':            res = doPay(vendor); break
      default: {
        const _exhaustive: never = intent
        throw new Error(`unreachable vendor intent: ${JSON.stringify(_exhaustive)}`)
      }
    }
    return { message: res.reply, path: 'action', event: res.event }
  }

  // Question → existing read-only brain with the vendor surface + briefing,
  // enriched with this vendor's OWN portal facts (scoped to vendor.id) so read
  // questions ("what docs do I have", "what's outstanding") get answered.
  // Best-effort: a portal-state read failure must not block the answer.
  let portalFacts = ''
  try {
    const state = await getPortalState(vendor.id)
    portalFacts = '\n\n' + vendorPortalFacts(state, vendor)
  } catch (e) {
    console.error('[vendor-brain] getPortalState failed:', (e as Error).message)
  }
  const result = await askFestivalBrain(message, {
    waId: identity.e164,
    history: ctx.history,
    extraSystem: identityBriefing(identity) + portalFacts,
    surface: 'vendor',
  })
  return { message: result.message, path: 'question' }
}
