# Observability

Structured JSON logger for the CTH platform. One JSON line per call so
Vercel + downstream log drains can index by route, vendor application, and
WhatsApp phone.

## Why

`console.log("foo", err)` produces unindexed prose. When a vendor reports
"the bot never replied", we need to filter by `wa_phone` or
`vendor_application_id` across cron jobs, WhatsApp inbound, ingest, and
email. Structured logs make that a one-liner in the log explorer.

## Usage

```ts
import { log } from "@/lib/observability/logger";

log.info("reminder sent", {
  route: "cron/reminders",
  vendor_application_id: app.id,
  wa_phone: app.wa_phone,
  meta: { kind: "stall_payment", attempt: 2 },
});

log.warn("vendor missing phone", {
  route: "api/whatsapp/inbound",
  vendor_application_id: app.id,
});

log.error("woocommerce sync failed", {
  route: "api/cron/wc-sync",
  meta: { status: 502, retry_after_s: 30 },
});
```

## Scoped logger

For routes that emit many lines with the same base context, bind it once:

```ts
import { scoped } from "@/lib/observability/logger";

export async function POST(req: Request) {
  const slog = scoped({ route: "api/whatsapp/inbound" });
  slog.info("received");
  // ...
  slog.error("downstream failed", { wa_phone: phone, meta: { status } });
}
```

## Output shape

```json
{
  "level": "info",
  "msg": "reminder sent",
  "ts": "2026-06-13T19:42:11.041Z",
  "route": "cron/reminders",
  "vendor_application_id": "abc-123",
  "wa_phone": "+27821234567",
  "meta": { "kind": "stall_payment", "attempt": 2 }
}
```

Levels map to the matching `console` channel so Vercel labels them
correctly:

- `info` -> `console.log`
- `warn` -> `console.warn`
- `error` -> `console.error`

## Rules

- Do not log secrets, tokens, full request bodies, or full WhatsApp
  message payloads. Use `meta` for small scalar fields only.
- Keep `meta` keys snake_case and primitive (string, number, boolean) so
  log search stays predictable.
- No em-dashes in messages that may surface in vendor-facing tooling.
- Brand: Zanii AI. Do not mention upstream model vendors in log lines that
  could be surfaced to vendors.
- Prefer `scoped({ route })` at the top of a handler instead of repeating
  `route` on every call.

## Migration

Other streams will adopt this as they touch their routes. To migrate a
single file:

1. Replace `console.error(e)` with `log.error("brief reason", { route, meta: { err: String(e) } })`.
2. Replace `console.log("x happened", payload)` with `log.info("x happened", { route, meta: { ... } })`.
3. Add `vendor_application_id` / `wa_phone` where the handler already
   has them in scope.
