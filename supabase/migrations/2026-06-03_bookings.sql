-- ===========================================================
-- DopRent — Bookings + Addresses (Phase 1: core happy path)  2026-06-03
-- Self-serve in-web booking: จองเลย → เลือกที่อยู่ → ร้านคิดค่าส่ง+รับจอง
--   → จ่าย QR PromptPay + อัปสลิป → ร้านยืนยันสลิป → confirmed.
-- All writes go through the user's session (anon key + RLS) — there is NO
-- service-role client — so RLS + a transition-guard trigger ARE the security
-- boundary, not just the server actions.
-- Idempotent / safe to re-run.
-- Phase 2 (NOT here): date-lock exclusion constraint, auto-expire cron,
--   admin dispute review UI, LINE OA push.
-- ===========================================================

-- ---------- 1) Delivery addresses (Shopee-style address book) ----------
create table if not exists addresses (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references profiles(id) on delete cascade,
  recipient_name text not null,
  phone          text not null,
  address_text   text not null,
  is_default     boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists idx_addresses_user on addresses (user_id);

alter table addresses enable row level security;

drop policy if exists "addresses_owner_select" on addresses;
create policy "addresses_owner_select" on addresses
  for select using (user_id = auth.uid() or is_admin());

drop policy if exists "addresses_owner_insert" on addresses;
create policy "addresses_owner_insert" on addresses
  for insert with check (user_id = auth.uid());

drop policy if exists "addresses_owner_update" on addresses;
create policy "addresses_owner_update" on addresses
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "addresses_owner_delete" on addresses;
create policy "addresses_owner_delete" on addresses
  for delete using (user_id = auth.uid());

-- ---------- 2) PromptPay id on boutiques (for QR gen) ----------
alter table boutiques
  add column if not exists promptpay_id text;

-- ---------- 3) Bookings ----------
create table if not exists bookings (
  id                uuid primary key default gen_random_uuid(),
  renter_id         uuid not null references profiles(id) on delete cascade,
  boutique_id       uuid not null references boutiques(id) on delete cascade,
  dress_id          uuid not null references dresses(id) on delete cascade,
  start_date        date not null,
  end_date          date not null,
  -- price snapshot at booking time (THB, integer baht)
  rental_total      int  not null,
  deposit           int  not null default 0,
  shipping_fee      int,                       -- null until seller sets it on accept
  status            text not null default 'booking_pending',
  slip_path         text,                      -- payment-slips/{booking_id}/...
  -- delivery address snapshot (kept even if the user later edits their address)
  address_id        uuid references addresses(id) on delete set null,
  recipient_name    text,
  phone             text,
  address_text      text,
  -- lifecycle / moderation
  current_due_at    timestamptz,               -- 24h payment window (Phase 2 cron)
  cancel_reason     text,
  cancel_from_status text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint bookings_dates_chk check (end_date >= start_date),
  constraint bookings_status_chk check (status in (
    'booking_pending',
    'waiting_for_payment',
    'payment_review',
    'confirmed',
    'cancel_requested',
    'slip_disputed',
    'rejected',
    'cancelled',
    'payment_expired'
  ))
);
create index if not exists idx_bookings_renter   on bookings (renter_id);
create index if not exists idx_bookings_boutique on bookings (boutique_id);
create index if not exists idx_bookings_dress    on bookings (dress_id);
create index if not exists idx_bookings_status   on bookings (status);

alter table bookings enable row level security;

-- helper: does the current user own the boutique on this booking row?
create or replace function owns_booking_boutique(b_boutique_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from boutiques b
    where b.id = b_boutique_id and b.owner_id = auth.uid()
  );
$$;

-- SELECT: renter, the boutique's seller, or admin
drop policy if exists "bookings_party_select" on bookings;
create policy "bookings_party_select" on bookings
  for select using (
    renter_id = auth.uid()
    or owns_booking_boutique(boutique_id)
    or is_admin()
  );

-- INSERT: only the renter, only as a fresh 'booking_pending' request
drop policy if exists "bookings_renter_insert" on bookings;
create policy "bookings_renter_insert" on bookings
  for insert with check (
    renter_id = auth.uid()
    and status = 'booking_pending'
  );

