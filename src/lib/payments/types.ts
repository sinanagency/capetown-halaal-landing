// Provider-agnostic payment layer for vendor booth fees.
// Transaction Junction (gateway) -> FNB (acquirer) is the first provider.
// Everything is written so a new provider just implements PaymentProvider.

export interface CreatePaymentOpts {
  applicationId: string
  amount: number            // in Rand (major units)
  currency?: string         // default ZAR
  reference: string         // our merchant reference, echoed back on the webhook
  email: string
  businessName: string
  description: string
  returnUrl: string         // where TJ sends the buyer back after paying
  cancelUrl: string
  failureUrl?: string       // separate URL on gateway failure. Falls back to cancelUrl.
}

export interface CreatePaymentResult {
  url: string               // hosted checkout / payment-link URL to send the vendor to
  providerRef?: string      // TJ's own transaction/session id, if returned
}

export interface WebhookResult {
  ok: boolean
  applicationId?: string    // resolved from the echoed merchant reference
  reference?: string
  status?: 'paid' | 'failed' | 'pending'
  providerRef?: string
  amount?: number
  error?: string
}

export interface PaymentProvider {
  id: string
  /** True only when the provider's credentials are present in the environment. */
  isConfigured(): boolean
  /** Create a hosted payment and return the URL to redirect the vendor to. */
  createPayment(opts: CreatePaymentOpts): Promise<CreatePaymentResult>
  /**
   * PUSH model (e.g. Transaction Junction): validate + parse an incoming
   * webhook/callback into a normalised result. Optional — return-redirect
   * gateways implement verifyReturn() instead.
   */
  parseWebhook?(req: Request, rawBody: string): Promise<WebhookResult>
  /**
   * PULL model (e.g. FNB): the gateway redirects the buyer's browser back to
   * our return URL, then we confirm the outcome with a server-side validate
   * call. The buyer's redirect is never trusted on its own — this method is the
   * source of truth. Receives the inbound GET request (with txnToken in query).
   */
  verifyReturn?(req: Request): Promise<WebhookResult>
}
