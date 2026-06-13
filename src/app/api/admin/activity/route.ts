import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRole } from '@/lib/admin-rbac'

// Activity feed for the operator dashboard.
// Reads last N rows from site_events, joins display names from
// vendor_applications where the event references one.
// Filters are server-side via ?category=, defaulting to "all".

export const dynamic = 'force-dynamic'

type EventCategory = 'all' | 'approvals' | 'messages' | 'documents' | 'payments' | 'mass_send'

const CATEGORY_FILTERS: Record<EventCategory, string[] | null> = {
  all: null,
  approvals: ['application_approved', 'application_rejected', 'application_info_requested', 'apply_submit'],
  messages: ['chat_open', 'chat_message', 'inbox_reply'],
  documents: ['document_upload', 'document_download', 'contract_signed'],
  payments: ['checkout_start', 'checkout_complete', 'payment_failed', 'payment_refunded'],
  mass_send: ['mass_email_sent', 'mass_whatsapp_sent', 'verification_blast'],
}

function isCategory(v: string | null): v is EventCategory {
  return !!v && Object.prototype.hasOwnProperty.call(CATEGORY_FILTERS, v)
}

interface SiteEventRow {
  id: string
  created_at: string
  event_type: string
  path: string | null
  metadata: Record<string, unknown> | null
  session_id: string
}

interface VendorLite {
  id: string
  business_name: string
  contact_name: string
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = await getRole(user.id)
    if (!role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const rawCategory = searchParams.get('category')
    const category: EventCategory = isCategory(rawCategory) ? rawCategory : 'all'
    const limitParam = parseInt(searchParams.get('limit') || '30', 10)
    const limit = Math.max(1, Math.min(100, isNaN(limitParam) ? 30 : limitParam))

    const admin = createAdminClient()

    // Build query
    let query = admin
      .from('site_events')
      .select('id, created_at, event_type, path, metadata, session_id')
      .order('created_at', { ascending: false })
      .limit(limit)

    const types = CATEGORY_FILTERS[category]
    if (types && types.length > 0) {
      query = query.in('event_type', types)
    }

    const { data: events, error } = await query
    if (error) {
      console.error('[activity] query failed:', error)
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    const rows = (events ?? []) as SiteEventRow[]

    // Collect any vendor_application ids referenced via metadata
    const vendorIds = new Set<string>()
    for (const ev of rows) {
      const meta = ev.metadata ?? {}
      const id = (meta as { vendor_id?: unknown; application_id?: unknown }).vendor_id
        ?? (meta as { application_id?: unknown }).application_id
      if (typeof id === 'string' && id.length > 0) vendorIds.add(id)
    }

    let vendorMap: Record<string, VendorLite> = {}
    if (vendorIds.size > 0) {
      const { data: vendors } = await admin
        .from('vendor_applications')
        .select('id, business_name, contact_name')
        .in('id', Array.from(vendorIds))
      vendorMap = Object.fromEntries(
        ((vendors ?? []) as VendorLite[]).map(v => [v.id, v])
      )
    }

    const items = rows.map(ev => {
      const meta = (ev.metadata ?? {}) as Record<string, unknown>
      const vendorId = typeof meta.vendor_id === 'string'
        ? meta.vendor_id
        : (typeof meta.application_id === 'string' ? meta.application_id : null)
      const vendor = vendorId ? vendorMap[vendorId] ?? null : null
      const actor = typeof meta.actor === 'string' ? meta.actor
        : (typeof meta.actor_email === 'string' ? meta.actor_email
          : (typeof meta.email === 'string' ? meta.email : 'system'))

      return {
        id: ev.id,
        created_at: ev.created_at,
        event_type: ev.event_type,
        actor,
        path: ev.path,
        vendor_id: vendorId,
        vendor_name: vendor?.business_name ?? null,
        contact_name: vendor?.contact_name ?? null,
        metadata: meta,
      }
    })

    return NextResponse.json({ items, category, limit })
  } catch (err) {
    console.error('[activity] unexpected:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
