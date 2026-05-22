/**
 * Re-send the "outcomes from 1 June" notice to pending vendors who never got it.
 *
 * Recipient set is derived live from Supabase, never hardcoded to "all pending":
 *   - status = pending
 *   - admin_notes does NOT already contain the 1-June notice line  (idempotency guard)
 *   - email != Lamees (handled individually)
 *
 * SCOPE env:
 *   failed13  -> intersect with the 13 known May-5 failed sends only
 *   all       -> every pending vendor with no June-1 note (the 13 + later applicants)  [default]
 *
 * DRY_RUN=1  -> print the recipient list and exit WITHOUT sending.
 *
 * Avoids the May-5 failure mode: recycles the SMTP connection every 20 messages
 * (maxMessages:20) so GoDaddy's per-session throttle never trips, 2.5s pacing,
 * and a final retry pass over any failures on port 587.
 */
const nodemailer = require('nodemailer');
const fs = require('fs');

const SUPA_URL = 'https://dtdqopjdxwfvtyrnygdt.supabase.co';
const SUPA_KEY = process.env.SUPA_KEY;
const SCOPE = (process.env.SCOPE || 'all').toLowerCase();
const DRY_RUN = process.env.DRY_RUN === '1';

const FROM = 'Young at Heart Festival <support@youngatheart.co.za>';
const BCC  = 'admin@sinan.agency';
const SUBJECT = 'Young at Heart Festival 2026 — application outcomes from 1 June';

const EXCLUDE = ['lameesromaney@gmail.com'];
const FAILED_13 = [
  'foodtruck@thesmashbox.co.za','ameena.allie@yahoo.com','saajidahsamuels69@gmail.com',
  'natheerahallie093@gmail.com','treacleandtart@gmail.com','tabassumsavaya@yahoo.com',
  'nafeesahkhan61@gmail.com','theplugfragrances@gmail.com','insaaf.bawa2210@gmail.com',
  'aashiqaisaacs@gmail.com','baffleburgers@gmail.com','joeandco.smash@gmail.com',
  'seasonalco26@gmail.com',
].map(e => e.toLowerCase());

const TODAY = new Date().toISOString().slice(0, 10);
const NOTE_LINE = `${TODAY}: Sent 'outcomes from 1 June' notice (re-send)`;
const LOG = '/tmp/remaining-notice.log';
function log(line) { const s = `[${new Date().toISOString()}] ${line}`; console.log(s); fs.appendFileSync(LOG, s + '\n'); }

const norm = e => (e || '').trim().toLowerCase();
const hasJuneNote = n => /1 june|outcomes from 1 june/i.test(n || '');

