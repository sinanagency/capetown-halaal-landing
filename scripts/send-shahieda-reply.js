/**
 * Personal reply to Shahieda Davids (53 Plumtree Studio).
 * She emailed asking for her application outcome after losing emails in a malfunction.
 * Status: pending, applied 10 April, already received the June-1 notice on 6 May (lost it).
 * Tries 465 SSL then 587 STARTTLS (mirrors send-lamees-reply.js).
 */
const nodemailer = require('nodemailer');

const FROM = 'Young at Heart Festival <support@youngatheart.co.za>';
const TO   = 'Shahieda Davids <shahieda1001@gmail.com>';
const CC   = 'capetownhalaal@gmail.com';
const BCC  = 'admin@sinan.agency';

const SUBJECT = 'Re: Application Received — 53 Plumtree Studio — Young at Heart Festival 2026';

const TEXT = `Slms / Hi Shahieda,

Thank you for getting in touch, and no need to apologise at all. Sorry to hear about the email malfunction.

To put your mind at ease: your application to trade at Young at Heart Festival 2026 with 53 Plumtree Studio (submitted 10 April) has been received and is in our system. Nothing has been missed on your side.

Our review process is now in its final stages. From 1 June 2026 onwards, every applicant will receive a personal email with the outcome of their application, whether approved or not. No further action is needed from you in the meantime.

Because emails have gone astray before, please check your spam or junk folder for messages from support@youngatheart.co.za, and mark us as a safe sender so the outcome email lands properly. If you have not heard from us shortly after 1 June, reply to this email and we will follow up directly.

Thank you for your patience and for wanting to be part of Young at Heart Festival 2026.

Kind regards,
The Young at Heart Festival Team

support@youngatheart.co.za  ·  065 943 5012
cthalaal.co.za  ·  @youngatheart_capetown
`;

const HTML = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,sans-serif;color:#333;line-height:1.55;font-size:15px;max-width:620px;margin:0;padding:0">
<p>Slms / Hi Shahieda,</p>

<p>Thank you for getting in touch, and no need to apologise at all. Sorry to hear about the email malfunction.</p>

<p>To put your mind at ease: your application to trade at Young at Heart Festival 2026 with <strong>53 Plumtree Studio</strong> (submitted 10 April) has been received and is in our system. Nothing has been missed on your side.</p>

<p>Our review process is now in its final stages. <strong>From 1 June 2026 onwards</strong>, every applicant will receive a personal email with the outcome of their application, whether approved or not. No further action is needed from you in the meantime.</p>

<p>Because emails have gone astray before, please check your <strong>spam or junk folder</strong> for messages from <a href="mailto:support@youngatheart.co.za">support@youngatheart.co.za</a>, and mark us as a safe sender so the outcome email lands properly. If you have not heard from us shortly after 1 June, reply to this email and we will follow up directly.</p>

<p>Thank you for your patience and for wanting to be part of Young at Heart Festival 2026.</p>

<p>Kind regards,<br><strong>The Young at Heart Festival Team</strong></p>

<hr style="border:none;border-top:1px solid #e5e5e5;margin:20px 0">
<p style="font-size:13px;color:#888;margin:0">
<a href="mailto:support@youngatheart.co.za" style="color:#cd2653;text-decoration:none">support@youngatheart.co.za</a> · 065 943 5012<br>
<a href="https://cthalaal.co.za" style="color:#cd2653;text-decoration:none">cthalaal.co.za</a> · <a href="https://instagram.com/youngatheart_capetown" style="color:#cd2653;text-decoration:none">@youngatheart_capetown</a>
</p>
</body></html>`;

async function send() {
  const transports = [
    { host: 'smtpout.secureserver.net', port: 465, secure: true,  label: '465 SSL' },
    { host: 'smtpout.secureserver.net', port: 587, secure: false, label: '587 STARTTLS' },
  ];
  for (const cfg of transports) {
    const transporter = nodemailer.createTransport({
      host: cfg.host, port: cfg.port, secure: cfg.secure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
    });
    try {
      const info = await transporter.sendMail({
        from: FROM, to: TO, cc: CC, bcc: BCC,
        replyTo: 'support@youngatheart.co.za',
        subject: SUBJECT, text: TEXT, html: HTML,
        headers: { 'X-Mailer': 'Young at Heart Festival',
          'List-Unsubscribe': '<mailto:support@youngatheart.co.za?subject=unsubscribe>' },
      });
      console.log(`SENT via ${cfg.label}`);
      console.log('messageId:', info.messageId);
      console.log('accepted:', info.accepted, 'rejected:', info.rejected);
      console.log('response:', info.response);
      return;
    } catch (err) {
      console.error(`FAILED via ${cfg.label}: ${err.message}`);
    }
  }
  process.exit(1);
}
send();
