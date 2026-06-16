# Operator Asks Audit — 2026-06-15

**Repo:** `/Users/milaaj/Code/capetown-halaal-landing` · **Branch:** `final-deploy` · **Prod:** `cthalaal.co.za` (alias of dpl_BRvqUGcP6L7yYC28ZS6m2La7okPR · Ready · created 2026-06-15 16:47 GST)

## Summary

**38 asks, 31 shipped, 6 partial, 1 missing.**

Source: every user turn in `~/.claude/projects/-Users-milaaj/71b5d8db-039c-4cce-9c4c-c2b8799c57a1.jsonl` between 2026-06-14T15:26Z (session start) and 2026-06-15T12:23Z (last operator message). Acks (`done`, `rock`, `sw`, `keep going`, `ddjt`) and meta-asks (`rewrite this prompt`) excluded per scope. Working tree clean (only screenshots + smoke log untracked). Smoke `screenshots/smoke-2026-06-15/REPORT.md`: 9/9 routes 200 or 307-to-login, zero 5xx, zero console errors, zero `nextDigest`.

## Asks → Shipped Table

| # | Surface | Operator's ask (verbatim, ≤80 chars) | What shipped | Status | Notes |
|---|---|---|---|---|---|
| 1 | admin/nav | "tope left of admin portl shosuld show the logo" | `AdminSidebar.tsx` logo at h-32 (commit `261d8d9`) | ✅ | Final size after two rounds (h-28 scale → h-32 clean) |
| 2 | admin/allocation | "removed vendor ops that allowed to allocate booth ... bring it back" | `/admin/allocation` rebuilt w/ StallMap + pan/zoom (`f830244`) | ✅ | 2D map restored; shared component with exhibitor stand |
| 3 | admin/allocation | "2d map that was properly there check and bring it back" | StallMap pan/zoom/search, container 600px+ (`f830244`) | ✅ | Same SVG, palette-consistent bg |
| 4 | admin/allocation | "add filters so its easier to allocated ... count down of avialble slots" | Filter chips above search; countdown TBD verifier surface | 🟡 | Filters live; "countdown of available slots per filter" — need to confirm slot counters update per filter selection |
| 5 | admin/broadcast | "templates ... it should auto populate and i should be able to spin that templat" | TemplatePicker + inbox reply on current mail-template API (`d7c0736`) | ✅ | Templates populate and editable |
| 6 | admin/broadcast | "shouldnt say samreen but rather support" | Outbound branded `support@youngatheart.co.za` (`support-inbox/[id]/reply`) | 🟡 | Outbound channel renamed to "support"; user-facing strings/comments still mention "Samreen" in 10 source files (layout.tsx authors, dashboard avatar, comments) — cosmetic but not vendor-facing copy |
| 7 | admin/support-inbox | "support inbx ... support@youngathart.co.za is missing ... route it and plug there" | `/admin/support-inbox` with IMAP→Supabase cron + Resend reply (`f830244`, prior `67b764f`) | ✅ | Full mail thread surface, sanitize-html render, Inbox/Sent/All tabs |
| 8 | admin/support-inbox | "support inbox is showing in html format, fix it" | sanitize-html allowlist render in `SupportInboxClient.tsx` (`f830244`) | ✅ | HTML now rendered, not displayed as source |
| 9 | admin/support-inbox | "support should show the sent so we understand what has been sent" | New `/sent` route + tab + `/api/admin/support-inbox/sent` (`f830244`) | ✅ | Sent tab live |
| 10 | admin/support-inbox | "default filter being questions about the festival from vendors or ticket goers" | Default filter on vendor+ticket_buyer threads in `InboxClient.tsx` (`f830244`) | ✅ | Applied to /admin/inbox, mirrored on support-inbox |
| 11 | admin/inbox | "inbox threads do a doom scrool ... scrolling should be limited to the page" | Scroll containment in InboxClient + SupportInboxClient (`f830244`) | ✅ | Bounded scroll on both surfaces |
| 12 | admin/nav | "nav bar is convoluted and too tight ... fix the sapace" | PortalNav padding tightened + gap normalised (`f830244`, `a16e54f`) | ✅ | Two passes; pills no longer overlap brand |
| 13 | admin/nav | "logo there should be center aligned" | scale() bleed removed, h-14 + divider, center via layout box (`a16e54f`) | ✅ | Exhibitor portal; admin sidebar also fixed (`261d8d9`) |
| 14 | admin/dashboard | "activity feed seems useless maybe put it under settings" | ActivityFeed removed from dashboard (`bb2500e`), then re-wired with prefix filters (`e9c63a2`) | 🟡 | Currently surfaces with filters on dashboard; not moved to /admin/settings — operator's literal "put it under settings" not honoured |
| 15 | admin/vendor-profile | "follow up has no real function ... vendor profile lol wtf is this there is no profile" | VendorHub at `/admin/vendors/[id]` with full A-Z view (`d7e2586`, prior `518a524`) | ✅ | Profile + Staff + activity + contract view |
| 16 | admin/vendor-profile | "they cant see signed contracts they cant see the receipts from payment ... tickets for pople" | VendorHub Staff section + verifier + people register + artefacts route (`d7e2586`, `f830244`) | ✅ | Contracts in /admin/documents, receipts via portal-state, tickets via verifier |
| 17 | admin/analytics | "for analytics also add all tiem views etc" | Not surfaced in this session's diff | 🔴 | No analytics surface shipped; promised in earlier `c31de03` sprint scope but not in 2026-06-15 diff |
| 18 | admin/security | "make sure no one can hack or attack the site close all loops" | `feat(security): close 50+ findings across 14 audit/fix agents` (`3e3cc01`) + headers (`d67eb75`) + RBAC + RLS | ✅ | 50+ findings closed, signed staff QR, edge-safe cron auth |
| 19 | admin/staff-badges | "use the same structure as the ticket to generate staff qr u feel me" | Signed staff QR via FooEvents pipeline (`d7e2586`) | ✅ | Staff badges via FooEvents, mu-plugin resolver |
| 20 | admin/verifier | "express check in verfier ... compare all the generated and check they are valid before the event" | `/admin/verifier` UI + auto-verify cron + manual verify (`d7e2586`) | ✅ | Auto every 6h, admin manual override |
| 21 | admin/verifier | "for every gen ticket or pass it should show/verified" | VerifiedPill component + ticket-status API (`d7e2586`) | ✅ | Pill renders on tickets + badges |
| 22 | admin/verifier | "embded from foo events to verfy each ticket" | WP mu-plugin `cth/v1/tickets-by-order/<id>` + `verify.ts` (`91d2ffc`) | ✅ | Resolver live with fallback to local meta-parse |
| 23 | admin/staff-badges | "make sure that the staff badge are working properly and are printable" | `/exhibitor/portal/staff/print` PrintBadgesClient (`d7e2586`) | ✅ | Print sheet with guillotine marks |
| 24 | admin/people | "admin portal has a record of every person" | `/admin/people` PeopleTable (`d7e2586`) | ✅ | People register live |
| 25 | admin/login | "we need a nice log in page there ... format the logo" | `/admin/login` rebuilt as 2-column hero split (`f830244`) | ✅ | Mirrors exhibitor login design |
| 26 | admin/applications | "current application process is nice but now harder to approve ... previous filtering bring it back" | Smart queue restored (`9d26323`) + filter chips above search keeping new flow (`f830244`) | ✅ | j/k/a/r keyboard layer preserved |
| 27 | admin/documents | "document tab i dont see it where i can easily view each documnt, or each ticket" | `/admin/documents` directory page with Vendor Documents + Tickets tabs (`f830244`) | ✅ | Search + filter, auth-gated artefact routes |
| 28 | admin/comms-health | "comms health is not working out ... protect this and get it done" | `/admin/settings/comms-health` real probes WhatsApp+Resend+DGX, 30s polling (`f830244`) | ✅ | Latency + last-success surfaced |
| 29 | exhibitor/portal | "for the vendor portal remove find my stall" | Removed from `/exhibitor/login` (`f830244`) | 🟡 | Removed from login page; `SitePlanSVG.tsx:63` still emits "Find my stall" button when `mine` set — still reachable from /stand page |
| 30 | exhibitor/stand | "my stand is the right map but it not sized properly ... clashes are clashing ... background colour out of palette" | `/exhibitor/portal/stand` container min-h-[600px], palette-consistent bg (`f830244`) | ✅ | Sized properly, palette aligned |
| 31 | exhibitor/stand | "this is the same map to restore on admin portal" | Shared StallMap component across exhibitor + admin (`f830244`) | ✅ | One component, two surfaces |
| 32 | exhibitor/documents | "documenet portal not working at all" | Null-guard restoring page (`15d6a88`) + downloadable artefacts (`5e0ddde`) | ✅ | Was 500'ing (digest 3115685589), now renders |
| 33 | exhibitor/nav | "buttons are out of format on nav bar some are cut up" | PortalNav pill padding + gap-4 lg:gap-6 (`a16e54f`, `f830244`) | 🟡 | Operator's 12:23 follow-up: "overview button is still cramped" — not yet re-addressed since 2592 turn |
| 34 | exhibitor/nav | "logo is not properly aligned in accordance to the text and size it up too" | scale() bleed removed, h-14 + divider (`a16e54f`) | 🟡 | 12:23 follow-up: "logo still not aligned with text" — not re-addressed |
| 35 | exhibitor/documents | "make sure its downloadable for them their invoice, contract, passes" | 3 download routes: `/api/exhibitor/portal/{invoice,contract,badge}/pdf` (`5e0ddde`) | ✅ | Session-gated per Law 2, GeneratedDocsPanel UI |
| 36 | exhibitor/support | "give them an option to send via email too we should already have their email so it should auto send" | `/api/exhibitor/support` email fan-out with Reply-To override (`f830244`) | ✅ | Vendor email auto-resolved server-side |
| 37 | admin/preview-pane | "the specia requirements text is not rendering" | `PreviewPane` renders special_requirements JSON as labeled fields (`261d8d9`) | ✅ | Was raw blob in `<p>`, now labeled grid |
| 38 | admin/sidebar | "the logo on admin portal is now big but the baked in space" | `h-32` clean (no scale) replaces `h-28 + scale(1.15)` (`261d8d9`) | ✅ | Layout box now respected |

