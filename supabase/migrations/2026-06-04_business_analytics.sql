-- 2026-06-04_business_analytics.sql
-- Business analytics & revenue instrumentation.
--
-- Adds everything needed to measure the business metrics asked for:
--   (a) traffic source / channel attribution (first-touch)
--   (b) visitor / pageview count per day-hour
--   (c) geographic province of visitors (edge geo, approximate)
--   (d) MAU + registration count + recency (last_active_at)
--   (e) bookings per day + by product category (occasion)
--   (f) subscription adoption rate -> revenue (seller_subscriptions)
--   (g) booking conversion rate + commission for revenue forecast
--
-- Apply MANUALLY via the Supabase SQL Editor (no migration runner).
-- See DEPLOY_2026-06-04.md.

begin;

-- ============================================================
-- 1) PROFILES — signup attribution + activity recency
-- ============================================================
alter table profiles
  add column if not exists signup_source   text,
  add column if not exists signup_medium   text,
  add column if not exists signup_campaign text,
  add column if not exists signup_referrer text,
  add column if not exists signup_channel  text,   -- normalized bucket: instagram/facebook/google/line/tiktok/direct/referral/other
  add column if not exists last_active_at  timestamptz,
  add column if not exists last_province   text;

create index if not exists idx_profiles_last_active   on profiles (last_active_at desc);
create index if not exists idx_profiles_signup_channel on profiles (signup_channel);
create index if not exists idx_profiles_created        on profiles (created_at desc);

-- ============================================================
-- 2) PAGE_VIEWS — general visitor analytics (anon + authed)
--    line_clicks only fires for logged-in users, so it cannot
--    measure top-of-funnel traffic. page_views fills that gap.
-- ============================================================
create table if not exists page_views (
  id           bigserial primary key,
  session_id   text,                     -- anonymous session cookie (dp_sid)
  user_id      uuid references profiles(id) on delete set null,
  path         text,
  channel      text,                     -- normalized first-touch bucket
  utm_source   text,
  utm_medium   text,
  utm_campaign text,
  referrer     text,
  province     text,                     -- from edge geo header (approximate)
  country      text,
  user_agent   text,
  ip_hash      text,
  created_at   timestamptz default now()
);

create index if not exists idx_pv_created  on page_views (created_at desc);
create index if not exists idx_pv_channel  on page_views (channel);
create index if not exists idx_pv_session  on page_views (session_id);
create index if not exists idx_pv_user     on page_views (user_id);
create index if not exists idx_pv_province on page_views (province);

alter table page_views enable row level security;
drop policy if exists "pv_anyone_insert" on page_views;
create policy "pv_anyone_insert" on page_views for insert with check (true);
drop policy if exists "pv_admin_read" on page_views;
create policy "pv_admin_read" on page_views for select using (is_admin());

-- ============================================================
-- 3) LINE_CLICKS — attribution columns (extend existing)
-- ============================================================
alter table line_clicks
  add column if not exists channel    text,
  add column if not exists utm_source text,
  add column if not exists referrer   text,
  add column if not exists province   text,
  add column if not exists session_id text;

create index if not exists idx_clicks_channel on line_clicks (channel);

-- ============================================================
-- 4) BOOKINGS — commission + channel for revenue / forecast
--    commission_amount is a snapshot at create time so historical
--    revenue is stable even if the platform rate changes later.
-- ============================================================
alter table bookings
  add column if not exists commission_rate   numeric(5,4) not null default 0.10,
  add column if not exists commission_amount int,
  add column if not exists channel           text;   -- renter first-touch channel

update bookings
   set commission_amount = round(rental_total * commission_rate)
 where commission_amount is null;

