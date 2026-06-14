# CTH 2026 — Attack Trees

**Convention:** Each tree rooted at an attacker goal. Children are AND/OR steps. Leaves cite supporting findings + status (REACHABLE / BLOCKED-BY-FIX / BLOCKED-BY-CONSTRAINT).
**Notation:**
- `[OR]` — any child reaches the goal
- `[AND]` — every child required
- Status tags: `R` = REACHABLE today, `BF` = BLOCKED-BY-FIX (cite commit/file), `BC` = BLOCKED-BY-CONSTRAINT (architectural)

---

## ROOT A — Forge a ticket and walk into the festival

```
A. Walk into the festival without paying
├── [OR] A1. Forge a buyer ticket (FooEvents PDF)
│     ├── A1a. Print a screenshot of a friend's ticket → gate scanner rejects on duplicate scan
│     │   STATUS: BC (FooEvents scanner deduplicates; out-of-repo)
│     └── A1b. Reverse FooEvents HMAC and mint a new payload
│         STATUS: BC (HMAC secret server-side WordPress; out-of-repo)
│
├── [OR] A2. Forge a STAFF gate badge   ★ HIGH-IMPACT, REACHABLE ★
│     └── A2a. Print a card with payload "YHF2026|<any-stall>|<any-id>|<any-name>"
│           and a QR rendered from `qrcode` lib.
│         CITES: BRUTE #1, Skeptic-Vendor #1
│         CITES: src/components/exhibitor/StaffManager.tsx:82
│           payload = `YHF2026|${stall||'NA'}|${m.id}|${m.name}` — UNSIGNED
│         STATUS: R (gate has no shared secret to validate against)
│         REMEDIATION: specs/staff-badges-via-fooevents.md
│
├── [OR] A3. Approve self as vendor, then issue self a staff badge
│     ├── A3a. Get past application approval gate (see ROOT B)
│     └── A3b. Even WITHOUT A3a, attacker who has spoofed a single
│              vendor's name + stall can mint badges for "their staff"
│         CITES: same as A2a
│         STATUS: R (A2 alone is sufficient — A3 just makes the badge "plausible")
│
└── [OR] A4. Tailgate behind a real vendor at the gate
      STATUS: physical security, BC (not in software threat model)

OVERALL: REACHABLE via A2 alone. Single most-likely physical exploit.
RESIDUAL: A2 remains until staff-badges-via-FooEvents spec ships.
```

---

## ROOT B — Approve myself as a fake vendor and get a free stall

```
B. Become a confirmed vendor without organiser approval
├── [OR] B1. Mass-submit until Samreen approves without diligence
│     ├── B1a. Submit 50 plausible applications via /apply
│     │   STATUS: BF — rate limit 3/IP/10min at applications/route.ts:88
│     │   PARTIAL: distributed bots (different IPs) bypass; honeypot still fires
│     ├── B1b. Bypass honeypot by inspecting form
│     │   STATUS: PARTIAL — checkHoneypot at abuse-guard.ts:63 trivial to bypass
│     │   if attacker knows field name (defence-in-depth, not the load-bearing layer)
│     └── B1c. Operator carelessly approves → social engineering
│         STATUS: R (low likelihood; out of code scope)
│
├── [OR] B2. Tamper directly with vendor_applications row
│     ├── B2a. Anon-key PATCH /rest/v1/vendor_applications?id=eq.X
│     │       SET status='approved'
│     │   STATUS: BF — RLS write policies (v13 + 20260615_rls_enforce.sql).
│     │   CAVEAT: v13's is_admin() has 42P17 recursion per migration footer line 155-162
│     │   CITES: db/migrations/20260615_rls_enforce.sql:155-162
│     └── B2b. Service-role key leak (env var disclosure)
│         STATUS: BC — SUPABASE_SERVICE_ROLE_KEY server-only, no leak path observed
│
├── [OR] B3. Hijack a real approved vendor's account
│     ├── B3a. Email-fallback session binding
│     │   STATUS: BF — removed at src/lib/exhibitor.ts:43-49
│     ├── B3b. Password reset takeover
│     │   STATUS: PARTIAL — relies on Supabase Auth's reset flow security (BC)
│     └── B3c. Steal admin's session cookie via XSS
│         STATUS: PARTIAL — CSP in Report-Only mode (next.config.ts:36)
│         does NOT block exfil. CONVERGENT BRUTE finding.
│
└── [OR] B4. Promote self in user_metadata
      STATUS: BC — user_metadata is client-writable but no admin route trusts it;
      admin gate uses admin_users table everywhere (see grep on
      src/app/api/admin/*/route.ts)

OVERALL: BLOCKED-BY-FIX for the most realistic vectors. B3c residual.
HIGHEST-RISK CHILD: B2a IF the v13 RLS recursion is still in prod (UNVERIFIED).
```

