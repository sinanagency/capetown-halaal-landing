import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * GET /api/admin/vendor-thread?phone=<digits>&limit=10
 *
 * Returns the most recent wa_messages exchanged with this phone.
 * Admin-only. Used by the application detail view to embed the conversation.
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const phoneRaw = searchParams.get('phone') ?? ''
    const phone = phoneRaw.replace(/\D+/g, '')
    const limit = clampLimit(searchParams.get('limit'))

    if (!phone) {
      return NextResponse.json({ messages: [], count: 0 })
    }

    const { data, error } = await admin
      .from('wa_messages')
      .select('*')
      .eq('phone', phone)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      // If the wa_messages table is missing the route stays soft-empty.
      const code = (error as { code?: string }).code
      if (code === '42P01') {
        return NextResponse.json({ messages: [], count: 0, note: 'wa_messages table not yet provisioned' })
      }
      return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 })
    }

    return NextResponse.json({ messages: data ?? [], count: data?.length ?? 0 })
  } catch (err) {
    console.error('vendor-thread GET error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function clampLimit(v: string | null): number {
  const n = v ? parseInt(v, 10) : 10
  if (Number.isNaN(n)) return 10
  return Math.min(50, Math.max(1, n))
}
