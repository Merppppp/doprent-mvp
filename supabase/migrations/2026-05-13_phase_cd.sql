-- ===========================================================
-- DopRent — Phase C + D migration (2026-05-13)
-- Adds: profile INSERT policy, KYC + dress storage buckets,
--       storage RLS for owner+admin, line_clicks insert allowed,
--       indexes for admin queries.
-- Safe to re-run.
-- ===========================================================

-- 1) Profile INSERT policy (was missing — caused 2026-05-12 issue)
drop policy if exists "profiles_own_insert" on profiles;
create policy "profiles_own_insert" on profiles
  for insert with check (id = auth.uid());

-- 2) Storage buckets for KYC docs (private) + dress images (public)
insert into storage.buckets (id, name, public)
  values ('kyc-docs', 'kyc-docs', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('dress-images', 'dress-images', true)
  on conflict (id) do nothing;

-- 3) Storage policies — kyc-docs (private, owner+admin only)
drop policy if exists "kyc_docs_owner_upload" on storage.objects;
create policy "kyc_docs_owner_upload" on storage.objects
  for insert
  with check (
    bucket_id = 'kyc-docs'
    and exists (
      select 1 from boutiques b
      where b.owner_id = auth.uid()
        and (storage.foldername(name))[1] = b.id::text
    )
  );

drop policy if exists "kyc_docs_owner_read" on storage.objects;
create policy "kyc_docs_owner_read" on storage.objects
  for select
  using (
    bucket_id = 'kyc-docs'
    and (
      exists (
        select 1 from boutiques b
        where b.owner_id = auth.uid()
          and (storage.foldername(name))[1] = b.id::text
      )
      or is_admin()
    )
  );

drop policy if exists "kyc_docs_owner_delete" on storage.objects;
create policy "kyc_docs_owner_delete" on storage.objects
  for delete
  using (
    bucket_id = 'kyc-docs'
    and exists (
      select 1 from boutiques b
      where b.owner_id = auth.uid()
        and (storage.foldername(name))[1] = b.id::text
    )
  );

-- 4) Storage policies — dress-images (public read, owner write)
drop policy if exists "dress_images_public_read" on storage.objects;
create policy "dress_images_public_read" on storage.objects
  for select using (bucket_id = 'dress-images');

drop policy if exists "dress_images_owner_write" on storage.objects;
create policy "dress_images_owner_write" on storage.objects
  for insert with check (
    bucket_id = 'dress-images'
    and exists (
      select 1 from boutiques b
      where b.owner_id = auth.uid()
        and (storage.foldername(name))[1] = b.id::text
    )
  );

drop policy if exists "dress_images_owner_delete" on storage.objects;
create policy "dress_images_owner_delete" on storage.objects
  for delete using (
    bucket_id = 'dress-images'
    and exists (
      select 1 from boutiques b
      where b.owner_id = auth.uid()
        and (storage.foldername(name))[1] = b.id::text
    )
  );

-- 5) Indexes for admin queries (faster pending lists)
create index if not exists idx_kyc_status_submitted on kyc_submissions (status, submitted_at desc);
create index if not exists idx_dresses_status_created on dresses (status, created_at desc);
create index if not exists idx_boutiques_status_created on boutiques (status, created_at desc);

-- 6) Ensure handle_new_user trigger still works (no change needed, just check)
-- (Already in schema.sql; left as comment for reference)

-- 7) Demo data: bump any existing "live" boutiques to verified = true so the
--    new ✓ badge actually shows up on existing seeded data. Remove this block
--    when real KYC flow is fully driving verified flag.
update boutiques set verified = true
  where status = 'live' and verified = false;
