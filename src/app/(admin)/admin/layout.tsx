import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/admin-rbac'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { CommandK } from '@/components/admin/CommandK'
import type { AdminRole } from '@/lib/admin-rbac'

export const dynamic = 'force-dynamic'

// Public sub-routes that should NOT be gated by the admin layout (login page
// itself, password reset, etc). Anything not in this list falls into the
// auth + role check below.
const PUBLIC_ADMIN_PATHS = new Set<string>([
  '/admin/login',
])

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let role: AdminRole | null = null
  let email: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      role = await getRole(user.id)
      email = user.email ?? null
    }
  } catch (e) {
    console.error('Admin layout auth error:', e)
  }

  // H8 (Pentest F5): defense-in-depth gate at the layout. Public admin paths
  // (login) skip the check; everything else without a role redirects to
  // /admin/login. Child pages keep their own checks so middleware bypass +
  // layout bypass would still require defeating two layers.
  if (!role) {
    const h = await headers()
    const pathname = h.get('x-pathname') || ''
    if (PUBLIC_ADMIN_PATHS.has(pathname)) {
      return <>{children}</>
    }
    redirect('/admin/login')
  }

  return (
    <div className="md:h-screen md:overflow-hidden bg-[#f8f8f8] md:flex">
      <AdminSidebar role={role} email={email} />
      <main className="flex-1 min-w-0 md:overflow-hidden md:h-screen">
        {children}
      </main>
      <CommandK />
    </div>
  )
}
