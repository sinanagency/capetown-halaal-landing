# ADR-001 — In-house canvas + typed signature for vendor contract e-sign

- **Status:** Accepted 2026-06-13
- **Driver:** CTH platform (vendor portal e-sign requirement, 2026 festival cycle).
- **Affected surfaces:** `app/portal/contract/`, `app/api/exhibitor/contract/sign`, `vendor_applications.contract_*` columns, vendor confirmation email payload.

## Context

Every confirmed vendor for the 2026 Cape Town Halaal / Young at
Heart festival must sign a stall-allocation contract before they can
trade. Sam (the operator) needs the signed contract on file before
releasing the final stall code, and the contract itself binds the
vendor to the festival's stall fee, conduct rules, and refund policy.

The legal regime is the South African Electronic Communications and
Transactions Act 25 of 2002 (ECTA). Section 13(1) provides that where
a signature is required by law and no method is specified, an
electronic signature satisfies the requirement. Section 13(3) lists
the conditions for a valid ordinary electronic signature: the method
must be reliable in the circumstances and the signer must intend it
to be their signature. The 2026 vendor contract is not a suretyship
or alienation of land, so an advanced electronic signature (AES)
under section 13(2) is not required. An ordinary section 13(3) e-sign
is sufficient.

The vendor pool is approximately 415 SME food and craft vendors,
many of whom open the portal on a mobile WhatsApp browser. The
contract is one to two pages of plain text. The portal already
authenticates the vendor through Supabase Auth with magic-link login
tied to their application email.

Three execution approaches were considered (recorded under
Alternatives). The chosen approach is to build the e-sign capture
inside the existing portal, using a canvas-drawn signature plus a
typed-name fallback, and to persist the signature with sufficient
audit metadata to satisfy ECTA section 13(3).

## Decision

**Capture the vendor signature as a base64-encoded PNG drawn on an
HTML canvas, with a typed-name fallback for vendors who cannot draw
on their device.** Persist the signature inline on the existing
`vendor_applications` row alongside an audit envelope. The contract
PDF is generated server-side from a frozen markdown template at sign
time and stored in Supabase Storage with a content hash. The vendor
is emailed a copy of the signed contract through Resend immediately
after sign.

The `vendor_applications` table gains the following audit columns:

- `contract_signed_at` (timestamptz)
- `contract_signed_ip` (text)
- `contract_signed_user_agent` (text)
- `contract_signature_png` (text, base64 PNG, signature image only)
- `contract_signature_typed_name` (text, fallback path)
- `contract_pdf_path` (text, Supabase Storage object key)
- `contract_pdf_sha256` (text, content hash of the rendered PDF)
- `contract_template_version` (text, e.g. `2026-v1`)

The sign route (`POST /api/exhibitor/contract/sign`) is gated by
`requireExhibitor()` (the Law 2 helper), records the audit envelope
in a single transaction, renders the PDF from the frozen template,
uploads to Storage, and triggers the Resend send. The contract page
shows the rendered contract above the canvas; the vendor must scroll
to the end before the sign button enables, and a checkbox states the
ECTA section 13(3) intent declaration in plain English.

## Consequences

### Positive

- **ECTA section 13(3) compliance is provable from the row.** Any
  later dispute is answered by the audit envelope plus the hashed
  PDF and the frozen template version. The vendor's intent is
  recorded by the checkbox plus the sign action.
- **Zero external vendor cost.** No DocuSign seats, no Adobe Sign
  per-envelope fees, no SignNow subscription. The 415-vendor pool
  signs at marginal cost.
- **The portal stays one app.** No cross-domain SSO with a third
  party, no webhook reconciliation, no third-party brand on the
  vendor's confirmation email.
- **Mobile WhatsApp browsers work.** Canvas + typed-name fallback
  covers every device class in the vendor pool.
- **Same-row storage means the doctrine-reviewer can read the audit
  envelope in the same query as the vendor application.** No
  cross-table join to assess sign status.

### Negative

