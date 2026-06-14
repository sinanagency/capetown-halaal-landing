# CTH 2026 — Saved Artefacts Index

**Author:** PhD-rigor synthesis, 2026-06-15.
**All paths absolute.** SHA256 computed at write time. Re-running `shasum -a 256 <file>` proves the artefact has not been tampered with since.

---

## Synthesis artefacts (this audit)

| File | Lines | Bytes | SHA256 |
|---|---:|---:|---|
| `/Users/milaaj/Code/capetown-halaal-landing/security/THREAT-MODEL.md` | 136 | 16,912 | `2540dec7f682a34a044986d309c12d32b9ebcabe0ad13095fa6f6eb35a3378da` |
| `/Users/milaaj/Code/capetown-halaal-landing/security/ATTACK-TREES.md` | 243 | 12,739 | `ba459f995c785e6df0a9fe6f49044c172e42c2a7427b4171631e461fd440bc5f` |
| `/Users/milaaj/Code/capetown-halaal-landing/security/CVSS-SCORED-FINDINGS.csv` | 41 | 13,385 | `f1a8bd15f0c8673d560941398aea0697e37ea1fe63c5b317a7ac3dab7f2cb6db` |
| `/Users/milaaj/Code/capetown-halaal-landing/security/FIX-VERIFICATION.md` | 311 | 14,817 | `9bcecc956bc314d7b4858728335481e96b8b7816379d7a5f1253dd912de96595` |
| `/Users/milaaj/Code/capetown-halaal-landing/security/DEFERRED-RECIPE.md` | 193 | 8,627 | `52042c3201ce51df3d2f226dc90b577440b8fa4acb17529f816db83dc89d2a4a` |
| `/Users/milaaj/Code/capetown-halaal-landing/security/SAVED-ARTIFACTS.md` | this file | — | — |
| `/Users/milaaj/Code/capetown-halaal-landing/security/EXECUTIVE-SUMMARY.md` | see file | — | — |

**Synthesis subtotal:** 5 files (excluding self-index + summary), 924 lines, 66,480 bytes.

---

## Canonical sources cited (existing repo state)

| File | Role | SHA256 |
|---|---|---|
| `/Users/milaaj/Code/capetown-halaal-landing/CLAUDE.md` | The doctrine (8 laws) | `9aa58e72d0b5c6809a625c771486c8da057548173bf4d9c854d9ea21b2ae0809` |
| `/Users/milaaj/Code/capetown-halaal-landing/STATE.md` | Sprint state | `3bc911c6ee0e401774032f1745365d5f95e3ca0d80e6dcee228392ffb4c0be13` |
| `/Users/milaaj/Desktop/CTH-SPRINT-2026-06-15-FINAL.md` | Management end-of-sprint report | `c97aaf30e0ca5790ff160d9f76d896c19b454666edff6207c37723a79a64b3ad` |
| `/Users/milaaj/Code/capetown-halaal-landing/specs/staff-badges-via-fooevents.md` | F01 remediation spec | `e796d477e86bcf9907d7285490ced04e37c8c2f3b196f0c85681d68ec9d82fc6` |
| `/Users/milaaj/Code/capetown-halaal-landing/db/migrations/20260614_support_inbox.sql` | Support inbox schema | `f165168ed5a03917861a995e55aa19932825f4aa9391b0787ba5b1fc8f750589` |
| `/Users/milaaj/Code/capetown-halaal-landing/db/migrations/20260615_pipeline_columns.sql` | Pipeline columns + indices | `48b030d86a2bcba850260d9b739c1e92c6d679bbedb26e7733a5658b782de9d6` |
| `/Users/milaaj/Code/capetown-halaal-landing/db/migrations/20260615_rls_enforce.sql` | F03-F08 RLS enable | `d6b37f96f7bbf407f7052c01f31d14fe265d0baa1139dd17d43ab78881f43cb5` |
| `/Users/milaaj/Code/capetown-halaal-landing/scripts/rls-probe.mjs` | Anon-key RLS probe | `cfba3b19cb2e9d1b12f8f497274b3eecaeb23a1fc03a9394dd7533856d058b48` |
| `/Users/milaaj/Code/capetown-halaal-landing/next.config.ts` | Security headers + CSP | `5d7f007cce9c7383086a4b9d40158fa780a4b8992313dbfa710d9f8cbaf43d5d` |
| `/Users/milaaj/Code/capetown-halaal-landing/src/middleware.ts` | Cron auth + maintenance + admin subdomain rewrite | `38fb162f4bb96da6d9ea5c95369e60962005204381655b47db0742efb6cf6d6c` |
| `/Users/milaaj/Code/capetown-halaal-landing/src/lib/security/abuse-guard.ts` | 5-layer apply abuse stack | `79a75c57b9de5a9495f30ccb08ba28d18ebc61bc83a43fbfc44d248640e32155` |

