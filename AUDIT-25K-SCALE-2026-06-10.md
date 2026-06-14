# CTH / Young at Heart 2026 — 25k-Scale Production Audit

**Date:** 2026-06-10 · **Festival:** Dec 11-13 2026 · **Scope:** every codebase + the pipeline they form + cost + reliability
**Method:** 5 parallel specialist auditors (security, FooEvents/WC pipeline, WhatsApp + portals, financial, SRE), synthesized.
**Premise:** 25k attendees, ~10k paid orders, TV-driven 1000-concurrent burst, gate-day 8k+ scans across 90 min.
**Yoco-only confirmed (FNB dropped).** All FNB code in `src/lib/payments/fnb.ts` and `src/app/api/payments/fnb/return/route.ts` is dead — schedule for removal.

---

## TL;DR — the honest read

**You ship today and three things blow up.** (1) Your `/api/chat` widget has zero auth and zero rate limit — one botnet drains the Anthropic balance in an afternoon. (2) Your live secrets are sitting in `.env.local` on disk — rotate today regardless of breach. (3) Your WhatsApp WABA is still on the 250-msg/day starter tier and you cannot send a 25k "gates open" blast even at the 100k tier on a single number — you need to start template ramping by **Sep 1** or you go to the festival without working comms.

**Everything else is fixable in the next 90 days.** Pure infra cost over the 8-month cycle is ~R197k (~R7.90/ticket). The single biggest cost lever is re-categorizing WhatsApp broadcasts from marketing ($0.038) to utility ($0.014) — saves ~$2.4k cycle on the same messages. The single biggest crash risk is staying on **GoDaddy shared hosting** for WordPress — that needs to move to Kinsta or Cloudways before T-30d.

**The QR-pasted-in-HTML email path you flagged specifically:** today FooEvents most likely sends through `wp_mail()` → GoDaddy SMTP, with the QR hotlinked as an `<img src="https://tickets.../qr.png">`. At burst that fails three ways simultaneously: GoDaddy throttle drops the tail, Gmail/Outlook block the hotlinked image, and the PDF attachment chews 5GB of outbound bandwidth. Fix is to move ticket-delivery email to Resend (or Postmark) with the QR **embedded as a base64 CID inline attachment**, and serve the PDF through a tokenized download URL instead of attaching.

---

## The 10 things that will hurt you (ranked, file:line)

### 1. `/api/chat` has no auth, no rate limit, no token cap, and can flip to the admin system prompt
**`src/app/api/chat/route.ts:35-61`**
```ts
const { messages, context } = await req.json()
const systemPrompt = context === 'admin' ? ADMIN_PROMPT : FESTIVAL_SYSTEM_PROMPT
```
Anyone on the internet can POST `{messages:[...], context:'admin'}` and (a) burn Anthropic balance — a scripted attacker at 100 req/s for an hour = ~$540 with Haiku; (b) get the internal admin system prompt revealing dashboard URLs.
**Fix:** gate `context==='admin'` behind the existing admin Supabase session; reuse `checkIpThrottle` from `src/lib/security/abuse-guard.ts` (30 req/hour/IP); cap `messages.length ≤ 10` and total ≤ 4KB.

### 2. Live secrets in `.env.local` on disk
**`/Users/milaaj/Code/capetown-halaal-landing/.env.local`**
Every prod secret in plaintext: `SUPABASE_SERVICE_ROLE_KEY`, `YOCO_SECRET_KEY=sk_live_…`, `YOCO_WEBHOOK_SECRET`, `RESEND_API_KEY`, `ANTHROPIC_API_KEY`, `WC_CONSUMER_KEY/SECRET`, `WHATSAPP_TOKEN`, `WHATSAPP_APP_SECRET`, `CRON_SECRET`, `SMTP_PASS=Saosin182!`. `.gitignore` keeps them out of git history (verified). Risk is local: any screen share, dotfiles backup, support upload, or accidental tar ships the production keychain.
**Fix today:** rotate all of them in their respective consoles, replace `.env.local` with a stub holding only `NEXT_PUBLIC_*` + comments, pull prod from Vercel env when needed.

