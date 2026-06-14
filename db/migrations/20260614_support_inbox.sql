-- =====================================================
-- Migration: support_inbox (festival email support pipe)
-- Date: 2026-06-14
-- Scope: Stream-D — Email Support Inbox at /admin/support-inbox.
--
-- Why a SEPARATE table from wa_threads / mail_messages:
--   - wa_threads + mail_messages drive the unified Bot Inbox (vendor mail).
--   - support@youngatheart.co.za is festival-wide support traffic
--     (vendors, ticket buyers, partners, randoms). Mixing the two surfaces
--     in one inbox loses the operator's signal. Keep them apart, link by
--     foreign keys where useful.
--   - Operator workflow (Samreen) is different: tag → assign → snooze →
--     resolve, with vendor/ticket linkage rather than auto-bot reply.
--
-- Tables:
--   1. support_inbox_threads  — one row per peer email address.
--   2. support_inbox_messages — every inbound + outbound message.
--   3. support_canned_replies — Samreen's top-5 reply templates.
--
-- All policies are service-role-only + admin_users SELECT/UPDATE. The
-- admin app reads via /api routes that already enforce admin_users
-- membership.
-- =====================================================

-- ---------- support_inbox_threads ----------
CREATE TABLE IF NOT EXISTS support_inbox_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Identity: lower-cased peer email address.
  peer_email TEXT NOT NULL UNIQUE,
  peer_name  TEXT,

  -- Latest subject (denormalised for the thread-list preview).
  subject TEXT,

  -- Workflow
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'snoozed', 'resolved')),
  snoozed_until TIMESTAMPTZ,
  assignee_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Single tag per thread (operator picks one). Taxonomy is fixed but loose
  -- to allow future additions without an ALTER TYPE dance.
  tag TEXT CHECK (tag IS NULL OR tag IN (
    'payment', 'load-in', 'badges', 'contract', 'refund', 'general'
  )),

  -- Optional linkage (vendor application or ticket buyer).
  vendor_application_id UUID REFERENCES vendor_applications(id) ON DELETE SET NULL,
  ticket_buyer_id       UUID, -- references ticket_buyers.id, no FK so a missing
                              -- ticket_buyers table on stale envs does not break ddl.

  last_inbound_at  TIMESTAMPTZ,
  last_handled_at  TIMESTAMPTZ,
  unread_count     INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_support_threads_status
  ON support_inbox_threads (status);