-- UPDATE: any party on the row (renter / seller / admin). WHICH status moves
-- are legal is enforced by the BEFORE UPDATE trigger below — RLS WITH CHECK
-- can't see OLD vs NEW, so ownership is gated here and transitions in the trigger.
drop policy if exists "bookings_party_update" on bookings;
create policy "bookings_party_update" on bookings
  for update using (
    renter_id = auth.uid()
    or owns_booking_boutique(boutique_id)
    or is_admin()
  ) with check (
    renter_id = auth.uid()
    or owns_booking_boutique(boutique_id)
    or is_admin()
  );
-- (no DELETE policy — bookings are never hard-deleted; use cancelled/rejected)

-- ---------- 4) Transition guard (the real security boundary) ----------
-- Validates the (old.status -> new.status) move against the actor's role.
-- Admin may move anywhere. Anyone may leave status unchanged (metadata edits).
create or replace function enforce_booking_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_renter boolean := old.renter_id = auth.uid();
  is_seller boolean := owns_booking_boutique(old.boutique_id);
  ok boolean := false;
begin
  -- admin override (cron/expiry runs as admin in Phase 1)
  if is_admin() then
    return new;
  end if;

  -- no status change → allow (e.g. unrelated field edit by a party)
  if new.status = old.status then
    return new;
  end if;

  -- renter-initiated moves
  if is_renter then
    if old.status = 'booking_pending'      and new.status = 'cancelled'        then ok := true; end if;
    if old.status = 'waiting_for_payment'  and new.status = 'cancelled'        then ok := true; end if;
    -- pay + upload slip: must attach a slip
    if old.status = 'waiting_for_payment'  and new.status = 'payment_review'
       and new.slip_path is not null then ok := true; end if;
  end if;

  -- seller-initiated moves
  if is_seller then
    -- accept: must set a shipping fee first
    if old.status = 'booking_pending'      and new.status = 'waiting_for_payment'
       and new.shipping_fee is not null then ok := true; end if;
    if old.status = 'booking_pending'      and new.status = 'rejected'          then ok := true; end if;
    if old.status = 'payment_review'       and new.status = 'confirmed'         then ok := true; end if;
    if old.status = 'payment_review'       and new.status = 'slip_disputed'     then ok := true; end if;
    if old.status in ('payment_review','confirmed')
                                           and new.status = 'cancel_requested'  then ok := true; end if;
  end if;

  if not ok then
    raise exception 'illegal booking transition % -> % for this role', old.status, new.status
      using errcode = 'check_violation';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_enforce_booking_transition on bookings;
create trigger trg_enforce_booking_transition
  before update on bookings
  for each row execute function enforce_booking_transition();

-- ---------- 5) Private storage bucket for payment slips ----------
insert into storage.buckets (id, name, public)
  values ('payment-slips', 'payment-slips', false)
  on conflict (id) do nothing;

-- Upload: the renter on the booking, into a folder named by the booking id.
drop policy if exists "slips_renter_upload" on storage.objects;
create policy "slips_renter_upload" on storage.objects
  for insert with check (
    bucket_id = 'payment-slips'
    and exists (
      select 1 from bookings bk
      where bk.id::text = (storage.foldername(name))[1]
        and bk.renter_id = auth.uid()
    )
  );

-- Read: the renter, the boutique's seller, or admin.
drop policy if exists "slips_party_read" on storage.objects;
create policy "slips_party_read" on storage.objects
  for select using (
    bucket_id = 'payment-slips'
    and (
      is_admin()
      or exists (
        select 1 from bookings bk
        where bk.id::text = (storage.foldername(name))[1]
          and (bk.renter_id = auth.uid() or owns_booking_boutique(bk.boutique_id))
      )
    )
  );

-- Delete: the renter (re-upload before review) or admin.
drop policy if exists "slips_renter_delete" on storage.objects;
create policy "slips_renter_delete" on storage.objects
  for delete using (
    bucket_id = 'payment-slips'
    and (
      is_admin()
      or exists (
        select 1 from bookings bk
        where bk.id::text = (storage.foldername(name))[1]
          and bk.renter_id = auth.uid()
      )
    )
  );