-- Admin needs to read all bookings for revenue reporting (existing
-- bookings_party_select only exposes a user's own bookings).
drop policy if exists "bookings_admin_select" on bookings;
create policy "bookings_admin_select" on bookings for select using (is_admin());

-- ============================================================
-- 5) SELLER_SUBSCRIPTIONS — paid-plan adoption -> revenue
--    Schema-ready even though billing is still manual; the
--    director's "subscription adoption -> revenue" needs a place
--    to record who is on a paid plan and how much they pay.
-- ============================================================
create table if not exists seller_subscriptions (
  id            uuid primary key default uuid_generate_v4(),
  boutique_id   uuid references boutiques(id) on delete cascade,
  owner_id      uuid references profiles(id) on delete set null,
  plan          text not null default 'free'
                check (plan in ('free','boost','featured')),
  status        text not null default 'active'
                check (status in ('active','past_due','cancelled','expired')),
  amount        int  not null default 0,         -- THB charged per cycle
  billing_cycle text not null default 'monthly'
                check (billing_cycle in ('monthly','yearly')),
  started_at         timestamptz default now(),
  current_period_end timestamptz,
  cancelled_at       timestamptz,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

create index if not exists idx_subs_boutique on seller_subscriptions (boutique_id);
create index if not exists idx_subs_status   on seller_subscriptions (status);
create index if not exists idx_subs_plan     on seller_subscriptions (plan);

alter table seller_subscriptions enable row level security;
drop policy if exists "subs_owner_read" on seller_subscriptions;
create policy "subs_owner_read" on seller_subscriptions for select
  using (owner_id = auth.uid() or is_admin());
drop policy if exists "subs_admin_write" on seller_subscriptions;
create policy "subs_admin_write" on seller_subscriptions for all
  using (is_admin()) with check (is_admin());

-- ============================================================
-- 6) handle_new_user — persist signup attribution from metadata.
--    Email signup passes utm/referrer/channel via options.data;
--    OAuth users get backfilled by /api/track on first pageview.
-- ============================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_role text := 'customer';
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if lower(new.email) in ('admin@doprent.com','prem@doprent.com','hgcovuf@gmail.com') then
    v_role := 'admin';
  end if;
  insert into profiles (id, email, full_name, role,
                         signup_source, signup_medium, signup_campaign,
                         signup_referrer, signup_channel)
  values (new.id, new.email,
          coalesce(v_meta->>'full_name', split_part(new.email,'@',1)), v_role,
          v_meta->>'utm_source', v_meta->>'utm_medium', v_meta->>'utm_campaign',
          v_meta->>'referrer', v_meta->>'channel')
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ============================================================
-- 7) REPORTING VIEWS (for the SQL editor / BI / investor decks).
--    Revoked from anon+authenticated; the in-app admin dashboard
--    reads them through admin_metrics_overview() (security definer).
-- ============================================================

-- (a/b) Daily traffic by channel
create or replace view v_daily_traffic as
select date_trunc('day', created_at)::date as day,
       coalesce(channel, 'direct')         as channel,
       count(*)                            as views,
       count(distinct session_id)          as sessions,
       count(distinct user_id)             as users
from page_views
group by 1, 2;

-- (a/d) Signups by acquisition channel
create or replace view v_channel_signups as
select coalesce(signup_channel, 'direct') as channel,
       count(*)        as signups,
       min(created_at) as first_signup,
       max(created_at) as last_signup
from profiles
group by 1;

-- (c) Visitors by province (approximate, from edge geo)
create or replace view v_traffic_by_province as
select coalesce(province, 'unknown') as province,
       count(*)                       as views,
       count(distinct session_id)     as sessions
from page_views
group by 1;

-- (d) MAU — distinct active users per month
create or replace view v_mau as
select date_trunc('month', last_active_at)::date as month,
       count(distinct id)                         as mau
from profiles
where last_active_at is not null
group by 1;

-- (e/g) Daily bookings + realized commission revenue
create or replace view v_daily_bookings as
select date_trunc('day', created_at)::date as day,
       count(*)                                                          as bookings,
       count(*) filter (where status = 'confirmed')                     as confirmed,
       coalesce(sum(rental_total), 0)                                   as gmv,
       coalesce(sum(rental_total) filter (where status = 'confirmed'), 0) as gmv_confirmed,
       coalesce(sum(commission_amount) filter (where status = 'confirmed'), 0) as commission_revenue
from bookings
group by 1;

