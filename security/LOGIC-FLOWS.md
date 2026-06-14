# CTH Logic Flow Integrity Audit
Date: 2026-06-15
Scope: 10 end-to-end user journeys traced through `~/Code/capetown-halaal-landing`
Method: Read-only static trace; cite `file:line` for every claim.

---

## Flow 1 — Vendor: apply → festival-day-ready

| # | Step | Wired? | File:line | Notes |
|---|---|---|---|---|
| 1 | Public `/apply` submit → `vendor_applications` insert | ✅ | `src/app/api/applications/route.ts:123` | 5-field schema (Agent 9 cut); honeypot + token guard + IP throttle. |
| 2 | Confirmation email to applicant | ✅ | `src/app/api/applications/route.ts:165` | Resend; `emailSent` truthfully returned. |
| 3 | Owner notification | ✅ | `src/app/api/applications/route.ts:184` | `notifyOwners({event:'application_received'})`. |
| 4 | WA template ack to applicant | ✅ | `src/app/api/applications/route.ts:198` | `vendor_application_received` utility template. |
| 5 | WA consent recorded | ✅ | `src/app/api/applications/route.ts:149` | T&C basis, opt-out via STOP. |
| 6 | Row appears in `/admin/applications` queue | ✅ | `src/app/api/applications/route.ts:252` ; `src/app/(admin)/admin/applications/page.tsx:302` (keydown handler) | Suggest AI hint fires on focus. |
| 7 | Admin presses `a` → PATCH `/api/applications/[id]` → `status='approved'`, `reviewed_at` | ✅ | `src/app/api/applications/[id]/route.ts:114-128` | Idempotent on double-press (line 97). |
| 8 | `vendor_application_events` audit row on approve | ❌ | `src/app/api/applications/[id]/route.ts` (no insert) | Bulk approve writes events (`bulk/route.ts:189`), single-row PATCH does NOT. Audit trail missing for the most common code path. |
| 9 | `payment_status='deferred'` + `payment_due_date` set on approve | ✅ | `src/app/api/applications/[id]/route.ts:138-147` | T+30 days. |
| 10 | Approval email to vendor with temp password | ✅ | `src/app/api/applications/[id]/route.ts:184` | `ApplicationApproved` React template. |
| 11 | Approval WA (`vendor_application_approved`) | ✅ | `src/app/api/applications/[id]/route.ts:215` | 2 params (firstName + stallCode placeholder if not allocated). Logs to `wa_messages` (line 225). |
| 12 | Auth user provisioned + `auth_user_id` linked | ✅ | `src/app/api/applications/[id]/route.ts:160-173` ; `src/lib/exhibitor-auth.ts:39` | CSPRNG temp password, idempotent on re-approve. |
| 13 | `/exhibitor/login` works for vendor | ✅ | `src/app/api/exhibitor/login/route.ts` | application_id in user_metadata; resolved via `getExhibitorContext`. |
| 14 | Portal Overview renders TaskChecklist | ✅ | `src/app/exhibitor/portal/page.tsx:113` | 6 steps wired to working CTAs (terms/payments/stand/documents/staff). |
| 15 | Vendor signs contract → `contract_signed_at` set + PDF stored | ✅ | `src/app/api/exhibitor/contract/sign/route.ts:71-84` | `site_events` row written (line 88), but NOT `vendor_application_events`. |
| 16 | Admin sees contract signed in `/admin/vendors/[id]` | ✅ | `src/app/(admin)/admin/vendors/[id]/VendorProfileClient.tsx:46,196,330` | Timeline + badge. |
| 17 | Vendor pays via Yoco; webhook confirms | ✅ | `src/app/api/payments/yoco/webhook/route.ts:62` → `src/lib/payments/confirm.ts:124` | Standard-Webhooks signed; idempotent. |
| 18 | `vendor_applications.payment_status='paid'` flipped on payment | ❌ | `src/lib/payments/confirm.ts:124-134` | Confirm writes `portal_state.payment.status='paid'` (admin_notes JSON) and `state.stage='paid'`, but does **NOT** touch the top-level `vendor_applications.payment_status` column. Some reads (e.g. `portal/page.tsx:66`) check both; admin dashboards reading the column will lie. |
| 19 | `paid_at` on `vendor_applications` set on payment | ❌ | same | Lives in `state.payment.paid_at` only. No column write. |
| 20 | Admin notified on payment success | ✅ | `src/lib/payments/confirm.ts:161` | `notifyOwners({event:'payment_succeeded'})`. |
| 21 | Vendor uploads doc → `portal_state.docs[]` + `site_events` | ✅ | `src/app/api/exhibitor/documents/route.ts:62-81` | Replaces same-type slot; logs `vendor_doc_uploaded`. |
| 22 | Admin sees pending doc in Documents section | ✅ | `src/app/api/admin/vendors/[id]/summary/route.ts:72` | Inherited from admin_notes JSON. |
| 23 | Vendor adds staff → portal_state.staff[] | ✅ | `src/app/api/exhibitor/staff/route.ts:32` | Plain JSON list TODAY. |
| 24 | Staff badges minted via FooEvents signed QR | 🟠 | (no code) | Promise-only. Long-term spec; nothing wired today. Staff is a flat list, no badge artefact, no QR. |
| 25 | Admin allocates `STALL:FS17` via `/admin/allocation` | ✅ | `src/app/api/admin/stalls/route.ts:142-144` | `withAllocation` writes `⟦STALL:FS17⟧` marker to `admin_notes`. |
| 26 | `vendor_stall_allocation` WA fires to vendor | ✅ | `src/app/api/admin/stalls/route.ts:148-167` | First name + stall code + zone. |
| 27 | Vendor Overview shows new stall code | ✅ | `src/app/exhibitor/portal/page.tsx:54,75,124` | Reads `parseAllocation(notes).stall` on every page load. |

