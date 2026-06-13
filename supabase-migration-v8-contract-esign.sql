-- supabase-migration-v8-contract-esign.sql
--
-- Adds the e-signature paper trail to vendor_applications so approved vendors
-- can sign the Vendor Contract 2026 from the exhibitor portal. Legal basis:
-- ZA Electronic Communications and Transactions Act 25 of 2002 §13. Audit
-- trail = signature image + UTC timestamp + IP + user-agent + the stored PDF.
--
-- All columns nullable: existing rows + non-approved applications stay valid.

alter table public.vendor_applications
  add column if not exists contract_signed_at  timestamptz,
  add column if not exists contract_signed_ip  text,
  add column if not exists contract_signed_ua  text,
  add column if not exists contract_pdf_path   text,   -- vendor-docs/signed-contracts/<id>.pdf
  add column if not exists contract_version    text;   -- 'cth-vendor-2026-v1'

-- A vendor profile in admin needs to find this fast.
create index if not exists idx_vendor_applications_contract_signed
  on public.vendor_applications (contract_signed_at)
  where contract_signed_at is not null;

-- Verify the column landed
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'vendor_applications'
  and column_name like 'contract_%'
order by column_name;
