import { Info } from 'lucide-react'
import StandView from '@/components/exhibitor/StandView'
import { requirePaid } from '@/lib/exhibitor-paygate'

export const dynamic = 'force-dynamic'

export default async function MyStand() {
  await requirePaid()
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">My Stand</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Where you are on the map</h1>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#cd2653]/20 bg-[#cd2653]/5 p-4">
        <Info className="w-5 h-5 text-[#cd2653] mt-0.5 shrink-0" />
        <p className="text-sm text-neutral-800 leading-relaxed">
          <span className="font-semibold">All outdoor food vendors and Bedouin tent vendors</span> will be allocated their position on setup day,
          not in advance. Your final position is confirmed by the organisers on site.
        </p>
      </div>

      <StandView />
    </div>
  )
}