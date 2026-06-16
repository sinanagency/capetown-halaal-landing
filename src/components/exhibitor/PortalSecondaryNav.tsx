'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function PortalSecondaryNav() {
  const pathname = usePathname()
  return (
    <nav className="flex-shrink-0 border-b border-[#E5DCC4] bg-white/80 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto flex items-center gap-1 py-1.5 text-xs">
        {[
          { href: '/exhibitor/portal/profile', label: 'Profile' },
          { href: '/exhibitor/portal/payments', label: 'Payments' },
          { href: '/exhibitor/portal/resources', label: 'Resources' },
          { href: '/exhibitor/portal/settings', label: 'Account Settings' },
        ].map(item => (
          <Link key={item.href} href={item.href}
            className={`px-3 py-1.5 rounded-full transition-colors ${
              pathname.startsWith(item.href)
                ? 'bg-[#cd2653] text-white'
                : 'text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100'
            }`}>
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  )
}
