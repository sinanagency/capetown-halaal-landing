import { createClient } from '@/lib/supabase/server'
import { getRole } from '@/lib/admin-rbac'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import type { AdminRole } from '@/lib/admin-rbac'

export const dynamic = 'force-dynamic'

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

  if (!role) {
    return <>{children}</>
  }

  return (
    <div className="min-h-screen bg-[#f8f8f8] md:flex">
      <AdminSidebar role={role} email={email} />
      <main className="flex-1 overflow-auto min-w-0">
        {children}
      </main>
    </div>
  )
}
