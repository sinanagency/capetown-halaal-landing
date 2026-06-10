import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Terms & Conditions, Young at Heart Festival',
  description:
    'Terms and conditions for buying tickets, paying vendor stall fees, and using the Young at Heart Festival website. Operated in South Africa, transactions in ZAR.',
}

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight">
          Terms &amp; Conditions
        </h1>
        <p className="mt-3 text-sm text-neutral-500">Last updated: 2 June 2026</p>

        <div className="mt-10 space-y-8 text-neutral-700 leading-relaxed">
          <section className="space-y-3">
            <p>
              These Terms govern your use of the <strong>Young at Heart Festival</strong> website and any
              purchase of tickets or vendor stall space made through it. By using this website or making a
              payment, you agree to these Terms.
            </p>
          </section>

          <Section title="Who we are">
            <p>
              The Young at Heart Festival is a lifestyle festival held at Youngsfield Military Base, Wetton
              Road, Cape Town, South Africa, on 11&ndash;13 December 2026. The Festival is operated and
              domiciled in the <strong>Republic of South Africa</strong>.
            </p>
          </Section>

          <Section title="What you can buy">
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Tickets</strong>, admission to the Festival for the dates and ticket type purchased.</li>
              <li><strong>Vendor / exhibitor stall fees</strong>, reserved stall space for approved vendors, paid through the exhibitor portal.</li>
            </ul>
            <p>
              A full description of each item, including price, is shown before you confirm payment.
            </p>
          </Section>

          <Section title="Prices & payment">
            <p>
              All prices are quoted and charged in <strong>South African Rand (ZAR)</strong>. Card payments
              are processed securely by our acquiring bank, <strong>First National Bank (FNB)</strong>, on
              their hosted, 3D-Secure payment page. We never see or store your full card number. Your
              purchase is only complete once payment is approved by the bank.
            </p>
          </Section>

          <Section title="Refunds & cancellations">
            <p>
              Returns, refunds and cancellations are covered by our{' '}
              <a className="text-[#cd2653] underline" href="/refund-policy">Refund &amp; Cancellation Policy</a>.
            </p>
          </Section>

          <Section title="Vendor fees & event cancellation">
            <p>
              Vendor stall fees are <strong>non-refundable</strong> once a booking is confirmed and paid.
              This includes the stall fee, electrical add-ons, and any furniture hire.
            </p>
            <p>
              In the unlikely event that the Festival is cancelled, postponed, or materially changed due to
              circumstances beyond the organisers&rsquo; reasonable control (including but not limited to
              extreme weather, public health directives, force majeure events, or venue unavailability),
              <strong> there is no guarantee that vendor fees will be refunded.</strong> The organisers may, at their sole discretion,
              offer a partial refund, a credit toward a future event, or no refund at all, depending on
              the costs already committed at the time of cancellation. By paying your stall fee you accept
              this risk.
            </p>
          </Section>

          <Section title="Your responsibilities">
            <ul className="list-disc pl-5 space-y-1">
              <li>Give accurate contact and payment information.</li>
              <li>Comply with the venue rules, security screening, and any vendor guidelines provided.</li>
              <li>Not resell tickets above face value or use the website for unlawful purposes.</li>
            </ul>
          </Section>

          <Section title="Privacy">
            <p>
              How we handle your personal information is described in our{' '}
              <a className="text-[#cd2653] underline" href="/privacy">Privacy Policy</a>.
            </p>
          </Section>

          <Section title="Liability">
            <p>
              We take reasonable care to run the Festival safely and to keep this website accurate and
              available. To the extent permitted by South African law, we are not liable for indirect or
              consequential loss. Nothing in these Terms limits rights you have under the Consumer
              Protection Act.
            </p>
          </Section>

          <Section title="Vendor communications &amp; WhatsApp consent">
            <p>
              When a vendor application is <strong>approved</strong> for Young at Heart Festival 2026, the applicant
              consents to receive event-related communications from us by <strong>email and WhatsApp</strong> for
              the duration of this specific event cycle. This includes (but is not limited to):
              payment reminders, invoice receipts, stall allocation updates, load-in instructions,
              health &amp; safety notices, schedule changes, and replies to support questions sent
              through the vendor portal.
            </p>
            <p>
              The scope of consent is <strong>strictly this event</strong>. We do not message vendors about future
              festivals, third-party offers, or marketing unrelated to YAH Festival 2026 unless the
              vendor separately opts in via the dedicated WhatsApp opt-in banner in the portal.
              Vendors may reply <strong>STOP</strong> at any time on WhatsApp to unsubscribe immediately, with no
              effect on their existing stall booking.
            </p>
          </Section>

          <Section title="Governing law">
            <p>
              These Terms are governed by the laws of the <strong>Republic of South Africa</strong> and any
              dispute is subject to the jurisdiction of the South African courts.
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
