#!/usr/bin/env node
// Part 2: read-only follow-up probes.
// - 2 more vendor detail pages (Special Requirements labeled vs JSON)
// - inbox scroll containment (#main scroll vs body scroll)
// - sidebar logo presence on non-dashboard pages confirmed
// - applications-list preview pane Special Requirements section

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const STAMP = "2026-06-15";
const OUT_DIR = path.resolve(`screenshots/admin-walkthrough-${STAMP}`);
const BASE = "https://cthalaal.co.za";
const DEMO_EMAIL = "dev@cthalaal.co.za";
const DEMO_PASSWORD = "DemoAdmin#2026";

async function shot(page, slug) {
  const p = path.join(OUT_DIR, `${slug}.png`);
  await page
    .screenshot({ path: p, fullPage: true, timeout: 10_000 })
    .catch(async () => {
      await page.screenshot({ path: p, fullPage: false }).catch(() => {});
    });
  return p;
}

async function login(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  await page.locator('input[type="email"]').first().fill(DEMO_EMAIL);
  await page.locator('input[type="password"]').first().fill(DEMO_PASSWORD);
  await page.locator('button[type="submit"]').first().click();
  await page
    .waitForURL((url) => !String(url).includes("/admin/login"), {
      timeout: 15_000,
    })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
}

async function probeSpecialReqOnDetail(page, slug) {
  return page
    .evaluate(() => {
      const text = document.body.innerText || "";
      // Find any heading containing "special requirements" OR "requirements & details"
      const candidates = Array.from(
        document.querySelectorAll("h1,h2,h3,h4,div,strong,label,p,span"),
      ).filter((el) =>
        /(special\s*requirements?|requirements\s*&\s*details)/i.test(
          el.textContent || "",
        ),
      );
      if (candidates.length === 0)
        return {
          foundHeading: false,
          fullPageHints: text.slice(0, 600),
        };
      // Take the smallest matching element (most precise heading)
      candidates.sort(
        (a, b) => (a.textContent || "").length - (b.textContent || "").length,
      );
      const headingEl = candidates[0];
      // Walk forward to gather the section content
      let collected = headingEl.textContent || "";
      let node = headingEl;
      // climb to parent then iterate next siblings
      const parent = headingEl.parentElement || headingEl;
      const sectionText = parent.innerText?.slice(0, 1200) || collected;
      // Heuristics
      const isRawJsonLooking = /[{,]\s*"[a-z_]+"\s*:/i.test(sectionText);
      const labelMatches = [
        /traded\s+before/i,
        /halal/i,
        /equipment/i,
        /power/i,
        /electrical/i,
        /appliance/i,
        /stall\s+type/i,
      ].filter((rx) => rx.test(sectionText)).length;
      return {
        foundHeading: true,
        headingText: headingEl.textContent?.trim()?.slice(0, 80),
        sectionSnippet: sectionText,
        isRawJsonLooking,
        labelMatches,
      };
    })
    .catch(() => null);
}

async function probeInboxScroll(page) {
  return page
    .evaluate(() => {
      // Look for inbox-specific scroll container
      const containers = Array.from(document.querySelectorAll("*"))
        .map((el) => {
          const cs = getComputedStyle(el);
          return {
            el,
            scrollY: cs.overflowY,
            sh: el.scrollHeight,
            ch: el.clientHeight,
          };
        })
        .filter(
          (x) =>
            (x.scrollY === "auto" || x.scrollY === "scroll") &&
            x.sh > x.ch + 50 &&
            x.ch > 100,
        );
      const docScrollable =
        document.documentElement.scrollHeight >
        document.documentElement.clientHeight + 50;
      const bodyScrollable =
        document.body.scrollHeight > window.innerHeight + 50;
      return {
        scrollableInnerCount: containers.length,
        scrollableSamples: containers.slice(0, 5).map((c) => ({
          tag: c.el.tagName,
          cls: c.el.className?.slice(0, 100),
          sh: c.sh,
          ch: c.ch,
        })),
        docScrollable,
        bodyScrollable,
        docHeight: document.documentElement.scrollHeight,
        winHeight: window.innerHeight,
      };
    })
    .catch(() => null);
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await ctx.newPage();
  const results = {};

  await login(page);

  // Visit 3 vendor detail pages from the applications list
  await page.goto(`${BASE}/admin/applications`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});

  const rows = await page
    .$$eval('a[href*="/admin/applications/"]', (els) =>
      Array.from(
        new Set(
          els
            .map((a) => a.getAttribute("href"))
            .filter((h) => h && /\/admin\/applications\/[a-f0-9-]{20,}/i.test(h)),
        ),
      ).slice(0, 4),
    )
    .catch(() => []);

  results.discoveredRows = rows;
  results.detailProbes = [];
  for (let i = 0; i < rows.length; i++) {
    const href = rows[i];
    try {
      await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded" });
      await page
        .waitForLoadState("networkidle", { timeout: 6_000 })
        .catch(() => {});
      const probe = await probeSpecialReqOnDetail(page, `detail-${i + 1}`);
      const s = await shot(page, `09b-detail-${i + 1}`);
      results.detailProbes.push({ href, probe, screenshot: s });
    } catch (e) {
      results.detailProbes.push({ href, error: String(e.message || e) });
    }
  }

  // Inbox scroll probe
  await page.goto(`${BASE}/admin/inbox`, { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  results.inboxScroll = await probeInboxScroll(page);
  await shot(page, "05b-inbox-scroll-probe");

  // Applications list preview pane Special Requirements
  await page.goto(`${BASE}/admin/applications`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  results.listPreviewSpecialReq = await page
    .evaluate(() => {
      const text = document.body.innerText || "";
      const hasSpecialReq = /special\s*requirements?/i.test(text);
      // Try to find the section
      const headingEl = Array.from(
        document.querySelectorAll("h1,h2,h3,h4,div,strong,label,p,span"),
      ).find((el) =>
        /special\s*requirements?/i.test(el.textContent || ""),
      );
      let sectionText = "";
      if (headingEl) {
        const parent = headingEl.parentElement || headingEl;
        sectionText = parent.innerText?.slice(0, 800) || "";
      }
      const isRawJsonLooking = /[{,]\s*"[a-z_]+"\s*:/i.test(sectionText);
      return { hasSpecialReq, sectionText, isRawJsonLooking };
    })
    .catch(() => null);
  await shot(page, "03b-applications-preview");

  await ctx.close();
  await browser.close();
  await writeFile(
    path.join(OUT_DIR, "results-pt2.json"),
    JSON.stringify(results, null, 2),
    "utf8",
  );
  console.log("DONE", path.join(OUT_DIR, "results-pt2.json"));
}

run().catch((e) => {
  console.error("FATAL", e);
  process.exit(1);
});
