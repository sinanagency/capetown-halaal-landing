import { NextResponse, type NextRequest } from 'next/server'
import { isMaintenanceEnabled, isPathAlwaysOpen, bypassTokenFromEnv, MAINTENANCE_COOKIE } from '@/lib/maintenance'

export async function middleware(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl
  const hostname = request.headers.get('host') || ''

  // Expose pathname to server components (layouts use this to allowlist
  // public sub-routes like /admin/login while gating everything else).
  const inboundHeaders = new Headers(request.headers)
  inboundHeaders.set('x-pathname', pathname)

  // ---- Maintenance gate (runs FIRST so admin subdomain rewrites still get gated) ----
  if (isMaintenanceEnabled() && !isPathAlwaysOpen(pathname)) {
    const expected = bypassTokenFromEnv()
    const cookieToken = request.cookies.get(MAINTENANCE_COOKIE)?.value
    const queryToken = searchParams.get('bypass')

    // Honor a fresh ?bypass= and set the cookie so subsequent navigation works.
    if (expected && queryToken && queryToken === expected) {
      const res = NextResponse.next()
      res.cookies.set(MAINTENANCE_COOKIE, expected, {
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24h
      })
      return res
    }

    // Allow if cookie already matches the expected token.
    if (expected && cookieToken === expected) {
      return NextResponse.next()
    }

    // Otherwise redirect to /maintenance with no-cache so the page itself
    // never gets cached (so flipping the flag back instantly returns the site).
    const url = request.nextUrl.clone()
    url.pathname = '/maintenance'
    url.search = ''
    const res = NextResponse.rewrite(url, { request: { headers: inboundHeaders } })
    res.headers.set('Cache-Control', 'no-store, max-age=0, must-revalidate')
    return res
  }

  // ---- Existing admin subdomain rewrite ----
  if (hostname.startsWith('admin.')) {
    const url = request.nextUrl.clone()
    if (pathname === '/') {
      url.pathname = '/admin'
    } else if (!pathname.startsWith('/admin')) {
      url.pathname = `/admin${pathname}`
    }
    inboundHeaders.set('x-pathname', url.pathname)
    return NextResponse.rewrite(url, { request: { headers: inboundHeaders } })
  }

  return NextResponse.next({ request: { headers: inboundHeaders } })
}

export const config = {
  matcher: [
    // Match everything except static files; api/ is now included so the
    // maintenance gate can let webhooks through while still gating other API.
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js)$).*)',
  ],
}
