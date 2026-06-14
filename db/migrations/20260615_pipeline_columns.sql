-- =====================================================
-- Migration: pipeline_columns (vendor_applications lifecycle)
-- Date: 2026-06-15
-- Adds the gate columns the dashboard + bulk-review queue need,
-- backfills approved_at from reviewed_at, indexes the hot paths.
-- Idempotent: every ALTER uses IF NOT EXISTS where Postgres supports it.
-- =====================================================

BEGIN;

-- Gate timestamps
ALTER TABLE vendor_applications ADD COLUMN IF NOT EXISTS approved_at      timestamptz;
ALTER TABLE vendor_applications ADD COLUMN IF NOT EXISTS paid_at          timestamptz;
ALTER TABLE vendor_applications ADD COLUMN IF NOT EXISTS docs_complete_at timestamptz;

-- Derived classification
ALTER TABLE vendor_applications ADD COLUMN IF NOT EXISTS sector             text;
ALTER TABLE vendor_applications ADD COLUMN IF NOT EXISTS completeness_score smallint;

-- Dedupe machinery (44 duplicate-phone rows surfaced today)
ALTER TABLE vendor_applications ADD COLUMN IF NOT EXISTS is_duplicate     boolean NOT NULL DEFAULT false;
ALTER TABLE vendor_applications ADD COLUMN IF NOT EXISTS duplicate_of_id  uuid;
ALTER TABLE vendor_applications ADD COLUMN IF NOT EXISTS superseded_at    timestamptz;

-- FK for dedupe pointer (only adds if not already there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'vendor_applications_duplicate_of_id_fkey'
  ) THEN
    ALTER TABLE vendor_applications
      ADD CONSTRAINT vendor_applications_duplicate_of_id_fkey
      FOREIGN KEY (duplicate_of_id) REFERENCES vendor_applications(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill approved_at = reviewed_at for the currently approved cohort
-- (4 rows today; safe to re-run since WHERE clause excludes already-set rows)
UPDATE vendor_applications
   SET approved_at = reviewed_at
 WHERE status = 'approved'
   AND approved_at IS NULL
   AND reviewed_at IS NOT NULL;

-- Hot-path indexes for the bulk-review queue + dashboard counters
CREATE INDEX IF NOT EXISTS idx_vendor_apps_status            ON vendor_applications (status);
CREATE INDEX IF NOT EXISTS idx_vendor_apps_status_created_at ON vendor_applications (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vendor_apps_approved_at       ON vendor_applications (approved_at DESC) WHERE approved_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_apps_paid_at           ON vendor_applications (paid_at DESC)     WHERE paid_at     IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_vendor_apps_sector            ON vendor_applications (sector);
CREATE INDEX IF NOT EXISTS idx_vendor_apps_is_duplicate      ON vendor_applications (is_duplicate) WHERE is_duplicate = true;

-- Phone last-9 functional index for the dupe-detection query path
CREATE INDEX IF NOT EXISTS idx_vendor_apps_phone_last9
  ON vendor_applications ((regexp_replace(phone, '\D', '', 'g')));

-- Audit trail: who set what gate when (for the bulk-review queue audit log)
CREATE TABLE IF NOT EXISTS vendor_application_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id  uuid NOT NULL REFERENCES vendor_applications(id) ON DELETE CASCADE,
  event_type      text NOT NULL,        -- 'reviewed' | 'approved' | 'rejected' | 'info_requested' | 'paid' | 'docs_complete' | 'stall_allocated' | 'contract_signed' | 'merged' | 'superseded' | 'tagged'
  before_value    jsonb,
  after_value     jsonb,
  actor_email     text,
  actor_role      text,                  -- 'operator' | 'admin' | 'system' | 'ai'
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vapp_events_application ON vendor_application_events (application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_vapp_events_type        ON vendor_application_events (event_type, created_at DESC);

COMMIT;

-- =====================================================
-- Sanity checks (run after commit, should all return rows / true)
-- =====================================================
-- SELECT count(*) FROM vendor_applications WHERE approved_at IS NOT NULL;  -- expect 4
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'vendor_applications'
--   AND column_name IN ('approved_at','paid_at','docs_complete_at','sector','completeness_score','is_duplicate','duplicate_of_id','superseded_at')
--   ORDER BY column_name;  -- expect 8 rows
-- SELECT to_regclass('vendor_application_events');  -- expect 'vendor_application_events'
