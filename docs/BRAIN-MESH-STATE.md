# CTH Brain Mesh — build state (ADR-004)

Resume pointer for the identity-partitioned brain mesh + WhatsApp vendor
self-service. Read ADR-004 first (`docs/decisions/ADR-004-identity-partitioned-brain-mesh.md`).

## The shape (ported from Sasa, inverted)

Sasa = intent-partitioned (one operator, route by message). CTH = identity-
partitioned (many people, route by WHO). `resolveIdentity(e164)` IS the router.

```
webhook → resolveIdentity → admin?  → handleAdminMessage (swipe-reply etc.)  [unchanged]
                          → else    → routeToBrain():
                                          vendor       → runVendorBrain
                                          buyer/unknown → attendee (askFestivalBrain, read-only)
```

## Built + VERIFIED (iterations 1-2), NOT deployed

- `src/lib/bot/brains/index.ts` — mesh dispatcher (3 named brains).
- `src/lib/bot/brains/vendor-brain.ts` — vendor self-service:
  - WRITES (deterministic, hard-bound to `identity.vendor.id`): update_profile
    (website/insta/fb/tagline/description), publish/hide stall, post_support, pay
    (returns portal link — NO charge from chat in v1).
  - READS: answered by the grounded festival brain, enriched with
    `vendorPortalFacts()` (structured counts/statuses only — injection-safe).
- `src/lib/portal-state.ts` — added `getPortalState()`; `updatePortalState()` now
  idempotent (skips no-op writes).
- `src/app/api/whatsapp/webhook/route.ts` — non-admin path calls `routeToBrain`.
- Wall: `src/lib/bot/brains/vendor-brain.test.ts` — 15 checks green.
  Run: `node --import tsx --test src/lib/bot/brains/vendor-brain.test.ts`
- tsc 0, eslint 0.

## Safety posture

- **Default-off**: `CTH_VENDOR_ACTIONS` unset ⇒ identical to old behaviour
  (every vendor message → festival-brain Q&A). Flip to `on` to enable actions.
- Adversarial review (Security Engineer agent) confirmed the isolation wall:
  cross-tenant write SAFE, role bypass SAFE, money SAFE, grounding-injection SAFE.
  Fixed its findings: multi-apply guard now keys on `applicationCount>1` (not
  distinct names); writes idempotent; support note labelled untrusted to admins;
  publish approval is exact-enum match.

## NEXT iterations (the loop)

3. Confirm-gate primitive (stage → "yes" → commit) for money/irreversible.
   Then: charge-from-chat (Yoco/FNB) + staff-badge FooEvents orders — BOTH
   high-blast-radius (FooEvents-no-fork Law 3, money). Operator-in-the-loop.
4. Formalize admin brain tools; leakage-guard integration tests.
5. Eval set + soak (flag on for owner test number 1st) + `vercel --prod` + live curl proof.

## To enable for soak
Set `CTH_VENDOR_ACTIONS=on` in Vercel prod env, deploy, test from a known
vendor's WhatsApp number (NOT an admin number — admins route to admin-chat).