-- (e) Bookings by product category (occasion tag on the dress)
create or replace view v_bookings_by_occasion as
select occ                                                          as occasion,
       count(*)                                                     as bookings,
       count(*) filter (where b.status = 'confirmed')               as confirmed,
       coalesce(sum(b.commission_amount) filter (where b.status = 'confirmed'), 0) as commission_revenue
from bookings b
join dresses d on d.id = b.dress_id
cross join lateral unnest(coalesce(d.occasions, array[]::text[])) as occ
group by 1;

-- (g) Booking conversion funnel
create or replace view v_booking_funnel as
select count(*)                                                       as total,
       count(*) filter (where status = 'confirmed')                   as confirmed,
       count(*) filter (where status in ('rejected','cancelled','payment_expired')) as lost,
       count(*) filter (where status not in ('confirmed','rejected','cancelled','payment_expired')) as in_progress,
       round(100.0 * count(*) filter (where status = 'confirmed')
             / nullif(count(*), 0), 2)                                as confirm_rate_pct
from bookings;

-- (f) Subscription revenue (MRR) by plan
create or replace view v_subscription_revenue as
select plan,
       count(*) filter (where status = 'active') as active_subs,
       coalesce(sum(case when billing_cycle = 'monthly' then amount
                         when billing_cycle = 'yearly'  then round(amount / 12.0)
                    end) filter (where status = 'active'), 0) as mrr
from seller_subscriptions
group by 1;

-- (f) Subscription adoption rate vs. total boutiques
create or replace view v_subscription_adoption as
select (select count(*) from boutiques) as total_boutiques,
       (select count(distinct boutique_id) from seller_subscriptions
         where status = 'active' and plan <> 'free') as paid_boutiques,
       round(100.0 * (select count(distinct boutique_id) from seller_subscriptions
                       where status = 'active' and plan <> 'free')
             / nullif((select count(*) from boutiques), 0), 2) as adoption_rate_pct;

revoke all on v_daily_traffic, v_channel_signups, v_traffic_by_province, v_mau,
              v_daily_bookings, v_bookings_by_occasion, v_booking_funnel,
              v_subscription_revenue, v_subscription_adoption
  from anon, authenticated;

-- ============================================================
-- 8) admin_metrics_overview() — single entrypoint for the
--    in-app admin dashboard. security definer + is_admin() gate.
-- ============================================================
create or replace function admin_metrics_overview(days int default 30)
returns json language plpgsql security definer
set search_path = public as $$
declare
  result json;
  since  date := (now() - make_interval(days => days))::date;
begin
  if not is_admin() then
    raise exception 'forbidden';
  end if;

  select json_build_object(
    'range_days', days,
    'traffic', (
      select coalesce(json_agg(t order by t.day), '[]')
      from (select * from v_daily_traffic where day >= since) t),
    'traffic_by_province', (
      select coalesce(json_agg(p order by p.views desc), '[]')
      from v_traffic_by_province p),
    'channel_signups', (
      select coalesce(json_agg(c order by c.signups desc), '[]')
      from v_channel_signups c),
    'mau', (
      select coalesce(json_agg(m order by m.month), '[]') from v_mau m),
    'total_users', (select count(*) from profiles),
    'new_users', (select count(*) from profiles where created_at >= since),
    'active_users', (select count(*) from profiles where last_active_at >= since),
    'daily_bookings', (
      select coalesce(json_agg(b order by b.day), '[]')
      from (select * from v_daily_bookings where day >= since) b),
    'by_occasion', (
      select coalesce(json_agg(o order by o.bookings desc), '[]')
      from v_bookings_by_occasion o),
    'funnel', (select row_to_json(f) from v_booking_funnel f),
    'subscription_revenue', (
      select coalesce(json_agg(s), '[]') from v_subscription_revenue s),
    'subscription_adoption', (
      select row_to_json(a) from v_subscription_adoption a)
  ) into result;

  return result;
end;
$$;

revoke all on function admin_metrics_overview(int) from anon;
grant execute on function admin_metrics_overview(int) to authenticated;

commit;