## GAPS

### 🟡 #4 — admin/allocation countdown per filter
- **Surface:** `/admin/allocation`
- **Ask:** "for every allocated it should do a count down of avialble slots accoridngly to filterts"
- **Current state:** Filter chips live; filtered stall lists render. Need to confirm a visible "X slots remaining" counter reflects the active filter (sector / status / stall_type).
- **Still needed:** Slot-count badge in StallMap header that responds to filter state.

### 🟡 #6 — Samreen → support rebrand cosmetic residue
- **Surface:** `src/app/layout.tsx:37` (`authors: [{ name: "Samreen Kumandan" }]`), `src/app/dashboard/page.tsx:278`, plus 8 comment references.
- **Ask:** "this shouldnt say samreen but rather support right"
- **Current state:** Operational rebrand done (support@ inbound + outbound). Metadata + one user-facing dashboard avatar still say "Samreen Kumandan".
- **Still needed:** Replace `authors` metadata + dashboard avatar text. Comments can stay; they're internal.

### 🟡 #14 — Activity feed location
- **Surface:** `/admin` dashboard
- **Ask:** "put it under settings"
- **Current state:** Removed then re-wired with prefix filters on dashboard.
- **Still needed:** Move ActivityFeed component out of `(admin)/admin/page.tsx` and mount under `/admin/settings/activity` (or similar).

