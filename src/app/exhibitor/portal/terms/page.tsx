// Vendor terms & conditions acceptance page.
//
// Deliberately does NOT call requirePaid() — T&C acceptance is a pre-payment
// step. Vendor reads the terms, ticks, clicks Accept. Once accepted, the
// overview checklist marks the step done and the payment page unlocks the
// Pay button (handled separately on /payments).

import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import AcceptTermsForm from '@/components/exhibitor/AcceptTermsForm'
import { CheckCircle2 } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AcceptTermsPage() {
  const ctx = await getExhibitorContext()
  const app = ctx?.application ?? null
  const notes = (app?.admin_notes as string) || ''
  const state = parsePortalState(notes)
  const accepted = !!state.terms_accepted_at

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Vendor agreement</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Terms &amp; conditions</h1>
        <p className="text-sm text-neutral-500 mt-2">
          As a confirmed vendor at the Young at Heart Festival 2026, you are asked to read and explicitly
          accept the terms below. This acceptance is recorded against your portal account and protects
          both the festival and the vendor in the event of a dispute.
        </p>
      </div>

      {accepted && (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-sm">
            <p className="font-semibold text-emerald-900">You have accepted these terms.</p>
            <p className="text-emerald-700 mt-0.5">
              Accepted on{' '}
              {new Date(state.terms_accepted_at as string).toLocaleString('en-GB', {
                day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
              })}.
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-6 md:p-8 space-y-6 leading-relaxed text-sm text-neutral-700">
        <Section title="1. Stall allocation">
          <p>
            Stall positions are allocated by the festival organisers. Vendors do not select their own
            booth. Final placement, including outdoor food vendors and Bedouin tent vendors, is
            confirmed by the organisers on setup day.
          </p>
        </Section>

        <Section title="2. Vendor fees are non-refundable">
          <p>
            Once your stall fee is paid the booking is confirmed and your fee is{' '}
            <strong>non-refundable</strong>. This includes the stall fee, any electrical add-ons, and
            any furniture hire.
          </p>
        </Section>

        <Section title="3. Event cancellation, postponement, force majeure">
          <p>
            If the festival is cancelled, postponed, or materially changed due to circumstances beyond
            the organisers&rsquo; reasonable control, including extreme weather, public health
            directives, force majeure events, or venue unavailability,{' '}
            <strong>there is no guarantee that vendor fees will be refunded.</strong> The organisers
            may, at their sole discretion, offer a partial refund, a credit toward a future event, or
            no refund at all. By paying your stall fee you accept this risk.
          </p>
        </Section>

        <Section title="4. Compliance documents">
          <p>
            Food stalls must provide a valid halaal certificate (COA). All vendors are responsible for
            their own public liability cover and any health, trade or licensing permits required by
            the City of Cape Town. Failure to provide compliance documents on request may result in
            forfeit of the stall on event day, with no refund.
          </p>
        </Section>

        <Section title="5. Gate access and staff">
          <p>
            Your gate-pass allowance is set by the organisers based on your stall package. Pass-holders
            are listed by name and phone number on the Youngsfield gate manifest. Additional people on
            site beyond your allowance must purchase tickets.
          </p>
        </Section>

        <Section title="6. Communications">
          <p>
            Approval as a vendor constitutes consent to event communications by email and WhatsApp for
            the duration of this event cycle. You may reply STOP on WhatsApp at any time to
            unsubscribe.
          </p>
        </Section>

        <Section title="7. Full terms">
          <p>
            These vendor-specific points sit alongside our full public{' '}
            <a className="text-[#cd2653] underline" href="/terms" target="_blank" rel="noreferrer">
              Terms &amp; Conditions
            </a>
            . By accepting below you confirm you have read both and accept them in full.
          </p>
        </Section>
      </div>

      <AcceptTermsForm alreadyAccepted={accepted} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="font-serif text-lg text-neutral-900">{title}</h2>
      {children}
    </section>
  )
}