**FIX ❌#8 — Missing event log on single-row approve.** Insert into `vendor_application_events` immediately after the `vendor_applications` update in `PATCH /api/applications/[id]` for `status_change`. Same shape as `bulk/route.ts:185-190`.

**FIX ❌#18+19 — Payment column drift.** In `src/lib/payments/confirm.ts` after `updatePortalState`, also write `vendor_applications.payment_status='paid'` and `paid_at=NOW()`. Otherwise the admin queue, CSV export, and `vendor-list` API show stale `deferred`.

---

## Flow 2 — Ticket buyer: discover → buy → ticket → gate

| # | Step | Wired? | File:line | Notes |
|---|---|---|---|---|
| 1 | Homepage CTA → external WC checkout on `tickets.youngatheart.co.za` | ✅ | (out of repo) | Not in Next codebase by design (Law 3). |
| 2 | WC processes via Yoco, FooEvents mints PDF | ✅ | (FooEvents) | Out of fork (Law 3). |
| 3 | WP→Next webhook delivers PDF to WA buyer | ✅ | `src/app/api/whatsapp/deliver-ticket/route.ts:24` | `verifyCronAuth(Bearer)` gated. NOT "wide open" — earlier Skeptic flag obsolete. |
| 4 | Idempotent re-delivery guard | ✅ | `src/app/api/whatsapp/deliver-ticket/route.ts:50-55` ; `src/lib/idempotency-guards.ts` | 24h `wasTicketDelivered` check by order id. |
| 5 | WA consent + `ticket_buyers` upsert (identity) | ✅ | `src/app/api/whatsapp/deliver-ticket/route.ts:58, 106-142` | Normalized email; correct count/spend bump. |
| 6 | Day-of gate scanner (QR check-in) | ❌ | (no code in repo) | No scanner UI, no `/scan` route, no FooEvents check-in handler. Either the WordPress FooEvents UI is the scanner (out of Next), or it does not exist yet. Per spec, this is "the scanner is ???". |
| 7 | Buyer forwards ticket to a friend | ❌ | (no code) | No forward UI. Buyer must screenshot. |
| 8 | Refund request path | 🔴 | `src/app/refund-policy/page.tsx` only | Refund POLICY page exists; no operational refund endpoint, no button, no admin flow. |

