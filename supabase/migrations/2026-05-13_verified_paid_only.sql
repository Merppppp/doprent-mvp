-- ===========================================================
-- DopRent — Verified badge is paid-only (2026-05-13)
-- Free-tier sellers no longer get ✓ verified badge after KYC.
-- This SQL clears the demo data flips so badge state matches new logic.
-- Safe to re-run.
-- ===========================================================

-- Clear verified for any boutique that doesn't have an APPROVED Boost/Featured KYC.
-- This rolls back demo-data verified=true on seeded boutiques while preserving
-- verified state for any boutique that legitimately passed paid-plan KYC.
update boutiques b
   set verified = false,
       updated_at = now()
 where b.verified = true
   and not exists (
     select 1 from kyc_submissions k
      where k.boutique_id = b.id
        and k.status = 'approved'
        and k.plan in ('Boost', 'Featured')
   );
