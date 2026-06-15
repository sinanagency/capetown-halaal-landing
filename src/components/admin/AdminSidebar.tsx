'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, FileText, Files, Ticket, LogOut, ExternalLink, Globe, BarChart3, UserX, ShieldCheck, Shield, Eye, Menu, X, Inbox, Megaphone, Users, Mail, Map, Search, Settings as SettingsIcon, IdCard } from 'lucide-react'
import { Z_CLASS } from '@/lib/z'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import type { AdminRole } from '@/lib/admin-rbac'

type NavItem = { name: string; href: string; icon: typeof LayoutDashboard }
type NavGroup = { label: string | null; items: NavItem[] }

// Sidebar is now grouped into labelled sections. The DASHBOARD group has a
// null label (no header rendered) so the top item still feels primary. Every
// other group renders a small uppercase header above its items.
const navGroups: NavGroup[] = [
  {
    label: null,
    items: [
      { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Operations',
    items: [
      { name: 'Applications', href: '/admin/applications', icon: FileText },
      { name: 'Verifier', href: '/admin/verifier', icon: ShieldCheck },
      { name: 'People', href: '/admin/people', icon: IdCard },
      { name: 'Documents', href: '/admin/documents', icon: Files },
      { name: 'Vendors', href: '/admin/vendors', icon: Users },
      { name: 'Allocation', href: '/admin/allocation', icon: Map },
    ],
  },
  {
    label: 'Communications',
    items: [
      { name: 'Inbox', href: '/admin/bot-inbox', icon: Inbox },
      { name: 'Support Inbox', href: '/admin/support-inbox', icon: Mail },
      { name: 'Broadcast', href: '/admin/broadcast', icon: Megaphone },
    ],
  },
  {
    label: 'Money',
    items: [
      { name: 'Ticket Sales', href: '/admin/tickets', icon: Ticket },
      { name: 'Follow Up', href: '/admin/follow-up', icon: UserX },
    ],
  },
  {
    label: 'Insights',
    items: [
      { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'Settings',
    items: [
      { name: 'Activity Feed', href: '/admin/settings/activity', icon: SettingsIcon },
      { name: 'Operators', href: '/admin/settings/operators', icon: SettingsIcon },
      { name: 'Audit Log', href: '/admin/settings/audit', icon: SettingsIcon },
      { name: 'Comms Health', href: '/admin/settings/comms-health', icon: SettingsIcon },
    ],
  },
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
  const [pendingApps, setPendingApps] = useState<number | null>(null)

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

  // Poll pending application count for the Applications badge. Reads from the
  // shared /api/admin/stats endpoint. Falls back to no badge if the shape
  // differs (e.g. endpoint not yet updated by sibling work). Polls every 60s.
  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      if (document.hidden) return
      try {
        const res = await fetch('/api/admin/stats')
        if (!res.ok) return
        const j = await res.json()
        if (cancelled) return
        // Endpoint nests stats under `stats.pending` per current route.ts.
        // Accept either top-level `pending` or `stats.pending` to be resilient.
        const pending =
          typeof j?.pending === 'number' ? j.pending :
          typeof j?.stats?.pending === 'number' ? j.stats.pending :
          null
        setPendingApps(pending)
      } catch { /* swallow */ }
    }
    tick()
    const id = setInterval(tick, 60000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    // B8: { scope: 'global' } revokes ALL refresh tokens for this user
    // server-side, not just the local cookie. Without this, a stolen
    // refresh token survives "sign out" and continues to mint new
    // access tokens. signOut still clears local cookies even when the
    // network call fails, so we don't await result.error specifically.
    await supabase.auth.signOut({ scope: 'global' })
    // B9: clear CommandK recent-search localStorage so the next person
    // on a shared device cannot read what the previous admin searched
    // for (phone numbers, vendor names, etc.).
    try {
      localStorage.removeItem('admin.commandk.recent')
    } catch {
      // private mode / SSR safety
    }
    router.push('/admin/login')
  }

  const isItemActive = (href: string) =>
    pathname === href || (href !== '/admin' && pathname.startsWith(href))

  const sidebarBody = (
    <>
      {/* Logo: image above text, centred. Use actual h-32 instead of
          transform scale — scale() is a visual bleed that overlaps siblings
          and shifts the mark off the layout midline. Same lesson as
          /exhibitor PortalNav. */}
      <div className="px-6 pt-6 pb-4 border-b border-neutral-200 relative">
        <div className="flex flex-col items-center text-center gap-1.5">
          <Image
            src="/logo.png"
            alt="Young at Heart"
            width={140}
            height={186}
            priority
            className="h-32 w-auto"
          />
          <div>
            <h1 className="text-lg font-bold text-neutral-900 leading-tight">
              Young at Heart
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">Admin Portal</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="md:hidden absolute top-3 right-3 -m-2 p-2 text-neutral-500 hover:text-neutral-900 min-h-[44px] min-w-[44px]"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {navGroups.map((group, gi) => (
          <div key={group.label ?? `group-${gi}`} className="space-y-1">
            {group.label && (
              <p className="px-4 mt-6 mb-1 text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = isItemActive(item.href)
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
                  {item.href === '/admin/applications' && pendingApps !== null && pendingApps > 0 && (
                    <span className={cn(
                      'text-[10px] font-bold rounded-full px-1.5 py-0.5',
                      isActive ? 'bg-white text-[#cd2653]' : 'bg-[#cd2653] text-white'
                    )}>{pendingApps}</span>
                  )}
                </Link>
              )
            })}
          </div>
        ))}

        {/* External group lives at the bottom, separated by a divider. */}
        <div className="pt-4 mt-6 border-t border-neutral-100">
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
      <div className={cn('md:hidden sticky top-0 flex items-center justify-between bg-white border-b border-neutral-200 px-3 py-2', Z_CLASS.drawer)}>
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-700 hover:text-neutral-900"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="text-sm font-semibold text-neutral-900">Young at Heart Admin</div>
        <div className="flex items-center gap-1">
          {/* Mobile search trigger: dispatches a synthetic Cmd+K so CommandK
              (which already owns the keydown listener) opens. Avoids the
              cross-component coupling problem of wiring a setOpen ref into a
              component owned by a sibling agent. */}
          <button
            type="button"
            onClick={() => {
              const ev = new KeyboardEvent('keydown', { key: 'k', metaKey: true, bubbles: true })
              document.dispatchEvent(ev)
            }}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-neutral-700 hover:text-neutral-900"
            aria-label="Open command palette"
          >
            <Search className="w-5 h-5" />
          </button>
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
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div
          className={cn('md:hidden fixed inset-0 bg-black/40', Z_CLASS.drawer)}
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'bg-white border-r border-neutral-200 flex flex-col',
          // mobile: drawer (sits above the overlay backdrop on the modal layer)
          'fixed inset-y-0 left-0 w-72 transform transition-transform md:relative md:translate-x-0 md:w-64 md:min-h-screen',
          Z_CLASS.modal,
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {sidebarBody}
      </aside>
    </>
  )
}
