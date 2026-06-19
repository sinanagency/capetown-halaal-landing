# Samreen's Admin Portal Guide — Step by Step

> Everything you need to run the Young at Heart Festival 2026 admin portal.
> Live at **cthalaal.co.za/admin** — log in with your email.

---

## 1. Dashboard — your home base

When you log in, you land on the Dashboard. Two things to see:

**Task Center** (new — top of dashboard)
Shows what needs your attention:
- Pending applications to review
- Unread support emails
- Failed WhatsApp messages
- Stale applications (>30 days old)

Hover over a task and click the **X** to dismiss it. Tasks auto-refresh every 60 seconds.

**Stats row** — tickets sold, vendor revenue, active apps, page views. All real numbers.

**Alert bar** — clickable shortcuts to urgent items.

---

## 2. Applications — review vendor applications

Click **Applications** in the sidebar (or the task link).

**Keyboard shortcuts:**
- `j` — next application
- `k` — previous application  
- `a` — approve current application
- `r` — reject current application

**Filters at the top:**
- Status (Open / Pending / Approved / Rejected)
- Sector (Food, Fashion, Beauty, etc.)
- Stall type (Marquee, Food Truck, etc.)
- Completeness score

**Search** any field (business name, email, phone).

**Dedupe button** — finds duplicate applications by phone number.

**Bulk actions** — select multiple and approve/reject at once.

---

## 3. Allocation — assign vendor stalls

Click **Allocation** in the sidebar.

- **Pan/zoom** the 2D floor plan
- Click a stall to assign it
- **Filters** above the map: filter by sector, stall type, or status
- **Slot countdown** — shows "X stalls available / Y total" matching your filter
- Search for a specific stall code

---

## 4. Vendors — manage approved vendors

Click **Vendors** in the sidebar.

**Vendor list** — all approved vendors with business name, contact, stall code, payment status.

**Click a vendor** to open their profile:
- Summary with AI-generated overview
- Contact info
- Contract status (signed/unsigned)
- Payment status and receipts
- Staff badges
- Activity timeline
- Uploaded documents

**Bulk actions:** select vendors and send bulk WhatsApp/email.

---

## 5. Inbox — WhatsApp messages

Click **Inbox** in the sidebar (under Communications).

This is the WhatsApp bot inbox — every conversation with the YAH bot.

**Two-pane layout:**
- Left: thread list (searchable, filterable)
- Right: conversation view

**Source filter:** Guest (unknown numbers) / Mail / Admin threads.

**Reply** directly in the thread. The reply goes via WhatsApp.

**Handover** — click to hand a conversation from bot to human.

---

## 6. Support Inbox — festival email

Click **Support Inbox** in the sidebar.

This is `support@youngatheart.co.za` — all festival email in one place.

**Tabs:** Inbox (open) / Sent (outbound) / All.

**Filters:**
- Status: Open / Snoozed / Resolved
- Tag: payment, load-in, badges, contract, refund, general
- **Identity: All / Vendors / Ticket buyers / Unknown** (new)

**Thread collapse** (new) — click the icon next to the thread title to hide the thread list and give the message view full width. A peek tab appears on the left edge to reopen.

**Actions on a thread:**
- Assign to an operator
- Add a tag
- Snooze (4h, 1d, tomorrow morning)
- Resolve / Reopen
- Link to a vendor or ticket buyer
- Reply via Resend (support@youngatheart.co.za)

**Canned replies** — quick templates for common questions.

---

## 7. Broadcast — send bulk messages

Click **Broadcast** in the sidebar.

Reach a filtered slice of vendors via email, WhatsApp, or both.

**Filters:** sector, stall type, status, payment status.

**Choose mode:**
- **Template** — use a pre-defined message template
- **Free text** — write your own message

**Preview** shows how the message looks before sending.

**Spin** — randomise or iterate the message.

---

## 8. People — everyone in the system

Click **People** in the sidebar.

A register of every person in the system — vendors, ticket buyers, contacts. Searchable, filterable.

---

## 9. Documents — all files in one place

Click **Documents** in the sidebar.

**Tabs:** Vendor Documents / Tickets.
Every contract, invoice, badge PDF, and ticket in one searchable directory.

---

## 10. Ticket Sales — WooCommerce revenue

Click **Ticket Sales** under Money.

Revenue breakdown: tickets sold, revenue by pass type (Friday, Saturday, Sunday, Weekend), sales trend over time.

---

## 11. Follow Up — chase unpaid vendors

Click **Follow Up** under Money.

Shows vendors with outstanding payments. Chase button on each row to send a reminder email/WhatsApp.

---

## 12. Settings

Click **Settings** in the sidebar.

**Activity Feed** — every action logged in the system.
**Operators** — manage admin users and their roles (Owner / Operator / Viewer).
**Audit Log** — security audit trail.
**Comms Health** — live probes against WhatsApp, Email, and DGX bot. Green = healthy.

---

## 13. Sidebar collapse

At the bottom of the sidebar, above your name, there's a **collapse toggle** (`← Collapse sidebar`). Click it to shrink the sidebar to icons only. Click `→` to expand it back. The collapse button is always in the same place.

When collapsed, the logo is smaller but visible. Hover over any icon to see its label.

---

## Navigation anywhere

Press **Cmd+K** (or Ctrl+K on Windows) anywhere in the admin to open the command palette. Search for any page or action.

---

## Quick tips

- **Rate limits:** The WhatsApp bot allows 10 chats per 10 minutes per IP. If you get "sending too quickly", wait a minute.
- **Deploys:** I push code changes via CLI. You don't need to do anything — just refresh the page to see updates.
- **Data is real:** All numbers are live (except ticket data — that comes from WooCommerce at tickets.youngatheart.co.za).
- **Need help?** support@youngatheart.co.za — yes, it goes to the same inbox you manage.

---

*Guide generated 2026-06-16. For questions about the system, ask Taona.*
