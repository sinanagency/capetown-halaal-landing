// Human handover state for the festival WhatsApp bot.
//
// When a user types "talk to human" / "speak to support" / "agent" / etc., the
// bot stops auto-responding to them and Samreen takes over via /admin/bot-inbox.
// Same DDL-free pattern as lib/bot/admin-chat.ts (markers stored as a body
// prefix on outbound wa_messages rows):
//
//   [HUMAN_HANDOVER_ON]   ← bot pauses for this phone, Samreen handles
//   [HUMAN_HANDOVER_OFF]  ← bot resumes auto-replies
//
// State recovery: scan recent outbound wa_messages for the user's phone and
// take the most recent ON/OFF marker. Auto-expires after 24h with no further
// exchange (resumes auto-bot).

import { createAdminClient } from '@/lib/supabase/admin'
import { sendText } from '@/lib/whatsapp'

const ON_MARKER = '[HUMAN_HANDOVER_ON]'
const OFF_MARKER = '[HUMAN_HANDOVER_OFF]'
const TTL_MS = 24 * 60 * 60 * 1000

/** Phrases that escalate the conversation to a human handler. */
const HUMAN_KEYWORDS = [
  /\btalk to (a |the )?human\b/i,
  /\bspeak to (a |the )?(human|person|agent|support|someone)\b/i,
  /\b(real|live) (person|human)\b/i,
  /^human$/i,
  /^agent$/i,
  /^support$/i,
  /\bcontact support\b/i,
  /\bhelp from a human\b/i,
  /\bsomeone to help\b/i,
  /\btalk to samreen\b/i,
]

export function detectHumanIntent(text: string): boolean {
  if (!text) return false
  return HUMAN_KEYWORDS.some((re) => re.test(text))
}

/** Persist an ON or OFF marker for a phone. */
async function writeMarker(waPhone: string, marker: typeof ON_MARKER | typeof OFF_MARKER, note: string): Promise<void> {
  const db = createAdminClient()
  await db.from('wa_messages').insert({
    direction: 'out',
    wa_phone: waPhone,
    body: `${marker} ${note}`,
    status: 'logged',
    provider_message_id: null,
  })
}

/** Flip the bot to OFF (human-handling) for this user. */
export async function escalateToHuman(waPhone: string, reason: string): Promise<void> {
  await writeMarker(waPhone, ON_MARKER, reason.slice(0, 200))
}

/** Release the user back to the bot. */
export async function releaseToBot(waPhone: string, note: string = 'released by admin'): Promise<void> {
  await writeMarker(waPhone, OFF_MARKER, note.slice(0, 200))
}

/**
 * Is this phone currently being handled by a human?
 *
 * True if the most recent ON marker (within TTL_MS) is more recent than the
 * most recent OFF marker.
 */
export async function isInHandover(waPhone: string): Promise<boolean> {
  const db = createAdminClient()
  const since = new Date(Date.now() - TTL_MS).toISOString()
  const { data } = await db
    .from('wa_messages')
    .select('body, created_at')
    .eq('wa_phone', waPhone)
    .eq('direction', 'out')
    .gte('created_at', since)
    .or(`body.ilike.${ON_MARKER}%,body.ilike.${OFF_MARKER}%`)
    .order('created_at', { ascending: false })
    .limit(1)
  const row = data?.[0]
  if (!row) return false
  return String(row.body).startsWith(ON_MARKER)
}
