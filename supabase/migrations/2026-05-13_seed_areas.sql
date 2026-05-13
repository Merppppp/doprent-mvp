-- ===========================================================
-- DopRent — Seed areas table (2026-05-13)
-- Run if /sell/signup dropdown shows no Bangkok areas
-- Safe to re-run (uses on conflict do nothing)
-- ===========================================================

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
