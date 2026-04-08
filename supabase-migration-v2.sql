-- =====================================================
-- Migration V2: Ticket Buyers + Vendor OTP
-- Run in Supabase SQL Editor
-- =====================================================

-- Ticket Buyers Table (auto-created on email entry)
CREATE TABLE IF NOT EXISTS ticket_buyers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_purchase_at TIMESTAMPTZ,
  total_spent DECIMAL(10,2) DEFAULT 0,
  ticket_count INTEGER DEFAULT 0
);

ALTER TABLE ticket_buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage buyers"
  ON ticket_buyers FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_buyers_email ON ticket_buyers(email);

-- Vendor OTP Table (temporary passwords for approved vendors)
CREATE TABLE IF NOT EXISTS vendor_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID REFERENCES vendor_applications(id),
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE vendor_otps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage OTPs"
  ON vendor_otps FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE INDEX idx_otps_email ON vendor_otps(email);
CREATE INDEX idx_otps_expires ON vendor_otps(expires_at);
