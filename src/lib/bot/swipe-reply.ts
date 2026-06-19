// Swipe-to-reply routing for admin handover.
//
// When a vendor asks for a human, notifyOwners sends Samreen/Taona an alert on
// WhatsApp. If the admin SWIPE-REPLIES to that alert, Meta includes the alert's
// wamid in the inbound `context.id`. We use that to route the admin's reply
// straight back to the vendor — no "to +27…" command needed.
//
// No new table (CTH Supabase DDL is blocked — CLAUDE.md Law 8): we recover the
// vendor's phone by reading back the wa_messages row we logged when the alert
// was sent (provider_message_id = the alert's wamid) and parsing the phone out
// of its body. The handover alert body always carries `Phone: +27…`.

import { createAdminClient } from '@/lib/supabase/admin'

const HANDOVER_HINT = /vendor support|talk to a human|ongoing handover|handover/i
const PHONE_RE = /\+\d{10,15}/

export interface SwipeTarget {
  vendorE164: string
}

/**
 * Resolve which vendor an admin's swipe-reply is aimed at.
 * Returns null if the replied-to message isn't a handover alert (so a swipe on
 * a stats reply or an approval digest does NOT misfire to a random vendor).
 */
export async function resolveSwipeReplyTarget(replyToWamid: string | undefined): Promise<SwipeTarget | null> {
  if (!replyToWamid) return null
  const db = createAdminClient()
  const { data } = await db
    .from('wa_messages')
    .select('body, direction')
    .eq('provider_message_id', replyToWamid)
    .eq('direction', 'out')
    .limit(1)
  const row = data?.[0] as { body?: string } | undefined
  if (!row?.body || !HANDOVER_HINT.test(row.body)) return null
  const m = row.body.match(PHONE_RE)
  if (!m) return null
  return { vendorE164: m[0] }
}
