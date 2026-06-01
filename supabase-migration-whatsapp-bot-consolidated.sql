-- Consolidated WhatsApp-bot migration — exactly the 3 tables the inbound
-- webhook + consent gate require. Idempotent (safe to re-run).
--   wa_messages    (from v5) — message log + dedup on provider_message_id
--   wa_contacts    (from v6) — current consent state, the pre-send gate reads this
--   wa_consent_log (from v6) — append-only proof ledger

-- ===== wa_messages (v5) =====
CREATE TABLE IF NOT EXISTS wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  direction TEXT NOT NULL CHECK (direction IN ('out', 'in')),
  wa_phone TEXT NOT NULL,
  template_name TEXT,
  category TEXT CHECK (category IN ('utility','marketing','authentication','service')),
  body TEXT,
  status TEXT DEFAULT 'queued'
    CHECK (status IN ('queued','sent','delivered','read','failed','received')),
  provider_message_id TEXT,
  error TEXT,
  cost_usd DECIMAL(10,5),
  related_order_id TEXT,
  broadcast_id UUID,
  metadata JSONB DEFAULT '{}'
);
ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages wa_messages" ON wa_messages;
CREATE POLICY "Service role manages wa_messages"
  ON wa_messages FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_wa_messages_phone    ON wa_messages(wa_phone);
CREATE INDEX IF NOT EXISTS idx_wa_messages_status   ON wa_messages(status);
CREATE INDEX IF NOT EXISTS idx_wa_messages_created  ON wa_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_provider ON wa_messages(provider_message_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wa_order_template
  ON wa_messages(related_order_id, template_name)
  WHERE related_order_id IS NOT NULL AND direction = 'out';

-- ===== wa_contacts (v6) =====
CREATE TABLE IF NOT EXISTS wa_contacts (
  wa_phone        TEXT PRIMARY KEY,
  profile_name    TEXT,
  opted_in        BOOLEAN NOT NULL DEFAULT FALSE,
  opted_out       BOOLEAN NOT NULL DEFAULT FALSE,
  is_buyer        BOOLEAN NOT NULL DEFAULT FALSE,
  opted_in_at     TIMESTAMPTZ,
  opted_out_at    TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_wa_contacts_opted_out ON wa_contacts(opted_out);
ALTER TABLE wa_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages wa_contacts" ON wa_contacts;
CREATE POLICY "Service role manages wa_contacts" ON wa_contacts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ===== wa_consent_log (v6) =====
CREATE TABLE IF NOT EXISTS wa_consent_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  wa_phone         TEXT NOT NULL,
  action           TEXT NOT NULL CHECK (action IN ('opt_in','opt_out')),
  source           TEXT NOT NULL CHECK (source IN ('checkout','vendor_form','inbound','manual','import')),
  consent_text_ver TEXT,
  order_id         TEXT,
  ip_address       TEXT,
  user_agent       TEXT,
  meta             JSONB NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_wa_consent_log_phone ON wa_consent_log(wa_phone, created_at DESC);
ALTER TABLE wa_consent_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages wa_consent_log" ON wa_consent_log;
CREATE POLICY "Service role manages wa_consent_log" ON wa_consent_log
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');