**FIX ❌#6 — Scanner.** Either (a) confirm with operator that the FooEvents WP plugin gate scanner is configured for show day, or (b) build a thin `/scan` page in Next that hits the FooEvents `?attendee_check_in=` URL.

**FIX 🔴#8 — Refund.** Add `/exhibitor/portal/support`-style ticket support contact form OR a refund-request endpoint that creates a `support_inbox_threads` row tagged `refund`.

---

## Flow 3 — Buyer-side abandoned-cart recovery

| # | Step | Wired? | File:line | Notes |
|---|---|---|---|---|
| 1 | `/admin/follow-up` shows funnel buckets | ✅ | `src/app/(admin)/admin/follow-up/page.tsx:143-148, 236` | Apply drop-offs from `viewedApply - submitted`. |
| 2 | Samreen clicks Chase → ChaseComposer opens | ✅ | `src/app/(admin)/admin/follow-up/page.tsx:11, 286, 456` | Pre-filled per-row + bulk variants. |
| 3 | Send email + WA in one call | ✅ | `src/app/api/admin/chase/route.ts:208, 284` | Dedupe by email/phone, allowlisted templates. |
| 4 | Audit row in `vendor_application_events` (chase_email, chase_whatsapp) | ✅ | `src/app/api/admin/chase/route.ts:265, 314` | Only for rows with `vendor_application_id`; pre-application capture-email rows have no app id → no event row. |
| 5 | `mail_messages` row + outbound WA `wa_messages` | ✅ | `src/app/api/admin/chase/route.ts:246` ; sendTemplate wrapper | Buyer timeline shows chase. |

Integrity: ✅ wired end-to-end. Light gap: capture-email rows (no application_id) leave no per-buyer event trail.

---

## Flow 4 — Support inbox round-trip

| # | Step | Wired? | File:line | Notes |
|---|---|---|---|---|
| 1 | IMAP poller fetches `support@youngatheart.co.za` every 2 min | ✅ | `src/app/api/cron/support-mail-fetcher/route.ts:24-26` | `verifyCronAuth` gated. |
| 2 | Thread lands in `/admin/support-inbox` | ✅ | `src/app/api/admin/support-inbox/threads/route.ts` | Inbox UI reads `support_inbox_threads`. |
| 3 | Samreen replies via inbox UI → Resend send + DB persist | ✅ | `src/app/api/admin/support-inbox/[id]/reply/route.ts:54-70` | **Outbound row inserted DIRECTLY at reply time (line 58-69)** — Samreen sees her message in the thread immediately, no webhook race. |
| 4 | Resend webhook mirrors `email.sent` (redundancy) | ✅ | `src/app/api/admin/support-inbox/webhook/resend/route.ts:89-106` | Svix-signed in prod; idempotent on `provider_message_id`. |
| 5 | Vendor's reply IMAP-fetched, chain continues | ✅ | `src/app/api/cron/support-mail-fetcher/route.ts:40-52` | `findVendorByEmail` links thread to vendor. |
| 6 | Vendor sends from portal `/exhibitor/portal/support` | ✅ | `src/app/api/exhibitor/support/route.ts` (109 lines) | Lands in same `support_inbox_threads` backend. |

Integrity: ✅ wired end-to-end. Strongest flow in the system.

---

## Flow 5 — Bot inbox triage

