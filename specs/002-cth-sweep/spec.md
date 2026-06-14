# Spec — CTH Sweep v1

> 002-cth-sweep. Equivalent of 001-jensen-sweep applied to cthalaal.co.za / youngatheart.co.za.
> Authored 2026-06-08 during the autonomous CTH sweep session.

## Problem

The Cape Town Halaal / Young at Heart 2026 platform ships a real festival on
11-13 Dec 2026 at Youngsfield Military Base. Phase 0 doctrine work surfaced a
P0 violation (Sam's R10 vendor email never arrived because the GoDaddy SMTP
fallback has no `maxMessages: 20` recycle per Law 5) and a P1 fix queue of
six more violations across four laws (see
`~/Desktop/cth-sweep-2026-06-08/00-doctrine-map.md`).

The codebase is architecturally further along than the doctrine map alone
would suggest (per `~/Desktop/cth-sweep-2026-06-08/00-surface-map.md`): full
admin portal, full exhibitor portal, WhatsApp bot with consent ledger,
WooCommerce read-only ticket integration, audit log. The risk is not "needs
porting". The risks are:

1. The P0 + P1 doctrine violations that are already biting (Sam R10).
2. The vendor-data-privacy law (Law 2) lives in API-route guards, not in
   Postgres RLS, so one bypass of `getExhibitorContext()` is a cross-tenant
   leak (`~/.claude/refs/trees/cth/03-data.md` RLS posture section).
3. There is **no maintenance mode** in middleware (`src/middleware.ts`),
   so concurrent edits by Sam during the sweep will clobber the work.
4. The em-dash law (Law 7) is violated in at least one vendor-facing
   template (`src/lib/email/templates/ApplicationApproved.tsx:42`), with
   no automated checker.
5. The WhatsApp consent ledger is solid but untested end-to-end against
   the new admin-broadcast UI under maintenance conditions.

This sweep proves the platform can carry the 2026 festival end-to-end:
Sam logs in, manages an application from `pending` to `paid` with a stall
allocated, sends a vendor WhatsApp blast that is throttle-safe, and the
exhibitor portal shows the right data to the right vendor and only to that
vendor. The output is an unlock decision backed by green eval + prod harness
+ Sam-on-her-laptop trial.

## Outcome (with metrics)

A: Every P0 + P1 + P2 item in the doctrine map's fix queue passes its eval
test (target 7/7 green; minimum to unlock 6/7 with the 7th deliberately
deferred and documented as a v2 item).

B: Every cell in `~/.claude/refs/trees/cth/02-capability.md` that was 🟡
wired+needs-eval flips to ✅ wired+verified, OR is downgraded to 🔴 with
a Phase 3 fix queued and re-verified.

C: A 48-hour soak window with maintenance mode ON but webhook + STOP/START
+ Vercel crons + transactional email exempted (per doctrine map's
maintenance preserve list) shows zero false-positive sends and zero
inbound consent events lost.

D: Sam-on-her-laptop trial: Sam runs the full operator playbook once
(login, application review, status change, stall allocation, payment
mark-paid, vendor WA blast, exhibitor side-check) with the sweep author
on a screenshare. Transcript saved. Zero blocking bugs observed.

E: Unlock means `MAINTENANCE_MODE=0` is flipped in Vercel env, Sam is
told the platform is live, and the post-soak report is filed at
`~/Desktop/cth-sweep-report.md`.

## Scope

In:
- The 7 doctrine-map fix queue items (Law 5 throttle, throttle log, Law 7
  em-dash + automated checker, Law 4 pagination, Law 8 phantom-stalls
  guard, Law 2 RLS on `vendor_applications`)
- A `MAINTENANCE_MODE` env flag + `src/middleware.ts` redirect to a new
  `/maintenance` page, with webhook + cron + STOP/START + transactional
  email exempted per the maintenance preserve list
- Pre-send consent gate seam test against `wa_contacts` (proof STOP works
  even when `wa_messages` queue is non-empty)
