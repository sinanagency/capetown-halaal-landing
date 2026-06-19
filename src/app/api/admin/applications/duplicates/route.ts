import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

interface AppRow {
  id: string
  business_name: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  status: string | null
  created_at: string
  sector: string | null
}

interface DuplicateGroup {
  id: string
  match_type: 'phone' | 'email' | 'business_name'
  match_value: string
  members: Array<{
    id: string
    business_name: string | null
    contact_name: string | null
    email: string | null
    phone: string | null
    status: string | null
    created_at: string
    sector: string | null
  }>
}

function phoneLast9(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D+/g, '').slice(-9)
}

function normalizeBusinessName(name: string | null | undefined): string {
  return (name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select('id')
      .eq('id', user.id)
      .single()
    if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { searchParams } = new URL(req.url)
    const includeResolved = searchParams.get('include_resolved') === '1'

    let q = admin
      .from('vendor_applications')
      .select('id, business_name, contact_name, email, phone, status, created_at, sector')

    if (!includeResolved) {
      q = q.or('is_duplicate.is.null,is_duplicate.eq.false')
    }

    const { data, error } = await q.order('created_at', { ascending: false })
    if (error) {
      console.error('[admin/duplicates] query error:', error)
      return NextResponse.json({ error: 'Failed to fetch applications' }, { status: 500 })
    }

    const rows = (data ?? []) as AppRow[]

    // Build groups by phone, email, and business name
    const phoneMap = new Map<string, AppRow[]>()
    const emailMap = new Map<string, AppRow[]>()
    const nameMap = new Map<string, AppRow[]>()

    for (const row of rows) {
      // Phone grouping (last 9 digits)
      const p9 = phoneLast9(row.phone)
      if (p9.length >= 6) {
        const list = phoneMap.get(p9) ?? []
        list.push(row)
        phoneMap.set(p9, list)
      }
      // Email grouping (lowercase)
      if (row.email) {
        const normalizedEmail = row.email.toLowerCase().trim()
        const list = emailMap.get(normalizedEmail) ?? []
        list.push(row)
        emailMap.set(normalizedEmail, list)
      }
      // Business name grouping (normalized)
      const normalizedName = normalizeBusinessName(row.business_name)
      if (normalizedName.length >= 3) {
        const list = nameMap.get(normalizedName) ?? []
        list.push(row)
        nameMap.set(normalizedName, list)
      }
    }

    const groups: DuplicateGroup[] = []

    // Phone groups with 2+
    for (const [value, members] of phoneMap) {
      if (members.length >= 2) {
        const id = `phone:${value}`
        groups.push({
          id,
          match_type: 'phone',
          match_value: `…${value}`,
          members: members.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
        })
      }
    }

    // Email groups with 2+
   for (const [value, members] of emailMap) {
      if (members.length >= 2) {
        const id = `email:${value}`
        if (!groups.some(g => g.match_type === 'email' && g.match_value === value)) {
          groups.push({
            id,
            match_type: 'email',
            match_value: value,
            members: members.sort(
              (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            ),
          })
        }
      }
    }

    // Business name groups with 2+
    for (const [value, members] of nameMap) {
      if (members.length >= 2) {
        const id = `name:${value}`
        groups.push({
          id,
          match_type: 'business_name',
          match_value: members[0].business_name ?? value,
          members: members.sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          ),
        })
      }
    }

    // Sort by group size descending
    groups.sort((a, b) => b.members.length - a.members.length)

    return NextResponse.json({ groups, total: groups.length })
  } catch (err) {
    console.error('[admin/duplicates] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
