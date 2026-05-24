-- ===========================================================
-- DopRent — Canonical schema (v2, 2026-05-24)
--
-- Run on a FRESH Supabase project. Idempotent (safe to re-run).
-- Includes all migrations up to 2026-05-18.
--
-- After running:
--   1. Create your test user via Supabase Auth UI (email/Google)
--   2. Grant admin: UPDATE profiles SET role='admin' WHERE email='you@example.com';
-- ===========================================================

-- ===========================================================
-- 0) EXTENSIONS
-- ===========================================================
create extension if not exists "uuid-ossp";

-- ===========================================================
-- 1) REFERENCE TABLES
-- ===========================================================

create table if not exists occasions (
  key         text primary key,
  th          text not null,
  en          text not null,
  color_token text not null,
  sort_order  int  default 0
);

create table if not exists areas (
  key      text primary key,
  th       text not null,
  lat      numeric(9,6) not null,
  lng      numeric(9,6) not null,
  keywords text[] not null default '{}'
);

-- ===========================================================
-- 2) PROFILES (extends auth.users)
-- ===========================================================

create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  email           text unique,
  full_name       text,
  line_id         text,
  role            text not null default 'customer'
                  check (role in ('customer','seller','admin')),
  saved_dress_ids uuid[] default '{}',
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Auto-creates profile row when a new auth.user signs up.
-- Hard-coded admin emails: admin@doprent.com and prem@doprent.com only.
-- For dev: sign up normally, then run UPDATE profiles SET role='admin'.
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
declare
  v_role text := 'customer';
  v_name text;
begin
  if lower(new.email) in ('admin@doprent.com', 'prem@doprent.com') then
    v_role := 'admin';
  end if;

  v_name := coalesce(
    new.raw_user_meta_data->>'full_name',
    split_part(new.email, '@', 1)
  );

  insert into profiles (id, email, full_name, role)
  values (new.id, new.email, v_name, v_role)
  on conflict (id) do update
    set email      = excluded.email,
        full_name  = coalesce(profiles.full_name, excluded.full_name),
        role       = excluded.role,
        updated_at = now();

  return new;
exception when others then
  raise warning 'handle_new_user failed for %: %', new.email, sqlerrm;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ===========================================================
-- 3) BOUTIQUES
-- ===========================================================

create table if not exists boutiques (
  id          uuid primary key default uuid_generate_v4(),
  slug        text unique not null,
  name        text not null,
  owner_id    uuid references profiles(id) on delete set null,
  owner_name  text,
  area_key    text references areas(key),     -- FK enforced; seed data uses valid area keys only
  area_label  text not null,
  -- Structured Thai address
  address     text,
  house_no    text,
  street      text,
  subdistrict text,
  district    text,
  province    text not null default 'กรุงเทพมหานคร',
  postal_code text,
  lat         numeric(9,6),
  lng         numeric(9,6),
  -- Contact
  hours       text,
  line_url    text not null,
  instagram   text,
  since_year  int,
  -- Display
  cover_color text not null default 'rose'
              check (cover_color in ('rose','ivory','green','black','navy','red','blue','purple')),
  tag           text,
  story         text,
  delivery_info text,
  -- Ads
  featured    boolean not null default false,
  ads_tier    text not null default 'free'
              check (ads_tier in ('free','boost','featured')),
  -- Verification (paid-plan KYC only; never auto-set for free tier)
  verified    boolean not null default false,
  status      text not null default 'live'
              check (status in ('pending','live','rejected')),
  reject_reason text,
  kyc_status  text not null default 'none'
              check (kyc_status in ('none','submitted','verified','rejected')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists idx_boutiques_status         on boutiques (status);
create index if not exists idx_boutiques_featured       on boutiques (featured);
create index if not exists idx_boutiques_area           on boutiques (area_key);
create index if not exists idx_boutiques_verified       on boutiques (verified);
create index if not exists idx_boutiques_district       on boutiques (district);
create index if not exists idx_boutiques_status_created on boutiques (status, created_at desc);

-- ===========================================================
-- 4) DRESSES
-- ===========================================================

create table if not exists dresses (
  id            uuid primary key default uuid_generate_v4(),
  slug          text unique not null,
  name          text not null,
  designer      text,
  boutique_id   uuid not null references boutiques(id) on delete cascade,
  boutique_name text not null,
  size          text not null check (size in ('XS','S','M','L','XL')),
  color         text not null check (color in ('rose','ivory','green','black','navy','red','blue','purple')),
  price_per_day int not null,
  deposit       int not null default 0,
  description   text,
  images        jsonb not null default '[]'::jsonb,
  occasions     text[] not null default '{}',
  line_url      text not null,
  ads_tier      text not null default 'free'
                check (ads_tier in ('free','boost','featured')),
  featured      boolean not null default false,
  sponsored     boolean not null default false,
  status        text not null default 'live'
                check (status in ('pending','live','rejected','draft')),
  reject_reason text,
  available     boolean not null default true,
  views         int not null default 0,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create index if not exists idx_dresses_color          on dresses (color);
create index if not exists idx_dresses_size           on dresses (size);
create index if not exists idx_dresses_status         on dresses (status);
create index if not exists idx_dresses_available      on dresses (available);
create index if not exists idx_dresses_boutique       on dresses (boutique_id);
create index if not exists idx_dresses_price          on dresses (price_per_day);
create index if not exists idx_dresses_occasions      on dresses using gin (occasions);
create index if not exists idx_dresses_status_created on dresses (status, created_at desc);

-- ===========================================================
-- 5) KYC SUBMISSIONS
-- ===========================================================

create table if not exists kyc_submissions (
  id            uuid primary key default uuid_generate_v4(),
  boutique_id   uuid not null references boutiques(id) on delete cascade,
  owner_id      uuid references profiles(id) on delete set null,
  business_type text not null check (business_type in ('individual','company')),
  legal_name    text not null,
  tax_id        text not null,
  dbd_reg_no    text,
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

create index if not exists idx_kyc_status           on kyc_submissions (status);
create index if not exists idx_kyc_boutique         on kyc_submissions (boutique_id);
create index if not exists idx_kyc_status_submitted on kyc_submissions (status, submitted_at desc);

-- ===========================================================
-- 6) LINE CLICKS (analytics)
-- ===========================================================

create table if not exists line_clicks (
  id          bigserial primary key,
  dress_id    uuid references dresses(id) on delete set null,
  boutique_id uuid references boutiques(id) on delete set null,
  source      text,
  user_id     uuid references profiles(id) on delete set null,
  user_agent  text,
  ip_hash     text,
  created_at  timestamptz default now()
);

create index if not exists idx_clicks_dress    on line_clicks (dress_id);
create index if not exists idx_clicks_boutique on line_clicks (boutique_id);
create index if not exists idx_clicks_created  on line_clicks (created_at desc);

-- ===========================================================
-- 7) ADMIN AUDIT LOG
-- ===========================================================

create table if not exists admin_audit (
  id          bigserial primary key,
  admin_id    uuid references profiles(id) on delete set null,
  action      text not null,
  target_type text not null,
  target_id   uuid,
  reason      text,
  payload     jsonb,
  created_at  timestamptz default now()
);

create index if not exists idx_audit_target  on admin_audit (target_type, target_id);
create index if not exists idx_audit_created on admin_audit (created_at desc);

-- ===========================================================
-- 8) DRESS BLACKOUTS (availability calendar)
-- ===========================================================

create table if not exists dress_blackouts (
  dress_id   uuid not null references dresses(id) on delete cascade,
  date       date not null,
  created_at timestamptz default now(),
  primary key (dress_id, date)
);

create index if not exists idx_blackouts_dress on dress_blackouts (dress_id);
create index if not exists idx_blackouts_date  on dress_blackouts (date);

-- ===========================================================
-- 9) ROW LEVEL SECURITY
-- ===========================================================

alter table profiles        enable row level security;
alter table boutiques       enable row level security;
alter table dresses         enable row level security;
alter table kyc_submissions enable row level security;
alter table line_clicks     enable row level security;
alter table admin_audit     enable row level security;
alter table dress_blackouts enable row level security;

