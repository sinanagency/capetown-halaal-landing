import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

// GET /api/admin/vendor-doc?path=<vendor-docs-relative-path>
// Returns a signed URL redirect for any object in the vendor-docs bucket.
// Admin-only.
export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const admin = createAdminClient()
  const { data: adminUser } = await admin.from('admin_users').select('id').eq('id', user.id).single()
  if (!adminUser) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const path = (req.nextUrl.searchParams.get('path') || '').trim()
  if (!path) return NextResponse.json({ error: 'path required' }, { status: 400 })
  // Defensive: reject path traversal attempts.
  if (path.includes('..') || path.startsWith('/')) {
    return NextResponse.json({ error: 'invalid path' }, { status: 400 })
  }

  const { data, error } = await admin.storage.from('vendor-docs').createSignedUrl(path, 300)
  if (error || !data) return NextResponse.json({ error: 'Could not generate link' }, { status: 500 })
  return NextResponse.redirect(data.signedUrl)
}
