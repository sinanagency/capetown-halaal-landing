# Exhibitor Portal — Structure, Auth & Change List

> Pre-build spec for Young at Heart Festival 2026. Approved direction before implementation.
> Companion to WHATSAPP-VENDOR-PLAN.md. Decisions locked through 2026-05-22.

## Locked decisions
- Layer on FooEvents (0% commission). No per-ticket fee.
- Booking **confirmed by payment**, documents follow.
- WhatsApp updates **required** (vendors by contract, attendees via checkout consent).
- Portal language: **English only**.
- Staff passes: valid **all 3 days**, **multi-entry**.
- Vendor fees → **PayShap / pay-by-bank** (near-free); tickets stay on a card gateway.
- Multiple stands + multiple team logins per business: **yes**.
- Halaal certificate: **org sign-off required** (not just upload).
- Multiple admin users + **full audit log** (who did what, when).

---

## A. Auth flow (how a vendor gets in)

Built on **Supabase Auth** (email + password) — gives sessions, password reset, and security out of the box, and matches the existing exhibitor page.

1. **Approved** → admin clicks Approve. System:
   - Creates the vendor's portal account with a **generated temporary password**.
   - Sends approval **email + WhatsApp** containing: their email, the temp password, login link.
   - Temp password **expires in 48h**, flagged `must_change_password`.
2. **First login** → enter email + temp password → **forced to set their own password** (+ accept terms). Temp password is killed.
3. **Normal login** → email + password → secure session.
4. **Forgot password** → "Forgot password?" → enter email → one-time reset link emailed → set new password.
5. **Team logins** → the **Owner** invites team members from the portal → each gets their own email + temp password → same first-login flow. Roles: **Owner** (full) / **Staff** (limited).
6. **Security** → passwords hashed, temp passwords + reset links expire and are single-use, rate-limited, every login written to the audit log.

This replaces the half-built OTP login (OTP was emailed but never verified anywhere).

---

## B. Exhibitor portal — pages & how each works

Layout: **dark branded sidebar + light work area**.

| Page | What it does |
|---|---|
| **Overview** | Status pipeline (applied → approved → **paid** → docs → show-ready), countdown, outstanding-actions checklist, key info |
| **My Stand** | Stand number / size / zone, interactive 2D map with their slot + neighbours + amenities; location-preference request |
| **Payments** | Invoice, balance, due date (1 Sept), **unique reference**, PayShap/pay-by-bank instructions, **proof-of-payment upload**, receipt; **add-on ordering** (power, tables) auto-adds to invoice |
| **Documents** | Upload halaal cert / public liability insurance / health permit / electrical CoC; status (pending/approved/rejected) + expiry; sign contract |
| **Staff & Badges** | Add team (name, ID number, vehicle reg) up to allowance → generates **FooEvents QR passes** (3-day, multi-entry) → shown here + sent on WhatsApp |
| **Announcements** | Org updates feed (targeted), pinned notices, live show-day updates |
| **Profile** | Business info, logo, product/menu list → feeds public directory + map |
| **Support** | Tracked support thread + AI FAQ + WhatsApp |
| **Resources** | Exhibitor manual, rules, brand assets, contacts |

Vendor status pipeline: `applied → approved → invoiced → paid (confirmed) → docs-complete → show-ready`.

---

## C. Admin portal — functions

- **Applications pipeline** — approve / reject / request info, notes (extend existing)
- **Stand allocation** — assign vendors to map slots, occupancy view (open/held/paid), no double-booking
- **Payments** — paid/deferred/overdue, 1-click confirm, reminders, invoices + receipts
- **Document review** — approve/reject, flag missing, expiry tracking (incl. halaal sign-off)
- **Broadcasts** — compose once → all / zone / single / unpaid → portal + WhatsApp + email, schedulable
- **Live Control** (show-day) — real-time updates to attendees + vendors, urgency levels, emergency mode, live schedule board
- **Badges & manifest** — generate exhibitor passes, export Youngsfield gate manifest (names + IDs + vehicles)
- **Support inbox** — read/reply to vendor threads
- **Vendor directory** — approve/edit public listings
- **Dashboard** — revenue (stands + tickets), occupancy %, applications funnel, outstanding payments, docs missing
- **Users, roles & audit log** — individual logins, full vs limited, every action traced to who + when
- **Deadlines engine** — set key dates once → auto-reminders
- **Waitlist & cancellations** — full → waitlist; cancel frees slot + offers next
- **Exports** — vendor list, payment report, attendee list, gate manifest
- **Settings** — stand catalogue, pass allowances, deadlines, prices, payment details

---

## D. All changes & updates (the build)

**Database (Supabase migrations):**
- v5 (drafted): WhatsApp opt-in, `wa_messages`, `wa_broadcasts`, `vendor_profiles`, `vendor_documents`, `vendor_announcements`, payment fields on `vendor_applications`.
- v6 (new): `vendor_team_members` (user_id, application_id, role, status, must_change_password); `admin_users.role`; `audit_log`; `staff_passes` (name, id_number, vehicle_reg, foo_ticket_id, qr_url); `vendor_addons`; `live_updates`; product/menu + power-declaration fields; `portal_stage`; deadline config + reminder tracking.

**Auth:** Supabase Auth for vendors (temp pw → set own → forgot), team invites, Owner/Staff roles; admin roles + audit log.

**Approve flow:** create portal account + temp password, create `vendor_profile`, set payment deferred/due 1 Sept, send updated approval email + WhatsApp.

**Exhibitor portal:** all pages in section B (demo with mock data first → wire to Supabase).

**Admin portal:** all functions in section C.

**WhatsApp:** webhook + send + templates (incl. `festival_live_update`), opt-in, ticket delivery, reminders, broadcasts. (Live when Meta WABA clears.)

**FooEvents passes:** "Exhibitor Pass" ticket type, auto-create via WooCommerce API, QR retrieval, manifest export.

**Real-time:** Supabase Realtime for Live Control → site banner + portal feed update instantly.

**Emails:** updated approval, payment reminder (Sept), document status, password reset, team invite.

**Payments:** PayShap/pay-by-bank for vendor fees + reference reconciliation engine + proof-upload/1-click confirm; tickets gateway (swap Yoco later).

**POPIA:** consent checkboxes + privacy notice; honour opt-outs.

---

## E. Build order
1. DB migrations (v5 + v6) + auth (temp pw → set own → forgot, team, roles, audit).
2. Exhibitor portal pages — clickable **demo with mock data + demo login** first, then wire to Supabase.
3. Admin additions — allocation/map, payments, doc review, broadcasts.
4. WhatsApp (on WABA) + FooEvents passes.
5. Live Control + realtime.

---
*Saved: 2026-05-22 · capetown-halaal-landing*
