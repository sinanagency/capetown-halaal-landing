/**
 * Festival brain entry point.
 *
 * Pipeline:
 *   Step 0: classifyIntent (fast regex).
 *   Step 1: matchFaq pattern match. If hit AND intent confidence >= 0.55 => canonical answer, no LLM.
 *   Step 2: confidence < 0.6 => escalate to human, return holding message.
 *   Step 3: LLM call with tightened system prompt + FAQ grounding.
 *   Step 4: post-process (strip em-dashes, strip forbidden self-refs, append Zanii sign-off
 *           only on first-contact OR sign-off OR identity-question).
 *
 * Sign-off rule: track first-contact via wa_messages last-24h direction=out count == 0.
 *   First contact => append signature.
 *   Identity question (intent maps via isIdentityQuestion()) => append signature.
 *   Explicit sign-off context (caller passes signOff:true) => append signature.
 *   Otherwise => no signature.
 */

import Anthropic from '@anthropic-ai/sdk'
import { classifyIntent, intentFaqKeys, Intent, IntentResult } from './festival-brain/intents'
import { matchFaq, buildGroundingContext, FaqEntry } from './festival-brain/faq'
import {
  buildSystemPrompt,
  stripEmDashes,
  stripForbiddenSelfRefs,
  ZANII_FIRST_CONTACT_SIGNOFF,
  ZANII_IDENTITY_LINE,
} from './festival-brain/system-prompt'
import { createAdminClient } from './supabase/admin'

export interface BrainContext {
  /** WhatsApp wa_id / phone for the inbound sender. Used to look up wa_messages. */
  waId?: string
  /** If caller already knows this is a first-contact, pass true to skip the lookup. */
  forceFirstContact?: boolean
  /** If caller wants the sign-off appended (e.g. final goodbye). */
  signOff?: boolean
  /** Recent conversation turns to give the LLM context. Newest last. */
  history?: Array<{ role: 'user' | 'assistant'; content: string }>
}

export interface BrainResult {
  message: string
  /** Why we answered the way we did. Logged, not user-visible. */
  trace: {
    intent: IntentResult
    matchedFaq: string | null
    pathTaken: 'faq' | 'escalate' | 'llm' | 'identity'
    isFirstContact: boolean
    needsHuman: boolean
    signoffAppended: boolean
  }
  /** Caller should record this for follow-up. */
  needsHuman: boolean
}

const HOLDING_MESSAGE =
  "Let me get Samreen on this, she will reply within a few hours."

const client = process.env.ANTHROPIC_API_KEY ? new Anthropic() : null

/**
 * Detect questions about identity: "who are you", "are you a bot", etc.
 */
function isIdentityQuestion(message: string): boolean {
  const text = message.toLowerCase()
  return (
    /\b(who|what) (are|r) (you|u)\b/.test(text) ||
    /\bare you (a |an )?(bot|human|person|real|ai|robot)\b/.test(text) ||
    /\bwhat (are|r) (you|u)\b/.test(text) ||
    /\bwho am i (talking|chatting|speaking) (to|with)\b/.test(text) ||
    /\bis this (a |an )?(bot|human|person|real)\b/.test(text)
  )
}

/**
 * Look up wa_messages to decide if this is a first-contact conversation
 * (zero outbound from us in the last 24h to this wa_id).
 *
 * Defensive: if the table is missing or the env is not wired, default to true
 * so we err on the side of identifying ourselves.
 */
async function isFirstContactByWaId(waId: string): Promise<boolean> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return true
    }
    const sb = createAdminClient()
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { count, error } = await sb
      .from('wa_messages')
      .select('id', { count: 'exact', head: true })
      .eq('wa_id', waId)
      .eq('direction', 'out')
      .gte('created_at', since)

    if (error) {
      // Table missing or RLS denied: be safe, sign off
      return true
    }
    return (count ?? 0) === 0
  } catch {
    return true
  }
}

/**
 * Record an escalation. The portal surfaces these in the "Needs You" queue.
 * Defensive: never throw to the caller.
 */
async function escalateToHuman(opts: {
  waId?: string
  message: string
  intent: IntentResult
  reason: string
}): Promise<void> {
  try {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return
    const sb = createAdminClient()
    await sb.from('brain_escalations').insert({
      wa_id: opts.waId ?? null,
      message: opts.message,
      intent: opts.intent.intent,
      confidence: opts.intent.confidence,
      reason: opts.reason,
      created_at: new Date().toISOString(),
    })
  } catch {
    // brain_escalations table may not exist yet in this env. Silent.
  }
}

function postProcess(text: string): string {
  return stripEmDashes(stripForbiddenSelfRefs(text)).trim()
}

/**
 * Main entry. Inbound message in, polished outbound text out.
 */
