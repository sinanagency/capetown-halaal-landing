import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { parseAllocation } from '@/lib/stalls'
import StaffManager from '@/components/exhibitor/StaffManager'
import { requirePaid } from '@/lib/exhibitor-paygate'
import {
  PageShell, PageHeader, Card
} from '@/components/chrome/PageChrome'

export const dynamic = 'force-dynamic'

// Policy 2026-06-08 (Samreen): the gate-access list is hard-capped at 3 cars
// per vendor regardless of stall size. Vendor bands for people are placed on
// the table at setup and swapped freely, the per-person registration is
// kept here only as the gate-access manifest, not a passes count.
const GATE_ACCESS_CAP = 3

export default async function StaffPage() {
  await requirePaid()
  const ctx = await getExhibitorContext()
  const notes = (ctx?.application?.admin_notes as string) || ''
  const state = parsePortalState(notes)
  const stall = parseAllocation(notes).stall
  const businessName = (ctx?.application?.business_name as string) || 'Your stall'

  return (
    <PageShell>
      <Card className="max-w-3xl mx-auto">
        <PageHeader
          kicker="Gate Access"
          title="Your gate access list"
          subtitle="Register up to 3 cars (drivers + vehicle reg) for festival gate access. Vendor bands for your stall team are placed on your table at setup and can be swapped freely on the day."
        />
        <StaffManager initial={state.staff || []} allowance={GATE_ACCESS_CAP} businessName={businessName} stall={stall} />
      </Card>
    </PageShell>
  )
}