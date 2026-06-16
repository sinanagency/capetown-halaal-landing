# Vendor Portal Walkthrough — Prod, 2026-06-15

Base: https://cthalaal.co.za
Demo vendor: demo-vendor@cthalaal.co.za
Mode: READ-ONLY (no form submission, no download click).

| # | Surface | Status | Screenshot |
| --- | --- | --- | --- |
| 1 | 1) /exhibitor/login | PASS | `01-login.png` |
| 2 | 2) PortalNav Overview pill | PASS | `02-portal-overview.png` |
| 3 | 3) PortalNav logo alignment | PASS | `02-portal-overview.png` |
| 4 | 4) /exhibitor/portal/stand map | PARTIAL | `04-stand.png` |
| 5 | 5) /exhibitor/portal/documents | PASS | `05-documents.png` |
| 6 | 6) /exhibitor/portal/contract | PARTIAL | `06-contract.png` |
| 7 | 7) /exhibitor/portal/invoice | PASS | `07-invoice.png` |
| 8 | 8) /exhibitor/portal/staff | PASS | `08-staff.png` |
| 9 | 9) /exhibitor/portal/support | PASS | `09-support.png` |

## Detail
### 1) /exhibitor/login — PASS
- HTTP 200
- Title: "Young at Heart Festival 2026 | Cape Town Halaal Lifestyle Expo"
- "Find my stall" present: false
- "Forgot password?" present: true
- screenshot: `01-login.png`

### 2) PortalNav Overview pill — PASS
- Overview pill text in DOM: "Overview" (should be exactly "Overview")
- Overview pill rendered in full, no DOM-level clipping.
- screenshot: `02-portal-overview.png`

### 3) PortalNav logo alignment — PASS
- Logo cy=51.0, text cy=51.0, |Δcy|=0.0px (≤8px = aligned).
- Logo middle-aligned with brand text block.
- screenshot: `02-portal-overview.png`

### 4) /exhibitor/portal/stand map — PARTIAL
- HTTP 200
- Map container: 896×1165px (inner SVG: 16×16). Need container height ≥600.
- Search input present: true
- Zoom-in / Zoom-out / Reset buttons: false / false / false
- Pan/zoom controls incomplete.
- Map container bg: rgb(246, 242, 232)
- bg rgb=(246,242,232) → mustard=false, off-white=true
- screenshot: `04-stand.png`

### 5) /exhibitor/portal/documents — PASS
- HTTP 200
- "From the organisers" section: true
- "Compliance documents you upload" section: true
- Invoice button: "Download PDF"
- Contract button: "Download PDF"
- Badge link: "Overview"
- Invoice download link: true
- Contract download link: true
- Staff badge link/button: true
- screenshot: `05-documents.png`

### 6) /exhibitor/portal/contract — PARTIAL
- HTTP 200
- "Vendor Contract" text on page: true
- No "Download/Save as PDF/Print" affordance found on /contract page itself. (Note: Documents page DOES expose "Download PDF" for contract — verified at step 5.)
- screenshot: `06-contract.png`

### 7) /exhibitor/portal/invoice — PASS
- HTTP 200
- Download affordance: <BUTTON> "Save as PDF" href=null download=false
- screenshot: `07-invoice.png`

### 8) /exhibitor/portal/staff — PASS
- HTTP 200
- Inputs found: 4 (name field=true, email/phone field=true)
- "Add team member" section header: true, submit button: true
- "Print all badges" button: true
- screenshot: `08-staff.png`

### 9) /exhibitor/portal/support — PASS
- HTTP 200
- Email-copy checkbox found, defaultChecked=true. Label: "Also send a copy by email to support@youngatheart.co.za (recommended)."
- Send button: icon-submit "(icon-only)"
- screenshot: `09-support.png`

## FIRES
None.