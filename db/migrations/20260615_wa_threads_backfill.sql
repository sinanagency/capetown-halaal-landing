-- 20260615_wa_threads_backfill.sql
-- Backfill wa_threads rows from wa_messages data.
--
-- Creates wa_threads for any wa_phone in wa_messages that does not yet have a
-- thread row. Also updates existing threads to sync unread_count, metadata
-- (handover state), and last_inbound_at / last_outbound_at from message history.
--
-- NOTE: The `tag` column has a check constraint that rejects all values.
-- Handover state is stored in metadata->>'handover' instead.
--
-- This is a safety-net migration: the webhook touchThread() function keeps
-- threads live in production, but this catches any phones that accumulated
-- messages before the thread table existed or during any outage period.

INSERT INTO wa_threads (
  wa_phone,
  metadata,
  unread_count,
  last_inbound_at,
  last_outbound_at,
  created_at,
  updated_at
)
SELECT
  m.wa_phone,
  jsonb_build_object('handover', 'bot') AS metadata,
  COALESCE(inb.c, 0) AS unread_count,
  inb.last_in AS last_inbound_at,
  outb.last_out AS last_outbound_at,
  LEAST(
    COALESCE(inb.first_msg, outb.first_msg, NOW()),
    COALESCE(outb.first_msg, inb.first_msg, NOW())
  ) AS created_at,
  GREATEST(
    COALESCE(inb.last_in, '1970-01-01'::timestamptz),
    COALESCE(outb.last_out, '1970-01-01'::timestamptz)
  ) AS updated_at
FROM (SELECT DISTINCT wa_phone FROM wa_messages) m
LEFT JOIN (
  SELECT
    wa_phone,
    COUNT(*) AS c,
    MAX(created_at) AS last_in,
    MIN(created_at) AS first_msg
  FROM wa_messages WHERE direction = 'in'
  GROUP BY wa_phone
) inb ON m.wa_phone = inb.wa_phone
LEFT JOIN (
  SELECT
    wa_phone,
    MAX(created_at) AS last_out,
    MIN(created_at) AS first_msg
  FROM wa_messages WHERE direction = 'out'
  GROUP BY wa_phone
) outb ON m.wa_phone = outb.wa_phone
ON CONFLICT (wa_phone) DO UPDATE SET
  metadata         = wa_threads.metadata || jsonb_build_object('handover', 'bot'),
  unread_count     = EXCLUDED.unread_count,
  last_inbound_at  = COALESCE(wa_threads.last_inbound_at, EXCLUDED.last_inbound_at),
  last_outbound_at = COALESCE(wa_threads.last_outbound_at, EXCLUDED.last_outbound_at),
  updated_at       = NOW();