- Cross-tenant exhibitor portal eval (logged in as vendor A, attempt to
  read vendor B's record via API)
- A `requireExhibitor()` shared helper that every `/api/exhibitor/*` route
  must call, doctrine-reviewer grep-checks this
- A simple em-dash linter (regex over JSX templates + bot reply pipeline)
- The `ApplicationApproved.tsx:42` em-dash fix
- A `docs/throttle-log.md` seed file
- WC pagination loop in `getTicketStats()` (cursor over `per_page=100`
  until empty)
- 48h soak with maintenance ON, watchdog cron pings the exemption set
- Sam-on-her-laptop trial after maintenance OFF
- Doctrine-reviewer pass on every merge
- Qwen adversarial diff (`qclaude` to Node 03) on each fix tier

Out (explicit non-goals for this sweep, deferred to v2 with doc):
- Real RLS policies on every table beyond `vendor_applications` (cheap
  option (a) chosen this round per data tree verdict; option (b) is a v2
  ADR)
- Replacing GoDaddy SMTP with Resend-only (Law 5 says Resend is preferred;
  the throttle fix is enough for this sweep)
- A `stalls` table migration anyone takes seriously (Law 8 keeps the
  admin_notes marker authoritative; if v6-stalls.sql was applied it stays
  as belt-and-braces)
- Replacing the WhatsApp bot system prompt (no LLM regression in scope)
- Onboarding rebuild
- Multi-tenant productization (single CTH instance until productized)
- New portal surfaces (profile/stand/payments/docs/staff stays as-is)
- A real payment gateway (EFT/PayShap + unique reference stays the
  Phase 2 deferred design note per `project_cth_vendor_payments`)

## User flow (the proof Sam will run, post-soak)

```
day 0  Maintenance off. Sam receives a one-line note from Taona: "back
       up, here is what changed." Public site cthalaal.co.za loads. The
       `/maintenance` page is gone (or returns 404 when fetched
       directly).

day 0  Sam opens admin.cthalaal.co.za. Sign-in form. She signs in.

day 0  /admin dashboard: KPIs render. Revenue + tickets sold come from
       WooCommerce (Law 4, with the new pagination loop). Vendor counts
       come from Supabase. Pending apps shows real recent rows.

day 0  /admin/applications. Sam picks one pending vendor. Status =
       pending. She approves it. The approval email goes out via Resend
       (Law 5 primary). The em-dash is gone from the email body (Law 7).

day 0  Sam opens the same application detail. She adds `STALL:FT12` to
       admin_notes. The over-confirm guard blocks her if FT12 is already
       allocated (Law 8). She gets a 200 OK if it is free.

day 0  Sam marks payment_status=paid + paid_at=now on the same
       application. Audit log row appears.

day 0  Sam opens /admin/broadcast. She picks "all_buyers". She picks the
       countdown template. She queues the send. The first 20 messages
       go, the connection recycles per Law 5, the next 20 go. No
       throttle hit. `wa_messages` shows 40+ rows with status `sent` or
       `delivered`.

day 0  Sam tests Law 2 cross-tenant: signed in as vendor A in an
       incognito tab, she hits `/api/exhibitor/profile?application_id=<vendor-B-id>`.
       Response: 403. The `requireExhibitor()` helper rejected the
       mismatch.

day 0  Sam opens /exhibitor/portal as vendor A (test account). She sees
       her own business name, her own stall code FT12, her own payment
       status `paid`. She tries the URL `/exhibitor/portal/payments`
       and sees her own invoice link.

day 1  A vendor messages the WhatsApp number STOP. The webhook records
       opt_out in `wa_contacts` and writes a row to `wa_consent_log`.
       The bot replies once with a confirmation. Sam tries to broadcast
       to her again; the pre-send gate filters her out (proven by
       eval).

day 1  Sam queries /admin/tickets. The WC pagination loop returns the
       full year-to-date order set, not just the first 100. The
       revenue number reconciles to a manual WC export.

day 7  A week of normal operation. No throttle hits in
       docs/throttle-log.md. No cross-tenant API 403s in audit_log
       beyond Sam's test. No em-dashes in any vendor-facing email
       (CI lint clean).
```

## Non-goals (this PR, not this sweep)

- Onboarding rebuild
- A new portal surface
- Multi-tenant productization (Law 9 equivalent: CTH stays a single
  festival instance until productized as a separate project)
- A new payment gateway integration
- Replacing the WhatsApp bot system prompt
- A `stalls` table migration that fights Law 8

## Open questions

(Resolved at spec time, carried forward as decisions):

1. **Maintenance preserve list:** confirmed per doctrine map summary
   section. Webhook, STOP/START, Vercel crons, transactional email all
   exempt from the middleware redirect. Everything else dark.
2. **Maintenance scope on Law 2 preserve:** confirmed per doctrine map
   Law 2 note: Taona overrides the historical "admin stays accessible"
   stance. All four surfaces dark including admin + exhibitor, so Sam
   cannot concurrently edit during the sweep.
3. **Soak window length:** 48h per the Jensen precedent (spec.md
   Outcome D).
4. **Watchdog cron:** continuous-verify pings the maintenance exemption
   set every 30 minutes (webhook 200, STOP/START round-trip, Resend
   send-token, Vercel cron last-run within window).
5. **RLS option (a) vs (b):** option (a) (shared `requireExhibitor()`
   helper grep-checked by doctrine-reviewer) chosen this round. Option
   (b) (real per-row policies) is a v2 ADR.

No new open questions at spec time.

## 12 golden-set test cases

These map 1:1 to the Phase 0 doctrine map's P0 + P1 + P2 fix queue (7
items) plus 5 sweep-only architectural seam checks. Each becomes a prod
harness battery entry in Phase 4 and a seam-check entry in Phase 2 where
the architecture (not the operator) enforces it.

