#!/usr/bin/env node
// Verify the admin redirect on vendor portal works post-deploy
import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const OUT = path.join(os.homedir(), "Desktop", "cth-wave7-verify", "prod-probe");
const BASE = "https://cthalaal.co.za";

async function probeAs(label, email, password, finalPath) {
  const browser = await chromium.launch({ headless: false });
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  // login on admin OR exhibitor login depending on the email type
  const loginUrl = email.startsWith("dev@") ? "/admin/login" : "/exhibitor/login";
  await page.goto(`${BASE}${loginUrl}`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(1500);
  if (email.startsWith("dev@")) {
    await page.fill("#email", email);
    await page.fill("#password", password);
    await page.click('button[type="submit"]');
  } else {
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.press('input[type="password"]', "Enter");
  }
  await page.waitForTimeout(3500);
  await page.goto(`${BASE}${finalPath}`, { waitUntil: "domcontentloaded", timeout: 25000 });
  await page.waitForLoadState("networkidle", { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(2500);
  const finalUrl = page.url();
  const hasUnauthorizedText = await page.evaluate(() =>
    document.body.textContent?.includes("Unauthorized") ?? false
  );
  await page.screenshot({ path: path.join(OUT, `authz-${label}.png`), fullPage: false });
  console.log(`${label}: targeted ${finalPath} → landed ${finalUrl}  hasUnauthorized=${hasUnauthorizedText}`);
  await browser.close();
  return { finalUrl, hasUnauthorizedText };
}

async function main() {
  await mkdir(OUT, { recursive: true });

  console.log("=== admin user navigates to vendor /stand ===");
  const adminCase = await probeAs("admin-to-vendor-stand", "dev@cthalaal.co.za", "DemoAdmin#2026", "/exhibitor/portal/stand");
  // Expect: redirected away from /exhibitor/portal/stand, no "Unauthorized" text

  console.log("\n=== real vendor user navigates to /stand ===");
  const vendorCase = await probeAs("vendor-to-stand", "demo-vendor@cthalaal.co.za", "DemoVendor#2026", "/exhibitor/portal/stand");
  // Expect: stays on /stand, no "Unauthorized" text, map renders

  console.log("\n=== REPORT ===");
  console.log("admin redirected away:", !adminCase.finalUrl.includes("/exhibitor/portal/stand"));
  console.log("admin no Unauthorized:", !adminCase.hasUnauthorizedText);
  console.log("vendor stays on /stand:", vendorCase.finalUrl.includes("/exhibitor/portal/stand"));
  console.log("vendor no Unauthorized:", !vendorCase.hasUnauthorizedText);
}

main().catch((e) => { console.error(e); process.exit(1); });
