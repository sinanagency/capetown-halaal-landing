import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import StaffManager from '@/components/exhibitor/StaffManager'

export const dynamic = 'force-dynamic'

export default async function StaffPage() {
  const ctx = await getExhibitorContext()
  const state = parsePortalState(ctx?.application?.admin_notes as string)

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Staff & Badges</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Your team & gate access</h1>
        <p className="text-neutral-500 text-sm mt-1">Register everyone who will work your stall so they can get through the gate.</p>
      </div>
      <StaffManager initial={state.staff || []} />
    </div>
  )
}