---

## ROOT C — Drain the Anthropic / Resend / WhatsApp credit balance

```
C. Burn the operator's API budget
├── [OR] C1. Public-form abuse loop (Resend confirmation per submit)
│     ├── C1a. Loop /api/applications
│     │   STATUS: BF — IP throttle 3/10min at applications/route.ts:88;
│     │   honeypot at line 63; token guard at line 69; email guard at line 82
│     ├── C1b. Distributed botnet across many IPs
│     │   STATUS: PARTIAL — application-layer mitigations don't help;
│     │   primary shield is Cloudflare WAF (header note at abuse-guard.ts:11)
│     └── C1c. Slow-burn under threshold (2 hits / 10min / IP from 100 IPs)
│         STATUS: R — practical attacker with cheap proxy pool
│         BUDGET: 2 emails/min/IP * 100 IPs = 200/min Resend at ~$0.001 = ~$0.20/min
│         (low absolute cost, but reputational + Resend deliverability hit)
│
├── [OR] C2. Leaked admin token blasts WhatsApp template
│     ├── C2a. Loop /api/admin/whatsapp-broadcast
│     │   CITES: src/app/api/admin/whatsapp-broadcast/route.ts (no per-admin rate limit found)
│     │   STATUS: R — single call iterates 462-row audience; pacing 250ms slows
│     │   but does not cap. Allowlist of template_key bounds DAMAGE per-call to
│     │   utility templates (no marketing). Meta will throttle aggressively.
│     │   BUDGET: 462 rows * Meta utility ~$0.005 = ~$2.30/call (acceptable per-call)
│     │   PER-DAY if looped: ~$200/day before Meta cuts off.
│     ├── C2b. Loop /api/admin/chase
│     │   STATUS: BF — rate limit 5/admin/min at chase/route.ts:96-115
│     └── C2c. Loop /api/admin/applications/bulk
│         STATUS: BF — rate limit 10/admin/min at applications/bulk/route.ts:30
│
├── [OR] C3. Leaked admin token drains Anthropic budget
│     ├── C3a. Loop /api/admin/bot-inbox/summarize
│     │   CITES: src/app/api/admin/bot-inbox/summarize/route.ts (no rate limit)
│     │   STATUS: R
│     │   BUDGET: 600 max_tokens * ~$0.0003/Ktok output ≈ $0.0002/call.
│     │   Naive loop: 1000 calls/min ≈ $0.2/min ≈ $12/hour. Capped by
│     │   Anthropic rate limit on the operator's API key (BC).
│     └── C3b. Festival-brain (askFestivalBrain) flooded via WhatsApp
│         STATUS: BF — WA inbound rate-limited by Meta; webhook handler
│         dedupes by messageId at webhook/route.ts:83
│
└── [OR] C4. Self-trigger cron-based reminders
      STATUS: BF — /api/cron/* gated by CRON_SECRET in middleware.ts:21-27

OVERALL: REACHABLE via C2a + C3a if attacker has admin JWT. Not reachable from public.
RESIDUAL: C2a + C3a + C1c need rate limits OR Cloudflare bot-fight tightening.
```

---

## ROOT D — Extract every vendor's contract, payment, contact info

