# CTH 2026 — LAUNCH CHECKLIST

> The human go/no-go gate. Tick every box before `vercel --prod` on launch week.
> Festival dates: **Dec 11-13 2026**, Youngsfield Military Base.
> Domains: `cthalaal.co.za` (primary) + `youngatheart.co.za`.
> Companion automated gate: `npm run test:e2e` (Playwright). Companion deploy gate: `/deploy-verify` skill.

Pattern adapted from `thedaviddias/Front-End-Checklist` + CTH-DOCTRINE (the eight laws in `CLAUDE.md`).

---

## 0 — Doctrine compliance (the eight laws)

- [ ] **Law 1 — Deploy target.** `vercel --prod` from project root. NO `netlify deploy`. Confirm `.vercel/project.json` points to `capetown-halaal-landing`.
- [ ] **Law 2 — Vendor PII.** Grep public pages for `phone`, `email`, `admin_notes`, `id_number`, `address`. Public pages render only what vendor marked public.
- [ ] **Law 3 — FooEvents no-fork.** No code path duplicates ticket purchase / delivery / PDF. WC API + FooEvents = source.
- [ ] **Law 4 — Ticket source of truth.** Every dashboard counter reads WC API at request time OR cached snapshot with `fetched_at` shown.
- [ ] **Law 5 — Email throttle.** Every batch send uses `maxMessages: 20`. Resend for blasts, GoDaddy for confirmations only. `docs/throttle-log.md` exists and is current.
- [ ] **Law 6 — Date filter.** `grep -rn "orders.list\|wc.get.*orders" src/lib` — every call has `after=` scoped to 2026.
- [ ] **Law 7 — No em-dashes.** `grep -rn "—\|–" src/ public/ app/ | grep -v test-results` returns zero hits in vendor-facing strings.
- [ ] **Law 8 — Stall allocation.** No `stalls` table in code. Allocations live as `⟦STALL:code⟧` markers on `vendor_applications.admin_notes`. Map reads `public/stalls.json`.

---

## 1 — Build & typecheck

- [ ] `npm run build` exits 0
- [ ] `npx tsc --noEmit` exits 0 (build hides TS errors via `ignoreBuildErrors`)
- [ ] `npm run lint` exits 0 (or all warnings reviewed and accepted)
- [ ] No `console.error` / `console.warn` spam during build
- [ ] Bundle size sanity: `.next/analyze` reviewed if any new heavy dep

## 2 — Automated E2E (Playwright)

- [ ] `npm run test:e2e` green on `desktop` + `mobile` projects
- [ ] Homepage smoke test passes
- [ ] `/apply` form renders
- [ ] `/login` renders, `/exhibitor/portal` redirects unauth → login
- [ ] All `/admin/*` routes block unauth (redirect or 401/403/404)
- [ ] WhatsApp webhook GET handshake works with real `WHATSAPP_VERIFY_TOKEN`
- [ ] Mobile: homepage has no horizontal scroll on iPhone 14

## 3 — Environment variables (Vercel production)

- [ ] Pull current: `vercel env pull .env.production.preview` and diff against `.env.local`
- [ ] No trailing `\n` on any value (re-add with `echo -n` if found)
- [ ] `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY` present
- [ ] `WHATSAPP_VERIFY_TOKEN` + `WHATSAPP_APP_SECRET` + `WHATSAPP_PHONE_ID` + permanent system-user token present
- [ ] `WOOCOMMERCE_URL` + `WC_CONSUMER_KEY` + `WC_CONSUMER_SECRET` present
- [ ] `RESEND_API_KEY` present (vendor blasts)
- [ ] `GODADDY_SMTP_*` present (confirmation emails)
- [ ] `ANTHROPIC_API_KEY` present (festival brain)
- [ ] No `localhost` URLs anywhere in production env

## 4 — Auth & RLS

- [ ] Exhibitor portal: confirm Supabase RLS policies on `vendor_applications`, `exhibitors`, `stalls_meta` deny `anon` reads
- [ ] Demo accounts (`Demo2026!`) disabled or password rotated for launch
- [ ] `set-password` flow works end-to-end (forgot → reset → login)
- [ ] Middleware `src/middleware.ts` blocks `/admin/*` for non-admin role

## 5 — Tickets (WooCommerce + FooEvents)

- [ ] `cthalaal.co.za/shop` (WP) loads and renders SSL clean
- [ ] Add-to-cart → checkout → PayFast → order created (test order with refund)
- [ ] FooEvents PDF ticket attaches to order email (server path correct)
- [ ] WC API call from CTH app: `/api/wc/orders` returns festival-year orders only (date filter law)
- [ ] Ticket counter on `/admin/tickets` matches WP order count

## 6 — Vendor flows

