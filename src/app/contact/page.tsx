import type { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { MapPin, Mail, Phone, Clock } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Contact Us | Young at Heart Festival',
  description:
    'Customer service contact details for the Young at Heart Festival: physical address, email and phone. Youngsfield Military Base, Cape Town, South Africa.',
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <main className="mx-auto max-w-3xl px-6 py-16 md:py-24">
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 tracking-tight">Contact Us</h1>
        <p className="mt-3 text-neutral-600">
          We&rsquo;re here to help with tickets, vendor applications, stall fees, and anything else about
          the Festival.
        </p>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <Card icon={MapPin} title="Address">
            Young at Heart Festival
            <br />
            Youngsfield Military Base
            <br />
            Wetton Road, Cape Town
            <br />
            South Africa
          </Card>
          <Card icon={Mail} title="Email">
            <a className="text-[#cd2653] underline" href="mailto:support@youngatheart.co.za">
              support@youngatheart.co.za
            </a>
          </Card>
          <Card icon={Phone} title="Phone">
            <a className="text-[#cd2653] underline" href="tel:+27659435012">
              +27&nbsp;65&nbsp;943&nbsp;5012
            </a>
          </Card>
          <Card icon={Clock} title="Festival dates">
            11&ndash;13 December 2026
          </Card>
        </div>

        <p className="mt-10 text-sm text-neutral-500 leading-relaxed">
          The Young at Heart Festival is operated and domiciled in the Republic of South Africa. All
          payments are processed in South African Rand (ZAR). See our{' '}
          <a className="text-[#cd2653] underline" href="/terms">Terms &amp; Conditions</a>,{' '}
          <a className="text-[#cd2653] underline" href="/refund-policy">Refund &amp; Cancellation Policy</a>{' '}
          and <a className="text-[#cd2653] underline" href="/privacy">Privacy Policy</a>.
        </p>
      </main>
    </div>
  )
}

function Card({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof MapPin
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 p-5">
      <div className="flex items-center gap-2 text-[#cd2653]">
        <Icon className="w-4 h-4" />
        <span className="text-xs uppercase tracking-[0.15em] font-semibold">{title}</span>
      </div>
      <div className="mt-2 text-neutral-700 leading-relaxed">{children}</div>
    </div>
  )
}
