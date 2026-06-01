-- Migration v6 — WhatsApp consent guardrails
-- Goal: make the festival number safe to host under any WABA (Nisria now,
-- Halaal Hub later) so it can NEVER drag the host account down.
--
-- Two pieces:
--   1. wa_contacts     — fast, phone-keyed CURRENT state (the pre-send gate reads this)
--   2. wa_consent_log  — append-only PROOF ledger (what we show Meta / a dispute)
--
-- v5 already added whatsapp_opt_in / whatsapp_opt_out booleans on ticket_buyers.
-- Those stay as buyer-level convenience flags; wa_contacts is the source of
-- truth the bot enforces against, because not every contact is a buyer.
-- ---------------------------------------------------------------------------

-- ========== 1. Current consent state (one row per phone) ==========
CREATE TABLE IF NOT EXISTS wa_contacts (
  wa_phone        TEXT PRIMARY KEY,                 -- E.164, e.g. +27821234567
  profile_name    TEXT,                             -- WhatsApp display name (best effort)

  opted_in        BOOLEAN NOT NULL DEFAULT FALSE,   -- explicit marketing opt-in
  opted_out       BOOLEAN NOT NULL DEFAULT FALSE,   -- STOP — hard block on everything
  is_buyer        BOOLEAN NOT NULL DEFAULT FALSE,   -- bought a ticket → transactional consent

  opted_in_at     TIMESTAMPTZ,
  opted_out_at    TIMESTAMPTZ,
  last_inbound_at TIMESTAMPTZ,                       -- opens the 24h service window

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wa_contacts_opted_out ON wa_contacts(opted_out);

ALTER TABLE wa_contacts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages wa_contacts" ON wa_contacts;
CREATE POLICY "Service role manages wa_contacts" ON wa_contacts
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ========== 2. Append-only proof ledger ==========
-- Never UPDATE or DELETE rows here. Every consent event is a new row.
-- This table is the defense: "when, where, what they agreed to, from what IP."
CREATE TABLE IF NOT EXISTS wa_consent_log (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  wa_phone         TEXT NOT NULL,                    -- E.164
  action           TEXT NOT NULL CHECK (action IN ('opt_in','opt_out')),
  source           TEXT NOT NULL CHECK (source IN ('checkout','vendor_form','inbound','manual','import')),
  consent_text_ver TEXT,                             -- exact wording shown, versioned (e.g. 'wa_v1')
  order_id         TEXT,                             -- FooEvents/Woo order if source=checkout
  ip_address       TEXT,                             -- captured at point of consent
  user_agent       TEXT,
  meta             JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_wa_consent_log_phone ON wa_consent_log(wa_phone, created_at DESC);

ALTER TABLE wa_consent_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages wa_consent_log" ON wa_consent_log;
CREATE POLICY "Service role manages wa_consent_log" ON wa_consent_log
  FOR ALL USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

-- ========== 3. The exact consent wording, versioned ==========
-- Reference copy of the text shown at each opt-in point. Bump the version
-- string whenever the wording changes so old log rows stay accurate.
COMMENT ON COLUMN wa_consent_log.consent_text_ver IS
  'wa_v1 = "Send my ticket and Young at Heart Festival updates via WhatsApp to this number."';