### 🔴 #17 — All-time analytics surface
- **Surface:** `/admin/analytics` (does not exist as a route)
- **Ask:** "for analytics also add all tiem views etc"
- **Current state:** No analytics page in this session's diff. Earlier `c31de03` sprint mentioned admin vendor ops + inbox but no analytics surface.
- **Still needed:** New `/admin/analytics` route with all-time view counts (page views, vendor portal sessions, broadcast sends, ticket sales) sourced from existing event tables.

### 🟡 #29 — "Find my stall" still reachable
- **Surface:** `src/components/exhibitor/SitePlanSVG.tsx:63`
- **Ask:** "for the vendor portal remove find my stall"
- **Current state:** Removed from `/exhibitor/login`; the button still renders inside `SitePlanSVG` when the vendor has a stall code, surfacing on `/exhibitor/portal/stand`.
- **Still needed:** Delete the button JSX at SitePlanSVG.tsx:63 or guard behind a feature flag.

### 🟡 #33 — Exhibitor nav "Overview" still cramped
- **Surface:** `/exhibitor/portal/*` PortalNav
- **Ask (12:23):** "the overviw button is still cramped check it out"
- **Current state:** Two rounds of padding/gap fixes applied (`a16e54f`, `f830244`). Operator's last screenshot still flags the same cramping.
- **Still needed:** Inspect `PortalNav.tsx` pill rendering at 1280–1440 viewport widths; likely needs `min-w` on first pill or shift to `flex-wrap` at breakpoint.

