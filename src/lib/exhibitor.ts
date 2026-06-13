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
  // Fallback: if the metadata link is missing OR the linked row no longer
  // exists (orphan id from a prior demo/seed reset), match by email. This
  // prevents the contract gate from silently no-op'ing because the auth user
  // points at a deleted application row.
  if (!application && user.email) {
    const { data } = await admin
      .from('vendor_applications')
      .select('*')
      .ilike('email', user.email)
      .limit(1)
      .maybeSingle()
    application = data ?? null
  }

  return {
    userId: user.id,
    email: user.email || '',
    mustChangePassword: !!meta.must_change_password,
    role: (meta.role as 'owner' | 'staff') || 'owner',
    application,
  }
}
