/**
 * Mail fetcher cron — pulls UNSEEN messages from the support inbox and lands
 * them as rows in mail_messages, then opens / refreshes a wa_threads row so
 * the unified inbox surfaces the conversation.
 *
 * Runs every 2 minutes via vercel.json. Idempotent on Message-ID.
 *
 * Operates against the planned Stream-B mail_messages table:
 *   id UUID PK, thread_id UUID -> wa_threads.id, message_id TEXT UNIQUE,
 *   from_address TEXT, from_name TEXT, to_address TEXT, subject TEXT,
 *   body TEXT, body_html TEXT, direction TEXT, vendor_application_id UUID NULL,
 *   received_at TIMESTAMPTZ, created_at TIMESTAMPTZ
 *
 * If mail_messages does not exist yet (Stream-B not shipped), the writer
 * surfaces the error in the response but does NOT crash the cron — the IMAP
 * messages stay UNSEEN and get retried on the next run.
 */

import { NextResponse } from 'next/server'
import { ImapFlow, type FetchMessageObject } from 'imapflow'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyCronAuth } from '@/lib/security/cron-auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 60

interface VendorMatch {
  id: string
  contact_name: string | null
  business_name: string | null
}

function parseAddress(raw: string | undefined): { address: string; name: string | null } {
  if (!raw) return { address: '', name: null }
  // imapflow gives us "Name <addr@x>" or just "addr@x"
  const m = raw.match(/^\s*"?([^"<]+?)"?\s*<([^>]+)>\s*$/)
  if (m) {
    return { address: m[2].trim().toLowerCase(), name: m[1].trim() || null }
  }
  const addr = raw.trim().toLowerCase()
  return { address: addr, name: null }
}

async function findVendorByEmail(
  supabase: ReturnType<typeof createAdminClient>,
  email: string
): Promise<VendorMatch | null> {
  if (!email) return null
  const { data, error } = await supabase
    .from('vendor_applications')
    .select('id,contact_name,business_name')
    .eq('email', email)
    .limit(1)
  if (error || !data || data.length === 0) return null
  return data[0] as VendorMatch
}

interface FetcherReport {
  ok: boolean
  fetched: number
  written: number
  skipped: number
  errors: string[]
  host: string
  durationMs: number
}

