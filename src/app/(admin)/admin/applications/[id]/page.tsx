'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/admin/StatusBadge'
import type { VendorApplication, ApplicationStatus } from '@/lib/supabase/types'
import {
  ArrowLeft,
  Loader2,
  Building2,
  Mail,
  Phone,
  Globe,
  Calendar,
  Instagram,
  Facebook,
  CheckCircle,
  XCircle,
  HelpCircle,
  Save,
} from 'lucide-react'
import { cn } from '@/lib/utils'

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
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
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-neutral-400" />
      </div>
    )
  }

  if (!application) {
    return null
  }

  return (
    <div className="p-8 max-w-4xl">
      {/* Back Button */}
      <Link
        href="/admin/applications"
        className="inline-flex items-center gap-2 text-neutral-500 hover:text-neutral-700 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Applications
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 mb-2">
            {application.business_name}
          </h1>
          <div className="flex items-center gap-3">
            <StatusBadge status={application.status} />
            <span className="text-neutral-500">
              Applied {formatDate(application.created_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Contact Info */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Contact Information</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-neutral-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Contact Name</p>
                <p className="font-medium">{application.contact_name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                <Mail className="w-5 h-5 text-neutral-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Email</p>
                <a href={`mailto:${application.email}`} className="font-medium text-[#cd2653] hover:underline">
                  {application.email}
                </a>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                <Phone className="w-5 h-5 text-neutral-500" />
              </div>
              <div>
                <p className="text-sm text-neutral-500">Phone</p>
                <a href={`tel:${application.phone}`} className="font-medium">
                  {application.phone}
                </a>
              </div>
            </div>
            {application.website && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-neutral-100 flex items-center justify-center">
                  <Globe className="w-5 h-5 text-neutral-500" />
                </div>
                <div>
                  <p className="text-sm text-neutral-500">Website</p>
                  <a href={application.website} target="_blank" rel="noopener noreferrer" className="font-medium text-[#cd2653] hover:underline">
                    {application.website}
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* Social */}
          <div className="flex gap-3 mt-4 pt-4 border-t border-neutral-100">
            {application.instagram && (
              <a
                href={`https://instagram.com/${application.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-neutral-600 hover:text-[#cd2653]"
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
                className="flex items-center gap-2 text-sm text-neutral-600 hover:text-[#cd2653]"
              >
                <Facebook className="w-4 h-4" />
                Facebook
              </a>
            )}
          </div>
        </div>

        {/* Business Details */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Business Details</h2>

          {application.business_description && (
            <div className="mb-4">
              <p className="text-sm text-neutral-500 mb-1">Description</p>
              <p className="text-neutral-700">{application.business_description}</p>
            </div>
          )}

          {application.product_categories.length > 0 && (
            <div className="mb-4">
              <p className="text-sm text-neutral-500 mb-2">Product Categories</p>
              <div className="flex flex-wrap gap-2">
                {application.product_categories.map((cat) => (
                  <span key={cat} className="px-3 py-1 bg-neutral-100 rounded-full text-sm">
                    {cat}
                  </span>
                ))}
              </div>
            </div>
          )}

          {application.preferred_booth_tier && (
            <div className="mb-4">
              <p className="text-sm text-neutral-500 mb-1">Preferred Booth Tier</p>
              <p className="font-medium">{application.preferred_booth_tier}</p>
            </div>
          )}

          {application.special_requirements && (
            <div>
              <p className="text-sm text-neutral-500 mb-1">Special Requirements</p>
              <p className="text-neutral-700">{application.special_requirements}</p>
            </div>
          )}
        </div>

        {/* Admin Notes */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Admin Notes</h2>
          <textarea
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add internal notes about this application..."
            rows={4}
            className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#cd2653] focus:border-transparent resize-none"
          />
          <button
            onClick={saveNotes}
            disabled={saving}
            className="mt-3 flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-700 rounded-lg hover:bg-neutral-200 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            Save Notes
          </button>
        </div>

        {/* Actions */}
        <div className="bg-white rounded-xl border border-neutral-200 p-6">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Actions</h2>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => updateStatus('approved')}
              disabled={saving || application.status === 'approved'}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50',
                application.status === 'approved'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-green-600 text-white hover:bg-green-700'
              )}
            >
              <CheckCircle className="w-5 h-5" />
              Approve
            </button>
            <button
              onClick={() => updateStatus('rejected')}
              disabled={saving || application.status === 'rejected'}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50',
                application.status === 'rejected'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-red-600 text-white hover:bg-red-700'
              )}
            >
              <XCircle className="w-5 h-5" />
              Reject
            </button>
            <button
              onClick={() => updateStatus('info_requested')}
              disabled={saving || application.status === 'info_requested'}
              className={cn(
                'flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50',
                application.status === 'info_requested'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              )}
            >
              <HelpCircle className="w-5 h-5" />
              Request Info
            </button>
          </div>

          {application.reviewed_at && (
            <p className="text-sm text-neutral-500 mt-4">
              Last reviewed: {formatDate(application.reviewed_at)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
