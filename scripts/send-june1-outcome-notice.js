/**
 * Batch send "outcomes from 1 June" notice to all pending vendor applicants.
 * - Excludes Lamees (already replied today)
 * - 2s pause between sends (matches existing delay-notice route)
 * - Appends to admin_notes for audit trail
 * - Logs sent / failed tally to /tmp/june1-notice.log
 */

const nodemailer = require('nodemailer');
const fs = require('fs');

const SUPA_URL = 'https://dtdqopjdxwfvtyrnygdt.supabase.co';
const SUPA_KEY = process.env.SUPA_KEY;

const FROM = 'Young at Heart Festival <support@youngatheart.co.za>';
const BCC  = 'admin@sinan.agency';
const SUBJECT = 'Young at Heart Festival 2026 — application outcomes from 1 June';

const EXCLUDE_EMAIL = 'lameesromaney@gmail.com';
const TODAY = new Date().toISOString().slice(0, 10);
const NOTE_LINE = `${TODAY}: Sent 'outcomes from 1 June' notice`;

const LOG = '/tmp/june1-notice.log';
function log(line) {
  const stamped = `[${new Date().toISOString()}] ${line}`;
  console.log(stamped);
  fs.appendFileSync(LOG, stamped + '\n');
}

function getFirstName(contactName) {
  if (!contactName || typeof contactName !== 'string') return 'there';
  const trimmed = contactName.trim();
  if (!trimmed) return 'there';
  const first = trimmed.split(/\s+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}

function esc(s) {
  return String(s || '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));
}

function buildText(firstName, businessName) {
  return `Slms / Hi ${firstName},

A quick update on your application to trade at Young at Heart Festival 2026 with ${businessName}.

Our review process is now in its final stages. From 1 June 2026 onwards, every applicant will receive a personal email with the outcome of their application — whether approved or not. No further action is needed from you in the meantime.

If you have not heard from us shortly after 1 June, please check your spam or junk folder for an email from support@youngatheart.co.za, and mark us as a safe sender so future emails land properly.

Thank you again for your patience and for wanting to be part of Young at Heart Festival 2026.

Kind regards,
The Young at Heart Festival Team

support@youngatheart.co.za  ·  065 943 5012
cthalaal.co.za  ·  @youngatheart_capetown
`;
}

function buildHtml(firstName, businessName) {
  return `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,sans-serif;color:#333;line-height:1.55;font-size:15px;max-width:620px;margin:0;padding:0">
<p>Slms / Hi ${esc(firstName)},</p>

<p>A quick update on your application to trade at Young at Heart Festival 2026 with <strong>${esc(businessName)}</strong>.</p>

<p>Our review process is now in its final stages. <strong>From 1 June 2026 onwards</strong>, every applicant will receive a personal email with the outcome of their application — whether approved or not. No further action is needed from you in the meantime.</p>

<p>If you have not heard from us shortly after 1 June, please check your <strong>spam or junk folder</strong> for an email from <a href="mailto:support@youngatheart.co.za">support@youngatheart.co.za</a>, and mark us as a safe sender so future emails land properly.</p>

<p>Thank you again for your patience and for wanting to be part of Young at Heart Festival 2026.</p>

<p>Kind regards,<br><strong>The Young at Heart Festival Team</strong></p>

<hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0">
<p style="font-size:13px;color:#888;margin:0">
<a href="mailto:support@youngatheart.co.za" style="color:#cd2653;text-decoration:none">support@youngatheart.co.za</a> · 065 943 5012<br>
<a href="https://cthalaal.co.za" style="color:#cd2653;text-decoration:none">cthalaal.co.za</a> · <a href="https://instagram.com/youngatheart_capetown" style="color:#cd2653;text-decoration:none">@youngatheart_capetown</a>
</p>
</body></html>`;
}

const transporter = nodemailer.createTransport({
  host: 'smtpout.secureserver.net',
  port: 465,
  secure: true,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  tls: { rejectUnauthorized: false },
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  pool: true,
  maxConnections: 1,
  maxMessages: 100,
});

async function fetchPending() {
  const res = await fetch(
    `${SUPA_URL}/rest/v1/vendor_applications?status=eq.pending&select=id,email,contact_name,business_name,admin_notes&order=created_at.asc`,
    { headers: { apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}` } }
  );
  if (!res.ok) throw new Error(`Supabase fetch failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function appendAdminNote(id, existingNotes) {
  const updated = existingNotes && existingNotes.trim()
    ? `${existingNotes.trim()}\n${NOTE_LINE}`
    : NOTE_LINE;
  const res = await fetch(
    `${SUPA_URL}/rest/v1/vendor_applications?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        apikey: SUPA_KEY,
        Authorization: `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({ admin_notes: updated }),
    }
  );
  if (!res.ok) throw new Error(`note update failed: ${res.status}`);
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  fs.writeFileSync(LOG, ''); // truncate
  log(`Starting batch send. Today: ${TODAY}`);

  if (!SUPA_KEY) { log('FATAL: SUPA_KEY env var missing'); process.exit(1); }
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    log('FATAL: SMTP_USER / SMTP_PASS missing'); process.exit(1);
  }

  const all = await fetchPending();
  const queue = all.filter(r => r.email && r.email.toLowerCase() !== EXCLUDE_EMAIL);
  log(`Fetched ${all.length} pending applicants. Queue (after excluding Lamees): ${queue.length}`);

  let sent = 0, failed = 0;
  const failures = [];

  for (let i = 0; i < queue.length; i++) {
    const app = queue[i];
    const firstName = getFirstName(app.contact_name);
    const businessName = (app.business_name || 'your business').trim();

    try {
      const info = await transporter.sendMail({
        from: FROM,
        to: app.email,
        bcc: BCC,
        replyTo: 'support@youngatheart.co.za',
        subject: SUBJECT,
        text: buildText(firstName, businessName),
        html: buildHtml(firstName, businessName),
        headers: {
          'X-Mailer': 'Young at Heart Festival',
          'List-Unsubscribe': '<mailto:support@youngatheart.co.za?subject=unsubscribe>',
        },
      });

      try {
        await appendAdminNote(app.id, app.admin_notes);
      } catch (noteErr) {
        log(`  WARN [${i+1}/${queue.length}] ${app.email} sent but admin_notes update failed: ${noteErr.message}`);
      }

      sent++;
      log(`  OK   [${i+1}/${queue.length}] ${app.email}  (${businessName.slice(0,40)})  msgId=${info.messageId}`);
    } catch (err) {
      failed++;
      failures.push({ email: app.email, error: err.message });
      log(`  FAIL [${i+1}/${queue.length}] ${app.email}: ${err.message}`);
    }

    if (i < queue.length - 1) await sleep(2000);
  }

  transporter.close();

  log('');
  log('==================================');
  log(`SUMMARY: sent=${sent}  failed=${failed}  total=${queue.length}`);
  if (failures.length) {
    log('FAILURES:');
    failures.forEach(f => log(`  - ${f.email}: ${f.error}`));
  }
  log('==================================');
})().catch(err => {
  log(`FATAL: ${err.message}`);
  log(err.stack);
  process.exit(1);
});
