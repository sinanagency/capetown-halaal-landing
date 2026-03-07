import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Handle admin subdomain routing
  if (hostname.startsWith('admin.')) {
    // Rewrite admin.cthalaal.co.za/foo to /admin/foo
    const url = request.nextUrl.clone()

    // If accessing root of admin subdomain, go to /admin
    if (pathname === '/') {
      url.pathname = '/admin'
    } else if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname}`
    }

    // Continue with the request (auth check happens in layout)
    return NextResponse.rewrite(url)
  }

  // For non-admin routes, just continue
  return NextResponse.next()
}

export const config = {
  matcher: [
    // Match all paths except static files and api
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
