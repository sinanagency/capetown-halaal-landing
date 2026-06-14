import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export interface ExhibitorContext {
  userId: string
  email: string
  mustChangePassword: boolean
  role: 'owner' | 'staff'
  application: Record<string, unknown> | null
}

/**
 * Server-side: resolve the signed-in exhibitor + their live application row.
 * The auth user is linked to a vendor_application via user_metadata.application_id
 * (set when admin approves), so this works without any schema change.
 * Returns null when nobody is signed in.
 */
export async function getExhibitorContext(): Promise<ExhibitorContext | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const meta = user.user_metadata || {}
  const applicationId = meta.application_id as string | undefined

  let application: Record<string, unknown> | null = null
  const admin = createAdminClient()
  if (applicationId) {
    const { data } = await admin
      .from('vendor_applications')
      .select('*')
      .eq('id', applicationId)
      .maybeSingle()
    application = data ?? null
  }
  // CTH-DOCTRINE Law 2 (vendor-data-privacy).
  // Email fallback removed for Law 2 safety. Vendors must have application_id
  // in their user_metadata or a verified auth_user_id link. A case-insensitive
  // email match was an unbounded join key — Supabase Auth lets users change
  // their email after sign-up, so an attacker could land on a victim's
  // application row by spoofing the email address. Fail closed: refuse to
  // bind the session to any application when the metadata link is missing.
  if (!application && user.email) {
    console.warn(
      '[exhibitor] no application_id on user_metadata for',
      user.id,
      '— refusing email fallback (Law 2). Re-link this auth user via admin.',
    )
  }

  return {
    userId: user.id,
    email: user.email || '',
    mustChangePassword: !!meta.must_change_password,
    role: (meta.role as 'owner' | 'staff') || 'owner',
    application,
  }
}
