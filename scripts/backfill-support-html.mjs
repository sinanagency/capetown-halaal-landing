#!/usr/bin/env node
/**
 * Backfill: re-parse support_inbox_messages where body_text looks like raw
 * MIME source (no body_html) and populate body_html from the raw source.
 *
 * Run: node scripts/backfill-support-html.mjs
 * Safe to re-run. Idempotent on message_id.
 */
import { createClient } from '@supabase/supabase-js'
import { simpleParser } from 'mailparser'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load env from .env.local
const envPath = resolve(__dirname, '..', '.env.local')
const envRaw = readFileSync(envPath, 'utf-8')
const env = Object.fromEntries(
  envRaw.split('\n').filter(l => l && !l.startsWith('#')).map(l => {
    const idx = l.indexOf('=')
    return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
  })
)

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
)

// Find rows without body_html where body_text looks like raw source
const { data: rows, error } = await supabase
  .from('support_inbox_messages')
  .select('id, body_text, body_html, message_id')
  .is('body_html', null)
  .limit(200)

if (error) { console.error('Query failed:', error); process.exit(1) }
console.log(`Found ${rows.length} rows without body_html`)

let fixed = 0
let failed = 0

for (const row of rows) {
  const raw = row.body_text || ''
  const sample = raw.slice(0, 400)
  const looksLikeRfc822 = /^(Return-Path|Received|From|To|Subject|Message-ID|X-)/m.test(sample)

  if (!looksLikeRfc822) continue

  try {
    const parsed = await simpleParser(raw)
    const html = typeof parsed.html === 'string' ? parsed.html.trim().slice(0, 32_000) : null
    const text = (parsed.text || '').trim().slice(0, 4000)

    if (html || text) {
      const update = {}
      if (html) update.body_html = html
      if (text && text !== raw) update.body_text = text

      const { error: updErr } = await supabase
        .from('support_inbox_messages')
        .update(update)
        .eq('id', row.id)

      if (updErr) {
        console.error(`  FAIL ${row.message_id?.slice(0, 40)}: ${updErr.message}`)
        failed++
      } else {
        fixed++
        if (fixed % 20 === 0) console.log(`  Fixed ${fixed}...`)
      }
    }
  } catch (e) {
    console.error(`  PARSE FAIL ${row.message_id?.slice(0, 40)}: ${e.message}`)
    failed++
  }
}

console.log(`\nDone: ${fixed} fixed, ${failed} failed, ${rows.length - fixed - failed} skipped`)
