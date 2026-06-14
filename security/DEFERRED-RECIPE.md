# CTH 2026 — Deferred Recipe

**Scope:** Every BRUTE/Skeptic finding and every P0/P1 not yet fixed, grouped into next-sprint waves with structured remediation.
**Sort key:** Severity × exploitability × operator cost.
**Doctrine column** confirms each remediation respects the eight CTH laws.

---

## Wave 1 — Pre-festival shippable (next sprint, blocks December 2026)

### W1-A: Staff badge HMAC (F01)
**Source findings:** BRUTE #1, Skeptic-Vendor #1.
**Files:** `src/components/exhibitor/StaffManager.tsx:76-110` (remove client-side QR mint), `src/app/api/exhibitor/staff/route.ts` (call WC), new `scripts/wc-create-staff-product.mjs`.
**Estimated diff:** ~250 lines (delete 30 in StaffManager + add 80 in staff API route + 60 in WC create script + 80 in gate-scanner allowlist).
**Doctrine alignment:** L3 (FooEvents-no-fork: layer not rebuild ✅), L4 (FooEvents source of truth ✅), L8 (no phantom stalls ✅).
**Dependencies:**
- WC product `staff-badge` created via REST API.
- New Vercel env: `STAFF_BADGE_PRODUCT_ID`.
- FooEvents PDF theme path confirmed live (per memory `feedback_fooevents_pdf_theme_path`).
- Gate-scanner allowlist updated to accept `staff-badge` ticket type.

**Rationale to land first:** This is the only physically-exploitable finding open in the model. Festival is the only place the consequence materialises.

---

### W1-B: vendor_applications + admin_users RLS recursion (F09)
**Source:** BRUTE F6-followup, migration `20260615_rls_enforce.sql:155-162`.
**Files:** New `db/migrations/20260616_is_admin_fix.sql`.
**Estimated diff:** ~80 lines SQL.
**Doctrine alignment:** L2 (vendor-data-privacy ✅), L8 (no phantom tables ✅ — just function rewrite).
**Dependencies:**
- Supabase DDL access (CTH project is on a separate account; Taona pastes manually per CLAUDE.md).
- Rewrite `is_admin()` to a SECURITY DEFINER function reading a materialised `admin_user_ids` view, OR grant BYPASSRLS to a dedicated role.
- Re-run `node scripts/rls-probe.mjs` to confirm 4 tables flip from `OPEN-EMPTY`/`LEAKS` to `BLOCKED`.

**Rationale to land first:** Until this is fixed, vendor_applications PII is gated only by service-role-bypass at the API layer — single misconfiguration (W1-D) makes it world-readable.

---

### W1-C: Storage bucket policy verification + lock-down (F26, V18)
**Source:** Synthesis audit gap.
**Files:** Manual Supabase Storage policy + `scripts/verify-storage-policy.mjs` (new probe).
**Estimated diff:** 100 lines for the probe script.
**Doctrine alignment:** L2 ✅.
**Dependencies:**
- Confirm `vendor-docs` bucket policy is **private** (no public-read).
- Replace any `getPublicUrl` calls with `createSignedUrl(path, ttl)` (60s TTL for downloads).
- Probe script attempts public GET on a known UUID; expects 401/403.

**Rationale to land first:** Signed contracts contain handwritten signatures + IP. Enumerable bucket = full vendor contract exfil with one URL guess.

---

### W1-D: Service-role key fail-loud (F10, V15)
**Source:** BRUTE synthesis.
**Files:** `src/lib/supabase/admin.ts:6-22`, mirror at `src/lib/festival-brain.ts:91,124`.
**Estimated diff:** 15 lines.
**Doctrine alignment:** L1 ✅.
**Pattern:**
```typescript
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!key && process.env.NODE_ENV === 'production') {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY missing in production')
}
return createClient(URL, key || '', { ... })
```

**Rationale:** Surfaces config drift loudly instead of silently degrading.

---

### W1-E: Post-deploy RLS probe + attach to STATE.md (F33, V11)
**Source:** BRUTE migration gap.
**Files:** `scripts/rls-probe.mjs` (exists), STATE.md update.
**Estimated diff:** Run-and-paste — no code change.
**Doctrine alignment:** verification-before-completion (master profile).
**Action:** `node scripts/rls-probe.mjs > /tmp/rls.txt && cat /tmp/rls.txt` and append the BLOCKED/LEAKS column to STATE.md.

**Rationale:** Closes the only PARTIALLY-PASSED claim in the verification report.

---

## Wave 2 — Hardening (no-regret defence-in-depth)

### W2-A: Per-admin rate limit on whatsapp-broadcast + bot-inbox/summarize (F12, F13)
**Source:** Skeptic-DoS.
**Files:**
- `src/app/api/admin/whatsapp-broadcast/route.ts` (add rate-limit pattern from chase route).
- `src/app/api/admin/bot-inbox/summarize/route.ts` (same).
**Estimated diff:** ~30 lines per file (Map-based, mirror chase pattern).
**Doctrine alignment:** L5 (email-throttle ✅, extended principle), no phantom DDL ✅.
**Dependencies:** None (in-memory Map, process-local).

