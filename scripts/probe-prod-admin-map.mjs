#!/usr/bin/env node
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const OUT = path.join(os.homedir(), "Desktop", "cth-wave7-verify", "prod-probe");
const BASE = "https://cthalaal.co.za";
const EMAIL = "dev@cthalaal.co.za";
const PASSWORD = "DemoAdmin#2026";

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  const failed = [];
  const consoleErrs = [];
  page.on("response", (r) => { if (r.status() >= 400) failed.push({ url: r.url(), status: r.status() }); });
  page.on("console", (m) => { if (m.type() === "error") consoleErrs.push(m.text().slice(0, 300)); });

  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(4000);
  console.log("after login:", page.url());

  // probe /admin/allocation
  await page.goto(`${BASE}/admin/allocation`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(3500);
  await page.screenshot({ path: path.join(OUT, "admin-allocation-prod.png"), fullPage: false });
  const alloc = await page.evaluate(() => ({
    url: location.href,
    svgCount: document.querySelectorAll('svg').length,
    boothCount: Array.from(document.querySelectorAll('*')).filter(el => el.textContent?.match(/^(FS|TS|BS|FT)\d+$/)).length,
    hasLoadingText: document.body.textContent?.includes('Loading') ?? false,
    hasErrorText: !!Array.from(document.querySelectorAll('*')).find(el => el.textContent?.includes('Could not') || el.textContent?.includes('Error')),
    bodyHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight,
    mainOverflowY: getComputedStyle(document.querySelector('main')).overflowY,
  }));
  console.log("admin/allocation:", JSON.stringify(alloc, null, 2));

  // probe /admin/documents
  await page.goto(`${BASE}/admin/documents`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, "admin-documents-prod.png"), fullPage: false });
  const docs = await page.evaluate(() => ({
    url: location.href,
    mainOverflowY: getComputedStyle(document.querySelector('main')).overflowY,
    mainScrollHeight: document.querySelector('main')?.scrollHeight,
    mainClientHeight: document.querySelector('main')?.clientHeight,
    bodyScrollHeight: document.body.scrollHeight,
    viewportHeight: window.innerHeight,
    canMainScroll: document.querySelector('main') ? document.querySelector('main').scrollHeight > document.querySelector('main').clientHeight : null,
    canBodyScroll: document.body.scrollHeight > window.innerHeight,
  }));
  console.log("admin/documents:", JSON.stringify(docs, null, 2));

  // probe /admin/tickets
  await page.goto(`${BASE}/admin/tickets`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(OUT, "admin-tickets-prod.png"), fullPage: false });
  const tix = await page.evaluate(() => ({
    url: location.href,
    mainOverflowY: getComputedStyle(document.querySelector('main')).overflowY,
    mainScrollHeight: document.querySelector('main')?.scrollHeight,
    mainClientHeight: document.querySelector('main')?.clientHeight,
    canMainScroll: document.querySelector('main') ? document.querySelector('main').scrollHeight > document.querySelector('main').clientHeight : null,
  }));
  console.log("admin/tickets:", JSON.stringify(tix, null, 2));

  console.log("\nfailed requests:");
  failed.forEach(r => console.log(`  ${r.status}  ${r.url}`));
  console.log("\nconsole errors:");
  consoleErrs.slice(0, 5).forEach(e => console.log(`  ${e}`));

  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
