'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LogoMark } from '@/components/logo'
import {
  LayoutGrid, MapPin, CreditCard, FileCheck, Users, Megaphone,
  Store, Inbox, BookOpen, LogOut, ChevronDown, Check,
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

type Item = { href: string; label: string; icon: typeof LayoutGrid; live: boolean }

const PRIMARY: Item[] = [
  { href: '/exhibitor/portal', label: 'Overview', icon: LayoutGrid, live: true },
  { href: '/exhibitor/portal/stand', label: 'My Stand', icon: MapPin, live: true },
  { href: '/exhibitor/portal/documents', label: 'Documents', icon: FileCheck, live: true },
  { href: '/exhibitor/portal/staff', label: 'Staff & Badges', icon: Users, live: true },
  { href: '/exhibitor/portal/announcements', label: 'Announcements', icon: Megaphone, live: true },
  { href: '/exhibitor/portal/support', label: 'Inbox', icon: Inbox, live: true },
]
const MORE: Item[] = [
  { href: '/exhibitor/portal/payments', label: 'Payments', icon: CreditCard, live: false },
  { href: '/exhibitor/portal/profile', label: 'Profile', icon: Store, live: true },
  { href: '/exhibitor/portal/resources', label: 'Resources', icon: BookOpen, live: true },
]

function initials(name: string) {
  const clean = name.replace(/^DEMO\s*·?\s*/i, '').trim()
  return (clean[0] || 'Y').toUpperCase()
}

export default function PortalNav({ businessName }: { businessName: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const [moreOpen, setMoreOpen] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  async function signOut() {
    setSigningOut(true)
    await createClient().auth.signOut()
    router.push('/exhibitor/login'); router.refresh()
  }

  const moreActive = MORE.some((m) => pathname === m.href)

  function Pill({ item }: { item: Item }) {
    const active = pathname === item.href
    const Icon = item.icon
    if (!item.live) {
      return (
        <span className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium text-neutral-300 whitespace-nowrap cursor-default" title="Rolling out soon">
          <Icon className="w-4 h-4" />{item.label}<span className="text-[9px] uppercase tracking-wide">soon</span>
        </span>
      )
    }
    return (
      <a href={item.href} className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${active ? 'bg-[#cd2653] text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'}`}>
        <Icon className="w-4 h-4" />{item.label}
      </a>
    )
  }

  return (
    <div className="sticky top-0 z-50 px-3 sm:px-4 pt-3 pb-2">
      <div className="mx-auto max-w-6xl flex items-center gap-2 bg-white/90 backdrop-blur-md border border-neutral-200/80 rounded-[20px] shadow-[0_8px_30px_rgba(20,15,17,0.07)] h-14 pl-2.5 pr-2.5">
        {/* logo */}
        <a href="/exhibitor/portal" className="flex items-center gap-2 shrink-0 pr-1">
          <LogoMark size="sm" />
          <span className="font-bold text-neutral-900 text-sm hidden xl:block leading-none">Young at Heart<span className="block text-[10px] font-normal text-neutral-400">Exhibitor portal</span></span>
        </a>

        {/* nav */}
        <nav className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {PRIMARY.map((i) => <Pill key={i.href} item={i} />)}
          {/* More dropdown */}
          <div className="relative" ref={moreRef}>
            <button onClick={() => setMoreOpen((o) => !o)}
              className={`flex items-center gap-1 rounded-full px-3 py-1.5 text-[13px] font-medium whitespace-nowrap transition-colors ${moreActive ? 'bg-[#cd2653]/10 text-[#cd2653]' : 'text-neutral-600 hover:bg-neutral-100'}`}>
              More <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreOpen ? 'rotate-180' : ''}`} />
            </button>
            {moreOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-neutral-200 rounded-2xl shadow-xl p-1.5 z-50">
                {MORE.map((i) => {
                  const Icon = i.icon
                  const active = pathname === i.href
                  return i.live ? (
                    <a key={i.href} href={i.href} onClick={() => setMoreOpen(false)}
                      className={`flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm ${active ? 'text-[#cd2653] bg-[#cd2653]/5 font-medium' : 'text-neutral-700 hover:bg-neutral-50'}`}>
                      <Icon className="w-4 h-4" />{i.label}{active && <Check className="w-3.5 h-3.5 ml-auto" />}
                    </a>
                  ) : (
                    <span key={i.href} className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-neutral-300">
                      <Icon className="w-4 h-4" />{i.label}<span className="ml-auto text-[9px] uppercase tracking-wide">soon</span>
                    </span>
                  )
                })}
              </div>
            )}
          </div>
        </nav>

        {/* right cluster */}
        <div className="flex items-center gap-2 shrink-0 pl-1 border-l border-neutral-200/70">
          <div className="w-8 h-8 rounded-full bg-[#cd2653] text-white text-sm font-bold flex items-center justify-center shrink-0">{initials(businessName)}</div>
          <span className="hidden lg:block text-sm font-medium text-neutral-700 max-w-[140px] truncate">{businessName.replace(/^DEMO\s*·?\s*/i, '')}</span>
          <button onClick={signOut} disabled={signingOut} title="Sign out"
            className="text-neutral-400 hover:text-[#cd2653] transition-colors p-1.5"><LogOut className="w-4 h-4" /></button>
        </div>
      </div>
    </div>
  )
}
