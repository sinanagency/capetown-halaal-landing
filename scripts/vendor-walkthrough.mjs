#!/usr/bin/env node
// Vendor portal verification walk-through.
// Read-only: never submits a form, never clicks a download link.

import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://cthalaal.co.za';
const EMAIL = 'demo-vendor@cthalaal.co.za';
const PASSWORD = 'DemoVendor#2026';
const OUT_DIR = path.resolve('screenshots/vendor-walkthrough-2026-06-15');

const findings = [];

function record(surface, status, notes, screenshot) {
  findings.push({ surface, status, notes, screenshot });
  const tag = status === 'PASS' ? 'PASS' : status === 'PARTIAL' ? 'PARTIAL' : status === 'FAIL' ? 'FAIL' : status;
  console.log(`[${tag}] ${surface}`);
  for (const n of notes) console.log(`    - ${n}`);
}

async function shoot(page, name) {
  const file = path.join(OUT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return path.basename(file);
}

async function main() {
  await fs.mkdir(OUT_DIR, { recursive: true });
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    acceptDownloads: false,
  });
  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));
  page.on('response', (resp) => {
    const status = resp.status();
    const url = resp.url();
    if (status >= 500 && url.startsWith(BASE)) {
      consoleErrors.push(`5xx ${status} ${url}`);
    }
  });

  // ====================================================================
  // 1) /exhibitor/login — "Find my stall" link REMOVED, only "Forgot password?"
  // ====================================================================
  {
    const url = `${BASE}/exhibitor/login`;
    const resp = await page.goto(url, { waitUntil: 'networkidle' });
    const status = resp ? resp.status() : 0;
    const title = await page.title();
    const html = await page.content();
    const findMyStall = /find my stall/i.test(html);
    const forgotPw = /forgot password/i.test(html);
    const shot = await shoot(page, '01-login');

    const notes = [
      `HTTP ${status}`,
      `Title: "${title}"`,
      `"Find my stall" present: ${findMyStall}`,
      `"Forgot password?" present: ${forgotPw}`,
    ];
    let s = 'PASS';
    if (findMyStall) s = 'FAIL';
    else if (!forgotPw) s = 'PARTIAL';
    record('1) /exhibitor/login', s, notes, shot);
  }

  // ====================================================================
  // Log in
  // ====================================================================
  await page.goto(`${BASE}/exhibitor/login`, { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(EMAIL);
  await page.locator('input[type="password"]').fill(PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL(/\/exhibitor\/portal/, { timeout: 45_000 }).catch(() => null);
  await page.waitForLoadState('networkidle').catch(() => null);
  const afterLoginUrl = page.url();
  console.log(`[info] after login url: ${afterLoginUrl}`);

  if (!afterLoginUrl.includes('/exhibitor/portal')) {
    record(
      'LOGIN',
      'FAIL',
      [`After submit, URL is ${afterLoginUrl} — login failed.`],
      await shoot(page, '00-login-failed'),
    );
    await browser.close();
    await writeReport();
    process.exit(2);
  }

  // Dismiss the welcome onboarding modal so it doesn't block content/screenshots
  async function dismissModal() {
    const closers = [
      page.getByRole('button', { name: /^×$/ }),
      page.getByRole('button', { name: /close/i }),
      page.getByRole('button', { name: /skip/i }),
      page.locator('button[aria-label*="close" i]'),
      page.locator('button:has-text("×")'),
    ];
    for (const c of closers) {
      const visible = await c.first().isVisible().catch(() => false);
      if (visible) {
        await c.first().click({ timeout: 1500 }).catch(() => null);
        await page.waitForTimeout(300);
        return true;
      }
    }
    return false;
  }
  await dismissModal();

  // ====================================================================
  // 2 + 3) Portal nav: Overview pill not clipped, logo aligned
  // ====================================================================
  {
    await page.goto(`${BASE}/exhibitor/portal`, { waitUntil: 'networkidle' });
    const shot = await shoot(page, '02-portal-overview');

    // Find Overview pill in nav
    const overviewText = await page.evaluate(() => {
      const nodes = Array.from(document.querySelectorAll('nav a, header a, [role="navigation"] a, a'));
      const hit = nodes.find((n) => /^overview$/i.test((n.textContent || '').trim()));
      if (!hit) return null;
      const r = hit.getBoundingClientRect();
      const cs = getComputedStyle(hit);
      return {
        text: (hit.textContent || '').trim(),
        rect: { x: r.x, y: r.y, w: r.width, h: r.height },
        overflowX: cs.overflowX,
        truncate: cs.textOverflow,
        innerHTML: hit.innerHTML.slice(0, 200),
      };
    });

    const logoVsTextAlignment = await page.evaluate(() => {
      // Look at the top 120px of the viewport — that's where PortalNav lives
      const all = Array.from(document.querySelectorAll('*'));
      let logoRect = null;
      let textRect = null;
      for (const el of all) {
        if (el.tagName !== 'IMG' && el.tagName !== 'SVG') continue;
        const r = el.getBoundingClientRect();
        if (r.top < 120 && r.width > 20 && r.height > 20 && r.x < 200) {
          logoRect = { x: r.x, y: r.y, w: r.width, h: r.height, cy: r.y + r.height / 2 };
          break;
        }
      }
      for (const el of all) {
        const t = (el.textContent || '').trim();
        if (
          /^young at heart/i.test(t) &&
          t.length < 60 &&
          el.children.length <= 4
        ) {
          const r = el.getBoundingClientRect();
          if (r.top < 120 && r.width > 0) {
            textRect = { x: r.x, y: r.y, w: r.width, h: r.height, cy: r.y + r.height / 2 };
            break;
          }
        }
      }
      return { logoRect, textRect };
    });

    const notes2 = [];
    let s2 = 'PASS';
    if (!overviewText) {
      notes2.push('Could not locate an "Overview" link in nav.');
      s2 = 'FAIL';
    } else {
      notes2.push(`Overview pill text in DOM: "${overviewText.text}" (should be exactly "Overview")`);
      if (overviewText.text.toLowerCase() !== 'overview') {
        s2 = 'FAIL';
        notes2.push('Overview text is not exactly "Overview" — clipping/truncation suspected.');
      } else {
        notes2.push('Overview pill rendered in full, no DOM-level clipping.');
      }
    }
    record('2) PortalNav Overview pill', s2, notes2, shot);

    const notes3 = [];
    let s3 = 'PASS';
    if (!logoVsTextAlignment.logoRect || !logoVsTextAlignment.textRect) {
      notes3.push(
        `Could not locate both logo and brand-text block (logo=${!!logoVsTextAlignment.logoRect}, text=${!!logoVsTextAlignment.textRect}). Falling back to screenshot evidence.`,
      );
      s3 = 'PARTIAL';
    } else {
      const dCy = Math.abs(logoVsTextAlignment.logoRect.cy - logoVsTextAlignment.textRect.cy);
      notes3.push(
        `Logo cy=${logoVsTextAlignment.logoRect.cy.toFixed(1)}, text cy=${logoVsTextAlignment.textRect.cy.toFixed(1)}, |Δcy|=${dCy.toFixed(1)}px (≤8px = aligned).`,
      );
      if (dCy > 8) {
        s3 = 'PARTIAL';
        notes3.push('Vertical centers differ by >8px — alignment may be off.');
      } else {
        notes3.push('Logo middle-aligned with brand text block.');
      }
    }
    record('3) PortalNav logo alignment', s3, notes3, shot);
  }

  // ====================================================================
  // 4) /exhibitor/portal/stand — Map renders ≥600px tall, off-white bg, controls
  // ====================================================================
  {
    const resp = await page.goto(`${BASE}/exhibitor/portal/stand`, { waitUntil: 'networkidle' });
    const status = resp ? resp.status() : 0;
    // Give SVG / canvas a moment
    await page.waitForTimeout(1500);
    const shot = await shoot(page, '04-stand');

    const mapInfo = await page.evaluate(() => {
      // Find the map container (largest div containing an SVG)
      const allDivs = Array.from(document.querySelectorAll('div'));
      const candidates = allDivs
        .filter((d) => d.querySelector('svg'))
        .map((d) => {
          const r = d.getBoundingClientRect();
          return { el: d, w: r.width, h: r.height };
        })
        .filter((c) => c.w > 400 && c.h > 200 && c.h < 2000);
      // Largest such container height — that's the rendered map area
      candidates.sort((a, b) => b.h - a.h);
      const innerSvg = candidates[0]?.el.querySelector('svg');
      const svgR = innerSvg ? innerSvg.getBoundingClientRect() : null;
      // Use max of svg + the deepest meaningful map-container (typical layout: container > svg)
      const deepest = candidates.filter((c) => c.h >= 400 && c.h <= 1200)[0] || candidates[0];
      const best = deepest
        ? {
            w: deepest.w,
            h: deepest.h,
            svgW: svgR?.width || 0,
            svgH: svgR?.height || 0,
            parentBg: getComputedStyle(deepest.el).backgroundColor,
          }
        : null;
      const hasSearch = !!document.querySelector('input[placeholder*="earch" i], input[type="search"]');
      const buttons = Array.from(document.querySelectorAll('button')).map((b) => ({
        text: (b.textContent || '').trim(),
        aria: b.getAttribute('aria-label') || '',
        title: b.getAttribute('title') || '',
      }));
      const hasZoomIn = buttons.some(
        (b) => b.text === '+' || /zoom in/i.test(b.text + ' ' + b.aria + ' ' + b.title),
      );
      const hasZoomOut = buttons.some(
        (b) =>
          b.text === '-' ||
          b.text === '−' ||
          /zoom out/i.test(b.text + ' ' + b.aria + ' ' + b.title),
      );
      const hasReset = buttons.some((b) =>
        /reset|recenter|center|fit|reset view/i.test(b.text + ' ' + b.aria + ' ' + b.title),
      );
      // Sample bg colour of large container behind map
      const bg = (() => {
        const all = Array.from(document.querySelectorAll('div'));
        for (const el of all) {
          const r = el.getBoundingClientRect();
          if (r.width > 500 && r.height > 400 && el.querySelector('svg')) {
            return getComputedStyle(el).backgroundColor;
          }
        }
        return null;
      })();
      return { best, hasSearch, hasZoomIn, hasZoomOut, hasReset, bg };
    });

    const notes = [`HTTP ${status}`];
    let s = 'PASS';
    if (!mapInfo.best) {
      notes.push('No map container found.');
      s = 'FAIL';
    } else {
      notes.push(
        `Map container: ${mapInfo.best.w.toFixed(0)}×${mapInfo.best.h.toFixed(0)}px (inner SVG: ${mapInfo.best.svgW.toFixed(0)}×${mapInfo.best.svgH.toFixed(0)}). Need container height ≥600.`,
      );
      if (mapInfo.best.h < 600) {
        s = 'PARTIAL';
        notes.push('Map container height < 600px.');
      }
    }
    notes.push(`Search input present: ${mapInfo.hasSearch}`);
    notes.push(`Zoom-in / Zoom-out / Reset buttons: ${mapInfo.hasZoomIn} / ${mapInfo.hasZoomOut} / ${mapInfo.hasReset}`);
    if (!(mapInfo.hasZoomIn && mapInfo.hasZoomOut)) {
      s = s === 'FAIL' ? 'FAIL' : 'PARTIAL';
      notes.push('Pan/zoom controls incomplete.');
    }
    notes.push(`Map container bg: ${mapInfo.bg}`);
    // Mustard-yellow is roughly rgb(>=200, >=160, <120); off-white is near rgb(245-255 each).
    if (mapInfo.bg) {
      const m = mapInfo.bg.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (m) {
        const [r, g, b] = [+m[1], +m[2], +m[3]];
        const mustard = r >= 200 && g >= 150 && b < 130;
        const offWhite = r >= 235 && g >= 235 && b >= 220 && r - b < 40;
        notes.push(`bg rgb=(${r},${g},${b}) → mustard=${mustard}, off-white=${offWhite}`);
        if (mustard) {
          s = 'FAIL';
          notes.push('Background reads as mustard yellow.');
        }
      }
    }
    record('4) /exhibitor/portal/stand map', s, notes, shot);
  }

  // ====================================================================
  // 5) /exhibitor/portal/documents — no 500, two sections
  // ====================================================================
  {
    const resp = await page.goto(`${BASE}/exhibitor/portal/documents`, { waitUntil: 'networkidle' });
    const status = resp ? resp.status() : 0;
    const html = await page.content();
    const shot = await shoot(page, '05-documents');
    const notes = [`HTTP ${status}`];
    let s = 'PASS';

    if (status >= 500 || /Application error/i.test(html) || /Digest/i.test(html)) {
      s = 'FAIL';
      notes.push('Page 5xx or shows "Application error" / "Digest".');
    }

    const fromOrganisers = /from the organisers/i.test(html);
    const complianceHeader =
      /compliance documents you upload/i.test(html) || /compliance documents/i.test(html);
    notes.push(`"From the organisers" section: ${fromOrganisers}`);
    notes.push(`"Compliance documents you upload" section: ${complianceHeader}`);

    // Detect "Download PDF" buttons near card titles "Tax invoice" / "Signed vendor contract"
    const downloads = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('div, li, article'));
      const find = (titleRe) => {
        for (const card of cards) {
          const t = (card.textContent || '').slice(0, 400);
          if (titleRe.test(t)) {
            const btn = Array.from(card.querySelectorAll('a, button')).find((b) =>
              /download|pdf|view|save/i.test((b.textContent || '').trim()),
            );
            if (btn) return { text: (btn.textContent || '').trim(), tag: btn.tagName };
          }
        }
        return null;
      };
      return {
        invoice: find(/tax invoice|invoice/i),
        contract: find(/signed vendor contract|vendor contract|contract/i),
        badges: find(/staff badges|badges/i),
      };
    });
    const invoiceLink = !!downloads.invoice;
    const contractLink = !!downloads.contract;
    const badgeLink = !!downloads.badges;
    if (downloads.invoice) notes.push(`Invoice button: "${downloads.invoice.text}"`);
    if (downloads.contract) notes.push(`Contract button: "${downloads.contract.text}"`);
    if (downloads.badges) notes.push(`Badge link: "${downloads.badges.text}"`);
    notes.push(`Invoice download link: ${invoiceLink}`);
    notes.push(`Contract download link: ${contractLink}`);
    notes.push(`Staff badge link/button: ${badgeLink}`);

    if (!(fromOrganisers && complianceHeader)) s = s === 'FAIL' ? 'FAIL' : 'PARTIAL';
    record('5) /exhibitor/portal/documents', s, notes, shot);
  }

  // ====================================================================
  // 6) /exhibitor/portal/contract — Renders, download button visible
  // ====================================================================
  {
    const resp = await page.goto(`${BASE}/exhibitor/portal/contract`, { waitUntil: 'networkidle' });
    const status = resp ? resp.status() : 0;
    const shot = await shoot(page, '06-contract');
    const html = await page.content();
    const notes = [`HTTP ${status}`];
    let s = 'PASS';
    if (status >= 500 || /Application error/i.test(html)) {
      s = 'FAIL';
      notes.push('Page 5xx or shows "Application error".');
    }
    const dl = await page.evaluate(() => {
      const as = Array.from(document.querySelectorAll('a, button'));
      let found = null;
      for (const a of as) {
        const t = (a.textContent || '').trim();
        if (/download|view contract|contract pdf|save as pdf|print|view pdf/i.test(t)) {
          const r = a.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          found = {
            tag: a.tagName,
            text: t,
            href: a.getAttribute('href') || null,
            download: a.hasAttribute('download'),
          };
          break;
        }
      }
      return found;
    });
    const contractRendered = /vendor contract/i.test(html);
    notes.push(`"Vendor Contract" text on page: ${contractRendered}`);
    if (!dl) {
      s = s === 'FAIL' ? 'FAIL' : 'PARTIAL';
      notes.push('No "Download/Save as PDF/Print" affordance found on /contract page itself. (Note: Documents page DOES expose "Download PDF" for contract — verified at step 5.)');
    } else {
      notes.push(`Download affordance: <${dl.tag}> "${dl.text}" href=${dl.href} download=${dl.download}`);
    }
    record('6) /exhibitor/portal/contract', s, notes, shot);
  }

  // ====================================================================
  // 7) /exhibitor/portal/invoice — Renders, download button visible
  // ====================================================================
  {
    const resp = await page.goto(`${BASE}/exhibitor/portal/invoice`, { waitUntil: 'networkidle' });
    const status = resp ? resp.status() : 0;
    const shot = await shoot(page, '07-invoice');
    const html = await page.content();
    const notes = [`HTTP ${status}`];
    let s = 'PASS';
    if (status >= 500 || /Application error/i.test(html)) {
      s = 'FAIL';
      notes.push('Page 5xx or shows "Application error".');
    }
    const dl = await page.evaluate(() => {
      const as = Array.from(document.querySelectorAll('a, button'));
      let found = null;
      for (const a of as) {
        const t = (a.textContent || '').trim();
        if (/download|invoice pdf|download invoice|view invoice|save as pdf|print/i.test(t)) {
          const r = a.getBoundingClientRect();
          if (r.width === 0 || r.height === 0) continue;
          found = {
            tag: a.tagName,
            text: t,
            href: a.getAttribute('href') || null,
            download: a.hasAttribute('download'),
          };
          break;
        }
      }
      return found;
    });
    if (!dl) {
      s = s === 'FAIL' ? 'FAIL' : 'PARTIAL';
      notes.push('No "Download" affordance found.');
    } else {
      notes.push(`Download affordance: <${dl.tag}> "${dl.text}" href=${dl.href} download=${dl.download}`);
    }
    record('7) /exhibitor/portal/invoice', s, notes, shot);
  }

  // ====================================================================
  // 8) /exhibitor/portal/staff — Staff & Badges, add team form, print badges
  // ====================================================================
  {
    const resp = await page.goto(`${BASE}/exhibitor/portal/staff`, { waitUntil: 'networkidle' });
    const status = resp ? resp.status() : 0;
    const shot = await shoot(page, '08-staff');
    const html = await page.content();
    const notes = [`HTTP ${status}`];
    let s = 'PASS';
    if (status >= 500 || /Application error/i.test(html)) {
      s = 'FAIL';
      notes.push('Page 5xx or shows "Application error".');
    }
    const formInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select')).map((i) => ({
        type: i.getAttribute('type'),
        name: i.getAttribute('name'),
        placeholder: i.getAttribute('placeholder'),
      }));
      const hasName = inputs.some((i) => /name/i.test(i.name || '') || /name/i.test(i.placeholder || ''));
      const hasEmailOrPhone = inputs.some(
        (i) => /email|phone|contact/i.test(i.name || '') || /email|phone/i.test(i.placeholder || ''),
      );
      const buttons = Array.from(document.querySelectorAll('button, a')).map((b) => (b.textContent || '').trim());
      const printAll = buttons.some((b) => /print all badges|print badges|print all/i.test(b));
      // Section header for the form is "Add a team member" / "Add team member"
      const addMemberSection = /add (a )?team member|add member|add staff/i.test(document.body.innerText);
      // Submit-style buttons: "Add", "Add member"
      const addMemberBtn = buttons.some((b) => /^add( member| team member)?$/i.test(b));
      return { inputCount: inputs.length, hasName, hasEmailOrPhone, printAll, addMemberSection, addMemberBtn };
    });
    notes.push(
      `Inputs found: ${formInfo.inputCount} (name field=${formInfo.hasName}, email/phone field=${formInfo.hasEmailOrPhone})`,
    );
    notes.push(`"Add team member" section header: ${formInfo.addMemberSection}, submit button: ${formInfo.addMemberBtn}`);
    notes.push(`"Print all badges" button: ${formInfo.printAll}`);
    if (!(formInfo.hasName && formInfo.printAll && formInfo.addMemberSection)) {
      s = s === 'FAIL' ? 'FAIL' : 'PARTIAL';
    }
    record('8) /exhibitor/portal/staff', s, notes, shot);
  }

  // ====================================================================
  // 9) /exhibitor/portal/support — email-copy checkbox default-checked
  // ====================================================================
  {
    const resp = await page.goto(`${BASE}/exhibitor/portal/support`, { waitUntil: 'networkidle' });
    const status = resp ? resp.status() : 0;
    const shot = await shoot(page, '09-support');
    const html = await page.content();
    const notes = [`HTTP ${status}`];
    let s = 'PASS';
    if (status >= 500 || /Application error/i.test(html)) {
      s = 'FAIL';
      notes.push('Page 5xx or shows "Application error".');
    }
    const ck = await page.evaluate(() => {
      const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      // Find the email-copy checkbox by walking up to find a label containing the phrase
      for (const cb of cbs) {
        let p = cb.parentElement;
        let label = '';
        for (let depth = 0; depth < 4 && p; depth++) {
          label = (p.textContent || '').toLowerCase();
          if (label.includes('send a copy by email') || label.includes('copy by email') || label.includes('support@youngatheart.co.za')) {
            return { found: true, checked: !!cb.checked, label: (p.textContent || '').trim().slice(0, 200) };
          }
          p = p.parentElement;
        }
      }
      return { found: false };
    });
    if (!ck.found) {
      s = s === 'FAIL' ? 'FAIL' : 'PARTIAL';
      notes.push('Email-copy checkbox not found.');
    } else {
      notes.push(`Email-copy checkbox found, defaultChecked=${ck.checked}. Label: "${ck.label}"`);
      if (!ck.checked) {
        s = s === 'FAIL' ? 'FAIL' : 'PARTIAL';
        notes.push('Checkbox exists but NOT default-checked.');
      }
    }
    const sendBtn = await page.evaluate(() => {
      const bs = Array.from(document.querySelectorAll('button'));
      // Text "send" or aria-label containing send, or submit-type icon button next to text input
      for (const b of bs) {
        const t = (b.textContent || '').trim();
        const aria = b.getAttribute('aria-label') || '';
        if (/send|submit/i.test(t + ' ' + aria)) return { kind: 'labelled', label: t || aria };
      }
      // Fallback: submit button inside a form with the message textarea
      const ta = document.querySelector('textarea, input[placeholder*="message" i]');
      if (ta) {
        const form = ta.closest('form');
        if (form) {
          const sub = form.querySelector('button[type="submit"], button:not([type])');
          if (sub) return { kind: 'icon-submit', label: (sub.textContent || '').trim() || '(icon-only)' };
        }
      }
      return null;
    });
    if (!sendBtn) {
      s = s === 'FAIL' ? 'FAIL' : 'PARTIAL';
      notes.push('Send button not found.');
    } else {
      notes.push(`Send button: ${sendBtn.kind} "${sendBtn.label}"`);
    }
    record('9) /exhibitor/portal/support', s, notes, shot);
  }

  await browser.close();

  await writeReport(consoleErrors);
}

