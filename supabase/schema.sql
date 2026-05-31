-- ===========================================================
-- DopRent — Full schema (replaces v0.1 catalog-only)
-- Run this in Supabase SQL Editor on a fresh project.
-- Safe to re-run: uses IF EXISTS / IF NOT EXISTS.
-- ===========================================================

-- 0) Clean slate (drop old v0.1 tables if they exist)
drop table if exists line_clicks cascade;
drop table if exists dresses cascade;
drop table if exists boutiques cascade;

-- 1) Extensions
create extension if not exists "uuid-ossp";

-- ===========================================================
-- 2) REFERENCE TABLES
-- ===========================================================

-- Occasions (engagement, wedding, cocktail, evening, gala, party, work, casual)
create table if not exists occasions (
  key         text primary key,
  th          text not null,
  en          text not null,
  color_token text not null,             -- maps to PALETTE in UI
  sort_order  int  default 0
);

-- Bangkok areas (for geolocation auto-detect)
create table if not exists areas (
  key         text primary key,
  th          text not null,
  lat         numeric(9,6) not null,
  lng         numeric(9,6) not null,
  keywords    text[] not null default '{}'
);

-- ===========================================================
-- 3) USERS / PROFILES (extends auth.users)
-- ===========================================================
-- Supabase auth.users handles email/password/Google/LINE
-- This table adds app-specific profile data + role
create table if not exists profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique,
  full_name   text,
  line_id     text,
  role        text not null default 'customer'
              check (role in ('customer','seller','admin')),
  saved_dress_ids uuid[] default '{}',
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- Trigger: auto-create profile row when a new auth.user signs up
-- Admin role auto-assigned if email matches allowlist
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_role text := 'customer';
begin
  if lower(new.email) in ('admin@doprent.com','prem@doprent.com','hgcovuf@gmail.com') then
    v_role := 'admin';
  end if;
  insert into profiles (id, email, full_name, role)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)), v_role)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ===========================================================
-- 4) BOUTIQUES
-- ===========================================================
create table if not exists boutiques (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  owner_id    uuid references profiles(id) on delete set null,
  owner_name  text,                       -- display name (e.g. "คุณนิด")
  area_key    text,                       -- soft reference to areas.key (no FK; some labels like "Sukhumvit 31" aren't in the canonical area list)
  area_label  text not null,              -- denormalized for display ("Siam · ปทุมวัน")
  address     text,
  lat         numeric(9,6),
  lng         numeric(9,6),
  hours       text,
  line_url    text not null,              -- @handle or full URL
  instagram   text,
  since_year  int,
  cover_color text not null default 'rose'
              check (cover_color in ('rose','ivory','green','black','navy','red','blue','purple')),
  tag         text,                       -- short tagline
  story       text,                       -- long description
  -- Ads tier
  featured    boolean not null default false,   -- "Featured Boutique" tier
  ads_tier    text not null default 'free'
              check (ads_tier in ('free','boost','featured')),
  -- Verification
  status      text not null default 'live'
              check (status in ('pending','live','rejected')),
  reject_reason text,
  kyc_status  text not null default 'none'
              check (kyc_status in ('none','submitted','verified','rejected')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_boutiques_status on boutiques (status);
create index if not exists idx_boutiques_featured on boutiques (featured);
create index if not exists idx_boutiques_area on boutiques (area_key);

-- ===========================================================
-- 5) DRESSES (listings)
-- ===========================================================
create table if not exists dresses (
  id           uuid primary key default uuid_generate_v4(),
  slug         text unique not null,
  name         text not null,
  designer     text,
  boutique_id  uuid not null references boutiques(id) on delete cascade,
  boutique_name text not null,            -- denormalized for fast catalog rendering
  size         text not null check (size in ('S','M','L','XS','XL')),
  color        text not null check (color in ('rose','ivory','green','black','navy','red','blue','purple')),
  price_per_day int not null,
  deposit      int not null default 0,
  description  text,
  images       jsonb not null default '[]'::jsonb,     -- array of Supabase Storage URLs
  occasions    text[] not null default '{}',           -- references occasions.key
  line_url     text not null,                          -- per-listing override; falls back to boutique
  -- Ads tier
  ads_tier     text not null default 'free'
               check (ads_tier in ('free','boost','featured')),
  featured     boolean not null default false,
  sponsored    boolean not null default false,         -- legacy from demo
  -- Status / moderation
  status       text not null default 'live'
               check (status in ('pending','live','rejected','draft')),
  reject_reason text,
  available    boolean not null default true,
  views        int not null default 0,
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);

create index if not exists idx_dresses_color on dresses (color);
create index if not exists idx_dresses_size on dresses (size);
create index if not exists idx_dresses_status on dresses (status);
create index if not exists idx_dresses_available on dresses (available);
create index if not exists idx_dresses_boutique on dresses (boutique_id);
create index if not exists idx_dresses_price on dresses (price_per_day);
create index if not exists idx_dresses_occasions on dresses using gin (occasions);

-- ===========================================================
-- 6) KYC SUBMISSIONS
-- ===========================================================
create table if not exists kyc_submissions (
  id            uuid primary key default uuid_generate_v4(),
  boutique_id   uuid not null references boutiques(id) on delete cascade,
  owner_id      uuid references profiles(id) on delete set null,
  business_type text not null check (business_type in ('individual','company')),
  legal_name    text not null,
  tax_id        text not null,
  dbd_reg_no    text,                                  -- only for company
  bank_name     text not null,
  bank_acc_no   text not null,
  bank_acc_name text not null,
  id_card_url   text,
  dbd_doc_url   text,
  book_bank_url text,
  vat_doc_url   text,
  plan          text not null default 'Boost'
                check (plan in ('Free','Boost','Featured')),
  status        text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  reviewer_id   uuid references profiles(id) on delete set null,
  review_notes  text,
  submitted_at  timestamptz default now(),
  reviewed_at   timestamptz
);

create index if not exists idx_kyc_status on kyc_submissions (status);
create index if not exists idx_kyc_boutique on kyc_submissions (boutique_id);

-- ===========================================================
-- 7) LINE CLICKS (analytics)
-- ===========================================================
create table if not exists line_clicks (
  id         bigserial primary key,
  dress_id   uuid references dresses(id) on delete set null,
  boutique_id uuid references boutiques(id) on delete set null,
  source     text,                                     -- 'detail_primary','detail_secondary','boutique_primary','footer', etc.
  user_id    uuid references profiles(id) on delete set null,
  user_agent text,
  ip_hash    text,
  created_at timestamptz default now()
);

