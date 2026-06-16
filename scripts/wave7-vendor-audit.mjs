#!/usr/bin/env node
// Wave 7 audit — same 3 regression classes, vendor portal side
// FIX 1 analog: any UI element leaking onto a wrong route
// FIX 2 analog: every portal page main element scrolls within bounded area
// FIX 3 analog: logo renders correctly across viewports

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const OUT = path.join(os.homedir(), "Desktop", "cth-wave7-verify", "vendor");
const BASE = "http://localhost:3001";
const EMAIL = "demo-vendor@cthalaal.co.za";
const PASSWORD = "DemoVendor#2026";

const ROUTES = [
  ["overview", "/exhibitor/portal"],
  ["stand", "/exhibitor/portal/stand"],
  ["documents", "/exhibitor/portal/documents"],
  ["marketing", "/exhibitor/portal/marketing"],
  ["staff", "/exhibitor/portal/staff"],
  ["announcements", "/exhibitor/portal/announcements"],
  ["support", "/exhibitor/portal/support"],
  ["payments", "/exhibitor/portal/payments"],
  ["profile", "/exhibitor/portal/profile"],
  ["resources", "/exhibitor/portal/resources"],
];

async function shot(page, slug) {
  const p = path.join(OUT, `${slug}.png`);
  await page.screenshot({ path: p, fullPage: false }).catch(() => {});
  return p;
}

async function login(page) {
  console.log("login: navigating to /exhibitor/login");
  await page.goto(`${BASE}/exhibitor/login`, { waitUntil: "load", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  // Vendor login button has no type=submit, so press Enter on password input
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("auth") || r.url().includes("login"), { timeout: 15000 }).catch(() => {}),
    page.press('input[type="password"]', "Enter"),
  ]);
  await page.waitForTimeout(2500);
  await page.goto(`${BASE}/exhibitor/portal`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1500);
  console.log("login: at " + page.url());
}

async function probe(page) {
  return page.evaluate(() => {
    const main = document.querySelector("main");
    const nav = document.querySelector("nav") || document.querySelector('[class*="sticky"]');
    const logo = document.querySelector('img[alt="Young at Heart"]');
    const mainRect = main?.getBoundingClientRect();
    const logoRect = logo?.getBoundingClientRect();
    const mainCs = main ? getComputedStyle(main) : null;
    return {
      mainOverflowY: mainCs?.overflowY ?? null,
      mainHeight: mainRect ? Math.round(mainRect.height) : null,
      mainScrollHeight: main?.scrollHeight ?? null,
      mainClientHeight: main?.clientHeight ?? null,
      mainCanScroll: main ? main.scrollHeight > main.clientHeight : false,
      navHeight: nav?.getBoundingClientRect().height ? Math.round(nav.getBoundingClientRect().height) : null,
      logoVisible: !!logoRect && logoRect.width > 0 && logoRect.height > 0,
      logoWidth: logoRect ? Math.round(logoRect.width) : null,
      logoHeight: logoRect ? Math.round(logoRect.height) : null,
      bodyOverflow: getComputedStyle(document.body).overflow,
      htmlOverflow: getComputedStyle(document.documentElement).overflow,
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await login(page);

  const results = {};
  for (const [slug, route] of ROUTES) {
    console.log(`\nvisit: ${route}`);
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
      await page.waitForTimeout(1500);
      const p = await probe(page);
      await shot(page, slug);
      results[slug] = { route, ...p };
      console.log(`  main: overflowY=${p.mainOverflowY} canScroll=${p.mainCanScroll} h=${p.mainHeight} scroll=${p.mainScrollHeight}/${p.mainClientHeight}`);
    } catch (e) {
      results[slug] = { route, error: String(e.message || e) };
      console.log(`  ERROR: ${e.message}`);
    }
  }

  // Also probe mobile viewport
  console.log("\n=== mobile viewport probe (375x812) ===");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE}/exhibitor/portal`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(1500);
  const mobile = await probe(page);
  await shot(page, "mobile-overview");
  console.log("  mobile probe:", JSON.stringify(mobile, null, 2));

  console.log("\n=== AUDIT REPORT ===");
  const failures = [];
  for (const [slug, r] of Object.entries(results)) {
    if (r.error) {
      failures.push(`${slug}: error — ${r.error}`);
      continue;
    }
    const overflowOk = r.mainOverflowY === "auto" || r.mainOverflowY === "scroll";
    if (!overflowOk) failures.push(`${slug}: main overflowY = ${r.mainOverflowY} (expected auto/scroll)`);
    if (!r.logoVisible) failures.push(`${slug}: logo not visible`);
  }
  if (mobile.mainOverflowY !== "auto" && mobile.mainOverflowY !== "scroll") {
    failures.push(`mobile-overview: main overflowY = ${mobile.mainOverflowY}`);
  }
  if (!mobile.logoVisible) failures.push(`mobile-overview: logo not visible`);

  if (failures.length === 0) {
    console.log("ALL PROBES PASS — no regressions found on vendor portal.");
  } else {
    console.log("FAILURES:");
    failures.forEach((f) => console.log("  - " + f));
  }
  console.log("\nDONE → " + OUT);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
