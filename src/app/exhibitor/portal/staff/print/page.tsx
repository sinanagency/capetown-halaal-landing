import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { parseAllocation } from '@/lib/stalls'
import { requirePaid } from '@/lib/exhibitor-paygate'
import PrintBadgesClient from './PrintBadgesClient'

export const dynamic = 'force-dynamic'

// Server-rendered "Print all badges" sheet, 4-per-A4. Each badge embeds the
// signed QR served by FooEvents (we fetch the ticket image URL — never mint a
// QR client-side, per Law 3). The client component opens the print dialog on
// mount once images have loaded.
export default async function PrintBadgesPage() {
  await requirePaid()
  const ctx = await getExhibitorContext()
  const notes = (ctx?.application?.admin_notes as string) || ''
  const state = parsePortalState(notes)
  const stall = parseAllocation(notes).stall
  const businessName = (ctx?.application?.business_name as string) || 'Your stall'

  const staff = state.staff || []

  return <PrintBadgesClient staff={staff} stall={stall} businessName={businessName} />
}