**Numbers:**
- Broadcast: 3/admin/min (matches operator workflow — one broadcast per 15min real-world).
- Summarize: 30/admin/min (operator clicks through threads, this is generous).

---

### W2-B: Extract `ilikeEscape` + search-sanitiser helper (F02 sustain)
**Source:** Drift risk noted in V1.
**Files:** New `src/lib/security/postgrest-search.ts`, refactor 2 call sites.
**Estimated diff:** 60 lines.
**Doctrine alignment:** L2 ✅.
**Rationale:** Removes "must stay in sync" comment from `/api/admin/applications/route.ts:25` and `/api/applications/route.ts:25`.

---

### W2-C: CSP promotion from Report-Only to enforcing (F11, V16)
**Source:** BRUTE-CSP.
**Files:** `next.config.ts:36`.
**Estimated diff:** 10 lines (rename header + collect 1 week of report data + remove `unsafe-inline`/`unsafe-eval` where possible).
**Doctrine alignment:** L2 ✅.
**Dependencies:**
- Add `report-to` endpoint (e.g., Cloudflare CSP report URL).
- Observe violations for 1 sprint.
- Promote `Content-Security-Policy-Report-Only` → `Content-Security-Policy`.
- Remove `unsafe-eval` (Next 16 may still need it for dev; check enforcement on prod-only).

---

### W2-D: Vendor doc upload rate limit (F34)
**Source:** Skeptic.
**Files:** `src/app/api/exhibitor/documents/route.ts`.
**Estimated diff:** ~30 lines.
**Pattern:** Per-application 5 uploads/min + 50 uploads/application total cap.

---

### W2-E: DMARC/DKIM/SPF audit (F27, V19)
**Source:** Skeptic-Mail.
**Files:** No code change; DNS-only.
**Action:**
- `dig +short TXT _dmarc.youngatheart.co.za` — expect `v=DMARC1; p=reject; rua=mailto:dmarc@…`.
- Confirm Resend's `_resend._domainkey.youngatheart.co.za` signing key live.
- `dig +short TXT youngatheart.co.za` — confirm SPF includes Resend (`include:resend.com`) + GoDaddy SMTP (`include:secureserver.net`).

**Doctrine:** L5 ✅ (email integrity).

---

## Wave 3 — Operator hygiene (one-shot tasks for Taona)

### W3-A: Set `RESEND_WEBHOOK_SECRET` + `IMAP_PASS` on Vercel (F38)
Already on Taona's plate per STATE.md:106 + FINAL.md:80-81.
**Until done:** Resend webhook returns 503 in prod (correct fail-closed). Support inbox mirror broken. IMAP fetcher starves.

### W3-B: Delete two `[SMOKE TEST]` rows from `vendor_applications`
Already on Taona's plate per STATE.md:98-99 + FINAL.md:83-84.

### W3-C: Demote `Taona Owner Walkthrough` row from approved cohort
Already flagged per STATE.md:97 + FINAL.md:85.

### W3-D: Rotate `MAINTENANCE_BYPASS_TOKEN` quarterly
Per V14 residual.

---

## Wave 4 — Architectural improvements (post-festival)

### W4-A: Shared rate-limit store (Redis or Supabase RPC)
**Source:** V7 residual.
**Files:** New `src/lib/security/rate-limit.ts` backed by Supabase upsert (atomic INCR via `pg` advisory lock or `RAISE`).
**Doctrine:** L2 ✅.
**Trigger:** When Vercel scales beyond single instance.

### W4-B: Middleware filename rename to proxy.ts (F35)
Per Next 16 deprecation noted in `src/middleware.ts:1-4`.

### W4-C: AI summariser prompt-injection hardening (F36)
**Source:** BRUTE.
**Files:** `src/app/api/admin/bot-inbox/summarize/route.ts`, `src/lib/bot/reply-guard.ts`.
**Approach:** Add a separator-token wrapper around user-supplied messages so the prompt sees:
```
=== USER MESSAGE START ===
<vendor body>
=== USER MESSAGE END ===
```
Doesn't fully block injection but reduces success rate. Operator-in-loop remains the load-bearing control.

### W4-D: BRUTE prompt-injection corpus + eval
Build a 50-row red-team corpus + eval in `eval/` to regression-test summariser/reply-guard against known injection patterns. Run on every release.

---

## Next-sprint wave plan (recommended order)

1. **Wave 1 first** — every item is festival-blocking or one-config-flip away from prod incident.
2. **Wave 2** in parallel with W1-A while waiting on WC product setup.
3. **Wave 3** is operator-side and can run anytime.
4. **Wave 4** is post-festival.

**Single-sprint MVP cut:** W1-A + W1-B + W1-C + W1-D + W1-E. Total estimated diff ~500 lines + 2 DB migrations + 2 ops tasks. Achievable in one sprint with one engineer.