CREATE INDEX IF NOT EXISTS idx_support_threads_assignee_status
  ON support_inbox_threads (assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_support_threads_last_inbound
  ON support_inbox_threads (last_inbound_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_threads_vendor
  ON support_inbox_threads (vendor_application_id);

DROP TRIGGER IF EXISTS support_inbox_threads_updated_at ON support_inbox_threads;
CREATE TRIGGER support_inbox_threads_updated_at
  BEFORE UPDATE ON support_inbox_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------- support_inbox_messages ----------
CREATE TABLE IF NOT EXISTS support_inbox_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  thread_id UUID NOT NULL REFERENCES support_inbox_threads(id) ON DELETE CASCADE,

  direction TEXT NOT NULL CHECK (direction IN ('in', 'out')),
  from_address TEXT NOT NULL,
  from_name    TEXT,
  to_address   TEXT NOT NULL,
  subject      TEXT,
  body_text    TEXT,
  body_html    TEXT,

  -- RFC822 Message-ID for idempotent inbound writes + threading.
  message_id   TEXT,
  in_reply_to  TEXT,

  -- Provider for outbound bookkeeping.
  provider               TEXT CHECK (provider IS NULL OR provider IN ('resend', 'smtp', 'imap', 'manual')),
  provider_message_id    TEXT,

  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_by     UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_support_message_id
  ON support_inbox_messages (message_id)
  WHERE message_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_support_messages_thread
  ON support_inbox_messages (thread_id, received_at DESC);

-- ---------- support_canned_replies ----------
CREATE TABLE IF NOT EXISTS support_canned_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  slug TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 100
);

INSERT INTO support_canned_replies (slug, label, subject, body, sort_order) VALUES
  ('payment-receipt',
   'Payment receipt resend',
   'Your Young at Heart payment receipt',
   E'Hi,\n\nThanks for your patience. Attached / below is your payment receipt for Young at Heart 2026. If anything looks wrong, hit reply and we will sort it.\n\nWarm regards,\nYoung at Heart Festival',
   1),
  ('load-in-instructions',
   'Load-in instructions',
   'Load-in instructions, Young at Heart 2026',
   E'Hi,\n\nHere are your load-in instructions for Young at Heart at Youngsfield Military Base. Arrive at Gate 2, bring your stall code, photo ID, and the vehicle registration you registered with us. Load-in opens at the time on your contract. Security will direct you from the gate.\n\nIf you need anything on the day, WhatsApp Samreen.\n\nWarm regards,\nYoung at Heart Festival',
   2),
  ('badge-collection',
   'Badge collection',
   'Badge collection, Young at Heart 2026',
   E'Hi,\n\nYour badges are ready for collection at the festival office during load-in hours. Bring photo ID. Each badge is named, please do not swap.\n\nWarm regards,\nYoung at Heart Festival',
   3),
  ('contract-questions',
   'Contract questions',
   'Re: your contract, Young at Heart 2026',
   E'Hi,\n\nThanks for the question on the contract. The signed PDF in your vendor portal is the canonical copy. If a clause needs revisiting, reply with the specific section and we will respond.\n\nWarm regards,\nYoung at Heart Festival',
   4),
  ('refund-policy',
   'Refund policy',
   'Re: refund policy, Young at Heart 2026',
   E'Hi,\n\nOur refund policy is in your contract under the cancellations section. Short version: cancellations before the date in your contract are refundable minus processing fees, after that date deposits are non-refundable. If your situation is exceptional, share the details and we will look at it case by case.\n\nWarm regards,\nYoung at Heart Festival',
   5)
ON CONFLICT (slug) DO UPDATE SET
  label = EXCLUDED.label,
  subject = EXCLUDED.subject,
  body = EXCLUDED.body,
  sort_order = EXCLUDED.sort_order;

-- ---------- RLS ----------
ALTER TABLE support_inbox_threads  ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_canned_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service role manages support_inbox_threads"  ON support_inbox_threads;
CREATE POLICY "service role manages support_inbox_threads"
  ON support_inbox_threads FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role manages support_inbox_messages" ON support_inbox_messages;
CREATE POLICY "service role manages support_inbox_messages"
  ON support_inbox_messages FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "service role manages support_canned_replies" ON support_canned_replies;
CREATE POLICY "service role manages support_canned_replies"
  ON support_canned_replies FOR ALL
  USING (auth.role() = 'service_role') WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "admins read support_inbox_threads" ON support_inbox_threads;
CREATE POLICY "admins read support_inbox_threads"
  ON support_inbox_threads FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

DROP POLICY IF EXISTS "admins update support_inbox_threads" ON support_inbox_threads;
CREATE POLICY "admins update support_inbox_threads"
  ON support_inbox_threads FOR UPDATE
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

DROP POLICY IF EXISTS "admins read support_inbox_messages" ON support_inbox_messages;
CREATE POLICY "admins read support_inbox_messages"
  ON support_inbox_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

DROP POLICY IF EXISTS "admins read support_canned_replies" ON support_canned_replies;
CREATE POLICY "admins read support_canned_replies"
  ON support_canned_replies FOR SELECT
  USING (EXISTS (SELECT 1 FROM admin_users WHERE admin_users.id = auth.uid()));

-- =====================================================
-- wa_threads — additive columns for bot-inbox tools.
-- Adds Tag + vendor/ticket linkage that the Bot Inbox header tools write.
-- Tag taxonomy mirrors support_inbox_threads.tag for consistency.
-- =====================================================
ALTER TABLE wa_threads
  ADD COLUMN IF NOT EXISTS tag TEXT
    CHECK (tag IS NULL OR tag IN ('payment', 'load-in', 'badges', 'contract', 'refund', 'general')),
  ADD COLUMN IF NOT EXISTS vendor_application_id UUID
    REFERENCES vendor_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ticket_buyer_email TEXT;

CREATE INDEX IF NOT EXISTS idx_wa_threads_tag ON wa_threads (tag);
CREATE INDEX IF NOT EXISTS idx_wa_threads_vendor ON wa_threads (vendor_application_id);
