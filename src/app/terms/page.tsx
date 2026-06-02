import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Terms & Conditions — Young at Heart Festival',
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
              <li><strong>Tickets</strong> — admission to the Festival for the dates and ticket type purchased.</li>
              <li><strong>Vendor / exhibitor stall fees</strong> — reserved stall space for approved vendors, paid through the exhibitor portal.</li>
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
