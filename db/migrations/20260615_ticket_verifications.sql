-- =====================================================
-- Migration: ticket_verifications
-- Date: 2026-06-15
-- Background ticket-verifier feeds Express Check-in + Admin Verifier UI.
--
-- Two distinct states:
--   verified_at  -> pre-event, signature OK + holder data present (auto cron OR admin manual)
--   checked_in_at -> day-of, scanned at the gate (express checkin OR admin manual OR fooevents scan)
--
-- Source of truth for tickets is still WooCommerce + FooEvents (Law 4).
-- This table is a cached verification ledger; it does NOT replace the WC count.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS + IF NOT EXISTS on every index + DROP/CREATE POLICY.
-- Safe to re-run.
-- =====================================================

BEGIN;

CREATE TABLE IF NOT EXISTS ticket_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wc_order_id integer NOT NULL,
  fooevents_ticket_id text,
  ticket_type text,
  product_id integer,
  holder_first_name text,
  holder_last_name text,
  holder_email text,
  holder_phone text,
  attendance_date date,
  vendor_application_id uuid REFERENCES vendor_applications(id) ON DELETE SET NULL,
  stall_code text,
  -- VERIFIED state (pre-event)
  verified_at timestamptz,
  verified_method text,
  verified_by_email text,
  verification_error text,
  -- CHECKED-IN state (day-of)
  checked_in_at timestamptz,
  checked_in_method text,
  checked_in_by_email text,
  -- Bookkeeping
  raw_meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (wc_order_id, fooevents_ticket_id)
);

CREATE INDEX IF NOT EXISTS idx_tv_wc_order    ON ticket_verifications (wc_order_id);
CREATE INDEX IF NOT EXISTS idx_tv_verified    ON ticket_verifications (verified_at)   WHERE verified_at   IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tv_checked_in  ON ticket_verifications (checked_in_at) WHERE checked_in_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tv_vendor      ON ticket_verifications (vendor_application_id);
CREATE INDEX IF NOT EXISTS idx_tv_phone       ON ticket_verifications (holder_phone);
CREATE INDEX IF NOT EXISTS idx_tv_email_lower ON ticket_verifications (lower(holder_email));

-- updated_at trigger (matches the vendor_applications pattern in supabase-schema.sql)
CREATE OR REPLACE FUNCTION ticket_verifications_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ticket_verifications_updated_at ON ticket_verifications;
CREATE TRIGGER ticket_verifications_updated_at
  BEFORE UPDATE ON ticket_verifications
  FOR EACH ROW EXECUTE FUNCTION ticket_verifications_set_updated_at();

-- RLS: service_role only. Anon + authed both blocked. The verifier admin UI
-- hits this via authed Next.js API routes that swap to the admin client.
ALTER TABLE ticket_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tv_service_role ON ticket_verifications;
CREATE POLICY tv_service_role
  ON ticket_verifications
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);

COMMIT;
