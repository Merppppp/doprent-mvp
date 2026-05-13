/**
 * Bangkok administrative divisions: 50 เขต (districts) and ~180 แขวง (subdistricts)
 * with postal codes. Used by the seller signup form for structured address input.
 *
 * Source: Thailand Post & กรุงเทพมหานคร publications. Postal codes are the most
 * common for each subdistrict — if a specific street belongs to a different code,
 * the seller can override the auto-filled value.
 */

export type Subdistrict = { th: string; postal: string };
export type District = {
  th: string; // e.g. "วัฒนา"
  en: string; // e.g. "Watthana"
  subdistricts: Subdistrict[];
};

export const PROVINCE_TH = "กรุงเทพมหานคร";

export const BANGKOK_DISTRICTS: District[] = [
  {
    th: "พระนคร",
    en: "Phra Nakhon",
    subdistricts: [
      { th: "พระบรมมหาราชวัง", postal: "10200" },
      { th: "วังบูรพาภิรมย์", postal: "10200" },
      { th: "วัดราชบพิธ", postal: "10200" },
      { th: "สำราญราษฎร์", postal: "10200" },
      { th: "ศาลเจ้าพ่อเสือ", postal: "10200" },
      { th: "เสาชิงช้า", postal: "10200" },
      { th: "บวรนิเวศ", postal: "10200" },
      { th: "ตลาดยอด", postal: "10200" },
      { th: "ชนะสงคราม", postal: "10200" },
      { th: "บ้านพานถม", postal: "10200" },
      { th: "บางขุนพรหม", postal: "10200" },
      { th: "วัดสามพระยา", postal: "10200" },
    ],
  },
  {
    th: "ดุสิต",
    en: "Dusit",
    subdistricts: [
      { th: "ดุสิต", postal: "10300" },
      { th: "วชิรพยาบาล", postal: "10300" },
      { th: "สวนจิตรลดา", postal: "10303" },
      { th: "สี่แยกมหานาค", postal: "10300" },
      { th: "ถนนนครไชยศรี", postal: "10300" },
    ],
  },
  {
    th: "หนองจอก",
    en: "Nong Chok",
    subdistricts: [
      { th: "กระทุ่มราย", postal: "10530" },
      { th: "หนองจอก", postal: "10530" },
      { th: "คลองสิบ", postal: "10530" },
      { th: "คลองสิบสอง", postal: "10530" },
      { th: "โคกแฝด", postal: "10530" },
      { th: "คู้ฝั่งเหนือ", postal: "10530" },
      { th: "ลำผักชี", postal: "10530" },
      { th: "ลำต้อยติ่ง", postal: "10530" },
    ],
  },
  {
    th: "บางรัก",
    en: "Bang Rak",
    subdistricts: [
      { th: "มหาพฤฒาราม", postal: "10500" },
      { th: "สีลม", postal: "10500" },
      { th: "สุริยวงศ์", postal: "10500" },
      { th: "บางรัก", postal: "10500" },
      { th: "สี่พระยา", postal: "10500" },
    ],
  },
  {
    th: "บางเขน",
    en: "Bang Khen",
    subdistricts: [
      { th: "อนุสาวรีย์", postal: "10220" },
      { th: "ท่าแร้ง", postal: "10220" },
    ],
  },
  {
    th: "บางกะปิ",
    en: "Bang Kapi",
    subdistricts: [
      { th: "คลองจั่น", postal: "10240" },
      { th: "หัวหมาก", postal: "10240" },
    ],
  },
  {
    th: "ปทุมวัน",
    en: "Pathum Wan",
    subdistricts: [
      { th: "รองเมือง", postal: "10330" },
      { th: "วังใหม่", postal: "10330" },
      { th: "ปทุมวัน", postal: "10330" },
      { th: "ลุมพินี", postal: "10330" },
    ],
  },
  {
    th: "ป้อมปราบศัตรูพ่าย",
    en: "Pom Prap Sattru Phai",
    subdistricts: [
      { th: "ป้อมปราบ", postal: "10100" },
      { th: "วัดเทพศิรินทร์", postal: "10100" },
      { th: "คลองมหานาค", postal: "10100" },
      { th: "บ้านบาตร", postal: "10100" },
      { th: "วัดโสมนัส", postal: "10100" },
    ],
  },
  {
    th: "พระโขนง",
    en: "Phra Khanong",
    subdistricts: [
      { th: "บางจาก", postal: "10260" },
      { th: "พระโขนงใต้", postal: "10260" },
    ],
  },
  {
    th: "มีนบุรี",
    en: "Min Buri",
    subdistricts: [
      { th: "มีนบุรี", postal: "10510" },
      { th: "แสนแสบ", postal: "10510" },
    ],
  },
  {
    th: "ลาดกระบัง",
    en: "Lat Krabang",
    subdistricts: [
      { th: "ลาดกระบัง", postal: "10520" },
      { th: "คลองสองต้นนุ่น", postal: "10520" },
      { th: "คลองสามประเวศ", postal: "10520" },
      { th: "ลำปลาทิว", postal: "10520" },
      { th: "ทับยาว", postal: "10520" },
      { th: "ขุมทอง", postal: "10520" },
    ],
  },
  {
    th: "ยานนาวา",
    en: "Yan Nawa",
    subdistricts: [
      { th: "ช่องนนทรี", postal: "10120" },
      { th: "บางโพงพาง", postal: "10120" },
    ],
  },
  {
    th: "สัมพันธวงศ์",
    en: "Samphanthawong",
    subdistricts: [
      { th: "จักรวรรดิ", postal: "10100" },
      { th: "สัมพันธวงศ์", postal: "10100" },
      { th: "ตลาดน้อย", postal: "10100" },
    ],
  },
  {
    th: "พญาไท",
    en: "Phaya Thai",
    subdistricts: [{ th: "สามเสนใน", postal: "10400" }],
  },
  {
    th: "ธนบุรี",
    en: "Thon Buri",
    subdistricts: [
      { th: "วัดกัลยาณ์", postal: "10600" },
      { th: "หิรัญรูจี", postal: "10600" },
      { th: "บางยี่เรือ", postal: "10600" },
      { th: "บุคคโล", postal: "10600" },
      { th: "ตลาดพลู", postal: "10600" },
      { th: "ดาวคะนอง", postal: "10600" },
      { th: "สำเหร่", postal: "10600" },
    ],
  },
  {
    th: "บางกอกใหญ่",
    en: "Bangkok Yai",
    subdistricts: [
      { th: "วัดอรุณ", postal: "10600" },
      { th: "วัดท่าพระ", postal: "10600" },
    ],
  },
  {
    th: "ห้วยขวาง",
    en: "Huai Khwang",
    subdistricts: [
      { th: "ห้วยขวาง", postal: "10310" },
      { th: "บางกะปิ", postal: "10310" },
      { th: "สามเสนนอก", postal: "10310" },
    ],
  },
  {
    th: "คลองสาน",
    en: "Khlong San",
    subdistricts: [
      { th: "สมเด็จเจ้าพระยา", postal: "10600" },
      { th: "คลองสาน", postal: "10600" },
      { th: "บางลำภูล่าง", postal: "10600" },
      { th: "คลองต้นไทร", postal: "10600" },
    ],
  },
  {
    th: "ตลิ่งชัน",
    en: "Taling Chan",
    subdistricts: [
      { th: "คลองชักพระ", postal: "10170" },
      { th: "ตลิ่งชัน", postal: "10170" },
      { th: "ฉิมพลี", postal: "10170" },
      { th: "บางพรม", postal: "10170" },
      { th: "บางระมาด", postal: "10170" },
      { th: "บางเชือกหนัง", postal: "10170" },
    ],
  },
  {
    th: "บางกอกน้อย",
    en: "Bangkok Noi",
    subdistricts: [
      { th: "ศิริราช", postal: "10700" },
      { th: "บ้านช่างหล่อ", postal: "10700" },
      { th: "บางขุนนนท์", postal: "10700" },
      { th: "บางขุนศรี", postal: "10700" },
      { th: "อรุณอัมรินทร์", postal: "10700" },
    ],
  },
  {
    th: "บางขุนเทียน",
    en: "Bang Khun Thian",
    subdistricts: [
      { th: "ท่าข้าม", postal: "10150" },
      { th: "แสมดำ", postal: "10150" },
    ],
  },
  {
    th: "ภาษีเจริญ",
    en: "Phasi Charoen",
    subdistricts: [
      { th: "บางหว้า", postal: "10160" },
      { th: "บางด้วน", postal: "10160" },
      { th: "บางจาก", postal: "10160" },
      { th: "บางแวก", postal: "10160" },
      { th: "คลองขวาง", postal: "10160" },
      { th: "ปากคลองภาษีเจริญ", postal: "10160" },
      { th: "คูหาสวรรค์", postal: "10160" },
    ],
  },
  {
    th: "หนองแขม",
    en: "Nong Khaem",
    subdistricts: [
      { th: "หนองแขม", postal: "10160" },
      { th: "หนองค้างพลู", postal: "10160" },
    ],
  },
  {
    th: "ราษฎร์บูรณะ",
    en: "Rat Burana",
    subdistricts: [
      { th: "ราษฎร์บูรณะ", postal: "10140" },
      { th: "บางปะกอก", postal: "10140" },
    ],
  },
  {
    th: "บางพลัด",
    en: "Bang Phlat",
    subdistricts: [
      { th: "บางพลัด", postal: "10700" },
      { th: "บางอ้อ", postal: "10700" },
      { th: "บางบำหรุ", postal: "10700" },
      { th: "บางยี่ขัน", postal: "10700" },
    ],
  },
  {
    th: "ดินแดง",
    en: "Din Daeng",
    subdistricts: [
      { th: "ดินแดง", postal: "10400" },
      { th: "รัชดาภิเษก", postal: "10400" },
    ],
  },
  {
    th: "บึงกุ่ม",
    en: "Bueng Kum",
    subdistricts: [
      { th: "คลองกุ่ม", postal: "10240" },
      { th: "นวมินทร์", postal: "10240" },
      { th: "นวลจันทร์", postal: "10230" },
    ],
  },
  {
    th: "สาทร",
    en: "Sathon",
    subdistricts: [
      { th: "ทุ่งวัดดอน", postal: "10120" },
      { th: "ยานนาวา", postal: "10120" },
      { th: "ทุ่งมหาเมฆ", postal: "10120" },
    ],
  },
  {
    th: "บางซื่อ",
    en: "Bang Sue",
    subdistricts: [
      { th: "บางซื่อ", postal: "10800" },
      { th: "วงศ์สว่าง", postal: "10800" },
    ],
  },
  {
    th: "จตุจักร",
    en: "Chatuchak",
    subdistricts: [
      { th: "ลาดยาว", postal: "10900" },
      { th: "เสนานิคม", postal: "10900" },
      { th: "จันทรเกษม", postal: "10900" },
      { th: "จอมพล", postal: "10900" },
      { th: "จตุจักร", postal: "10900" },
    ],
  },
  {
    th: "บางคอแหลม",
    en: "Bang Kho Laem",
    subdistricts: [
      { th: "บางคอแหลม", postal: "10120" },
      { th: "วัดพระยาไกร", postal: "10120" },
      { th: "บางโคล่", postal: "10120" },
    ],
  },
  {
    th: "ประเวศ",
    en: "Prawet",
    subdistricts: [
      { th: "ประเวศ", postal: "10250" },
      { th: "หนองบอน", postal: "10250" },
      { th: "ดอกไม้", postal: "10250" },
    ],
  },
  {
    th: "คลองเตย",
    en: "Khlong Toei",
    subdistricts: [
      { th: "คลองเตย", postal: "10110" },
      { th: "คลองตัน", postal: "10110" },
      { th: "พระโขนง", postal: "10110" },
    ],
  },
  {
    th: "สวนหลวง",
    en: "Suan Luang",
    subdistricts: [
      { th: "สวนหลวง", postal: "10250" },
      { th: "อ่อนนุช", postal: "10250" },
      { th: "พัฒนาการ", postal: "10250" },
    ],
  },
  {
    th: "จอมทอง",
    en: "Chom Thong",
    subdistricts: [
      { th: "บางขุนเทียน", postal: "10150" },
      { th: "บางค้อ", postal: "10150" },
      { th: "บางมด", postal: "10150" },
      { th: "จอมทอง", postal: "10150" },
    ],
  },
  {
    th: "ดอนเมือง",
    en: "Don Mueang",
    subdistricts: [
      { th: "สีกัน", postal: "10210" },
      { th: "ดอนเมือง", postal: "10210" },
      { th: "สนามบิน", postal: "10210" },
    ],
  },
  {
    th: "ราชเทวี",
    en: "Ratchathewi",
    subdistricts: [
      { th: "ทุ่งพญาไท", postal: "10400" },
      { th: "ถนนพญาไท", postal: "10400" },
      { th: "ถนนเพชรบุรี", postal: "10400" },
      { th: "มักกะสัน", postal: "10400" },
    ],
  },
  {
    th: "ลาดพร้าว",
    en: "Lat Phrao",
    subdistricts: [
      { th: "ลาดพร้าว", postal: "10230" },
      { th: "จรเข้บัว", postal: "10230" },
    ],
  },
  {
    th: "วัฒนา",
    en: "Watthana",
    subdistricts: [
      { th: "คลองเตยเหนือ", postal: "10110" },
      { th: "คลองตันเหนือ", postal: "10110" },
      { th: "พระโขนงเหนือ", postal: "10110" },
    ],
  },
  {
    th: "บางแค",
    en: "Bang Khae",
    subdistricts: [
      { th: "บางแค", postal: "10160" },
      { th: "บางแคเหนือ", postal: "10160" },
      { th: "บางไผ่", postal: "10160" },
      { th: "หลักสอง", postal: "10160" },
    ],
  },
  {
    th: "หลักสี่",
    en: "Lak Si",
    subdistricts: [
      { th: "ทุ่งสองห้อง", postal: "10210" },
      { th: "ตลาดบางเขน", postal: "10210" },
    ],
  },
  {
    th: "สายไหม",
    en: "Sai Mai",
    subdistricts: [
      { th: "สายไหม", postal: "10220" },
      { th: "ออเงิน", postal: "10220" },
      { th: "คลองถนน", postal: "10220" },
    ],
  },
  {
    th: "คันนายาว",
    en: "Khan Na Yao",
    subdistricts: [
      { th: "คันนายาว", postal: "10230" },
      { th: "รามอินทรา", postal: "10230" },
    ],
  },
  {
    th: "สะพานสูง",
    en: "Saphan Sung",
    subdistricts: [
      { th: "สะพานสูง", postal: "10240" },
      { th: "ราษฎร์พัฒนา", postal: "10240" },
      { th: "ทับช้าง", postal: "10250" },
    ],
  },
  {
    th: "วังทองหลาง",
    en: "Wang Thonglang",
    subdistricts: [
      { th: "วังทองหลาง", postal: "10310" },
      { th: "สะพานสอง", postal: "10310" },
      { th: "คลองเจ้าคุณสิงห์", postal: "10310" },
      { th: "พลับพลา", postal: "10310" },
    ],
  },
  {
    th: "คลองสามวา",
    en: "Khlong Sam Wa",
    subdistricts: [
      { th: "สามวาตะวันตก", postal: "10510" },
      { th: "สามวาตะวันออก", postal: "10510" },
      { th: "บางชัน", postal: "10510" },
      { th: "ทรายกองดิน", postal: "10510" },
      { th: "ทรายกองดินใต้", postal: "10510" },
    ],
  },
  {
    th: "บางนา",
    en: "Bang Na",
    subdistricts: [
      { th: "บางนาเหนือ", postal: "10260" },
      { th: "บางนาใต้", postal: "10260" },
    ],
  },
  {
    th: "ทวีวัฒนา",
    en: "Thawi Watthana",
    subdistricts: [
      { th: "ทวีวัฒนา", postal: "10170" },
      { th: "ศาลาธรรมสพน์", postal: "10170" },
    ],
  },
  {
    th: "ทุ่งครุ",
    en: "Thung Khru",
    subdistricts: [
      { th: "บางมด", postal: "10140" },
      { th: "ทุ่งครุ", postal: "10140" },
    ],
  },
  {
    th: "บางบอน",
    en: "Bang Bon",
    subdistricts: [
      { th: "บางบอนเหนือ", postal: "10150" },
      { th: "บางบอนใต้", postal: "10150" },
      { th: "คลองบางพราน", postal: "10150" },
      { th: "คลองบางบอน", postal: "10150" },
    ],
  },
];

/** Look up a district by Thai name (case-sensitive). */
export function findDistrict(districtTh: string): District | undefined {
  return BANGKOK_DISTRICTS.find((d) => d.th === districtTh);
}

/** Look up a subdistrict's postal code given district + subdistrict Thai names. */
export function findPostal(districtTh: string, subdistrictTh: string): string | null {
  const d = findDistrict(districtTh);
  if (!d) return null;
  return d.subdistricts.find((s) => s.th === subdistrictTh)?.postal ?? null;
}
