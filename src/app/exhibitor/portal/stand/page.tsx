import StandView from '@/components/exhibitor/StandView'

export const dynamic = 'force-dynamic'

export default async function MyStand() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">My Stand</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Where you are on the map</h1>
      </div>
      <StandView />
    </div>
  )
}