export async function askFestivalBrain(
  message: string,
  context: BrainContext = {},
): Promise<BrainResult> {
  const intent = classifyIntent(message)
  const identityQ = isIdentityQuestion(message)

  // Step 0a: identity question shortcut. Never let the LLM answer this from memory.
  if (identityQ) {
    const isFirstContact = context.forceFirstContact ?? (context.waId ? await isFirstContactByWaId(context.waId) : true)
    const out = ZANII_IDENTITY_LINE + ZANII_FIRST_CONTACT_SIGNOFF
    return {
      message: postProcess(out),
      needsHuman: false,
      trace: {
        intent,
        matchedFaq: null,
        pathTaken: 'identity',
        isFirstContact,
        needsHuman: false,
        signoffAppended: true,
      },
    }
  }

  // Step 0b: explicit human request always escalates.
  if (intent.intent === 'human_request') {
    await escalateToHuman({
      waId: context.waId,
      message,
      intent,
      reason: 'user explicitly requested a human',
    })
    return {
      message: postProcess(HOLDING_MESSAGE),
      needsHuman: true,
      trace: {
        intent,
        matchedFaq: null,
        pathTaken: 'escalate',
        isFirstContact: context.forceFirstContact ?? true,
        needsHuman: true,
        signoffAppended: false,
      },
    }
  }

  // Step 0c: spam => silent drop equivalent (still returns a polite line, but escalates).
  if (intent.intent === 'spam' && intent.confidence >= 0.6) {
    await escalateToHuman({ waId: context.waId, message, intent, reason: 'looks like spam' })
    return {
      message: postProcess(HOLDING_MESSAGE),
      needsHuman: true,
      trace: {
        intent,
        matchedFaq: null,
        pathTaken: 'escalate',
        isFirstContact: context.forceFirstContact ?? true,
        needsHuman: true,
        signoffAppended: false,
      },
    }
  }

  // Step 1: FAQ pattern match.
  const faqHit: FaqEntry | null = matchFaq(message)
  const isFirstContact =
    context.forceFirstContact ?? (context.waId ? await isFirstContactByWaId(context.waId) : true)

  if (faqHit && intent.confidence >= 0.55) {
    let out = faqHit.answer
    if (isFirstContact || context.signOff) {
      out = out + ZANII_FIRST_CONTACT_SIGNOFF
    }
    return {
      message: postProcess(out),
      needsHuman: false,
      trace: {
        intent,
        matchedFaq: faqHit.key,
        pathTaken: 'faq',
        isFirstContact,
        needsHuman: false,
        signoffAppended: isFirstContact || !!context.signOff,
      },
    }
  }

  // Step 2: low confidence => escalate.
  if (intent.confidence < 0.6) {
    await escalateToHuman({
      waId: context.waId,
      message,
      intent,
      reason: `confidence ${intent.confidence.toFixed(2)} below 0.6`,
    })
    return {
      message: postProcess(HOLDING_MESSAGE),
      needsHuman: true,
      trace: {
        intent,
        matchedFaq: null,
        pathTaken: 'escalate',
        isFirstContact,
        needsHuman: true,
        signoffAppended: false,
      },
    }
  }

  // Step 3: LLM with tightened prompt + grounding.
  if (!client) {
    // No API key configured: degrade gracefully.
    return {
      message: postProcess(HOLDING_MESSAGE),
      needsHuman: true,
      trace: {
        intent,
        matchedFaq: null,
        pathTaken: 'escalate',
        isFirstContact,
        needsHuman: true,
        signoffAppended: false,
      },
    }
  }

  const grounding = buildGroundingContext(intentFaqKeys(intent.intent))
  const system = buildSystemPrompt(intent.intent, grounding)

  const history = (context.history ?? []).slice(-8)
  const llmMessages = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: message },
  ]

  let llmText = ''
  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 280,
      system,
      messages: llmMessages,
    })
    llmText = response.content[0]?.type === 'text' ? response.content[0].text : ''
  } catch (err) {
    console.error('[festival-brain] llm error', err)
    await escalateToHuman({ waId: context.waId, message, intent, reason: 'llm error' })
    return {
      message: postProcess(HOLDING_MESSAGE),
      needsHuman: true,
      trace: {
        intent,
        matchedFaq: null,
        pathTaken: 'escalate',
        isFirstContact,
        needsHuman: true,
        signoffAppended: false,
      },
    }
  }

  if (!llmText.trim()) {
    await escalateToHuman({
      waId: context.waId,
      message,
      intent,
      reason: 'empty LLM response',
    })
    return {
      message: postProcess(HOLDING_MESSAGE),
      needsHuman: true,
      trace: {
        intent,
        matchedFaq: null,
        pathTaken: 'escalate',
        isFirstContact,
        needsHuman: true,
        signoffAppended: false,
      },
    }
  }

  let out = llmText
  const appendSig = isFirstContact || !!context.signOff
  if (appendSig) {
    out = out.trim() + ZANII_FIRST_CONTACT_SIGNOFF
  }

  return {
    message: postProcess(out),
    needsHuman: false,
    trace: {
      intent,
      matchedFaq: null,
      pathTaken: 'llm',
      isFirstContact,
      needsHuman: false,
      signoffAppended: appendSig,
    },
  }
}
