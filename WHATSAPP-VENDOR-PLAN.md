# WhatsApp Bot + Vendor Portal — Build Spec

> Young at Heart Festival 2026 (Dec 11–13, Youngsfield Military Base, Cape Town)
> Companion to `TICKETING-PLAN.md`. Status: spec ready, awaiting Meta WABA kickoff.

## Decisions locked (2026-05-22)

1. **Layer on top of FooEvents.** Keep FooEvents as system of record for sales + gate scanning. We do NOT rebuild ticketing or the scanner.
2. **No per-ticket fee.** Ticket prices stay clean. Monetization is the build/retainer, not a buyer-facing cut.

### Why we are not replacing FooEvents
FooEvents charges **0% commission and $0 per ticket**. It is a flat annual plugin license ($139–$349/yr) and the check-in scanner app is free and works offline. The only per-ticket cost in the flow is the payment gateway (~2.9–3.5%), which is unavoidable for anyone processing SA card payments. Building our own ticketing would save ~$200/yr and inherit catastrophic gate-day risk (offline scanning for 25,000 people at a military base). The leverage is in the two things FooEvents does NOT do: **WhatsApp delivery** and **vendor management**.

---

## What already exists (reuse map)

| Need | Already built | File |
|---|---|---|
| Read orders/attendees from FooEvents | ✅ WooCommerce REST client | `src/lib/woocommerce.ts` (`getOrders`, `getTicketStats`) |
| Buyer records (email, name, phone) | ✅ `ticket_buyers` table | `supabase-migration-v2.sql` |
| AI concierge brain (festival FAQ) | ✅ Anthropic chat, full prompt | `src/app/api/chat/route.ts` |
| Vendor application + approve/reject | ✅ `vendor_applications` + admin API | `supabase-schema.sql`, `api/applications` |
| Vendor login (OTP) | ⚠️ table exists, flow not built | `vendor_otps` in `supabase-migration-v2.sql` |
| Vendor-facing pages | ⚠️ scaffolded, thin | `app/exhibitor`, `app/vendors`, `app/login` |
| Email delivery | ✅ Resend + GoDaddy SMTP | `src/lib/email/` |
| Admin dashboard + analytics | ✅ | `app/(admin)/admin/*` |

**Net new:** WhatsApp send/receive layer, message templates, opt-in capture, and the rich vendor portal content. Everything else extends existing patterns.

---

## Architecture

```
                         ┌─────────────────────────────┐
 tickets.youngatheart    │  WordPress + WooCommerce +    │
 (Cloudways)             │  FooEvents  (sales + scanner) │
                         └──────────────┬────────────────┘
                                        │ order.completed webhook  +  REST read
                                        ▼
        ┌──────────────────────────────────────────────────────────┐
        │  capetown-halaal-landing  (Next.js 16 on Netlify)          │
        │                                                            │
        │  api/whatsapp/webhook   ← inbound msgs + delivery status   │
        │  api/whatsapp/send      → outbound (ticket / countdown)    │
        │  lib/whatsapp.ts        → Cloud API client + templates     │
        │  api/chat (existing)    → AI replies (24h service window)  │
        │  api/woocommerce        → buyer + attendee data            │
        │                                                            │
        │  app/vendor/* (portal)  ← OTP login, booth, docs, invoice  │
        │  app/(admin)/admin/*    ← broadcast composer, WA delivery  │
        └───────────────────────────┬────────────────────────────────┘
                                     ▼
                         ┌───────────────────────┐
                         │  Supabase (Postgres)   │
                         │  + wa_messages         │
                         │  + wa_broadcasts       │
                         │  + vendor_profiles     │
                         │  + vendor_documents    │
                         │  + vendor_announcements│
                         └────────────┬───────────┘
                                      ▼
                         ┌───────────────────────┐
                         │ WhatsApp Cloud API     │
                         │ (Meta) — the bot number│
                         └───────────────────────┘
```

---

## Phase 1 — WhatsApp bot

### What it does
**Outbound (business-initiated, templated):**
- Ticket + QR delivered to WhatsApp on purchase (mirrors the email)
- Countdown / reminder sequence: 30 days, 1 week, day-before logistics
- Vendor announcements (shared with portal)

**Inbound (free, within 24h window):**
- Attendee messages the bot → AI concierge (`api/chat` prompt) answers parking, schedule, "re-send my ticket," directions, accommodation
- Keyword handling: `STOP` (opt-out), `HELP`, `TICKET` (resend)

### Data flow for ticket delivery
1. FooEvents order completes on WordPress.
2. WooCommerce fires `order.completed` webhook → `api/whatsapp/webhook` (or a 5-min poll of `getOrders` as fallback).
3. We upsert `ticket_buyers`, check `whatsapp_opt_in`, then send the `ticket_delivery` template with the QR as the media header.
4. Log to `wa_messages` (status, provider id, cost) for tracking + idempotency.

### Files to create
- `src/lib/whatsapp.ts` — Cloud API client (`sendTemplate`, `sendText`, `verifyWebhook`), env-gated, surfaces real errors (no fake-success).
- `src/app/api/whatsapp/webhook/route.ts` — GET (verify token) + POST (inbound msgs, status callbacks).
- `src/app/api/whatsapp/send/route.ts` — admin-auth'd trigger for broadcasts.
- `src/app/(admin)/admin/broadcast/page.tsx` — compose + schedule countdowns, see delivery/cost.
- Extend `src/lib/woocommerce.ts` if attendee phone needs deeper FooEvents fields.