### 🟡 #34 — Exhibitor logo still not aligned
- **Surface:** `/exhibitor/portal/*` PortalNav
- **Ask (12:23):** "logo still not aliged with text, vendor portal fix"
- **Current state:** Same commit `a16e54f` removed scale() bleed; operator's 12:23 follow-up shows it still misaligned.
- **Still needed:** Likely the brand block (logo + text) needs `items-center` + a fixed `min-h` so the YAH crest's top-biased bounding box doesn't push text below center.

## QUICK WINS

| # | Surface | One-line fix |
|---|---|---|
| 4 | `src/components/admin/StallMap.tsx` (or allocation page header) | Add a `useMemo` slot-count summary `{filteredAvailable}/{filteredTotal} stalls` chip next to the filter row. |
| 6 | `src/app/layout.tsx:37` + `src/app/dashboard/page.tsx:278` | Replace `"Samreen Kumandan"` with `"Young at Heart Festival Support"` (metadata) and `"Support Team"` (dashboard avatar). |
| 14 | `src/app/(admin)/admin/page.tsx` + new `src/app/(admin)/admin/settings/activity/page.tsx` | Move `<ActivityFeed/>` import + render block from dashboard to a new settings sub-route. |
| 17 | New `src/app/(admin)/admin/analytics/page.tsx` | Server component reading from `application_events`, `wa_messages`, `support_threads`, `wc_orders` (cached at request) with 4 KPI cards + 30-day sparkline. Sidebar entry in `AdminSidebar.tsx`. |
| 29 | `src/components/exhibitor/SitePlanSVG.tsx:63` | Delete the `{mine && <button onClick={findMine}>...Find my stall</button>}` block. Verify nothing else calls `findMine`. |
| 33 | `src/components/exhibitor/PortalNav.tsx` | Add `min-w-[5.5rem]` on the first pill or switch the pill strip to `flex-wrap` at `lg:` breakpoint; verify "Overview" no longer truncates at 1280px. |
| 34 | `src/components/exhibitor/PortalNav.tsx` brand block | Wrap logo + brand text in `<div className="flex items-center gap-3 min-h-[3.5rem]">`; constrain logo to `h-12 w-auto object-contain object-center`. |

## Deploy state proof

- `vercel inspect cthalaal.co.za` → `dpl_BRvqUGcP6L7yYC28ZS6m2La7okPR` · **Ready** · created Mon Jun 15 2026 16:47:36 GST (~3 min before audit).
- Aliases: `cthalaal.co.za`, `www.cthalaal.co.za`, `admin.cthalaal.co.za`.
- Smoke: 9/9 routes green; 5 protected routes correctly 307 → /login; zero 5xx, zero console errors.
