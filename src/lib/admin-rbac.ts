// Admin RBAC helpers.
// Role hierarchy: owner > operator > viewer.
// Reads admin_users.role via service-role client (RLS-bypass on purpose:
// this is an admin-only surface, not a vendor-facing one).

import { createAdminClient } from '@/lib/supabase/admin'

export type AdminRole = 'owner' | 'operator' | 'viewer'

const VALID_ROLES: AdminRole[] = ['owner', 'operator', 'viewer']

function normalizeRole(value: unknown): AdminRole | null {
  if (typeof value !== 'string') return null
  const v = value.toLowerCase().trim()
  return (VALID_ROLES as string[]).includes(v) ? (v as AdminRole) : null
}

/**
 * Returns the admin role for a given userId, or null if the user is not
 * in admin_users at all. Safe to call from server components and route
 * handlers. Never throws; logs and returns null on failure.
 */
export async function getRole(userId: string | null | undefined): Promise<AdminRole | null> {
  if (!userId) return null

  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('admin_users')
      .select('role')
      .eq('id', userId)
      .single()

    if (error || !data) return null
    return normalizeRole((data as { role?: string }).role) ?? 'operator'
  } catch (err) {
    console.error('[admin-rbac] getRole failed:', err)
    return null
  }
}

/**
 * Throws an Error when the userId does not hold one of the allowed roles.
 * Use inside server-side mutation handlers. The thrown error is generic
 * by design, do not leak which role was missing in user-facing strings.
 */
export async function assertRole(
  userId: string | null | undefined,
  allowed: AdminRole[]
): Promise<AdminRole> {
  const role = await getRole(userId)
  if (!role || !allowed.includes(role)) {
    throw new Error('Forbidden: insufficient role')
  }
  return role
}

/**
 * Verifies the current request has an active session AND is in admin_users.
 * This is the two-layer gate every admin API route must use.
 * Throws if unauthorized; returns the userId if authenticated+authorized.
 * The thrown message is intentionally generic (no user enumeration).
 */
export async function requireAdmin(): Promise<string> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const admin = createAdminClient()
  const { data: adminUser } = await admin
    .from('admin_users')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()
  if (!adminUser) throw new Error('Forbidden')

  return user.id
}

/**
 * For server components that need to gate on admin_users existence.
 * Returns the user ID or null (no redirect, caller decides).
 */
export async function requireAdminSafe(): Promise<{ userId: string | null; role: AdminRole | null }> {
  const { createClient } = await import('@/lib/supabase/server')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { userId: null, role: null }
  const role = await getRole(user.id)
  return { userId: user.id, role }
}

/**
 * Convenience: who can do what. Keep mutation-permissions centralised
 * so callers do not duplicate the matrix.
 */
export const ROLE_CAPABILITIES = {
  // owners can do everything
  canManageRoles: (r: AdminRole | null) => r === 'owner',
  // owners + operators can act on vendors
  canMutateVendors: (r: AdminRole | null) => r === 'owner' || r === 'operator',
  // everyone in admin_users can read
  canRead: (r: AdminRole | null) => r === 'owner' || r === 'operator' || r === 'viewer',
} as const