-- Helper: is the current user an admin?
create or replace function is_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Helper: does the current user own boutique b_id?
create or replace function is_seller_of(b_id uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from boutiques where id = b_id and owner_id = auth.uid());
$$;

-- profiles
drop policy if exists "profiles_own_read"   on profiles;
create policy "profiles_own_read" on profiles
  for select using (id = auth.uid() or is_admin());

drop policy if exists "profiles_own_insert" on profiles;
create policy "profiles_own_insert" on profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles_own_update" on profiles;
create policy "profiles_own_update" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- boutiques
drop policy if exists "boutiques_public_read"  on boutiques;
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

-- dresses
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

-- kyc_submissions
drop policy if exists "kyc_own_read"     on kyc_submissions;
create policy "kyc_own_read" on kyc_submissions
  for select using (is_seller_of(boutique_id) or is_admin());

drop policy if exists "kyc_owner_insert" on kyc_submissions;
create policy "kyc_owner_insert" on kyc_submissions
  for insert with check (is_seller_of(boutique_id));

drop policy if exists "kyc_admin_update" on kyc_submissions;
create policy "kyc_admin_update" on kyc_submissions
  for update using (is_admin());

-- line_clicks: anyone can insert; seller reads own boutique; admin reads all
drop policy if exists "clicks_anyone_insert" on line_clicks;
create policy "clicks_anyone_insert" on line_clicks
  for insert with check (true);

drop policy if exists "clicks_admin_read"  on line_clicks;
drop policy if exists "clicks_seller_read" on line_clicks;
create policy "clicks_seller_read" on line_clicks
  for select using (
    is_admin()
    or (boutique_id is not null and is_seller_of(boutique_id))
  );

-- admin_audit
drop policy if exists "audit_admin_only" on admin_audit;
create policy "audit_admin_only" on admin_audit
  for all using (is_admin()) with check (is_admin());

-- dress_blackouts
drop policy if exists "blackouts_public_read"  on dress_blackouts;
create policy "blackouts_public_read" on dress_blackouts
  for select using (true);

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

-- ===========================================================
-- 10) GRANTS
-- ===========================================================

grant usage on schema public to anon, authenticated;

-- anon: read-only on public catalog tables (RLS still gates rows)
grant select on occasions, areas           to anon;
grant select on dresses, dress_blackouts   to anon;

-- authenticated: full CRUD gated by RLS
grant select, insert, update, delete on profiles        to authenticated;
grant select, insert, update, delete on boutiques       to authenticated;
grant select, insert, update, delete on dresses         to authenticated;
grant select, insert, update         on kyc_submissions to authenticated;
grant select, insert                 on line_clicks     to authenticated;
grant select, insert                 on admin_audit     to authenticated;
grant select, insert, delete         on dress_blackouts to authenticated;
grant select on occasions, areas to authenticated;

grant all on all tables    in schema public to service_role;
grant all on all sequences in schema public to service_role;

-- Boutique column-level privacy for anon.
-- anon key is public; block address/GPS columns to prevent bulk scraping.
-- Authenticated users keep full SELECT (gated by RLS row policies).
revoke select on boutiques from anon;
grant select (
  id, slug, name, owner_id, owner_name,
  area_key, area_label, hours, line_url, instagram,
  since_year, cover_color, tag, story, delivery_info,
  featured, ads_tier, status, kyc_status, verified,
  district, province,
  created_at, updated_at
) on boutiques to anon;

-- ===========================================================
-- 11) STORAGE BUCKETS + POLICIES
-- ===========================================================

insert into storage.buckets (id, name, public)
  values ('kyc-docs', 'kyc-docs', false)
  on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
  values ('dress-images', 'dress-images', true)
  on conflict (id) do nothing;

-- Drop all storage policies before recreating (idempotent)
drop policy if exists "kyc_docs_owner_upload"      on storage.objects;
drop policy if exists "kyc_docs_owner_read"        on storage.objects;
drop policy if exists "kyc_docs_owner_delete"      on storage.objects;
drop policy if exists "kyc_docs_authed_upload"     on storage.objects;
drop policy if exists "kyc_docs_authed_read"       on storage.objects;
drop policy if exists "kyc_docs_authed_delete"     on storage.objects;
drop policy if exists "dress_images_public_read"   on storage.objects;
drop policy if exists "dress_images_owner_write"   on storage.objects;
drop policy if exists "dress_images_owner_delete"  on storage.objects;
drop policy if exists "dress_images_authed_write"  on storage.objects;
drop policy if exists "dress_images_authed_delete" on storage.objects;

-- kyc-docs: private, any authenticated user
create policy "kyc_docs_authed_upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'kyc-docs');

create policy "kyc_docs_authed_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'kyc-docs');

create policy "kyc_docs_authed_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'kyc-docs');

-- dress-images: public read, authenticated write
create policy "dress_images_public_read" on storage.objects
  for select using (bucket_id = 'dress-images');

create policy "dress_images_authed_write" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'dress-images');

create policy "dress_images_authed_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'dress-images');

-- ===========================================================
-- 12) SEED: OCCASIONS + AREAS
-- ===========================================================

insert into occasions (key, th, en, color_token, sort_order) values
  ('engagement', 'งานหมั้น',  'Engagement', 'rose',   1),
  ('wedding',    'งานแต่ง',   'Wedding',    'ivory',  2),
  ('cocktail',   'ค็อกเทล',   'Cocktail',   'green',  3),
  ('evening',    'ราตรี',     'Evening',    'navy',   4),
  ('gala',       'กาล่า',     'Gala',       'red',    5),
  ('party',      'ปาร์ตี้',   'Party',      'purple', 6),
  ('work',       'ทำงาน',     'Work',       'black',  7),
  ('casual',     'ลำลอง',     'Casual',     'blue',   8)
on conflict (key) do nothing;

insert into areas (key, th, lat, lng, keywords) values
  ('Siam',           'สยาม',         13.7456, 100.5340, array['siam','สยาม','paragon','พารากอน','centralworld','mbk']),
  ('Chitlom',        'ชิดลม',        13.7441, 100.5424, array['chitlom','chidlom','ชิดลม']),
  ('Ploenchit',      'เพลินจิต',     13.7437, 100.5476, array['ploenchit','เพลินจิต','central embassy']),
  ('Wireless',       'วิทยุ',        13.7406, 100.5436, array['wireless','วิทยุ','witthayu','all seasons']),
  ('Asok',           'อโศก',         13.7376, 100.5612, array['asok','asoke','อโศก','terminal 21']),
  ('Sukhumvit 11',   'สุขุมวิท 11',  13.7430, 100.5550, array['sukhumvit 11','นานา','nana']),
  ('Phrom Phong',    'พร้อมพงษ์',    13.7307, 100.5697, array['phrom phong','พร้อมพงษ์','emporium','emquartier']),
  ('Thonglor',       'ทองหล่อ',      13.7268, 100.5780, array['thonglor','thong lor','ทองหล่อ','eight thonglor']),
  ('Ekkamai',        'เอกมัย',       13.7237, 100.5849, array['ekkamai','ekamai','เอกมัย']),
  ('Phra Khanong',   'พระโขนง',      13.7138, 100.5897, array['phra khanong','พระโขนง','w district']),
  ('Onnut',          'อ่อนนุช',      13.7050, 100.6018, array['onnut','on nut','อ่อนนุช']),
  ('Watthana',       'วัฒนา',        13.7350, 100.5800, array['watthana','wattana','วัฒนา']),
  ('Ari',            'อารีย์',       13.7795, 100.5443, array['ari','ari soi','อารีย์']),
  ('Sathorn',        'สาทร',         13.7220, 100.5290, array['sathorn','สาทร','empire tower','met sathorn']),
  ('Silom',          'สีลม',         13.7244, 100.5300, array['silom','สีลม']),
  ('Sala Daeng',     'ศาลาแดง',      13.7244, 100.5345, array['sala daeng','ศาลาแดง','convent']),
  ('Surawong',       'สุรวงศ์',      13.7280, 100.5260, array['surawong','สุรวงศ์']),
  ('Bangrak',        'บางรัก',       13.7298, 100.5232, array['bangrak','บางรัก','เจริญกรุง','saphan taksin']),
  ('Charoenkrung',   'เจริญกรุง',    13.7268, 100.5135, array['charoenkrung','charoen krung','เจริญกรุง 38']),
  ('Yaowarat',       'เยาวราช',      13.7411, 100.5089, array['yaowarat','เยาวราช','wat mangkon','สำเพ็ง']),
  ('Pratunam',       'ประตูน้ำ',     13.7521, 100.5403, array['pratunam','ประตูน้ำ','platinum mall','ratchathewi']),
  ('Lumpini',        'ลุมพินี',      13.7298, 100.5444, array['lumpini','ลุมพินี']),
  ('Phaya Thai',     'พญาไท',        13.7570, 100.5340, array['phaya thai','พญาไท']),
  ('Ratchadaphisek', 'รัชดาภิเษก',  13.7700, 100.5750, array['ratchada','รัชดา']),
  ('Bang Na',        'บางนา',        13.6680, 100.6050, array['bang na','บางนา'])
