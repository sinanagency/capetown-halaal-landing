#!/usr/bin/env node
/**
 * RLS Probe — verifies Row Level Security state on CTH Supabase (dtdqopjdxwfvtyrnygdt).
 *
 * What it does:
 *   1. Lists every public-schema table + rowsecurity flag (via service-role RPC).
 *   2. For each table, lists policies (polname, polcmd).
 *   3. For PII tables, attempts an ANON-KEY SELECT to confirm whether the table
 *      actually blocks unauthenticated reads.
 *
 * Reads only. No DDL, no inserts. Safe to run repeatedly.
 *
 * Usage: node scripts/rls-probe.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')

// Tiny .env parser (no dotenv dep).
function loadEnv(path) {
  const text = readFileSync(path, 'utf8')
  const out = {}
  for (const line of text.split('\n')) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/)
    if (!m) continue
    let v = m[2].trim()
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1)
    }
    out[m[1]] = v
  }
  return out
}

const env = loadEnv(envPath)
const URL = env.NEXT_PUBLIC_SUPABASE_URL
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY

if (!URL || !ANON || !SERVICE) {
  console.error('Missing Supabase env vars in .env.local')
  process.exit(1)
}

const service = createClient(URL, SERVICE, { auth: { persistSession: false } })
const anon = createClient(URL, ANON, { auth: { persistSession: false } })

// PII / sensitive tables — anon-key probe required.
const PII_TABLES = [
  'vendor_applications',
  'wa_messages',
  'wa_threads',
  'support_inbox_threads',
  'support_inbox_messages',
  'vendor_application_events',
  'site_events',
  'mail_messages',
  'mail_optout',
  'admin_users',
]

// SQL helper — runs arbitrary SQL via Supabase's REST query endpoint.
// Supabase doesn't expose a generic SQL endpoint over JS client, so we use
// the management-style PostgREST `rpc` if a helper function exists. As a
// portable fallback, hit `pg_meta` REST endpoint at /pg-meta/default/query.
async function runSql(sql) {
  const r = await fetch(`${URL}/pg-meta/default/query`, {
    method: 'POST',
    headers: {
      apikey: SERVICE,
      Authorization: `Bearer ${SERVICE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!r.ok) {
    // Fallback: try the more common PostgREST RPC if a function named `query` exists.
    // (Most Supabase projects don't expose pg-meta on the public URL.)
    throw new Error(`pg-meta query failed: ${r.status} ${await r.text().catch(() => '')}`)
  }
  return await r.json()
}

// Probe each PII table with the anon key. The contract is:
//   data with rows  -> LEAK (P0)
//   data=[]         -> empty table (cannot conclude, mark INDETERMINATE)
//   error 42501     -> RLS BLOCKED (good)
//   error PGRST301  -> permission denied via PostgREST (good)
//   any other error -> mark ERROR for investigation
async function probeAnon(table) {
  // Pick a small public-ish column list. Some tables won't have all of these,
  // so we use '*' but cap with limit 1 and a head:false so we get data shape.
  const res = await anon.from(table).select('*', { count: 'exact', head: false }).limit(1)
  if (res.error) {
    const code = res.error.code || ''
    const msg = res.error.message || ''
    if (code === '42501' || code === 'PGRST301' || /permission denied|row-level security/i.test(msg)) {
      return { state: 'BLOCKED', detail: msg.slice(0, 80) }
    }
    return { state: 'ERROR', detail: `${code}: ${msg.slice(0, 80)}` }
  }
  const rows = (res.data || []).length
  const totalCount = typeof res.count === 'number' ? res.count : null
  if (rows === 0 && (totalCount === 0 || totalCount === null)) {
    return { state: 'OPEN_BUT_EMPTY', detail: `count=${totalCount}` }
  }
  return { state: 'LEAKS', detail: `rows_visible=${rows} count=${totalCount}` }
}

async function listTablesViaServiceRole() {
  // Best path: read information_schema directly via service role.
  // We use postgrest's "view" trick: there is no public view for pg_tables by
  // default. So we create a one-shot inline call by hitting the REST URL for
  // the system catalog if a SECURITY DEFINER helper exists, else we approximate
  // by attempting selects on a known list. Given we already have the candidate
  // list (PII_TABLES + likely admin tables), we'll enumerate them with service
  // role to get rowsecurity from a tiny helper if missing.
  //
  // STRATEGY: use the PostgREST RPC `exec_sql` if defined; otherwise probe each
  // candidate by attempting a service-role HEAD select and assume existence
  // when no 404.
  //
  // Cleanest: just attempt pg_meta endpoint first.
  try {
    const rows = await runSql(
      `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public' ORDER BY tablename`,
    )
    return { source: 'pg-meta', rows }
  } catch (_e) {
    // Fallback: enumerate the candidate set and report what we can.
    return { source: 'fallback-candidate-list', rows: null }
  }
}

async function listPoliciesViaPgMeta(table) {
  try {
    const rows = await runSql(
      `SELECT polname, polcmd FROM pg_policy WHERE polrelid = 'public.${table}'::regclass ORDER BY polname`,
    )
    return rows
  } catch (_e) {
    return null
  }
}

async function rowsecurityFlag(table) {
  try {
    const rows = await runSql(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname='public' AND tablename='${table}'`,
    )
    if (Array.isArray(rows) && rows[0]) return rows[0].rowsecurity
  } catch (_e) {}
  return null
}

async function serviceExists(table) {
  // Service role bypasses RLS, so a successful select confirms the table exists.
  const r = await service.from(table).select('*', { head: true, count: 'exact' }).limit(1)
  if (r.error) {
    if ((r.error.code || '').includes('42P01') || /does not exist/i.test(r.error.message || '')) {
      return { exists: false, count: null }
    }
    return { exists: 'unknown', count: null, err: r.error.message }
  }
  return { exists: true, count: r.count ?? null }
}

function pad(s, n) {
  s = String(s)
  return s.length >= n ? s : s + ' '.repeat(n - s.length)
}

;(async () => {
  console.log('CTH RLS Probe — project dtdqopjdxwfvtyrnygdt')
  console.log('='.repeat(80))

  const tableMeta = await listTablesViaServiceRole()
  if (tableMeta.source === 'pg-meta' && Array.isArray(tableMeta.rows)) {
    console.log(`\nAll public tables (${tableMeta.rows.length}) and rowsecurity flag:`)
    console.log(pad('TABLE', 36) + pad('RLS', 8))
    console.log('-'.repeat(48))
    for (const r of tableMeta.rows) {
      console.log(pad(r.tablename, 36) + pad(r.rowsecurity ? 'ON' : 'OFF', 8))
    }
  } else {
    console.log('\n[note] pg-meta unreachable from anon URL — using candidate-table fallback.')
  }

  console.log('\n' + '='.repeat(80))
  console.log('PII / sensitive-table probe (anon key + service confirm + policy count)')
  console.log('='.repeat(80))
  console.log(
    pad('TABLE', 32) + pad('EXISTS', 10) + pad('RLS', 6) + pad('POLICIES', 10) + 'ANON_PROBE',
  )
  console.log('-'.repeat(100))

  const findings = []
  for (const t of PII_TABLES) {
    const svc = await serviceExists(t)
    if (svc.exists === false) {
      console.log(pad(t, 32) + pad('no', 10) + pad('-', 6) + pad('-', 10) + 'SKIP (table absent)')
      continue
    }
    const rls = await rowsecurityFlag(t)
    const policies = await listPoliciesViaPgMeta(t)
    const polCount = Array.isArray(policies) ? policies.length : '?'
    const probe = await probeAnon(t)
    const rlsLabel = rls === true ? 'ON' : rls === false ? 'OFF' : '?'
    let stateLabel
    switch (probe.state) {
      case 'BLOCKED':
        stateLabel = 'BLOCKED (good)'
        break
      case 'OPEN_BUT_EMPTY':
        stateLabel = `OPEN-EMPTY (${probe.detail}) -- INVESTIGATE`
        break
      case 'LEAKS':
        stateLabel = `LEAKS (${probe.detail}) -- P0`
        break
      default:
        stateLabel = `ERROR (${probe.detail})`
    }
    console.log(
      pad(t, 32) +
        pad('yes', 10) +
        pad(rlsLabel, 6) +
        pad(String(polCount), 10) +
        stateLabel,
    )
    findings.push({
      table: t,
      exists: true,
      rowsecurity: rls,
      policyCount: Array.isArray(policies) ? policies.length : null,
      policies: policies || null,
      anonProbe: probe,
      serviceCount: svc.count,
    })
  }

  // P0 summary.
  const p0 = findings.filter((f) => f.anonProbe.state === 'LEAKS')
  const openEmpty = findings.filter((f) => f.anonProbe.state === 'OPEN_BUT_EMPTY')
  const rlsOff = findings.filter((f) => f.rowsecurity === false)
  const noPolicies = findings.filter(
    (f) => f.rowsecurity === true && (f.policyCount === 0 || f.policyCount === null),
  )

  console.log('\n' + '='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log(`P0 leaks (anon key returns rows): ${p0.length}`)
  for (const f of p0) console.log(`  - ${f.table} (${f.anonProbe.detail})`)
  console.log(`Open-but-empty (anon select succeeded, table empty): ${openEmpty.length}`)
  for (const f of openEmpty) console.log(`  - ${f.table} (rows=0; could leak if data arrives)`)
  console.log(`RLS disabled (rowsecurity=false): ${rlsOff.length}`)
  for (const f of rlsOff) console.log(`  - ${f.table}`)
  console.log(`RLS on but 0 policies (locked-down, even admin can't read via JWT): ${noPolicies.length}`)
  for (const f of noPolicies) console.log(`  - ${f.table}`)

  // Emit machine-readable JSON last so callers can pipe.
  console.log('\n--- JSON ---')
  console.log(JSON.stringify({ findings, p0: p0.map((f) => f.table) }, null, 2))
})().catch((e) => {
  console.error('Probe failed:', e)
  process.exit(2)
})
