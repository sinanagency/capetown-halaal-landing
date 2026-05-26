import { NextRequest, NextResponse } from 'next/server'
import { getExhibitorContext } from '@/lib/exhibitor'
import { createAdminClient } from '@/lib/supabase/admin'
import { updatePortalState, parsePortalState, type VendorProfile } from '@/lib/portal-state'

const BUCKET = 'vendor-assets'

function publicUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`
}

// GET: current profile (application fields as defaults, portal-state overrides).
export async function GET() {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const app = ctx.application
  const state = parsePortalState(app.admin_notes as string)
  const p = state.profile || {}
  return NextResponse.json({
    profile: {
      business_name: app.business_name,
      tagline: p.tagline ?? '',
      description: p.description ?? (app.business_description as string) ?? '',
      website: p.website ?? (app.website as string) ?? '',
      instagram: p.instagram ?? (app.instagram as string) ?? '',
      facebook: p.facebook ?? (app.facebook as string) ?? '',
      menu: p.menu ?? [],
      logo_url: p.logo_path ? publicUrl(p.logo_path) : null,
    },
  })
}

// POST: multipart -> logo upload; JSON -> profile fields + menu.
export async function POST(req: NextRequest) {
  const ctx = await getExhibitorContext()
  if (!ctx?.application) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const applicationId = ctx.application.id as string
  const contentType = req.headers.get('content-type') || ''

  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData().catch(() => null)
    const file = form?.get('logo')
    if (!(file instanceof File)) return NextResponse.json({ error: 'No logo provided' }, { status: 400 })
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: 'Logo too large (max 5MB)' }, { status: 400 })
    const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
    const path = `${applicationId}/logo-${Date.now()}.${ext}`
    const admin = createAdminClient()
    const { error } = await admin.storage.from(BUCKET).upload(path, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || 'image/png', upsert: true,
    })
    if (error) return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
    await updatePortalState(applicationId, (s) => ({ ...s, profile: { ...(s.profile || {}), logo_path: path } }))
    return NextResponse.json({ success: true, logo_url: publicUrl(path) })
  }

  const body = await req.json().catch(() => ({}))
  const clean: VendorProfile = {
    tagline: String(body.tagline || '').slice(0, 120),
    description: String(body.description || '').slice(0, 1000),
    website: String(body.website || '').slice(0, 200),
    instagram: String(body.instagram || '').slice(0, 120),
    facebook: String(body.facebook || '').slice(0, 200),
    menu: Array.isArray(body.menu)
      ? body.menu.slice(0, 40).map((m: { name?: string; price?: string; desc?: string }) => ({
          name: String(m.name || '').slice(0, 80),
          price: String(m.price || '').slice(0, 30),
          desc: String(m.desc || '').slice(0, 200),
        })).filter((m: { name: string }) => m.name)
      : [],
  }
  const next = await updatePortalState(applicationId, (s) => ({
    ...s,
    profile: { ...(s.profile || {}), ...clean },
  }))
  return NextResponse.json({ success: true, profile: next.profile })
}