create index if not exists idx_clicks_dress on line_clicks (dress_id);
create index if not exists idx_clicks_boutique on line_clicks (boutique_id);
create index if not exists idx_clicks_created on line_clicks (created_at desc);

-- ===========================================================
-- 8) ADMIN AUDIT LOG
-- ===========================================================
create table if not exists admin_audit (
  id          bigserial primary key,
  admin_id    uuid references profiles(id) on delete set null,
  action      text not null,                           -- 'approve_boutique','reject_listing','approve_kyc', etc.
  target_type text not null,                           -- 'boutique','dress','kyc'
  target_id   uuid,
  reason      text,
  payload     jsonb,
  created_at  timestamptz default now()
);

create index if not exists idx_audit_target on admin_audit (target_type, target_id);
create index if not exists idx_audit_created on admin_audit (created_at desc);

-- ===========================================================
-- 9) ROW LEVEL SECURITY (RLS)
-- ===========================================================
alter table profiles         enable row level security;
alter table boutiques        enable row level security;
alter table dresses          enable row level security;
alter table kyc_submissions  enable row level security;
alter table line_clicks      enable row level security;
alter table admin_audit      enable row level security;

-- helper: is_admin()
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- helper: is_seller_of(boutique_id)
create or replace function is_seller_of(b_id uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from boutiques
    where id = b_id and owner_id = auth.uid()
  );
$$;

-- Profiles: user can read/update own; admin can read all
drop policy if exists "profiles_own_read" on profiles;
create policy "profiles_own_read" on profiles
  for select using (id = auth.uid() or is_admin());

drop policy if exists "profiles_own_update" on profiles;
create policy "profiles_own_update" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Boutiques: public reads live; owner reads own; admin reads all
drop policy if exists "boutiques_public_read" on boutiques;
create policy "boutiques_public_read" on boutiques
  for select using (status = 'live' or owner_id = auth.uid() or is_admin());

drop policy if exists "boutiques_owner_insert" on boutiques;
create policy "boutiques_owner_insert" on boutiques
  for insert with check (owner_id = auth.uid() or is_admin());

drop policy if exists "boutiques_owner_update" on boutiques;
create policy "boutiques_owner_update" on boutiques
  for update using (owner_id = auth.uid() or is_admin());

drop policy if exists "boutiques_admin_delete" on boutiques;
create policy "boutiques_admin_delete" on boutiques
  for delete using (is_admin());

-- Dresses
drop policy if exists "dresses_public_read" on dresses;
create policy "dresses_public_read" on dresses
  for select using (
    (status = 'live' and available = true)
    or is_seller_of(boutique_id)
    or is_admin()
  );

drop policy if exists "dresses_owner_write" on dresses;
create policy "dresses_owner_write" on dresses
  for all using (is_seller_of(boutique_id) or is_admin())
  with check (is_seller_of(boutique_id) or is_admin());

-- KYC: owner reads own; admin reads all
drop policy if exists "kyc_own_read" on kyc_submissions;
create policy "kyc_own_read" on kyc_submissions
  for select using (is_seller_of(boutique_id) or is_admin());

