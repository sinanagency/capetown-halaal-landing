import { listAnnouncements } from '@/lib/announcements'
import { Megaphone, Pin } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function AnnouncementsPage() {
  const items = await listAnnouncements()

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Announcements</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">From the organisers</h1>
        <p className="text-neutral-500 text-sm mt-1">Important updates for all exhibitors land here.</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center">
          <Megaphone className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">No announcements yet. Check back here for festival updates.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((a) => (
            <div key={a.id} className={`bg-white border rounded-2xl p-5 ${a.pinned ? 'border-[#cd2653]/40' : 'border-neutral-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-neutral-900">{a.title}</h2>
                {a.pinned && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#cd2653] shrink-0"><Pin className="w-3 h-3" /> Pinned</span>}
              </div>
              <p className="text-sm text-neutral-600 mt-2 whitespace-pre-wrap">{a.body}</p>
              <p className="text-xs text-neutral-400 mt-3">{new Date(a.created_at).toLocaleString('en-ZA', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
