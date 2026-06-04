# CTH / Young at Heart — A-Z Audit & Email Branding Pass

**Date:** 2026-06-04
**Scope:** Brand ALL applicant emails (rejection/approval/etc.) + A-Z interconnection audit of exhibitor portal, admin, website, ticket site, and WhatsApp bot.
**Method:** 9-agent parallel audit (8 subsystem auditors + synthesis) cross-checked by hand against source. Two "critical" audit findings were verified as false positives (see below).

---

## 1. Email branding — DONE

Every applicant-facing email now uses the branded Young at Heart editorial template
(white canvas, serif headings, gradient accent rule, event-details block, rich footer).
Each branded send also carries a plain-text fallback for deliverability.

| Email | Before | Now |
|---|---|---|
| Application received (confirmation) | branded | branded (unchanged) |
| Approved (with portal credentials) | branded | branded (unchanged) |
| Delay / "your application is in the queue" | branded | branded (unchanged) |
| **Rejected / not approved** | plain text | **branded** `ApplicationRejected.tsx` |
| **Info requested** | plain text | **branded** `ApplicationInfoRequested.tsx` |
| **Incomplete-application follow-up** | plain text | **branded** `ApplicationIncomplete.tsx` |
| **Exhibitor password reset** | Supabase generic default | **branded** `PasswordReset.tsx` + custom endpoint |
| Campaign / bulk | branded | branded (unchanged) |

New templates: `src/lib/email/templates/{ApplicationRejected,ApplicationInfoRequested,ApplicationIncomplete,PasswordReset}.tsx`
Wired in: `api/applications/[id]/route.ts`, `api/analytics/capture-email/route.ts`, `app/exhibitor/forgot/page.tsx` + new `api/exhibitor/send-password-reset/route.ts`.
All previewable/testable via `GET /api/admin/email-preview?template=<name>&to=<email>` (templates: confirmation, approved, delay, rejected, info_requested, incomplete, password_reset, campaign).

The rejection email tone mirrors the delay-notice voice you supplied — warm, respectful,
"limited stalls / not a reflection of your business / welcome to apply again / come as a visitor."

---

## 2. Interconnection audit — verdict per subsystem

| Subsystem | Verdict | Notes |
|---|---|---|
| Admin | healthy | Auth chain consistent; approve → provision account → email → portal all wired; vendor-ops stall allocation bi-directional. |
| WhatsApp bot | healthy | Webhook signature verify, consent gate, festival-brain routing, outbound send, ticket delivery all wired. Meta WABA creds = ops, not code. |
| Public site | healthy | Apply → /api/applications, capture-email, sectors API, chat widget all resolve. 3 cosmetic notes (below). |
| Build integrity | healthy | `tsc --noEmit` clean; `next build` green; all imports resolve. |
| Email | **fixed** | See section 1. |
| Payments + DB | needs FNB (known) | Provider abstraction (`src/lib/payments/`) sound; FNB creds remaining. |
| Exhibitor portal | healthy | Approve→provision→login→set-password→portal chain intact; pages read live data via exhibitor context. |
| Ticket store | healthy + 1 manual | WooCommerce live for admin/tickets; WhatsApp ticket delivery endpoint complete but needs WP-side webhook registration (below). |

### Verified FALSE POSITIVES (audit over-flagged, confirmed against source)
- **C1 "missing `src/lib/payments.ts`"** — FALSE. `src/lib/payments/index.ts` exists and `@/lib/payments` resolves to it; that's why tsc is clean. No action.
- **C2 "admin/sales 500s the follow-up dashboard"** — OVERSTATED. The follow-up page calls `/api/admin/tickets` + `/api/admin/analytics`, NOT `/api/admin/sales`. `admin/sales` was fully orphaned and silently returned zeros for two phantom tables. **Fixed anyway** (section 3).

---

## 3. Code fixes shipped this pass (non-FNB, non-map)

1. **`api/admin/sales/route.ts`** — rewrote to read real sources: booth revenue from
   `vendor_applications.payment_status/payment_amount` (real v5/v7 columns), ticket revenue
   from WooCommerce `getTicketStats()`. Removed references to phantom `booth_bookings` /
   `ticket_sales` tables that exist in no migration.
2. **Branded password reset** — new `PasswordReset.tsx` + `api/exhibitor/send-password-reset`
   (mints a Supabase recovery `action_link` via service-role `generateLink`, mails it through our
   branded DKIM sender; always returns `{ok:true}` so it never leaks which emails have accounts).
   `forgot` page now calls this instead of Supabase's default.
3. Email branding (section 1).

---

## 4. KNOWN-REMAINING (as you flagged) + manual ops steps

- **FNB payment API** (known): `src/lib/payments/fnb.ts` `isConfigured()` returns false until
  `FNB_*` creds are set in Vercel + return URL `https://cthalaal.co.za/api/payments/fnb/return`
  registered. The self-serve booth `/checkout` page currently simulates completion (no backend
  charge) — this is the FNB-gateway flow and stays mock until creds land. Do not treat it as a
  live till.
- **2D interactive map** (known): floor-plan-2d.
- **MANUAL — FooEvents → WhatsApp ticket delivery:** the endpoint
  `api/whatsapp/deliver-ticket` is complete but WordPress/FooEvents must be configured to POST to
  `https://cthalaal.co.za/api/whatsapp/deliver-ticket` with header `Authorization: Bearer {CRON_SECRET}`.
  Until then ticket PDFs aren't pushed over WhatsApp. (Code is done; this is a WP dashboard step.)

## 5. Backlog (non-blocking)
- M2: payment status writes to portal-state only, not DB columns — pick one source of truth.
- M3: `recordConsent()` should upsert (unique on waPhone+source) to avoid duplicate consent rows.
- L2: `src/lib/ticket-store.ts` Zustand store is dead code (no consumer) — delete or finish.
- Cosmetic: nav "Vendors" → `/apply` (relabel or point to `/vendors`); SectorsSection hard-coded counts vs live `/api/sectors`.
