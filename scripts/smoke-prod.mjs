#!/usr/bin/env node
// Read-only visual smoke pass against the live cthalaal.co.za prod deploy.
// Captures full-page screenshots, redirects, console errors, 5xx requests.
// DOES NOT authenticate. DOES NOT fill forms. DOES NOT click anything.

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const STAMP = "2026-06-15";
const OUT_DIR = path.resolve(`screenshots/smoke-${STAMP}`);
const NAV_TIMEOUT_MS = 15_000;
const ROUTE_BUDGET_MS = 30_000;

const ROUTES = [
  { slug: "homepage", url: "https://cthalaal.co.za/" },
  { slug: "admin-login", url: "https://cthalaal.co.za/admin/login" },
  { slug: "exhibitor-login", url: "https://cthalaal.co.za/exhibitor/login" },
  { slug: "admin-comms-health", url: "https://cthalaal.co.za/admin/settings/comms-health" },
  { slug: "exhibitor-portal-documents", url: "https://cthalaal.co.za/exhibitor/portal/documents" },
  { slug: "exhibitor-portal-stand", url: "https://cthalaal.co.za/exhibitor/portal/stand" },
  { slug: "admin-allocation", url: "https://cthalaal.co.za/admin/allocation" },
  { slug: "admin-applications", url: "https://cthalaal.co.za/admin/applications" },
  { slug: "admin-documents", url: "https://cthalaal.co.za/admin/documents" },
];

function withDeadline(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms)),
  ]);
}

async function probeRoute(browser, route) {
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 zanii-smoke-prod",
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  const pageErrors = [];
  const fiveXX = [];
  let mainStatus = null;

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text().slice(0, 400));
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(String(err.message || err).slice(0, 400));
  });
  page.on("response", (resp) => {
    const url = resp.url();
    const status = resp.status();
    if (status >= 500) {
      fiveXX.push({ url, status });
    }
    if (mainStatus === null && url === route.url) {
      mainStatus = status;
    }
  });

  let finalUrl = null;
  let title = null;
  let nextDigest = null;
  let nav_error = null;

  try {
    const resp = await withDeadline(
      page.goto(route.url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS }),
      ROUTE_BUDGET_MS,
      `goto ${route.slug}`,
    );
    if (resp && mainStatus === null) mainStatus = resp.status();
    // Brief settle so client redirects + hydration produce a representative screenshot.
    await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
    finalUrl = page.url();
    title = await page.title().catch(() => null);

    // Capture Next.js error digest if visible (Next renders a digest on 500s).
    nextDigest = await page
      .evaluate(() => {
        const m = document.body && document.body.innerText
          ? document.body.innerText.match(/Digest:\s*([a-z0-9]+)/i)
          : null;
        return m ? m[1] : null;
      })
      .catch(() => null);

    const shotPath = path.join(OUT_DIR, `${route.slug}.png`);
    await page
      .screenshot({ path: shotPath, fullPage: true, timeout: 10_000 })
      .catch(async () => {
        // Fallback to viewport-only screenshot if fullPage stalls.
        await page.screenshot({ path: shotPath, fullPage: false }).catch(() => {});
      });
  } catch (err) {
    nav_error = String(err.message || err).slice(0, 400);
    try {
      finalUrl = page.url();
    } catch {}
    try {
      const shotPath = path.join(OUT_DIR, `${route.slug}.png`);
      await page.screenshot({ path: shotPath, fullPage: false, timeout: 5_000 }).catch(() => {});
    } catch {}
  }

  await ctx.close().catch(() => {});

  return {
    slug: route.slug,
    url: route.url,
    status: mainStatus,
    finalUrl,
    title,
    consoleErrors,
    pageErrors,
    fiveXX,
    nextDigest,
    nav_error,
  };
}

function escapePipes(s) {
  if (s === null || s === undefined) return "";
  return String(s).replace(/\|/g, "\\|").replace(/\n/g, " ").slice(0, 220);
}

function buildReport(results) {
  const lines = [];
  lines.push(`# CTH Halaal prod smoke — ${STAMP}`);
  lines.push("");
  lines.push(`Read-only Playwright pass against cthalaal.co.za. No auth, no clicks, no form input.`);
  lines.push("");

  const fires = results.filter(
    (r) =>
      (r.consoleErrors && r.consoleErrors.length > 0) ||
      (r.pageErrors && r.pageErrors.length > 0) ||
      (r.fiveXX && r.fiveXX.length > 0) ||
      r.nav_error ||
      r.nextDigest ||
      (r.status !== null && r.status >= 500),
  );

  lines.push("## FIRES");
  if (fires.length === 0) {
    lines.push("");
    lines.push("no fires");
    lines.push("");
  } else {
    lines.push("");
    for (const r of fires) {
      lines.push(`### ${r.slug}  (${r.url})`);
      lines.push(`- status: ${r.status ?? "—"}`);
      lines.push(`- finalUrl: ${r.finalUrl ?? "—"}`);
      if (r.nav_error) lines.push(`- nav_error: ${r.nav_error}`);
      if (r.nextDigest) lines.push(`- next_digest: ${r.nextDigest}`);
      if (r.fiveXX && r.fiveXX.length) {
        lines.push(`- 5xx requests:`);
        for (const x of r.fiveXX.slice(0, 10)) lines.push(`  - ${x.status} ${x.url}`);
      }
      if (r.consoleErrors && r.consoleErrors.length) {
        lines.push(`- console errors:`);
        for (const c of r.consoleErrors.slice(0, 10)) lines.push(`  - ${c}`);
      }
      if (r.pageErrors && r.pageErrors.length) {
        lines.push(`- page errors:`);
        for (const c of r.pageErrors.slice(0, 10)) lines.push(`  - ${c}`);
      }
      lines.push("");
    }
  }

  lines.push("## Routes");
  lines.push("");
  lines.push("| route | status | final URL | title | console errs | 5xx | digest |");
  lines.push("|---|---|---|---|---|---|---|");
  for (const r of results) {
    lines.push(
      `| ${escapePipes(r.slug)} | ${r.status ?? "—"} | ${escapePipes(r.finalUrl)} | ${escapePipes(r.title)} | ${r.consoleErrors.length} | ${r.fiveXX.length} | ${escapePipes(r.nextDigest)} |`,
    );
  }
  lines.push("");

  lines.push("## Raw");
  lines.push("");
  lines.push("```json");
  lines.push(JSON.stringify(results, null, 2));
  lines.push("```");
  lines.push("");

  return lines.join("\n");
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    for (const route of ROUTES) {
      const startedAt = Date.now();
      process.stdout.write(`-> ${route.slug}  ${route.url}\n`);
      const r = await probeRoute(browser, route);
      const ms = Date.now() - startedAt;
      results.push(r);
      process.stdout.write(
        `   status=${r.status ?? "—"} final=${r.finalUrl ?? "—"} console=${r.consoleErrors.length} 5xx=${r.fiveXX.length} digest=${r.nextDigest ?? "—"} took=${ms}ms\n`,
      );
    }
  } finally {
    await browser.close().catch(() => {});
  }

  const report = buildReport(results);
  await writeFile(path.join(OUT_DIR, "REPORT.md"), report, "utf8");
  await writeFile(
    path.join(OUT_DIR, "results.json"),
    JSON.stringify(results, null, 2),
    "utf8",
  );

  process.stdout.write(`\nREPORT: ${path.join(OUT_DIR, "REPORT.md")}\n`);
}

main().catch((err) => {
  console.error("smoke-prod fatal:", err);
  process.exit(1);
});
