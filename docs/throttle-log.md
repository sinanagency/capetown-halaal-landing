# Email throttle log

Doctrine Law 5: every SMTP throttle incident gets a date + batch + count + mitigation entry here.

| Date | Batch | Count | Source | Mitigation |
|---|---|---|---|---|
| (none recorded yet) | | | | |

## Initial state on 2026-06-08

`maxMessages: 20` + `pool: true` + `maxConnections: 1` configured on both GoDaddy transporters (`src/lib/email/resend.ts:19,31`). Before this commit the throttle was not configured; any batch over 20 emails was at risk of silent drop on the back half.

## When to add an entry

- GoDaddy throttle hit (5xx, "temporary block", or silent drop noticed via Resend webhook gap)
- Manual batch over 100 emails (always note for future scale planning)
- Any change to the throttle constants in resend.ts
