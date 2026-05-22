const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Minimal .env.local loader (no dotenv dep)
{
  const envPath = path.join(__dirname, '..', '.env.local');
  const raw = fs.readFileSync(envPath, 'utf8');
  for (const line of raw.split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (!m) continue;
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    process.env[m[1]] = val;
  }
}

const PDF_PATH = '/Users/milaaj/Downloads/Arable_Arabia_Factsheet_2026.pdf';
const TO = 'chennaouihoussam@gmail.com';
const FROM = '"Arable Arabia" <support@youngatheart.co.za>';

const emails = [
  {
    subject: 'Demo · Zanii AI — save your villa palms before weevil damage shows',
    body: `Your villa palms in Dubai may already be hollowed out from the inside. Red palm weevil kills silently, with no visible signs until the trunk collapses.

Arable Arabia uses SOS PALM, a patented Spanish closed-injection system registered in the UAE. 5 to 7 visits a year, no pesticide released into the environment, safe for pets and people.

Free on-site assessment.`,
  },
  {
    subject: 'Demo · Zanii AI — residue-free dates, protected crop',
    body: `For date farms across the UAE, red palm weevil is a silent revenue killer.

SOS PALM is the only system that disseminates through the palm's vascular bundles, reaches the growth bud, and leaves zero pesticide residue on harvested fruit. Already deployed across Morocco, Qatar, Spain, Italy, Kuwait and Jordan.

Free site survey from Arable Arabia.`,
  },
  {
    subject: "Demo · Zanii AI — your resort's palms are a liability until they're protected",
    body: `Falling trunks are a real risk once the weevil completes its cycle. On a 5-star property, one collapsed palm is a guest-safety incident.

Arable Arabia inspects every palm on your site at no cost, then protects them with SOS PALM's closed injection protocol. One annual contract, 5 to 7 visits.

Worth 20 minutes.`,
  },
  {
    subject: 'Demo · Zanii AI — protect every palm across your Dubai developments',
    body: `Replacing a mature palm costs 10 to 30 times more than a one-year SOS PALM contract.

Arable Arabia delivers the patented Spanish injection protocol across multi-site portfolios in the UAE. Residue-free, closed-system, safe for residents.

Free survey across all your developments.`,
  },
  {
    subject: 'Demo · Zanii AI — public palm infrastructure · SOS PALM',
    body: `SOS PALM is already deployed on public palm assets in Spain, Italy, Qatar, Morocco, Kuwait and Jordan.

Arable Arabia brings the same patented, UAE-registered protocol to municipal inventories in Dubai. No environmental release, full systemic protection, scalable across thousands of palms.

Open to a brief?`,
  },
  {
    subject: 'Demo · Zanii AI — protect your course palms before they drop',
    body: `Golf courses in the UAE lose mature palms to red palm weevil every season.

Arable Arabia's SOS PALM contract covers 5 to 7 annual applications through a closed injection system. No pesticide in play areas, no residue, full trunk-to-crown dissemination.

Free assessment of your course palms.`,
  },
  {
    subject: 'Demo · Zanii AI — palm protection across your managed portfolio',
    body: `Your tenants and HOAs expect palms to look healthy year round.

Arable Arabia handles specialist palm pest management across multi-unit portfolios. Patented SOS PALM injection, UAE-registered, safe for residents and pets.

One annual contract covers prevention and treatment at a fraction of palm replacement cost.`,
  },
  {
    subject: 'Demo · Zanii AI — protect decades of palm growth in one season',
    body: `A mature palm takes decades to grow and one season to collapse once the weevil is inside.

Arable Arabia's SOS PALM protocol protects estates across the UAE. Closed injection, zero environmental release, residue-free fruit.

Free on-site survey of every palm on your property.`,
  },
  {
    subject: 'Demo · Zanii AI — specify SOS PALM on your next Dubai project',
    body: `When specifying palms on UAE projects, the long-term liability is red palm weevil.

Arable Arabia is the UAE-registered partner for SOS PALM, the patented Spanish injection tech deployed in 8+ countries.

Spec us into your maintenance scope and your palms stay protected from handover onward.`,
  },
  {
    subject: 'Demo · Zanii AI — a falling palm on your property is a safety incident waiting to happen',
    body: `Commercial properties with mature palms carry a silent liability. Once red palm weevil has hollowed the trunk, collapse is a question of when, not if.

Arable Arabia's SOS PALM contract protects every palm on your site through 5 to 7 scheduled visits a year. Closed injection, no environmental release.

Free assessment.`,
  },
];

const SIGNATURE = `

— Arable Arabia
Agricultural Extension Services LLC · Dubai, UAE
+971 50 551 1243 · info@arablearabia.com · www.arablearabia.com
Office G94, Sabha Building, Dubai, UAE`;

function wrapHtml(body, subject) {
  const html = body
    .split('\n\n')
    .map((p) => `<p style="margin:0 0 14px 0;">${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
  return `<!DOCTYPE html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;font-size:15px;line-height:1.55;max-width:600px;">
${html}
<p style="margin:24px 0 4px 0;color:#0f4c3a;font-weight:600;">— Arable Arabia</p>
<p style="margin:0;color:#555;font-size:13px;line-height:1.5;">
Agricultural Extension Services LLC · Dubai, UAE<br>
+971 50 551 1243 · info@arablearabia.com · www.arablearabia.com<br>
Office G94, Sabha Building, Dubai, UAE
</p>
</body></html>`;
}

(async () => {
  if (!fs.existsSync(PDF_PATH)) {
    console.error('PDF not found at', PDF_PATH);
    process.exit(1);
  }
  const pdf = fs.readFileSync(PDF_PATH);
  console.log(`PDF loaded: ${pdf.length} bytes`);

  const transporter = nodemailer.createTransport({
    host: 'smtpout.secureserver.net',
    port: 465,
    secure: true,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  await transporter.verify();
  console.log('SMTP connection verified\n');

  for (let i = 0; i < emails.length; i++) {
    const e = emails[i];
    try {
      const info = await transporter.sendMail({
        from: FROM,
        to: TO,
        subject: e.subject,
        text: e.body + SIGNATURE,
        html: wrapHtml(e.body, e.subject),
        attachments: [
          {
            filename: 'Arable_Arabia_Factsheet_2026.pdf',
            content: pdf,
            contentType: 'application/pdf',
          },
        ],
      });
      console.log(`[${i + 1}/10] SENT · ${e.subject}`);
      console.log(`        messageId: ${info.messageId}`);
      if (i < emails.length - 1) await new Promise((r) => setTimeout(r, 2500));
    } catch (err) {
      console.error(`[${i + 1}/10] FAILED · ${e.subject}`);
      console.error('       ', err.message);
    }
  }
  console.log('\nDone.');
})();
