# ADR-002 — Unified inbox for WhatsApp bot and vendor mail, with separate tables per channel

- **Status:** Accepted 2026-06-13
- **Driver:** CTH platform (admin bot-inbox surface, vendor mail triage, 2026 festival cycle).
- **Affected surfaces:** `app/(admin)/admin/bot-inbox/`, `lib/wa-messages.ts`, `lib/mail-messages.ts`, `lib/imap.ts`, `lib/email.ts`, `wa_messages` table, `mail_messages` table.

## Context

Sam needs one place to see every inbound vendor message regardless
of channel. Vendors reach the festival through three paths: WhatsApp
(the bot on `+27 ... `, Meta WABA), email (the `vendors@cthalaal.co.za`
mailbox on GoDaddy IMAP), and the portal contact form (which fans out
to email). Today these arrive in three places, and Sam loses messages
in the gap.

The unified inbox renders both channels in one admin surface, lets
Sam reply on either channel from the same UI, and threads replies to
the originating vendor application where the name resolution
succeeds.

The question is whether to model the unified inbox as a single
`messages` table with a `channel` discriminator column, or as two
channel-specific tables (`wa_messages`, `mail_messages`) joined at
the view layer.

The two channels have substantially different shapes:

- WhatsApp messages have `wa_id` (phone number), `message_id` (Meta
  WABA UUID), 24-hour template window state, opt-in consent state,
  media attachments via Meta CDN URLs that expire, and a
  template/freeform classification.
- Mail messages have `message_id` (RFC 5322), `in_reply_to`,
  `references` (threading), `from`, `to`, `cc`, `subject`, `html_body`,
  `text_body`, MIME attachments, `List-Unsubscribe` headers, SPF /
  DKIM / DMARC pass state, and IMAP UID + folder for de-dup.

A single table covering both would either be a wide table with most
columns null per row, or a JSONB blob that defeats indexed lookups.

