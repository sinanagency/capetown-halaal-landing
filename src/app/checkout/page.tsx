import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Booth checkout · Cape Town Halaal Festival',
  description: 'Booth payments are handled in the exhibitor portal after your application is approved.',
  robots: { index: false, follow: false },
}

export const dynamic = 'force-dynamic'

// The old /checkout page was a UI-only simulation that shipped with a
// hardcoded Stripe test card (4242...) and a fake bank account number.
// Real booth payments flow through the exhibitor portal (Yoco card or
// FNB EFT proof upload) AFTER an application is approved, per CTH-DOCTRINE
// Law 3 (no fork of FooEvents) and the actual payment plumbing in
// src/app/exhibitor/portal/payments. This page now points operators to the
// right surface instead of pretending to take card details.
export default function CheckoutPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#fafaf7',
        color: '#1a1a1a',
        padding: '2rem',
        fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div style={{ maxWidth: 560, width: '100%', textAlign: 'center' }}>
        <h1
          style={{
            fontFamily: '"Fraunces", Georgia, serif',
            fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
            lineHeight: 1.15,
            fontWeight: 400,
            margin: '0 0 1rem',
          }}
        >
          Booth payments live in the exhibitor portal.
        </h1>

        <p style={{ fontSize: '1rem', lineHeight: 1.6, color: '#4a4a4a', margin: '0 auto 2rem', maxWidth: 460 }}>
          Once your vendor application is approved you receive a login to the
          exhibitor portal. Card payments (Yoco) and EFT proof uploads happen
          there, safely against your own approved record.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' }}>
          <Link
            href="/apply"
            style={{
              display: 'inline-block',
              padding: '0.85rem 1.75rem',
              background: '#cd2653',
              color: '#ffffff',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            Apply as a vendor
          </Link>

          <Link
            href="/exhibitor/login"
            style={{
              display: 'inline-block',
              padding: '0.6rem 1.4rem',
              background: 'transparent',
              color: '#1a1a1a',
              border: '1px solid #d4d4d0',
              borderRadius: 8,
              textDecoration: 'none',
              fontWeight: 500,
              fontSize: '0.9rem',
            }}
          >
            Already approved? Sign in to the portal
          </Link>

          <Link
            href="https://tickets.youngatheart.co.za"
            style={{ fontSize: '0.875rem', color: '#6a6a6a', textDecoration: 'none', marginTop: '0.5rem' }}
          >
            Looking for festival tickets? Buy at tickets.youngatheart.co.za
          </Link>
        </div>
      </div>
    </main>
  )
}
