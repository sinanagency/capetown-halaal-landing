-- =====================================================
-- Cape Town Halaal Expo - Database Schema
-- Run this in Supabase SQL Editor (supabase.com → SQL)
-- =====================================================

-- Vendor Applications Table
CREATE TABLE vendor_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Business Info
  business_name TEXT NOT NULL,
  business_description TEXT,
  product_categories TEXT[] DEFAULT '{}',
  website TEXT,
  instagram TEXT,
  facebook TEXT,

  -- Contact Info
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,

  -- Booth Preference
  preferred_booth_tier TEXT,
  special_requirements TEXT,

  -- Application Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'info_requested')),
  admin_notes TEXT,
  reviewed_at TIMESTAMPTZ
);

-- Admin Users Table (links to Supabase Auth)
CREATE TABLE admin_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER vendor_applications_updated_at
  BEFORE UPDATE ON vendor_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)
ALTER TABLE vendor_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- Public can INSERT applications (vendor registration)
CREATE POLICY "Anyone can create applications"
  ON vendor_applications
  FOR INSERT
  WITH CHECK (true);

-- Only admins can SELECT/UPDATE applications
CREATE POLICY "Admins can view applications"
  ON vendor_applications
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

CREATE POLICY "Admins can update applications"
  ON vendor_applications
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Admin users table policies
CREATE POLICY "Admins can view admin list"
  ON admin_users
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_users
      WHERE admin_users.id = auth.uid()
    )
  );

-- Create indexes for common queries
CREATE INDEX idx_applications_status ON vendor_applications(status);
CREATE INDEX idx_applications_created ON vendor_applications(created_at DESC);
CREATE INDEX idx_applications_email ON vendor_applications(email);

-- =====================================================
-- AFTER RUNNING THIS, ADD SAMREEN AS ADMIN:
-- 1. Have her sign up at /admin/login
-- 2. Get her user ID from Supabase Auth dashboard
-- 3. Run: INSERT INTO admin_users (id, email, name)
--         VALUES ('her-user-id', 'samreen@email.com', 'Samreen');
-- =====================================================