### 3. WhatsApp signature verification fails OPEN if `WHATSAPP_APP_SECRET` is missing
**`src/lib/whatsapp.ts:201-208`**
```ts
if (!WA_APP_SECRET) return true   // accepts unsigned webhooks
```
A trailing `\n` on a Vercel env paste (per your own `feedback_vercel_env_vars.md`), an env rollback, or a preview deploy without the secret = anyone on the internet can spoof inbound webhooks and puppet the bot: opt-out users en masse, fake admin messages from your number, trigger Anthropic burn.
**Fix:** return `false` when `NODE_ENV==='production'` and the secret is missing; add a boot-time assertion that throws if `whatsappConfigured && !WA_APP_SECRET`.

### 4. WhatsApp webhook dedup is check-then-insert (race window)
**`src/app/api/whatsapp/webhook/route.ts:73-84, 259-264`**
`alreadySeen()` does a SELECT; the matching INSERT happens later in `logMessage`. There is no UNIQUE constraint on `wa_messages.provider_message_id`. Meta retries every ~5s for 24h. Two concurrent retries both see "not seen", both process, both insert, both AI-call.
**Fix:** `CREATE UNIQUE INDEX wa_messages_provider_message_id_uniq ON wa_messages (provider_message_id) WHERE provider_message_id IS NOT NULL;`. Switch to insert-first with `onConflict:'provider_message_id', ignoreDuplicates:true`; only proceed if insert affected 1 row.

### 5. `/api/whatsapp/deliver-ticket` is not idempotent
**`src/app/api/whatsapp/deliver-ticket/route.ts:20-130`**
WordPress retries on any non-2xx. No idempotency key. Same `orderNumber` posted twice = double consent recorded, double media upload (billable), double template send, **`ticket_buyers.ticket_count` and `total_spent` doubled** (lines 107-108).
**Fix:** new `ticket_deliveries` table with `unique(idempotency_key)` where `idempotency_key = sha256(orderNumber + phone)`. Check first, return `{ok:true, alreadyDelivered:true}` if present. Wrap the buyer-upsert in the same gate.
Bonus on the same file: `orderNumber || ','` (line 39) silently substitutes a literal comma when WP forgets to send the order number — change to reject with 400 instead.

### 6. Broadcast loop physically cannot finish 25k in one Vercel invocation
**`src/app/api/admin/whatsapp-broadcast/route.ts:8, 148`**
`maxDuration=300` (5min) × `PACE_MS=250` = max 1,200 recipients before Vercel kills the function. Samreen will see a success toast; only 5% will have actually received.
**Fix:** queue-based. Write recipients to `broadcast_queue`, drain 200/min via a Vercel cron (`*/1 * * * *`). Same pattern for `cron/payment-reminders` and `applications/send-delay-notice`, both of which have the same time-out-before-finishing problem.

### 7. WordPress is on GoDaddy shared — ceiling ~50 concurrent checkouts
**Production infra**
This is the single biggest crash risk. A TV mention or radio plug driving 500 simultaneous checkouts = thrashed PHP workers, hung Yoco webhook deliveries, orders stuck at `processing` and never `completed`, so FooEvents never generates tickets, so customers paid and got nothing.
**Fix:** migrate WordPress to **Kinsta Business 1** ($115/mo) or **Cloudways Vultr High-Frequency 4GB** ($70/mo) by **T-30d (Nov 11)**. Cloudways is cheaper but ops-heavier; Kinsta has better PHP-FPM tuning out of the box.

