import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { requirePaid } from '@/lib/exhibitor-paygate'
import { getExhibitorContext } from '@/lib/exhibitor'
import { parsePortalState } from '@/lib/portal-state'
import { parseAllocation, TIER_META } from '@/lib/stalls'
import { ChangeRequestForm } from './ChangeRequestForm'

export const dynamic = 'force-dynamic'

export default async function StandChangePage() {
  await requirePaid()
  const ctx = await getExhibitorContext()
  const app = (ctx?.application as Record<string, unknown>) || {}
  const notes = (app.admin_notes as string) || ''
  const state = parsePortalState(notes)
  const allocation = parseAllocation(notes)
  const currentTier = (app.preferred_booth_tier as string) || ''
  const currentTierLabel = TIER_META[currentTier]?.label || currentTier || 'Not set'
  const stallCode = allocation.stall || null
  const existingRequest = state.stallChangeRequest || null

  const tiers = Object.entries(TIER_META).map(([slug, meta]) => ({
    slug,
    label: meta.label,
    price: meta.price,
  }))

  return (
    <div className="bg-[#FAFAF8] -mx-4 sm:-mx-6 px-4 sm:px-6 py-6 min-h-[calc(100vh-72px)]">
      <div className="max-w-3xl mx-auto space-y-6">
        <Link
          href="/exhibitor/portal/stand"
          className="inline-flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to My Stand
        </Link>

        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-[#cd2653] font-semibold">Change Request</p>
          <h1 className="font-serif text-3xl text-neutral-900 mt-1">Request a stall change</h1>
        </div>

        {existingRequest && existingRequest.status === 'pending' ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-center">
            <p className="text-sm font-medium text-amber-800">
              You have a pending change request from {existingRequest.currentTier || 'your current tier'} to {existingRequest.requestedTier}.
            </p>
            <p className="text-xs text-amber-600 mt-1">
              The organisers will review your request. Check back here for updates, or contact support@youngatheart.co.za.
            </p>
          </div>
        ) : existingRequest && existingRequest.status === 'approved' ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-6 text-center">
            <p className="text-sm font-medium text-emerald-800">
              Your change request to {existingRequest.requestedTier} has been approved.
            </p>
            <p className="text-xs text-emerald-600 mt-1">
              Your stall has been updated. Check your My Stand page for the new details.
            </p>
          </div>
        ) : (
          <ChangeRequestForm
            currentTier={currentTier}
            currentTierLabel={currentTierLabel}
            stallCode={stallCode}
            tiers={tiers}
          />
        )}
      </div>
    </div>
  )
}