on conflict (key) do nothing;

-- ===========================================================
-- 13) SEED: BOUTIQUES (30 demo boutiques, no owner_id)
-- ===========================================================

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('siam-couture', 'Siam Couture', 'คุณนิด', 'Siam', 'Siam · ปทุมวัน',
   'ชั้น 3, Siam Paragon · BTS สยาม', 'จันทร์-เสาร์ 11:00-19:00',
   'https://line.me/R/ti/p/@siamcouture', '@siamcouture.bkk', 2018, 'rose',
   'ชุดราตรีและงานหมั้นโทนหวานคลาสสิก ผ้าซิลค์ ลูกไม้ ออร์แกนซ่า — คัดจากดีไซเนอร์ไทย',
   'Siam Couture เริ่มจากร้านชุดเจ้าสาวเล็กๆ ในสยามตั้งแต่ปี 2018 จุดยืนของเราคือคัดชุดที่หาที่ไหนไม่ได้', true, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('thonglor-atelier', 'Thonglor Atelier', 'คุณแอน', 'Thonglor', 'Thonglor · วัฒนา',
   'Eight Thonglor (ชั้น 2), ซอย 13 · BTS ทองหล่อ', 'ทุกวัน 12:00-20:00',
   'https://line.me/R/ti/p/@thonglor', '@thonglor.atelier', 2020, 'navy',
   'ดีไซน์โมเดิร์น ทรงคม สีสะดุดตา — งานเลี้ยงค่ำ ปาร์ตี้ ค็อกเทล หรือชุดทำงาน statement',
   'Thonglor Atelier ก่อตั้งปี 2020 คัดดีไซเนอร์ที่มี vision ชัด — Disaya, Kloset, Asava', true, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('ekkamai-edit', 'Ekkamai Edit', 'คุณเฟิร์น', 'Ekkamai', 'Ekkamai · วัฒนา',
   'Ekkamai 12 · BTS เอกมัย', 'จันทร์-เสาร์ 12:00-19:00',
   'https://line.me/R/ti/p/@ekkamai.edit', '@ekkamai.edit', 2021, 'ivory',
   'Modern minimalist — ผ้าโทนกลาง ทรงคอลัมน์สะอาดตา เหมาะกับสาวที่ชอบ understated luxury',
   'Ekkamai Edit คัดเฉพาะชุดที่ออกแบบมาเรียบง่ายที่สุด ไม่ตามเทรนด์ ไม่ปรุงแต่งเกิน', true, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('phrom-phong-bridal', 'Phrom Phong Bridal', 'คุณพิม', 'Phrom Phong', 'Phrom Phong · คลองเตย',
   'Emporium Tower (ชั้น 3) · BTS พร้อมพงษ์', 'จันทร์-อาทิตย์ 11:00-20:00',
   'https://line.me/R/ti/p/@phromphongbridal', '@phromphong.bridal', 2017, 'ivory',
   'ชุดเจ้าสาวระดับพรีเมียม ผ้านำเข้าจากยุโรป งานปัก hand-made ทุกตัว',
   'ร้านชุดเจ้าสาวเฉพาะทาง บริการ alteration ครบวงจร นัดล่วงหน้าเท่านั้น', true, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('ari-vintage-closet', 'Ari Vintage Closet', 'คุณกาย', 'Ari', 'Ari · พญาไท',
   'Ari Soi 4 · BTS อารีย์', 'พุธ-อาทิตย์ 12:00-20:00',
   'https://line.me/R/ti/p/@aricloset', '@ari.vintage.closet', 2020, 'purple',
   'ชุดวินเทจสไตล์ 70-80s + ชุด re-imagined โดยดีไซเนอร์ไทยรุ่นใหม่',
   'Ari Vintage Closet สะสมชุดวินเทจจากญี่ปุ่นและยุโรป ผสมกับงาน custom ของดีไซเนอร์ไทย', true, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('asok-style-co', 'Asok Style Co.', 'คุณเบลล์', 'Asok', 'Asok · คลองเตย',
   'Terminal 21 (ชั้น 2) · BTS อโศก', 'ทุกวัน 11:00-21:00',
   'https://line.me/R/ti/p/@asokstyle', '@asokstyleco', 2019, 'navy',
   'ชุดทำงานและคอนเฟอเรนซ์ที่ดูเด่น เน้นผ้าและทรง mix-and-match',
   'Asok Style Co. เกิดจาก consultant ที่อยากใส่ชุดดูดีในการประชุมโดยไม่ต้องซื้อใหม่', true, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sathorn-atelier', 'Sathorn Atelier', 'คุณภา', 'Sathorn', 'Sathorn · ยานนาวา',
   'The Met Sathorn · BTS ช่องนนทรี', 'จันทร์-เสาร์ 10:30-19:00',
   'https://line.me/R/ti/p/@sathornatelier', '@sathorn.atelier', 2018, 'black',
   'ชุดราตรีคลาสสิก สไตล์ formal สำหรับ corporate gala และงาน diplomatic',
   'Sathorn Atelier เน้นบริการลูกค้า expat และนักธุรกิจ ชุดสไตล์ international classic', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('silom-eveningwear', 'Silom Eveningwear', 'คุณนุ้ย', 'Silom', 'Silom · บางรัก',
   'ถนนสีลม ซอย 12 · BTS ศาลาแดง', 'จันทร์-เสาร์ 11:00-19:30',
   'https://line.me/R/ti/p/@silomeveningwear', '@silom.eveningwear', 2016, 'red',
   'ชุดสีจัด ทรงเด่น ใส่ไปงานค่ำสำคัญ — แดง ทอง น้ำเงินเข้ม',
   'ร้านชุดราตรีเก่าแก่ของสีลม คัดสีและทรงสำหรับคนที่ต้องการเด่นบนพรหมแดง', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('ploenchit-premier', 'Ploenchit Premier', 'คุณแคทเธอรีน', 'Ploenchit', 'Ploenchit · ปทุมวัน',
   'Central Embassy (ชั้น 4) · BTS เพลินจิต', 'ทุกวัน 10:00-22:00',
   'https://line.me/R/ti/p/@ploenchitpremier', '@ploenchit.premier', 2015, 'ivory',
   'ดีไซเนอร์ระดับนานาชาติ — Valentino, Oscar de la Renta, Marchesa สำหรับ red carpet',
   'Ploenchit Premier นำเข้าและให้เช่าชุดดีไซเนอร์ระดับโลก มี private viewing', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('watthana-bridal', 'Watthana Bridal House', 'คุณส้ม', 'Watthana', 'Watthana · สุขุมวิท',
   'Sukhumvit 39 · BTS พร้อมพงษ์', 'นัดล่วงหน้าเท่านั้น',
   'https://line.me/R/ti/p/@watthanabridal', '@watthana.bridalhouse', 2014, 'rose',
   'ชุดเจ้าสาวสไตล์ Thai-Western fusion มีบริการตัดและแก้ไข',
   'Watthana Bridal House เชี่ยวชาญการผสานชุดไทยประยุกต์กับ silhouette ตะวันตก', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('the-dress-library', 'The Dress Library', 'คุณป๊อบ', 'Thonglor', 'Thonglor · วัฒนา',
   'Soi Thonglor 25 · BTS ทองหล่อ', 'จันทร์-อาทิตย์ 11:30-20:00',
   'https://line.me/R/ti/p/@dresslibrary', '@thedresslibrary.bkk', 2022, 'ivory',
   'Curated mix ชุดดีไซเนอร์หลายแบรนด์ในร้านเดียว — เปลี่ยน collection ทุก 2 เดือน',
   'The Dress Library คือ shared closet ของผู้หญิง Bangkok สมัยใหม่ที่อยากเปลี่ยนชุดบ่อยโดยไม่สะสม', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('chitlom-boutique', 'Chitlom Boutique', 'คุณกิ๊ฟ', 'Chitlom', 'Chitlom · ปทุมวัน',
   'Central Chidlom (ชั้น 2) · BTS ชิดลม', 'ทุกวัน 10:30-22:00',
   'https://line.me/R/ti/p/@chitlomboutique', '@chitlom.boutique', 2019, 'rose',
   'ชุดเช่าราคาเข้าถึงได้ ดีไซน์น่ารัก เหมาะกับสาวออฟฟิศที่อยากแต่งสวยทุกเดือน',
   'Chitlom Boutique เน้นกลุ่ม first-jobber ที่อยากใส่ชุดสวยในงบประหยัด', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sukhumvit-11', 'Sukhumvit 11 Studio', 'คุณมิ้น', 'Sukhumvit 11', 'Sukhumvit 11 · วัฒนา',
   'Sukhumvit Soi 11 · BTS นานา', 'พุธ-อาทิตย์ 14:00-22:00',
   'https://line.me/R/ti/p/@suk11studio', '@sukhumvit11.studio', 2020, 'navy',
   'ชุดปาร์ตี้และคลับสไตล์ Bangkok night life — sequin, leather, mesh',
   'Sukhumvit 11 Studio ตั้งบนซอย night life ของเอเชีย เปิดบ่ายให้สาวๆ มาลองชุดก่อนปาร์ตี้', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sala-daeng-couture', 'Sala Daeng Couture', 'คุณนัท', 'Sala Daeng', 'Sala Daeng · บางรัก',
   'ถนนคอนแวนต์ · BTS ศาลาแดง', 'จันทร์-เสาร์ 10:00-19:00',
   'https://line.me/R/ti/p/@saladaengcouture', '@saladaeng.couture', 2017, 'ivory',
   'ชุดคลาสสิกตลอดกาล ผ้าซิลค์ตัดเย็บประณีต — สำหรับงานทางการตลอดปี',
   'Sala Daeng Couture สืบทอดจากร้านชุดเก่าของซอยคอนแวนต์ เน้นงาน hand-tailored', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('bangrak-bridal', 'Bangrak Bridal Co.', 'คุณแหม่ม', 'Bangrak', 'Bangrak · บางรัก',
   'ถนนเจริญกรุง · MRT สามยอด', 'จันทร์-อาทิตย์ 10:00-19:00',
   'https://line.me/R/ti/p/@bangrakbridal', '@bangrak.bridal', 2018, 'rose',
   'ชุดเจ้าสาวราคามิตรภาพ ทั้งให้เช่าและตัดใหม่ — บริการคนรุ่นใหม่',
   'Bangrak Bridal เกิดจากความเชื่อว่าวันแต่งงานไม่ควรกินงบเกินจำเป็น', false, 'live')
on conflict (slug) do nothing;

-- NOTE: pra-sai-couture, soi-49-studio, sukhumvit-couture, closet-at-park had invalid area_keys
-- in the original db.sql (Sukhumvit 31/49, Sukhumvit, Lumpini Park — not in areas table).
-- Fixed below to use the nearest valid area_key.

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('pra-sai-couture', 'Pra Sai Couture', 'คุณปราชญ์', 'Watthana', 'Sukhumvit 31 · วัฒนา',
   'Sukhumvit 31 · BTS พร้อมพงษ์', 'นัดล่วงหน้า',
   'https://line.me/R/ti/p/@prasaicouture', '@prasai.couture', 2021, 'purple',
   'Thai contemporary — ผสานเทคนิคไทย-สากล ใช้ผ้าไหมไทยกับ silhouette modern',
   'Pra Sai Couture สนับสนุนช่างผ้าไหมไทยและดีไซเนอร์รุ่นใหม่ที่นำผ้าไทยกลับมา', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sai-mai', 'Sai Mai Designs', 'คุณจอย', 'Pratunam', 'Pratunam · ราชเทวี',
   'Platinum Mall · BTS ราชเทวี', 'ทุกวัน 10:00-20:00',
   'https://line.me/R/ti/p/@saimaidesigns', '@saimai.designs', 2020, 'green',
   'ดีไซเนอร์ไทยรุ่นใหม่ ราคา accessible — ที่นี่หาแบรนด์ใหม่ก่อนใคร',
   'Sai Mai Designs คัดดีไซเนอร์ไทยใหม่ๆ ทุกเดือน เป็น launching pad ของหลายแบรนด์', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('bangkok-bridal-studio', 'Bangkok Bridal Studio', 'คุณก้อย', 'Sathorn', 'Sathorn · สาทร',
   'Empire Tower · BTS ช่องนนทรี', 'นัดล่วงหน้า',
   'https://line.me/R/ti/p/@bkkbridal', '@bangkok.bridal.studio', 2013, 'ivory',
   'Full-service bridal — ชุด เครื่องประดับ veil, shoes ครบ one-stop',
   'Bangkok Bridal Studio เป็น one-stop bridal ที่เก่าแก่ของกรุงเทพ มี styling team', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('closet-collective', 'Closet Collective', 'คุณนิว', 'Ari', 'Ari · พญาไท',
   'Ari Soi 1 · BTS อารีย์', 'จันทร์-เสาร์ 11:00-20:00',
   'https://line.me/R/ti/p/@closetcollective', '@closetcollective.bkk', 2023, 'blue',
   'Peer-to-peer dress rental — ชุดจริงจากตู้สาวๆ ในกรุงเทพ ราคาถูกกว่า boutique',
   'Closet Collective เกิดจาก idea ของกลุ่มเพื่อนที่อยากเปลี่ยนตู้เสื้อผ้าให้เป็นรายได้', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('riverside-atelier', 'Riverside Atelier', 'คุณริน', 'Charoenkrung', 'Charoenkrung · บางรัก',
   'ถนนเจริญกรุง 38 · BTS สะพานตากสิน', 'พฤ-อาทิตย์ 12:00-19:00',
   'https://line.me/R/ti/p/@riversideatelier', '@riverside.atelier', 2019, 'blue',
   'Destination wedding และงาน outdoor garden — ผ้าเบา สีพาสเทล',
   'Riverside Atelier ตั้งใกล้แม่น้ำ มี private fitting room มองวิวสวย', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('lumpini-lookbook', 'Lumpini Lookbook', 'คุณมายด์', 'Lumpini', 'Lumpini · ปทุมวัน',
   'ถนนวิทยุ · MRT ลุมพินี', 'ทุกวัน 11:00-20:00',
   'https://line.me/R/ti/p/@lumpinilookbook', '@lumpini.lookbook', 2022, 'green',
   'Sporty chic ใส่ได้ทั้งงานและ casual — สาวออฟฟิศที่ไปต่อ event หลังเลิกงาน',
   'Lumpini Lookbook สำหรับสาวที่อยากเปลี่ยนจากชุดงานเป็น cocktail ภายใน 5 นาที', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('phra-khanong-edit', 'Phra Khanong Edit', 'คุณอ๊อด', 'Phra Khanong', 'Phra Khanong · คลองเตย',
   'W District · BTS พระโขนง', 'พุธ-อาทิตย์ 13:00-21:00',
   'https://line.me/R/ti/p/@phrakhanongedit', '@phrakhanong.edit', 2021, 'black',
   'Alternative styles — เน้นความเป็นตัวเอง ทรงผิดธรรมดา สีไม่ตามฤดูกาล',
   'Phra Khanong Edit รับลูกค้าที่เบื่อชุดทั่วไป มาที่นี่จะเจอชุดที่ไม่มีในร้านอื่น', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('onnut-atelier', 'Onnut Atelier', 'คุณบี', 'Onnut', 'Onnut · พระโขนง',
   'Centre One Onnut · BTS อ่อนนุช', 'จันทร์-อาทิตย์ 10:30-20:00',
   'https://line.me/R/ti/p/@onnutatelier', '@onnut.atelier', 2020, 'ivory',
   'ชุดราคาเข้าถึงได้ในย่านอ่อนนุช — ครอบคลุมงานหลายประเภท',
   'Onnut Atelier เกิดจากดีไซเนอร์ที่อยากเปิดร้านในย่านชานเมืองให้คนใกล้บ้านเข้าถึงง่าย', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('yaowarat-heritage', 'Yaowarat Heritage', 'คุณเล้ง', 'Yaowarat', 'Yaowarat · สัมพันธวงศ์',
   'ถนนเยาวราช · MRT วัดมังกร', 'จันทร์-อาทิตย์ 10:00-19:00',
   'https://line.me/R/ti/p/@yaowaratheritage', '@yaowarat.heritage', 2012, 'red',
   'ชุดเจ้าสาวจีน-ไทย แบบประเพณี Tea ceremony, ฉีพ้าว, ม้งกัว',
   'Yaowarat Heritage สืบทอดประเพณีชุดจีน-ไทย รุ่น 3 ของครอบครัวที่ทำชุดเจ้าสาวจีน', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('wireless-couture', 'Wireless Couture', 'คุณเอม', 'Wireless', 'Wireless · ปทุมวัน',
   'All Seasons Place · BTS เพลินจิต', 'จันทร์-ศุกร์ 10:00-19:00',
   'https://line.me/R/ti/p/@wirelesscouture', '@wireless.couture', 2016, 'navy',
   'ชุดทางการ classic สำหรับ embassy events และ diplomatic dinners',
   'Wireless Couture ตั้งใกล้สถานทูต ลูกค้าหลักคือภรรยานักการทูตและนักธุรกิจอินเตอร์', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('soi-49-studio', 'Soi 49 Studio', 'คุณกุ้ง', 'Phrom Phong', 'Sukhumvit 49 · พร้อมพงษ์',
   'Sukhumvit Soi 49/12 · BTS พร้อมพงษ์', 'จันทร์-เสาร์ 12:00-20:00',
   'https://line.me/R/ti/p/@soi49studio', '@soi49.studio', 2021, 'purple',
   'Modern Thai designers under one roof — รวมหลายแบรนด์ Thai contemporary',
   'Soi 49 Studio เป็น showroom ของ 5 แบรนด์ดีไซเนอร์ไทยร่วมสมัย', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('surawong-suite', 'Surawong Suite', 'คุณซู', 'Surawong', 'Surawong · บางรัก',
   'ถนนสุรวงศ์ · BTS ศาลาแดง', 'จันทร์-เสาร์ 11:00-19:00',
   'https://line.me/R/ti/p/@surawongsuite', '@surawong.suite', 2018, 'red',
   'Eveningwear specialty — gowns เท่านั้น ราคา premium',
   'Surawong Suite รับเฉพาะลูกค้าที่ต้องการ gown สำหรับงานสำคัญ มี private styling', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sathorn-soiree', 'Sathorn Soiree', 'คุณป้อ', 'Sathorn', 'Sathorn · สาทร',
   'ถนนสาทรเหนือ · BTS ช่องนนทรี', 'พุธ-อาทิตย์ 13:00-20:00',
   'https://line.me/R/ti/p/@sathornsoiree', '@sathorn.soiree', 2022, 'purple',
   'Cocktail party specialist — ชุดสั้น สีเด่น ทรงทันสมัย',
   'Sathorn Soiree เน้นกลุ่มลูกค้าที่ต้องไปงาน cocktail หลายๆ งานต่อเดือน', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sukhumvit-couture', 'Sukhumvit Couture', 'คุณตา', 'Phrom Phong', 'EmQuartier · พร้อมพงษ์',
   'EmQuartier (ชั้น 4) · BTS พร้อมพงษ์', 'ทุกวัน 10:00-22:00',
   'https://line.me/R/ti/p/@sukhumvitcouture', '@sukhumvit.couture', 2014, 'ivory',
   'Mainstream luxury — แบรนด์ตปท.นำเข้า บริการเช่าและขาย',
   'Sukhumvit Couture นำเข้าชุดจาก Milan, Paris, NY ให้เช่าก่อนผู้ที่อยากซื้อ', false, 'live')
on conflict (slug) do nothing;

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('closet-at-park', 'The Closet at Park', 'คุณมิว', 'Lumpini', 'Lumpini Park · ปทุมวัน',
   'ใกล้ Lumpini Park · MRT ลุมพินี', 'นัดล่วงหน้าเท่านั้น',
   'https://line.me/R/ti/p/@closetatpark', '@theclosetatpark', 2023, 'rose',
   'Community closet — เกิดจากกลุ่มแม่บ้านที่จัดเก็บชุดร่วมกันให้เพื่อนเช่า',
   'The Closet at Park เริ่มจากกลุ่มเพื่อนแม่บ้าน 10 คนที่นำชุดมาเก็บไว้ในที่เดียว', false, 'live')
on conflict (slug) do nothing;

-- Backfill district/subdistrict/postal_code from area_key
do $$
declare pair record;
begin
  for pair in select * from (values
    ('Thonglor',       'วัฒนา',       'คลองตันเหนือ', '10110'),
    ('Phrom Phong',    'วัฒนา',       'คลองตันเหนือ', '10110'),
    ('Watthana',       'วัฒนา',       'คลองตันเหนือ', '10110'),
    ('Asok',           'วัฒนา',       'คลองเตยเหนือ', '10110'),
    ('Ekkamai',        'วัฒนา',       'พระโขนงเหนือ', '10110'),
    ('Sukhumvit 11',   'คลองเตย',     'คลองเตย',      '10110'),
    ('Phra Khanong',   'พระโขนง',     'บางจาก',       '10260'),
    ('Bang Na',        'บางนา',       'บางนาเหนือ',   '10260'),
    ('Onnut',          'สวนหลวง',     'อ่อนนุช',      '10250'),
    ('Siam',           'ปทุมวัน',     'ปทุมวัน',      '10330'),
    ('Chitlom',        'ปทุมวัน',     'ลุมพินี',      '10330'),
    ('Ploenchit',      'ปทุมวัน',     'ลุมพินี',      '10330'),
    ('Wireless',       'ปทุมวัน',     'ลุมพินี',      '10330'),
    ('Lumpini',        'ปทุมวัน',     'ลุมพินี',      '10330'),
    ('Pratunam',       'ราชเทวี',     'ถนนเพชรบุรี',  '10400'),
    ('Phaya Thai',     'พญาไท',       'สามเสนใน',     '10400'),
    ('Ari',            'พญาไท',       'สามเสนใน',     '10400'),
    ('Ratchadaphisek', 'ดินแดง',      'รัชดาภิเษก',   '10400'),
    ('Sathorn',        'สาทร',        'ทุ่งวัดดอน',   '10120'),
    ('Silom',          'บางรัก',      'สีลม',         '10500'),
    ('Bangrak',        'บางรัก',      'บางรัก',       '10500'),
    ('Sala Daeng',     'บางรัก',      'สีลม',         '10500'),
    ('Surawong',       'บางรัก',      'สุริยวงศ์',    '10500'),
    ('Charoenkrung',   'บางรัก',      'บางรัก',       '10500'),
    ('Yaowarat',       'สัมพันธวงศ์', 'จักรวรรดิ',    '10100')
  ) as t(area_key_v, district_v, subdistrict_v, postal_v)
  loop
    update boutiques
       set district    = pair.district_v,
           subdistrict = pair.subdistrict_v,
           postal_code = pair.postal_v
     where area_key = pair.area_key_v
       and district is null;
  end loop;
end $$;

-- ===========================================================
-- 14) SEED: DRESSES (~60 listings across boutiques)
-- ===========================================================

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-silk-midi', 'Rose Silk Midi', 'Atelier Bangkok', id, 'Siam Couture',
  'S', 'rose', 1800, 8000,
  'ชุดเดรสผ้าซิลค์สีกุหลาบ ทรง midi คอวี เหมาะกับงานเลี้ยงค่ำ งานหมั้น หรือถ่ายภาพ pre-wedding',
  ARRAY['engagement','evening'], 'https://line.me/R/ti/p/@siamcouture',
  'free', false, false, 'live', true
from boutiques where slug = 'siam-couture' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-pleated-gown', 'Ivory Pleated Gown', 'Praewa Studio', id, 'Thonglor Atelier',
  'M', 'ivory', 2400, 12000,
  'ชุดราตรีสีงาช้าง ผ้าพลีทอัดร้อน ทรงยาวพื้น เหมาะกับงานแต่งงาน งานกาล่า',
  ARRAY['wedding','gala'], 'https://line.me/R/ti/p/@thonglor',
  'free', false, false, 'live', true
from boutiques where slug = 'thonglor-atelier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'emerald-velvet-cocktail', 'Emerald Velvet Cocktail', 'Asava', id, 'Siam Couture',
  'S', 'green', 2000, 10000,
  'เดรสผ้ากำมะหยี่สีมรกต ทรงเข้ารูป ความยาวเหนือเข่า เหมาะกับงานค็อกเทล',
  ARRAY['cocktail','party'], 'https://line.me/R/ti/p/@siamcouture',
  'free', false, false, 'live', true
from boutiques where slug = 'siam-couture' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'noir-silk-slip', 'Noir Silk Slip', 'Kloset', id, 'Thonglor Atelier',
  'M', 'black', 1600, 8000,
  'ชุดสลิปเดรสผ้าซิลค์สีดำ สายเดี่ยว ทรงเรียบหรู ใส่ได้หลายโอกาส',
  ARRAY['evening','cocktail','party'], 'https://line.me/R/ti/p/@thonglor',
  'free', false, false, 'live', true
from boutiques where slug = 'thonglor-atelier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'blush-tulle-ball', 'Blush Tulle Ball Gown', 'Theatre', id, 'Siam Couture',
  'S', 'rose', 3200, 15000,
  'ชุดบอลกาวน์ผ้าทูลล์สีชมพูบลัช กระโปรงพอง เหมาะกับงานหมั้น',
  ARRAY['engagement','gala'], 'https://line.me/R/ti/p/@siamcouture',
  'featured', true, false, 'live', true
from boutiques where slug = 'siam-couture' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini', 'Navy Sequin Mini', 'Disaya', id, 'Thonglor Atelier',
  'S', 'navy', 1900, 9000,
  'เดรสสั้นสีกรมท่า ผ้าปักเลื่อม ใส่ออกงานเลี้ยง งานปาร์ตี้ได้เก๋',
  ARRAY['party','evening'], 'https://line.me/R/ti/p/@thonglor',
  'free', false, false, 'live', true
from boutiques where slug = 'thonglor-atelier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'champagne-lace-midi', 'Champagne Lace Midi', 'Asava', id, 'Siam Couture',
  'M', 'ivory', 2200, 11000,
  'ชุดลูกไม้สีแชมเปญ ทรง midi แขนยาว เหมาะงานแต่งช่วงเช้า',
  ARRAY['wedding','engagement'], 'https://line.me/R/ti/p/@siamcouture',
  'free', false, false, 'live', true
from boutiques where slug = 'siam-couture' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'scarlet-satin-column', 'Scarlet Satin Column', 'Kloset', id, 'Thonglor Atelier',
  'S', 'red', 2600, 13000,
  'ชุดราตรีผ้าซาตินสีแดงสด ทรงคอลัมน์ เปิดหลัง',
  ARRAY['evening','gala'], 'https://line.me/R/ti/p/@thonglor',
  'boost', false, true, 'live', true
from boutiques where slug = 'thonglor-atelier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'powder-blue-tea', 'Powder Blue Tea Dress', 'Theatre', id, 'Siam Couture',
  'M', 'blue', 1700, 8500,
  'เดรสสีฟ้าพาวเดอร์ ทรง tea length ผ้าชีฟอง บางเบา',
  ARRAY['casual','wedding'], 'https://line.me/R/ti/p/@siamcouture',
  'free', false, false, 'live', true
from boutiques where slug = 'siam-couture' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'onyx-tuxedo-jumpsuit', 'Onyx Tuxedo Jumpsuit', 'Disaya', id, 'Thonglor Atelier',
  'S', 'black', 2100, 10000,
  'จัมป์สูทสีดำสไตล์ทักซิโด้ ตัดเย็บเข้ารูป โอกาสทางการ',
  ARRAY['work','party'], 'https://line.me/R/ti/p/@thonglor',
  'free', false, false, 'live', true
from boutiques where slug = 'thonglor-atelier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'lilac-organza-gown', 'Lilac Organza Gown', 'Praewa Studio', id, 'Siam Couture',
  'M', 'purple', 2800, 13000,
  'ชุดราตรีผ้าออร์แกนซ่าสีม่วงไลแลค ทรงเอ-ไลน์',
  ARRAY['engagement','wedding'], 'https://line.me/R/ti/p/@siamcouture',
  'free', false, false, 'live', true
from boutiques where slug = 'siam-couture' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'sage-linen-suit', 'Sage Linen Suit Set', 'Asava', id, 'Thonglor Atelier',
  'M', 'green', 1500, 7500,
  'เซ็ตเสื้อเบลเซอร์กับกระโปรงผ้าลินินสีเสจ ใส่ทำงาน',
  ARRAY['work','casual'], 'https://line.me/R/ti/p/@thonglor',
  'free', false, false, 'live', true
from boutiques where slug = 'thonglor-atelier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini-2', 'Navy Sequin Mini', 'Local Atelier', id, 'Ekkamai Edit',
  'M', 'navy', 2000, 10000,
  'Sequin Mini จาก Ekkamai Edit — ทรงทันสมัย เหมาะงาน party',
  ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@ekkamai.edit',
  'free', false, false, 'live', true
from boutiques where slug = 'ekkamai-edit' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'sage-chiffon-tea', 'Sage Chiffon Tea Dress', 'Bangkok Designer', id, 'Ekkamai Edit',
  'L', 'green', 1700, 8500,
  'Chiffon Tea Dress จาก Ekkamai Edit — เบา สบาย ลำลอง',
  ARRAY['casual'], 'https://line.me/R/ti/p/@ekkamai.edit',
  'free', false, false, 'live', true
from boutiques where slug = 'ekkamai-edit' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-linen-suit', 'Ivory Linen Suit', '— Curated —', id, 'Ekkamai Edit',
  'S', 'ivory', 1800, 9000,
  'Linen Suit จาก Ekkamai Edit — เรียบ หรู ใส่ทำงาน',
  ARRAY['work','casual'], 'https://line.me/R/ti/p/@ekkamai.edit',
  'free', false, false, 'live', true
from boutiques where slug = 'ekkamai-edit' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-tulle-cocktail', 'Ivory Tulle Cocktail', 'Bangkok Designer', id, 'Phrom Phong Bridal',
  'S', 'ivory', 2300, 11500,
  'Tulle Cocktail จาก Phrom Phong Bridal — งานค็อกเทล elegant',
  ARRAY['cocktail'], 'https://line.me/R/ti/p/@phromphongbridal',
  'boost', false, true, 'live', true
from boutiques where slug = 'phrom-phong-bridal' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-silk-slip', 'Noir Silk Slip', '— Curated —', id, 'Ari Vintage Closet',
  'L', 'black', 2000, 10000,
  'Silk Slip จาก Ari Vintage Closet — วินเทจ สวย งานค่ำ',
  ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@aricloset',
  'featured', true, false, 'live', true
from boutiques where slug = 'ari-vintage-closet' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-lace-midi', 'Rose Lace Midi', '— Studio —', id, 'Ari Vintage Closet',
  'S', 'rose', 2600, 13000,
  'Lace Midi จาก Ari Vintage Closet — ลูกไม้สีชมพู งานแต่ง',
  ARRAY['wedding'], 'https://line.me/R/ti/p/@aricloset',
  'free', false, false, 'live', true
from boutiques where slug = 'ari-vintage-closet' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-satin-column', 'Navy Satin Column', '— Studio —', id, 'Asok Style Co.',
  'M', 'navy', 3000, 15000,
  'Satin Column จาก Asok Style Co. — งานกาล่า formal',
  ARRAY['gala'], 'https://line.me/R/ti/p/@asokstyle',
  'free', false, false, 'live', true
from boutiques where slug = 'asok-style-co' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-organza-ball-gown', 'Rose Organza Ball Gown', 'Local Atelier', id, 'Asok Style Co.',
  'L', 'rose', 2800, 14000,
  'Organza Ball Gown จาก Asok Style Co. — งานหมั้น กาล่า',
  ARRAY['engagement','gala'], 'https://line.me/R/ti/p/@asokstyle',
  'free', false, false, 'live', true
from boutiques where slug = 'asok-style-co' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-sequin-mini', 'Noir Sequin Mini', 'Local Atelier', id, 'Sathorn Atelier',
  'S', 'black', 1800, 9000,
  'Sequin Mini จาก Sathorn Atelier — ปาร์ตี้ ค็อกเทล สีดำสง่า',
  ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@sathornatelier',
  'free', false, false, 'live', true
from boutiques where slug = 'sathorn-atelier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-tulle-cocktail', 'Rose Tulle Cocktail', 'Bangkok Designer', id, 'Silom Eveningwear',
  'L', 'rose', 2100, 10500,
  'Tulle Cocktail จาก Silom Eveningwear — สีชมพู งานค็อกเทล',
  ARRAY['cocktail'], 'https://line.me/R/ti/p/@silomeveningwear',
  'free', false, false, 'live', true
from boutiques where slug = 'silom-eveningwear' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-crepe-jumpsuit', 'Crimson Crepe Jumpsuit', '— Curated —', id, 'Silom Eveningwear',
  'S', 'red', 1900, 9500,
  'Crepe Jumpsuit จาก Silom Eveningwear — แดง ทำงาน ปาร์ตี้',
  ARRAY['work','party'], 'https://line.me/R/ti/p/@silomeveningwear',
  'free', false, false, 'live', true
from boutiques where slug = 'silom-eveningwear' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-silk-slip', 'Ivory Silk Slip', '— Curated —', id, 'Ploenchit Premier',
  'M', 'ivory', 1700, 8500,
  'Silk Slip จาก Ploenchit Premier — สีงาช้าง งานค่ำ',
  ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@ploenchitpremier',
  'free', false, false, 'live', true
from boutiques where slug = 'ploenchit-premier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-lace-midi-2', 'Rose Lace Midi', '— Studio —', id, 'Ploenchit Premier',
  'L', 'rose', 2300, 11500,
  'Lace Midi จาก Ploenchit Premier — ลูกไม้ งานแต่ง',
  ARRAY['wedding'], 'https://line.me/R/ti/p/@ploenchitpremier',
  'free', false, false, 'live', true
from boutiques where slug = 'ploenchit-premier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-velvet-gown', 'Navy Velvet Gown', 'Local Atelier', id, 'Ploenchit Premier',
  'S', 'navy', 3100, 15500,
  'Velvet Gown จาก Ploenchit Premier — กำมะหยี่ กรมท่า งานกาล่า',
  ARRAY['gala','evening'], 'https://line.me/R/ti/p/@ploenchitpremier',
  'free', false, false, 'live', true
from boutiques where slug = 'ploenchit-premier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-satin-column', 'Crimson Satin Column', '— Studio —', id, 'Watthana Bridal House',
  'S', 'red', 2700, 13500,
  'Satin Column จาก Watthana Bridal — แดง งานกาล่า',
  ARRAY['gala'], 'https://line.me/R/ti/p/@watthanabridal',
  'free', false, false, 'live', true
from boutiques where slug = 'watthana-bridal' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini-3', 'Navy Sequin Mini', 'Local Atelier', id, 'The Dress Library',
  'L', 'navy', 2200, 11000,
  'Sequin Mini จาก The Dress Library — กรมท่า ปาร์ตี้',
  ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@dresslibrary',
  'boost', false, true, 'live', true
from boutiques where slug = 'the-dress-library' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'sage-chiffon-tea-2', 'Sage Chiffon Tea Dress', 'Bangkok Designer', id, 'The Dress Library',
  'S', 'green', 1900, 9500,
  'Chiffon Tea Dress จาก The Dress Library — เสจ ลำลอง',
  ARRAY['casual'], 'https://line.me/R/ti/p/@dresslibrary',
  'free', false, false, 'live', true
from boutiques where slug = 'the-dress-library' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-tulle-cocktail-2', 'Rose Tulle Cocktail', 'Bangkok Designer', id, 'Chitlom Boutique',
  'M', 'rose', 2500, 12500,
  'Tulle Cocktail จาก Chitlom Boutique — ชมพู งานค็อกเทล',
  ARRAY['cocktail'], 'https://line.me/R/ti/p/@chitlomboutique',
  'free', false, false, 'live', true
from boutiques where slug = 'chitlom-boutique' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-crepe-jumpsuit', 'Noir Crepe Jumpsuit', '— Curated —', id, 'Chitlom Boutique',
  'L', 'black', 1700, 8500,
  'Crepe Jumpsuit จาก Chitlom Boutique — ดำ ทำงาน ปาร์ตี้',
  ARRAY['work','party'], 'https://line.me/R/ti/p/@chitlomboutique',
  'free', false, false, 'live', true
from boutiques where slug = 'chitlom-boutique' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'lilac-beaded-gown', 'Lilac Beaded Gown', '— Studio —', id, 'Chitlom Boutique',
  'S', 'purple', 3100, 15500,
  'Beaded Gown จาก Chitlom Boutique — งานกาล่า ประดับลูกปัด',
  ARRAY['gala'], 'https://line.me/R/ti/p/@chitlomboutique',
  'free', false, false, 'live', true
from boutiques where slug = 'chitlom-boutique' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-silk-slip', 'Navy Silk Slip', '— Curated —', id, 'Sukhumvit 11 Studio',
  'S', 'navy', 1500, 7500,
  'Silk Slip จาก Sukhumvit 11 Studio — กรมท่า งานค่ำ',
  ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@suk11studio',
  'free', false, false, 'live', true
from boutiques where slug = 'sukhumvit-11' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-satin-column-2', 'Crimson Satin Column', '— Studio —', id, 'Sala Daeng Couture',
  'L', 'red', 2400, 12000,
  'Satin Column จาก Sala Daeng Couture — แดง งานกาล่า',
  ARRAY['gala'], 'https://line.me/R/ti/p/@saladaengcouture',
  'featured', true, false, 'live', true
from boutiques where slug = 'sala-daeng-couture' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'lilac-organza-ball-gown', 'Lilac Organza Ball Gown', 'Local Atelier', id, 'Sala Daeng Couture',
  'S', 'purple', 3100, 15500,
  'Organza Ball Gown จาก Sala Daeng Couture — งานหมั้น กาล่า',
  ARRAY['engagement','gala'], 'https://line.me/R/ti/p/@saladaengcouture',
  'free', false, false, 'live', true
from boutiques where slug = 'sala-daeng-couture' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini-4', 'Navy Sequin Mini', 'Local Atelier', id, 'Bangrak Bridal Co.',
  'M', 'navy', 2000, 10000,
  'Sequin Mini จาก Bangrak Bridal Co. — กรมท่า ปาร์ตี้',
  ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@bangrakbridal',
  'free', false, false, 'live', true
from boutiques where slug = 'bangrak-bridal' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'lilac-tulle-cocktail', 'Lilac Tulle Cocktail', 'Bangkok Designer', id, 'Pra Sai Couture',
  'S', 'purple', 2300, 11500,
  'Tulle Cocktail จาก Pra Sai Couture — ม่วง งานค็อกเทล',
  ARRAY['cocktail'], 'https://line.me/R/ti/p/@prasaicouture',
  'free', false, false, 'live', true
from boutiques where slug = 'pra-sai-couture' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-silk-slip-2', 'Noir Silk Slip', '— Curated —', id, 'Sai Mai Designs',
  'L', 'black', 2000, 10000,
  'Silk Slip จาก Sai Mai Designs — ดำ งานค่ำ',
  ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@saimaidesigns',
  'free', false, false, 'live', true
from boutiques where slug = 'sai-mai' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-lace-midi-3', 'Rose Lace Midi', '— Studio —', id, 'Sai Mai Designs',
  'S', 'rose', 2600, 13000,
  'Lace Midi จาก Sai Mai Designs — ชมพู งานแต่ง',
  ARRAY['wedding'], 'https://line.me/R/ti/p/@saimaidesigns',
  'free', false, false, 'live', true
from boutiques where slug = 'sai-mai' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-satin-column-3', 'Crimson Satin Column', '— Studio —', id, 'Bangkok Bridal Studio',
  'M', 'red', 3000, 15000,
  'Satin Column จาก Bangkok Bridal Studio — แดง งานกาล่า',
  ARRAY['gala'], 'https://line.me/R/ti/p/@bkkbridal',
  'boost', false, true, 'live', true
from boutiques where slug = 'bangkok-bridal-studio' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-organza-ball-gown-2', 'Rose Organza Ball Gown', 'Local Atelier', id, 'Bangkok Bridal Studio',
  'L', 'rose', 2800, 14000,
  'Organza Ball Gown จาก Bangkok Bridal Studio — งานหมั้น กาล่า',
  ARRAY['engagement','gala'], 'https://line.me/R/ti/p/@bkkbridal',
  'free', false, false, 'live', true
from boutiques where slug = 'bangkok-bridal-studio' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini-5', 'Navy Sequin Mini', 'Local Atelier', id, 'Closet Collective',
  'S', 'navy', 1800, 9000,
  'Sequin Mini จาก Closet Collective — กรมท่า ปาร์ตี้',
  ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@closetcollective',
  'free', false, false, 'live', true
from boutiques where slug = 'closet-collective' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-tulle-cocktail-3', 'Rose Tulle Cocktail', 'Bangkok Designer', id, 'Riverside Atelier',
  'L', 'rose', 2100, 10500,
  'Tulle Cocktail จาก Riverside Atelier — ชมพู งานค็อกเทล',
  ARRAY['cocktail'], 'https://line.me/R/ti/p/@riversideatelier',
  'free', false, false, 'live', true
from boutiques where slug = 'riverside-atelier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-silk-slip-3', 'Noir Silk Slip', '— Curated —', id, 'Lumpini Lookbook',
  'M', 'black', 1700, 8500,
  'Silk Slip จาก Lumpini Lookbook — ดำ งานค่ำ',
  ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@lumpinilookbook',
  'free', false, false, 'live', true
from boutiques where slug = 'lumpini-lookbook' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-velvet-gown-2', 'Navy Velvet Gown', 'Local Atelier', id, 'Lumpini Lookbook',
  'S', 'navy', 3100, 15500,
  'Velvet Gown จาก Lumpini Lookbook — กรมท่า กาล่า',
  ARRAY['gala','evening'], 'https://line.me/R/ti/p/@lumpinilookbook',
  'free', false, false, 'live', true
from boutiques where slug = 'lumpini-lookbook' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-satin-column', 'Noir Satin Column', '— Studio —', id, 'Phra Khanong Edit',
  'S', 'black', 2700, 13500,
  'Satin Column จาก Phra Khanong Edit — ดำ งานกาล่า',
  ARRAY['gala'], 'https://line.me/R/ti/p/@phrakhanongedit',
  'free', false, false, 'live', true
from boutiques where slug = 'phra-khanong-edit' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini-6', 'Navy Sequin Mini', 'Local Atelier', id, 'Onnut Atelier',
  'L', 'navy', 2200, 11000,
  'Sequin Mini จาก Onnut Atelier — กรมท่า ปาร์ตี้',
  ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@onnutatelier',
  'featured', true, false, 'live', true
from boutiques where slug = 'onnut-atelier' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-tulle-cocktail-4', 'Rose Tulle Cocktail', 'Bangkok Designer', id, 'Yaowarat Heritage',
  'M', 'rose', 2500, 12500,
  'Tulle Cocktail จาก Yaowarat Heritage — ชมพู งานค็อกเทล',
  ARRAY['cocktail'], 'https://line.me/R/ti/p/@yaowaratheritage',
  'free', false, false, 'live', true
from boutiques where slug = 'yaowarat-heritage' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-silk-slip-2', 'Navy Silk Slip', '— Curated —', id, 'Wireless Couture',
  'S', 'navy', 1500, 7500,
  'Silk Slip จาก Wireless Couture — กรมท่า งานค่ำ',
  ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@wirelesscouture',
  'boost', false, true, 'live', true
from boutiques where slug = 'wireless-couture' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-satin-column-4', 'Crimson Satin Column', '— Studio —', id, 'Soi 49 Studio',
  'L', 'red', 2400, 12000,
  'Satin Column จาก Soi 49 Studio — แดง งานกาล่า',
  ARRAY['gala'], 'https://line.me/R/ti/p/@soi49studio',
  'free', false, false, 'live', true
from boutiques where slug = 'soi-49-studio' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-sequin-mini', 'Crimson Sequin Mini', 'Local Atelier', id, 'Surawong Suite',
  'M', 'red', 2000, 10000,
  'Sequin Mini จาก Surawong Suite — แดง ปาร์ตี้',
  ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@surawongsuite',
  'free', false, false, 'live', true
from boutiques where slug = 'surawong-suite' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'lilac-tulle-cocktail-2', 'Lilac Tulle Cocktail', 'Bangkok Designer', id, 'Sathorn Soiree',
  'S', 'purple', 2300, 11500,
  'Tulle Cocktail จาก Sathorn Soiree — ม่วง งานค็อกเทล',
  ARRAY['cocktail'], 'https://line.me/R/ti/p/@sathornsoiree',
  'free', false, false, 'live', true
from boutiques where slug = 'sathorn-soiree' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-silk-slip-2', 'Ivory Silk Slip', '— Curated —', id, 'Sukhumvit Couture',
  'L', 'ivory', 2000, 10000,
  'Silk Slip จาก Sukhumvit Couture — งาช้าง งานค่ำ',
  ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@sukhumvitcouture',
  'free', false, false, 'live', true
from boutiques where slug = 'sukhumvit-couture' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-satin-column-5', 'Crimson Satin Column', '— Studio —', id, 'The Closet at Park',
  'M', 'red', 3000, 15000,
  'Satin Column จาก The Closet at Park — แดง งานกาล่า',
  ARRAY['gala'], 'https://line.me/R/ti/p/@closetatpark',
  'free', false, false, 'live', true
from boutiques where slug = 'closet-at-park' on conflict (slug) do nothing;

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-organza-ball-gown-3', 'Rose Organza Ball Gown', 'Local Atelier', id, 'The Closet at Park',
  'L', 'rose', 2800, 14000,
  'Organza Ball Gown จาก The Closet at Park — งานหมั้น',
  ARRAY['engagement','gala'], 'https://line.me/R/ti/p/@closetatpark',
  'free', false, false, 'live', true
from boutiques where slug = 'closet-at-park' on conflict (slug) do nothing;
