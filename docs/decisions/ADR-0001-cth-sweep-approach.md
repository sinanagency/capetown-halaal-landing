# ADR-0001 — Sweep cthalaal.co.za in maintenance mode instead of feature-flagged in-place fixes

- **Status:** Accepted
- **Date:** 2026-06-08
- **Driver:** Sweep author (Sinan, on behalf of Taona) for the 2026 Cape Town Halaal / Young at Heart festival platform.
- **Affected surfaces:** cthalaal.co.za, youngatheart.co.za, admin.cthalaal.co.za, exhibitor portal, WhatsApp bot.

## Context

Phase 0 doctrine work surfaced seven CTH-DOCTRINE violations
(see `~/Desktop/cth-sweep-2026-06-08/00-doctrine-map.md` fix queue) of
which one is a confirmed P0 (the Sam R10 email never arrived because
Law 5's `maxMessages: 20` SMTP recycle is missing on the GoDaddy
fallback path; see `~/Desktop/cth-sweep-2026-06-08/00-sam-r10-forensics.md`).
The remaining six are P1/P2 across Laws 2, 4, 7, 8.

The platform also has structural fragilities that the doctrine map
did not name but `~/.claude/refs/trees/cth/03-data.md` does: the entire
vendor-portal privacy law is enforced at API-route level, not in
Postgres RLS. One bypass of `getExhibitorContext()` is a cross-tenant
leak.

Sam (Samreen) is the live operator. She uses the admin portal during
the day to approve vendors, allocate stalls, and run broadcasts. The
2026 festival is 11-13 Dec, six months away. The platform must stay
shippable for the next six months.

The sweep needs to:
1. Fix seven doctrine violations.
2. Add a maintenance + privacy hardening pass that does not exist today.
3. Run a 48-hour soak with watchdog crons before unlock.
4. Have a real operator (Sam) prove the playbook end-to-end before unlock.

Three approaches were considered. Each is recorded under "Alternatives
considered" below. The chosen approach is to put the platform into
maintenance mode while the sweep runs.

## Decision

**Sweep cthalaal.co.za in maintenance mode for the duration of the
sweep work.** Add a `MAINTENANCE_MODE` env var, wire it through
`src/middleware.ts`, and redirect all public + admin + exhibitor
traffic to a static `/maintenance` page while keeping these paths
exempt:

- `/api/whatsapp/webhook` (Meta inbound, including STOP/START opt-out
  which is a legal requirement and CANNOT be paused)
- `/api/cron/*` (Vercel-cron-driven jobs, including the delay-notice
  cron)
- Transactional email delivery (Resend primary, GoDaddy SMTP fallback
  with the new `maxMessages: 20` patch applied before the flip)
- Outbound FooEvents ticket purchase redirect from the maintenance
  page itself, so revenue keeps flowing during the sweep

Maintenance mode is one env var (`MAINTENANCE_MODE=1`) and one
middleware branch. Flipping it back to `0` is the unlock step in
Phase 6 of the sweep.

The doctrine fixes land WHILE maintenance is on, gated behind the
12-golden-test eval. The 48-hour soak runs with maintenance still on,
the watchdog cron continuously verifying that the exemption set is
healthy. Unlock means flipping the flag and re-running the operator
playbook with Sam on a screenshare.

## Consequences

### Positive

- **The Sam R10 root cause (Law 5) is fixed before any new user-facing
  send can hit the broken path.** No more dropped vendor emails.
- **The Law 2 RLS fragility cannot bite during the sweep** because no
  authenticated portal traffic is reaching Supabase while
  maintenance is on. The `requireExhibitor()` helper lands and gets
  proven by eval before any vendor sees the new code.
- **No coordination tax with Sam.** Per doctrine map's Law 2 maintenance
  note, Taona's direction is "Sam locked out so concurrent edits don't
  clobber the sweep". Maintenance mode enforces that, no human
  negotiation required.
- **The 48-hour soak is honest.** With production traffic blocked,
  the watchdog cron measures the exemption set + the eval surface, not
  the noise of real users hitting half-fixed pages.
- **The em-dash linter (Law 7) gets to fail loudly without shipping
  broken copy.** Same for the WC pagination patch (Law 4): we can
  prove it against the real WC API without risking a dashboard read
  during the patch window.
