/**
 * GET /api/admin/documents/tickets/proxy?url=<encoded>
 *
 * Streams a FooEvents ticket PDF (hosted on tickets.youngatheart.co.za) back
 * through this same-origin route so the admin DocViewerDrawer iframe can
 * render it inline. Cross-origin iframes refused by the WP server are the
 * reason the drawer was showing "tickets.youngatheart.co.za refused to
 * connect" — same root cause as the vendor contract redirect issue.
 *
 * Security:
 *   - Admin-gated via admin_users (same gate as the tickets listing route).
 *   - Strict allowlist on the upstream origin to prevent SSRF: we only
 *     proxy requests to the configured CTH_WP_ORIGIN (default
 *     https://tickets.youngatheart.co.za). Any other host returns 400.
 *   - Cookies and credentials are not forwarded upstream.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const WP_ORIGIN = (process.env.CTH_WP_ORIGIN || 'https://tickets.youngatheart.co.za').replace(/\/$/, '')

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const target = req.nextUrl.searchParams.get('url')
  if (!target) return NextResponse.json({ error: 'missing url' }, { status: 400 })

  let parsed: URL
  try {
    parsed = new URL(target)
  } catch {
    return NextResponse.json({ error: 'invalid url' }, { status: 400 })
  }

  const allowedOrigin = new URL(WP_ORIGIN).origin
  if (parsed.origin !== allowedOrigin) {
    return NextResponse.json({ error: 'origin not allowed' }, { status: 400 })
  }

  const upstream = await fetch(parsed.toString(), {
    redirect: 'follow',
    headers: { 'User-Agent': 'cthalaal-admin-doc-proxy/1.0' },
  })
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json(
      { error: `upstream ${upstream.status}` },
      { status: upstream.status === 404 ? 404 : 502 },
    )
  }
  const upstreamType = upstream.headers.get('content-type') || 'application/pdf'
  const filename = (parsed.pathname.split('/').pop() || 'ticket.pdf').replace(/[^a-zA-Z0-9._-]/g, '_')

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      'Content-Type': upstreamType,
      'Content-Disposition': `inline; filename="${filename}"`,
      'X-Frame-Options': 'SAMEORIGIN',
      'Cache-Control': 'private, max-age=60',
    },
  })
}