- [ ] `/apply` accepts a test submission, writes to `vendor_applications`, sends confirmation email
- [ ] Confirmation email contains correct June-1 outcome notice date (or current equivalent), no em-dashes
- [ ] Admin `/admin/follow-up` shows applicant, can mark status, allocate stall code
- [ ] Stall allocation writes `⟦STALL:code⟧` to `admin_notes`, over-confirm guard fires on duplicate
- [ ] Public stall map (`/exhibitor/map-demo` or live equivalent) renders `public/stalls.json` correctly

## 7 — Admin portal

- [ ] `/admin` requires login, shows correct admin identity
- [ ] `/admin/analytics` loads without errors
- [ ] `/admin/bot-inbox` shows WhatsApp threads, can reply
- [ ] `/admin/contacts` renders vendor list with privacy markers respected
- [ ] `/admin/tickets` counter matches WC source of truth

## 8 — WhatsApp bot

- [ ] Meta webhook verified (GET handshake returns challenge) — `tests/e2e/whatsapp-webhook.spec.ts` proves this
- [ ] Send inbound test message → bot replies within 10s
- [ ] STOP keyword → opt-out recorded, no further outbound
- [ ] START keyword → consent re-recorded, outbound allowed
- [ ] Handover to human: bot escalates to admin on intent detection, owner notified
- [ ] Outbound test (admin sends from `/admin/bot-inbox`) delivers to real number
- [ ] Reply-guard runs on every outbound (no em-dashes, no PII leak)

## 9 — Email infrastructure

- [ ] GoDaddy SMTP throttle log (`docs/throttle-log.md`) current
- [ ] Resend domain `cthalaal.co.za` verified (DKIM, SPF, DMARC green)
- [ ] Test send via Resend (vendor blast format) lands in Gmail inbox not spam
- [ ] Confirmation email rendering correct on mobile Gmail + Outlook
- [ ] Unsubscribe link in every vendor blast email

## 10 — Performance & SEO

- [ ] Lighthouse: Performance ≥ 85, Accessibility ≥ 90, SEO ≥ 95 on `/`
- [ ] All images use `next/image` with `width`/`height` set
- [ ] `robots.txt` present, allows production, blocks staging
- [ ] `sitemap.xml` present, includes `/`, `/apply`, `/vendors`, `/contact`, `/privacy`, `/terms`
- [ ] Favicon + Apple touch icon + OG image present at correct sizes
- [ ] Meta `description` + `og:title` + `og:image` on every public page

## 11 — Security

- [ ] HTTPS forced (Vercel default, verify)
- [ ] Security headers: `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy` set in `next.config.ts` or middleware
- [ ] No `service_role` keys in client bundle (`grep -rn "SUPABASE_SERVICE_ROLE_KEY" src/components src/app | grep -v "use server"`)
- [ ] WhatsApp webhook validates `X-Hub-Signature-256` on every POST
- [ ] WC webhook secret verified on inbound order events
- [ ] CORS configured on `/api/*` to allow only known origins

## 12 — Mobile UX (vendors browse on phones)

- [ ] Touch targets ≥ 44×44 px
- [ ] Forms work without zoom (font-size ≥ 16px on inputs)
- [ ] No horizontal scroll on any public page at 375px width
- [ ] Tap-to-call links on phone numbers (`tel:`)
- [ ] WhatsApp links use `wa.me/<E164>` not `whatsapp://`

## 13 — Cross-domain (`youngatheart.co.za`)

- [ ] DNS resolves to Vercel
- [ ] Renders same app (or correct redirect)
- [ ] SSL cert valid
- [ ] Canonical URL strategy decided (which domain is canonical for SEO)

## 14 — Monitoring & rollback

- [ ] Vercel deployment notifications wired (Slack/email)
- [ ] Supabase logs accessible to operator
- [ ] WhatsApp webhook errors logged + alertable
- [ ] Rollback plan: previous `vercel` deployment ID written down, `vercel rollback` tested in staging
- [ ] On-call: who answers Saturday Dec 12 at 22:00? Written + acknowledged

## 15 — Pre-flight soak

- [ ] Tag release in git: `git tag launch-2026-12-11 && git push --tags`
- [ ] Deploy to production: `vercel --prod`
- [ ] `/deploy-verify` skill run, all gates green
- [ ] Wait 30 min, watch error logs, no critical errors
- [ ] Smoke test live: load homepage, submit dummy `/apply`, send dummy WhatsApp message, place test ticket order (refunded immediately)
- [ ] Announce internally: launch is live, monitoring open

---

## What this checklist does NOT cover

- Festival operations (stall logistics, security, catering) — not a code concern
- Marketing schedule — separate spreadsheet
- Vendor verification blast (see `project_cth_verification_blast.md` memory)
- WP ticket store (separate WordPress instance, has its own deploy)

---

**Owner:** Taona. **Reviewer:** doctrine-reviewer agent + Playwright. **Gate:** every box ticked, every E2E green, every law verified. No exceptions.
