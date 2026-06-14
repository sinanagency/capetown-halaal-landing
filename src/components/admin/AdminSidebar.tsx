'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FileText, Ticket, LogOut, ExternalLink, Globe, BarChart3, UserX, ShieldCheck, Shield, Eye, Menu, X, Inbox, Megaphone, Users, Mail } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AdminRole } from '@/lib/admin-rbac'

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Ticket Sales', href: '/admin/tickets', icon: Ticket },
  { name: 'Applications', href: '/admin/applications', icon: FileText },
  { name: 'Vendors', href: '/admin/vendors', icon: Users },
  { name: 'Inbox', href: '/admin/bot-inbox', icon: Inbox },
  { name: 'Support Inbox', href: '/admin/support-inbox', icon: Mail },
  { name: 'Broadcast', href: '/admin/broadcast', icon: Megaphone },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { name: 'Follow Up', href: '/admin/follow-up', icon: UserX },
]

interface AdminSidebarProps {
  role: AdminRole
  email: string | null
}

const ROLE_BADGE_STYLE: Record<AdminRole, { label: string; cls: string; Icon: typeof Shield }> = {
  owner:    { label: 'Owner',    cls: 'bg-[#cd2653]/10 text-[#cd2653] border-[#cd2653]/30', Icon: ShieldCheck },
  operator: { label: 'Operator', cls: 'bg-blue-50 text-blue-700 border-blue-200',          Icon: Shield },
  viewer:   { label: 'Viewer',   cls: 'bg-neutral-100 text-neutral-600 border-neutral-200', Icon: Eye },
}

export function AdminSidebar({ role, email }: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const badge = ROLE_BADGE_STYLE[role]
  const BadgeIcon = badge.Icon
  const [mobileOpen, setMobileOpen] = useState(false)
  const [supportUnread, setSupportUnread] = useState(0)

  // Close drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Poll support inbox unread count for the sidebar badge. Cheap query (open
  // threads only), fires every 60s when the tab is visible. Best-effort —
  // sidebar still works if the call fails.
  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      if (document.hidden) return
      try {
        const res = await fetch('/api/admin/support-inbox/threads?status=open')
        if (!res.ok) return
        const j = await res.json()
        if (cancelled) return
        const total = (j.threads || []).reduce((s: number, t: { unread_count?: number }) => s + (t.unread_count || 0), 0)
        setSupportUnread(total)
      } catch { /* swallow */ }
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const sidebarBody = (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-neutral-200 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Image
            src="/logo.png"
            alt="Young at Heart"
            width={40}
            height={53}
            priority
            className="h-10 w-auto flex-shrink-0"
          />
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-neutral-900 leading-tight truncate">
              Young at Heart
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">Admin Portal</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden -m-2 p-2 text-neutral-500 hover:text-neutral-900 min-h-[44px] min-w-[44px]"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href ||
            (item.href !== '/admin' && pathname.startsWith(item.href))

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#cd2653] text-white'
                  : 'text-neutral-600 hover:bg-neutral-100'
              )}
            >
              <item.icon className="w-4.5 h-4.5" />
              <span className="flex-1">{item.name}</span>
              {item.href === '/admin/support-inbox' && supportUnread > 0 && (
                <span className={cn(
                  'text-[10px] font-bold rounded-full px-1.5 py-0.5',
                  isActive ? 'bg-white text-[#cd2653]' : 'bg-[#cd2653] text-white'
                )}>{supportUnread}</span>
              )}
            </Link>
          )
        })}

        <div className="pt-4 mt-4 border-t border-neutral-100">
          <p className="px-4 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">External</p>
          <a
            href="https://tickets.youngatheart.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
          >
            <ExternalLink className="w-4.5 h-4.5" />
            Ticket Store
          </a>
          <a
            href="https://cthalaal.co.za"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 transition-colors"
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
          className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium text-white bg-[#cd2653] hover:bg-[#b01f45] w-full transition-colors"
        >
          <Globe className="w-4.5 h-4.5" />
          View Live Site
        </a>
      </div>

      {/* Role chip + Logout */}
      <div className="p-3 border-t border-neutral-200 space-y-2">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-neutral-400 uppercase tracking-wider">Signed in</p>
            <p className="text-xs text-neutral-700 truncate" title={email ?? ''}>
              {email ?? 'admin'}
            </p>
          </div>
          <span
            className={cn(
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
              badge.cls
            )}
            title={`Role: ${badge.label}`}
          >
            <BadgeIcon className="w-3 h-3" />
            {badge.label}
          </span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-3 min-h-[44px] rounded-lg text-sm font-medium text-neutral-600 hover:bg-neutral-100 w-full transition-colors"
        >
          <LogOut className="w-4.5 h-4.5" />
          Sign Out
        </button>
      </div>
    </>
  )

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden sticky top-0 z-40 flex items-center justify-between bg-white border-b border-neutral-200 px-3 py-2">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-700 hover:text-neutral-900"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="text-sm font-semibold text-neutral-900">Young at Heart Admin</div>
        <span
          className={cn(
            'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border',
            badge.cls
          )}
          title={`Role: ${badge.label}`}
        >
          <BadgeIcon className="w-3 h-3" />
          {badge.label}
        </span>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-white border-r border-neutral-200 flex flex-col',
          // mobile: drawer
          'fixed inset-y-0 left-0 z-50 w-72 transform transition-transform md:relative md:translate-x-0 md:w-64 md:min-h-screen',
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {sidebarBody}
      </aside>
    </>
  )
}
