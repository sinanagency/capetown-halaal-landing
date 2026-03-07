'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useBoothStore } from '@/lib/store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { User, LogOut, LayoutDashboard, MapPin } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/logo'

export function Navbar() {
  const pathname = usePathname()
  const { user, isAuthenticated, logout, cart } = useBoothStore()

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <nav className="fixed top-0 left-0 right-0 h-16 bg-white/80 backdrop-blur-xl border-b border-neutral-200 z-50">
      <div className="container mx-auto h-full px-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo size="md" showText={true} />
        </Link>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-1">
          <Link href="/">
            <Button
              variant="ghost"
              className={cn(
                'gap-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100',
                pathname === '/' && 'bg-neutral-100'
              )}
            >
              <MapPin className="w-4 h-4" />
              Home
            </Button>
          </Link>
          <Link href="/apply">
            <Button
              variant="ghost"
              className={cn(
                'gap-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100',
                pathname === '/apply' && 'bg-neutral-100'
              )}
            >
              <User className="w-4 h-4" />
              Exhibitors
            </Button>
          </Link>
          {isAuthenticated && (
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className={cn(
                  'gap-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100',
                  pathname === '/dashboard' && 'bg-neutral-100'
                )}
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          )}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* User menu */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2 text-neutral-700 hover:text-neutral-900 hover:bg-neutral-100">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-[#cd2653] to-[#bf3026] text-white text-xs">
                      {user ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">{user?.name.split(' ')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-white border-neutral-200">
                <DropdownMenuLabel>
                  <p className="font-medium text-neutral-900">{user?.name}</p>
                  <p className="text-xs text-neutral-500 font-normal">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-neutral-200" />
                <Link href="/dashboard">
                  <DropdownMenuItem className="cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="bg-neutral-200" />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="cursor-pointer text-red-600 focus:text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/apply">
                <Button size="sm" className="bg-[#cd2653] hover:bg-[#bf3026] text-white">
                  Apply as Exhibitor
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
