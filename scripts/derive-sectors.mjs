#!/usr/bin/env node
/**
 * One-shot backfill: derive vendor_applications.sector for every row.
 *
 * Reads product_categories + business_description, runs deriveSector(), writes
 * sector (and completeness_score, IF the Agent-2 scorer lands at
 * src/lib/ai/completeness-scorer.ts before main session runs this).
 *
 * Idempotent: re-runs are safe. Rows whose derived sector matches the
 * existing DB value are skipped (counted as "unchanged"). DO NOT execute from
 * an agent worktree — main session runs this post-deploy.
 *
 * Logs final counts: derived / null / unchanged / errors.
 *
 * Usage:
 *   node scripts/derive-sectors.mjs              # writes
 *   node scripts/derive-sectors.mjs --dry-run    # just reports
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

// ---- dynamic sector-map import (TS file, requires tsx runner) ----------------
async function loadSectorMap() {
  // Allow callers to use either `node --import tsx` or plain node when a
  // pre-built JS twin exists. Try TS first, fall back gracefully.
  const tsPath = pathToFileURL(resolve(process.cwd(), 'src/lib/sector-map.ts')).href
  try {
    const mod = await import(tsPath)
    if (typeof mod.deriveSector === 'function') return mod.deriveSector
  } catch (e) {
    console.error('Could not import src/lib/sector-map.ts directly. Run with:')
    console.error('  node --import tsx scripts/derive-sectors.mjs')
    throw e
  }
  throw new Error('deriveSector not exported from src/lib/sector-map.ts')
}

async function loadCompletenessScorer() {
  const tsPath = resolve(process.cwd(), 'src/lib/ai/completeness-scorer.ts')
  if (!existsSync(tsPath)) return null
  try {
    const mod = await import(pathToFileURL(tsPath).href)
    return typeof mod.scoreCompleteness === 'function' ? mod.scoreCompleteness : null
  } catch (e) {
    console.warn('completeness-scorer present but failed to load:', e.message)
    return null
  }
}

// ---- main --------------------------------------------------------------------
async function main() {
  const deriveSector = await loadSectorMap()
  const scoreCompleteness = await loadCompletenessScorer()
  if (scoreCompleteness) {
    console.log('completeness-scorer detected: will also backfill completeness_score')
  } else {
    console.log('completeness-scorer not yet present: skipping completeness_score (sector only)')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false },
  })

  console.log(`Fetching all vendor_applications rows (mode: ${DRY_RUN ? 'DRY-RUN' : 'WRITE'})...`)
  const { data: rows, error } = await supabase
    .from('vendor_applications')
    .select('id, product_categories, business_description, sector, completeness_score')

  if (error) {
    console.error('Fetch failed:', error.message)
    process.exit(1)
  }
  if (!rows || rows.length === 0) {
    console.log('No rows. Done.')
    return
  }

  console.log(`Fetched ${rows.length} rows. Deriving sectors...`)

  let derived = 0
  let nullCount = 0
  let unchanged = 0
  let scoreUpdated = 0
  let errors = 0

  for (const row of rows) {
    const { sector, confidence } = deriveSector(row.product_categories, row.business_description)

    const sectorChanged = sector !== row.sector
    const update = {}
    if (sectorChanged) update.sector = sector

    if (scoreCompleteness) {
      try {
        const score = await scoreCompleteness(row)
        if (typeof score === 'number' && score !== row.completeness_score) {
          update.completeness_score = score
          scoreUpdated++
        }
      } catch (e) {
        // Score failures don't block sector backfill
        console.warn(`row ${row.id} score failed:`, e.message)
      }
    }

    if (sector === null) nullCount++
    else if (sectorChanged) derived++
    else unchanged++

    if (Object.keys(update).length === 0) continue
    if (DRY_RUN) continue

    const { error: upErr } = await supabase
      .from('vendor_applications')
      .update(update)
      .eq('id', row.id)
    if (upErr) {
      errors++
      console.error(`row ${row.id} update failed:`, upErr.message)
    }
  }

  console.log('--- DONE ---')
  console.log(`Total rows:        ${rows.length}`)
  console.log(`Sector derived:    ${derived}   (newly set or changed)`)
  console.log(`Sector null:       ${nullCount} (no token matched)`)
  console.log(`Sector unchanged:  ${unchanged}`)
  if (scoreCompleteness) console.log(`Completeness set:  ${scoreUpdated}`)
  console.log(`Errors:            ${errors}`)
  if (DRY_RUN) console.log('(dry-run: no writes performed)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
