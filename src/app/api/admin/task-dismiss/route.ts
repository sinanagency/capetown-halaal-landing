import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const { taskId } = await req.json()
    if (!taskId) {
      return NextResponse.json({ error: 'taskId required' }, { status: 400 })
    }

    // Log dismissal to site_events for persistence across sessions
    const supabase = createAdminClient()
    await supabase.from('site_events').insert({
      session_id: 'admin-tasks',
      event_type: 'task_dismissed',
      path: '/admin',
      metadata: { task_id: taskId, dismissed_at: new Date().toISOString() },
    })

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
