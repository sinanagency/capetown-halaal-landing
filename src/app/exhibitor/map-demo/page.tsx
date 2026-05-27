import MapVersions from '@/components/exhibitor/MapVersions'

export const dynamic = 'force-dynamic'

// Public, no-login demo of the 3 site-plan versions (for the design exercise).
// ?v=pin|interactive|guided picks the version; defaults to the demo stall FS1.
export default async function MapDemo({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams
  const initial = (['pin', 'interactive', 'guided'].includes(v || '') ? v : 'pin') as 'pin' | 'interactive' | 'guided'

  return (
    <div className="min-h-screen bg-[#fbfafa]">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Site plan · demo</p>
          <h1 className="font-serif text-3xl text-neutral-900 mt-1">Festival floor plan, 3 ways</h1>
          <p className="text-neutral-500 text-sm mt-1">The real organiser site plan, rendered identically. Demo stall: FS1.</p>
        </div>
        <MapVersions mineCode="FS1" initial={initial} />
      </div>
    </div>
  )
}
