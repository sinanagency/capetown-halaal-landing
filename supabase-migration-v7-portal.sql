-- =====================================================
-- Migration V7: Full Exhibitor Portal schema
-- Run ONCE in Supabase SQL Editor (project dtdqopjdxwfvtyrnygdt).
-- Fully idempotent + re-runnable. Supersedes the partially-applied v5.
-- Pattern: service-role RLS (API routes enforce identity).
-- =====================================================

-- ---------- shared updated_at trigger fn (v5 assumed this existed) ----------
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

-- ---------- payment + portal-stage columns on applications ----------
ALTER TABLE vendor_applications
  ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'none'
    CHECK (payment_status IN ('none','deferred','pending','paid','waived')),
  ADD COLUMN IF NOT EXISTS payment_amount DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS payment_due_date DATE,
  ADD COLUMN IF NOT EXISTS payment_reference TEXT,            -- unique PayShap/EFT ref
  ADD COLUMN IF NOT EXISTS payment_reminder_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS portal_stage TEXT DEFAULT 'approved'
    CHECK (portal_stage IN ('approved','invoiced','paid','docs','show_ready')),
  ADD COLUMN IF NOT EXISTS auth_user_id UUID;                 -- owner's auth.users id
CREATE INDEX IF NOT EXISTS idx_applications_payment_status ON vendor_applications(payment_status);
CREATE INDEX IF NOT EXISTS idx_applications_auth_user ON vendor_applications(auth_user_id);

-- ---------- vendor_profiles (live booth/logistics record) ----------
CREATE TABLE IF NOT EXISTS vendor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  logo_url TEXT,
  menu JSONB DEFAULT '[]',                  -- [{name, price, desc}] -> public directory
  power_declaration JSONB DEFAULT '{}',     -- appliances + amps
  booth_number TEXT, booth_zone TEXT, booth_size TEXT, map_ref TEXT,
  load_in_at TIMESTAMPTZ, load_out_at TIMESTAMPTZ, setup_notes TEXT,
  stall_fee DECIMAL(10,2), invoice_url TEXT,
  whatsapp_opt_in BOOLEAN DEFAULT FALSE
);
ALTER TABLE vendor_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages vendor_profiles" ON vendor_profiles;
CREATE POLICY "Service role manages vendor_profiles" ON vendor_profiles FOR ALL USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_vendor_profile_app ON vendor_profiles(application_id);
DROP TRIGGER IF EXISTS vendor_profiles_updated_at ON vendor_profiles;
CREATE TRIGGER vendor_profiles_updated_at BEFORE UPDATE ON vendor_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------- vendor_documents (compliance + halaal sign-off) ----------
CREATE TABLE IF NOT EXISTS vendor_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  application_id UUID NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL
    CHECK (doc_type IN ('halaal_cert','health_permit','fire_safety',
                        'public_liability','electrical_coc','contract','indemnity','other')),
  file_url TEXT NOT NULL,
  file_name TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  expires_at DATE,
  reviewed_by TEXT,
  admin_notes TEXT
);
ALTER TABLE vendor_documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages vendor_documents" ON vendor_documents;
CREATE POLICY "Service role manages vendor_documents" ON vendor_documents FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_vendor_docs_app ON vendor_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_vendor_docs_status ON vendor_documents(status);

-- ---------- vendor_team_members (owner + staff logins) ----------
CREATE TABLE IF NOT EXISTS vendor_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  application_id UUID NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,
  auth_user_id UUID,                        -- auth.users id once they accept
  email TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('owner','staff')),
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited','active','disabled')),
  must_change_password BOOLEAN DEFAULT TRUE
);
ALTER TABLE vendor_team_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages vendor_team_members" ON vendor_team_members;
CREATE POLICY "Service role manages vendor_team_members" ON vendor_team_members FOR ALL USING (true) WITH CHECK (true);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_team_email_per_app ON vendor_team_members(application_id, lower(email));
CREATE INDEX IF NOT EXISTS idx_team_auth_user ON vendor_team_members(auth_user_id);