- **Reversibility is high.** One env var flip restores the prior
  behavior at any moment.

### Negative

- **Sam is locked out for the soak window.** Forty-eight hours of zero
  admin access. Mitigated by: (1) sweep author has on-call to mark
  any new vendor approval that Sam needs to push through urgently, (2)
  the maintenance page tells Sam exactly when to expect unlock and how
  to reach Taona.
- **Public visitors hit a maintenance page during the work.** Festival
  is six months out, traffic is low. Mitigated by: maintenance page
  carries the outbound link to `tickets.youngatheart.co.za` so ticket
  purchase keeps flowing (Law 3 preserved).
- **WhatsApp inbound continues to land but the bot's reply loop is in
  flux.** Mitigated by: STOP/START handling is exempt; for everything
  else the bot replies with a one-line "we are doing maintenance, will
  reply within X hours" template until unlock. Inbound consent events
  are never lost (the `wa_consent_log` append-only path is exempt).
- **The exemption set itself is a new surface that can break.** Mitigated
  by: the watchdog cron pings webhook, cron last-run, and a Resend
  send-token every 30 minutes throughout the soak.

## Alternatives considered

### A. In-place fixes behind feature flags (rejected)

Land each doctrine fix on `main` behind a per-fix feature flag
(`LAW_5_THROTTLE_RECYCLE`, `LAW_7_EMDASH_LINTER`, etc.), flip the
flags one at a time, observe production for regressions.

**Why rejected:**
- The Law 2 cross-tenant privacy fix CANNOT be feature-flagged safely.
  Either every `/api/exhibitor/*` route calls `requireExhibitor()` or
  the leak exists. A "half on" state is a leak.
- Sam continuing to push approvals during the sweep means the
  `vendor_applications` table mutates while we are also rewriting
  admin_notes parsing (Law 8 phantom-stalls guard). Race conditions
  are guaranteed.
- The 48-hour soak becomes meaningless because real-user noise
  drowns out the watchdog cron's signal.

### B. Parallel staging environment + cutover (rejected)

Spin up a parallel Vercel project + parallel Supabase project, port
all the data, run the sweep on staging, then cut DNS over after
green eval.

**Why rejected:**
- Supabase DDL on the live CTH project is gated (Law 8's parent
  constraint: DDL lives on a different account from this driver). A
  second Supabase project has the same access constraint and adds a
  data-migration tax we do not need.
- WordPress + WooCommerce ticket data are canonical and live; staging
  would either share the same WC instance (no real isolation) or run
  a stub that would not catch Law 4's pagination defect.
- DNS cutover with two domains (cthalaal.co.za + youngatheart.co.za)
  plus the admin subdomain is multi-step and reversible only with TTL
  patience.
- Cost + complexity disproportionate to the size of the fix queue
  (seven items, mostly one-file changes).

### C. Defer the sweep until after the festival (rejected)

Wait until 14 Dec 2026 (post-event), then sweep cleanly with no
live-user concern.

**Why rejected:**
- The P0 (Sam R10 SMTP throttle) is dropping vendor approval emails
  TODAY. Every approval that misses an email is a vendor that does not
  show up. Cannot defer.
- The Law 2 RLS fragility means a single bypass in a `/api/exhibitor/*`
  route during the next six months is a cross-tenant data leak. Cannot
  defer.
- The em-dash law is shipping in vendor-facing emails right now. Every
  approval that goes out is a doctrine violation on the wire. Cannot
  defer.
- Festival is six months out; the sweep has to happen well before
  show day or the soak window is unsafe near the event.

## Reversibility

**High.** Unlock is one `vercel env rm MAINTENANCE_MODE && vercel env
add MAINTENANCE_MODE production` flip (or `MAINTENANCE_MODE=0`,
equivalent). The middleware branch becomes a no-op, all traffic flows
to the real pages, the operator playbook resumes.

If a critical bug surfaces post-unlock, re-enabling maintenance is the
same env-var flip. The `/maintenance` page stays in the codebase as a
permanent affordance for future sweeps. The doctrine fixes themselves
are independently revertible by per-fix git revert if a specific patch
regresses.
