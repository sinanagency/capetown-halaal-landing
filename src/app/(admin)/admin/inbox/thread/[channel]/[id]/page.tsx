import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ThreadView } from '@/components/admin/ThreadView'

export const dynamic = 'force-dynamic'

type Params = Promise<{ channel: string; id: string }>

export default async function StandaloneThreadPage({ params }: { params: Params }) {
  const { channel, id } = await params
  if (channel !== 'wa' && channel !== 'mail') {
    return (
      <div className="p-8 text-sm text-red-600">
        Invalid channel: {channel}. Expected &quot;wa&quot; or &quot;mail&quot;.
      </div>
    )
  }
  // `id` here is the thread_key (phone for wa, message-id or address for mail).
  // The thread API resolves channel + key -> thread row.
  const decoded = decodeURIComponent(id)

  return (
    <div className="flex flex-col h-screen bg-white">
      <header className="px-6 py-3 border-b border-neutral-200 flex items-center gap-3">
        <Link
          href="/admin/inbox"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 hover:text-neutral-900"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to inbox
        </Link>
        <span className="text-xs text-neutral-400">·</span>
        <span className="text-xs text-neutral-500">
          Standalone thread view
        </span>
      </header>
      <ThreadView channel={channel} threadKey={decoded} />
    </div>
  )
}
