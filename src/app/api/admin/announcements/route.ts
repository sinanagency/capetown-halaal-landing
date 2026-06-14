import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { listAnnouncements, addAnnouncement } from '@/lib/announcements'
import { verifyCronAuth } from '@/lib/security/cron-auth'

async function isAuthorized(request: NextRequest): Promise<boolean> {
  // Header-only Bearer (constant-time). `?secret=` query branch removed
  // because it leaks into access logs / browser history / referrers.
  if (verifyCronAuth(request.headers.get('authorization'))) return true
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false
    const admin = createAdminClient()
    const { data } = await admin.from('admin_users').select().eq('id', user.id).single()
    return !!data
  } catch { return false }
}

export async function GET() {
  return NextResponse.json({ announcements: await listAnnouncements() })
}

// POST { title, body, pinned } — admin posts a festival-wide announcement.
export async function POST(request: NextRequest) {
  if (!(await isAuthorized(request))) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body.title || !body.body) return NextResponse.json({ error: 'title and body required' }, { status: 400 })
  const item = await addAnnouncement({ title: String(body.title), body: String(body.body), pinned: !!body.pinned, created_by: 'organisers' })
  return NextResponse.json({ success: true, announcement: item })
}
