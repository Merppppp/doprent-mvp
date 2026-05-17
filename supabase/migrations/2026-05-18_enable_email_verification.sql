-- ===========================================================
-- DopRent — Enable email verification (2026-05-18)
--
-- Two parts:
--
-- 1) Auto-verify all existing users (pilot accounts). When email
--    confirmation is flipped ON in Supabase Auth settings, any user
--    whose email_confirmed_at is null is locked out at login. This
--    migration backfills email_confirmed_at for everyone created
--    during the pre-verification pilot so their next login still works.
--
-- 2) Reminder note for the manual config step. The migration alone
--    is NOT enough — Prem must also flip the toggle in:
--
--      Supabase Dashboard → Authentication → Providers → Email
--        → "Confirm email" → ON
--
--    Run order:
--      a. Run this migration FIRST in the SQL Editor.
--      b. Then flip the toggle.
--      c. New signups from that point on receive a confirmation
--         email and cannot login until they click the link.
--
-- Safe to re-run. The update only touches rows where the column
-- is currently null, so it's idempotent.
-- ===========================================================

update auth.users
   set email_confirmed_at = coalesce(email_confirmed_at, now())
 where email_confirmed_at is null;

-- Report how many rows were affected, for the SQL Editor output.
do $$
declare
  n_unconfirmed int;
begin
  select count(*) into n_unconfirmed
    from auth.users
   where email_confirmed_at is null;
  if n_unconfirmed = 0 then
    raise notice 'OK: all existing users have email_confirmed_at set. Safe to enable email confirmation in Supabase Auth settings.';
  else
    raise warning 'Still % users without email_confirmed_at — they will be locked out at login if you enable email confirmation now.', n_unconfirmed;
  end if;
end $$;
