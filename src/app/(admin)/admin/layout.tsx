import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminSidebar } from '@/components/admin/AdminSidebar'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let isAuthenticated = false
  let isAdmin = false

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      isAuthenticated = true
      const { data: adminUser } = await supabase
        .from('admin_users')
        .select()
        .eq('id', user.id)
        .single()
      if (adminUser) isAdmin = true
    }
  } catch {
    // Auth check failed, treat as unauthenticated
  }

  // If not authenticated or not admin, render children without sidebar
  // (the login page will render, or redirect middleware handles it)
  if (!isAuthenticated || !isAdmin) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-neutral-50">
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}
