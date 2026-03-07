import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { getResend, FROM_EMAIL } from '@/lib/email/resend'
import { ApplicationApproved } from '@/lib/email/templates/ApplicationApproved'

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

    // Check admin
    const { data: adminUser } = await supabase
      .from('admin_users')
      .select()
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
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

    // Check admin
    const { data: adminUser } = await supabase
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

    const { data, error } = await supabase
      .from('vendor_applications')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Update error:', error)
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    // Send status notification email
    const resend = getResend()
    if (resend && validated.status && data) {
      try {
        if (validated.status === 'approved') {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: data.email,
            subject: 'Congratulations! Your Application Has Been Approved',
            react: ApplicationApproved({
              businessName: data.business_name,
              contactName: data.contact_name,
              boothTier: data.preferred_booth_tier || undefined,
            }),
          })
        } else if (validated.status === 'rejected') {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: data.email,
            subject: 'Update on Your Application - Young at Heart Festival',
            text: `Hi ${data.contact_name},\n\nThank you for your interest in exhibiting at Young at Heart Festival 2026.\n\nAfter careful review, we regret to inform you that we are unable to approve your application for ${data.business_name} at this time.\n\nThis decision may be due to booth availability, category balance, or other factors. We encourage you to apply again for future events.\n\nIf you have questions, please contact us at exhibitors@cthalaal.co.za.\n\nBest regards,\nThe Young at Heart Festival Team`,
          })
        } else if (validated.status === 'info_requested') {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: data.email,
            subject: 'Additional Information Needed - Young at Heart Festival',
            text: `Hi ${data.contact_name},\n\nThank you for applying to exhibit at Young at Heart Festival 2026.\n\nWe need some additional information before we can process your application for ${data.business_name}.\n\nPlease reply to this email with the requested details, or contact us at exhibitors@cthalaal.co.za.\n\nBest regards,\nThe Young at Heart Festival Team`,
          })
        }
      } catch (emailError) {
        console.error('Email send error:', emailError)
        // Don't fail the request if email fails
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