export async function GET(req: Request): Promise<NextResponse<FetcherReport>> {
  const started = Date.now()
  const errors: string[] = []
  let fetched = 0
  let written = 0
  let skipped = 0

  // Fail-closed cron gate (verifyCronAuth returns false when CRON_SECRET is
  // unset), so this IMAP-reading route is never publicly triggerable.
  if (!verifyCronAuth(req.headers.get('authorization'))) {
    console.warn(JSON.stringify({ at: 'mail-fetcher', event: 'unauthorized' }))
    return NextResponse.json(
      { ok: false, fetched: 0, written: 0, skipped: 0, errors: ['unauthorized'], host: '', durationMs: 0 },
      { status: 401 }
    )
  }

  const host = process.env.IMAP_HOST || 'imap.secureserver.net'
  const port = Number(process.env.IMAP_PORT || 993)
  const user = process.env.IMAP_USER || 'support@youngatheart.co.za'
  let pass = process.env.IMAP_PASS
  let passFromSmtpFallback = false
  if (!pass) {
    pass = process.env.SMTP_PASS
    if (pass) {
      passFromSmtpFallback = true
      // GoDaddy (imap.secureserver.net) needs a real mailbox password.
      // SMTP_PASS is the same secret on that stack today, but env hygiene
      // says IMAP_PASS must be set explicitly. Surface as a config defect.
      errors.push(
        'config: IMAP_PASS missing, fell back to SMTP_PASS. ' +
          'Set IMAP_PASS in Vercel env (GoDaddy mailbox password) to remove this warning.'
      )
    }
  }

  if (!pass) {
    return NextResponse.json(
      {
        ok: false,
        fetched: 0,
        written: 0,
        skipped: 0,
        errors: ['no IMAP/SMTP password configured'],
        host,
        durationMs: Date.now() - started,
      },
      { status: 500 }
    )
  }

  const supabase = createAdminClient()

  const client = new ImapFlow({
    host,
    port,
    secure: true,
    auth: { user, pass },
    logger: false,
    socketTimeout: 30_000,
  })

  try {
    await client.connect()
  } catch (e) {
    const msg = (e as Error).message
    console.error(JSON.stringify({ at: 'mail-fetcher', event: 'connect_failed', host, error: msg }))
    // Best-effort close on connect failure (imapflow may have a half-open socket)
    try { await client.close() } catch { /* swallow */ }
    return NextResponse.json(
      {
        ok: false,
        fetched: 0,
        written: 0,
        skipped: 0,
        errors: [`imap connect: ${msg}`],
        host,
        durationMs: Date.now() - started,
      },
      { status: 502 }
    )
  }

  let lock: Awaited<ReturnType<typeof client.getMailboxLock>> | null = null
  try {
    lock = await client.getMailboxLock('INBOX')
    // Pull UNSEEN, cap to 50 per run to bound work
    const uidsRaw = await client.search({ seen: false }, { uid: true })
    const uids: number[] = Array.isArray(uidsRaw) ? uidsRaw : []
    const toFetch = uids.slice(0, 50)

    for (const uid of toFetch) {
      fetched += 1
      let msg: FetchMessageObject | null = null
      try {
        msg = (await client.fetchOne(String(uid), {
          envelope: true,
          source: true,
          headers: [
            'message-id',
            'auto-submitted',
            'x-auto-response-suppress',
            'precedence',
            'list-unsubscribe',
            'in-reply-to',
            'references',
          ],
        }, { uid: true })) as FetchMessageObject
      } catch (e) {
        errors.push(`uid ${uid} fetch: ${(e as Error).message}`)
        skipped += 1
        continue
      }
      if (!msg) {
        skipped += 1
        continue
      }

      const headerBlob = msg.headers ? msg.headers.toString('utf8') : ''
      // RFC 3834: Auto-Submitted other than "no" is a non-human reply.
      const autoSubmittedMatch = headerBlob.match(/^auto-submitted:\s*([^\r\n]+)/im)
      const autoSubmitted =
        autoSubmittedMatch !== null &&
        autoSubmittedMatch[1].trim().toLowerCase() !== 'no'
      // Microsoft / Outlook out-of-office signal — any value means suppress.
      const autoSuppress = /^x-auto-response-suppress:\s*\S/im.test(headerBlob)
      // Mailing-list / bulk traffic.
      const precedence = /^precedence:\s*(bulk|list|junk)/im.test(headerBlob)
      if (autoSubmitted || autoSuppress || precedence) {
        // Mark seen so we don't re-process bounce/vacation/list loops
        try {
          await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true })
        } catch {
          /* swallow */
        }
        skipped += 1
        continue
      }

      const messageIdMatch = headerBlob.match(/^message-id:\s*(.+)$/im)
      const messageId =
        (messageIdMatch?.[1] || msg.envelope?.messageId || '').trim()

      if (!messageId) {
        skipped += 1
        continue
      }

      const fromRaw = msg.envelope?.from?.[0]
      const fromAddress = (fromRaw?.address || '').toLowerCase()
      const fromName = fromRaw?.name || null
      const toAddress =
        (msg.envelope?.to?.[0]?.address || user).toLowerCase()
      const subject = msg.envelope?.subject || ''
      const receivedAt = (msg.envelope?.date || new Date()).toISOString()

      // Naive body extraction — we keep raw source for now; downstream UI
      // renders subject + a snippet until we wire mailparser.
      const body =
        msg.source instanceof Buffer ? msg.source.toString('utf8').slice(0, 8000) : ''

      // Match vendor by from-address
      const vendor = await findVendorByEmail(supabase, fromAddress)

      // Upsert thread first (via RPC helper from migration v11)
      let threadId: string | null = null
      try {
        const { data: tid, error: rpcErr } = await supabase.rpc('upsert_thread', {
          p_channel: 'mail',
          p_key: fromAddress,
          p_inbound_at: receivedAt,
        })
        if (rpcErr) throw rpcErr
        threadId = (tid as string) ?? null
      } catch (e) {
        errors.push(`thread upsert ${fromAddress}: ${(e as Error).message}`)
        // Leave UNSEEN, will retry next tick
        continue
      }

      // Insert mail_messages row (idempotent on message_id)
      try {
        const { error: insErr } = await supabase.from('mail_messages').insert({
          thread_id: threadId,
          message_id: messageId,
          from_address: fromAddress,
          from_name: fromName,
          to_address: toAddress,
          subject,
          body,
          direction: 'inbound',
          vendor_application_id: vendor?.id ?? null,
          received_at: receivedAt,
        })
        if (insErr) {
          // 23505 = unique_violation on message_id — treat as success, mark seen
          const code = (insErr as { code?: string }).code
          if (code !== '23505') {
            errors.push(`insert ${messageId}: ${insErr.message}`)
            continue
          }
        } else {
          written += 1
        }
      } catch (e) {
        errors.push(`insert ${messageId}: ${(e as Error).message}`)
        continue
      }

      // Mark seen only after the row is durable
      try {
        await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true })
      } catch (e) {
        errors.push(`flag seen ${uid}: ${(e as Error).message}`)
      }
    }
  } catch (e) {
    // Unexpected failure inside the loop / mailbox lock — bubble into errors
    // but keep the response shape stable so the cron monitor still parses it.
    errors.push(`loop: ${(e as Error).message}`)
    console.error(
      JSON.stringify({ at: 'mail-fetcher', event: 'loop_error', error: (e as Error).message })
    )
  } finally {
    if (lock) {
      try { lock.release() } catch { /* swallow */ }
    }
    // Always close the IMAP socket. logout() does a clean BYE; close() forces
    // the socket shut if logout times out or the connection is already broken.
    await client.logout().catch(async () => {
      try { await client.close() } catch { /* swallow */ }
    })
  }

  const durationMs = Date.now() - started
  console.log(
    JSON.stringify({
      at: 'mail-fetcher',
      event: 'run_complete',
      host,
      fetched,
      written,
      skipped,
      errorCount: errors.length,
      durationMs,
      passFromSmtpFallback,
    })
  )

  return NextResponse.json({
    ok: errors.length === 0,
    fetched,
    written,
    skipped,
    errors,
    host,
    durationMs,
  })
}
