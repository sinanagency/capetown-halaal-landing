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
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, User, LogOut, LayoutDashboard, Menu, MapPin } from 'lucide-react'
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
    <nav className="fixed top-0 left-0 right-0 h-16 bg-gray-950/80 backdrop-blur-xl border-b border-white/10 z-50">
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
                'gap-2',
                pathname === '/' && 'bg-white/10'
              )}
            >
              <MapPin className="w-4 h-4" />
              Floor Plan
            </Button>
          </Link>
          <Link href="/vendors">
            <Button
              variant="ghost"
              className={cn(
                'gap-2',
                pathname === '/vendors' && 'bg-white/10'
              )}
            >
              <User className="w-4 h-4" />
              Vendors
            </Button>
          </Link>
          {isAuthenticated && (
            <Link href="/dashboard">
              <Button
                variant="ghost"
                className={cn(
                  'gap-2',
                  pathname === '/dashboard' && 'bg-white/10'
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
          {/* Cart */}
          <Link href="/#floor-plan">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="w-5 h-5" />
              {cart.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-[#cd2653] text-[10px]">
                  {cart.length}
                </Badge>
              )}
            </Button>
          </Link>

          {/* User menu */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xs">
                      {user ? getInitials(user.name) : 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm">{user?.name.split(' ')[0]}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-white/10">
                <DropdownMenuLabel>
                  <p className="font-medium">{user?.name}</p>
                  <p className="text-xs text-gray-400 font-normal">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-white/10" />
                <Link href="/dashboard">
                  <DropdownMenuItem className="cursor-pointer">
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Dashboard
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator className="bg-white/10" />
                <DropdownMenuItem
                  onClick={() => logout()}
                  className="cursor-pointer text-red-400 focus:text-red-400"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Sign in
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm" className="bg-[#cd2653] hover:bg-[#bf3026]">
                  Register
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  )
}
