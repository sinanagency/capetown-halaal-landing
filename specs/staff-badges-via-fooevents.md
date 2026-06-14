# Staff Badges via FooEvents — Spec

Date: 2026-06-15
Owner: Taona / Multi-Fixer next sprint

## Problem
Current `/exhibitor/portal/staff` mints unsigned QR payloads
`YHF2026|<stall>|<id>|<name>` server-side at `StaffManager.tsx:82`.
Anyone can hand-make a print with `YHF2026|FB-12|x|VictimName` and walk past the gate.
BRUTE #1, Skeptic-Vendor #1.

## Decision
Staff badges ride on the existing FooEvents ticket signing infrastructure.
One verification surface at the gate, not two.

## Design

### Upstream (WordPress / WC / FooEvents)
1. New WC product `staff-badge` — price 0, virtual, FooEvents-enabled,
   limited to vendor purchase via portal (REST API only, hidden from public store).
2. FooEvents settings: enable PDF tickets, set theme to existing
   `WooCommerceEventsPDFTicketTheme` (full server path per
   `feedback_fooevents_pdf_theme_path` memory).
3. Staff badge ticket type tagged for gate-scanner allowlist.

### Downstream (Next portal)
1. Vendor adds staff member at `/exhibitor/portal/staff`:
   - Server validates: name 2-80 chars, RTL/control chars stripped,
     SA phone regex, ID number format, vehicle reg format.
   - Server caps at `GATE_ACCESS_CAP` = 3 per vendor (Samreen policy).
   - Server calls WC REST `POST /wp-json/wc/v3/orders` with:
     ```
     {
       line_items: [{ product_id: STAFF_BADGE_PRODUCT_ID, quantity: 1 }],
       billing: { ... vendor info ... },
       meta_data: [
         { key: 'staff_name', value: sanitisedName },
         { key: 'vendor_application_id', value: vendor.id },
         { key: 'stall_code', value: parseAllocation(vendor.admin_notes).stall },
       ],
       status: 'completed'
     }
     ```
   - FooEvents fires on order completion → generates signed PDF ticket per staff member.
   - WC sends webhook back to `/api/whatsapp/deliver-ticket` (existing pipeline)
     to deliver to vendor's WhatsApp.
2. Remove the existing client-side QR generation in `StaffManager.tsx:82`.
3. Remove the `staff` markers from `admin_notes` portal-state OR keep them as
   metadata pointer to the WC order id (decision: keep, as WC order id reference
   so admin can revoke a badge by cancelling the WC order).

### Gate scanner (day-of)
- Same FooEvents check-in flow as ticket buyers.
- Scanner reads QR → validates HMAC → returns ticket type → if
  `staff-badge`, shows vendor name + stall + staff name on screen.

## Acceptance
- [ ] Vendor cannot forge a badge — payload is signed.
- [ ] Server-side cap of 3 staff per vendor enforced before WC call.
- [ ] Name sanitised against RTL Unicode (U+202E) + control chars.
- [ ] Gate scanner accepts staff-badge tickets without code change.
- [ ] Vendor can re-download badge PDF from `/exhibitor/portal/staff`
      (link to FooEvents-generated URL).
- [ ] Admin can revoke a badge by cancelling WC order → next gate scan rejects.

## Doctrine
- Law 3 (FooEvents-no-fork): ✅ we layer on top, don't rebuild PDF/QR.
- Law 4 (FooEvents source of truth): ✅ staff badges live in WC + FooEvents.
- Law 8 (no phantom stalls table): ✅ stall code still on admin_notes.

## Out of scope this spec
- Existing buyer ticket flow unchanged.
- Existing 2D map allocation unchanged.

## Next-sprint queue
- Add WC product setup script (`scripts/wc-create-staff-product.mjs`).
- New env var `STAFF_BADGE_PRODUCT_ID` (Vercel).
- Patch `/api/exhibitor/staff/route.ts` to call WC instead of writing
  client-side QR.
- Delete client-side QR code from `StaffManager.tsx`.
- Audit: gate-scanner allowlist includes `staff-badge` ticket type.
