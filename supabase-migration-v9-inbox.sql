-- =====================================================
-- Migration V9: vendor portal <-> admin two-way inbox
-- Run in Supabase SQL Editor on the CTH project (owner only).
--
-- Adds:
--   1. mail_messages  — IMAP-fetched + Resend-sent vendor mail, merged into the
--                       portal Inbox card alongside wa_messages.
--   2. wa_threads     — thread state per phone (last_handled_at + counts),
--                       drives the admin "needs you" inbox + portal nav dot.
--
-- Notes:
--   - All policies are service-role-only. Reads always go via /api routes that
--     enforce identity (vendor portal -> their own row, admin -> all).
--   - mail_messages is intentionally narrow. Don't replicate the full Gmail
--     message body, only what the Inbox card needs (subject + body + direction).
--   - wa_messages already exists from v5. We do not touch it here.
-- =====================================================

-- ---------- mail_messages: vendor email ledger ----------
CREATE TABLE IF NOT EXISTS mail_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  vendor_application_id UUID REFERENCES vendor_applications(id) ON DELETE SET NULL,

  -- Channel routing. from_email + to_email are lowercased on insert.
  from_email TEXT,
  to_email   TEXT,
  reply_to   TEXT,

  subject TEXT,
  body    TEXT,                              -- plain-text body
  html    TEXT,                              -- optional HTML body
  message_id TEXT,                           -- RFC822 Message-ID header
  in_reply_to TEXT,                          -- for threading
  provider TEXT CHECK (provider IN ('resend','godaddy_imap','manual')),
  provider_message_id TEXT,                  -- Resend id or IMAP UID

  status TEXT DEFAULT 'received'
    CHECK (status IN ('queued','sent','delivered','received','failed','bounced')),
  error TEXT,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE mail_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages mail_messages"
  ON mail_messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_mail_messages_application ON mail_messages(vendor_application_id);
CREATE INDEX IF NOT EXISTS idx_mail_messages_from        ON mail_messages(from_email);
CREATE INDEX IF NOT EXISTS idx_mail_messages_to          ON mail_messages(to_email);
CREATE INDEX IF NOT EXISTS idx_mail_messages_created     ON mail_messages(created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_mail_message_id
  ON mail_messages(message_id) WHERE message_id IS NOT NULL;

-- ---------- wa_threads: per-phone thread state ----------
CREATE TABLE IF NOT EXISTS wa_threads (
  wa_phone TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  last_inbound_at  TIMESTAMPTZ,
  last_outbound_at TIMESTAMPTZ,
  last_handled_at  TIMESTAMPTZ,              -- bumped by the portal reply API
                                              -- + the admin "mark handled" action

  unread_count INT DEFAULT 0,
  vendor_application_id UUID REFERENCES vendor_applications(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE wa_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages wa_threads"
  ON wa_threads FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_wa_threads_handled
  ON wa_threads(last_handled_at NULLS FIRST);

-- ---------- Realtime publication ----------
-- Both new tables join the supabase_realtime publication so the admin inbox
-- and the vendor portal can subscribe to live updates.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE mail_messages';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE wa_threads';
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END IF;
END$$;
