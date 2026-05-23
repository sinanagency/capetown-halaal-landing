const nodemailer = require('nodemailer');

const FROM = 'Young at Heart Festival <support@youngatheart.co.za>';
const TO   = 'Lamees Achmat <lameesromaney@gmail.com>';
const CC   = 'capetownhalaal@gmail.com';
const BCC  = 'admin@sinan.agency';

const SUBJECT = 'Re: Young at Heart Festival 2026 — your vendor application';

const TEXT = `Slms Lamees,

Thanks for the kind note on the Smile FM partnership — appreciated.

A quick note on your application: we sent you an update on 21 April explaining that we have had a far higher application volume than expected this year, and the selection committee is rolling decisions out in waves. Please check your spam or junk folder for an email from support@youngatheart.co.za. If you can mark it as a safe sender, our future emails to you will land properly.

Your application for Pomegranate Wellness (submitted 10 April, Marquee Table 2x2) is in the queue and will be reviewed. Every applicant — approved or not — will receive a personal email with the outcome. No action is needed from you in the meantime.

Apologies for the wait, and thanks for your patience.

Kind regards,
The Young at Heart Festival Team

support@youngatheart.co.za  ·  065 943 5012
cthalaal.co.za  ·  @youngatheart_capetown
`;

const HTML = `<!DOCTYPE html>
<html><body style="font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Inter,sans-serif;color:#333;line-height:1.55;font-size:15px;max-width:620px;margin:0;padding:0">
<p>Slms Lamees,</p>

<p>Thanks for the kind note on the Smile FM partnership — appreciated.</p>

<p>A quick note on your application: we sent you an update on <strong>21 April</strong> explaining that we have had a far higher application volume than expected this year, and the selection committee is rolling decisions out in waves. Please check your <strong>spam or junk folder</strong> for an email from <a href="mailto:support@youngatheart.co.za">support@youngatheart.co.za</a>. If you can mark it as a safe sender, our future emails to you will land properly.</p>

<p>Your application for <strong>Pomegranate Wellness</strong> (submitted 10 April, Marquee Table 2&times;2) is in the queue and will be reviewed. Every applicant — approved or not — will receive a personal email with the outcome. No action is needed from you in the meantime.</p>

<p>Apologies for the wait, and thanks for your patience.</p>

<p>Kind regards,<br>
<strong>The Young at Heart Festival Team</strong></p>

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
      host: cfg.host,
      port: cfg.port,
      secure: cfg.secure,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      tls: { rejectUnauthorized: false },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });

    try {
      const info = await transporter.sendMail({
        from: FROM,
        to: TO,
        cc: CC,
        bcc: BCC,
        replyTo: 'support@youngatheart.co.za',
        subject: SUBJECT,
        text: TEXT,
        html: HTML,
        headers: {
          'X-Mailer': 'Young at Heart Festival',
          'List-Unsubscribe': '<mailto:support@youngatheart.co.za?subject=unsubscribe>',
        },
      });
      console.log(`SENT via ${cfg.label}`);
      console.log('messageId:', info.messageId);
      console.log('accepted: ', info.accepted);
      console.log('rejected: ', info.rejected);
      console.log('response: ', info.response);
      return;
    } catch (err) {
      console.error(`FAILED via ${cfg.label}: ${err.message}`);
    }
  }
  process.exit(1);
}

send();
