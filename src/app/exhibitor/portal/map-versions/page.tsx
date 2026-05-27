import { getExhibitorContext } from '@/lib/exhibitor'
import { parseAllocation } from '@/lib/stalls'
import MapVersions from '@/components/exhibitor/MapVersions'

export const dynamic = 'force-dynamic'

export default async function MapVersionsPage() {
  const ctx = await getExhibitorContext()
  const mine = parseAllocation((ctx?.application?.admin_notes as string) || '').stall

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Site plan · pick a version</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Festival floor plan, 3 ways</h1>
        <p className="text-neutral-500 text-sm mt-1">All three render the real organiser site plan identically. They differ only in how you interact with it.</p>
      </div>
      <MapVersions mineCode={mine} />
    </div>
  )
}
