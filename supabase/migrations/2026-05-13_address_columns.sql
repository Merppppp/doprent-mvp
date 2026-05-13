-- ===========================================================
-- DopRent — Add structured Thai address columns to boutiques (2026-05-13)
-- Required for proper address capture + future geocoding (lat/lng).
-- Safe to re-run.
-- ===========================================================

alter table boutiques
  add column if not exists house_no    text,
  add column if not exists street      text,
  add column if not exists subdistrict text,
  add column if not exists district    text,
  add column if not exists province    text not null default 'กรุงเทพมหานคร',
  add column if not exists postal_code text;

-- Index for filtering boutiques by district (used by /browse later)
create index if not exists idx_boutiques_district on boutiques (district);

-- Backfill existing boutiques: derive `district` from area_label keywords if possible.
-- (Only sets district for rows where area_label clearly maps to a known district.)
-- This is best-effort — admin can edit each row in /admin/boutiques afterwards.
do $$
declare
  pair record;
begin
  for pair in select * from (values
    ('Thonglor', 'วัฒนา', 'คลองตันเหนือ', '10110'),
    ('Phrom Phong', 'วัฒนา', 'คลองตันเหนือ', '10110'),
    ('Watthana', 'วัฒนา', 'คลองตันเหนือ', '10110'),
    ('Asok', 'วัฒนา', 'คลองเตยเหนือ', '10110'),
    ('Ekkamai', 'วัฒนา', 'พระโขนงเหนือ', '10110'),
    ('Phra Khanong', 'พระโขนง', 'บางจาก', '10260'),
    ('Bang Na', 'บางนา', 'บางนาเหนือ', '10260'),
    ('Onnut', 'สวนหลวง', 'อ่อนนุช', '10250'),
    ('Siam', 'ปทุมวัน', 'ปทุมวัน', '10330'),
    ('Chitlom', 'ปทุมวัน', 'ลุมพินี', '10330'),
    ('Ploenchit', 'ปทุมวัน', 'ลุมพินี', '10330'),
    ('Wireless', 'ปทุมวัน', 'ลุมพินี', '10330'),
    ('Lumpini', 'ปทุมวัน', 'ลุมพินี', '10330'),
    ('Pratunam', 'ราชเทวี', 'ถนนเพชรบุรี', '10400'),
    ('Phaya Thai', 'พญาไท', 'สามเสนใน', '10400'),
    ('Sathorn', 'สาทร', 'ทุ่งวัดดอน', '10120'),
    ('Silom', 'บางรัก', 'สีลม', '10500'),
    ('Bangrak', 'บางรัก', 'บางรัก', '10500'),
    ('Sala Daeng', 'บางรัก', 'สีลม', '10500'),
    ('Surawong', 'บางรัก', 'สุริยวงศ์', '10500'),
    ('Charoenkrung', 'บางรัก', 'บางรัก', '10500'),
    ('Yaowarat', 'สัมพันธวงศ์', 'จักรวรรดิ', '10100'),
    ('Ari', 'พญาไท', 'สามเสนใน', '10400'),
    ('Ratchadaphisek', 'ดินแดง', 'รัชดาภิเษก', '10400'),
    ('Sukhumvit 11', 'คลองเตย', 'คลองเตย', '10110')
  ) as t(area_key_v, district_v, subdistrict_v, postal_v)
  loop
    update boutiques
       set district = pair.district_v,
           subdistrict = pair.subdistrict_v,
           postal_code = pair.postal_v
     where area_key = pair.area_key_v
       and district is null;
  end loop;
end $$;
