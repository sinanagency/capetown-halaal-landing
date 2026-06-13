// Render the signed vendor contract to a PDF buffer. Mirrors the invoice
// puppeteer-core + chromium-min pattern so it ships under Vercel's serverless
// limit. The HTML is a self-contained themed document with the signature image
// embedded inline (data URL → png).

import { CONTRACT_SECTIONS, CONTRACT_ACCEPTANCE_LINE, CONTRACT_DATE_RANGE, CONTRACT_VENUE, CONTRACT_VERSION } from './copy'

function escapeHtml(s: string): string {
  return String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export interface SignedContractData {
  vendorName: string         // business_name
  contactName: string        // contact_name
  printName: string          // typed in the form
  signedAtPlace: string      // typed in the form (e.g. "Cape Town")
  signedAtIso: string        // timestamp utc
  signatureDataUrl: string   // data:image/png;base64,...
  ip: string | null
  applicationId: string
}

export function buildSignedContractHtml(d: SignedContractData): string {
  const sigBlocks = CONTRACT_SECTIONS.slice(1).map((sec) => {
    const heading = sec.heading ? `<h2>${escapeHtml(sec.heading)}</h2>` : ''
    const intro = sec.intro ? `<p>${escapeHtml(sec.intro)}</p>` : ''
    const bullets = sec.bullets ? `<ul>${sec.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>` : ''
    return `<section>${heading}${intro}${bullets}</section>`
  }).join('')

  const signedDate = new Date(d.signedAtIso)
  const day = signedDate.getUTCDate()
  const month = signedDate.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' })
  const year = signedDate.getUTCFullYear()
  const fullStamp = signedDate.toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short', timeZone: 'UTC' })

  return `<!doctype html>
<html><head><meta charset="utf-8"/><title>Vendor Contract 2026 — ${escapeHtml(d.vendorName)}</title>
<style>
  @page { size: A4; margin: 18mm; }
  body { font-family: ui-serif, Georgia, "Times New Roman", serif; color: #1B1A17; font-size: 11pt; line-height: 1.5; }
  .sans { font-family: ui-sans-serif, system-ui, Inter, sans-serif; }
  header { text-align: center; margin-bottom: 24px; }
  header .marks { display: flex; gap: 18px; justify-content: center; align-items: center; margin-bottom: 12px; }
  header .marks .badge { width: 64px; height: 64px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; color: #fff; font-weight: 600; font-size: 9pt; padding: 4px; text-align: center; }
  header .marks .cth { background: #2BAFB0; }
  header .marks .yah { background: #000; }
  h1 { font-size: 20pt; font-weight: 600; letter-spacing: -0.02em; margin: 0; }
  .sub { font-family: ui-sans-serif, system-ui, Inter, sans-serif; font-size: 9pt; color: #666; margin-top: 4px; }
  .parties { background: #FDFAF1; border: 1px solid #B8924A66; border-radius: 8px; padding: 12px 16px; margin: 16px 0; font-family: ui-sans-serif, system-ui, Inter, sans-serif; font-size: 9.5pt; }
  .parties .row { display: flex; justify-content: space-between; gap: 12px; }
  .parties .row + .row { margin-top: 4px; }
  .parties .k { color: #777; }
  h2 { font-size: 12pt; margin: 22px 0 6px; padding-bottom: 4px; border-bottom: 1px solid #e5e5e5; font-weight: 600; }
  ul { margin: 6px 0 0 22px; padding: 0; }
  li { margin: 6px 0; break-inside: avoid; }
  .accept { font-weight: 600; padding-top: 14px; border-top: 1px solid #e5e5e5; margin-top: 18px; break-inside: avoid; }
  .signblock { margin-top: 28px; page-break-inside: avoid; }
  .signblock .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 12px; font-family: ui-sans-serif, system-ui, Inter, sans-serif; font-size: 9.5pt; }
  .signblock .label { color: #666; font-size: 8.5pt; }
  .signblock .value { border-bottom: 1px solid #1B1A17; padding-bottom: 4px; min-height: 22px; }
  .sigbox { border: 1px solid #1B1A17; border-radius: 6px; padding: 6px; background: #fff; height: 100px; display: flex; align-items: center; justify-content: center; }
  .sigbox img { max-height: 90px; max-width: 100%; }
  .audit { margin-top: 24px; padding: 10px 12px; background: #f6f6f6; border-radius: 6px; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 8pt; color: #555; }
  .footer-note { margin-top: 14px; font-family: ui-sans-serif, system-ui, Inter, sans-serif; font-size: 8.5pt; color: #777; text-align: center; }
</style>
</head><body>
  <header>
    <div class="marks">
      <div class="badge cth">Cape Town<br/>Halaal</div>
      <div class="badge yah">Young at<br/>Heart</div>
    </div>
    <h1>Vendor Contract 2026</h1>
    <div class="sub">${escapeHtml(CONTRACT_DATE_RANGE)}, ${escapeHtml(CONTRACT_VENUE)}</div>
  </header>

  <p>This is a contract between <strong>Cape Town Halaal and Young at Heart Festival</strong> (referred to as &ldquo;we&rdquo; and &ldquo;the organisers&rdquo;) and the Stall Holder (referred to as the &ldquo;Vendor&rdquo;) for trading at the festival on <strong>${escapeHtml(CONTRACT_DATE_RANGE)}</strong> at ${escapeHtml(CONTRACT_VENUE)}.</p>

  <div class="parties">
    <div class="row"><span class="k">Vendor name</span><strong>${escapeHtml(d.vendorName)}</strong></div>
    ${d.contactName ? `<div class="row"><span class="k">Contact</span><span>${escapeHtml(d.contactName)}</span></div>` : ''}
  </div>

  ${sigBlocks}

  <p class="accept">${escapeHtml(CONTRACT_ACCEPTANCE_LINE)}</p>

  <div class="signblock">
    <div class="sigbox"><img src="${d.signatureDataUrl}" alt="Vendor signature"/></div>
    <div class="grid">
      <div>
        <div class="label">Full name in print</div>
        <div class="value">${escapeHtml(d.printName)}</div>
      </div>
      <div>
        <div class="label">Signed at</div>
        <div class="value">${escapeHtml(d.signedAtPlace)}</div>
      </div>
      <div>
        <div class="label">On this day</div>
        <div class="value">${day} ${escapeHtml(month)} ${year}</div>
      </div>
      <div>
        <div class="label">Contract version</div>
        <div class="value">${escapeHtml(CONTRACT_VERSION)}</div>
      </div>
    </div>
  </div>

  <div class="audit">
    Signed digitally on ${escapeHtml(fullStamp)} UTC. IP ${escapeHtml(d.ip || 'unrecorded')}. Application ${escapeHtml(d.applicationId)}. Held under ECTA Act §13.
  </div>
  <div class="footer-note">Cape Town Halaal Festival 2026, in association with Young at Heart Festival.</div>
</body></html>`
}

export async function renderSignedContractPdf(d: SignedContractData): Promise<Buffer | null> {
  const html = buildSignedContractHtml(d)
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chromium: any = (await import('@sparticuz/chromium-min')).default
    const puppeteer = (await import('puppeteer-core')).default
    const executablePath = await chromium.executablePath(
      'https://github.com/Sparticuz/chromium/releases/download/v147.0.0/chromium-v147.0.0-pack.x64.tar'
    )
    const browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    })
    try {
      const page = await browser.newPage()
      await page.setContent(html, { waitUntil: 'load' })
      const pdf = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '18mm', bottom: '18mm', left: '18mm', right: '18mm' } })
      return Buffer.from(pdf)
    } finally {
      await browser.close()
    }
  } catch (e) {
    console.error('[contract-pdf] render failed:', (e as Error).message)
    return null
  }
}
