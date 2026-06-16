// Wave-3 verification shots. Authenticated capture of the surfaces Taona
// flagged: bulk toolbar / StallMap / follow-up scroll cap / marketing kit /
// vendor nav with Marketing pill + collapsed avatar.
import { chromium } from 'playwright'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const BASE = 'https://cthalaal.co.za'
const OUT = path.join(os.homedir(), 'Desktop', 'cthalaal-wave3-verify')
fs.mkdirSync(OUT, { recursive: true })
const ADMIN = { email: 'dev@cthalaal.co.za', password: 'DemoAdmin#2026' }
const VENDOR = { email: 'demo-vendor@cthalaal.co.za', password: 'DemoVendor#2026' }

async function snap(page, slug, url, after) {
  console.log(`-> ${slug}`)
  await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(1500)
  if (after) { try { await after(page) } catch (e) { console.log(`  after-hook err: ${e.message}`) } }
  await page.screenshot({ path: path.join(OUT, `${slug}.png`), fullPage: true })
}

async function loginAdmin(page) {
  await page.goto(BASE + '/admin/login', { waitUntil: 'networkidle' })
  await page.fill('input[type="email"]', ADMIN.email)
  await page.fill('input[type="password"]', ADMIN.password)
  await Promise.all([
    page.waitForURL(/\/admin(?!\/login)/, { timeout: 30000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ])
  await page.waitForTimeout(2500)
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
  // Admin surfaces
  const aCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const aPage = await aCtx.newPage()
  await loginAdmin(aPage)
  console.log(`admin in: ${aPage.url()}`)
  await snap(aPage, 'A1-applications-no-selection', '/admin/applications')
  // Select one row via 'x' keypress so the bulk toolbar swaps in
  await snap(aPage, 'A2-applications-with-selection', '/admin/applications', async (p) => {
    await p.waitForTimeout(1500)
    await p.keyboard.press('x')
    await p.waitForTimeout(800)
  })
  await snap(aPage, 'A3-allocation-2d-map', '/admin/allocation')
  await snap(aPage, 'A4-follow-up-scroll', '/admin/follow-up')
  await snap(aPage, 'A5-comms-health', '/admin/settings/comms-health')
  await snap(aPage, 'A6-analytics', '/admin/analytics')
  await aCtx.close()

  // Vendor surfaces
  const vCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const vPage = await vCtx.newPage()
  await loginVendor(vPage)
  console.log(`vendor in: ${vPage.url()}`)
  await snap(vPage, 'V1-portal-overview-nav', '/exhibitor/portal')
  await snap(vPage, 'V2-marketing-kit', '/exhibitor/portal/marketing')
  await snap(vPage, 'V3-stand-stallmap', '/exhibitor/portal/stand')
  await vCtx.close()
} finally {
  await browser.close()
}
console.log(`\nDone. ${OUT}`)