function getFirstName(c) {
  if (!c || typeof c !== 'string' || !c.trim()) return 'there';
  const f = c.trim().split(/\s+/)[0];
  return f.charAt(0).toUpperCase() + f.slice(1).toLowerCase();
}
function esc(s) { return String(s || '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch])); }

function buildText(fn, bn) {
  return `Slms / Hi ${fn},

A quick update on your application to trade at Young at Heart Festival 2026 with ${bn}.

Our review process is now in its final stages. From 1 June 2026 onwards, every applicant will receive a personal email with the outcome of their application — whether approved or not. No further action is needed from you in the meantime.

If you have not heard from us shortly after 1 June, please check your spam or junk folder for an email from support@youngatheart.co.za, and mark us as a safe sender so future emails land properly.

Thank you again for your patience and for wanting to be part of Young at Heart Festival 2026.

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
<p>A quick update on your application to trade at Young at Heart Festival 2026 with <strong>${esc(bn)}</strong>.</p>
<p>Our review process is now in its final stages. <strong>From 1 June 2026 onwards</strong>, every applicant will receive a personal email with the outcome of their application — whether approved or not. No further action is needed from you in the meantime.</p>
<p>If you have not heard from us shortly after 1 June, please check your <strong>spam or junk folder</strong> for an email from <a href="mailto:support@youngatheart.co.za">support@youngatheart.co.za</a>, and mark us as a safe sender so future emails land properly.</p>
<p>Thank you again for your patience and for wanting to be part of Young at Heart Festival 2026.</p>
<p>Kind regards,<br><strong>The Young at Heart Festival Team</strong></p>
<hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0">
<p style="font-size:13px;color:#888;margin:0">
<a href="mailto:support@youngatheart.co.za" style="color:#cd2653;text-decoration:none">support@youngatheart.co.za</a> · 065 943 5012<br>
<a href="https://cthalaal.co.za" style="color:#cd2653;text-decoration:none">cthalaal.co.za</a> · <a href="https://instagram.com/youngatheart_capetown" style="color:#cd2653;text-decoration:none">@youngatheart_capetown</a>
</p></body></html>`;
}

async function fetchPending() {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/vendor_applications?status=eq.pending&select=id,email,contact_name,business_name,admin_notes&order=created_at.asc`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } });
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}
async function appendAdminNote(id, existing) {
  const updated = existing && existing.trim() ? `${existing.trim()}\n${NOTE_LINE}` : NOTE_LINE;
  const res = await fetch(`${SUPA_URL}/rest/v1/vendor_applications?id=eq.${id}`, {
    method: 'PATCH',
    headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({ admin_notes: updated }),
  });
  if (!res.ok) throw new Error(`note update failed: ${res.status}`);
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.writeFileSync(LOG, '');
  log(`Start. SCOPE=${SCOPE} DRY_RUN=${DRY_RUN} TODAY=${TODAY}`);
  if (!SUPA_KEY) { log('FATAL: SUPA_KEY missing'); process.exit(1); }

  const all = await fetchPending();
  let queue = all
    .filter(r => r.email && !EXCLUDE.includes(norm(r.email)))
    .filter(r => !hasJuneNote(r.admin_notes));
  if (SCOPE === 'failed13') queue = queue.filter(r => FAILED_13.includes(norm(r.email)));

  log(`Pending total: ${all.length}. Recipients in scope "${SCOPE}": ${queue.length}`);
  queue.forEach((r, i) => log(`  ${i + 1}. ${r.email}  ("${(r.business_name||'').trim()}" / ${r.contact_name||'?'})`));

  if (DRY_RUN) { log('DRY_RUN — no emails sent.'); return; }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) { log('FATAL: SMTP creds missing'); process.exit(1); }

  function makeTransport(port) {
    return nodemailer.createTransport({
      host: 'smtpout.secureserver.net', port, secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
      pool: true, maxConnections: 1, maxMessages: 20,
    });
  }

  let transporter = makeTransport(465);
  let sent = 0; const failures = [];

  for (let i = 0; i < queue.length; i++) {
    const app = queue[i];
    const fn = getFirstName(app.contact_name);
    const bn = (app.business_name || 'your business').trim();
    try {
      const info = await transporter.sendMail({
        from: FROM, to: app.email, bcc: BCC, replyTo: 'support@youngatheart.co.za',
        subject: SUBJECT, text: buildText(fn, bn), html: buildHtml(fn, bn),
        headers: { 'X-Mailer': 'Young at Heart Festival',
          'List-Unsubscribe': '<mailto:support@youngatheart.co.za?subject=unsubscribe>' },
      });
      try { await appendAdminNote(app.id, app.admin_notes); }
      catch (e) { log(`  WARN [${i+1}/${queue.length}] ${app.email} sent but note failed: ${e.message}`); }
      sent++;
      log(`  OK   [${i+1}/${queue.length}] ${app.email} (${bn.slice(0,40)}) msgId=${info.messageId}`);
    } catch (err) {
      failures.push(app);
      log(`  FAIL [${i+1}/${queue.length}] ${app.email}: ${err.message}`);
    }
    if (i < queue.length - 1) await sleep(2500);
  }
  transporter.close();

  // Retry pass on 587 for anything that failed.
  if (failures.length) {
    log(`Retry pass on 587 for ${failures.length} failures...`);
    transporter = makeTransport(587);
    const stillFailed = [];
    for (let i = 0; i < failures.length; i++) {
      const app = failures[i];
      const fn = getFirstName(app.contact_name);
      const bn = (app.business_name || 'your business').trim();
      try {
        const info = await transporter.sendMail({
          from: FROM, to: app.email, bcc: BCC, replyTo: 'support@youngatheart.co.za',
          subject: SUBJECT, text: buildText(fn, bn), html: buildHtml(fn, bn),
          headers: { 'X-Mailer': 'Young at Heart Festival',
            'List-Unsubscribe': '<mailto:support@youngatheart.co.za?subject=unsubscribe>' },
        });
        try { await appendAdminNote(app.id, app.admin_notes); } catch (e) { log(`  WARN retry ${app.email} note failed: ${e.message}`); }
        sent++;
        log(`  OK(retry) ${app.email} msgId=${info.messageId}`);
      } catch (err) {
        stillFailed.push({ email: app.email, error: err.message });
        log(`  FAIL(retry) ${app.email}: ${err.message}`);
      }
      await sleep(2500);
    }
    transporter.close();
    failures.length = 0; stillFailed.forEach(f => failures.push(f));
  }

  log('==================================');
  log(`SUMMARY: sent=${sent}  stillFailed=${failures.length}  scope=${SCOPE}`);
  if (failures.length) failures.forEach(f => log(`  - ${f.email}: ${f.error || 'see above'}`));
  log('==================================');
})().catch(err => { log(`FATAL: ${err.message}`); log(err.stack); process.exit(1); });