### Provider recommendation
| Option | Cost | Lead time | Verdict |
|---|---|---|---|
| **Meta Cloud API (direct)** | Meta rate only, no markup | Business verification (days–2 wks) | **Target.** We host the webhook in the existing Next.js app. No middleman, full control, you learn the real stack. |
| Twilio | + ~$0.005/msg (~$125 on 25k msgs) | Hours | **Fast fallback** if Meta verification drags near the event. |
| SA BSP (e.g. Clickatell) | Higher markup, ZAR billing | Sales process | Only if local support / ZAR invoicing is required. |

**Plan: build against Meta Cloud API direct.** The `lib/whatsapp.ts` interface is provider-agnostic, so swapping to Twilio later is a one-file change.

### Cost model (worked example)
Assume ~10,000 opted-in buyer numbers, SA utility rate ≈ $0.035/msg:

| Message | Type | Count | Unit | Total |
|---|---|---|---|---|
| Ticket delivery | utility | 10,000 | $0.035 | $350 |
| 30-day reminder | utility | 10,000 | $0.035 | $350 |
| 1-week logistics | utility | 10,000 | $0.035 | $350 |
| Day-before | utility | 10,000 | $0.035 | $350 |
| Inbound Q&A replies | service | — | $0 (24h window) | $0 |
| **Total campaign** | | | | **~$1,400** |

Marketing-category blasts cost ~$0.06/msg; event reminders for purchased tickets defensibly classify as **utility**. Inbound conversations are free.

---

## Phase 2 — Vendor portal

Separate area for **accepted** vendors. OTP login (`vendor_otps` already exists). Shares the backend with the WhatsApp bot so one announcement hits portal + WhatsApp.

### Portal content
| Section | Fields |
|---|---|
| **Status & onboarding** | Application status, acceptance letter, contract + indemnity e-sign |
| **Your spot** | Booth number, zone (FT/FS/TS/BS), size, pinned location on festival map, neighbours |
| **Logistics** | Load-in / load-out times, setup + breakdown windows, vehicle access pass count, gate code |
| **Specs** | Power available (amps + fee), water access, what's provided vs. bring-your-own |
| **Compliance** | Upload halaal cert, health permit, fire safety, public liability insurance — with expiry tracking + admin approval |
| **Money** | Stall fee invoice, deposit status, balance due, pay-online link |
| **Comms** | Organizer announcements feed + WhatsApp opt-in for broadcasts |
| **Optional** | End-of-day sales reporting (vendor turnover data for the festival) |

### Files to create
- `src/app/vendor/login/page.tsx` — email → OTP (reuses `vendor_otps`).
- `src/app/vendor/page.tsx` — dashboard (status, booth, countdown).
- `src/app/vendor/logistics/`, `vendor/documents/`, `vendor/invoice/` — sub-pages.
- `src/app/api/vendor/auth/route.ts` — OTP issue + verify (bcrypt, matches existing `bcryptjs` dep).
- `src/app/api/vendor/[section]/route.ts` — profile, docs upload (Supabase Storage), announcements.
- Admin side: extend `app/(admin)/admin/applications` to assign booth + push acceptance (issues OTP + fires `vendor_accepted` WhatsApp template).

---

## Critical path — the only thing with lead time

**Meta WhatsApp Business Account (WABA) setup.** Start this now; everything else is ready to flip on once it's live.

- [ ] Meta Business Manager account for the festival entity
- [ ] **Business verification** (needs company registration docs) — this is the slow step
- [ ] A **dedicated phone number** for the API (cannot already be on WhatsApp app — use a fresh SIM/VoIP number)
- [ ] Create the WABA, get phone number ID + permanent access token
- [ ] Submit message templates (below) for approval — 1–2 days each
- [ ] Add `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN`, `WHATSAPP_BUSINESS_ID` to env (landing + Netlify)

## Opt-in & compliance
- Add a **WhatsApp opt-in checkbox** at WooCommerce checkout (we have admin on the WP site): "Send my ticket + festival updates on WhatsApp."
- Store consent + timestamp on `ticket_buyers` (`whatsapp_opt_in`, `whatsapp_opted_in_at`).
- Honour `STOP` → set `whatsapp_opt_out`. Never message opted-out numbers.
- Templates must be pre-approved; free-form replies only inside the 24h service window.

---

## Build sequence
1. **Now (unblocked):** run migration v5, build vendor portal (OTP login + dashboard + docs) — fully testable on existing Supabase. Submit WhatsApp templates for approval.
2. **On WABA live:** wire `lib/whatsapp.ts`, webhook, ticket-delivery trigger, opt-in checkbox. Test send to own number.
3. **Pre-event:** load countdown schedule, dry-run broadcast to a test segment, verify delivery + cost in admin.
4. **Event:** FooEvents scanner at the gate (unchanged), bot answers inbound live.

---
*Saved: 2026-05-22 · capetown-halaal-landing*
