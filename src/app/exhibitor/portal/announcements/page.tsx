import { listAnnouncements } from '@/lib/announcements'
import { LogoMark } from '@/components/logo'
import { Megaphone, Pin } from 'lucide-react'

export const dynamic = 'force-dynamic'

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 604800) return `${Math.floor(s / 86400)}d`
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })
}

export default async function AnnouncementsPage() {
  const items = await listAnnouncements()

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Announcements</p>
        <h1 className="font-serif text-3xl text-neutral-900 mt-1">Festival feed</h1>
        <p className="text-neutral-500 text-sm mt-1">Updates from the organisers, newest first.</p>
      </div>

      {items.length === 0 ? (
        <div className="bg-white border border-neutral-200 rounded-2xl p-10 text-center">
          <Megaphone className="w-10 h-10 text-neutral-300 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">No posts yet. Festival updates will appear in your feed.</p>
        </div>
      ) : (
        <div className="relative">
          {items.map((a, i) => (
            <div key={a.id} className="flex gap-3.5 relative pb-5">
              {/* timeline connector */}
              {i < items.length - 1 && <div className="absolute left-[19px] top-11 bottom-0 w-px bg-neutral-200" />}
              {/* avatar */}
              <div className="w-10 h-10 rounded-full bg-white border border-neutral-200 overflow-hidden flex items-center justify-center shrink-0 z-10 ring-4 ring-[#fbfafa]">
                <LogoMark size="sm" />
              </div>
              {/* post */}
              <div className={`flex-1 bg-white border rounded-2xl p-4 ${a.pinned ? 'border-[#cd2653]/30' : 'border-neutral-200'}`}>
                <div className="flex items-center gap-1.5 text-sm flex-wrap">
                  <span className="font-semibold text-neutral-900">Young at Heart</span>
                  <span className="text-neutral-400">· Organisers · {timeAgo(a.created_at)}</span>
                  {a.pinned && <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#cd2653] ml-auto"><Pin className="w-3 h-3" /> Pinned</span>}
                </div>
                <p className="font-semibold text-neutral-900 mt-1.5">{a.title}</p>
                <p className="text-sm text-neutral-600 mt-1 whitespace-pre-wrap leading-relaxed">{a.body}</p>
                <p className="text-xs text-neutral-400 mt-3">{new Date(a.created_at).toLocaleString('en-ZA', { weekday: 'short', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
