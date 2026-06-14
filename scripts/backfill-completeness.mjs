#!/usr/bin/env node
/**
 * One-shot backfill: derive vendor_applications.completeness_score for every row.
 *
 * Why this exists:
 *   scripts/derive-sectors.mjs has a latent bug — it imports scoreCompleteness
 *   and treats the return value as a `number`. The function returns a
 *   CompletenessResult ({ score, breakdown, missing }) object, so the
 *   `typeof score === 'number'` check fails on every row and no
 *   completeness_score is ever written. Result: 0 / 460 rows scored in prod.
 *
 * This script:
 *   1. Loads all vendor_applications rows with the columns the scorer needs.
 *   2. Calls scoreCompleteness(row) from src/lib/ai/completeness-scorer.ts
 *      and pulls .score off the result.
 *   3. UPDATEs completeness_score where the new score differs from existing.
 *   4. Reports counts: scored / updated / skipped / errors, plus a histogram
 *      (>80 / 40-79 / <40) so you can eyeball distribution before writing.
 *   5. --dry-run flag for read-only mode.
 *
 * Usage:
 *   node --import tsx scripts/backfill-completeness.mjs --dry-run
 *   node --import tsx scripts/backfill-completeness.mjs
 *
 * Idempotent: re-running is safe (no-op for rows already at the correct score).
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

// ---- tiny .env.local loader (no extra dep) -----------------------------------
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

async function loadCompletenessScorer() {
  const tsPath = resolve(process.cwd(), 'src/lib/ai/completeness-scorer.ts')
  if (!existsSync(tsPath)) {
    throw new Error('src/lib/ai/completeness-scorer.ts not found')
  }
  const mod = await import(pathToFileURL(tsPath).href)
  if (typeof mod.scoreCompleteness !== 'function') {
    throw new Error('scoreCompleteness not exported from completeness-scorer.ts')
  }
  return mod.scoreCompleteness
}

async function main() {
  const scoreCompleteness = await loadCompletenessScorer()
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  })

  console.log(`Mode: ${DRY_RUN ? 'DRY-RUN (no writes)' : 'WRITE'}`)
  console.log('Fetching vendor_applications...')

  const { data: rows, error } = await supabase
    .from('vendor_applications')
    .select([
      'id',
      'contact_name',
      'business_name',
      'business_description',
      'product_categories',
      'phone',
      'email',
      'instagram',
      'facebook',
      'website',
      'special_requirements',
      'preferred_booth_tier',
      'completeness_score',
    ].join(','))

  if (error) {
    console.error('Fetch failed:', error.message)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.log('No rows. Done.')
    return
  }
  console.log(`Fetched ${rows.length} rows.`)

  let scored = 0
  let updated = 0
  let skipped = 0
  let errors = 0
  let bucketHigh = 0   // > 80
  let bucketMid = 0    // 40..80
  let bucketLow = 0    // < 40

  for (const row of rows) {
    let score
    try {
      const result = scoreCompleteness(row)
      score = result?.score
      if (typeof score !== 'number') throw new Error('score not a number')
      scored++
    } catch (e) {
      errors++
      console.warn(`row ${row.id} score failed:`, e.message)
      continue
    }

    if (score > 80) bucketHigh++
    else if (score >= 40) bucketMid++
    else bucketLow++

    if (score === row.completeness_score) {
      skipped++
      continue
    }

    if (DRY_RUN) {
      updated++
      continue
    }

    const { error: upErr } = await supabase
      .from('vendor_applications')
      .update({ completeness_score: score })
      .eq('id', row.id)
    if (upErr) {
      errors++
      console.error(`row ${row.id} update failed:`, upErr.message)
    } else {
      updated++
    }
  }

  console.log('--- DONE ---')
  console.log(`Total rows:       ${rows.length}`)
  console.log(`Scored:           ${scored}`)
  console.log(`Updated:          ${updated} ${DRY_RUN ? '(would be written)' : ''}`)
  console.log(`Skipped (match):  ${skipped}`)
  console.log(`Errors:           ${errors}`)
  console.log('--- distribution ---')
  console.log(`>80 :  ${bucketHigh}`)
  console.log(`40-80: ${bucketMid}`)
  console.log(`<40 :  ${bucketLow}`)
  if (DRY_RUN) console.log('(dry-run: no writes performed)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
