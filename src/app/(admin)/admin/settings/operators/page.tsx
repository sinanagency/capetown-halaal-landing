import Link from 'next/link'
import { ArrowLeft, Users } from 'lucide-react'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Reads the admin_users row count via the service-role client. The admin
// layout already gates this route behind a valid admin role, so it is safe
// to bypass RLS for a single COUNT. Falls back to `null` so the UI degrades
// gracefully if the table or env is missing.
async function getOperatorCount(): Promise<number | null> {
  try {
    const admin = createAdminClient()
    const { count, error } = await admin
      .from('admin_users')
      .select('*', { count: 'exact', head: true })
    if (error) return null
    return count ?? null
  } catch {
    return null
  }
}

export default async function SettingsOperatorsPage() {
  const count = await getOperatorCount()

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link
        href="/admin/settings"
        className="inline-flex items-center gap-1 text-xs text-neutral-500 hover:text-neutral-700 mb-4"
      >
        <ArrowLeft className="w-3 h-3" /> Back to Settings
      </Link>
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-neutral-900">Operators</h1>
        <p className="text-sm text-neutral-500 mt-1">
          Admin users with access to this portal.
        </p>
      </header>

      <div className="bg-white border border-neutral-200 rounded-xl p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-lg bg-[#cd2653]/10 text-[#cd2653]">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider text-neutral-400">Operators in admin_users</p>
            <p className="text-3xl font-bold text-neutral-900 mt-1">
              {count === null ? '—' : count}
            </p>
          </div>
        </div>
        <p className="text-sm text-neutral-500 mt-6">
          Operators management coming soon. For now, seats are provisioned directly in Supabase.
        </p>
      </div>
    </div>
  )
}
