# Vendor Artefacts Reconciliation

Pre-built by wave-1 reconciliation pass. Surfaces the same artefacts the vendor
sees in /exhibitor/portal as a row Samreen can inspect from /admin/documents.

## Wire-up (orchestrator owns this step)

`DocumentsClient.tsx` (wave-1 agent E) should add an "Artefacts" column per
vendor row that calls `/api/admin/documents/artefacts/<application_id>` on row
hover OR on demand (button click). The response is `{ row: VendorArtefactRow }`.

Agent E shipped `DocumentsClient.tsx` without this integration; landing this
helper means the orchestrator (or agent E's next pass) just needs to fetch +
render. No further server work required.

## Files in this drop

- `vendor-artefacts.ts` — `getVendorArtefacts(applicationId)` server helper.
- `/api/admin/documents/artefacts/[id]/route.ts` — auth-gated JSON wrapper.
- This README.

## Auth caveat on invoice_url / contract_url

`invoice_url` and `contract_url` point at the wave-2 H2 endpoints
(`/api/exhibitor/portal/invoice/pdf`, `/api/exhibitor/portal/contract/pdf`).
Those endpoints are session-gated on the signed-in **vendor**, not on admin.
Samreen cannot click through directly. They are surfaced for reconciliation
parity (so admin sees the same artefact-set the vendor sees). If a future pass
needs admin-clickable invoice/contract downloads, mint admin-side equivalents
under `/api/admin/applications/[id]/invoice` etc, and update this helper.

`badge_pdfs[].url` and `uploaded_docs[].url` ARE admin-clickable: badges link
to FooEvents directly (Law 3) and uploaded docs route through the existing
`/api/admin/vendor-doc` signed-URL redirect.
