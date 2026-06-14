#!/usr/bin/env node
// One-off: re-send the (new format) invoice email to Samreen so Taona can eyeball it.
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const repo = path.resolve(here, '..')
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

const { createAdminClient } = await import(path.join(repo, 'src/lib/supabase/admin.ts'))
const { sendVendorPaymentEmail } = await import(path.join(repo, 'src/lib/payments/confirm.ts'))
const { computeVendorPricing } = await import(path.join(repo, 'src/lib/payments/pricing.ts'))
const { parsePortalState } = await import(path.join(repo, 'src/lib/portal-state.ts'))

const APP_ID = process.argv[2]
if (!APP_ID) { console.error('usage: node scripts/resend-invoice-test.mjs <applicationId>'); process.exit(1) }

const db = createAdminClient()
const { data: app, error } = await db
  .from('vendor_applications')
  .select('id, business_name, contact_name, email, admin_notes, preferred_booth_tier, special_requirements')
  .eq('id', APP_ID)
  .maybeSingle()
if (error) { console.error('lookup error:', error.message); process.exit(1) }
if (!app) { console.error('app not found'); process.exit(1) }

const state = parsePortalState(app.admin_notes)
const pricing = computeVendorPricing({
  preferred_booth_tier: app.preferred_booth_tier,
  special_requirements: app.special_requirements,
})
const amount = state.payment?.amount ?? pricing.total
const providerRef = state.payment?.provider_ref || state.payment?.reference || 'manual'
const paidDate = state.payment?.paid_at
  ? new Date(state.payment.paid_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
  : undefined

const result = await sendVendorPaymentEmail({
  to: app.email,
  contactName: app.contact_name || 'there',
  businessName: app.business_name || 'your business',
  amount,
  providerRef,
  reference: state.payment?.reference || APP_ID.slice(0, 8).toUpperCase(),
  paidDate,
  pricing,
})
console.log(result)
