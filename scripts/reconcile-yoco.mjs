#!/usr/bin/env node
// Reconcile Yoco checkouts against vendor_applications.
// Usage:
//   node scripts/reconcile-yoco.mjs <checkout_id> [<checkout_id> ...]   # specific checkouts
//   node scripts/reconcile-yoco.mjs --auto                              # everything we have refs for
//
// For each provided Yoco checkout id (ch_...), it GETs the Yoco checkout,
// reads metadata.applicationId, and if status=completed AND our DB doesn't
// already have payment.status=paid, calls confirmPayment (Resend email +
// WhatsApp + portal-state update). Idempotent.

import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..')

// Minimal .env.local loader (no dotenv dep)
const envPath = path.join(repo, '.env.local')
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/i)
    if (!m) continue
    const k = m[1]; let v = m[2]
    if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1)
    if (!process.env[k]) process.env[k] = v
  }
}

const YOCO = (process.env.YOCO_SECRET_KEY || '').trim()
if (!YOCO) {
  console.error('YOCO_SECRET_KEY missing'); process.exit(1)
}

const { createAdminClient } = await import(path.join(repo, 'src/lib/supabase/admin.ts'))
const { confirmPayment } = await import(path.join(repo, 'src/lib/payments/confirm.ts'))
const { parsePortalState } = await import(path.join(repo, 'src/lib/portal-state.ts'))

const args = process.argv.slice(2)
const auto = args.includes('--auto')
const checkoutIds = args.filter(a => a.startsWith('ch_'))

async function yocoGet(id) {
  const r = await fetch(`https://payments.yoco.com/api/checkouts/${id}`, {
    headers: { Authorization: `Bearer ${YOCO}` }
  })
  if (!r.ok) throw new Error(`Yoco ${id}: HTTP ${r.status}`)
  return r.json()
}

async function pullCheckoutsFromDB() {
  // Find every application with a portal-state provider_ref starting with "ch_"
  const admin = createAdminClient()
  const { data } = await admin
    .from('vendor_applications')
    .select('id, business_name, admin_notes')
    .ilike('admin_notes', '%PORTAL:%')
  const out = []
  for (const a of data || []) {
    const s = parsePortalState(a.admin_notes || '')
    const ref = s.payment?.provider_ref
    if (ref && ref.startsWith('ch_')) out.push({ ref, biz: a.business_name, appId: a.id })
  }
  return out
}

const queue = auto ? (await pullCheckoutsFromDB()).map(x => x.ref) : checkoutIds

console.log(`Reconciling ${queue.length} checkout(s)…`)

const results = []
for (const ref of queue) {
  try {
    const ck = await yocoGet(ref)
    const appId = ck?.metadata?.applicationId
    const status = ck?.status
    if (!appId) { results.push({ ref, action: 'skip', reason: 'no metadata.applicationId' }); continue }
    if (status !== 'completed') { results.push({ ref, action: 'skip', reason: `Yoco status=${status}` }); continue }
    const amount = (ck.amount ?? 0) / 100
    const out = await confirmPayment({
      applicationId: appId,
      method: 'yoco',
      amount,
      providerRef: ref,
    })
    results.push({ ref, action: out.alreadyPaid ? 'already-paid' : 'marked-paid', amount, appId, ok: out.ok, error: out.error })
  } catch (e) {
    results.push({ ref, action: 'error', error: e.message })
  }
}

console.table(results)
const flipped = results.filter(r => r.action === 'marked-paid').length
const dupes = results.filter(r => r.action === 'already-paid').length
const skipped = results.filter(r => r.action === 'skip').length
const errs = results.filter(r => r.action === 'error').length
console.log(`\nflipped=${flipped}  already-paid=${dupes}  skipped=${skipped}  errors=${errs}`)
