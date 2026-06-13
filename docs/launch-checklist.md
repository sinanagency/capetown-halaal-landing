# Cape Town Halaal Landing — Deploy Day Checklist

> Run through in order. Check each off as you go. If any item fails, STOP and report before proceeding.

## DNS & Email Verification

- [ ] Resend SPF record live at cthalaal.co.za (DNS lookup shows `v=spf1 include:sendgrid.net ~all`)
- [ ] Resend DKIM record live (DNS lookup shows `v=DKIM1; k=rsa; p=...`)
- [ ] Resend DMARC record live (DNS lookup shows `v=DMARC1; p=quarantine;`)

## Vercel Environment

- [ ] All env vars populated in Vercel project settings:
  - `DATABASE_URL` (Supabase connection string)
  - `NEXT_PUBLIC_SUPABASE_URL` (public API URL)
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` (anon key)
  - `SUPABASE_SERVICE_ROLE_KEY` (for server-side migrations)
  - Any email/payment/third-party keys required
- [ ] Preview + Production environments both set

## Database & Migrations

- [ ] Log into CTH Supabase SQL Editor
- [ ] Run migrations v8 through v12 (in order, one by one)
- [ ] Confirm all tables created: `vendor_applications`, `stalls`, `contracts`, `admin_users`
- [ ] Spot-check: query `vendor_applications` returns 0 rows (demo data cleaned)

## Demo Data Cleanup

- [ ] Demo vendor (if any) removed from vendor_applications
- [ ] Demo contracts deleted
- [ ] Demo admin accounts disabled or removed
- [ ] Stalls.json reflects only real allocation (no test stalls)

## Smoke Tests (Browser)

- [ ] Navigate to cthalaal.co.za → site loads, no console errors
- [ ] Contract sign flow: upload test PDF, sign, confirm email received
- [ ] Samreen admin login works: navigate to /admin, log in with Samreen's credentials, vendor list loads
- [ ] Bot inbox: open on mobile, respond to a test message, confirm reply posts instantly

## Go/No-Go Decision

- [ ] All checklist items passed
- [ ] Team lead approval obtained
- [ ] Press release ready (if applicable)
- [ ] Support contact info live on site

**Status:** ___________________________  
**Date:** ___________________________  
**Signed by:** ___________________________
