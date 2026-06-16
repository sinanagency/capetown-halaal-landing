#!/usr/bin/env node
// Probe PROD vendor portal /stand to see if the map is actually missing
// or if it's a render/data issue
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const OUT = path.join(os.homedir(), "Desktop", "cth-wave7-verify", "prod-probe");
const BASE = "https://cthalaal.co.za";
const EMAIL = "demo-vendor@cthalaal.co.za";
const PASSWORD = "DemoVendor#2026";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const failedRequests = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 300));
  });
  page.on("response", (resp) => {
    if (resp.status() >= 400) failedRequests.push({ url: resp.url(), status: resp.status() });
  });

  await page.goto(`${BASE}/exhibitor/login`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.press('input[type="password"]', "Enter");
  await page.waitForTimeout(3500);
  console.log("after login:", page.url());

  await page.goto(`${BASE}/exhibitor/portal/stand`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, "vendor-stand-prod.png"), fullPage: true });
  await page.screenshot({ path: path.join(OUT, "vendor-stand-prod-viewport.png"), fullPage: false });

  const probe = await page.evaluate(() => {
    const map = document.querySelector('[class*="FloorCommand"]') ||
                document.querySelector('svg') ||
                document.querySelector('[class*="floor"]');
    const loading = Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('Loading the floor plan'));
    const errorBox = document.querySelector('[class*="bf3026"]');
    return {
      url: location.href,
      hasSvg: !!document.querySelector('svg'),
      svgCount: document.querySelectorAll('svg').length,
      hasMapText: !!Array.from(document.querySelectorAll('*')).find(el => el.textContent?.match(/FS\d+|TS\d+|BS\d+/)),
      isLoading: !!loading,
      hasError: !!errorBox,
      errorText: errorBox?.textContent || null,
      bodyHeight: document.body.scrollHeight,
      title: document.title,
    };
  });
  console.log("PROD vendor stand probe:");
  console.log(JSON.stringify(probe, null, 2));
  console.log("\nFailed requests:");
  failedRequests.forEach(r => console.log(`  ${r.status}  ${r.url}`));
  console.log("\nConsole errors:");
  consoleErrors.slice(0, 10).forEach(e => console.log(`  ${e}`));

  await browser.close();
  console.log("\nshots → " + OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
