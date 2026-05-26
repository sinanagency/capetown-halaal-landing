'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Logo } from '@/components/logo'
import {
  LayoutGrid, MapPin, CreditCard, FileCheck, Users, Megaphone,
  Store, LifeBuoy, BookOpen, LogOut,
} from 'lucide-react'
import { useState } from 'react'

const SECTIONS = [
  { href: '/exhibitor/portal', label: 'Overview', icon: LayoutGrid, live: true },
  { href: '/exhibitor/portal/stand', label: 'My Stand', icon: MapPin, live: true },
  { href: '/exhibitor/portal/payments', label: 'Payments', icon: CreditCard, live: false },
  { href: '/exhibitor/portal/documents', label: 'Documents', icon: FileCheck, live: false },
  { href: '/exhibitor/portal/staff', label: 'Staff & Badges', icon: Users, live: false },
  { href: '/exhibitor/portal/announcements', label: 'Announcements', icon: Megaphone, live: false },
  { href: '/exhibitor/portal/profile', label: 'Profile', icon: Store, live: false },
  { href: '/exhibitor/portal/support', label: 'Support', icon: LifeBuoy, live: false },
  { href: '/exhibitor/portal/resources', label: 'Resources', icon: BookOpen, live: false },
]

export default function PortalNav({ businessName }: { businessName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [signingOut, setSigningOut] = useState(false)

  async function signOut() {
    setSigningOut(true)
    await createClient().auth.signOut()
    router.push('/exhibitor/login'); router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-neutral-200">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <a href="/exhibitor/portal" className="shrink-0"><Logo size="md" showText /></a>

        {/* floating pill nav */}
        <nav className="hidden md:flex items-center gap-1 bg-neutral-100/80 rounded-full p-1 overflow-x-auto max-w-[58vw]">
          {SECTIONS.map((s) => {
            const active = pathname === s.href
            const Icon = s.icon
            const cls = active
              ? 'bg-white text-[#cd2653] shadow-sm'
              : s.live ? 'text-neutral-600 hover:text-neutral-900' : 'text-neutral-300 cursor-default'
            return s.live ? (
              <a key={s.href} href={s.href}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${cls}`}>
                <Icon className="w-3.5 h-3.5" />{s.label}
              </a>
            ) : (
              <span key={s.href} title="Rolling out soon"
                className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap ${cls}`}>
                <Icon className="w-3.5 h-3.5" />{s.label}
                <span className="ml-0.5 text-[9px] uppercase tracking-wide text-neutral-300">soon</span>
              </span>
            )
          })}
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <span className="hidden lg:block text-sm font-medium text-neutral-700 max-w-[160px] truncate">{businessName}</span>
          <button onClick={signOut} disabled={signingOut}
            className="flex items-center gap-1.5 text-sm text-neutral-500 hover:text-[#cd2653] transition-colors">
            <LogOut className="w-4 h-4" /><span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>

      {/* mobile nav row */}
      <nav className="md:hidden flex items-center gap-1 px-3 pb-2 overflow-x-auto">
        {SECTIONS.filter((s) => s.live).map((s) => {
          const active = pathname === s.href
          return (
            <a key={s.href} href={s.href}
              className={`rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap ${active ? 'bg-[#cd2653] text-white' : 'bg-neutral-100 text-neutral-600'}`}>
              {s.label}
            </a>
          )
        })}
      </nav>
    </header>
  )
}
