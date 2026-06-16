import Link from 'next/link'
import { Activity, Users, History, HeartPulse } from 'lucide-react'
import { PageHeader } from '@/components/chrome/PageChrome'

export const dynamic = 'force-dynamic'

const NAV_ITEMS: { href: string; label: string; icon: typeof Activity }[] = [
  { href: '/admin/settings/activity', label: 'Activity Feed', icon: Activity },
  { href: '/admin/settings/operators', label: 'Operators', icon: Users },
  { href: '/admin/settings/audit', label: 'Audit Log', icon: History },
  { href: '/admin/settings/comms-health', label: 'Comms Health', icon: HeartPulse },
]

export default function SettingsHubPage() {
  return (
    <div className="flex gap-0 p-6 md:p-8 max-w-5xl mx-auto min-h-[60vh]">
      <nav className="w-48 flex-shrink-0 space-y-1">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <item.icon className="w-4 h-4" />
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="flex-1 border-l border-neutral-200 pl-8">
        <PageHeader kicker="SETTINGS" title="Choose a section" />
        <p className="text-neutral-500 text-sm">Select a settings section from the left to manage your configuration.</p>
      </div>
    </div>
  )
}