---

## Related repo regions (referenced, not hashed individually)

- `/Users/milaaj/Code/capetown-halaal-landing/src/app/api/applications/route.ts` — public apply endpoint (abuse guard wiring at lines 60-92)
- `/Users/milaaj/Code/capetown-halaal-landing/src/app/api/admin/applications/route.ts` — triage workbench feed (ilikeEscape at line 26)
- `/Users/milaaj/Code/capetown-halaal-landing/src/app/api/admin/chase/route.ts` — chase rate limit pattern (lines 93-129)
- `/Users/milaaj/Code/capetown-halaal-landing/src/app/api/admin/applications/bulk/route.ts` — bulk rate limit
- `/Users/milaaj/Code/capetown-halaal-landing/src/app/api/admin/whatsapp-broadcast/route.ts` — broadcast (no rate limit — see F12)
- `/Users/milaaj/Code/capetown-halaal-landing/src/app/api/admin/bot-inbox/summarize/route.ts` — AI summariser (no rate limit — see F13)
- `/Users/milaaj/Code/capetown-halaal-landing/src/app/api/whatsapp/webhook/route.ts` — WhatsApp inbound (signature at line 42 + lib/whatsapp.ts:252-265)
- `/Users/milaaj/Code/capetown-halaal-landing/src/app/api/admin/support-inbox/webhook/resend/route.ts` — Resend webhook (svix verify at lines 89-107)
- `/Users/milaaj/Code/capetown-halaal-landing/src/app/api/exhibitor/staff/route.ts` — vendor staff API (still calls portal-state writes — F01 surface)
- `/Users/milaaj/Code/capetown-halaal-landing/src/components/exhibitor/StaffManager.tsx` — unsigned QR mint at line 82 (F01)
- `/Users/milaaj/Code/capetown-halaal-landing/src/lib/exhibitor.ts` — session-binding hardening (F17 fix at lines 43-49)
- `/Users/milaaj/Code/capetown-halaal-landing/src/lib/exhibitor-auth.ts` — CSPRNG password generator (audit L1 fix)
- `/Users/milaaj/Code/capetown-halaal-landing/src/lib/supabase/admin.ts` — service-role client (F10 empty-string fallback)
- `/Users/milaaj/Code/capetown-halaal-landing/src/app/api/payments/yoco/webhook/route.ts` — Yoco webhook idempotency
- `/Users/milaaj/Code/capetown-halaal-landing/src/app/api/cron/festival-reminders/route.ts` — example cron route (auth via middleware)
- `/Users/milaaj/Code/capetown-halaal-landing/src/lib/whatsapp.ts:252-265` — HMAC signature verification (F14 fix)

---

## How to verify any artefact

```bash
shasum -a 256 /Users/milaaj/Code/capetown-halaal-landing/security/THREAT-MODEL.md
# expect: 2540dec7f682a34a044986d309c12d32b9ebcabe0ad13095fa6f6eb35a3378da
```

---

## Total persistence footprint

- 7 synthesis files (incl. this index + executive summary)
- 11 canonical-source hashes recorded
- All artefacts under `/Users/milaaj/Code/capetown-halaal-landing/security/`
- All persistent across sessions; survive `git status` (security/ is currently untracked — add to repo or .gitignore as policy demands)