(Numbered to make the cross-walk to the doctrine map's table trivial.
DM-#N = doctrine map fix queue row #N. SEAM-#N = sweep-only seam test.)

| #   | Source | Law | Test | Pass criterion |
|-----|--------|-----|------|----------------|
| 1   | DM-1   | 5   | GoDaddy SMTP fallback batch of 60 messages | Connection recycles every 20; no throttle 421 error; all 60 land |
| 2   | DM-2   | 5   | Trigger a throttle (mock 421); confirm `docs/throttle-log.md` gets an appended row | File exists; row matches schema (date, batch, count, mitigation) |
| 3   | DM-3   | 7   | Render `ApplicationApproved.tsx` for a sample vendor | Output contains no U+2014 and no U+2013 used as a sentence break |
| 4   | DM-4   | 4   | Mock WC API to return 100 orders + next page; call `getTicketStats()` | Returns all 100+ orders, not just the first 100 |
| 5   | DM-5   | 7   | Run new em-dash linter over `src/lib/email/templates/`, `src/components/**`, bot reply pipeline | Zero hits; CI fails on any new violation |
| 6   | DM-6   | 8   | Code review for any `stalls` table read outside `/api/admin/stalls` route | Zero hits; doctrine-reviewer blocks any new caller |
| 7   | DM-7   | 2   | Sign in as vendor A; call `/api/exhibitor/*` with vendor B's `application_id` query param | 403 from `requireExhibitor()`; no row leaked in response body |
| 8   | SEAM   | 2   | Sign in as vendor A; SELECT via service-role client on `vendor_applications` where id = vendor B's | Permitted by RLS today (option (a)); documented as v2-(b) deferral with the deferral note in the eval output |
| 9   | SEAM   | 5   | Send the same template to the same WC order twice within 10s | Second send blocked by `uniq_wa_order_template` unique index; no duplicate |
| 10  | SEAM   | 1   | Maintenance ON. Hit `cthalaal.co.za/`. Hit `admin.cthalaal.co.za/`. Hit `/api/whatsapp/webhook` (POST). Hit `/api/cron/*` (GET). Hit `/api/exhibitor/portal`. | Public + admin + exhibitor: 302/200 to `/maintenance`. Webhook + cron: 200 (exempt). Transactional email path tested via send-token: success. |
| 11  | SEAM   | 6   | Inspect every `getOrders()` caller in `lib/woocommerce.ts` and grep `src/` for `orders.list` | Every caller passes `after=2026-01-01`; zero violations |
| 12  | SEAM   | 3   | Hit `/checkout` end-to-end (already simulated, no real card) | Redirects out to `tickets.youngatheart.co.za`; no rebuilt ticket store in `src/`; `wa_messages` does not duplicate ticket records |

## Pipeline

This work is Tier 1 (full): SPEC (this doc) -> ADR-0001 (the
"sweep under maintenance mode, not in-place feature-flagged" call,
see `docs/decisions/ADR-0001-cth-sweep-approach.md`) -> SCHEMA-CHECK
(additive only: maintenance flag is an env var, not a schema change;
`requireExhibitor()` is a code helper; throttle log is a markdown file;
the only schema-adjacent thing is the v2 RLS-(b) deferral documented in
the ADR) -> EVAL (seam tests + failing prod harness as the 12 golden
cases) -> CODE (surgical, one fix per commit, mapped 1:1 to a numbered
test case) -> SOAK (48h with watchdog cron).

Doctrine reviewer (`.claude/agents/doctrine-reviewer.md` if present;
otherwise the global `~/.claude/agents/doctrine-reviewer.md`) gates
every merge. Qwen adversarial diff (`qclaude` route to Qwen3-Coder
on DGX Node 03) runs on each fix tier per the Jensen HOW-TO-SWEEP
playbook.

## Done definition

Unlock means: `MAINTENANCE_MODE=0` is set in Vercel env, the
`/maintenance` page is gone from the public surface (or returns 404),
all 12 golden test cases pass (or the agreed deferrals are documented
in the report), Sam has run the operator playbook on her laptop without
a blocking bug, the sweep report at `~/Desktop/cth-sweep-report.md` is
filed, `~/.claude/refs/trees/cth/01-failure-modes.md` +
`02-capability.md` are updated with new status badges, and Taona has
told Sam the platform is back.
