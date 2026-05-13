-- ===========================================================
-- DopRent — Add verified flag to boutiques (2026-05-13)
-- Run in Supabase SQL Editor. Safe to re-run.
-- ===========================================================

-- 1) Add column (default false; admin toggles after KYC)
alter table boutiques
  add column if not exists verified boolean not null default false;

create index if not exists idx_boutiques_verified on boutiques (verified);

-- 2) Auto-flip when KYC passes (optional convenience)
update boutiques
   set verified = true
 where kyc_status = 'verified'
   and verified = false;

-- 3) For pilot demo: mark featured boutiques as verified so checkmark shows up
--    Remove this block once real KYC starts flowing.
update boutiques
   set verified = true
 where featured = true
   and verified = false;
