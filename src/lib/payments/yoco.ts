// Yoco Online Checkout provider — uses the same Yoco merchant account that
// WordPress/WooCommerce already charges to for tickets, so booth fees land in
// the same FNB-settled Yoco wallet. Two surfaces:
//   1) createPayment() — POST https://payments.yoco.com/api/checkouts
//   2) parseWebhook()  — Standard Webhooks signature (HMAC-SHA256, base64)
//
// Required env:
//   YOCO_SECRET_KEY      — sk_live_... (or sk_test_... in non-prod)
//   YOCO_WEBHOOK_SECRET  — Yoco-issued whsec_... for the portal webhook
//                          (separate from the WordPress plugin's webhook secret).

import { createHmac, timingSafeEqual } from 'crypto'
import type { CreatePaymentOpts, CreatePaymentResult, PaymentProvider, WebhookResult } from './types'

const SECRET_KEY = (process.env.YOCO_SECRET_KEY || '').trim()
const WEBHOOK_SECRET = (process.env.YOCO_WEBHOOK_SECRET || '').trim()
const API_BASE = 'https://payments.yoco.com/api'

interface YocoCheckoutResponse {
  id: string
  redirectUrl: string
  status?: string
  amount?: number
  currency?: string
}

export const yoco: PaymentProvider = {
  id: 'yoco',

  isConfigured() {
    return Boolean(SECRET_KEY)
  },

  async createPayment(opts: CreatePaymentOpts): Promise<CreatePaymentResult> {
    if (!SECRET_KEY) throw new Error('Yoco not configured: missing YOCO_SECRET_KEY')

    const body = {
      // Yoco expects the amount in MINOR units (cents). Rand → cents.
      amount: Math.round(opts.amount * 100),
      currency: opts.currency || 'ZAR',
      successUrl: opts.returnUrl,
      cancelUrl: opts.cancelUrl,
      failureUrl: opts.cancelUrl,
      metadata: {
        applicationId: opts.applicationId,
        reference: opts.reference,
        businessName: opts.businessName,
        email: opts.email,
      },
    }

    const res = await fetch(`${API_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SECRET_KEY}`,
        'Content-Type': 'application/json',
        // Idempotency: a vendor double-clicking "Pay" must not create two
        // checkouts. The reference is unique-per-application.
        'Idempotency-Key': opts.reference,
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    })

    const data = (await res.json().catch(() => ({}))) as YocoCheckoutResponse & { errorMessage?: string }
    if (!res.ok || !data.redirectUrl) {
      throw new Error(`Yoco createCheckout failed: ${res.status} — ${data.errorMessage || JSON.stringify(data)}`)
    }
    return { url: data.redirectUrl, providerRef: data.id }
  },

  async parseWebhook(req: Request, rawBody: string): Promise<WebhookResult> {
    if (!WEBHOOK_SECRET) return { ok: false, error: 'YOCO_WEBHOOK_SECRET not set' }

    // Standard Webhooks: sign(timestamp + '.' + body) with the secret bytes
    // (decoded from the whsec_<base64> form), compare against any of the
    // whitespace-separated signatures in webhook-signature.
    const id = req.headers.get('webhook-id') || ''
    const ts = req.headers.get('webhook-timestamp') || ''
    const sigHeader = req.headers.get('webhook-signature') || ''
    if (!id || !ts || !sigHeader) return { ok: false, error: 'missing webhook headers' }

    // Replay protection: reject anything older than 5 minutes.
    const ageSec = Math.abs(Math.floor(Date.now() / 1000) - Number(ts))
    if (!Number.isFinite(ageSec) || ageSec > 300) {
      return { ok: false, error: 'stale webhook' }
    }

    const secretBytes = Buffer.from(WEBHOOK_SECRET.replace(/^whsec_/, ''), 'base64')
    const expected = createHmac('sha256', secretBytes).update(`${id}.${ts}.${rawBody}`).digest('base64')

    const candidates = sigHeader
      .split(' ')
      .map((p) => p.split(',')[1])
      .filter(Boolean)

    const expectedBuf = Buffer.from(expected, 'utf8')
    const matched = candidates.some((c) => {
      const cb = Buffer.from(c, 'utf8')
      return cb.length === expectedBuf.length && timingSafeEqual(cb, expectedBuf)
    })
    if (!matched) return { ok: false, error: 'invalid signature' }

    let evt: {
      type?: string
      payload?: {
        id?: string
        amount?: number
        currency?: string
        status?: string
        metadata?: { applicationId?: string; reference?: string }
      }
    }
    try {
      evt = JSON.parse(rawBody)
    } catch {
      return { ok: false, error: 'bad json' }
    }

    const type = evt.type || ''
    const p = evt.payload || {}
    const meta = p.metadata || {}
    const applicationId = meta.applicationId
    const reference = meta.reference
    const providerRef = p.id
    const amountMinor = Number(p.amount || 0)
    const amount = amountMinor / 100

    if (type === 'payment.succeeded') {
      return { ok: true, applicationId, reference, status: 'paid', providerRef, amount }
    }
    if (type === 'payment.failed') {
      return { ok: true, applicationId, reference, status: 'failed', providerRef, amount }
    }
    // Other event types (refund.succeeded, payment.created etc.) are not
    // currently acted on — return ok so the webhook is 200'd but no state change.
    return { ok: true, applicationId, reference, status: 'pending', providerRef, amount }
  },
}