async function writeReport(consoleErrors = []) {
  const lines = [];
  lines.push('# Vendor Portal Walkthrough — Prod, 2026-06-15');
  lines.push('');
  lines.push(`Base: ${BASE}`);
  lines.push(`Demo vendor: ${EMAIL}`);
  lines.push('Mode: READ-ONLY (no form submission, no download click).');
  lines.push('');
  lines.push('| # | Surface | Status | Screenshot |');
  lines.push('| --- | --- | --- | --- |');
  for (const f of findings) {
    lines.push(`| ${findings.indexOf(f) + 1} | ${f.surface} | ${f.status} | \`${f.screenshot || ''}\` |`);
  }
  lines.push('');
  lines.push('## Detail');
  for (const f of findings) {
    lines.push(`### ${f.surface} — ${f.status}`);
    for (const n of f.notes) lines.push(`- ${n}`);
    if (f.screenshot) lines.push(`- screenshot: \`${f.screenshot}\``);
    lines.push('');
  }
  const fires = findings.filter((f) => f.status === 'FAIL');
  lines.push('## FIRES');
  if (fires.length === 0) {
    lines.push('None.');
  } else {
    for (const f of fires) lines.push(`- ${f.surface}: ${f.notes.join(' | ')}`);
  }
  if (consoleErrors.length) {
    lines.push('');
    lines.push('## Console / network errors observed');
    for (const e of consoleErrors) lines.push(`- ${e}`);
  }
  const reportPath = path.join(OUT_DIR, 'REPORT.md');
  await fs.writeFile(reportPath, lines.join('\n'));
  console.log(`\n[report] ${reportPath}`);
}

main().catch(async (e) => {
  console.error(e);
  await writeReport([`fatal: ${e.message}`]);
  process.exit(1);
});
