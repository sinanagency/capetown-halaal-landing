-- =============================================================================
-- 20260615_rls_enforce.sql
-- Pentest F6 fix: ENABLE Row Level Security on PII tables that V13 staged
-- policies for but never actually toggled `rowsecurity = true`.
--
-- Probe evidence (scripts/rls-probe.mjs, 2026-06-15):
--   wa_messages              LEAKS 172 rows via anon key  -- P0
--   wa_threads               LEAKS 13  rows via anon key  -- P0
--   site_events              LEAKS 7839 rows via anon key -- P0
--   vendor_application_events  open-empty (would leak when populated)
--   mail_messages              open-empty (would leak when populated)
--   mail_optout                open-empty (would leak when populated)
--
-- Service role bypasses RLS by default, so all existing /api/* server code that
-- uses SUPABASE_SERVICE_ROLE_KEY keeps working unchanged. What this migration
-- BLOCKS is direct anon-key SELECTs from the browser / curl with the public
-- anon JWT (the actual leak path F6 found).
--
-- Idempotent: re-running is a no-op. Each ALTER TABLE ... ENABLE ROW LEVEL
-- SECURITY is wrapped in a DO block that checks pg_tables.rowsecurity first.
-- Each CREATE POLICY is preceded by DROP POLICY IF EXISTS.
--
-- Manual run only (CTH Supabase lives on a separate account, no Vercel-side
-- DDL). Paste into the Supabase SQL editor under the dtdqopjdxwfvtyrnygdt
-- project, click Run, then re-run scripts/rls-probe.mjs to verify.
-- =============================================================================

BEGIN;

-- ---------- helper: idempotent RLS enable ----------
-- pg_tables.rowsecurity flips to true once ALTER TABLE ... ENABLE RLS runs.
-- Re-running ALTER TABLE ENABLE RLS is itself idempotent in Postgres 15+, but
-- the DO guard documents intent and stays safe on older versions.

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='wa_messages') THEN
    EXECUTE 'ALTER TABLE public.wa_messages ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='wa_threads') THEN
    EXECUTE 'ALTER TABLE public.wa_threads ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='site_events') THEN
    EXECUTE 'ALTER TABLE public.site_events ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='vendor_application_events') THEN
    EXECUTE 'ALTER TABLE public.vendor_application_events ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='mail_messages') THEN
    EXECUTE 'ALTER TABLE public.mail_messages ENABLE ROW LEVEL SECURITY';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public' AND tablename='mail_optout') THEN
    EXECUTE 'ALTER TABLE public.mail_optout ENABLE ROW LEVEL SECURITY';
  END IF;
END$$;

-- ---------- service-role full-access policies ----------
-- service_role bypasses RLS by default in Supabase, but adding an explicit
-- policy for `service_role` is belt-and-braces in case someone removes the
-- bypass grant. Authenticated admin reads still go through is_admin() — see
-- v13 — these new policies coexist with the v13 ones (different names).

-- wa_messages
DROP POLICY IF EXISTS "wa_messages service_role all" ON public.wa_messages;
CREATE POLICY "wa_messages service_role all"
  ON public.wa_messages FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- wa_threads (v13 already created admin policies; this is just the
-- service_role belt for parity).
DROP POLICY IF EXISTS "wa_threads service_role all" ON public.wa_threads;
CREATE POLICY "wa_threads service_role all"
  ON public.wa_threads FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- site_events
-- Public site code POSTs to /api/analytics, which writes via service role.
-- Anon key must never read these rows back; the dashboards read server-side.
DROP POLICY IF EXISTS "site_events service_role all" ON public.site_events;
CREATE POLICY "site_events service_role all"
  ON public.site_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- vendor_application_events
DROP POLICY IF EXISTS "vendor_application_events service_role all" ON public.vendor_application_events;
CREATE POLICY "vendor_application_events service_role all"
  ON public.vendor_application_events FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- mail_messages (v13 already created admin policies; service belt added)
DROP POLICY IF EXISTS "mail_messages service_role all" ON public.mail_messages;
CREATE POLICY "mail_messages service_role all"
  ON public.mail_messages FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- mail_optout
DROP POLICY IF EXISTS "mail_optout service_role all" ON public.mail_optout;
CREATE POLICY "mail_optout service_role all"
  ON public.mail_optout FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- ---------- explicit deny for anon ----------
-- With RLS enabled and no policy granting SELECT to the anon role, anon
-- selects already return zero rows. We do NOT add a "deny anon" policy
-- because Postgres RLS is positive (rows must be explicitly granted), so the
-- absence of an anon policy IS the deny.

-- ---------- verification queries (informational, no side effects) ----------
-- These SELECTs will appear in the SQL editor result pane after the migration
-- runs. Copy them to confirm the enable took.
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname='public'
  AND tablename IN (
    'wa_messages',
    'wa_threads',
    'site_events',
    'vendor_application_events',
    'mail_messages',
    'mail_optout'
  )
ORDER BY tablename;

SELECT tablename, COUNT(polname) AS policy_count
FROM pg_tables t
LEFT JOIN pg_policy p ON p.polrelid = (t.schemaname || '.' || t.tablename)::regclass
WHERE t.schemaname='public'
  AND t.tablename IN (
    'wa_messages',
    'wa_threads',
    'site_events',
    'vendor_application_events',
    'mail_messages',
    'mail_optout'
  )
GROUP BY tablename
ORDER BY tablename;

COMMIT;

-- =============================================================================
-- POST-RUN VERIFY (run from your shell after applying):
--   node scripts/rls-probe.mjs
-- Expected delta for the 6 tables above:
--   ANON_PROBE column flips from LEAKS / OPEN-EMPTY to BLOCKED (good).
-- =============================================================================

-- =============================================================================
-- KNOWN SEPARATE BUG (NOT FIXED HERE):
--   vendor_applications, admin_users, support_inbox_threads, support_inbox_messages
--   currently throw `42P17 infinite recursion detected in policy for relation
--   "admin_users"` on any non-service-role select. This means the admin portal
--   cannot read these tables via authenticated JWT. Triage in a follow-up:
--   either v13's is_admin() helper was never applied, or the function owner
--   lacks BYPASSRLS. File as F6-followup.
-- =============================================================================
