-- =====================================================
-- Unified inbox threads — Migration v11
-- Run in Supabase SQL Editor on the CTH project.
--
-- This is the spine of the bot-inbox. Every WhatsApp conversation
-- and every inbound email collapses to one row here, keyed by
-- thread_key (E.164 phone for wa, lower-cased address for mail).
-- =====================================================

CREATE TABLE IF NOT EXISTS wa_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  thread_key TEXT NOT NULL,                          -- E.164 phone or lower-case email
  channel TEXT NOT NULL CHECK (channel IN ('wa', 'mail')),

  -- Workflow
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'snoozed', 'done')),
  snoozed_until TIMESTAMPTZ,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Timestamps
  last_handled_at TIMESTAMPTZ,                       -- last admin outbound
  last_inbound_at TIMESTAMPTZ,                       -- last vendor inbound
  last_seen_at JSONB NOT NULL DEFAULT '{}'::jsonb,   -- { "<admin-uuid>": "2026-06-13T..." }

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One thread per (channel, key)
  UNIQUE (channel, thread_key)
);

CREATE INDEX IF NOT EXISTS idx_wa_threads_channel_status
  ON wa_threads (channel, status);

CREATE INDEX IF NOT EXISTS idx_wa_threads_assignee_status
  ON wa_threads (assignee_id, status);

CREATE INDEX IF NOT EXISTS idx_wa_threads_last_inbound
  ON wa_threads (last_inbound_at DESC);

-- updated_at trigger (reuses helper from v1)
DROP TRIGGER IF EXISTS wa_threads_updated_at ON wa_threads;
CREATE TRIGGER wa_threads_updated_at
  BEFORE UPDATE ON wa_threads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- RLS: admin-only read/write (service role bypasses)
ALTER TABLE wa_threads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view threads" ON wa_threads;
CREATE POLICY "Admins can view threads"
  ON wa_threads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Admins can update threads" ON wa_threads;
CREATE POLICY "Admins can update threads"
  ON wa_threads FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Service role manages threads" ON wa_threads;
CREATE POLICY "Service role manages threads"
  ON wa_threads FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- =====================================================
-- Helper: seed-or-touch a thread on first encounter.
-- Call from the wa-webhook AND the mail-fetcher.
-- =====================================================
CREATE OR REPLACE FUNCTION upsert_thread(
  p_channel TEXT,
  p_key TEXT,
  p_inbound_at TIMESTAMPTZ
)
RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO wa_threads (thread_key, channel, status, last_inbound_at)
  VALUES (p_key, p_channel, 'open', p_inbound_at)
  ON CONFLICT (channel, thread_key)
  DO UPDATE SET
    last_inbound_at = GREATEST(wa_threads.last_inbound_at, EXCLUDED.last_inbound_at),
    status = CASE
      WHEN wa_threads.status = 'done' THEN 'open'
      WHEN wa_threads.status = 'snoozed' AND wa_threads.snoozed_until <= NOW() THEN 'open'
      ELSE wa_threads.status
    END,
    updated_at = NOW()
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql;
