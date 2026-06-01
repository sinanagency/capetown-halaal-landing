/**
 * "Verification has started — watch your inbox" blast.
 *
 * Recipient set is derived live from Supabase:
 *   - status IN (pending, info_requested)
 *   - has an email
 *   - NOT a demo account (@cthalaal.co.za / demo-*)
 *   - did NOT sign up TODAY (excludes brand-new applicants)
 *   - not already stamped with this campaign's marker (idempotency guard)
 *   - de-duplicated by email (a vendor who applied twice gets one mail)
 *
 * CHANNEL: Resend ONLY. No GoDaddy SMTP, no fallback, no matter what.
 *   If Resend hits its daily cap (429), the run STOPS cleanly and reports how
 *   many were sent. Re-running later sends only the unsent remainder (the
 *   admin_notes marker makes it resumable and double-send-proof).
 *
 * Modes:
 *   DRY_RUN=1  -> print the recipient list and exit, no sends.
 *   PREVIEW=1  -> send only the preview to admin@sinan.agency and exit.
 *   (default)  -> send preview to admin, then blast, then report to CTH.
 */
import fs from 'fs';

const SUPA_URL = 'https://dtdqopjdxwfvtyrnygdt.supabase.co';

// --- env (trim trailing \r / whitespace; Vercel/CRLF can sneak them in) ---
const envText = fs.readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue;
  const i = line.indexOf('=');
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
}
const SUPA_KEY = (env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const RESEND_KEY = (env.RESEND_API_KEY || '').trim();

const DRY_RUN = process.env.DRY_RUN === '1';
const PREVIEW_ONLY = process.env.PREVIEW === '1';

const FROM = 'Young at Heart Festival <support@youngatheart.co.za>';
const REPLY_TO = 'support@youngatheart.co.za';
const PREVIEW_TO = 'admin@sinan.agency';
const REPORT_TO = 'capetownhalaal@gmail.com';
const SUBJECT = 'Young at Heart Festival 2026 — verification has started, please watch your inbox';

const TODAY = '2026-06-01';
const NOTE_LINE = `${TODAY}: Sent 'verification has started' notice`;
// MARKER must be a substring of NOTE_LINE so the idempotency guard recognises
// rows this campaign already stamped (prevents double-sends on re-run).
const MARKER = `Sent 'verification has started' notice`;
const STATUSES = new Set(['pending', 'info_requested']);

// Stable path (not the ephemeral job tmp dir) so the scheduled auto-resume can log too.
const LOG = '/Users/milaaj/Code/capetown-halaal-landing/scripts/verification-blast.log';
// Written when the campaign fully completes; the auto-resume cron reads it to self-retire.
const DONE_FLAG = '/Users/milaaj/Code/capetown-halaal-landing/scripts/.verification-blast.DONE';
function log(line) {
  const s = `${line}`;
  console.log(s);
  fs.appendFileSync(LOG, s + '\n');
}

const norm = e => (e || '').trim().toLowerCase();
const isDemo = e => /@cthalaal\.co\.za$/i.test(e || '') || /^demo-/i.test(e || '');
const hasMarker = n => (n || '').includes(MARKER);
// Freeze the recipient cohort to whoever existed BEFORE launch day. Excludes the
// launch-day signups the user asked to skip, and prevents resume runs (next day)
// from sweeping in brand-new applicants who signed up after launch.
const LAUNCH = '2026-06-01';
const signedAfterCutoff = r => (r.created_at || '').slice(0, 10) >= LAUNCH;

function getFirstName(c) {
  if (!c || typeof c !== 'string' || !c.trim()) return 'there';
  const f = c.trim().split(/\s+/)[0];
  return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
}
function esc(s) {
  return String(s || '').replace(/[&<>"']/g, ch =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function buildText(fn, bn) {
  return `Slms / Hi ${fn},

An update on your application to trade at Young at Heart Festival 2026 with ${bn}.

We have now started the verification process and your application is being reviewed. You can expect to hear your outcome from us soon.

Please keep an eye on your inbox over the coming days, as your outcome email will come from support@youngatheart.co.za. Some of our earlier emails may have landed in spam folders, so it is worth checking there too.

There is nothing further you need to do for now.

Thank you for your patience and for wanting to be part of Young at Heart Festival 2026.

Kind regards,
The Young at Heart Festival Team

support@youngatheart.co.za  ·  065 943 5012
cthalaal.co.za  ·  @youngatheart_capetown
`;
}
function buildHtml(fn, bn) {
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,sans-serif;color:#333;line-height:1.55;font-size:15px;max-width:620px;margin:0;padding:0">
<p>Slms / Hi ${esc(fn)},</p>
<p>An update on your application to trade at Young at Heart Festival 2026 with <strong>${esc(bn)}</strong>.</p>
<p>We have now started the verification process and your application is being reviewed. You can expect to hear your outcome from us soon.</p>
<p>Please keep an eye on your inbox over the coming days, as your outcome email will come from <a href="mailto:support@youngatheart.co.za">support@youngatheart.co.za</a>. Some of our earlier emails may have landed in spam folders, so it is worth checking there too.</p>
<p>There is nothing further you need to do for now.</p>
<p>Thank you for your patience and for wanting to be part of Young at Heart Festival 2026.</p>
<p>Kind regards,<br><strong>The Young at Heart Festival Team</strong></p>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0">
<p style="font-size:13px;color:#888;margin:0">
<a href="mailto:support@youngatheart.co.za" style="color:#cd2653;text-decoration:none">support@youngatheart.co.za</a> · 065 943 5012<br>
<a href="https://cthalaal.co.za" style="color:#cd2653;text-decoration:none">cthalaal.co.za</a> · <a href="https://instagram.com/youngatheart_capetown" style="color:#cd2653;text-decoration:none">@youngatheart_capetown</a>
</p></body></html>`;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// --- Resend send. Returns {ok, status, body}. NEVER touches SMTP. ---
async function resendSend({ to, subject, html, text }) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM, to: [to], reply_to: REPLY_TO, subject, html, text,
      headers: { 'List-Unsubscribe': '<mailto:support@youngatheart.co.za?subject=unsubscribe>' },
    }),
  });
  let body = null;
  try { body = await res.json(); } catch { /* ignore */ }
  return { ok: res.ok, status: res.status, body };
}

async function fetchApps() {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/vendor_applications?select=id,email,contact_name,business_name,status,admin_notes,created_at&order=created_at.asc`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}
async function appendNote(id, existing) {
  const updated = existing && existing.trim() ? `${existing.trim()}\n${NOTE_LINE}` : NOTE_LINE;
  const res = await fetch(`${SUPA_URL}/rest/v1/vendor_applications?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ admin_notes: updated }),
  });
  if (!res.ok) throw new Error(`note update failed: ${res.status}`);
}

(async () => {
  log(`\n=== verification-started blast @ ${new Date().toISOString()} ===`);
  log(`DRY_RUN=${DRY_RUN} PREVIEW_ONLY=${PREVIEW_ONLY} TODAY=${TODAY}`);
  if (!SUPA_KEY) { log('FATAL: SUPABASE_SERVICE_ROLE_KEY missing'); process.exit(1); }
  if (!RESEND_KEY) { log('FATAL: RESEND_API_KEY missing'); process.exit(1); }

  // Build recipient queue
  const all = await fetchApps();
  const seen = new Set();
  // Seed dedup with emails already stamped by this campaign, so a vendor who
  // applied twice (only one row stamped) never gets a second mail on re-run.
  for (const r of all) if (r.email && hasMarker(r.admin_notes)) seen.add(norm(r.email));
  const queue = [];
  let skipDemo = 0, skipToday = 0, skipMarker = 0, skipDupe = 0, skipStatus = 0, skipNoEmail = 0;
  for (const r of all) {
    if (!STATUSES.has(r.status)) { skipStatus++; continue; }
    if (!r.email) { skipNoEmail++; continue; }
    if (isDemo(r.email)) { skipDemo++; continue; }
    if (signedAfterCutoff(r)) { skipToday++; continue; }
    if (hasMarker(r.admin_notes)) { skipMarker++; continue; }
    const key = norm(r.email);
    if (seen.has(key)) { skipDupe++; continue; }
    seen.add(key);
    queue.push(r);
  }

  log(`Total apps: ${all.length}`);
  log(`Skipped -> wrong-status:${skipStatus} no-email:${skipNoEmail} demo:${skipDemo} signed-today:${skipToday} already-sent:${skipMarker} dupe-email:${skipDupe}`);
  log(`RECIPIENTS: ${queue.length}`);
  queue.forEach((r, i) => log(`  ${i + 1}. ${r.email}  [${r.status}]  ("${(r.business_name || '').trim()}" / ${r.contact_name || '?'})`));

  const alreadySent = skipMarker; // rows this campaign already mailed (resume context)
  if (DRY_RUN) { log('DRY_RUN — no emails sent.'); return; }

  // Nothing left to send: campaign is complete. Signal done and exit (no preview,
  // no duplicate report) so the daily auto-resume cron can self-retire.
  if (queue.length === 0) {
    log('Queue empty — campaign already complete, nothing to send.');
    fs.writeFileSync(DONE_FLAG, `complete: ${alreadySent} sent total\n`);
    return;
  }

  // Preview to admin@sinan.agency (skipped on auto-resume runs via NO_PREVIEW=1)
  if (process.env.NO_PREVIEW !== '1') {
    log(`\nSending PREVIEW to ${PREVIEW_TO} ...`);
    const pv = await resendSend({
      to: PREVIEW_TO,
      subject: `[PREVIEW — vendor blast] ${SUBJECT}`,
      html: `<p style="background:#fffbe6;border:1px solid #f0d000;padding:8px 12px;font-size:13px;color:#665c00">PREVIEW of the email going to ${queue.length} vendors. Sample personalization shown below. This copy is NOT sent to vendors.</p>` + buildHtml('Taona', 'Your Business Name'),
      text: `[PREVIEW of vendor blast — going to ${queue.length} vendors]\n\n` + buildText('Taona', 'Your Business Name'),
    });
    log(pv.ok ? `  PREVIEW ok -> id=${pv.body?.id}` : `  PREVIEW FAIL ${pv.status}: ${JSON.stringify(pv.body)}`);
  }

  if (PREVIEW_ONLY) { log('PREVIEW_ONLY — stopping before blast.'); return; }

  // Blast — Resend only. Stop cleanly on daily-cap.
  let sent = 0, capped = false;
  const failures = [];
  for (let i = 0; i < queue.length; i++) {
    const app = queue[i];
    const fn = getFirstName(app.contact_name);
    const bn = (app.business_name || 'your business').trim();
    const payload = { to: app.email, subject: SUBJECT, html: buildHtml(fn, bn), text: buildText(fn, bn) };

    let res = await resendSend(payload);
    // 429 handling: back off and retry a few times; if it persists, treat as daily cap.
    let attempts = 0;
    while (res.status === 429 && attempts < 4) {
      attempts++;
      log(`  429 on ${app.email} (attempt ${attempts}) — backing off 3s`);
      await sleep(3000);
      res = await resendSend(payload);
    }

    if (res.ok) {
      try { await appendNote(app.id, app.admin_notes); }
      catch (e) { log(`  WARN [${i + 1}/${queue.length}] ${app.email} sent but note failed: ${e.message}`); }
      sent++;
      log(`  OK   [${i + 1}/${queue.length}] ${app.email} (${bn.slice(0, 40)}) id=${res.body?.id}`);
    } else if (res.status === 429) {
      capped = true;
      log(`  CAP  Resend daily limit hit at ${app.email}. Stopping. (${sent} sent, ${queue.length - sent} unsent)`);
      break;
    } else {
      failures.push({ email: app.email, status: res.status, body: res.body });
      log(`  FAIL [${i + 1}/${queue.length}] ${app.email}: ${res.status} ${JSON.stringify(res.body)}`);
    }
    if (i < queue.length - 1) await sleep(600); // stay under Resend's 2 req/s
  }

  const unsent = queue.length - sent - failures.length;
  const campaignSent = alreadySent + sent; // cumulative across all runs
  log('==================================');
  log(`SUMMARY: this-run sent=${sent} failed=${failures.length} unsent(capped)=${capped ? unsent : 0} | campaign total sent=${campaignSent}`);
  failures.forEach(f => log(`  FAIL ${f.email}: ${f.status} ${JSON.stringify(f.body)}`));

  // Report to Cape Town Halaal ONLY when the campaign is complete this run
  // (no daily-cap stop). A capped run stays silent and resumes next window, so
  // CTH gets exactly one final report, not a "0 sent" ping every day.
  if (capped) {
    log(`Capped — ${unsent} still unsent. Holding CTH report until campaign completes on a later run.`);
    log('Done.');
    return;
  }

  const reportLines = [
    `Verification-update emails have been sent to all vendors awaiting an outcome.`,
    ``,
    `Total vendors emailed: ${campaignSent}`,
    failures.length ? `Could not be delivered: ${failures.length} (${failures.map(f => f.email).join(', ')}) — likely invalid addresses.` : `Delivery failures: 0`,
    ``,
    `Recipient criteria: pending or info-requested applications, excluding demo/test accounts and anyone who signed up on the send day, de-duplicated by email.`,
    `Channel: Resend (DKIM-signed for inbox delivery).`,
    `Completed: ${TODAY}`,
  ];
  const reportText = reportLines.join('\n');
  const reportHtml = `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;color:#333;line-height:1.5">` +
    reportLines.map(l => l === '' ? '<br>' : `<p style="margin:4px 0">${esc(l)}</p>`).join('') + `</div>`;
  const rep = await resendSend({
    to: REPORT_TO, subject: `Vendor verification emails sent — ${campaignSent} vendors notified`,
    html: reportHtml, text: reportText,
  });
  log(rep.ok ? `Report sent to ${REPORT_TO} -> id=${rep.body?.id}` : `Report FAILED ${rep.status}: ${JSON.stringify(rep.body)}`);
  if (rep.ok) fs.writeFileSync(DONE_FLAG, `complete: ${campaignSent} sent, report id ${rep.body?.id}\n`);
  log('Done.');
})().catch(err => { log(`FATAL: ${err.message}`); log(err.stack); process.exit(1); });
