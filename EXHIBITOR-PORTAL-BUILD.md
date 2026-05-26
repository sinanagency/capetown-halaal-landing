# Exhibitor Portal — A-Z Build Plan

> Building the full spec (`EXHIBITOR-PORTAL-SPEC.md`) for real. No mock data, no fake auth.
> Tracks what is DONE vs IN BUILD so nobody oversells a hollow page again.

## Lessons taken from the Nisria build (applied here)

1. **Real data or nothing.** Every page reads live Supabase. No hardcoded demo users, no `setTimeout` fakes. The old `src/lib/auth.ts` in-memory demo (`admin123`) is being deleted.
2. **`cache: 'no-store'` on every server read** so pages never show stale data (Next.js App Router caches aggressively — bit Nisria, fixed there, pre-empted here).
3. **One clean design system, distinctive not generic.** Floating pill top-nav (not a default sidebar), bento cards, defined palette + gradients, real logo/favicon, proper fonts. CTH brand = crimson `#cd2653` on white editorial (per the white-editorial-over-dark rule), not Nisria's teal.
4. **Gated outbound actions.** Admin broadcasts / WhatsApp sends go through a confirm step + are logged (audit_log), mirroring Nisria's approval queue.
5. **Schema deploy reality for CTH:** the CTH Supabase project (`dtdqopjdxwfvtyrnygdt`) is on a different account than my management token, so **DDL must be pasted into the Supabase SQL Editor by the owner.** I write the SQL; you run it once. Data + auth users + deploy I handle programmatically with the service-role key.
6. **Keep it simple (the CORTEX lesson).** Plain flows, no over-engineering. A vendor logs in, sees what they must do, does it.

## Auth (replaces the email-lookup + dead OTP)

Supabase Auth, per spec section A:
- Approve → create real auth user + generated temp password → approval email (now delivering) with email + temp password + login link. `must_change_password` in user metadata.
- First login → forced set-own-password + accept terms.
- Normal login → email + password session.
- Forgot password → Supabase reset email.
- Team logins (Owner invites Staff) → phase 3.

## Phases

| Phase | Scope | Status |
|---|---|---|
| **0** | Schema migration (`supabase-migration-v7-portal.sql`) — you run it in SQL Editor | 🟡 SQL ready, awaiting run |
| **1** | Real auth (login / set-password / forgot / middleware) + approve creates account + portal shell + **Overview** + **My Stand** | 🟡 building |
| **2** | **Payments** (invoice, PayShap ref, proof upload, confirm) + **Documents** (upload + halaal sign-off) | ⬜ |
| **3** | **Staff & Badges** (team invites, FooEvents QR passes, gate manifest) + **Profile** (→ public directory) | ⬜ |
| **4** | **Announcements** + **Support** + **Resources** + admin **Broadcasts** | ⬜ |
| **5** | WhatsApp (on WABA) + **Live Control** realtime | ⬜ |

Each phase ships deployed + verified before the next. This is how Nisria was built.
