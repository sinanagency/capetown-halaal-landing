-- =====================================================
-- Migration V5: WhatsApp Bot + Vendor Portal
-- Run in Supabase SQL Editor (after v2, v3, v4)
-- Pattern: service-role RLS (API routes enforce identity),
-- matches ticket_buyers / vendor_otps from v2.
-- =====================================================

-- ---------- WhatsApp opt-in on existing buyers ----------
ALTER TABLE ticket_buyers
  ADD COLUMN IF NOT EXISTS wa_phone TEXT,                 -- E.164 normalized (e.g. +27...)
  ADD COLUMN IF NOT EXISTS whatsapp_opt_in BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS whatsapp_opted_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS whatsapp_opt_out BOOLEAN DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_buyers_wa_phone ON ticket_buyers(wa_phone);

-- ---------- WhatsApp message log (delivery + cost + idempotency) ----------
CREATE TABLE IF NOT EXISTS wa_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  direction TEXT NOT NULL CHECK (direction IN ('out', 'in')),
  wa_phone TEXT NOT NULL,                                 -- E.164
  template_name TEXT,                                     -- null for free-form / inbound
  category TEXT CHECK (category IN ('utility','marketing','authentication','service')),
  body TEXT,

  status TEXT DEFAULT 'queued'
    CHECK (status IN ('queued','sent','delivered','read','failed','received')),
  provider_message_id TEXT,                               -- WhatsApp wamid, for status callbacks
  error TEXT,
  cost_usd DECIMAL(10,5),

  related_order_id TEXT,                                  -- WooCommerce order id (ticket delivery)
  broadcast_id UUID,                                      -- set if part of a broadcast
  metadata JSONB DEFAULT '{}'
);

ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages wa_messages"
  ON wa_messages FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_wa_messages_phone   ON wa_messages(wa_phone);
CREATE INDEX IF NOT EXISTS idx_wa_messages_status  ON wa_messages(status);
CREATE INDEX IF NOT EXISTS idx_wa_messages_created ON wa_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_provider ON wa_messages(provider_message_id);
-- Idempotency: don't send the same template to the same order twice
CREATE UNIQUE INDEX IF NOT EXISTS uniq_wa_order_template
  ON wa_messages(related_order_id, template_name)
  WHERE related_order_id IS NOT NULL AND direction = 'out';

-- ---------- Broadcast campaigns (countdowns, announcements) ----------
CREATE TABLE IF NOT EXISTS wa_broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all_buyers'
    CHECK (audience IN ('all_buyers','all_vendors','zone','test')),
  audience_filter JSONB DEFAULT '{}',                    -- e.g. {"zone":"FT"}
  scheduled_for TIMESTAMPTZ,
  status TEXT DEFAULT 'draft'
    CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  sent_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_by TEXT
);

ALTER TABLE wa_broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages wa_broadcasts"
  ON wa_broadcasts FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_wa_broadcasts_status ON wa_broadcasts(status);

-- ---------- Payment tracking on applications (single source of truth) ----------
-- Samreen's flow: approve -> payment deferred to Sept -> reminder -> paid.
ALTER TABLE vendor_applications
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none'
    CHECK (payment_status IN ('none','deferred','pending','paid','waived')),
  ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payment_due_date DATE,
  ADD COLUMN IF NOT EXISTS payment_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_applications_payment_status
  ON vendor_applications(payment_status);

-- ---------- Vendor profiles (operational data for ACCEPTED vendors) ----------
-- Keeps vendor_applications immutable; this is the live booth/logistics record.
CREATE TABLE IF NOT EXISTS vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Booth assignment
  booth_number TEXT,
  booth_zone TEXT,                                       -- FT / FS / TS / BS
  booth_size TEXT,
  map_ref TEXT,                                          -- pin/cell on festival floor plan

  -- Logistics
  load_in_at TIMESTAMPTZ,
  load_out_at TIMESTAMPTZ,
  setup_notes TEXT,
  vehicle_pass_count INTEGER DEFAULT 0,
  gate_code TEXT,

  -- Specs
  power_amps INTEGER,
  power_fee DECIMAL(10,2),
  water_access BOOLEAN DEFAULT FALSE,
  provided_equipment TEXT,

  -- Money
  stall_fee DECIMAL(10,2),
  deposit_paid BOOLEAN DEFAULT FALSE,
  balance_due DECIMAL(10,2),
  invoice_url TEXT,

  -- Comms
  whatsapp_opt_in BOOLEAN DEFAULT FALSE
);

ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages vendor_profiles"
  ON vendor_profiles FOR ALL USING (true) WITH CHECK (true);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_vendor_profile_app ON vendor_profiles(application_id);
CREATE INDEX IF NOT EXISTS idx_vendor_profiles_zone ON vendor_profiles(booth_zone);

CREATE TRIGGER vendor_profiles_updated_at
  BEFORE UPDATE ON vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------- Vendor compliance documents ----------
CREATE TABLE IF NOT EXISTS vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  application_id UUID NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,

  doc_type TEXT NOT NULL
    CHECK (doc_type IN ('halaal_cert','health_permit','fire_safety',
                        'public_liability','contract','indemnity','other')),
  file_url TEXT NOT NULL,                                 -- Supabase Storage path
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected')),
  expires_at DATE,
  admin_notes TEXT
);

ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages vendor_documents"
  ON vendor_documents FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_vendor_docs_app    ON vendor_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_vendor_docs_status ON vendor_documents(status);

-- ---------- Vendor announcements (portal feed + optional WhatsApp) ----------
CREATE TABLE IF NOT EXISTS vendor_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all'
    CHECK (audience IN ('all','zone','single')),
  zone TEXT,                                              -- when audience = 'zone'
  application_id UUID REFERENCES vendor_applications(id), -- when audience = 'single'
  send_whatsapp BOOLEAN DEFAULT FALSE,
  created_by TEXT
);

ALTER TABLE vendor_announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages vendor_announcements"
  ON vendor_announcements FOR ALL USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_vendor_ann_created ON vendor_announcements(created_at DESC);

-- =====================================================
-- After running: create a Supabase Storage bucket
-- named 'vendor-docs' (private) for compliance uploads.
-- =====================================================
