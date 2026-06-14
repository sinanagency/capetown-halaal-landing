/**
 * GET /api/admin/support-inbox/search?type=vendor|ticket&q=query
 *
 * Autocomplete endpoint for the "Link to vendor" + "Link to ticket buyer"
 * pickers in the support inbox header. Caps at 10 results.
 *
 * vendor: searches approved vendor_applications by business_name | contact_name | email.
 * ticket: searches ticket_buyers by name | email.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const db = createAdminClient()
  const { data: adminUser } = await db.from('admin_users').select('id').eq('id', user.id).maybeSingle()
  if (!adminUser) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

  const url = new URL(req.url)
  const type = (url.searchParams.get('type') || '').toLowerCase()
  const q = (url.searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json({ results: [] })

  if (type === 'vendor') {
    const { data, error } = await db
      .from('vendor_applications')
      .select('id, business_name, contact_name, email, phone, status')
      .eq('status', 'approved')
      .or(`business_name.ilike.%${q}%,contact_name.ilike.%${q}%,email.ilike.%${q}%`)
      .limit(10)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ results: data || [] })
  }

  if (type === 'ticket') {
    try {
      const { data, error } = await db
        .from('ticket_buyers')
        .select('email, name, phone, ticket_count, total_spent')
        .or(`name.ilike.%${q}%,email.ilike.%${q}%`)
        .limit(10)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ results: data || [] })
    } catch (e) {
      return NextResponse.json({ error: (e as Error).message }, { status: 500 })
    }
  }

  return NextResponse.json({ error: 'type must be vendor or ticket' }, { status: 400 })
}
