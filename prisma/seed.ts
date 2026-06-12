import { PrismaClient } from "@prisma/client";

const db = new PrismaClient({
  datasources: { db: { url: process.env.DIRECT_DATABASE_URL } },
});

/**
 * Base seed — reference data only (DESIGN.md §10 host-specified order):
 *   1. product_types
 *   2. product_categories (dress tree, suit tree)
 *   3. tag_groups + tags (occasion group — replaces the old occasions table)
 *   4. areas
 */
export async function seedBase() {
  // ---------------------------------------------------------------------------
  // 1. Product types
  // ---------------------------------------------------------------------------
  const productTypes = [
    { key: "dress", label: "ชุดเดรส" },
    { key: "suit", label: "สูท" },
  ];
  for (const t of productTypes) {
    await db.productType.upsert({ where: { key: t.key }, update: {}, create: t });
  }

  // ---------------------------------------------------------------------------
  // 2. Product categories — one tree per product type (adjacency list)
  // ---------------------------------------------------------------------------
  const dressType = await db.productType.findUniqueOrThrow({ where: { key: "dress" } });
  const suitType = await db.productType.findUniqueOrThrow({ where: { key: "suit" } });

  // roots
  const dressRoot = await db.productCategory.upsert({
    where: { key: "dress-all" },
    update: {},
    create: { key: "dress-all", label: "ชุดเดรสทั้งหมด", productTypeId: dressType.id, sortOrder: 0 },
  });
  await db.productCategory.upsert({
    where: { key: "suit-all" },
    update: {},
    create: { key: "suit-all", label: "สูททั้งหมด", productTypeId: suitType.id, sortOrder: 0 },
  });

  // dress subcategories
  const dressChildren = [
    { key: "evening-dress", label: "ชุดราตรี", sortOrder: 1 },
    { key: "thai-traditional", label: "ชุดไทย", sortOrder: 2 },
  ];
  for (const c of dressChildren) {
    await db.productCategory.upsert({
      where: { key: c.key },
      update: {},
      create: { ...c, productTypeId: dressType.id, parentId: dressRoot.id },
    });
  }

  // ---------------------------------------------------------------------------
  // 3. Tag groups + tags — occasion group replaces the old `occasions` table
  //    (tags.label = old occasions.th; color_token/en moved to a UI constant)
  // ---------------------------------------------------------------------------
  const occasionGroup = await db.tagGroup.upsert({
    where: { key: "occasion" },
    update: {},
    create: { key: "occasion", label: "โอกาสใช้งาน", sortOrder: 0 },
  });

  const occasionTags = [
    { key: "engagement", label: "งานหมั้น" },
    { key: "wedding", label: "งานแต่ง" },
    { key: "cocktail", label: "ค็อกเทล" },
    { key: "evening", label: "ราตรี" },
    { key: "gala", label: "กาล่า" },
    { key: "party", label: "ปาร์ตี้" },
    { key: "work", label: "ทำงาน" },
    { key: "casual", label: "ลำลอง" },
  ];
  for (const t of occasionTags) {
    await db.tag.upsert({
      where: { key: t.key },
      update: {},
      create: { ...t, tagGroupId: occasionGroup.id },
    });
  }

  // ---------------------------------------------------------------------------
  // 4. Areas (uuid PK + key UNIQUE — data unchanged from the old seed)
  // ---------------------------------------------------------------------------
  await db.area.createMany({
    data: [
      { key: "Siam",           th: "สยาม",         lat: 13.7456, lng: 100.5340, keywords: ["siam","สยาม","paragon","พารากอน","centralworld","mbk"] },
      { key: "Chitlom",        th: "ชิดลม",        lat: 13.7441, lng: 100.5424, keywords: ["chitlom","chidlom","ชิดลม"] },
      { key: "Ploenchit",      th: "เพลินจิต",     lat: 13.7437, lng: 100.5476, keywords: ["ploenchit","เพลินจิต","central embassy"] },
      { key: "Wireless",       th: "วิทยุ",        lat: 13.7406, lng: 100.5436, keywords: ["wireless","วิทยุ","witthayu","all seasons"] },
      { key: "Asok",           th: "อโศก",         lat: 13.7376, lng: 100.5612, keywords: ["asok","asoke","อโศก","terminal 21"] },
      { key: "Sukhumvit 11",   th: "สุขุมวิท 11",  lat: 13.7430, lng: 100.5550, keywords: ["sukhumvit 11","นานา","nana"] },
      { key: "Phrom Phong",    th: "พร้อมพงษ์",    lat: 13.7307, lng: 100.5697, keywords: ["phrom phong","พร้อมพงษ์","emporium","emquartier"] },
      { key: "Thonglor",       th: "ทองหล่อ",      lat: 13.7268, lng: 100.5780, keywords: ["thonglor","thong lor","ทองหล่อ","eight thonglor"] },
      { key: "Ekkamai",        th: "เอกมัย",       lat: 13.7237, lng: 100.5849, keywords: ["ekkamai","ekamai","เอกมัย"] },
      { key: "Phra Khanong",   th: "พระโขนง",      lat: 13.7138, lng: 100.5897, keywords: ["phra khanong","พระโขนง","w district"] },
      { key: "Onnut",          th: "อ่อนนุช",      lat: 13.7050, lng: 100.6018, keywords: ["onnut","on nut","อ่อนนุช"] },
      { key: "Watthana",       th: "วัฒนา",        lat: 13.7350, lng: 100.5800, keywords: ["watthana","wattana","วัฒนา"] },
      { key: "Ari",            th: "อารีย์",       lat: 13.7795, lng: 100.5443, keywords: ["ari","ari soi","อารีย์"] },
      { key: "Sathorn",        th: "สาทร",         lat: 13.7220, lng: 100.5290, keywords: ["sathorn","สาทร","empire tower","met sathorn"] },
      { key: "Silom",          th: "สีลม",         lat: 13.7244, lng: 100.5300, keywords: ["silom","สีลม"] },
      { key: "Sala Daeng",     th: "ศาลาแดง",      lat: 13.7244, lng: 100.5345, keywords: ["sala daeng","ศาลาแดง","convent"] },
      { key: "Surawong",       th: "สุรวงศ์",      lat: 13.7280, lng: 100.5260, keywords: ["surawong","สุรวงศ์"] },
      { key: "Bangrak",        th: "บางรัก",       lat: 13.7298, lng: 100.5232, keywords: ["bangrak","บางรัก","เจริญกรุง","saphan taksin"] },
      { key: "Charoenkrung",   th: "เจริญกรุง",    lat: 13.7268, lng: 100.5135, keywords: ["charoenkrung","charoen krung","เจริญกรุง 38"] },
      { key: "Yaowarat",       th: "เยาวราช",      lat: 13.7411, lng: 100.5089, keywords: ["yaowarat","เยาวราช","wat mangkon","สำเพ็ง"] },
      { key: "Pratunam",       th: "ประตูน้ำ",     lat: 13.7521, lng: 100.5403, keywords: ["pratunam","ประตูน้ำ","platinum mall","ratchathewi"] },
      { key: "Lumpini",        th: "ลุมพินี",      lat: 13.7298, lng: 100.5444, keywords: ["lumpini","ลุมพินี"] },
      { key: "Phaya Thai",     th: "พญาไท",        lat: 13.7570, lng: 100.5340, keywords: ["phaya thai","พญาไท"] },
      { key: "Ratchadaphisek", th: "รัชดาภิเษก",  lat: 13.7700, lng: 100.5750, keywords: ["ratchada","รัชดา"] },
      { key: "Bang Na",        th: "บางนา",        lat: 13.6680, lng: 100.6050, keywords: ["bang na","บางนา"] },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Base seed complete (product_types + product_categories + tag_groups/tags + areas)");
}

async function main() {
  await seedBase();
}

// Run only when executed directly (`tsx prisma/seed.ts`) — seed.dev.ts imports
// seedBase and must not trigger a second concurrent run on import.
if (require.main === module) {
  main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => db.$disconnect());
}
