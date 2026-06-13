# WhatsApp Templates for YAH Festival 2026

Status of each template + the exact wording submitted to Meta. Both are
**UTILITY** category (transactional), English.

## 1. `vendor_application_approved`

Fires when an admin approves a vendor application.

**Header:** (none)

**Body:**

```
Hi {{1}}, great news. Your application for {{2}} at Young at Heart Festival 2026 is approved.

Log in to your exhibitor portal at https://cthalaal.co.za/exhibitor/login using the temporary password we just emailed to you. Complete your details and upload your halaal certificate before {{3}}.

We can't wait to host you in December. The YAH Team.
```

**Footer:** (none)

**Buttons:** (none — keep it simple for first approval)

**Parameters:**
- {{1}} = vendor contact first name
- {{2}} = business name
- {{3}} = payment due date (e.g. "1 September 2026")

**Sample (Samreen example):**
> Hi Samreen, great news. Your application for Samreen Test Stall at Young at Heart Festival 2026 is approved.
>
> Log in to your exhibitor portal at https://cthalaal.co.za/exhibitor/login using the temporary password we just emailed to you. Complete your details and upload your halaal certificate before 1 September 2026.
>
> We can't wait to host you in December. The YAH Team.

---

## 2. `vendor_payment_confirmation`

Fires when a vendor's payment is confirmed (Yoco webhook or admin manual).
Already wired in `src/lib/payments/confirm.ts` and will fire automatically as
soon as the template is approved at Meta.

**Body:**

```
Hi {{1}}, payment received. {{2}} confirmed for {{3}} at Young at Heart Festival 2026.

Your invoice and stall details are in your portal at https://cthalaal.co.za/exhibitor/portal/invoice. See you in December. The YAH Team.
```

**Parameters:**
- {{1}} = vendor first name
- {{2}} = amount (e.g. "R6 500")
- {{3}} = stall label (e.g. "MARQUEE Full Space 3x3m")

**Sample (Samreen R10 example):**
> Hi Samreen, payment received. R10 confirmed for MARQUEE Full Space 3x3m at Young at Heart Festival 2026.
>
> Your invoice and stall details are in your portal at https://cthalaal.co.za/exhibitor/portal/invoice. See you in December. The YAH Team.

---

## How to submit to Meta

### Option A: Auto-submit via Graph API (fastest)

```
node scripts/submit-whatsapp-template.mjs vendor_application_approved
node scripts/submit-whatsapp-template.mjs vendor_payment_confirmation
```

Reads template content from this file, posts to `https://graph.facebook.com/v20.0/{WHATSAPP_BUSINESS_ID}/message_templates`. Returns Meta's submission ID. Approval typically takes 5-60 minutes.

### Option B: Submit manually via Business Manager UI

1. Open https://business.facebook.com → WhatsApp Manager
2. Select "Cape Town Halaal" account
3. Templates → Create Template
4. Category: **UTILITY**
5. Language: **English**
6. Paste the body verbatim
7. Submit

---

## Status checks

```
node scripts/list-whatsapp-templates.mjs
```

Lists every template registered to your WABA with approval state (APPROVED / PENDING / REJECTED).

## Important

- Templates with the same name cannot be re-submitted while pending. Delete first if you want to change wording.
- Once APPROVED, the code at `src/lib/payments/confirm.ts` (payment) and `src/app/api/applications/[id]/route.ts` (approval) will fire them automatically.
- The 24-hour customer-service window does NOT apply to templates (templates are business-initiated, always sendable).
