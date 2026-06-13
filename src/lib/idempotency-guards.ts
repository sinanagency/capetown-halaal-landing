// KT #244 port: chokepoint-side idempotency guards for CTH webhook routes.
//
// The pattern (from jensen-pa cfce4e0 + nisria-techops 7324764): when an
// external producer can call back the same endpoint more than once for the
// same id (payment gateway retries, WordPress retries, browser refresh),
// gate the side-effect at the consumer chokepoint by reading the canonical
// state column the FIRST call already wrote. Same canonical row, not a kv
// side-table (Law 1 deploy-target / canonical-source discipline).
//
// CTH-specific shape: payments share `portal-state.payment.status='paid'`
// on vendor_applications.admin_notes. Ticket delivery doesn't have a
// dedicated status column on vendor_applications, so we gate on whether a
// successful 'ticket_delivery' outbound row already exists in wa_messages
// for the same WooCommerce order number.
//
// Failure paths are intentionally NOT gated — gateway 'failed' status and
// WhatsApp send-skips can legitimately be retried after the underlying
// problem is fixed.

import type { SupabaseClient } from "@supabase/supabase-js";

// PURE: gate predicate for the payment webhook + return URL.
// 'paid' is the only terminal state where another call should short-circuit.
// 'pending' / 'failed' / 'none' / 'deferred' / 'waived' all flow through —
// 'waived' could be set independently by an organiser and a subsequent
// real payment should still be allowed to register against the same row.
export function isPaidPaymentStatus(status: string | null | undefined): boolean {
  if (!status) return false;
  return status === "paid";
}

// DB: returns true if a 'ticket_delivery' outbound row already exists in
// wa_messages for this WooCommerce order number with status='sent'. Cap on
// a recent window (24h) so a vendor who legitimately re-buys a ticket against
// the same order id in a future cycle is not blocked. Fail-open on error
// (returns false) — one extra ticket delivery is preferable to silently
// dropping a real first delivery.
export async function wasTicketDelivered(
  db: SupabaseClient,
  orderNumber: string,
): Promise<boolean> {
  if (!orderNumber) return false;
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await db
      .from("wa_messages")
      .select("id")
      .eq("direction", "out")
      .eq("template_name", "ticket_delivery")
      .eq("related_order_id", orderNumber)
      .eq("status", "sent")
      .gte("created_at", cutoff)
      .limit(1);
    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  } catch {
    return false;
  }
}