- **The e-sign is an ordinary section 13(3) signature, not an
  advanced electronic signature.** Sufficient for the 2026 contract
  scope; insufficient if the contract scope ever expands to
  suretyship or land alienation. Mitigated by: the contract scope is
  controlled by Sam and Taona; any scope change is a new ADR.
- **The audit envelope lives in `vendor_applications`, which is also
  the operational table.** A schema migration to extract audit data
  to a dedicated `vendor_contract_signatures` table is possible
  later if the column count becomes noisy. Reversibility is
  preserved because the columns are additive.
- **The frozen template lives in `lib/contracts/2026-v1.md` (or
  similar) in the repo.** A template change requires a new version
  string and a code deploy. Mitigated by: the operator's contract
  language is stable through the cycle; mid-cycle changes are rare.
- **PDF rendering uses headless Chrome through `puppeteer-core` on
  Vercel.** Cold-start cost is real (1-2s). Mitigated by: the sign
  action is a one-time event per vendor; latency is acceptable.

## Alternatives Considered

### A. DocuSign / Adobe Sign / SignNow (rejected)

Use a hosted e-sign vendor for the contract envelope.

**Why rejected:**
- DocuSign is approximately USD 25 per seat per month and the
  Standard tier caps at 100 envelopes per user per year, so 415
  vendors needs the Business Pro tier or an envelope add-on
  pack. Adobe Sign and SignNow have similar pricing structures.
  Sufficient to pay something like USD 400-1000 for the cycle.
- The vendor experience becomes a redirect off
  `portal.cthalaal.co.za` to a DocuSign branded page, then back.
  Adds friction on a mobile WhatsApp browser where the vendor
  already had to magic-link in.
- The webhook reconciliation surface (envelope sent, viewed,
  signed, completed) is a new failure mode. The doctrine-reviewer
  cannot read the DocuSign envelope state from `vendor_applications`.
- The doctrine map (Law 3, FooEvents-no-fork) sets the precedent
  that this project does not pay for capabilities it can ship
  in-house at marginal cost. The same principle applies here.

### B. Click-wrap "I accept" checkbox only (rejected)

Render the contract, require a checkbox, log a timestamp + IP.

**Why rejected:**
- ECTA section 13(3) requires a method that is reliable in the
  circumstances and an intent to sign. A bare checkbox without
  a captured signature mark fails the reliability test where the
  contract is the stall-allocation contract (non-trivial
  commercial obligation) and the vendor pool includes parties
  the operator has never met in person.
- A captured signature mark (canvas or typed name) plus the
  intent checkbox is the same UX cost (one extra interaction)
  with a stronger evidentiary posture if a vendor later disputes.
- Sam asked for the signed PDF to attach to the vendor file. A
  checkbox alone does not produce a PDF.

### C. Wet signature + scanned upload (rejected)

Email the contract, ask the vendor to print, sign, scan, upload.

**Why rejected:**
- The vendor pool's device profile is heavily mobile. Print +
  scan + upload is a high-drop-off flow.
- The audit envelope (IP, user agent, sign timestamp) cannot be
  reliably attached to an externally scanned image.
- The sign-to-confirm latency would extend from seconds (e-sign)
  to days (postal logic), pushing the operator's confirmed-vendor
  count below where it needs to be by November 2026.

## Reversibility

**Medium-high.** The schema additions are additive (new columns on
`vendor_applications`), so a future switch to DocuSign or to a
dedicated `vendor_contract_signatures` table does not require
destructive migration. The sign route is one file; replacing it
with a DocuSign envelope-create call is a localized change. The
PDF storage path is a single Supabase Storage bucket that any
later system can read.

If a vendor disputes a signature post-hoc, the audit envelope plus
the hashed PDF plus the template version are the disclosure pack;
no system change is required to support a dispute.

If ECTA jurisprudence shifts (for example, a court holding that a
specific contract class requires AES under section 13(2)), the
rollback path is: pause the in-house sign route, route confirmed
vendors to a temporary DocuSign envelope, and migrate the
`contract_*` columns to a JSON `contract_envelope` field that can
carry either provider's payload.