drop policy if exists "kyc_owner_insert" on kyc_submissions;
create policy "kyc_owner_insert" on kyc_submissions
  for insert with check (is_seller_of(boutique_id));

drop policy if exists "kyc_admin_update" on kyc_submissions;
create policy "kyc_admin_update" on kyc_submissions
  for update using (is_admin());

-- Line clicks: anyone can insert; admin reads all
drop policy if exists "clicks_anyone_insert" on line_clicks;
create policy "clicks_anyone_insert" on line_clicks
  for insert with check (true);

drop policy if exists "clicks_admin_read" on line_clicks;
create policy "clicks_admin_read" on line_clicks
  for select using (is_admin());

-- Admin audit: admin only
drop policy if exists "audit_admin_only" on admin_audit;
create policy "audit_admin_only" on admin_audit
  for all using (is_admin()) with check (is_admin());

-- ===========================================================
-- 10) SEED: OCCASIONS + AREAS
-- ===========================================================
insert into occasions (key, th, en, color_token, sort_order) values
  ('engagement','งานหมั้น','Engagement','rose',1),
  ('wedding','งานแต่ง','Wedding','ivory',2),
  ('cocktail','ค็อกเทล','Cocktail','green',3),
  ('evening','ราตรี','Evening','navy',4),
  ('gala','กาล่า','Gala','red',5),
  ('party','ปาร์ตี้','Party','purple',6),
  ('work','ทำงาน','Work','black',7),
  ('casual','ลำลอง','Casual','blue',8)
on conflict (key) do nothing;

insert into areas (key, th, lat, lng, keywords) values
  ('Siam','สยาม',13.7456,100.5340, array['siam','สยาม','paragon','พารากอน','centralworld','mbk']),
  ('Chitlom','ชิดลม',13.7441,100.5424, array['chitlom','chidlom','ชิดลม']),
  ('Ploenchit','เพลินจิต',13.7437,100.5476, array['ploenchit','เพลินจิต','central embassy']),
  ('Wireless','วิทยุ',13.7406,100.5436, array['wireless','วิทยุ','witthayu','all seasons']),
  ('Asok','อโศก',13.7376,100.5612, array['asok','asoke','อโศก','terminal 21']),
  ('Sukhumvit 11','สุขุมวิท 11',13.7430,100.5550, array['sukhumvit 11','นานา','nana']),
  ('Phrom Phong','พร้อมพงษ์',13.7307,100.5697, array['phrom phong','พร้อมพงษ์','emporium','emquartier']),
  ('Thonglor','ทองหล่อ',13.7268,100.5780, array['thonglor','thong lor','ทองหล่อ','eight thonglor']),
  ('Ekkamai','เอกมัย',13.7237,100.5849, array['ekkamai','ekamai','เอกมัย']),
  ('Phra Khanong','พระโขนง',13.7138,100.5897, array['phra khanong','พระโขนง','w district']),
  ('Onnut','อ่อนนุช',13.7050,100.6018, array['onnut','on nut','อ่อนนุช']),
  ('Watthana','วัฒนา',13.7350,100.5800, array['watthana','wattana','วัฒนา']),
  ('Ari','อารีย์',13.7795,100.5443, array['ari','ari soi','อารีย์']),
  ('Sathorn','สาทร',13.7220,100.5290, array['sathorn','สาทร','empire tower','met sathorn']),
  ('Silom','สีลม',13.7244,100.5300, array['silom','สีลม']),
  ('Sala Daeng','ศาลาแดง',13.7244,100.5345, array['sala daeng','ศาลาแดง','convent']),
  ('Surawong','สุรวงศ์',13.7280,100.5260, array['surawong','สุรวงศ์']),
  ('Bangrak','บางรัก',13.7298,100.5232, array['bangrak','บางรัก','เจริญกรุง','saphan taksin']),
  ('Charoenkrung','เจริญกรุง',13.7268,100.5135, array['charoenkrung','charoen krung','เจริญกรุง 38']),
  ('Yaowarat','เยาวราช',13.7411,100.5089, array['yaowarat','เยาวราช','wat mangkon','สำเพ็ง']),
  ('Pratunam','ประตูน้ำ',13.7521,100.5403, array['pratunam','ประตูน้ำ','platinum mall','ratchathewi']),
  ('Lumpini','ลุมพินี',13.7298,100.5444, array['lumpini','ลุมพินี']),
  ('Phaya Thai','พญาไท',13.7570,100.5340, array['phaya thai','พญาไท']),
  ('Ratchadaphisek','รัชดาภิเษก',13.7700,100.5750, array['ratchada','รัชดา']),
  ('Bang Na','บางนา',13.6680,100.6050, array['bang na','บางนา'])
on conflict (key) do nothing;
