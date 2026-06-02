import type { PaymentProvider } from './types'
import { fnb } from './fnb'
// transaction-junction.ts is kept as an alternative provider (unused while FNB is active).

// Swap or add providers here. Booth fees go direct through the FNB eCommerce API
// (FNB is both gateway and acquirer). Until FNB_API_KEY is set, isConfigured() is
// false, so the portal stays EFT-only with no fake card button.
export function activeProvider(): PaymentProvider {
  return fnb
}

export function paymentsEnabled(): boolean {
  return activeProvider().isConfigured()
}

// Merchant reference for reconciliation against the FNB statement.
export function paymentReference(applicationId: string): string {
  return `YAH-${applicationId.slice(0, 8).toUpperCase()}`
}

export type { CreatePaymentOpts, CreatePaymentResult, WebhookResult, PaymentProvider } from './types'