-- ---------- staff_passes (gate badges -> FooEvents QR) ----------
CREATE TABLE IF NOT EXISTS staff_passes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  application_id UUID NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  id_number TEXT,
  vehicle_reg TEXT,
  foo_ticket_id TEXT,                       -- WooCommerce/FooEvents id
  qr_url TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','issued','revoked'))
);
ALTER TABLE staff_passes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages staff_passes" ON staff_passes;
CREATE POLICY "Service role manages staff_passes" ON staff_passes FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_staff_passes_app ON staff_passes(application_id);

-- ---------- vendor_addons (power, extra tables -> invoice) ----------
CREATE TABLE IF NOT EXISTS vendor_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  application_id UUID NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,
  item TEXT NOT NULL,
  qty INTEGER DEFAULT 1,
  unit_price DECIMAL(10,2) DEFAULT 0,
  status TEXT DEFAULT 'requested' CHECK (status IN ('requested','confirmed','cancelled'))
);
ALTER TABLE vendor_addons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages vendor_addons" ON vendor_addons;
CREATE POLICY "Service role manages vendor_addons" ON vendor_addons FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_addons_app ON vendor_addons(application_id);

-- ---------- vendor_announcements (portal feed) ----------
CREATE TABLE IF NOT EXISTS vendor_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  audience TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','zone','single')),
  zone TEXT,
  application_id UUID REFERENCES vendor_applications(id),
  pinned BOOLEAN DEFAULT FALSE,
  send_whatsapp BOOLEAN DEFAULT FALSE,
  created_by TEXT
);
ALTER TABLE vendor_announcements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages vendor_announcements" ON vendor_announcements;
CREATE POLICY "Service role manages vendor_announcements" ON vendor_announcements FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_vendor_ann_created ON vendor_announcements(created_at DESC);

-- ---------- support_threads + support_messages ----------
CREATE TABLE IF NOT EXISTS support_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  application_id UUID NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,
  subject TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','answered','closed'))
);
CREATE TABLE IF NOT EXISTS support_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  thread_id UUID NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  sender TEXT NOT NULL CHECK (sender IN ('vendor','admin','ai')),
  body TEXT NOT NULL
);
ALTER TABLE support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages support_threads" ON support_threads;
CREATE POLICY "Service role manages support_threads" ON support_threads FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role manages support_messages" ON support_messages;
CREATE POLICY "Service role manages support_messages" ON support_messages FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_support_msg_thread ON support_messages(thread_id);

-- ---------- live_updates (show-day control -> realtime) ----------
CREATE TABLE IF NOT EXISTS live_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  level TEXT DEFAULT 'info' CHECK (level IN ('info','warning','emergency')),
  title TEXT NOT NULL,
  body TEXT,
  audience TEXT DEFAULT 'all' CHECK (audience IN ('all','vendors','attendees')),
  created_by TEXT
);
ALTER TABLE live_updates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages live_updates" ON live_updates;
CREATE POLICY "Service role manages live_updates" ON live_updates FOR ALL USING (true) WITH CHECK (true);

-- ---------- audit_log (who did what, when) ----------
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  actor TEXT,                               -- admin email or vendor email
  actor_role TEXT,                          -- admin / owner / staff / system
  action TEXT NOT NULL,                     -- e.g. 'application.approved'
  target_type TEXT, target_id TEXT,
  detail JSONB DEFAULT '{}'
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role manages audit_log" ON audit_log;
CREATE POLICY "Service role manages audit_log" ON audit_log FOR ALL USING (true) WITH CHECK (true);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_log(created_at DESC);

-- =====================================================
-- After running:
-- Storage > New bucket > "vendor-docs"  (Private)  for compliance uploads.
-- Storage > New bucket > "vendor-assets" (Public)  for logos/menu images.
-- =====================================================
