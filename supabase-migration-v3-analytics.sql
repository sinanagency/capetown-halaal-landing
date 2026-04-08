-- =====================================================
-- Analytics Tables — Migration v3
-- Run in Supabase SQL Editor
-- =====================================================

-- Page Views: every page load
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Session
  session_id TEXT NOT NULL,

  -- Page
  path TEXT NOT NULL,
  referrer TEXT,

  -- Visitor
  country TEXT,
  city TEXT,
  region TEXT,

  -- Device
  device_type TEXT, -- mobile, tablet, desktop
  browser TEXT,
  os TEXT,

  -- UTM
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT
);

-- Site Events: specific user actions
CREATE TABLE site_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  -- Event types:
  -- page_view, apply_start, apply_submit,
  -- checkout_start, checkout_complete, payment_failed,
  -- ticket_select, chat_open, chat_message

  path TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_events ENABLE ROW LEVEL SECURITY;

-- Service role can insert (from API route)
CREATE POLICY "Service role full access on page_views"
  ON page_views FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Service role full access on site_events"
  ON site_events FOR ALL
  USING (true)
  WITH CHECK (true);

-- Indexes for fast queries
CREATE INDEX idx_page_views_created ON page_views(created_at DESC);
CREATE INDEX idx_page_views_session ON page_views(session_id);
CREATE INDEX idx_page_views_path ON page_views(path);
CREATE INDEX idx_page_views_country ON page_views(country);
CREATE INDEX idx_site_events_created ON site_events(created_at DESC);
CREATE INDEX idx_site_events_type ON site_events(event_type);
CREATE INDEX idx_site_events_session ON site_events(session_id);