```
D. Exfiltrate full PII corpus (462 vendor rows + contracts + WA threads)
├── [OR] D1. Anon-key SELECT against PII tables
│     ├── D1a. /rest/v1/vendor_applications?select=*
│     │   STATUS: PARTIAL/UNVERIFIED. v13 RLS staged; 20260615_rls_enforce.sql
│     │   header confirms wa_messages/wa_threads/site_events LEAKED 172/13/7839
│     │   rows BEFORE migration. Migration assumed applied — no post-deploy
│     │   probe in FINAL.md. vendor_applications NOT in this migration; relies
│     │   on v13 which the migration footer flags as broken with 42P17 recursion.
│     │   CITES: db/migrations/20260615_rls_enforce.sql:8-12 (LEAKS evidence)
│     │   CITES: db/migrations/20260615_rls_enforce.sql:155-162 (recursion bug)
│     │   CONVERGENT: BRUTE F6 + scripts/rls-probe.mjs
│     │   STATUS: R UNTIL re-probe verifies
│     └── D1b. /rest/v1/wa_messages?select=body — exfil ALL inbound vendor msgs
│         STATUS: BF (asserted) — RLS enabled by 20260615_rls_enforce.sql:38-39.
│         POST-DEPLOY VERIFY: run scripts/rls-probe.mjs (not yet done per FINAL.md)
│
├── [OR] D2. Admin session theft
│     ├── D2a. XSS exfils Supabase cookie
│     │   STATUS: PARTIAL — CSP Report-Only does not block
│     │   CITES: next.config.ts:36 ("Content-Security-Policy-Report-Only")
│     ├── D2b. Phish admin operator
│     │   STATUS: BC (human factor)
│     └── D2c. Steal Vercel env via supply-chain (npm dep compromise)
│         STATUS: BC (general supply-chain risk)
│
├── [OR] D3. Vendor portal abuse to enumerate others
│     ├── D3a. /api/exhibitor/* with manipulated payload
│     │   STATUS: BF — every route enforces application_id from server-controlled
│     │   user_metadata at getExhibitorContext (src/lib/exhibitor.ts:18-58).
│     │   IDOR not present in audit.
│     └── D3b. Storage bucket open scan (vendor-docs)
│         STATUS: UNKNOWN — bucket policy not read in this audit.
│         Path scheme `signed-contracts/<application_id>.pdf` at
│         src/app/api/exhibitor/contract/sign/route.ts:61 is enumerable IF bucket
│         is public-read. FLAG FOR VERIFICATION.
│
└── [OR] D4. Backup-side leak
      STATUS: BC (Supabase managed backups)

OVERALL: D1a is the single load-bearing residual until v13 recursion is fixed
AND probe re-run. D3b (storage bucket policy) flagged for verification.
```

---

## ROOT E — Phish a real vendor with a YAH-branded message

```
E. Send a vendor a convincing fake "approval" or "payment-due" message
├── [OR] E1. Spoof YAH "From" header in outbound email
│     ├── E1a. No SPF/DKIM/DMARC alignment
│     │   STATUS: UNKNOWN — DNS not audited. youngatheart.co.za DNS policy
│     │   not in repo. FLAG FOR VERIFICATION.
│     └── E1b. Resend allows arbitrary from-domain
│         STATUS: BC — Resend validates domain ownership at send time
│
├── [OR] E2. Compromise WA template to add malicious URL
│     ├── E2a. Edit template via Meta dashboard
│     │   STATUS: BC (out-of-band, Meta access)
│     └── E2b. Inject URL via /api/admin/whatsapp-broadcast custom_message
│         STATUS: PARTIAL — template_key allowlist (chase/route.ts:120-129)
│         bounds template; broadcast/route.ts allows custom_message variable
│         substitution. NO URL DOMAIN ALLOWLIST. R via leaked admin token.
│
├── [OR] E3. Use legitimate API to send "wrong" message
│     ├── E3a. Admin sends payment_reminder pointing to attacker's payment page
│     │   STATUS: R via leaked admin token. Variable {{paymentUrl}} not domain-locked.
│     └── E3b. Bot sends suggestion that vendor follows blindly
│         STATUS: BF — admin reviews suggestion before send (operator-in-loop)
│
└── [OR] E4. Spoof the support inbox
      ├── E4a. Send mail to support@ that gets quoted in operator reply
      │   STATUS: BF — support inbox is operator-curated; no auto-reply
      └── E4b. Inject into vendor's WA thread by spoofing inbound webhook
          STATUS: BF — HMAC signature required at whatsapp.ts:252-265

OVERALL: E1a (DMARC) flagged for verification. E2b/E3a residual under stolen-admin.
```

---

## Cross-tree leaves matrix (which fixes block which goals)

| Fix / control | Blocks goals |
|---|---|
| Honeypot + IP throttle on /apply | C1a, B1a (partial) |
| ilikeEscape() / search sanitiser | D1 (lateral movement narrowed) |
| WhatsApp signature verify | A (webhook leg), D (webhook leg), E4b |
| Resend webhook svix verify | spoofed support thread injection |
| Cron-secret middleware | C4 |
| Per-admin rate limit (chase, bulk) | C2b, C2c |
| RLS enable migration (20260615) | D1b (asserted) |
| Email-fallback removal | B3a |
| Admin gate by admin_users table | B4 |
| **MISSING: Staff badge HMAC** | **A2 (the single most-exploitable physical goal)** |
| MISSING: whatsapp-broadcast per-admin rate limit | C2a |
| MISSING: bot-inbox/summarize rate limit | C3a |
| MISSING: CSP enforcement (not Report-Only) | B3c, D2a |
| MISSING/UNVERIFIED: v13 RLS recursion fix | B2a, D1a |
| MISSING: Storage bucket policy audit | D3b |
| MISSING: DMARC audit | E1a |

The single common-cause fix that retires the largest tree area is **enforcing CSP** + **shipping staff-badge HMAC**.
