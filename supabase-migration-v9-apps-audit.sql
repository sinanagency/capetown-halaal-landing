-- =====================================================
-- Cape Town Halaal Expo — Migration v9
-- Applications smart-queue audit fields + WA log + site events
-- Run in Supabase SQL Editor on the CTH project.
-- Idempotent: safe to re-run.
-- =====================================================

-- 1. New audit columns on vendor_applications
ALTER TABLE vendor_applications
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS dup_marker text,
  ADD COLUMN IF NOT EXISTS completeness_score smallint,
  ADD COLUMN IF NOT EXISTS documents jsonb;

-- Index supporting the smart queue (status + duplicate bucket)
CREATE INDEX IF NOT EXISTS idx_applications_status_dup
  ON vendor_applications(status, dup_marker);

-- 2. wa_messages: outbound + inbound log for the applicant thread
CREATE TABLE IF NOT EXISTS wa_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  phone text NOT NULL,
  application_id uuid REFERENCES vendor_applications(id) ON DELETE SET NULL,
  template_key text,
  body text,
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','delivered','read','failed','skipped')),
  provider_message_id text,
  error text,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_wa_messages_phone_created
  ON wa_messages(phone, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wa_messages_application
  ON wa_messages(application_id, created_at DESC);

ALTER TABLE wa_messages ENABLE ROW LEVEL SECURITY;

-- Only admins can read wa_messages (service role bypasses RLS for writes)
DROP POLICY IF EXISTS "Admins can view wa_messages" ON wa_messages;
CREATE POLICY "Admins can view wa_messages"
  ON wa_messages
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- 3. site_events: structured audit log for admin actions and system events
CREATE TABLE IF NOT EXISTS site_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  actor_id uuid,
  target_type text,
  target_id text,
  payload jsonb,
  result text
);

CREATE INDEX IF NOT EXISTS idx_site_events_type_created
  ON site_events(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_site_events_target
  ON site_events(target_type, target_id);

ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admins can view site_events" ON site_events;
CREATE POLICY "Admins can view site_events"
  ON site_events
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));
