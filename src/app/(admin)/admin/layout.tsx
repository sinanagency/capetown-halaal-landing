import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
  }

  if (!isAdmin) {
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
