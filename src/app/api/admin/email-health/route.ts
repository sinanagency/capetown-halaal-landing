import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyEmailTransport } from '@/lib/email/resend'
import { verifyCronAuth } from '@/lib/security/cron-auth'

// GET /api/admin/email-health
// Verifies SMTP connectivity + auth from the live runtime without sending mail.
// Auth: admin session OR `Authorization: Bearer ${CRON_SECRET}` header.
export async function GET(request: NextRequest) {
  // Header-only Bearer (constant-time). `?secret=` query branch removed
  // because it leaks into access logs / browser history / referrers.
  let authorized = verifyCronAuth(request.headers.get('authorization'))
  if (!authorized) {
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
        if (adminUser) authorized = true
      }
    } catch {
      // fall through to 401
    }
  }

  if (!authorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const transport = await verifyEmailTransport()
  // Resend-only since 2026-06-08 (GoDaddy SMTP removed; mail was landing in spam).
  const healthy = transport.resend.ok && transport.resendKeySet

  return NextResponse.json(
    { healthy, transport, checkedAt: new Date().toISOString() },
    { status: healthy ? 200 : 503 }
  )
}
