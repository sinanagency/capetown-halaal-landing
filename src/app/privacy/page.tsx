import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'

export const metadata: Metadata = {
  title: 'Privacy Policy — Young at Heart Festival',
  description:
    'How the Young at Heart Festival collects, uses, and protects your personal information, including WhatsApp and email communications.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-neutral-500">Last updated: 1 June 2026</p>

        <div className="mt-10 space-y-8 text-neutral-700 leading-relaxed">
          <section className="space-y-3">
            <p>
              This Privacy Policy explains how the <strong>Young at Heart Festival</strong> (&ldquo;we&rdquo;,
              &ldquo;us&rdquo;, the &ldquo;Festival&rdquo;) collects, uses, and protects your personal information when you
              buy tickets, apply to be a vendor, or communicate with us. By using our website,
              purchasing a ticket, or submitting a vendor application, you agree to this policy.
            </p>
          </section>

          <Section title="Information we collect">
            <ul className="list-disc pl-5 space-y-1">
              <li>Contact details you provide: name, email address, and phone number.</li>
              <li>Ticket purchase and vendor application details.</li>
              <li>Messages you send us via WhatsApp, email, or our website.</li>
              <li>Basic technical information (e.g. IP address) captured when you submit a form, used to record your consent.</li>
            </ul>
          </Section>

          <Section title="How we use your information">
            <ul className="list-disc pl-5 space-y-1">
              <li>To process ticket purchases and vendor applications.</li>
              <li>To send you Festival updates and communications, including ticket confirmations, event reminders, vendor logistics, payment reminders, and event news.</li>
              <li>To respond to your questions and provide customer support.</li>
              <li>To keep records of consent and comply with our legal obligations.</li>
            </ul>
          </Section>

          <Section title="WhatsApp and email communications">
            <p>
              When you buy a ticket or submit a vendor application, you agree to receive Festival
              updates and communications via <strong>WhatsApp</strong> and <strong>email</strong> at
              the contact details you provide. These messages relate to the Festival and the products
              and services you have requested.
            </p>
            <p>
              You can opt out of WhatsApp messages at any time by replying <strong>STOP</strong> to any
              message from us. Once you opt out, we will not send you further WhatsApp messages. You can
              opt back in by replying <strong>START</strong>. To stop email communications, use the
              unsubscribe link in any email or contact us at the address below.
            </p>
            <p>
              Our WhatsApp messaging is provided through the WhatsApp Business Platform and is subject to
              WhatsApp&rsquo;s own terms and privacy practices.
            </p>
          </Section>

          <Section title="Sharing your information">
            <p>
              We do not sell your personal information. We share it only with service providers who help
              us run the Festival (for example, ticketing, messaging, and email delivery providers), and
              only as needed to provide those services or where required by law.
            </p>
          </Section>

          <Section title="Data retention and security">
            <p>
              We keep your information for as long as needed to run the Festival and meet our legal and
              record-keeping obligations, then delete or anonymise it. We take reasonable measures to
              protect your information against unauthorised access, loss, or misuse.
            </p>
          </Section>

          <Section title="Your rights">
            <p>
              You may request access to, correction of, or deletion of your personal information, and you
              may withdraw consent to communications at any time. To exercise these rights, contact us
              using the details below.
            </p>
          </Section>

          <Section title="Contact us">
            <p>
              Young at Heart Festival
              <br />
              Email: <a className="text-[#cd2653] underline" href="mailto:support@youngatheart.co.za">support@youngatheart.co.za</a>
              <br />
              Web: <a className="text-[#cd2653] underline" href="https://cthalaal.co.za">cthalaal.co.za</a>
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
