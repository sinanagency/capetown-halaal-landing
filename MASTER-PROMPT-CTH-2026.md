# MASTER PROMPT — CTH 2026 PORTAL TRANSFORMATION

## Ground Truth

### Colours
**NO colour changes. Current palette stays:**
- Brand: RED #cd2653 (primary buttons, key links, active states)
- Surfaces: white #FFFFFF cards, #F8F8F8 bg (current)
- Text: neutral-900 #171717, neutral-500 #737373, neutral-400 #A3A3A3
- Status: current semantic colours stay
- Borders: neutral-200 #E5E5E5

### Design References (must study before building)
1. `~/Desktop/CTH DESIGN REF/` — 7 screenshots of reference interfaces
2. `~/Desktop/CTH-DESIGN-BRIEF-FOR-DEEPSEEK.md` — structure, spacing, component patterns, layout recipes
3. twentyhq repo patterns: inline cell editing, side panel for quick views, saved views, empty states with CTAs, 4px grid density approach

### What to Borrow from Design Brief (structure only, NOT colours)
- The 3-zone layout: sidebar | page-header | page-body
- The 6 reusable component patterns (KpiStrip, DenseTable, StatusPill, FilterPillRow, ActionChipGrid, RightDrawer)
- Typography hierarchy: Fraunces for headings, Inter for UI
- Spacing rhythm: 8px grid
- KPI strip pattern (flex row, no card chrome, caption labels, Fraunces values)
- Dense table pattern (no zebra, no vertical dividers, 56px rows, elevated header)
- Action bar rule: all toolbars compress to 48px single row
- Empty state patterns (illustration + guidance + CTA)

