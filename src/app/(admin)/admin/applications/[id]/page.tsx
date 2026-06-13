'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import type { VendorApplication, ApplicationStatus } from '@/lib/supabase/types'
import {
  PageShell,
  PageHeader,
  Card,
  Pill,
  ButtonPrimary,
  ButtonSecondary,
  KV,
} from '@/components/chrome/PageChrome'
import {
  ArrowLeft,
  Loader2,
  Globe,
  Instagram,
  Facebook,
  CheckCircle,
  XCircle,
  HelpCircle,
  Save,
} from 'lucide-react'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const STATUS_TONE: Record<string, 'neutral' | 'success' | 'warn' | 'danger' | 'brand'> = {
  approved: 'success',
  rejected: 'danger',
  info_requested: 'warn',
  pending: 'neutral',
}

export default function ApplicationDetailPage() {
  const router = useRouter()
  const params = useParams()
  const [application, setApplication] = useState<VendorApplication | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  useEffect(() => {
    async function loadApplication() {
      try {
        const res = await fetch(`/api/applications/${params.id}`)
        if (res.ok) {
          const data = await res.json()
          setApplication(data.application)
          setAdminNotes(data.application.admin_notes || '')
        } else {
          router.push('/admin/applications')
        }
      } catch (error) {
        console.error('Failed to load application:', error)
      } finally {
        setLoading(false)
      }
    }

    loadApplication()
  }, [params.id, router])

  const updateStatus = async (status: ApplicationStatus) => {
    if (!application) return
    setSaving(true)

    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, admin_notes: adminNotes }),
      })

      if (res.ok) {
        const data = await res.json()
        setApplication(data.application)
      }
    } catch (error) {
      console.error('Failed to update status:', error)
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async () => {
    if (!application) return
    setSaving(true)

    try {
      const res = await fetch(`/api/applications/${application.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: adminNotes }),
      })

      if (res.ok) {
        const data = await res.json()
        setApplication(data.application)
      }
    } catch (error) {
      console.error('Failed to save notes:', error)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-[#E5E5E5]" />
        </div>
      </PageShell>
    )
  }

  if (!application) {
    return null
  }

  return (
    <PageShell>
      <Link
        href="/admin/applications"
        className="inline-flex items-center gap-2 bg-[#FFFFFF] border border-[#E5E5E5]/40 hover:border-[#cd2653]/50 text-[#1B1A17] font-semibold rounded-full px-4 py-2 text-sm transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        All Applications
      </Link>

      <PageHeader
        kicker="Applications"
        title={application.business_name}
        subtitle={`Applied ${formatDate(application.created_at)}`}
        actions={
          <Pill tone={STATUS_TONE[application.status] || 'neutral'}>
            {application.status.replace(/_/g, ' ')}
          </Pill>
        }
      />

      {/* Approved vendors graduate to the relationship view (vendor profile) */}
      {application.status === 'approved' && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 max-w-4xl">
          <div>
            <div className="font-medium text-sm text-emerald-900">This vendor is approved</div>
            <div className="text-xs text-emerald-800 mt-0.5">See the full A-Z profile: documents, messages, contract, payments, activity.</div>
          </div>
          <Link
            href={`/admin/vendors/${application.id}`}
            className="inline-flex items-center justify-center rounded-lg bg-emerald-700 text-white px-4 py-2 text-sm font-medium hover:bg-emerald-800"
          >
            Open vendor profile →
          </Link>
        </div>
      )}

      <div className="grid gap-6 max-w-4xl">
        {/* Contact Info */}
        <Card>
          <h2 className="font-serif text-xl text-[#1B1A17] mb-3">Contact Information</h2>
          <KV label="Contact Name" value={application.contact_name} />
          <KV
            label="Email"
            value={
              <a href={`mailto:${application.email}`} className="font-medium text-[#cd2653] hover:underline">
                {application.email}
              </a>
            }
          />
          <KV
            label="Phone"
            value={
              <a href={`tel:${application.phone}`} className="font-medium">
                {application.phone}
              </a>
            }
          />
          {application.website && (
            <KV
              label="Website"
              value={
                <a
                  href={application.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-[#cd2653] hover:underline inline-flex items-center gap-1.5"
                >
                  <Globe className="w-3.5 h-3.5" />
                  {application.website}
                </a>
              }
            />
          )}

          {(application.instagram || application.facebook) && (
            <div className="flex gap-4 mt-4 pt-4 border-t border-[#E5E5E5]/15">
              {application.instagram && (
                <a
                  href={`https://instagram.com/${application.instagram.replace('@', '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#1B1A17]/65 hover:text-[#cd2653]"
                >
                  <Instagram className="w-4 h-4" />
                  {application.instagram}
                </a>
              )}
              {application.facebook && (
                <a
                  href={application.facebook.startsWith('http') ? application.facebook : `https://facebook.com/${application.facebook}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-[#1B1A17]/65 hover:text-[#cd2653]"
                >
                  <Facebook className="w-4 h-4" />
                  Facebook
                </a>
              )}
            </div>
          )}
        </Card>

        {/* Business Details */}
        <Card>
          <h2 className="font-serif text-xl text-[#1B1A17] mb-4">Business Details</h2>

          {application.business_description && (
            <div className="mb-4">
              <p className="text-sm text-[#1B1A17]/55 mb-1">Description</p>
              <p className="text-[#1B1A17]/85">{application.business_description}</p>
            </div>
          )}

          {application.product_categories.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-[#1B1A17]/55 mb-2">Product Categories</p>
              <div className="flex flex-wrap gap-2">
                {application.product_categories.map((cat) => (
                  <span key={cat} className="px-3 py-1 bg-[#FAFAFA] text-[#1B1A17] rounded-full text-sm">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {application.preferred_booth_tier && (
            <div className="mb-4">
              <p className="text-sm text-[#1B1A17]/55 mb-1">Preferred Booth Tier</p>
              <p className="font-medium">{application.preferred_booth_tier}</p>
            </div>
          )}

          {application.special_requirements && (() => {
            const LABELS: Record<string, string> = {
              traded_before: 'Traded Before',
              social_media: 'Social Media',
              stall_type: 'Stall Type',
              stall_price: 'Stall Price',
              electrical_appliances: 'Electrical Appliances',
              appliance_details: 'Appliance Details',
              uses_gas: 'Uses Gas',
              total_estimate: 'Total Estimate',
            }
            try {
              const data = JSON.parse(application.special_requirements)
              return (
                <div>
                  <p className="text-sm text-[#1B1A17]/55 mb-3">Requirements & Details</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {Object.entries(data).map(([key, val]) => {
                      const label = LABELS[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                      const isPrice = key === 'stall_price' || key === 'total_estimate'
                      const display = isPrice ? `R${Number(val).toLocaleString()}` : String(val).replace(/\\n/g, ', ')
                      return (
                        <div key={key} className="bg-[#FAFAFA] rounded-xl px-4 py-3">
                          <p className="text-xs text-[#1B1A17]/55 font-medium mb-0.5">{label}</p>
                          <p className="text-sm text-[#1B1A17] font-medium">{display}</p>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            } catch {
              return (
                <div>
                  <p className="text-sm text-[#1B1A17]/55 mb-1">Special Requirements</p>
                  <p className="text-[#1B1A17]/85">{application.special_requirements}</p>
                </div>
              )
            }
          })()}
        </Card>

        {/* Payment & Invoices */}
        <Card>
          <h2 className="font-serif text-xl text-[#1B1A17] mb-4">Payment & Invoice</h2>
          {(() => {
            const ALLOC_RE = /⟦PORTAL:([A-Za-z0-9+/=]+)⟧/
            const m = (application.admin_notes as string | null)?.match(ALLOC_RE)
            let pay: { status?: string; amount?: number; provider_ref?: string; paid_at?: string; reference?: string } = {}
            if (m) {
              try { pay = (JSON.parse(atob(m[1])).payment) || {} } catch {}
            }
            const status = (pay.status as string) || 'none'
            const paidLabel = pay.paid_at
              ? new Date(pay.paid_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
              : null
            const toneClass =
              status === 'paid' ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
              : status === 'pending' ? 'bg-blue-50 border-blue-200 text-blue-700'
              : status === 'waived' ? 'bg-neutral-50 border-neutral-200 text-neutral-700'
              : 'bg-amber-50 border-[#cd2653]/30 text-[#cd2653]'
            return (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className={`text-[10px] font-bold uppercase tracking-[0.16em] border px-2.5 py-1 rounded-full ${toneClass}`}>
                    {status}
                  </span>
                  {paidLabel && <span className="text-xs text-neutral-500">paid on {paidLabel}</span>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold">Amount</p>
                    <p className="text-neutral-900 font-bold mt-1">
                      {pay.amount ? `R${pay.amount.toLocaleString()}` : '·'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold">Yoco ref</p>
                    <p className="text-neutral-900 font-mono text-xs mt-1 break-all">
                      {pay.provider_ref || '·'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500 uppercase tracking-wide font-semibold">Internal ref</p>
                    <p className="text-neutral-900 font-mono text-xs mt-1">
                      {pay.reference || (application.id as string).slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>
                {status === 'paid' && (
                  <a
                    href={`/admin/applications/${application.id}/invoice`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 bg-[#cd2653] hover:bg-[#bf3026] text-white font-semibold rounded-full px-4 py-2 text-sm transition-colors"
                  >
                    View &amp; print invoice
                  </a>
                )}
                {status !== 'paid' && (
                  <p className="text-xs text-neutral-500">
                    No paid invoice yet. Mark this vendor paid from <a href="/admin/vendor-ops" className="text-[#cd2653] hover:underline font-semibold">Vendor Ops → Payments</a>.
                  </p>
                )}
              </div>
            )
          })()}
        </Card>

        {/* Admin Notes */}
        <Card>
          <h2 className="font-serif text-xl text-[#1B1A17] mb-4">Admin Notes</h2>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add internal notes about this application..."
            rows={4}
            className="w-full px-4 py-3 bg-white border border-[#E5E5E5]/40 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent resize-none"
          />
          <ButtonSecondary
            onClick={saveNotes}
            disabled={saving}
            className="mt-3 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            Save Notes
          </ButtonSecondary>
        </Card>

        {/* Actions */}
        <Card>
          <h2 className="font-serif text-xl text-[#1B1A17] mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <ButtonPrimary
              onClick={() => updateStatus('approved')}
              disabled={saving || application.status === 'approved'}
              className="flex items-center gap-2"
            >
              <CheckCircle className="w-4 h-4" />
              {application.status === 'approved' ? 'Approved' : 'Approve'}
            </ButtonPrimary>
            <ButtonSecondary
              onClick={() => updateStatus('rejected')}
              disabled={saving || application.status === 'rejected'}
              className="flex items-center gap-2"
            >
              <XCircle className="w-4 h-4" />
              {application.status === 'rejected' ? 'Rejected' : 'Reject'}
            </ButtonSecondary>
            <ButtonSecondary
              onClick={() => updateStatus('info_requested')}
              disabled={saving || application.status === 'info_requested'}
              className="flex items-center gap-2"
            >
              <HelpCircle className="w-4 h-4" />
              {application.status === 'info_requested' ? 'Info Requested' : 'Request Info'}
            </ButtonSecondary>
          </div>

          {application.reviewed_at && (
            <p className="text-sm text-[#1B1A17]/55 mt-4">
              Last reviewed: {formatDate(application.reviewed_at)}
            </p>
          )}
        </Card>
      </div>
    </PageShell>
  )
}
