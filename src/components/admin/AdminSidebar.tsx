'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FileText, Ticket, LogOut, ExternalLink, Globe, BarChart3, UserX, LayoutGrid, Megaphone, Inbox, Users, MessageSquare } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Ticket Sales', href: '/admin/tickets', icon: Ticket },
  { name: 'Applications', href: '/admin/applications', icon: FileText },
  { name: 'Contacts', href: '/admin/contacts', icon: Users },
  { name: 'Vendor Ops', href: '/admin/vendor-ops', icon: LayoutGrid },
  { name: 'Vendor Inbox', href: '/admin/support', icon: MessageSquare },
  { name: 'Broadcast', href: '/admin/broadcast', icon: Megaphone },
  { name: 'Bot Inbox', href: '/admin/bot-inbox', icon: Inbox },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Follow Up', href: '/admin/follow-up', icon: UserX },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  return (
    <aside className="w-64 bg-white border-r border-neutral-200 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-neutral-200">
        <h1 className="text-lg font-bold text-neutral-900">
          Young at Heart
        </h1>
        <p className="text-xs text-neutral-500 mt-0.5">Admin Portal</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#cd2653] text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              )}
            >
              <item.icon className="w-4.5 h-4.5" />
              {item.name}
            </Link>
          )
        })}

        <div className="pt-4 mt-4 border-t border-neutral-100">
          <p className="px-4 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">External</p>
          <a
            href="https://tickets.youngatheart.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <ExternalLink className="w-4.5 h-4.5" />
            Ticket Store
          </a>
          <a
            href="https://cthalaal.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <ExternalLink className="w-4.5 h-4.5" />
            Main Website
          </a>
        </div>
      </nav>

      {/* Back to Site */}
      <div className="px-3 pb-2">
        <a
          href="https://cthalaal.co.za"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-white bg-[#cd2653] hover:bg-[#b01f45] w-full transition-colors"
        >
          <Globe className="w-4.5 h-4.5" />
          View Live Site
        </a>
      </div>

      {/* Logout */}
      <div className="p-3 border-t border-neutral-200">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 w-full transition-colors"
        >
          <LogOut className="w-4.5 h-4.5" />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