### Hard Rules
- NEVER change brand colours (red #cd2653 stays)
- NEVER touch the 2D vendor map
- NEVER change existing working functions — build on top
- Admin and vendor portals stay separate
- No gradients, no glassmorphism, no dark mode
- No em-dashes in any string
- No emojis in UI chrome

---

## Agent 1: Design System Foundation

Build the ENTIRE visual language that every other agent uses.

**Scope:**
- A. Design Tokens: CSS variables for bg-app, bg-surface, bg-elevated, bg-hover, border, accent, accent-soft, radius scale, spacing scale, typography scale
- B. 6 Reusable Components (restyled in CTH red/white):
  1. KpiStrip / Kpi — flex row, no card chrome, no dividers, caption labels, Fraunces values, optional delta
  2. DenseTable — surface container, elevated header (h-11), 56px body rows, no zebra, no vertical dividers, right-action column, hover state
  3. StatusPill — inline-flex, 6px dot in solid colour, pill bg in soft tint, rounded-full, text-xs
  4. FilterPillRow — 32px pills, rounded-full, active = neutral-900 bg, inactive = white border, count badges, right side search + sort
  5. ActionChipGrid (Loopa pattern) — 4-column grid, 90px tall chips, pastel tones (lavender/mint/peach/butter/sky/rose), icon top-left, label bottom-left
  6. RightDrawer — 480px slide-over, bg-surface, header with close + title in Fraunces, sectioned body with 24px gaps
- C. Layout Shell: sidebar 240px fixed, page header (h-16, caption eyebrow + Fraunces title + right CTAs), page body (p-6 to p-8)
- D. Typography system: Fraunces for titles, Inter for UI, Inter tabular-nums for numbers
- **Verify:** Screenshot every component at 1440px + 375px, empty state, loading skeleton, error state

---

## Agent 2: Admin Shell + Navigation

Restructure every admin page into the 3-zone layout.

**Scope:**
- Apply PageHeader (caption+title+CTAs) + PageBody structure to every admin page
- Sidebar: current items, restyled with 36px items, 12px padding, rounded-sm, active = red soft bg + 2px red left border
- Logo block stays same
- **Verify:** Screenshot every admin page at 1440px + 375px

---

## Agent 3: Vendor 360 (NEW — single-screen vendor view)

A complete vendor profile that shows EVERYTHING about a vendor without navigating to multiple pages.

**Scope:**
- Replace the current `/admin/vendors/[id]` page
- Layout is one scrollable page with sections:
  - **Header:** vendor name (Fraunces), business name, category, stall code, StatusPill
  - **Summary Card:** payment amount + status, documents status, staff count, days since approval
  - **Quick Actions Row:** Send WhatsApp, Send Email, Mark Paid, Assign Stall (icon + label chips)
  - **Sections (vertical, full width):**
    - Contact Info (email, phone, address — inline editable)
    - Application Details (stall size requested, special requirements, sector)
    - Communication Log (chronological, every email + WhatsApp + note — inline expandable)
    - Documents (contract, invoice, COA, badges — inline preview, not new tab)
    - Staff (registered gate staff — phone, name, badge status)
    - Activity Timeline (every event: applied, approved, paid, stall changed, emailed)
  - **RightDrawer** for editing any section (keep the page scrollable, edit in overlay)
- Fetches from existing APIs: vendor_applications, wa_messages, support_inbox_messages, site_events
- **Verify:** Screenshot full page at 1440px with real vendor data

---

## Agent 4: Stall Inspector

Click any stall on allocation map → right drawer with vendor details. Map unchanged.

**Scope:**
- Click handler on StallMap rectangles → opens RightDrawer
- Drawer: vendor name, business, category, payment status, documents status
- Quick actions: message vendor, view profile, reassign stall
- **Verify:** Screenshot of map with drawer open

---

## Agent 5: Smart Search (Cmd+K)

One search bar accessible from any admin page.

**Scope:**
- Cmd+K opens command palette
- Searches: vendor names, business names, emails, phone numbers, stall codes, application IDs
- Results in <500ms, keyboard navigable, recent searches in localStorage
- **Verify:** Screenshot of search overlay

---

## Agent 6: Duplicate Detector + Vendor Merge

**Scope:**
- New tab on Applications page: "Duplicates"
- Auto-groups by same phone, email, normalized business name
- Merge: select which fields to keep, archive duplicate
- Reject: reject duplicate, keep primary
- **Verify:** Screenshot of duplicate groups + merge drawer

---

## Agent 7: Quick Notes + Communication Log

**Scope:**
- Notes panel on vendor profile: textarea + save, persists in admin_notes JSON
- Communication Log: chronological feed of emails, WhatsApp, status changes, notes
- Reads from wa_messages, support_inbox_messages, site_events
- **Verify:** Screenshot of notes + comm log

---

## Agent 8: Payment Reconciliation

**Scope:**
- New MONEY page: `/admin/finance`
- Tab 1: Payments — all vendors with payment status, amount, date. Filter, export CSV, send reminder
- Tab 2: Reconciliation — match payments against WooCommerce orders, flag mismatches
- **Verify:** Screenshot of each tab

---

## Agent 9: Vendor Portal Redesign + Marketing Kit

**Scope:**
- Remove PortalSecondaryNav entirely
- PortalNav: 5 items with dropdowns:
  1. Overview — Activity, Notifications
  2. My Stand — Stall Details, Change Request (uses shared StallMap)
  3. Documents — Invoices, Contracts, Badges, Marketing Assets
  4. Marketing — redesigned marketing kit page
  5. Support — Inbox, Contact
- Apply design system spacing to all vendor pages
- **Marketing Kit page (strong redesign):**
  - Brand logo downloads: PNG (transparent, white bg), SVG — multiple sizes
  - Social media banners: Instagram (1080x1080), Facebook cover (1640x624), LinkedIn banner (1584x396)
  - Flyer template: event flyer with vendor's name + stall code placeholder, editable Canva link
  - Brand guidelines: colours (hex codes), fonts, usage rules
  - Suggested captions for Instagram, Facebook, TikTok
  - Hashtag bank: #CapeTownHalaal #YoungAtHeart2026 #CTHalaal
  - Download all as ZIP button
  - Built with Fraunces headings, Inter UI, current CTH colours
- **Verify:** Vendor nav screenshots at 1440px + 375px, marketing kit page with all assets

---

## Agent 10: Support Inbox Redesign

**Scope:**
- Collapse action bar to single 48px row (Assign | Tag | Snooze | Resolve | Link + overflow "...")
- Email signature on every outbound reply
- Fix thread collapse button position (left edge, not floating)
- Proper collapse animation
- **Verify:** Screenshot before/after showing vertical space recovered

---

## Agent 11: Broadcast Redesign + Email Preview

**Scope:**
- 3-step flow: Audience → Template → Preview + Send
- Email Preview: render exactly what vendor sees before sending
- Template management: save/edit/delete
- Send history: past broadcasts with delivery stats
- **Verify:** Screenshot each step

---

## Agent 12: Stall Change Requests

**Scope:**
- Vendor requests change from My Stand page after contract
- Dropdown to select new stall size
- Same as initial → auto-approve
- Different → admin approval + WhatsApp to Samreen with yes/no reply
- Payment diff: generate link or initiate refund
- **Verify:** End-to-end screenshots

---

## Agent 13: Activity Timeline

**Scope:**
- Chronological feed on vendor profile (admin + vendor views)
- Events: applied, approved, paid, docs uploaded, emailed, stall changed, notes added
- **Verify:** Screenshot timeline with events

---

## Agent 14: Unified Ticket System (cross-channel email + WhatsApp)

**Scope:**
- Every vendor communication gets ONE ticket ID
- Inbound email for vendor → ticket created
- Vendor replies via WhatsApp → matched to same ticket by phone/email
- Admin sees ONE thread per vendor, not three separate inboxes
- Link existing wa_threads + support_inbox_threads by vendor phone/email
- Unified view in Vendor 360 Communication Log
- **Verify:** Screenshot of unified thread with mixed email + WhatsApp messages

---

## Agent 15: Mobile Responsive

**Scope:**
- Run last. All admin pages work at 375px
- Tables become stacked cards
- Sidebar becomes bottom tab bar
- Touch targets min 44px
- **Verify:** 375px screenshots of every page

---

## Execution

Agents run in dependency order:
```
1 → 2 → (3,4,5,6,7,8 in parallel) → 9 → (10,11,12,13,14 in parallel) → 15
```

Each agent delivers:
1. Code changes
2. Playwright screenshot(s)
3. No next agent until current is approved
