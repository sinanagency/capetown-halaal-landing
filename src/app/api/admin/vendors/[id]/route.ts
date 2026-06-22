/**
 * PATCH /api/admin/vendors/[id]
 *
 * Amend a vendor's core application fields on the vendor's behalf (Samreen).
 * Whitelisted, role-gated, audited. Writes:
 *   - vendor_applications row: business_name, contact_name, email, phone,
 *     product_categories, preferred_booth_tier, and the
 *     special_requirements.electrical_appliances slice (merged, not clobbered).
 *   - vendor_application_events row { event_type: 'vendor_amended', ... }
 *
 * Auth: admin_users with role 'owner' | 'operator' (same gate as the sibling
 * mark-paid / action endpoints). No new auth helpers invented.
 *
 * Body (all optional, unknown keys ignored):
 *   {
 *     business_name?: string
 *     contact_name?: string
 *     email?: string
 *     phone?: string
 *     product_categories?: string[]
 *     preferred_booth_tier?: string          // must be a key of TIER_META
 *     electrical_appliances?: Record<string, number>  // slug -> qty
 *   }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireOperator } from '@/lib/admin-rbac'
import { TIER_META } from '@/lib/stalls'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Electrical slugs the apply form offers. Mirror of ELECTRICAL_OPTIONS in
// src/app/apply/page.tsx and ELECTRICAL_PRICES in src/lib/payments/pricing.ts.
// We constrain edits to this set so pricing/compute stays in sync.
const ELECTRICAL_SLUGS = new Set([
  'charger-lighting', 'microwave', 'urn', 'single-fryer', 'double-fryer',
  'waffle-pancake-maker', 'blender', 'coffee-machine', 'electric-stove',
  'small-display-fridge', 'large-display-fridge-freezer',
])

// special_requirements may live as a JSON string OR an object on the row.
function readReqs(raw: unknown): Record<string, unknown> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
    } catch {
      return {}
    }
  }
  if (typeof raw === 'object') return { ...(raw as Record<string, unknown>) }
  return {}
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    if (!UUID_RE.test(id)) {
      return NextResponse.json({ error: 'Invalid application id' }, { status: 400 })
    }

    const gate = await requireOperator()
    if (!gate.ok) return gate.response
    const { adminUser } = gate

    const db = createAdminClient()
    const actorEmail = adminUser.email

    const body = await req.json().catch(() => ({}))

    // Pull the current row so we can merge special_requirements without clobbering
    // the rest of it, and produce a meaningful audit diff.
    const { data: before, error: beforeErr } = await db
      .from('vendor_applications')
      .select('id, business_name, contact_name, email, phone, product_categories, preferred_booth_tier, special_requirements')
      .eq('id', id)
      .single()
    if (beforeErr || !before) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const update: Record<string, unknown> = {}
    const changed: string[] = []

    // --- string fields (trim, length-cap) ---
    if (typeof body.business_name === 'string') {
      const val = body.business_name.trim()
      if (!val) return NextResponse.json({ error: 'business_name cannot be empty' }, { status: 400 })
      update.business_name = val.slice(0, 200)
      changed.push('business_name')
    }
    if (typeof body.contact_name === 'string') {
      update.contact_name = body.contact_name.trim().slice(0, 200)
      changed.push('contact_name')
    }
    if (typeof body.email === 'string') {
      const val = body.email.trim()
      if (val && !EMAIL_RE.test(val)) {
        return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
      }
      update.email = val.slice(0, 320)
      changed.push('email')
    }
    if (typeof body.phone === 'string') {
      // Keep digits, +, spaces, parens, dashes; reject if no digit present.
      const val = body.phone.trim()
      if (val && !/\d/.test(val)) {
        return NextResponse.json({ error: 'Invalid phone number' }, { status: 400 })
      }
      update.phone = val.replace(/[^\d+()\-\s]/g, '').slice(0, 40)
      changed.push('phone')
    }

    // --- product_categories (string[]) ---
    if (Array.isArray(body.product_categories)) {
      const cats = body.product_categories
        .filter((c: unknown): c is string => typeof c === 'string')
        .map((c: string) => c.trim())
        .filter(Boolean)
        .slice(0, 20)
      update.product_categories = cats
      changed.push('product_categories')
    }

    // --- preferred_booth_tier (constrained to TIER_META keys) ---
    if (typeof body.preferred_booth_tier === 'string') {
      const tier = body.preferred_booth_tier.trim()
      if (tier && !TIER_META[tier]) {
        return NextResponse.json(
          { error: `Invalid stall tier: ${tier}`, valid_tiers: Object.keys(TIER_META) },
          { status: 400 }
        )
      }
      update.preferred_booth_tier = tier || null
      changed.push('preferred_booth_tier')
    }

    // --- electrical_appliances (merged into special_requirements JSON) ---
    if (body.electrical_appliances && typeof body.electrical_appliances === 'object' && !Array.isArray(body.electrical_appliances)) {
      const cleaned: Record<string, number> = {}
      for (const [slug, qty] of Object.entries(body.electrical_appliances as Record<string, unknown>)) {
        if (!ELECTRICAL_SLUGS.has(slug)) continue // whitelist only
        const q = Math.max(0, Math.floor(Number(qty) || 0))
        if (q > 0) cleaned[slug] = q
      }
      const reqs = readReqs((before as { special_requirements?: unknown }).special_requirements)
      reqs.electrical_appliances = cleaned
      // Persist as a JSON string to match how the apply form writes the column.
      update.special_requirements = JSON.stringify(reqs)
      changed.push('electrical_appliances')
    }

    if (changed.length === 0) {
      return NextResponse.json({ error: 'No editable fields supplied' }, { status: 400 })
    }

    const { data: after, error: updErr } = await db
      .from('vendor_applications')
      .update(update)
      .eq('id', id)
      .select('id, business_name, contact_name, email, phone, product_categories, preferred_booth_tier, special_requirements')
      .single()
    if (updErr || !after) {
      console.error('[vendors PATCH] update error:', updErr?.message)
      return NextResponse.json({ error: updErr?.message || 'Update failed' }, { status: 500 })
    }

    // Audit row — never block the response on a logging failure.
    try {
      await db.from('vendor_application_events').insert({
        application_id: id,
        event_type: 'vendor_amended',
        after_value: { changed, fields: update },
        actor_email: actorEmail,
        actor_role: 'operator',
        note: `Amended ${changed.join(', ')}`,
      })
    } catch (e) {
      console.warn('[vendors PATCH] event log insert failed:', (e as Error).message)
    }

    return NextResponse.json({ ok: true, updated: after, changed })
  } catch (err) {
    console.error('[vendors PATCH] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
