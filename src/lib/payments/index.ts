import type { PaymentProvider } from './types'
import { transactionJunction } from './transaction-junction'

// Swap or add providers here. Booth fees go through Transaction Junction -> FNB.
export function activeProvider(): PaymentProvider {
  return transactionJunction
}

export function paymentsEnabled(): boolean {
  return activeProvider().isConfigured()
}

// Merchant reference for reconciliation against the FNB statement.
export function paymentReference(applicationId: string): string {
  return `YAH-${applicationId.slice(0, 8).toUpperCase()}`
}

export type { CreatePaymentOpts, CreatePaymentResult, WebhookResult, PaymentProvider } from './types'
