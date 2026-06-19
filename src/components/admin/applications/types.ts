// Shared types for the triage workbench.
// Lives alongside the workbench components so we never reach into supabase/types
// from a UI file for a one-off projection.

import type { VendorApplication } from '@/lib/supabase/types'

// The extra columns the workbench needs that are NOT in the existing
// VendorApplication interface (migration 20260615_pipeline_columns ships them).
// We keep them optional so existing call-sites that still type as
// VendorApplication don't break, and we cast at the API boundary.
export interface WorkbenchApplication extends VendorApplication {
  sector?: string | null
  is_duplicate?: boolean | null
  duplicate_of_id?: string | null
  superseded_at?: string | null
  approved_at?: string | null
  paid_at?: string | null
  docs_complete_at?: string | null
  payment_status?: string | null
  docCount?: number | null
  docs_rejected?: boolean | null
  contract_signed?: boolean | null
  stall_code?: string | null
}

export interface SectorSuggestion {
  value: string
  confidence: number
}

export interface SuggestResponse {
  sector_suggestions: SectorSuggestion[]
  completeness_score: number | null
  dupe_of: string[]
}

export interface AuditEvent {
  id: string
  application_id: string
  event_type: string
  before_value: Record<string, unknown> | null
  after_value: Record<string, unknown> | null
  actor_email: string | null
  actor_role: string | null
  note: string | null
  created_at: string
}

export type SingleAction = 'approve' | 'reject' | 'request_info' | 'tag' | 'snooze'
export type BulkAction = 'approve' | 'reject' | 'request_info' | 'tag'

// Templates for the "request info" reason picker. Wired from Agent 2's
// templates eventually, but until then this list keeps Samreen unblocked.
export const INFO_REQUEST_TEMPLATES: Array<{ key: string; label: string; body: string }> = [
  { key: 'docs',     label: 'Outstanding documents',  body: 'We still need your halaal certificate and trading licence to finalise review.' },
  { key: 'photos',   label: 'Product photos',         body: 'Please send 3 to 5 photos of your products or previous stall setup.' },
  { key: 'desc',     label: 'Clearer description',    body: 'Could you share a clearer description of what you plan to sell at the festival?' },
  { key: 'category', label: 'Confirm category',       body: 'Please confirm which category best fits your offering (food, retail, kids, etc.).' },
]

// Sector palette used for the `t` cycle-tag shortcut. Agent 2 ships a richer
// list via the suggest API; this is the static fallback so the keyboard
// shortcut always works.
export const SECTOR_CYCLE: string[] = [
  'food',
  'retail',
  'kids',
  'services',
  'wellness',
  'art',
  'tech',
  'other',
]
