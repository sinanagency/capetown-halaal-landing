# Meta WhatsApp Cloud API — Setup Walkthrough

> Goal: get a verified WhatsApp Business number that our bot can send from.
> Audience: festival admin doing the Meta side. ~30 min of clicking + waiting on verification.
> Provider: Meta Cloud API direct (no markup). Twilio is the fallback if verification stalls near December.

---

## Before you start — gather these
- A **Facebook account** (personal) to be the admin. Make one if needed.
- The festival's **legal business details**: registered name, registration (CIPC) number, address, website (youngatheart.co.za).
- A **dedicated phone number** that:
  - can receive an SMS or voice OTP, and
  - is **NOT currently on any WhatsApp account** (not the personal app, not WhatsApp Business app). A fresh SIM or a VoIP number that receives SMS both work. If a number is already on WhatsApp, delete that WhatsApp account first or use a different number.
- A **business email** on the domain (e.g. admin@youngatheart.co.za) — Meta trusts domain-matched emails more.

---

## Step 1 — Create Meta Business Manager  (~5 min)
1. Go to **business.facebook.com** → **Create account**.
2. Enter business name ("Young at Heart Festival"), your name, business email.
3. In **Business Settings → Business Info**, fill legal name, address, phone, website. Accurate details = smoother verification.

## Step 2 — Create a Meta App  (~5 min)
1. Go to **developers.facebook.com** → **My Apps → Create App**.
2. Choose type **Business**, link it to the Business Manager from Step 1.
3. On the app dashboard, **Add Product → WhatsApp → Set up**.
4. This instantly gives you a **test number** (free, sends to up to 5 verified numbers) so we can build + test before the real number is ready.

## Step 3 — Note your IDs  (~2 min)
In **WhatsApp → API Setup** you'll see:
- **Phone Number ID** → env `WHATSAPP_PHONE_ID`
- **WhatsApp Business Account ID** → env `WHATSAPP_BUSINESS_ID`
- A **temporary 24-hour token** (for testing only — permanent token in Step 6)

## Step 4 — Add the real phone number  (~5 min + display-name review)
1. **WhatsApp Manager → Phone numbers → Add phone number**.
2. Enter the dedicated number, verify via SMS/voice code.
3. Set **display name** = "Young at Heart Festival". This goes through a short review (name must match the business, nothing misleading).

## Step 5 — Business Verification  ← THE SLOW GATE  (minutes to several days)
1. **Business Settings → Security Center → Start Verification**.
2. Submit legal business name + address + a **verification document**: SA company registration (CIPC), or a utility bill / bank statement showing the business name + address.
3. Meta verifies via the document and/or a call/SMS to the business phone.
4. **Until verified** you're capped (low daily message limit, 2 numbers max). **After verified** you unlock higher messaging tiers. Start this early — it's the only step with real lead time.

## Step 6 — Permanent access token  (~5 min)
The 24h token expires. For production:
1. **Business Settings → System Users → Add** (create a system user, role: Admin).
2. **Assign assets**: the app + the WhatsApp Business Account, with `whatsapp_business_messaging` + `whatsapp_business_management` permissions.
3. **Generate token** → choose the app → select those permissions → **never-expiring token**.
4. → env `WHATSAPP_TOKEN`. Treat it like a password.

## Step 7 — Submit message templates  (minutes to ~2 days each)
1. **WhatsApp Manager → Message Templates → Create template**.
2. Paste each of the 7 from `whatsapp-templates.md`, set category (Utility for ticket/countdown/vendor, Marketing only for pure promo).
3. Submit. Utility templates approve fastest. Rejections are usually wording — tweak and resubmit.

## Step 8 — Connect the webhook  (~3 min, we do this together)
1. **App → WhatsApp → Configuration → Webhook → Edit**.
2. Callback URL: `https://cthalaal.co.za/api/whatsapp/webhook` (our Next.js route).
3. Verify token: a secret string we set in env as `WHATSAPP_VERIFY_TOKEN` (Meta sends a GET, our route echoes the challenge).
4. **Subscribe** to the `messages` field. Now inbound msgs + delivery receipts flow to us.

