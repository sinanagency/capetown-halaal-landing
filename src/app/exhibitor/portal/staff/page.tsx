import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { parseAllocation } from '@/lib/stalls'
import StaffManager from '@/components/exhibitor/StaffManager'

export const dynamic = 'force-dynamic'

const DEFAULT_ALLOWANCE = 4 // organiser-set per stall; default until Sam confirms exact numbers

export default async function StaffPage() {
  const ctx = await getExhibitorContext()
  const notes = (ctx?.application?.admin_notes as string) || ''
  const state = parsePortalState(notes)
  const allowance = typeof state.passAllowance === 'number' ? state.passAllowance : DEFAULT_ALLOWANCE
  const stall = parseAllocation(notes).stall
  const businessName = (ctx?.application?.business_name as string) || 'Your stall'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Staff & Badges</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Your team & gate access</h1>
        <p className="text-neutral-500 text-sm mt-1">Register everyone who will work your stall, then print the gate list to bring on the day.</p>
      </div>
      <StaffManager initial={state.staff || []} allowance={allowance} businessName={businessName} stall={stall} />
    </div>
  )
}
