#!/usr/bin/env node
// READ-ONLY admin walkthrough against prod cthalaal.co.za.
// Logs in as demo admin, visits 9 surfaces, captures evidence.
// NEVER clicks approve/reject/delete. NEVER sends a message.
// NEVER touches src.

import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const STAMP = "2026-06-15";
const OUT_DIR = path.resolve(`screenshots/admin-walkthrough-${STAMP}`);
const BASE = "https://cthalaal.co.za";
const DEMO_EMAIL = "dev@cthalaal.co.za";
const DEMO_PASSWORD = "DemoAdmin#2026";
const NAV_TIMEOUT_MS = 25_000;
const ROUTE_BUDGET_MS = 45_000;

function withDeadline(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} exceeded ${ms}ms`)), ms),
    ),
  ]);
}

async function captureCommon(page, slug) {
  const consoleErrors = [];
  const pageErrors = [];
  const fiveXX = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text().slice(0, 400));
  });
  page.on("pageerror", (err) =>
    pageErrors.push(String(err.message || err).slice(0, 400)),
  );
  page.on("response", (resp) => {
    if (resp.status() >= 500)
      fiveXX.push({ url: resp.url(), status: resp.status() });
  });
  return { consoleErrors, pageErrors, fiveXX };
}

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
  const errors = await captureCommon(page, "login");
  await page.goto(`${BASE}/admin/login`, {
    waitUntil: "domcontentloaded",
    timeout: NAV_TIMEOUT_MS,
  });
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  const loginShot = await shot(page, "01-admin-login-hero");
  // Inspect hero: look for logo img + bg image
  const heroProbe = await page
    .evaluate(() => {
      const logos = Array.from(document.querySelectorAll("img")).map((i) => ({
        src: i.getAttribute("src"),
        alt: i.getAttribute("alt"),
        cls: i.getAttribute("class"),
        w: i.naturalWidth,
        h: i.naturalHeight,
      }));
      const bgEls = Array.from(document.querySelectorAll("*"))
        .map((el) => getComputedStyle(el).backgroundImage)
        .filter((v) => v && v !== "none")
        .slice(0, 10);
      const title = document.title;
      const h1 = Array.from(document.querySelectorAll("h1,h2"))
        .map((h) => h.textContent?.trim())
        .filter(Boolean)
        .slice(0, 5);
      return { logos: logos.slice(0, 8), bgEls, title, h1 };
    })
    .catch(() => null);

  // Fill the form
  // Try by label / placeholder / type
  const emailSel = 'input[type="email"], input[name="email"], input#email';
  const passSel = 'input[type="password"], input[name="password"], input#password';
  await page.locator(emailSel).first().fill(DEMO_EMAIL);
  await page.locator(passSel).first().fill(DEMO_PASSWORD);
  // Submit
  const submit = page
    .locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in")')
    .first();
  await submit.click({ timeout: 5_000 }).catch(() => {});
  // Wait for navigation away from /admin/login
  await page
    .waitForURL((url) => !String(url).includes("/admin/login"), {
      timeout: 15_000,
    })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  const afterUrl = page.url();
  return { loginShot, heroProbe, afterUrl, errors };
}

async function probeSidebarLogo(page) {
  return page
    .evaluate(() => {
      // Sidebar is typically an <aside> or <nav>
      const aside =
        document.querySelector("aside") ||
        document.querySelector('[data-sidebar="true"]') ||
        document.querySelector("nav");
      if (!aside) return { found: false };
      const img = aside.querySelector("img");
      if (!img) return { found: true, hasImg: false };
      const cs = getComputedStyle(img);
      return {
        found: true,
        hasImg: true,
        src: img.getAttribute("src"),
        cls: img.getAttribute("class"),
        height: cs.height,
        width: cs.width,
        transform: cs.transform,
        clientHeight: img.clientHeight,
      };
    })
    .catch(() => null);
}

async function probeApplications(page) {
  return page
    .evaluate(() => {
      const text = document.body.innerText || "";
      const chips = ["Status", "Sector", "Score", "Tier"].filter((label) =>
        text.includes(label),
      );
      const hasSearch =
        !!document.querySelector(
          'input[type="search"], input[placeholder*="earch" i]',
        );
      // Look for filter chip-like buttons
      const chipButtons = Array.from(document.querySelectorAll("button"))
        .map((b) => b.textContent?.trim())
        .filter((t) => t && t.length < 30)
        .slice(0, 30);
      return {
        chipsFound: chips,
        chipsTotal: chips.length,
        hasSearch,
        chipButtonsSample: chipButtons,
        bodySnippet: text.slice(0, 600),
      };
    })
    .catch(() => null);
}

async function probeAllocation(page) {
  return page
    .evaluate(() => {
      // Find any SVG or canvas that looks like a floor plan
      const svgs = Array.from(document.querySelectorAll("svg"));
      const candidates = svgs.map((s) => ({
        w: s.getBoundingClientRect().width,
        h: s.getBoundingClientRect().height,
        children: s.children.length,
      }));
      const biggest = candidates.sort((a, b) => b.w * b.h - a.w * a.h)[0];
      const hasSearch = !!document.querySelector(
        'input[type="search"], input[placeholder*="earch" i], input[placeholder*="tall" i]',
      );
      const text = document.body.innerText || "";
      return {
        svgCount: svgs.length,
        biggestSvg: biggest,
        hasSearch,
        mentionsPanZoom: /pan|zoom|wheel/i.test(text),
        bodySnippet: text.slice(0, 400),
      };
    })
    .catch(() => null);
}

async function probeInbox(page) {
  return page
    .evaluate(() => {
      const text = document.body.innerText || "";
      const html = document.body.innerHTML || "";
      const docH = document.documentElement.scrollHeight;
      const winH = window.innerHeight;
      const rawPTags = (html.match(/&lt;p&gt;/g) || []).length;
      return {
        bodyText: text.slice(0, 600),
        docH,
        winH,
        scrollLockedish: docH <= winH + 50,
        rawPTagsCount: rawPTags,
        hasVendor: /vendor/i.test(text),
        hasTicket: /ticket/i.test(text),
      };
    })
    .catch(() => null);
}

async function probeSupportInbox(page) {
  return page
    .evaluate(() => {
      const text = document.body.innerText || "";
      const html = document.body.innerHTML || "";
      // Did <p> tags render as raw text? If the user is seeing "<p>" in the page text, that's a render-as-text bug
      const rawTagInVisibleText =
        text.includes("<p>") || text.includes("</p>");
      const hasSent = /\bSent\b/.test(text);
      const tabs = Array.from(
        document.querySelectorAll('[role="tab"], button, a'),
      )
        .map((el) => el.textContent?.trim())
        .filter((t) => t && t.length < 30)
        .slice(0, 40);
      return {
        bodyText: text.slice(0, 800),
        rawTagInVisibleText,
        hasSent,
        tabsSample: tabs,
      };
    })
    .catch(() => null);
}

async function probeDocuments(page) {
  return page
    .evaluate(() => {
      const text = document.body.innerText || "";
      const links = Array.from(document.querySelectorAll("a"))
        .map((a) => ({
          href: a.getAttribute("href"),
          text: a.textContent?.trim()?.slice(0, 60),
        }))
        .filter((l) => l.href)
        .slice(0, 30);
      const pdfLinks = links.filter(
        (l) => /\.pdf/i.test(l.href || "") || /view\s*pdf/i.test(l.text || ""),
      );
      return {
        bodySnippet: text.slice(0, 500),
        linkCount: links.length,
        pdfLinkCount: pdfLinks.length,
        pdfLinksSample: pdfLinks.slice(0, 5),
      };
    })
    .catch(() => null);
}

async function probeCommsHealth(page) {
  return page
    .evaluate(() => {
      const text = document.body.innerText || "";
      const hasPending = /Probe pending/i.test(text);
      const matches = {
        whatsapp: /whatsapp/i.test(text),
        email: /email/i.test(text),
        dgx: /dgx/i.test(text),
      };
      // Look for status pill colors
      const pills = Array.from(document.querySelectorAll("span,div"))
        .filter((el) => {
          const cs = getComputedStyle(el);
          return (
            el.children.length === 0 &&
            el.textContent?.length &&
            el.textContent.length < 30 &&
            (cs.backgroundColor !== "rgba(0, 0, 0, 0)" ||
              cs.color !== "rgb(0, 0, 0)")
          );
        })
        .map((el) => el.textContent?.trim())
        .filter(Boolean)
        .slice(0, 40);
      return {
        bodySnippet: text.slice(0, 800),
        hasProbePending: hasPending,
        labelsPresent: matches,
        pillsSample: pills,
      };
    })
    .catch(() => null);
}

async function probeSpecialRequirements(page) {
  // On /admin/applications, click first row and inspect preview pane
  // READ-ONLY: click row to open preview, do NOT click approve/reject
  const rowProbes = [];
  // Find application rows. Try links or row buttons that aren't action buttons.
  const rowLocators = page.locator(
    'a[href*="/admin/applications/"], tr[role="row"], [data-row], button[data-application-id]',
  );
  // Try to click 2-3 distinct rows via different strategies.
  // Strategy: click first row link
  const rowLinks = await page
    .$$eval('a[href*="/admin/applications/"]', (els) =>
      els
        .map((a) => ({
          href: a.getAttribute("href"),
          text: a.textContent?.trim()?.slice(0, 80),
        }))
        .filter((l) => l.href && l.href !== "/admin/applications"),
    )
    .catch(() => []);

  const distinct = [];
  const seen = new Set();
  for (const l of rowLinks) {
    if (!seen.has(l.href)) {
      seen.add(l.href);
      distinct.push(l);
    }
    if (distinct.length >= 3) break;
  }

  for (let i = 0; i < distinct.length; i++) {
    const l = distinct[i];
    try {
      await page.goto(`${BASE}${l.href}`, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });
      await page
        .waitForLoadState("networkidle", { timeout: 6_000 })
        .catch(() => {});
      const probe = await page
        .evaluate(() => {
          const text = document.body.innerText || "";
          // Look for "Special requirements" / "Special Requirements" section
          const headingEl = Array.from(
            document.querySelectorAll("h1,h2,h3,h4,strong,label,div"),
          ).find((el) =>
            /special\s*requirements?/i.test(el.textContent || ""),
          );
          let sectionText = "";
          if (headingEl) {
            // Pull up to ~600 chars after this heading
            let node = headingEl;
            let collected = headingEl.textContent || "";
            for (let i = 0; i < 6 && node.nextElementSibling; i++) {
              node = node.nextElementSibling;
              collected += " | " + (node.textContent || "");
              if (collected.length > 800) break;
            }
            sectionText = collected;
          }
          const isRawJson = /\{[^}]*"[^"]+"\s*:\s*"/.test(sectionText);
          const hasLabeledFields =
            /traded\s+before/i.test(sectionText) ||
            /halal/i.test(sectionText) ||
            /equipment/i.test(sectionText) ||
            /power/i.test(sectionText);
          return {
            foundHeading: !!headingEl,
            sectionSnippet: sectionText.slice(0, 800),
            isRawJsonLooking: isRawJson,
            hasLabeledFields,
            pageTitle: document.title,
            bodySnippet: text.slice(0, 400),
          };
        })
        .catch(() => null);
      const s = await shot(page, `09-special-req-${i + 1}`);
      rowProbes.push({ href: l.href, label: l.text, probe, screenshot: s });
    } catch (e) {
      rowProbes.push({
        href: l.href,
        label: l.text,
        error: String(e.message || e).slice(0, 200),
      });
    }
  }
  return { rowsTried: distinct.length, rowProbes };
}

async function run() {
  await mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
    userAgent:
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36 zanii-admin-walkthrough",
  });
  const page = await ctx.newPage();
  const results = {};

  // 1. Login + login hero
  console.log("-> /admin/login");
  const loginResult = await login(page);
  results.login = loginResult;

  // Verify we're authenticated
  const postLoginUrl = page.url();
  console.log(`   post-login url: ${postLoginUrl}`);

  // 2. Sidebar logo probe (read whichever admin page we landed on)
  console.log("-> sidebar logo probe");
  const sidebar1 = await probeSidebarLogo(page);
  results.sidebarLogo = { atUrl: postLoginUrl, probe: sidebar1 };
  await shot(page, "02-sidebar-logo-post-login");

  // 3. /admin/applications
  console.log("-> /admin/applications");
  await page
    .goto(`${BASE}/admin/applications`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    })
    .catch((e) => (results.applicationsNavErr = String(e.message || e)));
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  const appsShot = await shot(page, "03-admin-applications");
  results.applications = {
    url: page.url(),
    shot: appsShot,
    probe: await probeApplications(page),
  };

  // 4. /admin/allocation
  console.log("-> /admin/allocation");
  await page
    .goto(`${BASE}/admin/allocation`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    })
    .catch((e) => (results.allocationNavErr = String(e.message || e)));
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  const allocShot = await shot(page, "04-admin-allocation");
  results.allocation = {
    url: page.url(),
    shot: allocShot,
    probe: await probeAllocation(page),
  };

  // 5. /admin/inbox
  console.log("-> /admin/inbox");
  await page
    .goto(`${BASE}/admin/inbox`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    })
    .catch((e) => (results.inboxNavErr = String(e.message || e)));
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  const inboxShot = await shot(page, "05-admin-inbox");
  results.inbox = {
    url: page.url(),
    shot: inboxShot,
    probe: await probeInbox(page),
  };

  // 6. /admin/support-inbox
  console.log("-> /admin/support-inbox");
  await page
    .goto(`${BASE}/admin/support-inbox`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    })
    .catch((e) => (results.supportInboxNavErr = String(e.message || e)));
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  const supShot = await shot(page, "06-admin-support-inbox");
  results.supportInbox = {
    url: page.url(),
    shot: supShot,
    probe: await probeSupportInbox(page),
  };

  // 7. /admin/documents
  console.log("-> /admin/documents");
  await page
    .goto(`${BASE}/admin/documents`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    })
    .catch((e) => (results.documentsNavErr = String(e.message || e)));
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  const docsShot = await shot(page, "07-admin-documents");
  results.documents = {
    url: page.url(),
    shot: docsShot,
    probe: await probeDocuments(page),
  };

  // Also: verify Documents link exists in sidebar nav
  const sidebarNavProbe = await page
    .evaluate(() => {
      const aside =
        document.querySelector("aside") ||
        document.querySelector('[data-sidebar="true"]') ||
        document.querySelector("nav");
      if (!aside) return { found: false };
      const items = Array.from(aside.querySelectorAll("a")).map((a) => ({
        href: a.getAttribute("href"),
        text: a.textContent?.trim()?.slice(0, 40),
      }));
      const hasDocuments = items.some((i) => /documents/i.test(i.text || ""));
      const hasOperations = items.some((i) => /operations/i.test(i.text || ""));
      // Capture full innerText to look for "Operations" group header
      const aText = aside.innerText || "";
      return {
        found: true,
        items: items.slice(0, 40),
        hasDocuments,
        hasOperations,
        hasOperationsText: /operations/i.test(aText),
      };
    })
    .catch(() => null);
  results.sidebarNav = sidebarNavProbe;

  // 8. /admin/settings/comms-health
  console.log("-> /admin/settings/comms-health");
  await page
    .goto(`${BASE}/admin/settings/comms-health`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    })
    .catch((e) => (results.commsHealthNavErr = String(e.message || e)));
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  const commsShot = await shot(page, "08-comms-health");
  results.commsHealth = {
    url: page.url(),
    shot: commsShot,
    probe: await probeCommsHealth(page),
  };

  // 9. PreviewPane Special Requirements — visit 2-3 vendor application detail pages
  console.log("-> back to applications + open 2-3 rows for Special Requirements");
  await page
    .goto(`${BASE}/admin/applications`, {
      waitUntil: "domcontentloaded",
      timeout: NAV_TIMEOUT_MS,
    })
    .catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 8_000 }).catch(() => {});
  const specReq = await probeSpecialRequirements(page);
  results.specialRequirements = specReq;

  await ctx.close().catch(() => {});
  await browser.close().catch(() => {});

  await writeFile(
    path.join(OUT_DIR, "results.json"),
    JSON.stringify(results, null, 2),
    "utf8",
  );
  console.log(`\nRESULTS: ${path.join(OUT_DIR, "results.json")}`);
  return results;
}

run().catch((err) => {
  console.error("FATAL:", err);
  process.exit(1);
});
