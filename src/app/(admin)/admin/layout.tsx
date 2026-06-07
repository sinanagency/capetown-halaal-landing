import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

// Routes that must remain reachable to non-admins so they can log in / recover.
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login', '/admin/forgot-password'])

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const h = await headers()
  const pathname = h.get('x-pathname') || h.get('x-invoke-path') || ''
  const isPublicAdminPath = PUBLIC_ADMIN_PATHS.has(pathname)

  let isAdmin = false
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const admin = createAdminClient()
      const { data: adminUser } = await admin
        .from('admin_users')
        .select()
        .eq('id', user.id)
        .single()
      if (adminUser) isAdmin = true
    }
  } catch (e) {
    console.error('Admin layout auth error:', e)
    // FAIL CLOSED — auth-check error must not leak admin data. Render the
    // children anyway for /login + /forgot-password; otherwise redirect.
    if (!isPublicAdminPath) {
      redirect('/admin/login')
    }
  }

  if (!isAdmin && !isPublicAdminPath) {
    redirect('/admin/login')
  }

  // /login + /forgot-password render bare (no sidebar) regardless of auth.
  if (isPublicAdminPath) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-[#f8f8f8]">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
