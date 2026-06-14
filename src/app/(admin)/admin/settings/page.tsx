import Link from 'next/link'
import { Activity, Users, History, HeartPulse, ChevronRight } from 'lucide-react'

export const dynamic = 'force-dynamic'

type Card = {
  href: string
  title: string
  description: string
  Icon: typeof Activity
}

const CARDS: Card[] = [
  {
    href: '/admin/settings/activity',
    title: 'Activity Feed',
    description: 'Live stream of approvals, messages, documents, payments, and sends across the admin surface.',
    Icon: Activity,
  },
  {
    href: '/admin/settings/operators',
    title: 'Operators',
    description: 'Admin users with access to this portal. Roles and seat counts.',
    Icon: Users,
  },
  {
    href: '/admin/settings/audit',
    title: 'Audit Log',
    description: 'Most recent application events recorded in vendor_application_events.',
    Icon: History,
  },
  {
    href: '/admin/settings/comms-health',
    title: 'Comms Health',
    description: 'Status of WhatsApp, Email, and DGX channels at a glance.',
    Icon: HeartPulse,
  },
]

export default function SettingsHubPage() {
  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-neutral-900">Settings</h1>
        <p className="text-sm text-neutral-500 mt-1">
          System surfaces: activity, operators, audit, and channel health.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {CARDS.map(({ href, title, description, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group block p-5 bg-white border border-neutral-200 rounded-xl hover:border-[#cd2653]/40 hover:shadow-sm transition-all"
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2.5 rounded-lg bg-[#cd2653]/10 text-[#cd2653]">
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold text-neutral-900">{title}</h2>
                  <ChevronRight className="w-4 h-4 text-neutral-400 group-hover:text-[#cd2653] transition-colors" />
                </div>
                <p className="text-sm text-neutral-500 mt-1 leading-relaxed">
                  {description}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