| # | Step | Wired? | File:line | Notes |
|---|---|---|---|---|
| 1 | Meta webhook signature-verified | ✅ | `src/app/api/whatsapp/webhook/route.ts:89` | `verifySignature(raw, header)` byte-for-byte. |
| 2 | Per-sender LLM rate limit (10 / 5 min) | ✅ | `src/app/api/whatsapp/webhook/route.ts:41-61` | Process-local Map; logs `wa_llm_throttled`. |
| 3 | Festival Brain replies via Haiku | ✅ | `src/lib/festival-brain.ts` (import) | reply-guard PII redact. |
| 4 | Handover to human on unmatched → notifyOwners | ✅ | `src/app/api/whatsapp/webhook/route.ts:240-263` | `escalateToHuman` + `notifyOwners({event:'wa_handover'})`. |
| 5 | Thread surfaces in `/admin/bot-inbox` | ✅ | `src/app/(admin)/admin/bot-inbox/page.tsx` | Reads `wa_threads` from migration v11. |
| 6 | Snooze / assign / tag / link-to-vendor | ✅ | `src/app/api/admin/bot-inbox/thread/action/route.ts:46-83` | All 7 actions wired; upserts `wa_threads`. |
| 7 | Phone → vendor name resolution | ✅ | `src/lib/bot/identity.ts:41, 60-97` | Tries `phone` + `phoneNoPlus`; falls through to `ticket_buyers`. |

Integrity: ✅ wired end-to-end. Stream D from last sprint landed clean.

---

## Flow 6 — Festival reminders cron

| # | Step | Wired? | File:line | Notes |
|---|---|---|---|---|
| 1 | Cron auth (CRON_SECRET Bearer) | ✅ | `src/app/api/cron/festival-reminders/route.ts:124-128` | Required when secret set. |
| 2 | T-N window decision (7/3/1) | ✅ | `src/app/api/cron/festival-reminders/route.ts:138-146` | Skips silently if no window. |
| 3 | Window-mismatch guard (179-day smoke bug fix) | ✅ | `src/app/api/cron/festival-reminders/route.ts:153-173` | `?force=1` required to override; logs `festival_reminder_blocked`. |
| 4 | Per-vendor idempotency marker | ✅ | `src/app/api/cron/festival-reminders/route.ts:196-200` | `state.festival_reminders.sent[<window>]`. |
| 5 | Per-buyer dedupe via `site_events` | ✅ | (route.ts buyer loop) | `event_type='festival_reminder_buyer'` checked before send. |

Integrity: ✅ wired end-to-end. Cron-only Bearer + window guard + idempotency = safe loop.

---

## Flow 7 — Broadcast send (admin → vendors)

| # | Step | Wired? | File:line | Notes |
|---|---|---|---|---|
| 1 | Filter UI (sector / tier / status / docs / paid) | ✅ | `src/app/(admin)/admin/broadcast/page.tsx:106-115` | All 6 filters wired. |
| 2 | Live count via `?counts=1` | ✅ | `src/app/(admin)/admin/broadcast/page.tsx:16` | Recomputes as filters change. |
| 3 | Spin (LLM rewrite) | ✅ | `src/app/api/admin/broadcast/spin/route.ts:75-90` | Haiku 4-5. |
| 4 | Em-dash strip on LLM output (Law 7) | ✅ | `src/app/api/admin/broadcast/spin/route.ts:83-85` | `stripEmDashes` post-filter; never trusts LLM. |
| 5 | Dedupe by email + phone | ✅ | `src/app/api/admin/whatsapp-broadcast/route.ts:353-354, 374, 431` | Per-run Sets. |
| 6 | Allowlisted WA templates | ✅ | `src/app/api/admin/whatsapp-broadcast/route.ts:111, 443` | Refuses unknown template. |
| 7 | Opt-out respected (STOP list) | ✅ | `src/app/api/admin/whatsapp-broadcast/route.ts:374` | `optout.has(emailRaw)` check. |

Integrity: ✅ wired end-to-end.

---

## Flow 8 — Document approval cycle

