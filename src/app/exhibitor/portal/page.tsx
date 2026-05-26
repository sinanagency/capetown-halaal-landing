import { getExhibitorContext } from '@/lib/exhibitor'
import { tierLabel } from '@/lib/stalls'
import { Calendar, MapPin, CheckCircle2, Circle, Clock, ArrowRight, CreditCard } from 'lucide-react'

export const dynamic = 'force-dynamic'

const STAGES = ['approved', 'invoiced', 'paid', 'docs', 'show_ready'] as const
const STAGE_LABEL: Record<string, string> = {
  approved: 'Approved', invoiced: 'Invoiced', paid: 'Paid', docs: 'Documents', show_ready: 'Show-ready',
}

function deriveStage(app: Record<string, unknown> | null): string {
  if (!app) return 'approved'
  if (app.portal_stage) return app.portal_stage as string
  if (app.payment_status === 'paid') return 'paid'
  if (app.payment_status === 'deferred' || app.payment_status === 'pending') return 'invoiced'
  return 'approved'
}

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / 86400000))
}

export default async function Overview() {
  const ctx = await getExhibitorContext()
  const app = ctx?.application ?? null
  const business = (app?.business_name as string) || 'Exhibitor'
  const stage = deriveStage(app)
  const stageIdx = STAGES.indexOf(stage as typeof STAGES[number])
  const tier = tierLabel(app?.preferred_booth_tier as string | undefined)
  const dDay = daysUntil('2026-12-11')
  const paymentDue = (app?.payment_due_date as string) || '1 September 2026'
  const isPaid = app?.payment_status === 'paid'

  const actions = [
    { done: true, label: 'Application approved', sub: 'Welcome to the festival' },
    { done: true, label: 'Portal access set up', sub: 'Password created' },
    { done: isPaid, label: 'Pay your stall fee', sub: isPaid ? 'Received, thank you' : `Due ${paymentDue}` },
    { done: false, label: 'Upload halaal certificate', sub: 'Required before show day' },
    { done: false, label: 'Add your staff for gate passes', sub: 'Names, ID, vehicle' },
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* hero */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Exhibitor portal</p>
          <h1 className="font-serif text-3xl sm:text-4xl text-neutral-900 mt-1">{business}</h1>
          <p className="text-neutral-500 text-sm mt-1">{tier} · application {String(app?.status ?? 'pending')}</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-neutral-900">{dDay}</p>
          <p className="text-xs text-neutral-500">days to opening</p>
        </div>
      </div>

      {/* status pipeline */}
      <div className="bg-white border border-neutral-200 rounded-2xl p-6">
        <p className="font-semibold text-neutral-900 mb-5">Your status</p>
        <div className="flex items-center">
          {STAGES.map((s, i) => {
            const done = i < stageIdx, current = i === stageIdx
            return (
              <div key={s} className="flex-1 flex items-center last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold
                    ${done ? 'bg-[#cd2653] text-white' : current ? 'bg-[#cd2653]/10 text-[#cd2653] ring-2 ring-[#cd2653]' : 'bg-neutral-100 text-neutral-400'}`}>
                    {done ? <CheckCircle2 className="w-5 h-5" /> : i + 1}
                  </div>
                  <span className={`text-[11px] font-medium ${current ? 'text-[#cd2653]' : 'text-neutral-500'}`}>{STAGE_LABEL[s]}</span>
                </div>
                {i < STAGES.length - 1 && <div className={`flex-1 h-0.5 mx-1 mb-5 ${done ? 'bg-[#cd2653]' : 'bg-neutral-200'}`} />}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-5 gap-6">
        {/* outstanding actions */}
        <div className="md:col-span-3 bg-white border border-neutral-200 rounded-2xl p-6">
          <p className="font-semibold text-neutral-900 mb-4">What to do next</p>
          <ul className="space-y-3">
            {actions.map((a) => (
              <li key={a.label} className="flex items-start gap-3">
                {a.done
                  ? <CheckCircle2 className="w-5 h-5 text-[#cd2653] mt-0.5 shrink-0" />
                  : <Circle className="w-5 h-5 text-neutral-300 mt-0.5 shrink-0" />}
                <div>
                  <p className={`text-sm font-medium ${a.done ? 'text-neutral-400 line-through' : 'text-neutral-900'}`}>{a.label}</p>
                  <p className="text-xs text-neutral-500">{a.sub}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* key info */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-[#1a1416] text-white rounded-2xl p-6">
            <div className="flex items-center gap-2 text-[#ff7a9c] mb-3"><CreditCard className="w-4 h-4" /><span className="text-xs uppercase tracking-wide font-semibold">Stall fee</span></div>
            <p className="text-2xl font-bold">{isPaid ? 'Paid' : 'Due'}</p>
            <p className="text-white/60 text-sm mt-1">{isPaid ? 'Thank you' : paymentDue}</p>
            <a href="/exhibitor/portal/stand" className="inline-flex items-center gap-1 text-sm font-semibold text-[#ff7a9c] mt-4">See your stand <ArrowRight className="w-4 h-4" /></a>
          </div>
          <div className="bg-white border border-neutral-200 rounded-2xl p-6 space-y-3 text-sm">
            <div className="flex items-start gap-3"><Calendar className="w-4 h-4 text-[#cd2653] mt-0.5" /><div><p className="font-medium text-neutral-900">11–13 December 2026</p><p className="text-neutral-500 text-xs">3-day festival</p></div></div>
            <div className="flex items-start gap-3"><MapPin className="w-4 h-4 text-[#cd2653] mt-0.5" /><div><p className="font-medium text-neutral-900">Youngsfield Military Base</p><p className="text-neutral-500 text-xs">Cape Town</p></div></div>
            <div className="flex items-start gap-3"><Clock className="w-4 h-4 text-[#cd2653] mt-0.5" /><div><p className="font-medium text-neutral-900">support@youngatheart.co.za</p><p className="text-neutral-500 text-xs">Questions about your booking</p></div></div>
          </div>
        </div>
      </div>
    </div>
  )
}
