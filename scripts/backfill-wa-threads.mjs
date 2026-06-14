#!/usr/bin/env node
/**
 * One-shot backfill: seed wa_threads from existing wa_messages history.
 *
 * Why this exists:
 *   The WhatsApp inbound webhook (src/app/api/whatsapp/webhook/route.ts)
 *   writes every message to wa_messages but never upserts a wa_threads row.
 *   Result: 168 wa_messages, 0 wa_threads → admin Bot Inbox UI is empty.
 *
 *   Prod schema is migration v9 shape (PRIMARY KEY = wa_phone, columns:
 *   last_inbound_at, last_outbound_at, last_handled_at, unread_count,
 *   metadata). The newer v11 design (channel/thread_key/id) was authored but
 *   never applied to prod — DDL is blocked on CTH Supabase. We backfill
 *   against the LIVE schema.
 *
 * Logic:
 *   For each distinct wa_phone in wa_messages, upsert a wa_threads row with:
 *     - wa_phone        = phone
 *     - last_inbound_at = MAX(wa_messages.created_at WHERE direction='in')
 *     - last_outbound_at= MAX(wa_messages.created_at WHERE direction='out')
 *     - unread_count    = COUNT(in messages with status='received'
 *                                AND created_at > coalesce(last_handled_at, '1970'))
 *                         (we use last_outbound_at as a proxy because pre-backfill
 *                          rows have no last_handled_at; this matches the inbox's
 *                          "needs you" semantics: unhandled inbound after last out.)
 *
 * Idempotent: upsert keyed on wa_phone PK. Re-runs are safe.
 *
 * Usage:
 *   node scripts/backfill-wa-threads.mjs --dry-run
 *   node scripts/backfill-wa-threads.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadDotenv(file) {
  if (!existsSync(file)) return
  const raw = readFileSync(file, 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/i)
    if (!m) continue
    if (!process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '')
  }
}
loadDotenv(resolve(process.cwd(), '.env.local'))

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in env')
  process.exit(1)
}

const DRY_RUN = process.argv.includes('--dry-run')

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  })

  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no writes)' : 'WRITE'}`)
  console.log('Fetching all wa_messages rows...')

  // Pull every row we need to derive per-phone aggregates. 168 rows today,
  // 1k rows tomorrow — still fine to pull-and-aggregate in JS.
  const { data: rows, error } = await supabase
    .from('wa_messages')
    .select('wa_phone, direction, status, created_at')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Fetch wa_messages failed:', error.message)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.log('No wa_messages rows. Done.')
    return
  }
  console.log(`Fetched ${rows.length} wa_messages.`)

  // Aggregate per phone
  const agg = new Map() // wa_phone -> { lastIn, lastOut }
  for (const r of rows) {
    if (!r.wa_phone) continue
    const cur = agg.get(r.wa_phone) || { lastIn: null, lastOut: null }
    if (r.direction === 'in' && (!cur.lastIn || r.created_at > cur.lastIn)) cur.lastIn = r.created_at
    if (r.direction === 'out' && (!cur.lastOut || r.created_at > cur.lastOut)) cur.lastOut = r.created_at
    agg.set(r.wa_phone, cur)
  }

  // Compute unread: count of inbound messages whose created_at > coalesce(lastOut, '1970')
  const unread = new Map()
  for (const r of rows) {
    if (r.direction !== 'in') continue
    const a = agg.get(r.wa_phone)
    const boundary = a?.lastOut || '1970-01-01T00:00:00Z'
    if (r.created_at > boundary) unread.set(r.wa_phone, (unread.get(r.wa_phone) || 0) + 1)
  }

  console.log(`Distinct phones: ${agg.size}`)

  let upserted = 0
  let errors = 0

  for (const [phone, { lastIn, lastOut }] of agg.entries()) {
    const row = {
      wa_phone: phone,
      last_inbound_at: lastIn,
      last_outbound_at: lastOut,
      unread_count: unread.get(phone) || 0,
    }

    if (DRY_RUN) {
      upserted++
      continue
    }

    const { error: upErr } = await supabase
      .from('wa_threads')
      .upsert(row, { onConflict: 'wa_phone' })

    if (upErr) {
      errors++
      console.error(`upsert ${phone} failed:`, upErr.message)
    } else {
      upserted++
    }
  }

  console.log('--- DONE ---')
  console.log(`Phones aggregated: ${agg.size}`)
  console.log(`Upserted:          ${upserted} ${DRY_RUN ? '(would be written)' : ''}`)
  console.log(`Errors:            ${errors}`)
  if (DRY_RUN) console.log('(dry-run: no writes performed)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