| # | Step | Wired? | File:line | Notes |
|---|---|---|---|---|
| 1 | Vendor upload → portal_state.docs[] | ✅ | `src/app/api/exhibitor/documents/route.ts:62` | |
| 2 | Admin sees pending docs in profile | ✅ | `src/app/api/admin/vendors/[id]/summary/route.ts:72` | |
| 3 | Approve / Reject / Resubmit → portal_state.docs[i].status | ✅ | `src/app/api/admin/vendors/[id]/doc-action/route.ts:55-63` | |
| 4 | `vendor_application_events` audit | ✅ | `src/app/api/admin/vendors/[id]/doc-action/route.ts:66-74` | `doc_approve` / `doc_reject` / `doc_resubmit`. |
| 5 | `⟦DOCS:complete⟧` marker on full approval | ✅ | `src/app/api/admin/vendors/[id]/doc-action/route.ts:81-89` | Required for broadcast filter. |
| 6 | Vendor notified of approve/reject | ❌ | (no code) | doc-action route writes state + audit but does NOT email/WA the vendor on status flip. Vendor learns by re-opening portal. |

**FIX ❌#6 — Doc-status notify.** Add a `vendor_doc_status` template or transactional email on `doc-action` POST when `action ∈ {reject, resubmit}` so the vendor knows to act.

---

## Flow 9 — Stall allocation conflict guard

| # | Step | Wired? | File:line | Notes |
|---|---|---|---|---|
| 1 | Assign STALL:FS17 to vendor A | ✅ | `src/app/api/admin/stalls/route.ts:142-144` | |
| 2 | Over-confirm guard refuses STALL:FS17 to vendor B | ✅ | `src/app/api/admin/stalls/route.ts:125-131` | Returns 409 `STALL_TAKEN` with current occupant name. |
| 3 | Move-allowed if same vendor (idempotent) | ✅ | `src/app/api/admin/stalls/route.ts:126` | `current.id !== applicationId` is the gate. |
| 4 | Vendor freed when moved (old marker overwritten) | ✅ | `src/app/api/admin/stalls/route.ts:140-143` | Comment: "moving a vendor: their old marker is on THIS app row, withAllocation overwrites it". |

Integrity: ✅ wired end-to-end. Doctrine Law 8 enforced.

---

## Flow 10 — Vendor self-publish stall on public sectors page

| # | Step | Wired? | File:line | Notes |
|---|---|---|---|---|
| 1 | `publish_stall` flag default-false | ✅ | `src/app/api/sectors/[slug]/[vendor]/route.ts:77-80` ; `src/app/sectors/[slug]/[vendor]/page.tsx:65-67` | Vendor PII privacy law (Law 2). |
| 2 | Stall code only renders if `status='confirmed' AND publish_stall===true` | ✅ | same | Comment: "Without it, stall_code stays hidden". |
| 3 | UI toggle for vendor to opt in | 🔴 | (no UI anywhere) | `grep publish_stall src/app` returns only READ sites. No `update`, no `toggle`, no `set` site. `src/app/api/exhibitor/profile/route.ts` does not include the field. |
| 4 | Real vendors with stall_code visible publicly TODAY | 🔴 | (effectively zero) | No code path writes `publish_stall=true`, so the public sectors page shows stall code for nobody. |

This is either (a) deliberately locked until a UI toggle ships, or (b) accidental — vendor has zero path to show their stall publicly even if they want to. Given the privacy-first design, treat it as (a) but flag for product decision.

**FIX 🔴#3 — Add toggle.** In `/exhibitor/portal/profile` page, add a single checkbox "Show my stall location on public sectors page" that PUTs `profile.publish_stall=true` via `/api/exhibitor/profile`. One-line addition to the profile route's allowed-fields list.

---

## Cross-cutting findings

