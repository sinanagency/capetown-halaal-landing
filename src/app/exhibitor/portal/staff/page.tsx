import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { parseAllocation } from '@/lib/stalls'
import StaffManager from '@/components/exhibitor/StaffManager'

export const dynamic = 'force-dynamic'

// Policy 2026-06-08 (Samreen): the gate-access list is hard-capped at 3 cars
// per vendor regardless of stall size. Vendor bands for people are placed on
// the table at setup and swapped freely — the per-person registration is
// kept here only as the gate-access manifest, not a passes count.
const GATE_ACCESS_CAP = 3

export default async function StaffPage() {
  const ctx = await getExhibitorContext()
  const notes = (ctx?.application?.admin_notes as string) || ''
  const state = parsePortalState(notes)
  const stall = parseAllocation(notes).stall
  const businessName = (ctx?.application?.business_name as string) || 'Your stall'

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Gate Access</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Your gate access list</h1>
        <p className="text-neutral-500 text-sm mt-1">
          Register up to 3 cars (drivers + vehicle reg) for festival gate access. Vendor bands for
          your stall team are placed on your table at setup and can be swapped freely on the day.
        </p>
      </div>
      <StaffManager initial={state.staff || []} allowance={GATE_ACCESS_CAP} businessName={businessName} stall={stall} />
    </div>
  )
}
