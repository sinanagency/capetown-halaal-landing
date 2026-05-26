import { createAdminClient } from '@/lib/supabase/admin'

// Readable-but-random temp password, e.g. "Khcd4821!"
function genPassword(): string {
  const lower = 'abcdefghijkmnpqrstuvwxyz'
  const upper = 'ABCDEFGHJKMNPQRSTUVWXYZ'
  let s = upper[Math.floor(Math.random() * upper.length)]
  for (let i = 0; i < 4; i++) s += lower[Math.floor(Math.random() * lower.length)]
  s += Math.floor(1000 + Math.random() * 9000)
  return s + '!'
}

type Admin = ReturnType<typeof createAdminClient>

async function findUserByEmail(admin: Admin, email: string) {
  const target = email.toLowerCase()
  for (let page = 1; page <= 6; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error || !data?.users?.length) break
    const u = data.users.find((u) => (u.email || '').toLowerCase() === target)
    if (u) return u
    if (data.users.length < 200) break
  }
  return null
}

/**
 * Create (or reset) the vendor's portal account on approval.
 * Links the auth user to its application via user_metadata.application_id, so the
 * portal resolves the right vendor without any schema change. Returns the temp
 * password to put in the approval email. Idempotent: re-approving resets it.
 */
export async function provisionExhibitorAccount(opts: {
  email: string
  applicationId: string
  businessName: string
}): Promise<{ tempPassword: string; userId: string | null }> {
  const admin = createAdminClient()
  const tempPassword = genPassword()
  const user_metadata = {
    application_id: opts.applicationId,
    role: 'owner',
    must_change_password: true,
    business_name: opts.businessName,
  }

  const { data, error } = await admin.auth.admin.createUser({
    email: opts.email,
    password: tempPassword,
    email_confirm: true,
    user_metadata,
  })

  let userId = data?.user?.id ?? null
  if (error) {
    // Email already has an account -> reset password + relink metadata.
    const existing = await findUserByEmail(admin, opts.email)
    if (!existing) throw error
    userId = existing.id
    await admin.auth.admin.updateUserById(existing.id, { password: tempPassword, user_metadata })
  }

  return { tempPassword, userId }
}
