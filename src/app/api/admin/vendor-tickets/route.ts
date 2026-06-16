import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: adminUser } = await admin.from('admin_users').select('id').eq('id', user.id).single()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') || 'open'

  let query = admin
    .from('vendor_tickets')
    .select('id, vendor_application_id, ticket_buyer_email, status, assigned_to, tag, last_message_at, unread_count, created_at')
    .order('last_message_at', { ascending: false, nullsFirst: false })

  if (tab !== 'all') {
    query = query.eq('status', tab)
  }

  const { data: tickets, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Enrich with vendor names
  const enriched = await Promise.all(
    (tickets || []).map(async (t) => {
      let businessName = null
      let contactName = null
      if (t.vendor_application_id) {
        try {
          const { data: app } = await admin
            .from('vendor_applications')
            .select('business_name, contact_name')
            .eq('id', t.vendor_application_id)
            .single()
          businessName = (app as Record<string, unknown>)?.business_name || null
          contactName = (app as Record<string, unknown>)?.contact_name || null
        } catch { /* vendor may not exist */ }
      }
      return { ...t, business_name: businessName, contact_name: contactName }
    })
  )

  return NextResponse.json({ tickets: enriched })
}
