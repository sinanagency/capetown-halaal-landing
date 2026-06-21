import { Info, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import StandView from '@/components/exhibitor/StandView'
import { requirePaid } from '@/lib/exhibitor-paygate'
import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { parseAllocation } from '@/lib/stalls'
import PublishStallToggle from '@/components/exhibitor/PublishStallToggle'

export const dynamic = 'force-dynamic'

export default async function MyStand() {
  await requirePaid()
  const ctx = await getExhibitorContext()
  const app = ctx?.application ?? null
  const notes = (app?.admin_notes as string) || ''
  const state = parsePortalState(notes)
  const hasStall = Boolean(parseAllocation(notes).stall)
  const initialPublish = Boolean(state.profile?.publish_stall)

  return (
    <div className="bg-[#FAFAF8] -mx-4 sm:-mx-6 px-4 sm:px-6 py-6">
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

        <div className={hasStall ? 'min-h-[600px]' : ''}>
          <StandView />
        </div>

        <PublishStallToggle initialPublish={initialPublish} hasStall={hasStall} />

        <div className="flex justify-center pt-2">
          <Link
            href="/exhibitor/portal/stand/change"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-[#cd2653] hover:text-[#b01f45] transition-colors"
          >
            Request a stall change <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  )
}
