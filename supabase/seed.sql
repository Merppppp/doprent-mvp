-- ===========================================================
-- DopRent — Seed data: 30 boutiques + 69 dress listings
-- Run AFTER schema.sql. Idempotent (uses ON CONFLICT DO NOTHING).
-- ===========================================================

-- DopRent seed data: 30 boutiques

-- Use a deterministic UUID generator so dresses can reference by name
-- We'll insert by slug then look up id when inserting dresses

insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('siam-couture', 'Siam Couture', 'คุณนิด', 'Siam', 'Siam · ปทุมวัน', 'ชั้น 3, Siam Paragon · BTS สยาม', 'จันทร์-เสาร์ 11:00-19:00', 'https://line.me/R/ti/p/@siamcouture', '@siamcouture.bkk', 2018, 'rose', 'ชุดราตรีและงานหมั้นโทนหวานคลาสสิก ผ้าซิลค์ ลูกไม้ ออร์แกนซ่า — คัดจากดีไซเนอร์ไทย', 'Siam Couture เริ่มจากร้านชุดเจ้าสาวเล็กๆ ในสยามตั้งแต่ปี 2018 จุดยืนของเราคือคัดชุดที่หาที่ไหนไม่ได้ ลูกค้าหลักคือเจ้าสาว เพื่อนเจ้าสาว และคนที่กำลังจะไปงานพิเศษ', true, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('thonglor-atelier', 'Thonglor Atelier', 'คุณแอน', 'Thonglor', 'Thonglor · วัฒนา', 'Eight Thonglor (ชั้น 2), ซอย 13 · BTS ทองหล่อ', 'ทุกวัน 12:00-20:00', 'https://line.me/R/ti/p/@thonglor', '@thonglor.atelier', 2020, 'navy', 'ดีไซน์โมเดิร์น ทรงคม สีสะดุดตา — งานเลี้ยงค่ำ ปาร์ตี้ ค็อกเทล หรือชุดทำงาน statement', 'Thonglor Atelier ก่อตั้งปี 2020 คัดดีไซเนอร์ที่มี vision ชัด — Disaya, Kloset, Asava เปิดทุกวันเพราะเข้าใจว่างานในกรุงเทพไม่รออาทิตย์', true, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('ekkamai-edit', 'Ekkamai Edit', 'คุณเฟิร์น', 'Ekkamai', 'Ekkamai · วัฒนา', 'Ekkamai 12 · BTS เอกมัย', 'จันทร์-เสาร์ 12:00-19:00', 'https://line.me/R/ti/p/@ekkamai.edit', '@ekkamai.edit', 2021, 'ivory', 'Modern minimalist — ผ้าโทนกลาง ทรงคอลัมน์สะอาดตา เหมาะกับสาวที่ชอบ understated luxury', 'Ekkamai Edit คัดเฉพาะชุดที่ออกแบบมาเรียบง่ายที่สุด ไม่ตามเทรนด์ ไม่ปรุงแต่งเกิน เน้นผ้าและทรง', true, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('phrom-phong-bridal', 'Phrom Phong Bridal', 'คุณพิม', 'Phrom Phong', 'Phrom Phong · คลองเตย', 'Emporium Tower (ชั้น 3) · BTS พร้อมพงษ์', 'จันทร์-อาทิตย์ 11:00-20:00', 'https://line.me/R/ti/p/@phromphongbridal', '@phromphong.bridal', 2017, 'ivory', 'ชุดเจ้าสาวระดับพรีเมียม ผ้านำเข้าจากยุโรป งานปัก hand-made ทุกตัว', 'ร้านชุดเจ้าสาวเฉพาะทาง บริการ alteration ครบวงจร นัดล่วงหน้าเท่านั้น', true, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('ari-vintage-closet', 'Ari Vintage Closet', 'คุณกาย', 'Ari', 'Ari · พญาไท', 'Ari Soi 4 · BTS อารีย์', 'พุธ-อาทิตย์ 12:00-20:00', 'https://line.me/R/ti/p/@aricloset', '@ari.vintage.closet', 2020, 'purple', 'ชุดวินเทจสไตล์ 70-80s + ชุด re-imagined โดยดีไซเนอร์ไทยรุ่นใหม่', 'Ari Vintage Closet สะสมชุดวินเทจจากญี่ปุ่นและยุโรป ผสมกับงาน custom ของดีไซเนอร์ไทย', true, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('asok-style-co', 'Asok Style Co.', 'คุณเบลล์', 'Asok', 'Asok · คลองเตย', 'Terminal 21 (ชั้น 2) · BTS อโศก', 'ทุกวัน 11:00-21:00', 'https://line.me/R/ti/p/@asokstyle', '@asokstyleco', 2019, 'navy', 'ชุดทำงานและคอนเฟอเรนซ์ที่ดูเด่น เน้นผ้าและทรง mix-and-match', 'Asok Style Co. เกิดจาก consultant ที่อยากใส่ชุดดูดีในการประชุมโดยไม่ต้องซื้อใหม่', true, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sathorn-atelier', 'Sathorn Atelier', 'คุณภา', 'Sathorn', 'Sathorn · ยานนาวา', 'The Met Sathorn · BTS ช่องนนทรี', 'จันทร์-เสาร์ 10:30-19:00', 'https://line.me/R/ti/p/@sathornatelier', '@sathorn.atelier', 2018, 'black', 'ชุดราตรีคลาสสิก สไตล์ formal สำหรับ corporate gala และงาน diplomatic', 'Sathorn Atelier เน้นบริการลูกค้า expat และนักธุรกิจ ชุดสไตล์ international classic', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('silom-eveningwear', 'Silom Eveningwear', 'คุณนุ้ย', 'Silom', 'Silom · บางรัก', 'ถนนสีลม ซอย 12 · BTS ศาลาแดง', 'จันทร์-เสาร์ 11:00-19:30', 'https://line.me/R/ti/p/@silomeveningwear', '@silom.eveningwear', 2016, 'red', 'ชุดสีจัด ทรงเด่น ใส่ไปงานค่ำสำคัญ — แดง ทอง น้ำเงินเข้ม', 'ร้านชุดราตรีเก่าแก่ของสีลม คัดสีและทรงสำหรับคนที่ต้องการเด่นบนพรหมแดง', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('ploenchit-premier', 'Ploenchit Premier', 'คุณแคทเธอรีน', 'Ploenchit', 'Ploenchit · ปทุมวัน', 'Central Embassy (ชั้น 4) · BTS เพลินจิต', 'ทุกวัน 10:00-22:00', 'https://line.me/R/ti/p/@ploenchitpremier', '@ploenchit.premier', 2015, 'ivory', 'ดีไซเนอร์ระดับนานาชาติ — Valentino, Oscar de la Renta, Marchesa สำหรับ red carpet', 'Ploenchit Premier นำเข้าและให้เช่าชุดดีไซเนอร์ระดับโลก มี private viewing', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('watthana-bridal', 'Watthana Bridal House', 'คุณส้ม', 'Watthana', 'Watthana · สุขุมวิท', 'Sukhumvit 39 · BTS พร้อมพงษ์', 'นัดล่วงหน้าเท่านั้น', 'https://line.me/R/ti/p/@watthanabridal', '@watthana.bridalhouse', 2014, 'rose', 'ชุดเจ้าสาวสไตล์ Thai-Western fusion มีบริการตัดและแก้ไข', 'Watthana Bridal House เชี่ยวชาญการผสานชุดไทยประยุกต์กับ silhouette ตะวันตก', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('the-dress-library', 'The Dress Library', 'คุณป๊อบ', 'Thonglor', 'Thonglor · วัฒนา', 'Soi Thonglor 25 · BTS ทองหล่อ', 'จันทร์-อาทิตย์ 11:30-20:00', 'https://line.me/R/ti/p/@dresslibrary', '@thedresslibrary.bkk', 2022, 'ivory', 'Curated mix ชุดดีไซเนอร์หลายแบรนด์ในร้านเดียว — เปลี่ยน collection ทุก 2 เดือน', 'The Dress Library คือ shared closet ของผู้หญิง Bangkok สมัยใหม่ที่อยากเปลี่ยนชุดบ่อยโดยไม่สะสม', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('chitlom-boutique', 'Chitlom Boutique', 'คุณกิ๊ฟ', 'Chitlom', 'Chitlom · ปทุมวัน', 'Central Chidlom (ชั้น 2) · BTS ชิดลม', 'ทุกวัน 10:30-22:00', 'https://line.me/R/ti/p/@chitlomboutique', '@chitlom.boutique', 2019, 'rose', 'ชุดเช่าราคาเข้าถึงได้ ดีไซน์น่ารัก เหมาะกับสาวออฟฟิศที่อยากแต่งสวยทุกเดือน', 'Chitlom Boutique เน้นกลุ่ม first-jobber ที่อยากใส่ชุดสวยในงบประหยัด', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sukhumvit-11', 'Sukhumvit 11 Studio', 'คุณมิ้น', 'Sukhumvit 11', 'Sukhumvit 11 · วัฒนา', 'Sukhumvit Soi 11 · BTS นานา', 'พุธ-อาทิตย์ 14:00-22:00', 'https://line.me/R/ti/p/@suk11studio', '@sukhumvit11.studio', 2020, 'navy', 'ชุดปาร์ตี้และคลับสไตล์ Bangkok night life — sequin, leather, mesh', 'Sukhumvit 11 Studio ตั้งบนซอย night life ของเอเชีย เปิดบ่ายให้สาวๆ มาลองชุดก่อนปาร์ตี้', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sala-daeng-couture', 'Sala Daeng Couture', 'คุณนัท', 'Sala Daeng', 'Sala Daeng · บางรัก', 'ถนนคอนแวนต์ · BTS ศาลาแดง', 'จันทร์-เสาร์ 10:00-19:00', 'https://line.me/R/ti/p/@saladaengcouture', '@saladaeng.couture', 2017, 'ivory', 'ชุดคลาสสิกตลอดกาล ผ้าซิลค์ตัดเย็บประณีต — สำหรับงานทางการตลอดปี', 'Sala Daeng Couture สืบทอดจากร้านชุดเก่าของซอยคอนแวนต์ เน้นงาน hand-tailored', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('bangrak-bridal', 'Bangrak Bridal Co.', 'คุณแหม่ม', 'Bangrak', 'Bangrak · บางรัก', 'ถนนเจริญกรุง · MRT สามยอด', 'จันทร์-อาทิตย์ 10:00-19:00', 'https://line.me/R/ti/p/@bangrakbridal', '@bangrak.bridal', 2018, 'rose', 'ชุดเจ้าสาวราคามิตรภาพ ทั้งให้เช่าและตัดใหม่ — บริการคนรุ่นใหม่', 'Bangrak Bridal เกิดจากความเชื่อว่าวันแต่งงานไม่ควรกินงบเกินจำเป็น', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('pra-sai-couture', 'Pra Sai Couture', 'คุณปราชญ์', 'Sukhumvit 31', 'Sukhumvit 31 · วัฒนา', 'Sukhumvit 31 · BTS พร้อมพงษ์', 'นัดล่วงหน้า', 'https://line.me/R/ti/p/@prasaicouture', '@prasai.couture', 2021, 'purple', 'Thai contemporary — ผสานเทคนิคไทย-สากล ใช้ผ้าไหมไทยกับ silhouette modern', 'Pra Sai Couture สนับสนุนช่างผ้าไหมไทยและดีไซเนอร์รุ่นใหม่ที่นำผ้าไทยกลับมา', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sai-mai', 'Sai Mai Designs', 'คุณจอย', 'Pratunam', 'Pratunam · ราชเทวี', 'Platinum Mall · BTS ราชเทวี', 'ทุกวัน 10:00-20:00', 'https://line.me/R/ti/p/@saimaidesigns', '@saimai.designs', 2020, 'green', 'ดีไซเนอร์ไทยรุ่นใหม่ ราคา accessible — ที่นี่หาแบรนด์ใหม่ก่อนใคร', 'Sai Mai Designs คัดดีไซเนอร์ไทยใหม่ๆ ทุกเดือน เป็น launching pad ของหลายแบรนด์', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('bangkok-bridal-studio', 'Bangkok Bridal Studio', 'คุณก้อย', 'Sathorn', 'Sathorn · สาทร', 'Empire Tower · BTS ช่องนนทรี', 'นัดล่วงหน้า', 'https://line.me/R/ti/p/@bkkbridal', '@bangkok.bridal.studio', 2013, 'ivory', 'Full-service bridal — ชุด เครื่องประดับ veil, shoes ครบ one-stop', 'Bangkok Bridal Studio เป็น one-stop bridal ที่เก่าแก่ของกรุงเทพ มี styling team', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('closet-collective', 'Closet Collective', 'คุณนิว', 'Ari', 'Ari · พญาไท', 'Ari Soi 1 · BTS อารีย์', 'จันทร์-เสาร์ 11:00-20:00', 'https://line.me/R/ti/p/@closetcollective', '@closetcollective.bkk', 2023, 'blue', 'Peer-to-peer dress rental — ชุดจริงจากตู้สาวๆ ในกรุงเทพ ราคาถูกกว่า boutique', 'Closet Collective เกิดจาก idea ของกลุ่มเพื่อนที่อยากเปลี่ยนตู้เสื้อผ้าให้เป็นรายได้', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('riverside-atelier', 'Riverside Atelier', 'คุณริน', 'Charoenkrung', 'Charoenkrung · บางรัก', 'ถนนเจริญกรุง 38 · BTS สะพานตากสิน', 'พฤ-อาทิตย์ 12:00-19:00', 'https://line.me/R/ti/p/@riversideatelier', '@riverside.atelier', 2019, 'blue', 'Destination wedding และงาน outdoor garden — ผ้าเบา สีพาสเทล', 'Riverside Atelier ตั้งใกล้แม่น้ำ มี private fitting room มองวิวสวย', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('lumpini-lookbook', 'Lumpini Lookbook', 'คุณมายด์', 'Lumpini', 'Lumpini · ปทุมวัน', 'ถนนวิทยุ · MRT ลุมพินี', 'ทุกวัน 11:00-20:00', 'https://line.me/R/ti/p/@lumpinilookbook', '@lumpini.lookbook', 2022, 'green', 'Sporty chic ใส่ได้ทั้งงานและ casual — สาวออฟฟิศที่ไปต่อ event หลังเลิกงาน', 'Lumpini Lookbook สำหรับสาวที่อยากเปลี่ยนจากชุดงานเป็น cocktail ภายใน 5 นาที', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('phra-khanong-edit', 'Phra Khanong Edit', 'คุณอ๊อด', 'Phra Khanong', 'Phra Khanong · คลองเตย', 'W District · BTS พระโขนง', 'พุธ-อาทิตย์ 13:00-21:00', 'https://line.me/R/ti/p/@phrakhanongedit', '@phrakhanong.edit', 2021, 'black', 'Alternative styles — เน้นความเป็นตัวเอง ทรงผิดธรรมดา สีไม่ตามฤดูกาล', 'Phra Khanong Edit รับลูกค้าที่เบื่อชุดทั่วไป มาที่นี่จะเจอชุดที่ไม่มีในร้านอื่น', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('onnut-atelier', 'Onnut Atelier', 'คุณบี', 'Onnut', 'Onnut · พระโขนง', 'Centre One Onnut · BTS อ่อนนุช', 'จันทร์-อาทิตย์ 10:30-20:00', 'https://line.me/R/ti/p/@onnutatelier', '@onnut.atelier', 2020, 'ivory', 'ชุดราคาเข้าถึงได้ในย่านอ่อนนุช — ครอบคลุมงานหลายประเภท', 'Onnut Atelier เกิดจากดีไซเนอร์ที่อยากเปิดร้านในย่านชานเมืองให้คนใกล้บ้านเข้าถึงง่าย', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('yaowarat-heritage', 'Yaowarat Heritage', 'คุณเล้ง', 'Yaowarat', 'Yaowarat · สัมพันธวงศ์', 'ถนนเยาวราช · MRT วัดมังกร', 'จันทร์-อาทิตย์ 10:00-19:00', 'https://line.me/R/ti/p/@yaowaratheritage', '@yaowarat.heritage', 2012, 'red', 'ชุดเจ้าสาวจีน-ไทย แบบประเพณี Tea ceremony, ฉีพ้าว, ม้งกัว', 'Yaowarat Heritage สืบทอดประเพณีชุดจีน-ไทย รุ่น 3 ของครอบครัวที่ทำชุดเจ้าสาวจีน', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('wireless-couture', 'Wireless Couture', 'คุณเอม', 'Wireless', 'Wireless · ปทุมวัน', 'All Seasons Place · BTS เพลินจิต', 'จันทร์-ศุกร์ 10:00-19:00', 'https://line.me/R/ti/p/@wirelesscouture', '@wireless.couture', 2016, 'navy', 'ชุดทางการ classic สำหรับ embassy events และ diplomatic dinners', 'Wireless Couture ตั้งใกล้สถานทูต ลูกค้าหลักคือภรรยานักการทูตและนักธุรกิจอินเตอร์', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('soi-49-studio', 'Soi 49 Studio', 'คุณกุ้ง', 'Sukhumvit 49', 'Sukhumvit 49 · วัฒนา', 'Sukhumvit Soi 49/12 · BTS พร้อมพงษ์', 'จันทร์-เสาร์ 12:00-20:00', 'https://line.me/R/ti/p/@soi49studio', '@soi49.studio', 2021, 'purple', 'Modern Thai designers under one roof — รวมหลายแบรนด์ Thai contemporary', 'Soi 49 Studio เป็น showroom ของ 5 แบรนด์ดีไซเนอร์ไทยร่วมสมัย', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('surawong-suite', 'Surawong Suite', 'คุณซู', 'Surawong', 'Surawong · บางรัก', 'ถนนสุรวงศ์ · BTS ศาลาแดง', 'จันทร์-เสาร์ 11:00-19:00', 'https://line.me/R/ti/p/@surawongsuite', '@surawong.suite', 2018, 'red', 'Eveningwear specialty — gowns เท่านั้น ราคา premium', 'Surawong Suite รับเฉพาะลูกค้าที่ต้องการ gown สำหรับงานสำคัญ มี private styling', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sathorn-soiree', 'Sathorn Soiree', 'คุณป้อ', 'Sathorn', 'Sathorn · สาทร', 'ถนนสาทรเหนือ · BTS ช่องนนทรี', 'พุธ-อาทิตย์ 13:00-20:00', 'https://line.me/R/ti/p/@sathornsoiree', '@sathorn.soiree', 2022, 'purple', 'Cocktail party specialist — ชุดสั้น สีเด่น ทรงทันสมัย', 'Sathorn Soiree เน้นกลุ่มลูกค้าที่ต้องไปงาน cocktail หลายๆ งานต่อเดือน', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('sukhumvit-couture', 'Sukhumvit Couture', 'คุณตา', 'Sukhumvit', 'Sukhumvit · วัฒนา', 'EmQuartier (ชั้น 4) · BTS พร้อมพงษ์', 'ทุกวัน 10:00-22:00', 'https://line.me/R/ti/p/@sukhumvitcouture', '@sukhumvit.couture', 2014, 'ivory', 'Mainstream luxury — แบรนด์ตปท.นำเข้า บริการเช่าและขาย', 'Sukhumvit Couture นำเข้าชุดจาก Milan, Paris, NY ให้เช่าก่อนผู้ที่อยากซื้อ', false, 'live')
  on conflict (slug) do nothing;
insert into boutiques (slug, name, owner_name, area_key, area_label, address, hours, line_url, instagram, since_year, cover_color, tag, story, featured, status) values
  ('closet-at-park', 'The Closet at Park', 'คุณมิว', 'Lumpini Park', 'Lumpini Park · ปทุมวัน', 'ใกล้ Lumpini Park · MRT ลุมพินี', 'นัดล่วงหน้าเท่านั้น', 'https://line.me/R/ti/p/@closetatpark', '@theclosetatpark', 2023, 'rose', 'Community closet — เกิดจากกลุ่มแม่บ้านที่จัดเก็บชุดร่วมกันให้เพื่อนเช่า', 'The Closet at Park เริ่มจากกลุ่มเพื่อนแม่บ้าน 10 คนที่นำชุดมาเก็บไว้ในที่เดียว', false, 'live')
  on conflict (slug) do nothing;

-- DopRent seed data: listings (auto-linked to boutiques by slug lookup)

insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-silk-midi', 'Rose Silk Midi', 'Atelier Bangkok', id, 'Siam Couture', 'S', 'rose', 1800, 8000, 'ชุดเดรสผ้าซิลค์สีกุหลาบ ทรง midi คอวี เหมาะกับงานเลี้ยงค่ำ งานหมั้น หรือถ่ายภาพ pre-wedding', ARRAY['engagement','evening'], 'https://line.me/R/ti/p/@siamcouture', 'free', false, false, 'live', true
from boutiques where slug = 'siam-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-pleated-gown', 'Ivory Pleated Gown', 'Praewa Studio', id, 'Thonglor Atelier', 'M', 'ivory', 2400, 12000, 'ชุดราตรีสีงาช้าง ผ้าพลีทอัดร้อน ทรงยาวพื้น เหมาะกับงานแต่งงาน งานกาล่า', ARRAY['wedding','gala'], 'https://line.me/R/ti/p/@thonglor', 'free', false, false, 'live', true
from boutiques where slug = 'thonglor-atelier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'emerald-velvet-cocktail', 'Emerald Velvet Cocktail', 'Asava', id, 'Siam Couture', 'S', 'green', 2000, 10000, 'เดรสผ้ากำมะหยี่สีมรกต ทรงเข้ารูป ความยาวเหนือเข่า เหมาะกับงานค็อกเทล', ARRAY['cocktail','party'], 'https://line.me/R/ti/p/@siamcouture', 'free', false, false, 'live', true
from boutiques where slug = 'siam-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'noir-silk-slip', 'Noir Silk Slip', 'Kloset', id, 'Thonglor Atelier', 'M', 'black', 1600, 8000, 'ชุดสลิปเดรสผ้าซิลค์สีดำ สายเดี่ยว ทรงเรียบหรู ใส่ได้หลายโอกาส', ARRAY['evening','cocktail','party'], 'https://line.me/R/ti/p/@thonglor', 'free', false, false, 'live', true
from boutiques where slug = 'thonglor-atelier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'blush-tulle-ball', 'Blush Tulle Ball Gown', 'Theatre', id, 'Siam Couture', 'S', 'rose', 3200, 15000, 'ชุดบอลกาวน์ผ้าทูลล์สีชมพูบลัช กระโปรงพอง เหมาะกับงานหมั้น', ARRAY['engagement','gala'], 'https://line.me/R/ti/p/@siamcouture', 'featured', true, false, 'live', true
from boutiques where slug = 'siam-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini', 'Navy Sequin Mini', 'Disaya', id, 'Thonglor Atelier', 'S', 'navy', 1900, 9000, 'เดรสสั้นสีกรมท่า ผ้าปักเลื่อม ใส่ออกงานเลี้ยง งานปาร์ตี้ได้เก๋', ARRAY['party','evening'], 'https://line.me/R/ti/p/@thonglor', 'free', false, false, 'live', true
from boutiques where slug = 'thonglor-atelier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'champagne-lace-midi', 'Champagne Lace Midi', 'Asava', id, 'Siam Couture', 'M', 'ivory', 2200, 11000, 'ชุดลูกไม้สีแชมเปญ ทรง midi แขนยาว เหมาะงานแต่งช่วงเช้า', ARRAY['wedding','engagement'], 'https://line.me/R/ti/p/@siamcouture', 'free', false, false, 'live', true
from boutiques where slug = 'siam-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'scarlet-satin-column', 'Scarlet Satin Column', 'Kloset', id, 'Thonglor Atelier', 'S', 'red', 2600, 13000, 'ชุดราตรีผ้าซาตินสีแดงสด ทรงคอลัมน์ เปิดหลัง', ARRAY['evening','gala'], 'https://line.me/R/ti/p/@thonglor', 'boost', false, true, 'live', true
from boutiques where slug = 'thonglor-atelier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'powder-blue-tea', 'Powder Blue Tea Dress', 'Theatre', id, 'Siam Couture', 'M', 'blue', 1700, 8500, 'เดรสสีฟ้าพาวเดอร์ ทรง tea length ผ้าชีฟอง บางเบา', ARRAY['casual','wedding'], 'https://line.me/R/ti/p/@siamcouture', 'free', false, false, 'live', true
from boutiques where slug = 'siam-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'onyx-tuxedo-jumpsuit', 'Onyx Tuxedo Jumpsuit', 'Disaya', id, 'Thonglor Atelier', 'S', 'black', 2100, 10000, 'จัมป์สูทสีดำสไตล์ทักซิโด้ ตัดเย็บเข้ารูป โอกาสทางการ', ARRAY['work','party'], 'https://line.me/R/ti/p/@thonglor', 'free', false, false, 'live', true
from boutiques where slug = 'thonglor-atelier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'lilac-organza-gown', 'Lilac Organza Gown', 'Praewa Studio', id, 'Siam Couture', 'M', 'purple', 2800, 13000, 'ชุดราตรีผ้าออร์แกนซ่าสีม่วงไลแลค ทรงเอ-ไลน์', ARRAY['engagement','wedding'], 'https://line.me/R/ti/p/@siamcouture', 'free', false, false, 'live', true
from boutiques where slug = 'siam-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'sage-linen-suit', 'Sage Linen Suit Set', 'Asava', id, 'Thonglor Atelier', 'M', 'green', 1500, 7500, 'เซ็ตเสื้อเบลเซอร์กับกระโปรงผ้าลินินสีเสจ ใส่ทำงาน', ARRAY['work','casual'], 'https://line.me/R/ti/p/@thonglor', 'free', false, false, 'live', true
from boutiques where slug = 'thonglor-atelier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini-2', 'Navy Sequin Mini', 'Local Atelier', id, 'Ekkamai Edit', 'M', 'navy', 2000, 10000, 'Sequin Miniจาก Ekkamai Edit — ทรงและสีตรงกับโอกาสparty', ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@ekkamai.edit', 'free', false, false, 'live', true
from boutiques where slug = 'ekkamai-edit'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'green-chiffon-tea-dress', 'Sage Chiffon Tea Dress', 'Bangkok Designer', id, 'Ekkamai Edit', 'L', 'green', 1700, 8500, 'Chiffon Tea Dressจาก Ekkamai Edit — ทรงและสีตรงกับโอกาสcasual', ARRAY['casual'], 'https://line.me/R/ti/p/@ekkamai.edit', 'free', false, false, 'live', true
from boutiques where slug = 'ekkamai-edit'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-linen-suit', 'Ivory Linen Suit', '— Curated —', id, 'Ekkamai Edit', 'S', 'ivory', 1800, 9000, 'Linen Suitจาก Ekkamai Edit — ทรงและสีตรงกับโอกาสwork', ARRAY['work','casual'], 'https://line.me/R/ti/p/@ekkamai.edit', 'free', false, false, 'live', true
from boutiques where slug = 'ekkamai-edit'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-tulle-cocktail', 'Ivory Tulle Cocktail', 'Bangkok Designer', id, 'Phrom Phong Bridal', 'S', 'ivory', 2300, 11500, 'Tulle Cocktailจาก Phrom Phong Bridal — ทรงและสีตรงกับโอกาสcocktail', ARRAY['cocktail'], 'https://line.me/R/ti/p/@phromphongbridal', 'boost', false, true, 'live', true
from boutiques where slug = 'phrom-phong-bridal'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-silk-slip', 'Noir Silk Slip', '— Curated —', id, 'Ari Vintage Closet', 'L', 'black', 2000, 10000, 'Silk Slipจาก Ari Vintage Closet — ทรงและสีตรงกับโอกาสevening', ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@aricloset', 'featured', true, false, 'live', true
from boutiques where slug = 'ari-vintage-closet'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-lace-midi', 'Rose Lace Midi', '— Studio —', id, 'Ari Vintage Closet', 'S', 'rose', 2600, 13000, 'Lace Midiจาก Ari Vintage Closet — ทรงและสีตรงกับโอกาสwedding', ARRAY['wedding'], 'https://line.me/R/ti/p/@aricloset', 'free', false, false, 'live', true
from boutiques where slug = 'ari-vintage-closet'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-satin-column', 'Navy Satin Column', '— Studio —', id, 'Asok Style Co.', 'M', 'navy', 3000, 15000, 'Satin Columnจาก Asok Style Co. — ทรงและสีตรงกับโอกาสgala', ARRAY['gala'], 'https://line.me/R/ti/p/@asokstyle', 'free', false, false, 'live', true
from boutiques where slug = 'asok-style-co'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-organza-ball-gown', 'Rose Organza Ball Gown', 'Local Atelier', id, 'Asok Style Co.', 'L', 'rose', 2800, 14000, 'Organza Ball Gownจาก Asok Style Co. — ทรงและสีตรงกับโอกาสengagement', ARRAY['engagement','gala'], 'https://line.me/R/ti/p/@asokstyle', 'free', false, false, 'live', true
from boutiques where slug = 'asok-style-co'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'purple-tweed-set', 'Lilac Tweed Set', 'Bangkok Designer', id, 'Asok Style Co.', 'S', 'purple', 1600, 8000, 'Tweed Setจาก Asok Style Co. — ทรงและสีตรงกับโอกาสwork', ARRAY['work'], 'https://line.me/R/ti/p/@asokstyle', 'free', false, false, 'live', true
from boutiques where slug = 'asok-style-co'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-sequin-mini', 'Noir Sequin Mini', 'Local Atelier', id, 'Sathorn Atelier', 'S', 'black', 1800, 9000, 'Sequin Miniจาก Sathorn Atelier — ทรงและสีตรงกับโอกาสparty', ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@sathornatelier', 'free', false, false, 'live', true
from boutiques where slug = 'sathorn-atelier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-tulle-cocktail', 'Rose Tulle Cocktail', 'Bangkok Designer', id, 'Silom Eveningwear', 'L', 'rose', 2100, 10500, 'Tulle Cocktailจาก Silom Eveningwear — ทรงและสีตรงกับโอกาสcocktail', ARRAY['cocktail'], 'https://line.me/R/ti/p/@silomeveningwear', 'free', false, false, 'live', true
from boutiques where slug = 'silom-eveningwear'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-crepe-jumpsuit', 'Crimson Crepe Jumpsuit', '— Curated —', id, 'Silom Eveningwear', 'S', 'red', 1900, 9500, 'Crepe Jumpsuitจาก Silom Eveningwear — ทรงและสีตรงกับโอกาสwork', ARRAY['work','party'], 'https://line.me/R/ti/p/@silomeveningwear', 'free', false, false, 'live', true
from boutiques where slug = 'silom-eveningwear'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-silk-slip', 'Ivory Silk Slip', '— Curated —', id, 'Ploenchit Premier', 'M', 'ivory', 1700, 8500, 'Silk Slipจาก Ploenchit Premier — ทรงและสีตรงกับโอกาสevening', ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@ploenchitpremier', 'free', false, false, 'live', true
from boutiques where slug = 'ploenchit-premier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-lace-midi-2', 'Rose Lace Midi', '— Studio —', id, 'Ploenchit Premier', 'L', 'rose', 2300, 11500, 'Lace Midiจาก Ploenchit Premier — ทรงและสีตรงกับโอกาสwedding', ARRAY['wedding'], 'https://line.me/R/ti/p/@ploenchitpremier', 'free', false, false, 'live', true
from boutiques where slug = 'ploenchit-premier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-velvet-gown', 'Navy Velvet Gown', 'Local Atelier', id, 'Ploenchit Premier', 'S', 'navy', 3100, 15500, 'Velvet Gownจาก Ploenchit Premier — ทรงและสีตรงกับโอกาสgala', ARRAY['gala','evening'], 'https://line.me/R/ti/p/@ploenchitpremier', 'free', false, false, 'live', true
from boutiques where slug = 'ploenchit-premier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-satin-column', 'Crimson Satin Column', '— Studio —', id, 'Watthana Bridal House', 'S', 'red', 2700, 13500, 'Satin Columnจาก Watthana Bridal House — ทรงและสีตรงกับโอกาสgala', ARRAY['gala'], 'https://line.me/R/ti/p/@watthanabridal', 'free', false, false, 'live', true
from boutiques where slug = 'watthana-bridal'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini-3', 'Navy Sequin Mini', 'Local Atelier', id, 'The Dress Library', 'L', 'navy', 2200, 11000, 'Sequin Miniจาก The Dress Library — ทรงและสีตรงกับโอกาสparty', ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@dresslibrary', 'boost', false, true, 'live', true
from boutiques where slug = 'the-dress-library'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'green-chiffon-tea-dress-2', 'Sage Chiffon Tea Dress', 'Bangkok Designer', id, 'The Dress Library', 'S', 'green', 1900, 9500, 'Chiffon Tea Dressจาก The Dress Library — ทรงและสีตรงกับโอกาสcasual', ARRAY['casual'], 'https://line.me/R/ti/p/@dresslibrary', 'free', false, false, 'live', true
from boutiques where slug = 'the-dress-library'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-tulle-cocktail-2', 'Rose Tulle Cocktail', 'Bangkok Designer', id, 'Chitlom Boutique', 'M', 'rose', 2500, 12500, 'Tulle Cocktailจาก Chitlom Boutique — ทรงและสีตรงกับโอกาสcocktail', ARRAY['cocktail'], 'https://line.me/R/ti/p/@chitlomboutique', 'free', false, false, 'live', true
from boutiques where slug = 'chitlom-boutique'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-crepe-jumpsuit', 'Noir Crepe Jumpsuit', '— Curated —', id, 'Chitlom Boutique', 'L', 'black', 1700, 8500, 'Crepe Jumpsuitจาก Chitlom Boutique — ทรงและสีตรงกับโอกาสwork', ARRAY['work','party'], 'https://line.me/R/ti/p/@chitlomboutique', 'free', false, false, 'live', true
from boutiques where slug = 'chitlom-boutique'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'purple-beaded-gown', 'Lilac Beaded Gown', '— Studio —', id, 'Chitlom Boutique', 'S', 'purple', 3100, 15500, 'Beaded Gownจาก Chitlom Boutique — ทรงและสีตรงกับโอกาสgala', ARRAY['gala'], 'https://line.me/R/ti/p/@chitlomboutique', 'free', false, false, 'live', true
from boutiques where slug = 'chitlom-boutique'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-silk-slip', 'Navy Silk Slip', '— Curated —', id, 'Sukhumvit 11 Studio', 'S', 'navy', 1500, 7500, 'Silk Slipจาก Sukhumvit 11 Studio — ทรงและสีตรงกับโอกาสevening', ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@suk11studio', 'free', false, false, 'live', true
from boutiques where slug = 'sukhumvit-11'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-satin-column-2', 'Crimson Satin Column', '— Studio —', id, 'Sala Daeng Couture', 'L', 'red', 2400, 12000, 'Satin Columnจาก Sala Daeng Couture — ทรงและสีตรงกับโอกาสgala', ARRAY['gala'], 'https://line.me/R/ti/p/@saladaengcouture', 'featured', true, false, 'live', true
from boutiques where slug = 'sala-daeng-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'purple-organza-ball-gown', 'Lilac Organza Ball Gown', 'Local Atelier', id, 'Sala Daeng Couture', 'S', 'purple', 3100, 15500, 'Organza Ball Gownจาก Sala Daeng Couture — ทรงและสีตรงกับโอกาสengagement', ARRAY['engagement','gala'], 'https://line.me/R/ti/p/@saladaengcouture', 'free', false, false, 'live', true
from boutiques where slug = 'sala-daeng-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini-4', 'Navy Sequin Mini', 'Local Atelier', id, 'Bangrak Bridal Co.', 'M', 'navy', 2000, 10000, 'Sequin Miniจาก Bangrak Bridal Co. — ทรงและสีตรงกับโอกาสparty', ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@bangrakbridal', 'free', false, false, 'live', true
from boutiques where slug = 'bangrak-bridal'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'green-chiffon-tea-dress-3', 'Sage Chiffon Tea Dress', 'Bangkok Designer', id, 'Bangrak Bridal Co.', 'L', 'green', 1700, 8500, 'Chiffon Tea Dressจาก Bangrak Bridal Co. — ทรงและสีตรงกับโอกาสcasual', ARRAY['casual'], 'https://line.me/R/ti/p/@bangrakbridal', 'free', false, false, 'live', true
from boutiques where slug = 'bangrak-bridal'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-linen-suit-2', 'Ivory Linen Suit', '— Curated —', id, 'Bangrak Bridal Co.', 'S', 'ivory', 1800, 9000, 'Linen Suitจาก Bangrak Bridal Co. — ทรงและสีตรงกับโอกาสwork', ARRAY['work','casual'], 'https://line.me/R/ti/p/@bangrakbridal', 'free', false, false, 'live', true
from boutiques where slug = 'bangrak-bridal'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'purple-tulle-cocktail', 'Lilac Tulle Cocktail', 'Bangkok Designer', id, 'Pra Sai Couture', 'S', 'purple', 2300, 11500, 'Tulle Cocktailจาก Pra Sai Couture — ทรงและสีตรงกับโอกาสcocktail', ARRAY['cocktail'], 'https://line.me/R/ti/p/@prasaicouture', 'free', false, false, 'live', true
from boutiques where slug = 'pra-sai-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-silk-slip-2', 'Noir Silk Slip', '— Curated —', id, 'Sai Mai Designs', 'L', 'black', 2000, 10000, 'Silk Slipจาก Sai Mai Designs — ทรงและสีตรงกับโอกาสevening', ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@saimaidesigns', 'free', false, false, 'live', true
from boutiques where slug = 'sai-mai'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-lace-midi-3', 'Rose Lace Midi', '— Studio —', id, 'Sai Mai Designs', 'S', 'rose', 2600, 13000, 'Lace Midiจาก Sai Mai Designs — ทรงและสีตรงกับโอกาสwedding', ARRAY['wedding'], 'https://line.me/R/ti/p/@saimaidesigns', 'free', false, false, 'live', true
from boutiques where slug = 'sai-mai'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-satin-column-3', 'Crimson Satin Column', '— Studio —', id, 'Bangkok Bridal Studio', 'M', 'red', 3000, 15000, 'Satin Columnจาก Bangkok Bridal Studio — ทรงและสีตรงกับโอกาสgala', ARRAY['gala'], 'https://line.me/R/ti/p/@bkkbridal', 'boost', false, true, 'live', true
from boutiques where slug = 'bangkok-bridal-studio'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-organza-ball-gown-2', 'Rose Organza Ball Gown', 'Local Atelier', id, 'Bangkok Bridal Studio', 'L', 'rose', 2800, 14000, 'Organza Ball Gownจาก Bangkok Bridal Studio — ทรงและสีตรงกับโอกาสengagement', ARRAY['engagement','gala'], 'https://line.me/R/ti/p/@bkkbridal', 'free', false, false, 'live', true
from boutiques where slug = 'bangkok-bridal-studio'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'purple-tweed-set-2', 'Lilac Tweed Set', 'Bangkok Designer', id, 'Bangkok Bridal Studio', 'S', 'purple', 1600, 8000, 'Tweed Setจาก Bangkok Bridal Studio — ทรงและสีตรงกับโอกาสwork', ARRAY['work'], 'https://line.me/R/ti/p/@bkkbridal', 'free', false, false, 'live', true
from boutiques where slug = 'bangkok-bridal-studio'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini-5', 'Navy Sequin Mini', 'Local Atelier', id, 'Closet Collective', 'S', 'navy', 1800, 9000, 'Sequin Miniจาก Closet Collective — ทรงและสีตรงกับโอกาสparty', ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@closetcollective', 'free', false, false, 'live', true
from boutiques where slug = 'closet-collective'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-tulle-cocktail-3', 'Rose Tulle Cocktail', 'Bangkok Designer', id, 'Riverside Atelier', 'L', 'rose', 2100, 10500, 'Tulle Cocktailจาก Riverside Atelier — ทรงและสีตรงกับโอกาสcocktail', ARRAY['cocktail'], 'https://line.me/R/ti/p/@riversideatelier', 'free', false, false, 'live', true
from boutiques where slug = 'riverside-atelier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-crepe-jumpsuit-2', 'Crimson Crepe Jumpsuit', '— Curated —', id, 'Riverside Atelier', 'S', 'red', 1900, 9500, 'Crepe Jumpsuitจาก Riverside Atelier — ทรงและสีตรงกับโอกาสwork', ARRAY['work','party'], 'https://line.me/R/ti/p/@riversideatelier', 'free', false, false, 'live', true
from boutiques where slug = 'riverside-atelier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-silk-slip-3', 'Noir Silk Slip', '— Curated —', id, 'Lumpini Lookbook', 'M', 'black', 1700, 8500, 'Silk Slipจาก Lumpini Lookbook — ทรงและสีตรงกับโอกาสevening', ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@lumpinilookbook', 'free', false, false, 'live', true
from boutiques where slug = 'lumpini-lookbook'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-lace-midi-4', 'Rose Lace Midi', '— Studio —', id, 'Lumpini Lookbook', 'L', 'rose', 2300, 11500, 'Lace Midiจาก Lumpini Lookbook — ทรงและสีตรงกับโอกาสwedding', ARRAY['wedding'], 'https://line.me/R/ti/p/@lumpinilookbook', 'free', false, false, 'live', true
from boutiques where slug = 'lumpini-lookbook'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-velvet-gown-2', 'Navy Velvet Gown', 'Local Atelier', id, 'Lumpini Lookbook', 'S', 'navy', 3100, 15500, 'Velvet Gownจาก Lumpini Lookbook — ทรงและสีตรงกับโอกาสgala', ARRAY['gala','evening'], 'https://line.me/R/ti/p/@lumpinilookbook', 'free', false, false, 'live', true
from boutiques where slug = 'lumpini-lookbook'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-satin-column', 'Noir Satin Column', '— Studio —', id, 'Phra Khanong Edit', 'S', 'black', 2700, 13500, 'Satin Columnจาก Phra Khanong Edit — ทรงและสีตรงกับโอกาสgala', ARRAY['gala'], 'https://line.me/R/ti/p/@phrakhanongedit', 'free', false, false, 'live', true
from boutiques where slug = 'phra-khanong-edit'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-sequin-mini-6', 'Navy Sequin Mini', 'Local Atelier', id, 'Onnut Atelier', 'L', 'navy', 2200, 11000, 'Sequin Miniจาก Onnut Atelier — ทรงและสีตรงกับโอกาสparty', ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@onnutatelier', 'featured', true, false, 'live', true
from boutiques where slug = 'onnut-atelier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'green-chiffon-tea-dress-4', 'Sage Chiffon Tea Dress', 'Bangkok Designer', id, 'Onnut Atelier', 'S', 'green', 1900, 9500, 'Chiffon Tea Dressจาก Onnut Atelier — ทรงและสีตรงกับโอกาสcasual', ARRAY['casual'], 'https://line.me/R/ti/p/@onnutatelier', 'free', false, false, 'live', true
from boutiques where slug = 'onnut-atelier'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-tulle-cocktail-4', 'Rose Tulle Cocktail', 'Bangkok Designer', id, 'Yaowarat Heritage', 'M', 'rose', 2500, 12500, 'Tulle Cocktailจาก Yaowarat Heritage — ทรงและสีตรงกับโอกาสcocktail', ARRAY['cocktail'], 'https://line.me/R/ti/p/@yaowaratheritage', 'free', false, false, 'live', true
from boutiques where slug = 'yaowarat-heritage'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'black-crepe-jumpsuit-2', 'Noir Crepe Jumpsuit', '— Curated —', id, 'Yaowarat Heritage', 'L', 'black', 1700, 8500, 'Crepe Jumpsuitจาก Yaowarat Heritage — ทรงและสีตรงกับโอกาสwork', ARRAY['work','party'], 'https://line.me/R/ti/p/@yaowaratheritage', 'free', false, false, 'live', true
from boutiques where slug = 'yaowarat-heritage'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'purple-beaded-gown-2', 'Lilac Beaded Gown', '— Studio —', id, 'Yaowarat Heritage', 'S', 'purple', 3100, 15500, 'Beaded Gownจาก Yaowarat Heritage — ทรงและสีตรงกับโอกาสgala', ARRAY['gala'], 'https://line.me/R/ti/p/@yaowaratheritage', 'free', false, false, 'live', true
from boutiques where slug = 'yaowarat-heritage'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'navy-silk-slip-2', 'Navy Silk Slip', '— Curated —', id, 'Wireless Couture', 'S', 'navy', 1500, 7500, 'Silk Slipจาก Wireless Couture — ทรงและสีตรงกับโอกาสevening', ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@wirelesscouture', 'boost', false, true, 'live', true
from boutiques where slug = 'wireless-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-satin-column-4', 'Crimson Satin Column', '— Studio —', id, 'Soi 49 Studio', 'L', 'red', 2400, 12000, 'Satin Columnจาก Soi 49 Studio — ทรงและสีตรงกับโอกาสgala', ARRAY['gala'], 'https://line.me/R/ti/p/@soi49studio', 'free', false, false, 'live', true
from boutiques where slug = 'soi-49-studio'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'purple-organza-ball-gown-2', 'Lilac Organza Ball Gown', 'Local Atelier', id, 'Soi 49 Studio', 'S', 'purple', 3100, 15500, 'Organza Ball Gownจาก Soi 49 Studio — ทรงและสีตรงกับโอกาสengagement', ARRAY['engagement','gala'], 'https://line.me/R/ti/p/@soi49studio', 'free', false, false, 'live', true
from boutiques where slug = 'soi-49-studio'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-sequin-mini', 'Crimson Sequin Mini', 'Local Atelier', id, 'Surawong Suite', 'M', 'red', 2000, 10000, 'Sequin Miniจาก Surawong Suite — ทรงและสีตรงกับโอกาสparty', ARRAY['party','cocktail'], 'https://line.me/R/ti/p/@surawongsuite', 'free', false, false, 'live', true
from boutiques where slug = 'surawong-suite'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'green-chiffon-tea-dress-5', 'Sage Chiffon Tea Dress', 'Bangkok Designer', id, 'Surawong Suite', 'L', 'green', 1700, 8500, 'Chiffon Tea Dressจาก Surawong Suite — ทรงและสีตรงกับโอกาสcasual', ARRAY['casual'], 'https://line.me/R/ti/p/@surawongsuite', 'free', false, false, 'live', true
from boutiques where slug = 'surawong-suite'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-linen-suit-3', 'Ivory Linen Suit', '— Curated —', id, 'Surawong Suite', 'S', 'ivory', 1800, 9000, 'Linen Suitจาก Surawong Suite — ทรงและสีตรงกับโอกาสwork', ARRAY['work','casual'], 'https://line.me/R/ti/p/@surawongsuite', 'free', false, false, 'live', true
from boutiques where slug = 'surawong-suite'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'purple-tulle-cocktail-2', 'Lilac Tulle Cocktail', 'Bangkok Designer', id, 'Sathorn Soiree', 'S', 'purple', 2300, 11500, 'Tulle Cocktailจาก Sathorn Soiree — ทรงและสีตรงกับโอกาสcocktail', ARRAY['cocktail'], 'https://line.me/R/ti/p/@sathornsoiree', 'free', false, false, 'live', true
from boutiques where slug = 'sathorn-soiree'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'ivory-silk-slip-2', 'Ivory Silk Slip', '— Curated —', id, 'Sukhumvit Couture', 'L', 'ivory', 2000, 10000, 'Silk Slipจาก Sukhumvit Couture — ทรงและสีตรงกับโอกาสevening', ARRAY['evening','cocktail'], 'https://line.me/R/ti/p/@sukhumvitcouture', 'free', false, false, 'live', true
from boutiques where slug = 'sukhumvit-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-lace-midi-5', 'Rose Lace Midi', '— Studio —', id, 'Sukhumvit Couture', 'S', 'rose', 2600, 13000, 'Lace Midiจาก Sukhumvit Couture — ทรงและสีตรงกับโอกาสwedding', ARRAY['wedding'], 'https://line.me/R/ti/p/@sukhumvitcouture', 'free', false, false, 'live', true
from boutiques where slug = 'sukhumvit-couture'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'red-satin-column-5', 'Crimson Satin Column', '— Studio —', id, 'The Closet at Park', 'M', 'red', 3000, 15000, 'Satin Columnจาก The Closet at Park — ทรงและสีตรงกับโอกาสgala', ARRAY['gala'], 'https://line.me/R/ti/p/@closetatpark', 'free', false, false, 'live', true
from boutiques where slug = 'closet-at-park'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'rose-organza-ball-gown-3', 'Rose Organza Ball Gown', 'Local Atelier', id, 'The Closet at Park', 'L', 'rose', 2800, 14000, 'Organza Ball Gownจาก The Closet at Park — ทรงและสีตรงกับโอกาสengagement', ARRAY['engagement','gala'], 'https://line.me/R/ti/p/@closetatpark', 'free', false, false, 'live', true
from boutiques where slug = 'closet-at-park'
on conflict (slug) do nothing;
insert into dresses (slug, name, designer, boutique_id, boutique_name, size, color, price_per_day, deposit, description, occasions, line_url, ads_tier, featured, sponsored, status, available)
select 'purple-tweed-set-3', 'Lilac Tweed Set', 'Bangkok Designer', id, 'The Closet at Park', 'S', 'purple', 1600, 8000, 'Tweed Setจาก The Closet at Park — ทรงและสีตรงกับโอกาสwork', ARRAY['work'], 'https://line.me/R/ti/p/@closetatpark', 'free', false, false, 'live', true
from boutiques where slug = 'closet-at-park'
on conflict (slug) do nothing;