## Step 9 — Add billing  (~3 min)
**WhatsApp Manager → billing → add a payment method** (card). Template sends are billed monthly per message (see cost model in `WHATSAPP-VENDOR-PLAN.md`). Service replies inside the 24h window are free.

## Step 10 — Messaging limit ramp  (know this for the blasts)
New numbers start at **250 business-initiated conversations/day**, auto-scaling (1K → 10K → 100K → unlimited) as you send quality messages without high blocks/spam reports. Verified businesses ramp faster.
**Implication for our 10K-number countdowns:** either request a tier bump ahead of time, or spread the first big blast over a few days so the limit climbs. We schedule around this in the broadcast tool.

---

## Env vars to hand back to me (or add to Vercel)
```
WHATSAPP_TOKEN=            # permanent system-user token (Step 6)
WHATSAPP_PHONE_ID=         # Step 3
WHATSAPP_BUSINESS_ID=      # Step 3
WHATSAPP_VERIFY_TOKEN=     # any secret string you choose (Step 8)
WHATSAPP_APP_SECRET=       # App → Settings → Basic → App Secret (signs inbound webhooks)
```
The moment these exist, the bot goes live. Everything else is built and waiting.

---

## Hosting plan: launch on Nisria now, migrate to Halaal Hub later

We don't need youngatheart legally registered to go live. Two-phase plan:

**Phase A — launch now (no legal friction):**
- Add the festival number as a **separate WABA under Nisria's already-verified Meta portfolio** (separate WABA, not bolted onto Nisria's existing bot — isolates the failure domain).
- Set the number's **display name = "Young at Heart Festival"**. End users see only that; Nisria is invisible (display name is per-number).
- Bot goes live today. Costs bill to Nisria's payment method — track and reimburse.

**Phase B — migrate to its own home (when ready):**
- Verify the **real festival entity** (Halaal Hub, once confirmed in good standing at CIPC — not dormant/deregistering). See verification steps above.
- **Migrate the number** to Halaal Hub's own portfolio: the number, chat history, and all the code below carry over. Only `WHATSAPP_PHONE_ID` + `WHATSAPP_TOKEN` change and templates get re-approved on the new WABA.
- After migration, the festival shares nothing with Nisria.

## Guardrail layer (built — keeps the host account safe)

Run migration **`supabase-migration-v6-wa-consent.sql`** in the Supabase SQL editor before go-live. It adds:
- `wa_contacts` — current consent state per phone (the pre-send gate reads this).
- `wa_consent_log` — **append-only proof ledger** (when/where/what-text/IP) — this is the defense in any dispute.

What's enforced in code, automatically:
1. **Pre-send consent gate** (`src/lib/wa-consent.ts` → `canSend`): every outbound passes through it. Opted-out → blocked forever (even utility). Marketing templates → require explicit opt-in. Free-form text → only inside the 24h service window.
2. **STOP handling** (`/api/whatsapp/webhook`): "STOP/unsubscribe/cancel" → instant opt-out + one confirmation, then silence. "START" → re-opt-in.
3. **Webhook signature check**: every inbound is HMAC-verified against `WHATSAPP_APP_SECRET` — nobody can spoof messages or opt-outs.
4. **Opt-in capture at checkout**: the buyer API records consent to the ledger (with IP + user-agent) when the WhatsApp box is ticked. Frontend just needs to send `whatsappOptIn: true`.
5. **One brain**: the bot replies using the same festival concierge prompt as the site chat (`src/lib/festival-brain.ts`) — no divergent copy.

Webhook callback URL for Step 8: `https://cthalaal.co.za/api/whatsapp/webhook`

**Frontend TODO before go-live:** add the opt-in checkbox at ticket checkout —
*"✅ Send my ticket and Young at Heart Festival updates via WhatsApp to this number"* (un-pre-ticked) — and pass `whatsappOptIn: true` to `/api/buyers`.

---
*Saved: 2026-05-22 · guardrail layer + Nisria-host plan added 2026-06-01 · capetown-halaal-landing*
