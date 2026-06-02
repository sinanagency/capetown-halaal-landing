import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — Young at Heart Festival',
  description:
    'Return, refund and cancellation terms for Young at Heart Festival tickets and vendor / exhibitor stall fees. All transactions in South African Rand (ZAR).',
}

export default function RefundPolicyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight">
          Refund &amp; Cancellation Policy
        </h1>
        <p className="mt-3 text-sm text-neutral-500">Last updated: 2 June 2026</p>

        <div className="mt-10 space-y-8 text-neutral-700 leading-relaxed">
          <section className="space-y-3">
            <p>
              This policy explains how returns, refunds and cancellations are handled for the{' '}
              <strong>Young at Heart Festival</strong> (&ldquo;we&rdquo;, &ldquo;us&rdquo;, the
              &ldquo;Festival&rdquo;), held at Youngsfield Military Base, Cape Town, South Africa, on
              11&ndash;13 December 2026. All amounts are charged and refunded in{' '}
              <strong>South African Rand (ZAR)</strong>.
            </p>
          </section>

          <Section title="Event tickets">
            <ul className="list-disc pl-5 space-y-1">
              <li>Tickets are generally <strong>non-refundable</strong> once purchased, except as set out below or where required by South African consumer law.</li>
              <li>If the Festival is <strong>cancelled</strong> by the organisers, valid ticket holders will be refunded the ticket price to the original payment method.</li>
              <li>If the Festival is <strong>postponed</strong>, tickets remain valid for the rescheduled dates. If you cannot attend the new dates, contact us to discuss a refund.</li>
              <li>Tickets may be transferred to another person at no charge — contact us with the new attendee&rsquo;s details before the event.</li>
            </ul>
          </Section>

          <Section title="Vendor & exhibitor stall fees">
            <p>
              Stall (booth) fees are paid by approved vendors and exhibitors through the exhibitor
              portal. Unless your signed vendor agreement states otherwise, the following applies:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>A cancellation requested <strong>more than 60 days</strong> before the event is refunded in full, less any non-recoverable transaction fees.</li>
              <li>A cancellation requested <strong>30&ndash;60 days</strong> before the event is refunded at 50%.</li>
              <li>A cancellation requested <strong>fewer than 30 days</strong> before the event is non-refundable, as the stall has been reserved and committed on your behalf.</li>
              <li>Stall allocations are non-transferable to another business without organiser approval.</li>
            </ul>
          </Section>

          <Section title="How to request a refund">
            <p>
              Email <a className="text-[#cd2653] underline" href="mailto:support@youngatheart.co.za">support@youngatheart.co.za</a>{' '}
              or call <a className="text-[#cd2653] underline" href="tel:+27659435012">+27&nbsp;65&nbsp;943&nbsp;5012</a> with your
              order or payment reference. Approved card refunds are returned to the original card via our
              acquiring bank (FNB) and typically reflect within <strong>5&ndash;10 business days</strong>,
              depending on your bank.
            </p>
          </Section>

          <Section title="Delivery of goods & services">
            <p>
              The &ldquo;goods and services&rdquo; purchased through this website are admission to the
              Festival (tickets) and exhibitor stall space. Tickets are delivered{' '}
              <strong>electronically by email and/or WhatsApp</strong> immediately after a successful
              payment. Stall space is confirmed in the exhibitor portal once payment clears. There is no
              physical shipment.
            </p>
          </Section>

          <Section title="Currency, governing law & domicile">
            <p>
              All transactions are processed in South African Rand (ZAR). This policy and all purchases
              are governed by the laws of the <strong>Republic of South Africa</strong>, and the Festival
              is operated and domiciled in South Africa.
            </p>
          </Section>

          <Section title="Contact us">
            <p>
              Young at Heart Festival
              <br />
              Youngsfield Military Base, Wetton Road, Cape Town, South Africa
              <br />
              Email: <a className="text-[#cd2653] underline" href="mailto:support@youngatheart.co.za">support@youngatheart.co.za</a>
              <br />
              Phone: <a className="text-[#cd2653] underline" href="tel:+27659435012">+27&nbsp;65&nbsp;943&nbsp;5012</a>
            </p>
          </Section>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold text-neutral-900">{title}</h2>
      {children}
    </section>
  )
}
