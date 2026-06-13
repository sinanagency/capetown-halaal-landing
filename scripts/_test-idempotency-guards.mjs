// KT #244 mirror verify (CTH side). Same shape as the jensen-pa
// _test-ingest-idempotency.mjs that shipped with cfce4e0 today and the
// nisria-techops _test-digital-u-idempotency.mjs that shipped with 7324764.
//
// CTH has three webhook routes that take side-effects on per-id callbacks:
//   - /api/payments/transaction-junction  (TJ retries)
//   - /api/payments/fnb/return           (browser refresh)
//   - /api/whatsapp/deliver-ticket       (WooCommerce retries)
//
// The first two gate on portal-state.payment.status === 'paid' via
// isPaidPaymentStatus(). This test covers that pure predicate.
//
// Pass: exit 0. Fail: exit 1.

import { isPaidPaymentStatus } from "../src/lib/idempotency-guards.ts";

let pass = 0;
let fail = 0;
const fails = [];

function check(name, cond, detail) {
  if (cond) { pass++; process.stdout.write(`[PASS] ${name}\n`); }
  else { fail++; fails.push({ name, detail }); process.stdout.write(`[FAIL] ${name}${detail ? " — " + detail : ""}\n`); }
}

// ─────────────────────────────────────────────────────────────────────
// TERMINAL — guard MUST short-circuit. 'paid' = vendor already confirmed,
// state already mutated, no second mutation + no second confirmation.
// ─────────────────────────────────────────────────────────────────────
check("terminal: 'paid' gates payment webhook + return URL", isPaidPaymentStatus("paid") === true);

// ─────────────────────────────────────────────────────────────────────
// NON-TERMINAL — guard MUST let the route proceed.
// ─────────────────────────────────────────────────────────────────────
check("non-terminal: null = no prior payment, proceed", isPaidPaymentStatus(null) === false);
check("non-terminal: undefined = no prior payment, proceed", isPaidPaymentStatus(undefined) === false);
check("non-terminal: empty string treated as null", isPaidPaymentStatus("") === false);
check("non-terminal: 'none' = explicit no payment, proceed", isPaidPaymentStatus("none") === false);
check("non-terminal: 'pending' = attempt in flight, proceed", isPaidPaymentStatus("pending") === false);
check("non-terminal: 'deferred' = not yet collected, proceed", isPaidPaymentStatus("deferred") === false);
check(
  "non-terminal: 'failed' allows legit retry through",
  isPaidPaymentStatus("failed") === false,
  "gateway failure must be retry-able after the buyer fixes their card",
);
check(
  "non-terminal: 'waived' allows real payment registration",
  isPaidPaymentStatus("waived") === false,
  "organiser may waive a fee then collect later if circumstances change",
);

// ─────────────────────────────────────────────────────────────────────
// EDGE CASES — fail-open on unknown / coerced inputs.
// ─────────────────────────────────────────────────────────────────────
check("edge: unknown string is non-terminal", isPaidPaymentStatus("foo") === false);
check("edge: numeric coerced shape is non-terminal", isPaidPaymentStatus(0) === false);
check("edge: 'PAID' uppercase is non-terminal (strict casing)", isPaidPaymentStatus("PAID") === false);

// ─────────────────────────────────────────────────────────────────────
process.stdout.write(`\n${pass} passed, ${fail} failed.\n`);
if (fail > 0) {
  process.stdout.write("\nFailures:\n");
  for (const f of fails) process.stdout.write(`  - ${f.name}\n    ${f.detail || ""}\n`);
  process.exit(1);
}
process.stdout.write("ALL GREEN. KT #244 CTH mirror verified.\n");
process.exit(0);
