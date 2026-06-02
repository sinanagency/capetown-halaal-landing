import type { PaymentProvider, CreatePaymentOpts, CreatePaymentResult, WebhookResult } from './types'

/**
 * FNB eCommerce API provider (FNB Merchant Services, spec v2.7).
 *
 * FNB is BOTH the gateway and the acquirer — card data is captured on FNB's own
 * hosted page, so we never touch a raw PAN (keeps us out of PCI scope). The flow
 * is redirect + server-side validate, NOT a webhook:
 *
 *   1. createPayment()  -> POST {BASE}/prepareTransaction  -> { url, txnToken }
 *   2. redirect the vendor's browser to `url` (FNB's card form + 3D Secure)
 *   3. FNB redirects the browser back to our return route (txnToken in query)
 *   4. verifyReturn()   -> GET {BASE}/validateTransaction  -> status / responseCode
 *      responseCode "000" === APPROVED. THIS is the source of truth, not the redirect.
 *
 * Onboarding provisions the credential below — set it in Vercel env when it arrives:
 *   FNB_API_KEY    the apiKey (GUID) FNB issues for the merchant profile   [required]
 *   FNB_API_BASE   REST base. Defaults to production. Set to the sandbox base
 *                  (https://sandbox.ms.fnb.co.za/eCommerce/v2) while testing.  [optional]
 *   FNB_JCN        merchant JCN/number, echoed for some report flows.          [optional]
 *
 * Until FNB_API_KEY exists, isConfigured() is false and the portal shows EFT +
 * "card payment opening soon" (no fake button). Everything else — UI, routes,
 * status, reconciliation — is already done and provider-agnostic.
 *
 * Spec refs: prepareTransaction §2.1.1, validateTransaction §2.1.5, response
 * codes Appendix A. Amounts are sent in CENTS as a string; "000" = approved.
 */

const PROD_BASE = 'https://pay.ms.fnb.co.za/eCommerce/v2'
const API_BASE = (process.env.FNB_API_BASE || PROD_BASE).trim().replace(/\/$/, '')
const API_KEY = (process.env.FNB_API_KEY || '').trim()

// Our own URL — where FNB sends the buyer back. Must match what's registered with FNB.
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || 'https://cthalaal.co.za').trim().replace(/\/$/, '')
const RETURN_URL = `${SITE}/api/payments/fnb/return`

export const fnb: PaymentProvider = {
  id: 'fnb',

  isConfigured() {
    return !!API_KEY
  },

  async createPayment(opts: CreatePaymentOpts): Promise<CreatePaymentResult> {
    if (!this.isConfigured()) throw new Error('FNB is not configured yet (FNB_API_KEY missing)')

    // FNB prepareTransaction. amount in cents as a string. validationURL/successURL/
    // failureURL all point at our server validator so the outcome is confirmed
    // server-side regardless of which one FNB uses to bounce the browser back.
    const body = {
      apiKey: API_KEY,
      merchantOrderNumber: opts.reference,            // echoed back in validate metadata -> resolves the vendor
      amount: String(Math.round(opts.amount * 100)),  // Rand -> cents
      validationURL: RETURN_URL,
      successURL: RETURN_URL,
      failureURL: RETURN_URL,
      description: opts.description,
    }

    const res = await fetch(`${API_BASE}/prepareTransaction`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      throw new Error(`FNB prepareTransaction failed: ${res.status} ${await res.text()}`)
    }
    const data = (await res.json()) as { url?: string; txnToken?: string }
    if (!data.url || !data.txnToken) {
      throw new Error('FNB prepareTransaction returned no url/txnToken')
    }
    // `url` is FNB's card-capture screen carrying the txnToken; redirect the buyer there.
    return { url: data.url, providerRef: data.txnToken }
  },

  // PULL model: confirm the outcome with a server-side validateTransaction call.
  async verifyReturn(req: Request): Promise<WebhookResult> {
    if (!this.isConfigured()) return { ok: false, error: 'FNB not configured' }

    const u = new URL(req.url)
    // FNB appends the token to the return URL; accept the common aliases just in case.
    const txnToken = u.searchParams.get('txnToken') || u.searchParams.get('token') || ''
    if (!txnToken) return { ok: false, error: 'missing txnToken on return' }

    // validateTransaction (GET). apiKey + txnToken as query params. If the FNB
    // sandbox rejects query params, switch to a JSON body — see spec §2.1.5.
    const vurl = `${API_BASE}/validateTransaction?apiKey=${encodeURIComponent(API_KEY)}&txnToken=${encodeURIComponent(txnToken)}`
    const res = await fetch(vurl, { method: 'GET', headers: { Accept: 'application/json' } })
    if (!res.ok) return { ok: false, error: `validateTransaction ${res.status}` }

    const data = (await res.json()) as {
      status?: string
      responseCode?: string
      amount?: number | string
      metadata?: Array<Record<string, string>>
    }

    // metadata is an array of single-key objects: [{maskedPan},{expiryDate},{merchantOrderNumber}]
    const meta: Record<string, string> = {}
    for (const m of data.metadata || []) for (const k of Object.keys(m)) meta[k] = m[k]
    const reference = meta.merchantOrderNumber || undefined

    const approved = data.responseCode === '000' || /approved/i.test(data.status || '')
    return {
      ok: true,
      reference,
      providerRef: txnToken,
      amount: data.amount != null ? Number(data.amount) / 100 : undefined,
      status: approved ? 'paid' : 'failed',
    }
  },
}
