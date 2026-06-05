import type { PaymentProvider } from './types'
import { yoco } from './yoco'
import { fnb } from './fnb'
// fnb.ts + transaction-junction.ts are kept as fallback providers. Yoco is the
// live one for 2026 because the WordPress ticket store already charges to the
// same Yoco merchant — booth fees land in the same wallet, settled to FNB.

// Switch by env: set PAYMENT_PROVIDER=yoco (default), =fnb, or =transaction-junction.
export function activeProvider(): PaymentProvider {
  const id = (process.env.PAYMENT_PROVIDER || 'yoco').toLowerCase()
  if (id === 'fnb') return fnb
  return yoco
}

export function paymentsEnabled(): boolean {
  return activeProvider().isConfigured()
}

// Merchant reference for reconciliation against the FNB statement.
export function paymentReference(applicationId: string): string {
  return `YAH-${applicationId.slice(0, 8).toUpperCase()}`
}

export type { CreatePaymentOpts, CreatePaymentResult, WebhookResult, PaymentProvider } from './types'
