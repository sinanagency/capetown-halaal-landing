-- =====================================================
-- Mail Outreach — Migration v10
-- Run in Supabase SQL Editor (CTH project, owner only).
--
-- What this adds:
--   1. mail_messages: every outbound + (future) inbound message logged.
--      One row per message. message_id is the unique RFC 5322 Message-ID
--      we put on the header — the same value also lands in our outbound
--      Resend record AND in the inbound IMAP record, so reply threading
--      reconciles cleanly via in_reply_to / references.
--   2. mail_optout: per-email suppression list. Any send loop MUST check
--      this table BEFORE sending. STOP-replies and one-click unsubscribes
--      land here.
-- =====================================================

-- ---------------------------------------------------------------------------
-- mail_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- in = received via IMAP, out = sent via Resend
  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),

  -- Which mailbox this passed through. Examples:
  --   'support@youngatheart.co.za' (inbound IMAP)
  --   'hello@youngatheart.co.za'   (outbound via Resend, primary)
  --   'support@youngatheart.co.za' (outbound fallback)
  mailbox TEXT NOT NULL,

  from_addr TEXT NOT NULL,
  to_addr TEXT NOT NULL,
  subject TEXT,
  body_text TEXT,
  body_html TEXT,

  -- RFC 5322 headers — load-bearing for thread reconciliation.
  message_id TEXT NOT NULL,
  in_reply_to TEXT,
  "references" TEXT,

  -- Lifecycle.
  --   pending  = queued (rare, used if we move to a job queue later)
  --   sent     = handed off to Resend OK
  --   delivered = Resend webhook confirmed delivery
  --   bounced  = Resend webhook reported bounce
  --   failed   = transport error, did not leave our side
  --   received = inbound row
  status TEXT NOT NULL DEFAULT 'sent'
    CHECK (status IN ('pending', 'sent', 'delivered', 'bounced', 'failed', 'received')),
  error TEXT,

  -- Resend's own message id (for delivery webhook reconciliation).
  provider_message_id TEXT,

  -- Optional vendor link. Set when this message belongs to a known applicant.
  vendor_application_id UUID
    REFERENCES vendor_applications(id) ON DELETE SET NULL
);

-- Reply-threading + idempotency.
CREATE UNIQUE INDEX IF NOT EXISTS mail_messages_message_id_key
  ON mail_messages (message_id);

CREATE INDEX IF NOT EXISTS mail_messages_created_idx
  ON mail_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS mail_messages_direction_idx
  ON mail_messages (direction, created_at DESC);
CREATE INDEX IF NOT EXISTS mail_messages_to_addr_idx
  ON mail_messages (to_addr);
CREATE INDEX IF NOT EXISTS mail_messages_from_addr_idx
  ON mail_messages (from_addr);
CREATE INDEX IF NOT EXISTS mail_messages_in_reply_to_idx
  ON mail_messages (in_reply_to);
CREATE INDEX IF NOT EXISTS mail_messages_vendor_idx
  ON mail_messages (vendor_application_id);
CREATE INDEX IF NOT EXISTS mail_messages_status_idx
  ON mail_messages (status);

ALTER TABLE mail_messages ENABLE ROW LEVEL SECURITY;

-- Service role only. The admin UI reads via the server (service role); the
-- exhibitor portal MUST NOT see this table.
DROP POLICY IF EXISTS "Service role full access on mail_messages" ON mail_messages;
CREATE POLICY "Service role full access on mail_messages"
  ON mail_messages FOR ALL
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- mail_optout
-- ---------------------------------------------------------------------------
-- Suppression list. Email is the primary key (case-insensitive lookup at
-- query time via lower(); we store lower-cased input).
CREATE TABLE IF NOT EXISTS mail_optout (
  email TEXT PRIMARY KEY,
  unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reason TEXT
);

CREATE INDEX IF NOT EXISTS mail_optout_unsub_idx
  ON mail_optout (unsubscribed_at DESC);

ALTER TABLE mail_optout ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access on mail_optout" ON mail_optout;
CREATE POLICY "Service role full access on mail_optout"
  ON mail_optout FOR ALL
  USING (true)
  WITH CHECK (true);

-- =====================================================
-- Notes for the operator:
--   - Audience filtering in /api/admin/whatsapp-broadcast EXCLUDES any
--     vendor_applications.email present in mail_optout for the mail channel.
--     A vendor who STOP-replies via WhatsApp is excluded from the WA audience
--     via vendor_applications.wa_consent (added in v11 if not present).
--   - The token used in the List-Unsubscribe URL is generated server-side
--     from a HMAC of (email + UNSUB_SECRET). It is NOT stored. Validation
--     just recomputes the HMAC and compares.
-- =====================================================
