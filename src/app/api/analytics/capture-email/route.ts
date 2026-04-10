import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email/resend'

export async function POST(req: NextRequest) {
  try {
    const { email, name, business } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Check if we already captured this email (don't spam)
    const { data: existing } = await admin
      .from('site_events')
      .select('id')
      .eq('event_type', 'apply_email_captured')
      .contains('metadata', { email })
      .limit(1)

    if (existing && existing.length > 0) {
      return NextResponse.json({ ok: true, already_captured: true })
    }

    // Store the captured email
    await admin.from('site_events').insert({
      session_id: 'capture',
      event_type: 'apply_email_captured',
      path: '/apply',
      metadata: { email, name: name || '', business: business || '' },
    })

    // Send follow-up email to the potential vendor
    try {
      await sendEmail({
        to: email,
        subject: 'Complete Your Vendor Application — Young at Heart Festival 2026',
        text: `Hi ${name || 'there'},

We noticed you started a vendor application for ${business ? business + ' at ' : ''}Young at Heart Festival 2026 but didn't complete it.

We'd love to have you! Here's what you need to know:
- 264 booth spaces available across food, fashion, wellness, and more
- Booth prices from R3,700 to R12,000
- Festival dates: December 11-13, 2026 at Youngsfield Military Base, Cape Town
- 25,000+ expected visitors over 3 days

Complete your application here: https://cthalaal.co.za/apply

Spots are filling up fast. If you have any questions, reply to this email or contact us at:
- Email: support@youngatheart.co.za
- Phone: 065 943 5012
- Instagram: @youngatheart_capetown

We look forward to welcoming you!

Warm regards,
The Young at Heart Festival Team
youngatheart.co.za`,
      })
    } catch (emailError) {
      console.error('Capture email send error:', emailError)
    }

    // Also notify Samreen via CC (send separate email to admin)
    try {
      await sendEmail({
        to: 'capetownhalaal@gmail.com',
        subject: `[Lead] ${business || email} started but didn't complete vendor application`,
        text: `A potential vendor started the application but didn't finish.

Email: ${email}
Name: ${name || 'Not provided'}
Business: ${business || 'Not provided'}

They've been sent a follow-up email automatically.

View all applications: https://cthalaal.co.za/admin/applications
Follow up page: https://cthalaal.co.za/admin/follow-up`,
      })
    } catch (adminEmailError) {
      console.error('Admin notification error:', adminEmailError)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true }) // Never break UX
  }
}
