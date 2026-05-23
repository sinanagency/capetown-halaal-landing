import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/resend'
import { ApplicationApproved } from '@/lib/email/templates/ApplicationApproved'
import crypto from 'crypto'

function generateOTP(): string {
  return crypto.randomInt(100000, 999999).toString()
}

// Validation for status updates
const updateSchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected', 'info_requested']).optional(),
  admin_notes: z.string().optional(),
})

// GET: Single application (admin only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin (use admin client to bypass RLS)
    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select()
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await admin
      .from('vendor_applications')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json({ application: data })
  } catch (error) {
    console.error('GET application error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH: Update application status (admin only)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const validated = updateSchema.parse(body)

    const supabase = await createClient()

    // Check auth
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check admin (use admin client to bypass RLS)
    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select()
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update application
    const updateData: Record<string, unknown> = { ...validated }
    if (validated.status) {
      updateData.reviewed_at = new Date().toISOString()
    }

    const { data, error } = await admin
      .from('vendor_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    // On approval, reserve the booth and defer payment to September.
    // Best-effort: payment_status/payment_due_date ship in migration v5.
    // If the migration isn't applied yet, this no-ops instead of breaking approval.
    if (validated.status === 'approved') {
      const { error: payErr } = await admin
        .from('vendor_applications')
        .update({ payment_status: 'deferred', payment_due_date: '2026-09-01' })
        .eq('id', id)
      if (payErr) console.error('Payment defaults skipped (migration v5 pending?):', payErr.message)
    }

    // Send status notification email
    if (validated.status && data) {
      try {
        if (validated.status === 'approved') {
          const otp = generateOTP()
          const otpHash = crypto.createHash('sha256').update(otp).digest('hex')

          // Store OTP (fails gracefully if table missing)
          try {
            const adminSb = createAdminClient()
            await adminSb.from('vendor_otps').insert({
              application_id: id,
              email: data.email,
              otp_hash: otpHash,
              expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
            })
          } catch (otpError) {
            console.error('OTP storage error:', otpError)
          }

          await sendEmail({
            to: data.email,
            subject: 'You\'re Approved! Welcome to Young at Heart Festival 2026',
            react: ApplicationApproved({
              businessName: data.business_name,
              contactName: data.contact_name,
              boothTier: data.preferred_booth_tier || undefined,
              applicationId: id,
              tempPassword: otp,
              loginUrl: 'https://cthalaal.co.za/exhibitor',
              paymentDueDate: '1 September 2026',
            }),
          })
        } else if (validated.status === 'rejected') {
          await sendEmail({
            to: data.email,
            subject: 'Update on Your Application - Young at Heart Festival',
            text: `Hi ${data.contact_name},\n\nThank you for your interest in exhibiting at Young at Heart Festival 2026.\n\nAfter careful review, we regret to inform you that we are unable to approve your application for ${data.business_name} at this time.\n\nThis decision may be due to booth availability, category balance, or other factors. We encourage you to apply again for future events.\n\nIf you have questions, please contact us at support@youngatheart.co.za.\n\nBest regards,\nThe Young at Heart Festival Team`,
          })
        } else if (validated.status === 'info_requested') {
          await sendEmail({
            to: data.email,
            subject: 'Additional Information Needed - Young at Heart Festival',
            text: `Hi ${data.contact_name},\n\nThank you for applying to exhibit at Young at Heart Festival 2026.\n\nWe need some additional information before we can process your application for ${data.business_name}.\n\nPlease reply to this email with the requested details, or contact us at support@youngatheart.co.za.\n\nBest regards,\nThe Young at Heart Festival Team`,
          })
        }
      } catch (emailError) {
        console.error('Email send error:', emailError)
      }
    }

    return NextResponse.json({ success: true, application: data })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