The IMAP client is `imapflow` (Andris Reinman's library). The
outbound mail sender is Resend with GoDaddy SMTP as fallback (covered
by ADR-003). Name resolution from inbound message to vendor
application uses a chain of strategies.

## Decision

**Model `wa_messages` and `mail_messages` as separate tables,
channel-shaped per the realities of each protocol. Render the unified
inbox by issuing two parallel queries and merging in the admin route,
not by view-joining in Postgres.** Use `imapflow` for IMAP polling;
use Resend for outbound (per ADR-003).

### Table shapes

`wa_messages` columns include:
- `id`, `wa_id`, `direction` (`in`/`out`), `message_id` (Meta UUID),
  `kind` (`template`/`freeform`/`button`/`media`),
  `template_name`, `template_lang`, `body_text`,
  `media_url`, `media_mime`, `created_at`,
  `vendor_application_id` (nullable foreign key once resolved),
  `consent_state_at_send`, `delivered_at`, `read_at`.

`mail_messages` columns include:
- `id`, `direction` (`in`/`out`), `message_id` (RFC 5322),
  `in_reply_to`, `references_chain`, `from_addr`, `to_addrs`,
  `cc_addrs`, `subject`, `body_html`, `body_text`,
  `has_attachments`, `imap_uid`, `imap_folder`,
  `spf_pass`, `dkim_pass`, `dmarc_pass`, `created_at`,
  `vendor_application_id` (nullable foreign key once resolved),
  `outbound_provider` (`resend`/`smtp`, populated for direction=`out`),
  `outbound_provider_message_id`.

### IMAP client choice

`imapflow` is chosen over `node-imap` because:
- Modern async/await API; no callback hell in the polling loop.
- Native IMAP IDLE support, so we can run a near-real-time listener
  instead of a 60-second poll loop.
- Built-in support for the IMAP CONDSTORE and QRESYNC extensions
  for efficient re-sync after a crash.
- Maintained and audited (single-maintainer risk acknowledged; see
  Negative below).

### Outbound channel choice

Resend is the only outbound channel for new vendor mail and for
operator replies sent from the inbox. SMTP through GoDaddy is the
fallback path only. The full reasoning is in ADR-003. The
`mail_messages.outbound_provider` column records which channel
actually sent each outbound message so the doctrine-reviewer can
verify Resend-first.

### Name resolution chain

Inbound messages on both channels run the same resolver to find the
matching `vendor_application_id`:

1. **Direct phone / email match.** For WA, exact match on
   `vendor_applications.phone` (E.164 normalized). For mail, exact
   match on `vendor_applications.email` (lowercased).
2. **Threading match (mail only).** If `in_reply_to` or any entry in
   `references_chain` matches an outbound `mail_messages.message_id`
   we previously sent, inherit its `vendor_application_id`.
3. **WA conversation continuity.** If the most recent `wa_messages`
   row for the same `wa_id` has a resolved `vendor_application_id`,
   inherit it.
4. **Fuzzy name match (last resort).** If the sender's display name
   (mail `From:` name or WA contact name) matches a vendor's
   `business_name` or `contact_name` with high confidence (Levenshtein
   threshold), surface as a suggested match in the inbox UI but do
   not auto-link.

The resolver is a single function in `lib/inbox/resolve.ts` called by
both `lib/wa-messages.ts` and `lib/mail-messages.ts` on insert.
Unresolved messages render in the inbox under an "Unmatched" section
that Sam can assign manually.

## Consequences

### Positive

- **Each table is indexable on the columns that actually matter for
  its channel.** Mail threading queries hit `in_reply_to` directly;
  WA template-window queries hit `wa_id` + `created_at` directly.
  Neither query has to filter past the other channel's rows.
- **Channel-specific evolution is independent.** When Meta WABA adds
  a new message kind (interactive list, flow message), only
  `wa_messages` changes. When IMAP threading adds a header we want to
  capture, only `mail_messages` changes.
- **The inbox merge is cheap.** Two indexed scans, sorted by
  `created_at`, paged in the admin route. Postgres view-joins across
  two heterogeneous shapes would either be slow or require a
  materialized view with refresh cost.
- **`imapflow` IDLE support means Sam sees mail in the inbox within
  seconds of arrival**, not after the next poll cycle.
- **The name resolution chain is a single function, testable in
  isolation.** Both channels call it on insert; the doctrine-reviewer
  can verify both paths go through the same resolver.
- **Resend-first for outbound is enforced at the column level**
  (`outbound_provider`), not at deploy time only. Any row written
  with `outbound_provider='smtp'` is auditable as a fallback event.

### Negative

- **The inbox merge happens in application code, not in Postgres.**
  Pagination across two tables needs cursor logic, not a simple
  offset. Mitigated by: the inbox is admin-only, traffic is
  effectively single-user (Sam), and the cursor logic is one helper
  function.
- **Two tables means two migration paths if schema drifts.** Mitigated
  by: both channels' shapes are stable in their respective protocols
  (RFC 5322 is RFC 5322; Meta WABA messages are versioned by Meta).
- **`imapflow` is a single-maintainer project.** Mitigated by: the
  IMAP protocol is stable, the library is audited, and replacing it
  with `node-imap` is a contained change in `lib/imap.ts`. We are not
  exposing `imapflow`'s API surface beyond that file.
- **The fuzzy-match step (resolver step 4) is a precision/recall
  tradeoff.** Mitigated by: it never auto-links; it only surfaces a
  suggestion. Sam approves the link or rejects it.

## Alternatives Considered

### A. Single `messages` table with a `channel` discriminator (rejected)

Model both channels in one table:

```
messages (id, channel, direction, external_id, body_text,
          body_html, metadata jsonb, vendor_application_id,
          created_at)
```

**Why rejected:**
- 60%+ of columns are null per row. Mail rows have null
  `template_name`, `wa_id`, `consent_state_at_send`. WA rows have
  null `subject`, `in_reply_to`, `references_chain`. A wide-sparse
  table is a smell.
- The alternative of stuffing channel-specific fields into a
  `metadata` JSONB blob defeats indexed lookups on threading,
  consent state, and template name.
- Channel-specific constraints (foreign keys to template registry,
  uniqueness on `imap_uid + imap_folder`) cannot be expressed
  cleanly across a discriminated table.
- The conceptual savings (one table, one query) are illusory once
  the indexes, constraints, and JSON-path filters are added.

### B. Use `node-imap` (rejected)

The older, callback-style IMAP library.

**Why rejected:**
- Callback-style code is harder to compose with the rest of the
  Next.js + TypeScript codebase, which is async/await throughout.
- No native IMAP IDLE support; would force a polling loop with
  worse latency than `imapflow`.
- Active maintenance has slowed; `imapflow` is the more current
  library in the Node IMAP ecosystem.

### C. Use a hosted inbox provider (Front, Help Scout, Missive) (rejected)

Route vendor mail to a third-party shared inbox and embed via API
or iframe.

**Why rejected:**
- Per-seat licensing (Front, Missive) adds operational cost the
  project does not need at the current scale.
- Threading the hosted inbox back to `vendor_applications` requires
  a webhook integration that becomes a second source of truth for
  vendor communication state. The doctrine-reviewer cannot read it
  in the same query as the vendor row.
- The WhatsApp channel is not natively first-class in any of these
  hosted inboxes (Front has WhatsApp Business, but it routes through
  a partner and the consent log lives off-platform).

### D. View-join two tables into a unified inbox view in Postgres (rejected)

Keep two tables but expose a Postgres view that unions them.

**Why rejected:**
- The view shape forces a lowest-common-denominator column set;
  channel-specific columns disappear from the view.
- Sorting + pagination across a union view in Postgres is
  workable but no cheaper than the application-side merge, and it
  hides the cost behind a SQL surface that is harder to debug.
- We considered this. The application-side merge keeps each
  channel's full shape available downstream and makes the merge
  logic explicit.

## Reversibility

**Medium.** Collapsing the two tables into a single discriminated
table later is a destructive migration but a contained one (a
`messages` table with channel + JSONB metadata, backfilled from both
sources). The application code that calls `wa-messages.ts` and
`mail-messages.ts` is the only consumer; both modules would become
thin wrappers over the unified table.

Replacing `imapflow` with another IMAP client is a `lib/imap.ts`
swap; no schema or downstream change.

Replacing Resend with a different outbound provider is covered by
ADR-003 and is a `lib/email.ts` change; the `outbound_provider`
column on `mail_messages` records the choice per row, so historical
audit data survives the swap.

The name resolution chain is a single function in
`lib/inbox/resolve.ts`; rules can be added, removed, or reordered
without touching either channel's storage layer.
