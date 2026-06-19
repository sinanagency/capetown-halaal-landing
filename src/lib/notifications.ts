import { createAdminClient } from './supabase/admin'
import { sendTemplate } from './whatsapp'
import { sendEmail } from './email/resend'

type NotificationChannel = 'whatsapp' | 'email'

type NotifyEvent =
  | 'stall_allocated'
  | 'document_approved'
  | 'document_rejected'

interface NotifyVendorParams {
  event: NotifyEvent
  applicationId: string
  data?: Record<string, string>
}

export async function notifyVendor(params: NotifyVendorParams) {
  const supabase = createAdminClient()

  const { data: app } = await supabase
    .from('vendor_applications')
    .select('business_name, email, phone, admin_notes')
    .eq('id', params.applicationId)
    .single()

  if (!app) return

  const state = JSON.parse(Buffer.from(
    (app.admin_notes || '').match(/⟦PORTAL:([A-Za-z0-9+/=]+)⟧/)?.[1] || 'e30=',
    'base64'
  ).toString() || '{}')

  const prefs = state.notification_preferences || {}

  const shouldSend = (channel: NotificationChannel, eventKey: string): boolean => {
    return prefs[`${eventKey}_${channel}`] !== false
  }

  const templates: Record<NotifyEvent, {
    waTemplate?: string
    emailSubject: string
    emailBody: string
  }> = {
    stall_allocated: {
      waTemplate: 'stall_allocated',
      emailSubject: `Your stall has been allocated — ${params.data?.stall || ''}`,
      emailBody: `Hi ${app.business_name},\n\nYour stall ${params.data?.stall || ''} has been allocated. Log in to the exhibitor portal to view your placement on the floor plan.\n\nExhibitor portal: https://cthalaal.co.za/exhibitor/portal/stand`,
    },
    document_approved: {
      waTemplate: 'document_approved',
      emailSubject: 'Document approved',
      emailBody: `Hi ${app.business_name},\n\nYour ${params.data?.docType || 'document'} has been approved. Thank you for submitting.\n\nExhibitor portal: https://cthalaal.co.za/exhibitor/portal/documents`,
    },
    document_rejected: {
      waTemplate: 'document_rejected',
      emailSubject: 'Document needs attention',
      emailBody: `Hi ${app.business_name},\n\nYour ${params.data?.docType || 'document'} was not approved. Reason: ${params.data?.reason || 'Please upload a valid version.'}\n\nPlease log in to upload a replacement: https://cthalaal.co.za/exhibitor/portal/documents`,
    },
  }

  const tpl = templates[params.event]

  if (app.phone && shouldSend('whatsapp', params.event) && tpl.waTemplate) {
    try {
      await sendTemplate(app.phone, tpl.waTemplate, [app.business_name])
    } catch (e) {
      console.error(`[notify] WA failed for ${params.applicationId}:`, e)
    }
  }

  if (app.email && shouldSend('email', params.event)) {
    try {
      await sendEmail({
        to: app.email,
        subject: tpl.emailSubject,
        text: tpl.emailBody,
      })
    } catch (e) {
      console.error(`[notify] Email failed for ${params.applicationId}:`, e)
    }
  }
}
