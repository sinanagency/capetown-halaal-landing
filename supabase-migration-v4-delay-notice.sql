-- =====================================================
-- Migration v4: Delay Notice Tracking
-- Run this in Supabase SQL Editor
-- =====================================================

ALTER TABLE vendor_applications
  ADD COLUMN IF NOT EXISTS delay_notice_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_applications_delay_notice
  ON vendor_applications(delay_notice_sent_at)
  WHERE delay_notice_sent_at IS NULL;
