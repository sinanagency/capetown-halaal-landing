import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/resend'
import { ApplicationApproved } from '@/lib/email/templates/ApplicationApproved'
import { ApplicationRejected } from '@/lib/email/templates/ApplicationRejected'
import { ApplicationInfoRequested } from '@/lib/email/templates/ApplicationInfoRequested'
import { provisionExhibitorAccount } from '@/lib/exhibitor-auth'

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

    // Idempotency: if the application is already in the target status, no-op.
    // Re-running approve was previously a destructive action (it reset the
    // vendor's portal password and re-sent the approval email). This guard
    // makes a double-click safe.
    if (validated.status) {
      const { data: existing } = await admin
        .from('vendor_applications')
        .select('id, status, reviewed_at, business_name, email, contact_name, payment_status, preferred_booth_tier')
        .eq('id', id)
        .single()
      if (existing && existing.status === validated.status && existing.reviewed_at) {
        return NextResponse.json({
          success: true,
          application: existing,
          alreadyInStatus: true,
          emailSent: false,
        })
      }
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

    // Send status notification email. Capture the result so the admin UI can
    // tell the operator whether the applicant was actually notified.
    let emailSent = false
    let emailError: string | undefined
    if (validated.status && data) {
      try {
        let res: { ok: boolean; error?: string } | undefined
        if (validated.status === 'approved') {
          // Create (or reset) the vendor's real portal account + temp password.
          let tempPassword = ''
          try {
            const prov = await provisionExhibitorAccount({
              email: data.email,
              applicationId: id,
              businessName: data.business_name,
            })
            tempPassword = prov.tempPassword
            // best-effort link (auth_user_id column ships in migration v7)
            if (prov.userId) {
              const { error: linkErr } = await createAdminClient()
                .from('vendor_applications')
                .update({ auth_user_id: prov.userId })
                .eq('id', id)
              if (linkErr) console.error('auth_user_id link skipped (migration v7 pending?):', linkErr.message)
            }
          } catch (e) {
            console.error('[approve] account provisioning failed:', (e as Error).message)
          }

          res = await sendEmail({
            to: data.email,
            subject: 'You\'re Approved! Welcome to Young at Heart Festival 2026',
            react: ApplicationApproved({
              businessName: data.business_name,
              contactName: data.contact_name,
              boothTier: data.preferred_booth_tier || undefined,
              applicationId: id,
              tempPassword,
              loginUrl: 'https://cthalaal.co.za/exhibitor/login',
              paymentDueDate: '1 September 2026',
            }),
          })
        } else if (validated.status === 'rejected') {
          res = await sendEmail({
            to: data.email,
            subject: 'An update on your Young at Heart Festival 2026 application',
            react: ApplicationRejected({
              contactName: data.contact_name,
              businessName: data.business_name,
            }),
            text: `Hi ${data.contact_name},\n\nThank you for applying to trade at Young at Heart Festival 2026 with ${data.business_name}, and for your patience while our selection committee reviewed every submission.\n\nWe received an overwhelming number of vendor applications this year, far beyond the spaces we have available. After a careful and fair review, we are not able to offer ${data.business_name} a trading spot at this year's festival.\n\nPlease know this is not a reflection of your business. With limited stalls and so many strong applications, many wonderful vendors could not be accommodated this time. Your details stay on file, and we would warmly welcome a fresh application for future events.\n\nIf you'd like any feedback, simply reply to this email. Questions? support@youngatheart.co.za or +27 65 943 5012.\n\nWarm regards,\nThe Young at Heart Festival Team`,
          })
        } else if (validated.status === 'info_requested') {
          res = await sendEmail({
            to: data.email,
            subject: 'A little more information needed — Young at Heart Festival 2026',
            react: ApplicationInfoRequested({
              contactName: data.contact_name,
              businessName: data.business_name,
            }),
            text: `Hi ${data.contact_name},\n\nThank you for applying to trade at Young at Heart Festival 2026 with ${data.business_name}. Your application is moving through review, and our committee just needs a little more detail before we can finalise a decision.\n\nWhat we need from you:\n- A clear description of what you plan to sell or showcase.\n- A few photos of your products, stall, or previous setups.\n- Your trading licence or relevant certification, if applicable.\n\nSimply reply to this email with the details above and we'll pick your application straight back up. Questions? support@youngatheart.co.za or +27 65 943 5012.\n\nWarm regards,\nThe Young at Heart Festival Team`,
          })
        }
        if (res) {
          emailSent = res.ok
          emailError = res.error
          if (!res.ok) {
            console.error(`[applications/${id}] ${validated.status} email FAILED for ${data.email}: ${res.error}`)
          }
        }
      } catch (e) {
        emailError = (e as Error).message
        console.error('[applications] status email threw:', e)
      }
    }

    return NextResponse.json({ success: true, application: data, emailSent, emailError })
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