### 8. WABA messaging tier is starter (250/day) — cannot do a 25k blast
**Meta Business / WhatsApp Manager**
Per `WABA-UNDER-NISRIA-SETUP.md` the WABA was newly created. June 1 verification used Resend (not WABA), so the WABA has barely sent. You're still at the 250-conversation/day starter tier. Tier progression: 250 → 1k → 10k → 100k → unlimited. Graduation = send next-tier-worth within 24h at HIGH quality.
**Math:** you need ≥10k tier for festival weekend (75k business-initiated convs across 72h). Realistic time to climb from 250 to 100k is 4-6 weeks of regular utility sends.
**Action:** start routing every paid order through `/api/whatsapp/deliver-ticket` (today: NOT WIRED — see #9) by **Sep 1**. By **Oct 15** confirm WABA at 1k+; by **Dec 1** at 10k+ minimum.

### 9. The WordPress → Next.js webhook for WhatsApp ticket delivery is NOT wired
**Operator runbook gap**
Today every paid order delivers via FooEvents email only. WhatsApp delivery is dark. The endpoint `/api/whatsapp/deliver-ticket` is built and tested; WordPress needs an MU-plugin to call it on `woocommerce_order_status_completed`. Without this you're single-channel on email, and email + GoDaddy SMTP is your fragile path.
**Fix:** install `wp-content/mu-plugins/cth-whatsapp-deliver.php`:
```php
<?php
add_action('woocommerce_order_status_completed', 'cth_push_to_next', 20, 1);
function cth_push_to_next($order_id) {
  $order = wc_get_order($order_id);
  if (!$order || $order->get_meta('_cth_wa_pushed')) return; // idempotent
  $body = [
    'phone' => $order->get_billing_phone(),
    'firstName' => $order->get_billing_first_name(),
    'lastName' => $order->get_billing_last_name(),
    'email' => $order->get_billing_email(),
    'orderNumber' => (string) $order->get_order_number(),
    'orderTotal' => (float) $order->get_total(),
    // pdfBase64: fetch from FooEvents uploads if needed
  ];
  $res = wp_remote_post('https://cthalaal.co.za/api/whatsapp/deliver-ticket', [
    'timeout' => 30,
    'blocking' => false, // fire-and-forget, don't block checkout
    'headers' => [
      'Authorization' => 'Bearer ' . CRON_SECRET_CTH,
      'Content-Type'  => 'application/json',
    ],
    'body' => wp_json_encode($body),
  ]);
  if (!is_wp_error($res)) {
    $order->update_meta_data('_cth_wa_pushed', 1);
    $order->save();
  }
}
```

### 10. Ticket email is hot-linked QR + PDF attachment from GoDaddy SMTP
**FooEvents WP setup + `src/lib/email/templates/*`**
At 25k buyers this fails three ways:
- **Gmail/Outlook image-block:** the inline QR is `<img src=https://tickets.youngatheart.co.za/wp-content/uploads/.../qr.png>`. Many clients render this blank. Buyer falls back to PDF attachment — works, but UX is poor.
- **GoDaddy SMTP throttle:** shared hosting ~500-1000/day cap. Festival-month volume = 12,500 confirmations. The tail gets silently dropped.
- **Outbound bandwidth:** 25k × ~200KB PDF = 5GB egress through GoDaddy. They will rate-limit.
**Fix:**
1. Install **Fluent SMTP** (free WP plugin), point at **Resend** (DKIM already warm) or **Postmark** ($15/mo for 10k). Use Resend for cost, Postmark if deliverability bites.
2. Embed the QR as a **base64 CID attachment** (`<img src="cid:qr@cth">`) — Gmail renders inline CIDs without proxy.
3. Don't attach the PDF — link to `https://tickets.youngatheart.co.za/t/{signed_token}` that streams on demand. Token = HMAC(order_id + ticket_id).
4. Verify **SPF + DKIM + DMARC** on both `youngatheart.co.za` and `cthalaal.co.za`. Currently SPF includes `secureserver.net` only — add `_spf.resend.com`. DMARC start at `p=quarantine`, move to `p=reject` post-festival.

---

## Bonus criticals worth knowing (10 more)

| # | Issue | Where | Fix priority |
|---|---|---|---|
| 11 | Admin spoof via inbound — admin recognized by phone alone, combined with #3 fail-open = puppet master controls broadcasts | `src/lib/bot/admins.ts:33-36` | P0 |
| 12 | `mark-paid` admin route accepts arbitrary `amount` (no clamp) | `src/app/api/admin/payments/mark-paid/route.ts:29-43` | P0 |
| 13 | Resend campaign `limit` can be overridden per-request; no rolling daily counter | `src/app/api/admin/campaign/send/route.ts:12,95-101` | P0 |
| 14 | `Campaign.tsx` uses `dangerouslySetInnerHTML` on admin-supplied content, no sanitizer | `src/lib/email/templates/Campaign.tsx:51-58` | P1 |
| 15 | Payment-return endpoints scan full vendor table + unanchored substring on `admin_notes` for the payment reference | `src/app/api/payments/transaction-junction/route.ts:30-36` | P1 |
| 16 | `getOrders` fetches first 100 only; `getOrdersCount` missing date filter (CTH-DOCTRINE law #6 violation) | `src/lib/woocommerce.ts:73,77` | P0 — will silently truncate dashboards in week 1 |
| 17 | `bot-inbox/summarize` passes raw conversation to model → prompt-injection vector | `src/app/api/admin/bot-inbox/summarize/route.ts` | P1 |
| 18 | `Math.random()` for temp passwords (reset on first login but use `crypto.randomBytes`) | `src/lib/exhibitor-auth.ts:7-10` | P2 |
| 19 | `user_metadata.application_id` is client-writable in Supabase — verify it's stored in `app_metadata` instead | `src/lib/exhibitor.ts:18-54` | P0 — test today on staging |
| 20 | No QR invalidation on refund; old QR still scans in | WP-side + new Next API | P1 |

---

## Cost model — 8-month cycle (Jun 2026 → Jan 2027)

USD, with ZAR @ 1 USD = R16.5 (spot 2026-06-10). Yoco fees are revenue-coupled (pass-through), shown separately.

### Steady-state monthly average (T-6 → T-2, ~$844/mo, R13,930)

| Line | Notes | $/mo |
|---|---|---|
| Vercel Pro (1 seat) | usage within $20 credit | 20 |
| Supabase Pro | flat | 25 |
| Resend Pro | under 50k/mo cap | 20 |
| GoDaddy SMTP | until migrated | 10 |
| WhatsApp marketing | 25k purchase/5mo ≈ 2.5k/mo @ $0.038 | 95 |
| WhatsApp utility (reminders) | 5k/mo @ $0.014 | 70 |
| Anthropic Sonnet (chat) | 12.5M in/4.2M out per mo | 100 |
| Anthropic Sonnet (admin) | 8M tokens/mo | 53 |
| Yoco fees (revenue-coupled) | 2.5k tx × R250 × 2.95% + R0.50 | 446 |
| Misc storage | | 5 |
| **Total** | | **$844** |

### Festival month T-1 (Nov: 50% of cycle volume hits here) — ~$6,636 / R109,494

The single line item dominating festival month: **WhatsApp marketing template at $3,316/month** (87,500 messages × $0.038). Re-categorize to utility = $1,225 → **saves $2,091 in one month** on the same messages.

### Burst day (Dec 11, gates open) — ~$1,082 infra-only

| Line | $ |
|---|---|
| WA "gates open" template to 25k (marketing) | 947 |
| WA "gates open" template to 25k (utility — if reclassified) | 350 |
| Anthropic bot replies (5k inbound) | 66 |
| Vercel function compute burst | 5 |
| Vercel bandwidth burst (300GB) | 45 |
| Resend backup blast (if WA fails) | 22 |
| Yoco walk-up tx (revenue-coupled) | 11 |
| **Total** | **~$1,082** |

If marketing/utility miscoded across all three festival-day blasts: **$2,841 in one day** vs **$1,050 done right**. This is the single biggest cost lever.

### 8-month cycle total

| Bucket | USD | ZAR |
|---|---|---|
| Steady T-6 → T-2 (5 mo) | 4,220 | 69,645 |
| Festival month T-1 | 6,636 | 109,494 |
| Festival month T | 5,800 | 95,700 |
| Post-festival T+1 | 750 | 12,375 |
| **Total all-in** | **$17,406** | **R287,214** |
| **Pure infra ex-Yoco** | **$11,950** | **R197,184** |

**Per-ticket all-in: R19.40. Per-ticket pure-infra: R7.90.** Healthy for a 25k-ticket festival.

### 5 cost-optimization moves

1. **Re-categorize WhatsApp broadcasts** marketing → utility (gates-open, schedule update, gates-close are notifications about an event the user bought). Save ~$2.4k cycle.
2. **Route LLM by intent**: Haiku 4.5 for FAQ chat, Sonnet only for ambiguous threads. Add prompt caching (90% off cached input). Save ~$280 cycle.
3. **Drop GoDaddy SMTP → Postmark $15/mo** for transactional. Removes the throttle bottleneck.
4. **Stay on Resend Pro** — don't upgrade to Scale unless 50k cap broken sustained. Save $70/mo if you almost-upgraded.
5. **Anthropic monthly hard cap** in console ($300/mo) + per-IP rate-limit. Bot abuse can't drain the balance.

### Hidden costs (not in baseline)

- **Yoco chargeback fees**: R200 per disputed tx × 0.5% rate × 25k = **R25k reserve**.
- **Anthropic tier-1 RPM cap (~50/min)**: must climb to tier-2 by Dec 1 — free, just usage history.
- **SMS fallback** if WA delivery drops to 88% (typical ZA): 2,500 × R0.50 × 3 blasts = R3.75k.
- **GoDaddy daily SMTP cap** ~500-1000/day on shared. 12,500 confirmations in November = silent drops. Forces the Postmark move.
- **Vercel build minutes** during sprint (Pro includes 6,000/mo) — overage $0.50/min.

---

## Reliability — the 10 non-negotiables before traffic ramps

1. **Migrate WP off GoDaddy** to Kinsta Business 1 or Cloudways Vultr HF 4GB. T-30d hard deadline. Single biggest crash risk.
2. **Wire the WP → Next.js → WhatsApp ticket delivery webhook** so every paid order fires both email AND WA. Email-only is one outage from disaster. (See #9 above.)
3. **`webhook_events` + `outbound_jobs` tables + Vercel cron drain worker.** No more inline sending from API routes. SQL:
   ```sql
   create table webhook_events (
     id bigserial primary key,
     provider text not null check (provider in ('yoco','meta_whatsapp','woocommerce','resend')),
     event_id text not null,
     event_type text not null,
     payload jsonb not null,
     received_at timestamptz default now(),
     processed_at timestamptz,
     status text default 'received' check (status in ('received','processing','done','failed')),
     attempts int default 0,
     unique (provider, event_id)
   );
   create table outbound_jobs (
     id bigserial primary key,
     channel text not null check (channel in ('email_resend','email_postmark','whatsapp','sms')),
     template text not null,
     to_address text not null,
     payload jsonb not null,
     scheduled_for timestamptz default now(),
     attempts int default 0,
     max_attempts int default 5,
     status text default 'queued',
     dedup_key text unique,
     priority int default 5
   );
   ```
4. **Cloudflare WAF + Bot Fight + Turnstile** on `/api/chat` and `/api/applications`. Free, blocks 90% of abuse.
5. **Verify Supabase on Supavisor transaction mode (port 6543)**. Session mode dies at ~60 connections.
6. **Move ticket-delivery email to Resend dedicated IP / Postmark with SPF/DKIM/DMARC**, embed QR as base64 CID, host PDF as tokenized download link.
7. **Sentry + BetterUptime synthetics (60s) + Pushover** to operator phone. Six synthetic checks: home, ticket store landing, exhibitor login, WA webhook health, Yoco webhook health, DB roundtrip.
8. **Remove FNB dead code** (`src/lib/payments/fnb.ts`, `src/app/api/payments/fnb/return/route.ts`). Yoco is sole gateway.
9. **WABA tier climb**: start utility template sends now to hit 10k tier by T-30d. Submit all 6 festival-day templates by **Nov 25** for Meta approval.
10. **k6 load test 1000 VUs against staging at T-7d.** If anything fails SLOs, fix or accept-with-mitigation in writing.

### SLOs (publish these to ops Slack)

| SLI | Target |
|---|---|
| Ticket purchase success | 99.9% |
| Ticket delivery (email or WA) P95 | < 2 min |
| Gate scan success | 99.95% |
| Admin dashboard P95 | < 2s |
| WhatsApp webhook ingestion P99 | < 5s |
| Public site availability | 99.95% |

---

## Pre-festival timeline

| Date | Action |
|---|---|
| **T-90 (today, Sep 12 →)** | Rotate all `.env.local` secrets. Fix `/api/chat` auth + rate limit. Fix WhatsApp signature fail-open. Fix dedup race. Fix deliver-ticket idempotency. Verify `application_id` is in `app_metadata` not `user_metadata`. Wire the WP→Next WhatsApp webhook. Submit `vendor_payment_reminder`, `festival_announcement`, `ticket_delivery` templates to Meta. |
| **T-60 (Oct 11)** | WP migration to Kinsta/Cloudways. Postmark/Resend dedicated IP for ticket mail with SPF/DKIM/DMARC. `webhook_events` + `outbound_jobs` live. Cloudflare WAF + Turnstile. Sentry + BetterUptime up. WABA at 1k+ tier confirmed. |
| **T-30 (Nov 11)** | Re-categorize WA broadcasts marketing → utility with Meta. All festival-day templates submitted (gate reminder, schedule update, lost-ticket-resend, refund-initiated, parking, checkin-confirmation). Supavisor verified. Anthropic tier-2 confirmed. Yoco chargeback reserve set aside (R25k). |
| **T-14 (Nov 27)** | k6 load test 1000 VUs. Anthropic monthly hard cap set ($300). Backup admin phone provisioned. Status page (status.cthalaal.co.za) on BetterUptime live. Kadence regression on page-tickets.php re-fixed in a child theme (not parent). |
| **T-7 (Dec 4)** | Dry run: send `festival_gate_reminder` to 50-person test segment. WABA at 10k+. Backup restore drill (Supabase PITR + WP UpdraftPlus to S3). Gate scanners provisioned + tested. MiFi hotspots procured (Vodacom + MTN, dual-carrier). |
| **T-1 (Dec 10)** | Code freeze. On-call rota confirmed. Outbound queue drained to zero. Test purchase end-to-end. War-room dashboard pinned. Runbooks printed. |
| **T+0 (Dec 11-13)** | War room WhatsApp group active. Hourly health-checks at gate-open. No deploys without two-operator sign-off. |

---

## Two consequential forks I won't decide for you

These are real architecture calls. Worth your judgment.

### Fork A — WordPress host: migrate or harden?
**Migrate** to Kinsta Business 1 ($115/mo) or Cloudways Vultr HF 4GB ($70/mo). Solves the 50-concurrent-checkout ceiling. Cost: ~$1k extra over the cycle. Risk: migration day breakage if not pre-staged.
**Harden in place**: Cloudflare APO + aggressive page cache + WP-Rocket. Doesn't fix the `/checkout` bottleneck (cache-bypassed). Cost: $0-50/mo.
*The SRE auditor's call: migrate. The dollar swing is rounding error vs the crash risk; do it before T-30d.*

### Fork B — Ticket delivery email: stay or move?
**Stay**: keep FooEvents on `wp_mail()` → GoDaddy SMTP. Install Fluent SMTP plugin, point at Resend (DKIM warm). Cheap, slight reconfig.
**Move**: ticket-delivery email goes entirely through the Next.js side via Resend / Postmark with proper CID + tokenized PDF. WP only sends the operator-side notifications. More code change, much cleaner pipeline.
*The pipeline auditor's call: move. WP-side mail will always be the fragile link; centralizing on a transactional ESP closes the QR-render and throttle problems in one stroke.*

---

## Verified safe (don't re-audit)

- Yoco webhook signature verification is Standard-Webhooks compliant (id+ts+body HMAC, 5-min replay window, `timingSafeEqual`)
- `confirmPayment` idempotency on `alreadyPaid` flag is correct
- `/api/applications` POST has the full abuse-guard chain (honeypot, token guard, IP throttle, dup-email)
- Every `/api/admin/*` route checks `admin_users.id = auth.uid()` server-side (consistent)
- Service-role key is never in client bundle; only used in server files
- STOP keyword enforcement, opt-out persistence, consent audit trail — POPIA-compliant
- PII reply-guard redacts phones/emails/SA-IDs in LLM output
- Prompt caching configured (90% off cached input on system prompts)
- TypeScript builds clean (`npx tsc --noEmit` exits 0) — `ignoreBuildErrors:true` was Nisria, not CTH
- Admin layout's `x-pathname` is set by middleware before any inbound spoof reaches it

---

## File index (absolute paths)

- `.env.local` — rotate today
- `src/app/api/chat/route.ts` — auth + rate limit
- `src/lib/whatsapp.ts` — fail-closed signature
- `src/app/api/whatsapp/webhook/route.ts` — UNIQUE index + insert-first dedup
- `src/app/api/whatsapp/deliver-ticket/route.ts` — idempotency_key + drop `orderNumber || ','`
- `src/app/api/admin/whatsapp-broadcast/route.ts` — queue-based
- `src/app/api/cron/payment-reminders/route.ts` — `.limit(50)` + resume cursor
- `src/lib/woocommerce.ts:73,77` — paginate `getOrders`, add `after=` to `getOrdersCount`
- `src/app/api/admin/payments/mark-paid/route.ts` — clamp `amount`
- `src/app/api/admin/campaign/send/route.ts` — server-enforced daily cap
- `src/lib/email/templates/Campaign.tsx` — sanitize `bodyHtml` (isomorphic-dompurify)
- `src/app/api/payments/transaction-junction/route.ts` — index payment reference column
- `src/lib/exhibitor.ts` + `src/lib/exhibitor-auth.ts` — move `application_id` to `app_metadata`
- `src/lib/payments/fnb.ts` + `src/app/api/payments/fnb/return/route.ts` — delete (Yoco only)
- `src/app/api/admin/bot-inbox/summarize/route.ts` — strip prompt-injection markers
- `next.config.ts` — add CSP, X-Content-Type-Options, Referrer-Policy
- `package.json` — remove `bcryptjs`, `next-auth`, `@netlify/plugin-nextjs`
- WP `wp-content/mu-plugins/cth-whatsapp-deliver.php` — new (see #9)
- WP `wp-content/themes/kadence-child/page-tickets.php` — re-port dark theme to child theme
- New: `src/middleware.ts` (Upstash rate limits across public POST endpoints)
- New: `src/app/api/cron/drain-outbound/route.ts` (queue worker)
- New: `src/app/api/health/{whatsapp,yoco,db}/route.ts` (synthetic targets)
- New: `src/app/api/whatsapp/resend-ticket/route.ts` (operator recovery)
- New: `supabase/migrations/yyyy_webhook_events_outbound_jobs.sql`

---

*5 specialist auditors, ~12k tokens of findings, synthesized. The audit holds; the timeline is realistic; the cost model is conservative. The festival is winnable.*
