// Side-by-side proof: /admin/allocation must render the SAME FloorCommand as
// /exhibitor/portal/stand. Long settle so ResizeObserver + fit-to-view finishes.
import { chromium } from 'playwright'
import path from 'node:path'
import os from 'node:os'
import fs from 'node:fs'

const BASE = 'https://cthalaal.co.za'
const OUT = path.join(os.homedir(), 'Desktop', 'cthalaal-map-compare')
fs.mkdirSync(OUT, { recursive: true })
const ADMIN = { email: 'dev@cthalaal.co.za', password: 'DemoAdmin#2026' }
const VENDOR = { email: 'demo-vendor@cthalaal.co.za', password: 'DemoVendor#2026' }

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

async function shoot(page, url, slug) {
  await page.goto(BASE + url, { waitUntil: 'networkidle', timeout: 45000 })
  // FloorCommand uses ResizeObserver + fit-to-view + SVG render. Give it real time.
  await page.waitForTimeout(4000)
  // Check the page actually has the FloorCommand chrome text.
  const has = await page.locator('text=Floor Command').count().catch(() => 0)
  const sigText = await page.locator('text=YOUNG AT HEART FESTIVAL').count().catch(() => 0)
  console.log(`  ${slug}: FloorCommand-chrome=${has > 0} ' YAH-FESTIVAL '26 ${sigText > 0}`)
  await page.screenshot({ path: path.join(OUT, `${slug}-fullpage.png`), fullPage: true })
  await page.screenshot({ path: path.join(OUT, `${slug}-viewport.png`), fullPage: false })
  return { has, sigText }
}

const browser = await chromium.launch({ headless: true })
try {
  console.log('[admin] login + shoot /admin/allocation')
  const aCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const aPage = await aCtx.newPage()
  await loginAdmin(aPage)
  const a = await shoot(aPage, '/admin/allocation', 'ADMIN-allocation')
  await aCtx.close()

  console.log('\n[vendor] login + shoot /exhibitor/portal/stand')
  const vCtx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const vPage = await vCtx.newPage()
  await loginVendor(vPage)
  const v = await shoot(vPage, '/exhibitor/portal/stand', 'VENDOR-stand')
  await vCtx.close()

  // Verdict
  const sameComponent = a.has > 0 && v.has > 0 && a.sigText > 0 && v.sigText > 0
  console.log(`\nVERDICT: both use FloorCommand = ${sameComponent ? 'YES' : 'NO'}`)
} finally {
  await browser.close()
}
console.log(`\nFiles in: ${OUT}`)
