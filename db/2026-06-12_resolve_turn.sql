-- CTH: one shot identity + history resolver (Architecture 2 efficiency,
-- 2026-06-12). OPTIONAL: the code ships without depending on this; apply it
-- and switch resolveIdentity/recentHistory to a single rpc when ready.
--
-- ⚠ VERIFY COLUMN NAMES against the live schema before applying: vendor and
-- buyer phone columns below were inferred from src/lib/bot/identity.ts.

create or replace function cth_resolve_turn(p_e164 text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'vendor', (
      select to_jsonb(v) from vendor_applications v
      where v.phone = p_e164 or v.whatsapp = p_e164
      order by v.created_at desc limit 1
    ),
    'buyer', (
      select to_jsonb(b) from ticket_buyers b
      where b.phone = p_e164
      order by b.created_at desc limit 1
    ),
    'contact', (
      select to_jsonb(c) from wa_contacts c
      where c.wa_phone = p_e164 limit 1
    ),
    'recent_messages', coalesce((
      select jsonb_agg(jsonb_build_object('direction', direction, 'body', body) order by created_at desc)
      from (
        select direction, body, created_at from wa_messages
        where wa_phone = p_e164 and body is not null
        order by created_at desc limit 8
      ) m
    ), '[]'::jsonb)
  );
$$;
