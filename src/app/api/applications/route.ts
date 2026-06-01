import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { sendEmail } from '@/lib/email/resend'
import { ApplicationConfirmation } from '@/lib/email/templates/ApplicationConfirmation'
import { recordConsent } from '@/lib/wa-consent'
import { toE164 } from '@/lib/whatsapp'

// Validation schema for new applications
const applicationSchema = z.object({
  business_name: z.string().min(1, 'Business name required'),
  business_description: z.string().optional(),
  product_categories: z.array(z.string()).default([]),
  website: z.string().url().optional().or(z.literal('')),
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  contact_name: z.string().min(1, 'Contact name required'),
  email: z.string().email('Valid email required'),
  phone: z.string().min(1, 'Phone number required'),
  preferred_booth_tier: z.string().optional(),
  special_requirements: z.string().optional(),
})

// POST: Create new application (public)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validated = applicationSchema.parse(body)

    const supabase = createAdminClient()

    // Check for duplicate email submission
    const { data: existingApps } = await supabase
      .from('vendor_applications')
      .select('id, status')
      .eq('email', validated.email)

    if (existingApps && existingApps.length > 0) {
      return NextResponse.json(
        { error: 'You have already submitted an application with this email address. Please contact support@youngatheart.co.za if you need to update your application.' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('vendor_applications')
      .insert({
        ...validated,
        website: validated.website || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to submit application' },
        { status: 500 }
      )
    }

    // Auto opt-in (T&C basis): submitting a vendor application = agreeing to
    // receive festival updates and communications. Record WhatsApp consent to
    // the proof ledger. Never blocks the application. STOP still hard-blocks.
    try {
      const waPhone = toE164(validated.phone)
      if (waPhone) {
        const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || undefined
        await recordConsent({
          waPhone,
          source: 'vendor_form',
          ip,
          userAgent: request.headers.get('user-agent') || undefined,
          profileName: validated.business_name,
        })
      }
    } catch (consentError) {
      console.error('[applications] wa consent capture failed:', consentError)
    }

    // Send confirmation email. We never block the applicant on email, but we
    // no longer pretend it worked — the result is logged loudly and returned.
    let emailSent = false
    try {
      const res = await sendEmail({
        to: validated.email,
        subject: 'Application Received - Young at Heart Festival 2026',
        react: ApplicationConfirmation({
          businessName: validated.business_name,
          contactName: validated.contact_name,
          email: validated.email,
        }),
      })
      emailSent = res.ok
      if (!res.ok) {
        console.error(`[applications] confirmation email FAILED for ${validated.email}: ${res.error}`)
      }
    } catch (emailError) {
      console.error('[applications] confirmation email threw:', emailError)
    }

    return NextResponse.json({ success: true, application: data, emailSent })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Application error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET: List applications (admin only)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin (use admin client to bypass RLS on admin_users)
    const admin = createAdminClient()
    const { data: adminUser } = await admin
      .from('admin_users')
      .select()
      .eq('id', user.id)
      .single()

    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Build query (use admin client to bypass RLS)
    let query = admin
      .from('vendor_applications')
      .select('*')
      .order('created_at', { ascending: false })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (search) {
      query = query.or(
        `business_name.ilike.%${search}%,contact_name.ilike.%${search}%,email.ilike.%${search}%`
      )
    }

    const { data, error } = await query

    if (error) {
      console.error('Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch applications' },
        { status: 500 }
      )
    }

    return NextResponse.json({ applications: data })
  } catch (error) {
    console.error('GET applications error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