| Finding | Severity | Evidence |
|---|---|---|
| Single-row PATCH `/api/applications/[id]` skips `vendor_application_events` audit on approve/reject/info_requested. | HIGH | `route.ts:113-128` no insert; compare `bulk/route.ts:189`. |
| Payment column drift: `portal_state.payment.status='paid'` set, but `vendor_applications.payment_status` + `paid_at` columns are NOT updated. | HIGH | `src/lib/payments/confirm.ts:124-134`. |
| Document approve/reject does not notify the vendor. | MEDIUM | `doc-action/route.ts` ends at line 92; no email/WA. |
| Staff badges = flat JSON list TODAY; FooEvents signed-QR mint is promise-only. | MEDIUM | `src/app/api/exhibitor/staff/route.ts:32`. |
| `publish_stall` opt-in has no UI; effectively every approved vendor's stall is hidden. | MEDIUM | `grep publish_stall` shows reads only. |
| Day-of gate scanner is not in the Next codebase. | UNKNOWN | No scanner route; assumes FooEvents WP plugin handles it. Verify with operator. |
| Buyer ticket forward + refund: no operational UI. | LOW | Policy page only. |

---

## Overall integrity score: **7 / 10**

Five of ten flows are tight end-to-end (Support, Bot inbox, Festival reminders, Broadcast, Stall allocation). Two have meaningful column-vs-JSON drift (Payment + Approve audit). Two have missing UI for promised capability (publish_stall toggle, doc-status vendor notify). One depends on out-of-repo (FooEvents) and one product surface is absent (refund + forward).

## Top 3 broken wires

1. **Payment confirmation writes only to JSON, not to columns.** `confirmPayment` updates `admin_notes.portal_state.payment.status='paid'` but leaves `vendor_applications.payment_status='deferred'` and `paid_at=NULL`. Every admin dashboard, CSV export, and segmentation filter that reads the column lies. CRITICAL because this is the money flow.

2. **Single-row approval has no audit event.** PATCH `/api/applications/[id]` is Samreen's most-used surface (press `a` on row). It writes status + sends email + sends WA + provisions auth, but skips the `vendor_application_events` insert that bulk approval does. The audit log under-reports the most common path.

3. **`publish_stall` opt-in is read-only.** Vendor data privacy law correctly defaults the flag to false, but no profile UI lets a vendor flip it true. Public sectors pages will show stall codes for zero vendors regardless of confirmation status — silently breaking the "find this vendor at FS17" public discovery promise.

## Product narrative

If a vendor applies today, here's what actually happens. They submit `/apply` with 5 fields, get a clean confirmation email + WhatsApp ack within seconds, and land in Samreen's admin queue ranked by completeness. Samreen presses `a`. A real auth user is provisioned with a CSPRNG temp password, an approval email + `vendor_application_approved` WhatsApp template fire, and the vendor can log into `/exhibitor/login`. The portal Overview renders a TaskChecklist: accept terms, pay, allocate, upload docs, register staff. The vendor signs the contract (real PDF stored in Supabase storage), pays via Yoco (real Standard-Webhooks signature verified, idempotent), uploads docs (Samreen approves them, audit row written), and adds staff names. Samreen allocates `STALL:FS17` from `/admin/allocation`; the over-confirm guard refuses to double-book, and a `vendor_stall_allocation` WhatsApp fires automatically with first name + stall + zone. Three things drift silently: (1) the `payment_status` column on `vendor_applications` never flips to `paid` because the confirm path only updates the JSON-in-admin_notes shape, so the admin queue keeps showing them as `deferred`. (2) The approval moment itself logs zero rows in `vendor_application_events`, so the audit trail under-reports. (3) The public sectors page never shows their stall code because the `publish_stall` opt-in has no UI toggle. Day of festival, the gate scanner is not in this codebase — assumed to live on the WordPress FooEvents side. Ticket buyers get clean delivery (Bearer-gated webhook, idempotent, identity upserted) but have no UI for forwarding tickets or requesting refunds.

## Ship recommendation

**Ship the festival; patch payment-column drift + single-row audit event THIS WEEK.** The five tight flows carry the festival; the three broken wires are reporting-grade, not user-blocking — except for the payment column, which will mislead Samreen on who's paid in the next 7-day window and must be patched before the next wave of approvals lands.
