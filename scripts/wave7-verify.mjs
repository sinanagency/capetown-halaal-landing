#!/usr/bin/env node
// Wave 7 verification — 3 admin-surface regression fixes
// Tests against localhost:3000 with dev admin creds.
// Output: ~/Desktop/cth-wave7-verify/

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const OUT = path.join(os.homedir(), "Desktop", "cth-wave7-verify");
const BASE = "http://localhost:3001";
const EMAIL = "dev@cthalaal.co.za";
const PASSWORD = "DemoAdmin#2026";

async function shot(page, slug) {
  const p = path.join(OUT, `${slug}.png`);
  await page.screenshot({ path: p, fullPage: false }).catch(() => {});
  console.log(`  shot: ${slug}.png`);
  return p;
}

async function login(page) {
  console.log("login: navigating to /admin/login");
  await page.goto(`${BASE}/admin/login`, { waitUntil: "load", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500); // hydration
  await page.waitForSelector("#email", { timeout: 8000 });
  await page.fill("#email", EMAIL);
  await page.fill("#password", PASSWORD);
  // Click submit explicitly, then wait for the auth POST to settle.
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("auth") || r.url().includes("login"), { timeout: 15000 }).catch(() => {}),
    page.click('button[type="submit"]'),
  ]);
  await page.waitForTimeout(2000);
  // Force a hard navigation to /admin to settle any client-side redirect race.
  await page.goto(`${BASE}/admin`, { waitUntil: "load", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  console.log("login: ok, at " + page.url());
}

async function visit(page, slug, route, settleMs = 1500) {
  console.log(`visit: ${route}`);
  await page.goto(`${BASE}${route}`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(settleMs);
  return shot(page, slug);
}

async function probe(page) {
  return page.evaluate(() => {
    const aside = document.querySelector("aside");
    const main = document.querySelector("main");
    const toggle = document.querySelector('button[aria-label="Collapse sidebar"], button[aria-label="Expand sidebar"]');
    const mainEl = main;
    const sidebarRect = aside?.getBoundingClientRect();
    const logo = aside?.querySelector('img[alt="Young at Heart"]');
    const logoRect = logo?.getBoundingClientRect();
    return {
      hasToggle: !!toggle,
      toggleAria: toggle?.getAttribute("aria-label") || null,
      sidebarWidth: sidebarRect ? Math.round(sidebarRect.width) : null,
      mainOverflowY: mainEl ? getComputedStyle(mainEl).overflowY : null,
      mainScrollHeight: mainEl?.scrollHeight ?? null,
      mainClientHeight: mainEl?.clientHeight ?? null,
      mainCanScroll: mainEl ? mainEl.scrollHeight > mainEl.clientHeight : false,
      logoVisible: !!logoRect && logoRect.width > 0 && logoRect.height > 0,
      logoWidth: logoRect ? Math.round(logoRect.width) : null,
      logoHeight: logoRect ? Math.round(logoRect.height) : null,
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();

  await login(page);

  console.log("\n=== FIX 1 + FIX 2: Dashboard ===");
  await visit(page, "01-dashboard-default", "/admin");
  const p1 = await probe(page);
  console.log("  probe:", JSON.stringify(p1, null, 2));

  console.log("\n=== FIX 2: Applications (toggle visible) ===");
  await visit(page, "02-applications", "/admin/applications");
  const p2 = await probe(page);
  console.log("  probe:", JSON.stringify(p2, null, 2));

  console.log("\n=== FIX 2: Support Inbox scrollable ===");
  await visit(page, "03-support-inbox", "/admin/support-inbox");
  const p3 = await probe(page);
  console.log("  probe:", JSON.stringify(p3, null, 2));

  console.log("\n=== FIX 2: Ticket Sales scrollable ===");
  await visit(page, "04-tickets", "/admin/tickets");
  const p4 = await probe(page);
  console.log("  probe:", JSON.stringify(p4, null, 2));

  console.log("\n=== FIX 3: Collapse sidebar from Applications, check logo ===");
  // We're on tickets. Go to applications, click the collapse toggle.
  await page.goto(`${BASE}/admin/applications`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(800);
  const toggleBtn = await page.$('button[aria-label="Collapse sidebar"]');
  if (toggleBtn) {
    await toggleBtn.click();
    await page.waitForTimeout(500);
    await shot(page, "05-applications-collapsed");
    const p5 = await probe(page);
    console.log("  probe (collapsed):", JSON.stringify(p5, null, 2));

    // navigate to dashboard while collapsed
    await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
    await page.waitForTimeout(800);
    await shot(page, "06-dashboard-collapsed");
    const p6 = await probe(page);
    console.log("  probe (dashboard collapsed):", JSON.stringify(p6, null, 2));

    // expand
    const expandBtn = await page.$('button[aria-label="Expand sidebar"]');
    if (expandBtn) {
      await expandBtn.click();
      await page.waitForTimeout(500);
    } else {
      console.log("  NOTE: no expand toggle on /admin (expected: toggle hidden on Dashboard)");
      // Go back to applications to expand
      await page.goto(`${BASE}/admin/applications`, { waitUntil: "domcontentloaded", timeout: 20000 });
      await page.waitForLoadState("networkidle", { timeout: 6000 }).catch(() => {});
      const exp = await page.$('button[aria-label="Expand sidebar"]');
      if (exp) { await exp.click(); await page.waitForTimeout(500); }
    }
  } else {
    console.log("  WARN: no collapse toggle on applications");
  }

  console.log("\nReport:");
  const report = {
    fix1_dashboard_no_toggle: p1.hasToggle === false,
    fix1_applications_has_toggle: p2.hasToggle === true,
    fix2_dashboard_main_scrollable: p1.mainOverflowY === "auto" || p1.mainOverflowY === "scroll",
    fix2_support_inbox_main_scrollable: p3.mainOverflowY === "auto" || p3.mainOverflowY === "scroll",
    fix2_tickets_main_scrollable: p4.mainOverflowY === "auto" || p4.mainOverflowY === "scroll",
  };
  console.log(JSON.stringify(report, null, 2));

  await browser.close();
  console.log("\nDONE → " + OUT);
}

main().catch((e) => { console.error(e); process.exit(1); });
