import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { ActivityFeed } from '@/components/admin/ActivityFeed'

export const dynamic = 'force-dynamic'

export default function SettingsActivityPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 mb-4"
      >
        <ArrowLeft className="w-3 h-3" /> Back to Settings
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Activity Feed</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Live stream of approvals, messages, documents, payments, and sends.
        </p>
      </header>
      <ActivityFeed />
    </div>
  )
}
