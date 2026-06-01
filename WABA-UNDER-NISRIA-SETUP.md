# Set up the festival WABA under Nisria — dead-simple checklist

> Goal: a WhatsApp number that shows "Young at Heart Festival" to users, runs our bot,
> rides Nisria's verification, but can NEVER hurt Nisria.
> Rule: **reuse Nisria's Business Portfolio, create a NEW App + NEW WABA + new number under it.**
> Time: ~30 min of clicking + waiting on the number OTP.

---

## Before you start — have these ready
- You must be an **Admin on Nisria's Business Portfolio** (ask whoever owns it to add you: Business Settings → People → Add, role Admin).
- A **fresh phone number** that is **NOT on any WhatsApp** (not the green app, not WhatsApp Business app). A new SIM or a VoIP number that can receive an SMS/voice OTP both work. If it's already on WhatsApp, delete that account first.
- 2 minutes near the phone when you hit Step 5 (you'll get a one-time code).

---

## Step 1 — Open Nisria's portfolio  (~1 min)
1. Go to **https://business.facebook.com/**
2. Top-left, click the **business switcher** (the portfolio name/avatar).
3. Select **Nisria's portfolio**. Everything below must happen while this is selected.
   - *Screen cue:* the portfolio name shows top-left the whole time.

## Step 2 — Create a NEW Meta App  (~4 min)
1. Go to **https://developers.facebook.com/apps/**
2. Click **Create app** (green button, top-right).
3. App name: **Young at Heart Festival** → next.
4. Use case: pick **Other** → next.
5. Type: **Business** → next.
6. **Business portfolio:** select **Nisria's** from the dropdown → **Create app**.
   - *Why new app:* the webhook URL + app secret live at the app level. New app = festival messages flow to OUR site, with its own secret, never touching Nisria's bot.

## Step 3 — Add the WhatsApp product  (~2 min)
1. On the new app's dashboard, find **Add product** (list of products).
2. On the **WhatsApp** card click **Set up**.
3. When asked for a Business portfolio, pick **Nisria's** again. Meta creates a **new WhatsApp Business Account (WABA)** under it — this is the festival's own isolated WABA. ✅
   - *Screen cue:* you land on **WhatsApp → API Setup** with a temporary test number.

## Step 4 — Grab the two IDs  (~1 min)
On **WhatsApp → API Setup**, copy and save:
- **Phone number ID** → this becomes `WHATSAPP_PHONE_ID` (will change once the real number is added — re-copy after Step 5).
- **WhatsApp Business Account ID** → this becomes `WHATSAPP_BUSINESS_ID`.

## Step 5 — Add the real number + display name  (~5 min + OTP)
1. On **WhatsApp → API Setup**, click **Add phone number** (or go to **WhatsApp Manager** → the festival WABA → **Phone numbers → Add**).
2. **Business display name:** type **Young at Heart Festival** (this is what users see).
3. Pick a category (e.g. "Event planning").
4. Enter the **fresh phone number** → choose **SMS** or **Voice** → **Next**.
5. Type the **code** they send you → verify. ✅
6. Go back to **API Setup** and **re-copy the Phone number ID** (now points to the real number).

## Step 6 — Get the App Secret  (~1 min)
1. Left menu: **App settings → Basic**.
2. Next to **App secret** click **Show** (re-enter your password).
3. Copy it → this is `WHATSAPP_APP_SECRET`.

## Step 7 — Make a permanent token  (~4 min)
*(The default token in API Setup expires in 24h — we need a permanent one.)*
1. **Business Settings → Users → System users** (https://business.facebook.com/settings/system-users).
2. **Add** → name it **yah-bot** → role **Admin** → create.
3. Click **Add assets** → assign the new **App** (full control) AND the new **WABA** (full control) → save.
4. Click **Generate new token** → select the new App.
5. Tick permissions: **whatsapp_business_messaging** and **whatsapp_business_management**.
6. Set expiry to **Never** → **Generate** → copy → this is `WHATSAPP_TOKEN`.
   - *⚠️ You only see this token once. Save it immediately.*

## Step 8 — Set env vars FIRST, then verify the webhook  (order matters)
1. Tell me the 5 values (bottom of this file) — I add them to Vercel and redeploy.
   *(The webhook check in the next step fails unless `WHATSAPP_VERIFY_TOKEN` is already live on the site — Meta sends a test ping and our route only answers if the token matches.)*
2. After I confirm it's deployed: **App → WhatsApp → Configuration → Webhook → Edit**:
   - **Callback URL:** `https://cthalaal.co.za/api/whatsapp/webhook`
   - **Verify token:** the same string you chose for `WHATSAPP_VERIFY_TOKEN`.
   - Click **Verify and save** (should go green).
3. Under **Webhook fields**, click **Manage** → **Subscribe** to **messages**. ✅

## Step 9 — Add billing  (~2 min)
**WhatsApp Manager → the festival WABA → Settings → Payment methods → Add** a card.
(Service replies inside the 24h window are free; template sends bill per message. This bills to whatever card you add here — use the festival's, or Nisria's and reconcile.)

---

## Send back to me when done
Paste these 5 values (and I'll wire them up + run the consent migration):
```
WHATSAPP_TOKEN=          # Step 7 (the permanent one)
WHATSAPP_PHONE_ID=       # Step 5 (re-copied real number)
WHATSAPP_BUSINESS_ID=    # Step 4
WHATSAPP_APP_SECRET=     # Step 6
WHATSAPP_VERIFY_TOKEN=   # any secret string YOU choose, e.g. yah-festival-2026-xy7
```
Also tell me: **the phone number** you used, and **whether you saw the display name "Young at Heart Festival" accepted** (it may say "pending review" — that's fine, it still works).

---
*Saved 2026-06-01 · capetown-halaal-landing · companion to META-WHATSAPP-SETUP.md*
