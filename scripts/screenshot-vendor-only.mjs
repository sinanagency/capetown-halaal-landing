// Catch-up run: vendor portal + missing home, write into same Desktop folder.
import { chromium } from 'playwright'
import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const BASE = 'https://cthalaal.co.za'
const OUT = path.join(os.homedir(), 'Desktop', 'cthalaal-2026-06-15')
fs.mkdirSync(OUT, { recursive: true })
const VENDOR = { email: 'demo-vendor@cthalaal.co.za', password: 'DemoVendor#2026' }

const PUBLIC = [['00-home', '/']]
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
    console.log(`!! ${slug} goto failed: ${e.message}`)
    return
  }
  await page.waitForTimeout(1500)
  const file = path.join(OUT, `${slug}.png`)
  await page.screenshot({ path: file, fullPage: true })
  const finalUrl = page.url()
  const title = await page.title().catch(() => '')
  const took = Date.now() - t0
  report.push({ slug, url, finalUrl, title, file, took })
  console.log(`-> ${slug} (${took}ms)`)
}

async function loginVendor(page) {
  await page.goto(BASE + '/exhibitor/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', VENDOR.email)
  await page.fill('input[type="password"]', VENDOR.password)
  await Promise.all([
    page.waitForURL(/\/exhibitor\/portal/, { timeout: 30000 }).catch(() => {}),
    page.press('input[type="password"]', 'Enter'),
  ])
  await page.waitForTimeout(2500)
}

const browser = await chromium.launch({ headless: true })
try {
  // Home page
  const pubCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const pubPage = await pubCtx.newPage()
  for (const [slug, url] of PUBLIC) await snap(pubPage, slug, url)
  await pubCtx.close()

  // Vendor walkthrough
  console.log('\n[vendor] login...')
  const vendorCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const vendorPage = await vendorCtx.newPage()
  await loginVendor(vendorPage)
  console.log(`logged in, at: ${vendorPage.url()}`)
  for (const [slug, url] of VENDOR_ROUTES) await snap(vendorPage, slug, url)
  await vendorCtx.close()
} finally {
  await browser.close()
}

// merge into REPORT.md / .json
fs.writeFileSync(path.join(OUT, 'REPORT-vendor.json'), JSON.stringify(report, null, 2))
const md = [
  `# CTH Vendor + Home Catch-up — 2026-06-15`,
  ``,
  `| Slug | Route | Final URL | Title | Took |`,
  `|---|---|---|---|---|`,
  ...report.map((r) => `| ${r.slug} | ${r.url} | ${r.finalUrl || r.status || ''} | ${(r.title || '').replace(/\|/g, '/')} | ${r.took || ''}ms |`),
].join('\n')
fs.writeFileSync(path.join(OUT, 'REPORT-vendor.md'), md)
console.log(`Done. ${report.length} surfaces -> ${OUT}`)
