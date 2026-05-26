import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import SupportThread from '@/components/exhibitor/SupportThread'
import { Mail } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function SupportPage() {
  const ctx = await getExhibitorContext()
  const state = parsePortalState(ctx?.application?.admin_notes as string)

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Support</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Talk to the organisers</h1>
        <p className="text-neutral-500 text-sm mt-1">Messages are tracked here. We reply in this thread and by email.</p>
      </div>
      <SupportThread initial={state.support || []} />
      <p className="text-xs text-neutral-400 flex items-center gap-1.5 justify-center"><Mail className="w-3 h-3" /> Urgent? Email support@youngatheart.co.za</p>
    </div>
  )
}
