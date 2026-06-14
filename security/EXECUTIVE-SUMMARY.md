# CTH 2026 — Executive Summary (for Taona)

**Date:** 2026-06-15.
**Subject:** Cape Town Halaal / Young at Heart Festival platform — security posture at end of 2026-06-15 sprint.

---

## Overall security posture: **7.0 / 10**

**Justification.** The sprint shipped meaningful, verifiable mitigations across every load-bearing axis: PostgREST injection (F02), email-fallback session binding (F17), WhatsApp signature fail-closed in prod (F14), Resend svix verification (F15), cron-secret enforcement (F16), per-admin rate limits on the high-blast-radius admin routes (F24, F25), and a thoughtful 5-layer abuse stack on the public apply form (F22). Headers + middleware are at industry baseline (HSTS preload, X-Frame-Options DENY, Permissions-Policy, frame-ancestors none). Doctrine compliance on all 8 laws is asserted with code citations. The residual surface is bounded and named, not lurking. The 3-point gap to 10 is owed to: one physically-exploitable vulnerability still in production (staff badge forgery, F01); a critical-band data-layer fix (RLS enablement, F03-F08) shipped without post-deploy probe verification; and a known-broken `is_admin()` RLS policy (F09) that gates `vendor_applications` PII solely by service-role bypass at the API layer. This is the posture of a system that has been audited honestly but not yet completed its remediation cycle.

---

## Top 3 risks STILL OPEN

1. **F01 — Unsigned staff-badge QR (HIGH-IMPACT, REACHABLE).** `src/components/exhibitor/StaffManager.tsx:82` mints an unsigned payload `YHF2026|<stall>|<id>|<name>`. Any printer + the public format = a working forged gate badge. Remediation spec on disk (`specs/staff-badges-via-fooevents.md`); ship before December.

2. **F09 — vendor_applications RLS recursion (HIGH, LATENT).** v13's `is_admin()` throws `42P17 infinite recursion` per `db/migrations/20260615_rls_enforce.sql:155-162`. Admin reads keep working because service-role bypasses RLS, but a single misconfigured `SUPABASE_SERVICE_ROLE_KEY` (F10's empty-string fallback) could flip the system to unauthenticated reads. Rewrite the helper to a SECURITY DEFINER pattern.

3. **F11/F26 — CSP Report-Only + storage bucket policy unverified (MEDIUM, BLAST-RADIUS).** CSP currently observes-but-does-not-block XSS-based admin cookie exfil. The `vendor-docs` Supabase Storage bucket policy was not audited; the `signed-contracts/<application_id>.pdf` path is UUID-guessable IF public-read is on. Both should ship/verify next sprint.

---

## Top 3 wins SHIPPED this sprint

1. **5-layer abuse guard at /apply** (honeypot + token + email + IP throttle + audit log) — confirmed firing in production (STATE.md:46 honeypot trap caught 2 SMOKE TEST rows).

2. **All inbound webhooks (WhatsApp, Resend, Yoco, cron) fail-closed in prod when secrets missing or signatures invalid** — timing-safe HMAC for WA, svix for Resend, Standard-Webhooks for Yoco, Bearer for cron. No unsigned acceptance in production code path.

3. **Per-admin rate limits + recipient caps + template allowlists on `/api/admin/chase`** — leaked admin token cannot pivot to a marketing blast; capped at 5 calls × 200 recipients per admin per minute, restricted to 8 utility templates.

---

## One-line ship recommendation

**SHIP for soak (low-traffic, 6-month runway to festival) — DO NOT consider production-ready until Wave-1 of the deferred recipe lands.**

---

## One-line production-ready bar for December 2026

**Production-ready when staff badges ride on FooEvents-signed PDFs (F01 closed), the RLS probe re-run shows BLOCKED on all PII tables (F03-F09 verified), the `vendor-docs` storage bucket is confirmed private (F26 verified), and the service-role client fails-loud on missing env (F10 closed) — total estimated effort: ~500 lines of code + 2 DB migrations + 2 ops actions, executable in one focused sprint.**
