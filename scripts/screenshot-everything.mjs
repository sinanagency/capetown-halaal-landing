// Comprehensive authenticated walkthrough of cthalaal.co.za.
// Logs in as admin + vendor demo accounts, screenshots every surface,
// dumps PNGs to ~/Desktop/cthalaal-2026-06-15/ for the operator to scroll.

import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const BASE = 'https://cthalaal.co.za'
const OUT = path.join(os.homedir(), 'Desktop', 'cthalaal-2026-06-15')
fs.mkdirSync(OUT, { recursive: true })

const ADMIN = { email: 'dev@cthalaal.co.za', password: 'DemoAdmin#2026' }
const VENDOR = { email: 'demo-vendor@cthalaal.co.za', password: 'DemoVendor#2026' }

const PUBLIC = [
  ['00-home', '/'],
  ['01-admin-login', '/admin/login'],
  ['02-exhibitor-login', '/exhibitor/login'],
]

const ADMIN_ROUTES = [
  ['10-dashboard', '/admin'],
  ['11-applications', '/admin/applications'],
  ['12-verifier', '/admin/verifier'],
  ['13-people', '/admin/people'],
  ['14-vendors', '/admin/vendors'],
  ['15-allocation', '/admin/allocation'],
  ['16-documents', '/admin/documents'],
  ['17-inbox', '/admin/inbox'],
  ['18-bot-inbox', '/admin/bot-inbox'],
  ['19-support-inbox', '/admin/support-inbox'],
  ['20-broadcast', '/admin/broadcast'],
  ['21-tickets', '/admin/tickets'],
  ['22-follow-up', '/admin/follow-up'],
  ['23-analytics', '/admin/analytics'],
  ['24-settings-activity', '/admin/settings/activity'],
  ['25-settings-operators', '/admin/settings/operators'],
  ['26-settings-comms-health', '/admin/settings/comms-health'],
]

const VENDOR_ROUTES = [
  ['30-vendor-overview', '/exhibitor/portal'],
  ['31-vendor-stand', '/exhibitor/portal/stand'],
  ['32-vendor-documents', '/exhibitor/portal/documents'],
  ['33-vendor-staff', '/exhibitor/portal/staff'],
  ['34-vendor-announcements', '/exhibitor/portal/announcements'],
  ['35-vendor-support', '/exhibitor/portal/support'],
  ['36-vendor-payments', '/exhibitor/portal/payments'],
  ['37-vendor-profile', '/exhibitor/portal/profile'],
  ['38-vendor-resources', '/exhibitor/portal/resources'],
  ['39-vendor-contract', '/exhibitor/portal/contract'],
  ['40-vendor-invoice', '/exhibitor/portal/invoice'],
]

const report = []

async function snap(page, slug, url) {
  const t0 = Date.now()
  try {
    await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 30000 })
  } catch (e) {
    report.push({ slug, url, status: 'goto-failed', err: e.message })
    return
  }
  // tiny pause so SPA hydrates + skeleton clears
  await page.waitForTimeout(1200)
  const file = path.join(OUT, `${slug}.png`)
  await page.screenshot({ path: file, fullPage: true })
  const finalUrl = page.url()
  const title = await page.title().catch(() => '')
  const took = Date.now() - t0
  report.push({ slug, url, finalUrl, title, file, took })
  console.log(`-> ${slug}  ${url}  -> ${finalUrl}  (${took}ms)`)
}

async function loginAdmin(page) {
  await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', ADMIN.email)
  await page.fill('input[type="password"]', ADMIN.password)
  await Promise.all([
    page.waitForURL(/\/admin(?!\/login)/, { timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ])
  await page.waitForTimeout(1500)
}

async function loginVendor(page) {
  await page.goto(BASE + '/exhibitor/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', VENDOR.email)
  await page.fill('input[type="password"]', VENDOR.password)
  // Exhibitor button has no explicit type attr; press Enter on the password
  // field to submit the form.
  await Promise.all([
    page.waitForURL(/\/exhibitor\/portal/, { timeout: 30000 }).catch(() => {}),
    page.press('input[type="password"]', 'Enter'),
  ])
  await page.waitForTimeout(2000)
}

const browser = await chromium.launch({ headless: true })
try {
  // Public pages (no auth)
  const pubCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const pubPage = await pubCtx.newPage()
  for (const [slug, url] of PUBLIC) await snap(pubPage, slug, url)
  await pubCtx.close()

  // Admin walkthrough
  console.log('\n[admin] login...')
  const adminCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const adminPage = await adminCtx.newPage()
  await loginAdmin(adminPage)
  for (const [slug, url] of ADMIN_ROUTES) await snap(adminPage, slug, url)
  await adminCtx.close()

  // Vendor walkthrough
  console.log('\n[vendor] login...')
  const vendorCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const vendorPage = await vendorCtx.newPage()
  await loginVendor(vendorPage)
  for (const [slug, url] of VENDOR_ROUTES) await snap(vendorPage, slug, url)
  await vendorCtx.close()
} finally {
  await browser.close()
}

fs.writeFileSync(path.join(OUT, 'REPORT.json'), JSON.stringify(report, null, 2))
const md = [
  `# CTH Visual Walkthrough — 2026-06-15`,
  ``,
  `Base: ${BASE}`,
  `Output dir: ${OUT}`,
  `Total surfaces: ${report.length}`,
  ``,
  `| Slug | Route | Final URL | Title | Took |`,
  `|---|---|---|---|---|`,
  ...report.map((r) => `| ${r.slug} | ${r.url} | ${r.finalUrl || r.status || ''} | ${(r.title || '').replace(/\|/g, '/')} | ${r.took || ''}ms |`),
].join('\n')
fs.writeFileSync(path.join(OUT, 'REPORT.md'), md)
console.log(`\nDone. Screenshots in ${OUT}`)
console.log(`Report: ${path.join(OUT, 'REPORT.md')}`)
