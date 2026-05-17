-- ===========================================================
-- DopRent — Boutique address privacy (2026-05-18)
--
-- Goal: stop the anon role from being able to read sensitive
-- location columns of boutiques via the public Supabase REST API.
--
-- Before this migration, the JS bundle ships with the anon key
-- (necessarily public for client-side reads). Anyone could call:
--   GET /rest/v1/boutiques?status=eq.live&select=name,address,lat,lng
-- ...and get every boutique's exact street address + GPS coords.
-- The RLS public_read policy gates ROWS (status='live'), but not
-- COLUMNS — Postgres RLS is row-level by design.
--
-- The fix here is column-level GRANT: anon can only SELECT a
-- listed allowlist of columns. Trying to read address/lat/lng
-- returns a 403 even with a valid anon key.
--
-- KNOWN LIMITATION (deferred to Round 2): authenticated users
-- (anyone who signed up) still have full SELECT on boutiques,
-- so a determined attacker could create an account and enumerate
-- addresses via direct REST. Fixing this properly requires moving
-- sensitive columns to a separate table (boutique_private_info)
-- with its own RLS that restricts to owner + admin. See follow-up
-- ticket. For Round 1 we close the most-likely attack surface
-- (unauthenticated bulk scraping with the anon key).
--
-- Safe to re-run.
-- ===========================================================

-- 1) Revoke the blanket SELECT from anon. Without this, the GRANT
--    below has no restrictive effect — anon already has SELECT *.
revoke select on boutiques from anon;

-- 2) Grant SELECT only on the public-safe column allowlist to anon.
--    Sensitive columns (address, lat, lng, house_no, street,
--    subdistrict, postal_code, reject_reason) are intentionally
--    OMITTED. Anon attempting `SELECT address FROM boutiques`
--    will receive: permission denied for column address.
grant select (
  id,
  slug,
  name,
  owner_id,
  owner_name,
  area_key,
  area_label,
  hours,
  line_url,
  instagram,
  since_year,
  cover_color,
  tag,
  story,
  featured,
  ads_tier,
  status,
  kyc_status,
  verified,
  district,    -- broad district (e.g. "วัฒนา") — safe to expose
  province,    -- always "กรุงเทพมหานคร"
  created_at,
  updated_at
) on boutiques to anon;

-- 3) Authenticated role keeps full SELECT (Supabase default).
--    Owner reads their own boutique's address via /sell/edit;
--    admin reads any address via /admin/boutiques. RLS still
--    gates which ROWS each user can see.
--
--    See note above about Round 2 hardening for authenticated
--    non-owners.

-- 4) Sanity check — confirm the columns we granted actually exist.
--    If any column was renamed, this errors immediately rather
--    than producing a half-applied state.
do $$
begin
  perform 1 from information_schema.columns
   where table_schema = 'public'
     and table_name = 'boutiques'
     and column_name = 'district';
  if not found then
    raise exception 'boutique address privacy migration: expected column district missing. Run 2026-05-13_address_columns.sql first.';
  end if;
end $$;
