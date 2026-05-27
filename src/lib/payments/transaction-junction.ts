import type { PaymentProvider, CreatePaymentOpts, CreatePaymentResult, WebhookResult } from './types'

/**
 * Transaction Junction provider (gateway in front of an FNB merchant account).
 *
 * Onboarding provisions these — set them in Vercel env when they arrive:
 *   TJ_API_BASE       e.g. https://api.switch.tj/...   (their REST base)
 *   TJ_MERCHANT_ID    the FNB-acquired merchant profile id
 *   TJ_API_KEY        API credential / bearer token
 *   TJ_WEBHOOK_SECRET shared secret to verify callbacks
 *
 * Until those exist, isConfigured() is false and the portal shows "card payment
 * opening soon" (no fake button). The two methods below are the ONLY places that
 * need TJ's exact request/response shape — fill them from the integration guide
 * once we have sandbox access. Everything else (UI, routes, status, reconciliation)
 * is already done and provider-agnostic.
 */

const API_BASE = (process.env.TJ_API_BASE || '').trim().replace(/\/$/, '')
const MERCHANT_ID = (process.env.TJ_MERCHANT_ID || '').trim()
const API_KEY = (process.env.TJ_API_KEY || '').trim()
const WEBHOOK_SECRET = (process.env.TJ_WEBHOOK_SECRET || '').trim()

export const transactionJunction: PaymentProvider = {
  id: 'transaction_junction',

  isConfigured() {
    return !!(API_BASE && MERCHANT_ID && API_KEY)
  },

  async createPayment(opts: CreatePaymentOpts): Promise<CreatePaymentResult> {
    if (!this.isConfigured()) throw new Error('Transaction Junction is not configured yet')

    // === FILL FROM TJ INTEGRATION GUIDE (hosted checkout / payment link) ===
    // Expected shape (confirm exact field names + path with their docs/sandbox):
    //   POST {API_BASE}/checkouts
    //   Authorization: Bearer {API_KEY}
    //   { merchantId, amount (cents), currency, reference (echoed back),
    //     customerEmail, description, successUrl, cancelUrl, webhookUrl }
    //   -> { redirectUrl, id }
    const res = await fetch(`${API_BASE}/checkouts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchantId: MERCHANT_ID,
        amount: Math.round(opts.amount * 100),
        currency: opts.currency || 'ZAR',
        reference: opts.reference,
        merchantReference: opts.applicationId, // echoed back so the webhook resolves the vendor
        customerEmail: opts.email,
        description: opts.description,
        successUrl: opts.returnUrl,
        cancelUrl: opts.cancelUrl,
      }),
    })
    if (!res.ok) throw new Error(`Transaction Junction createPayment failed: ${res.status} ${await res.text()}`)
    const data = await res.json()
    return { url: data.redirectUrl || data.url, providerRef: data.id }
  },

  async parseWebhook(req: Request, rawBody: string): Promise<WebhookResult> {
    // === FILL FROM TJ INTEGRATION GUIDE (callback verification) ===
    // Verify the shared secret / signature header, then map the payload.
    const sig = req.headers.get('x-tj-signature') || req.headers.get('x-signature') || ''
    if (WEBHOOK_SECRET && sig !== WEBHOOK_SECRET) {
      return { ok: false, error: 'bad signature' }
    }
    let p: Record<string, unknown> = {}
    try { p = JSON.parse(rawBody) } catch { return { ok: false, error: 'bad payload' } }
    const status = String(p.status || '').toLowerCase()
    return {
      ok: true,
      applicationId: (p.merchantReference as string) || undefined,
      reference: (p.reference as string) || undefined,
      providerRef: (p.id as string) || undefined,
      amount: p.amount ? Number(p.amount) / 100 : undefined,
      status: status === 'successful' || status === 'paid' || status === 'completed'
        ? 'paid'
        : status === 'failed' || status === 'declined'
          ? 'failed'
          : 'pending',
    }
  },
}
