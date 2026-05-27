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
  /** Validate + parse an incoming webhook/callback into a normalised result. */
  parseWebhook(req: Request, rawBody: string): Promise<WebhookResult>
}
