-- ===========================================================
-- DopRent — Dress availability blackouts (2026-05-13)
-- One row per (dress, unavailable_date). Renter date picker reads this
-- to disable selection. Seller marks dates from /sell/dresses/[id]/calendar.
-- Safe to re-run.
-- ===========================================================

create table if not exists dress_blackouts (
  dress_id   uuid not null references dresses(id) on delete cascade,
  date       date not null,
  created_at timestamptz default now(),
  primary key (dress_id, date)
);

create index if not exists idx_blackouts_dress on dress_blackouts (dress_id);
create index if not exists idx_blackouts_date on dress_blackouts (date);

alter table dress_blackouts enable row level security;

-- Anyone can read blackouts (renter needs to know which dates are taken)
drop policy if exists "blackouts_public_read" on dress_blackouts;
create policy "blackouts_public_read" on dress_blackouts
  for select using (true);

-- Only the boutique owner (or admin) can write blackouts for their dresses
drop policy if exists "blackouts_owner_insert" on dress_blackouts;
create policy "blackouts_owner_insert" on dress_blackouts
  for insert with check (
    exists (
      select 1 from dresses d
        join boutiques b on b.id = d.boutique_id
       where d.id = dress_blackouts.dress_id
         and (b.owner_id = auth.uid() or is_admin())
    )
  );

drop policy if exists "blackouts_owner_delete" on dress_blackouts;
create policy "blackouts_owner_delete" on dress_blackouts
  for delete using (
    exists (
      select 1 from dresses d
        join boutiques b on b.id = d.boutique_id
       where d.id = dress_blackouts.dress_id
         and (b.owner_id = auth.uid() or is_admin())
    )
  );
