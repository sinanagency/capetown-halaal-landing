// Admin-gated media proxy for the unified inbox. Incoming WhatsApp media is
// stored as a Meta media id on wa_messages.metadata.media.id (the wamid CANNOT
// retrieve bytes). The browser can't call the Graph API directly (it needs the
// server-only WHATSAPP_TOKEN and the bytes are token-gated), so we proxy:
//   1. Look up the wa_messages row by its DB id, read metadata.media.id.
//   2. Ask Graph for the short-lived media URL, then fetch the bytes with the
//      bearer token, and stream them back same-origin so an <img src> works.
// Gated to admin_users only so vendor media never leaks to the public.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GRAPH = 'https://graph.facebook.com/v21.0'
const WA_TOKEN = process.env.WHATSAPP_TOKEN || ''

interface MediaMeta { id?: string; mime_type?: string; filename?: string; caption?: string }

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params

  // ---- admin gate ----
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  if (!WA_TOKEN) return NextResponse.json({ error: 'whatsapp_not_configured' }, { status: 503 })

  // The `id` param is the wa_messages row id (UUID). Strip any "wa:" prefix the
  // unified thread uses for its synthetic message ids.
  const rowId = id.replace(/^wa:/, '')
  const { data: row } = await db
    .from('wa_messages')
    .select('metadata')
    .eq('id', rowId)
    .maybeSingle()
  const media = (row?.metadata as { media?: MediaMeta } | null)?.media
  if (!media?.id) return NextResponse.json({ error: 'no_media' }, { status: 404 })

  try {
    // 1) Resolve the media id -> short-lived download URL.
    const metaRes = await fetch(`${GRAPH}/${media.id}`, {
      headers: { Authorization: `Bearer ${WA_TOKEN}` },
    })
    if (!metaRes.ok) {
      return NextResponse.json({ error: 'media_lookup_failed', status: metaRes.status }, { status: 502 })
    }
    const meta = (await metaRes.json()) as { url?: string; mime_type?: string }
    if (!meta.url) return NextResponse.json({ error: 'media_url_missing' }, { status: 502 })

    // 2) Fetch the bytes (token-gated — must send the bearer here too).
    const binRes = await fetch(meta.url, { headers: { Authorization: `Bearer ${WA_TOKEN}` } })
    if (!binRes.ok || !binRes.body) {
      return NextResponse.json({ error: 'media_fetch_failed', status: binRes.status }, { status: 502 })
    }

    const contentType = meta.mime_type || media.mime_type || binRes.headers.get('content-type') || 'application/octet-stream'
    const headers = new Headers({
      'Content-Type': contentType,
      // Private cache only — admin-gated, vendor PII (Doctrine Law 2).
      'Cache-Control': 'private, max-age=300',
    })
    if (media.filename) {
      headers.set('Content-Disposition', `inline; filename="${media.filename.replace(/["\r\n]/g, '')}"`)
    }
    return new NextResponse(binRes.body, { status: 200, headers })
  } catch (e) {
    return NextResponse.json({ error: 'proxy_error', detail: (e as Error).message }, { status: 502 })
  }
}
