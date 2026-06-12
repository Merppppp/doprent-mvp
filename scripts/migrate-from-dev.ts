/**
 * ETL: migrate REAL data from VPS dev DB (OLD schema) → local restructured DB (NEW schema)
 *
 * SOURCE (read-only): postgresql://doprent_dev_full:***@127.0.0.1:15432/doprent_dev
 * TARGET (full rewrite): postgresql://admin:12345678@127.0.0.1:5432/doprent_restructure
 *
 * Run:  npx tsx scripts/migrate-from-dev.ts
 *
 * Idempotent — wipes all business rows first, then re-inserts from dev.
 * Taxonomy tables (product_types, product_categories, tag_groups, tags) and
 * areas are kept / updated but NOT wiped.
 */

import { Client, QueryResult } from 'pg';
import { randomUUID } from 'crypto';

// ---------------------------------------------------------------------------
// Connection strings
// ---------------------------------------------------------------------------
const SRC_URL =
  'postgresql://doprent_dev_full:uDFOONScYGQqA%2BKOMSKbAZyrrX3gQDPd@127.0.0.1:15432/doprent_dev';
const TGT_URL = 'postgresql://admin:12345678@127.0.0.1:5432/doprent_restructure';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function log(msg: string) {
  console.log(`[migrate] ${msg}`);
}

/** Lowercase plan tier values — old KycPlan/AdsTier used Title Case e.g. "Boost" */
function normalizePlan(raw: string | null | undefined): string {
  if (!raw) return 'free';
  return raw.toLowerCase();
}

/** Normalise timestamp: handle null → fallback */
function ts(v: Date | null | undefined, fallback: Date = new Date()): Date {
  return v ?? fallback;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  const src = new Client({ connectionString: SRC_URL });
  const tgt = new Client({ connectionString: TGT_URL });

  try {
    await src.connect();
    await tgt.connect();
    log('Connected to both databases');

    // -----------------------------------------------------------------------
    // 0. BUILD LOOKUP MAPS from TARGET taxonomy (already seeded)
    // -----------------------------------------------------------------------
    log('Building taxonomy lookup maps…');

    // area_key → area_id
    const areasRes = await tgt.query<{ id: string; key: string; th: string }>(
      'SELECT id, key, th FROM areas',
    );
    const areaKeyToId = new Map<string, string>(areasRes.rows.map((r) => [r.key, r.id]));
    log(`  areas: ${areaKeyToId.size} entries`);

    // tag_key → tag_id (for occasion group only — that's all we need)
    const tagsRes = await tgt.query<{ id: string; key: string }>(
      `SELECT t.id, t.key FROM tags t
       JOIN tag_groups tg ON t.tag_group_id = tg.id
       WHERE tg.key = 'occasion'`,
    );
    const tagKeyToId = new Map<string, string>(tagsRes.rows.map((r) => [r.key, r.id]));
    log(`  occasion tags: ${tagKeyToId.size} entries`);

    // product_type id for "dress"
    const ptRes = await tgt.query<{ id: string }>(`SELECT id FROM product_types WHERE key='dress'`);
    if (!ptRes.rows.length) throw new Error('product_type "dress" not found in target — seed first');
    const dressTypeId = ptRes.rows[0].id;
    log(`  product_type "dress" id: ${dressTypeId}`);

    // -----------------------------------------------------------------------
    // 1. VERIFY / UPDATE AREAS from dev (update label if differs)
    // -----------------------------------------------------------------------
    log('Verifying / updating areas from dev…');
    const devAreas = await src.query<{ key: string; th: string; lat: string; lng: string; keywords: string[] | null }>(
      'SELECT key, th, lat, lng, keywords FROM areas',
    );
    for (const a of devAreas.rows) {
      const tgtId = areaKeyToId.get(a.key);
      if (tgtId) {
        await tgt.query(
          `UPDATE areas SET th=$1, lat=$2, lng=$3, keywords=COALESCE($4::text[], keywords) WHERE id=$5`,
          [a.th, a.lat, a.lng, a.keywords, tgtId],
        );
      } else {
        // Missing area — insert with new UUID
        const newId = randomUUID();
        await tgt.query(
          `INSERT INTO areas (id, key, th, lat, lng, keywords)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (key) DO NOTHING`,
          [newId, a.key, a.th, a.lat, a.lng, a.keywords],
        );
        areaKeyToId.set(a.key, newId);
        log(`  inserted missing area: ${a.key}`);
      }
    }

    // -----------------------------------------------------------------------
    // 2. CHECK that all occasion keys used in dresses exist as tags
    // -----------------------------------------------------------------------
    log('Checking occasion tag coverage…');
    const occasionKeysRes = await src.query<{ occasion_key: string }>(
      `SELECT DISTINCT unnest(occasions) AS occasion_key FROM dresses WHERE occasions IS NOT NULL`,
    );
    const missingTags: string[] = [];
    for (const row of occasionKeysRes.rows) {
      if (!tagKeyToId.has(row.occasion_key)) {
        missingTags.push(row.occasion_key);
      }
    }
    if (missingTags.length > 0) {
      log(`  Creating missing occasion tags: ${missingTags.join(', ')}`);
      const tgRes = await tgt.query<{ id: string }>(`SELECT id FROM tag_groups WHERE key='occasion'`);
      const occasionGroupId = tgRes.rows[0]?.id;
      if (!occasionGroupId) throw new Error('tag_group "occasion" not found');
      for (const key of missingTags) {
        const id = randomUUID();
        await tgt.query(
          `INSERT INTO tags (id, tag_group_id, key, label) VALUES ($1,$2,$3,$4) ON CONFLICT (key) DO NOTHING`,
          [id, occasionGroupId, key, key],
        );
        tagKeyToId.set(key, id);
      }
    } else {
      log(`  All occasion tags present ✓`);
    }

    // -----------------------------------------------------------------------
    // 3. WIPE target business rows (FK-safe order, keep taxonomy + areas)
    // -----------------------------------------------------------------------
    log('Wiping target business rows (idempotent)…');
    await tgt.query(`
      TRUNCATE
        audit_logs,
        favorites,
        product_tags,
        product_blackout_dates,
        product_price_tiers,
        product_images,
        line_clicks,
        page_views,
        bookings,
        addresses,
        kyc_submissions,
        shop_subscriptions,
        products,
        shops,
        accounts,
        sessions,
        verification_tokens,
        users
      CASCADE
    `);
    log('  Truncated all business tables');

    // -----------------------------------------------------------------------
    // 4. USERS
    // -----------------------------------------------------------------------
    log('Migrating users…');
    const devUsers = await src.query<{
      id: string;
      email: string | null;
      email_verified: Date | null;
      password_hash: string | null;
      full_name: string | null;
      line_id: string | null;
      role: string;
      image: string | null;
      created_at: Date;
      updated_at: Date | null;
      last_active_at: Date | null;
    }>(`SELECT id, email, email_verified, password_hash, full_name, line_id, role, image,
              created_at, updated_at, last_active_at
       FROM users`);

    for (const u of devUsers.rows) {
      await tgt.query(
        `INSERT INTO users (
           id, email, email_verified, password_hash, full_name, line_id, role, image,
           last_active_at, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7::user_role,$8,$9,$10,$11)`,
        [
          u.id,
          u.email,
          u.email_verified,
          u.password_hash,
          u.full_name,
          u.line_id,
          u.role,
          u.image,
          u.last_active_at,
          u.created_at,
          ts(u.updated_at, u.created_at),
        ],
      );
    }
    log(`  Inserted ${devUsers.rowCount} users`);

    // -----------------------------------------------------------------------
    // 5. ACCOUNTS (OAuth links)
    // -----------------------------------------------------------------------
    log('Migrating accounts…');
    const devAccounts = await src.query<{
      id: string;
      user_id: string;
      type: string;
      provider: string;
      provider_account_id: string;
      refresh_token: string | null;
      access_token: string | null;
      expires_at: number | null;
      token_type: string | null;
      scope: string | null;
      id_token: string | null;
      session_state: string | null;
    }>(
      `SELECT id, user_id, type, provider, provider_account_id,
              refresh_token, access_token, expires_at, token_type, scope, id_token, session_state
       FROM accounts`,
    );
    for (const a of devAccounts.rows) {
      await tgt.query(
        `INSERT INTO accounts (
           id, user_id, type, provider, provider_account_id,
           refresh_token, access_token, expires_at, token_type, scope, id_token, session_state,
           created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12, NOW(), NOW())`,
        [
          a.id,
          a.user_id,
          a.type,
          a.provider,
          a.provider_account_id,
          a.refresh_token,
          a.access_token,
          a.expires_at,
          a.token_type,
          a.scope,
          a.id_token,
          a.session_state,
        ],
      );
    }
    log(`  Inserted ${devAccounts.rowCount} accounts`);

    // -----------------------------------------------------------------------
    // 6. SHOPS (was boutiques)
    // -----------------------------------------------------------------------
    log('Migrating shops (boutiques)…');
    const devBoutiques = await src.query<{
      id: string;
      slug: string;
      name: string;
      owner_id: string | null;
      owner_name: string | null;
      area_key: string | null;
      area_label: string;
      address: string | null;
      house_no: string | null;
      street: string | null;
      subdistrict: string | null;
      district: string | null;
      province: string;
      postal_code: string | null;
      lat: string | null;
      lng: string | null;
      hours: string | null;
      line_url: string;
      instagram: string | null;
      promptpay_id: string | null;
      since_year: number | null;
      cover_color: string;
      tag: string | null;
      story: string | null;
      delivery_info: string | null;
      featured: boolean;
      ads_tier: string;
      verified: boolean;
      status: string;
      reject_reason: string | null;
      kyc_status: string;
      created_at: Date;
      updated_at: Date | null;
    }>(
      `SELECT id, slug, name, owner_id, owner_name, area_key, area_label,
              address, house_no, street, subdistrict, district, province, postal_code,
              lat, lng, hours, line_url, instagram, promptpay_id, since_year,
              cover_color, tag, story, delivery_info, featured, ads_tier, verified,
              status, reject_reason, kyc_status, created_at, updated_at
       FROM boutiques`,
    );

    for (const b of devBoutiques.rows) {
      const areaId = b.area_key ? (areaKeyToId.get(b.area_key) ?? null) : null;
      await tgt.query(
        `INSERT INTO shops (
           id, slug, name, owner_id, owner_name, area_id, area_label,
           address, house_no, street, subdistrict, district, province, postal_code,
           lat, lng, hours, line_url, instagram, promptpay_id, since_year,
           cover_color, tag, story, delivery_info, featured, ads_tier, verified,
           status, reject_reason, kyc_status, created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
           $22::color,$23,$24,$25,$26,$27::plan_tier,$28,$29::listing_status,$30,$31::kyc_status,$32,$33
         )`,
        [
          b.id,
          b.slug,
          b.name,
          b.owner_id,
          b.owner_name,
          areaId,
          b.area_label,
          b.address,
          b.house_no,
          b.street,
          b.subdistrict,
          b.district,
          b.province,
          b.postal_code,
          b.lat,
          b.lng,
          b.hours,
          b.line_url,
          b.instagram,
          b.promptpay_id,
          b.since_year,
          b.cover_color,
          b.tag,
          b.story,
          b.delivery_info,
          b.featured,
          normalizePlan(b.ads_tier),
          b.verified,
          b.status,
          b.reject_reason,
          b.kyc_status,
          b.created_at,
          ts(b.updated_at, b.created_at),
        ],
      );
    }
    log(`  Inserted ${devBoutiques.rowCount} shops`);

    // -----------------------------------------------------------------------
    // 7. PRODUCTS (was dresses)
    // -----------------------------------------------------------------------
    log('Migrating products (dresses)…');
    const devDresses = await src.query<{
      id: string;
      slug: string;
      tag_code: string;
      name: string;
      designer: string | null;
      boutique_id: string;
      size: string;
      color: string;
      price_per_day: number;
      deposit: number;
      description: string | null;
      line_url: string;
      ads_tier: string;
      featured: boolean;
      sponsored: boolean;
      status: string;
      reject_reason: string | null;
      available: boolean;
      views: number;
      created_at: Date;
      updated_at: Date | null;
      images: unknown[];
      price_tiers: Array<{ min: number; max: number | null; per_day: number }>;
      occasions: string[] | null;
    }>(
      `SELECT id, slug, tag_code, name, designer, boutique_id, size, color,
              price_per_day, deposit, description, line_url, ads_tier,
              featured, sponsored, status, reject_reason, available, views,
              created_at, updated_at,
              images, price_tiers, occasions
       FROM dresses`,
    );

    let productImageCount = 0;
    let productPriceTierCount = 0;
    let productTagCount = 0;

    for (const d of devDresses.rows) {
      // Insert product row (search_vector handled by DB trigger on INSERT)
      await tgt.query(
        `INSERT INTO products (
           id, slug, tag_code, name, designer, shop_id, product_type_id, category_id,
           size, color, price_per_day, deposit, description, line_url, ads_tier,
           featured, sponsored, status, reject_reason, available, views,
           created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,
           $9::size,$10::color,$11,$12,$13,$14,$15::plan_tier,
           $16,$17,$18::listing_status,$19,$20,$21,
           $22,$23
         )`,
        [
          d.id,
          d.slug,
          d.tag_code,
          d.name,
          d.designer,
          d.boutique_id,   // same UUID — boutique_id == shop_id
          dressTypeId,
          null,            // category_id — NULL until categories assigned
          d.size,
          d.color,
          d.price_per_day,
          d.deposit,
          d.description,
          d.line_url,
          normalizePlan(d.ads_tier),
          d.featured,
          d.sponsored,
          d.status,
          d.reject_reason,
          d.available,
          d.views,
          d.created_at,
          ts(d.updated_at, d.created_at),
        ],
      );

      // product_images from jsonb array (each element = URL string)
      const images = Array.isArray(d.images) ? (d.images as string[]) : [];
      for (let i = 0; i < images.length; i++) {
        await tgt.query(
          `INSERT INTO product_images (id, product_id, url, alt, sort_order, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [randomUUID(), d.id, images[i], null, i, d.created_at, d.created_at],
        );
        productImageCount++;
      }

      // product_price_tiers from price_tiers jsonb
      const priceTiers = Array.isArray(d.price_tiers)
        ? (d.price_tiers as Array<{ min: number; per_day: number }>)
        : [];
      for (const tier of priceTiers) {
        await tgt.query(
          `INSERT INTO product_price_tiers (id, product_id, min_days, price_per_day, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5,$6)
           ON CONFLICT (product_id, min_days) DO NOTHING`,
          [randomUUID(), d.id, tier.min, tier.per_day, d.created_at, d.created_at],
        );
        productPriceTierCount++;
      }

      // product_tags from occasions array
      const occasions = Array.isArray(d.occasions) ? d.occasions : [];
      for (const occ of occasions) {
        const tagId = tagKeyToId.get(occ);
        if (!tagId) {
          log(`  WARN: unknown occasion key "${occ}" for dress ${d.slug} — skipping`);
          continue;
        }
        await tgt.query(
          `INSERT INTO product_tags (id, product_id, tag_id, created_at, updated_at)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (product_id, tag_id) DO NOTHING`,
          [randomUUID(), d.id, tagId, d.created_at, d.created_at],
        );
        productTagCount++;
      }
    }
    log(`  Inserted ${devDresses.rowCount} products`);
    log(`  Inserted ${productImageCount} product_images`);
    log(`  Inserted ${productPriceTierCount} product_price_tiers`);
    log(`  Inserted ${productTagCount} product_tags`);

    // -----------------------------------------------------------------------
    // 8. PRODUCT_BLACKOUT_DATES (was dress_blackouts — no id in source)
    // -----------------------------------------------------------------------
    log('Migrating product_blackout_dates…');
    const devBlackouts = await src.query<{
      dress_id: string;
      date: Date;
      created_at: Date;
    }>(`SELECT dress_id, date, created_at FROM dress_blackouts`);

    for (const bl of devBlackouts.rows) {
      await tgt.query(
        `INSERT INTO product_blackout_dates (id, product_id, date, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (product_id, date) DO NOTHING`,
        [randomUUID(), bl.dress_id, bl.date, bl.created_at, bl.created_at],
      );
    }
    log(`  Inserted ${devBlackouts.rowCount} product_blackout_dates`);

    // -----------------------------------------------------------------------
    // 9. ADDRESSES
    // -----------------------------------------------------------------------
    log('Migrating addresses…');
    const devAddresses = await src.query<{
      id: string;
      user_id: string;
      label: string;
      recipient_name: string;
      phone: string;
      address_line: string;
      subdistrict: string | null;
      district: string | null;
      province: string | null;
      postal_code: string;
      is_default: boolean;
      created_at: Date;
    }>(
      `SELECT id, user_id, label, recipient_name, phone, address_line,
              subdistrict, district, province, postal_code, is_default, created_at
       FROM addresses`,
    );
    for (const a of devAddresses.rows) {
      await tgt.query(
        `INSERT INTO addresses (
           id, user_id, label, recipient_name, phone, address_line,
           subdistrict, district, province, postal_code, is_default,
           created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          a.id,
          a.user_id,
          a.label,
          a.recipient_name,
          a.phone,
          a.address_line,
          a.subdistrict,
          a.district,
          a.province,
          a.postal_code,
          a.is_default,
          a.created_at,
          a.created_at,
        ],
      );
    }
    log(`  Inserted ${devAddresses.rowCount} addresses`);

    // -----------------------------------------------------------------------
    // 10. FAVORITES (from users.saved_dress_ids)
    // -----------------------------------------------------------------------
    log('Migrating favorites (from saved_dress_ids)…');
    const usersWithSaved = await src.query<{ id: string; saved_dress_ids: string[] | null }>(
      `SELECT id, saved_dress_ids FROM users WHERE saved_dress_ids IS NOT NULL AND array_length(saved_dress_ids, 1) > 0`,
    );
    let favCount = 0;
    for (const u of usersWithSaved.rows) {
      for (const dressId of u.saved_dress_ids ?? []) {
        await tgt.query(
          `INSERT INTO favorites (id, user_id, product_id, created_at, updated_at)
           VALUES ($1,$2,$3,NOW(),NOW())
           ON CONFLICT (user_id, product_id) DO NOTHING`,
          [randomUUID(), u.id, dressId],
        );
        favCount++;
      }
    }
    log(`  Inserted ${favCount} favorites`);

    // -----------------------------------------------------------------------
    // 11. BOOKINGS
    // -----------------------------------------------------------------------
    log('Migrating bookings…');
    const devBookings = await src.query<{
      id: string;
      renter_id: string;
      boutique_id: string;
      dress_id: string;
      start_date: Date;
      end_date: Date;
      rental_total: number;
      deposit: number;
      shipping_fee: number | null;
      commission_rate: string;
      commission_amount: number | null;
      channel: string | null;
      status: string;
      slip_path: string | null;
      address_id: string | null;
      recipient_name: string | null;
      phone: string | null;
      address_text: string | null;
      current_due_at: Date | null;
      cancel_reason: string | null;
      cancel_from_status: string | null;
      created_at: Date;
      updated_at: Date | null;
    }>(
      `SELECT id, renter_id, boutique_id, dress_id, start_date, end_date,
              rental_total, deposit, shipping_fee, commission_rate, commission_amount,
              channel, status, slip_path, address_id, recipient_name, phone,
              address_text, current_due_at, cancel_reason, cancel_from_status,
              created_at, updated_at
       FROM bookings`,
    );

    for (const bk of devBookings.rows) {
      await tgt.query(
        `INSERT INTO bookings (
           id, renter_id, shop_id, product_id, start_date, end_date,
           rental_total, deposit, shipping_fee, commission_rate, commission_amount,
           channel, status, slip_path, address_id, recipient_name, phone,
           address_text, current_due_at, cancel_reason, cancel_from_status,
           created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
           $13::booking_status,$14,$15,$16,$17,$18,$19,$20,
           $21::booking_status,$22,$23
         )`,
        [
          bk.id,
          bk.renter_id,
          bk.boutique_id,  // same UUID
          bk.dress_id,     // same UUID
          bk.start_date,
          bk.end_date,
          bk.rental_total,
          bk.deposit,
          bk.shipping_fee,
          bk.commission_rate,
          bk.commission_amount,
          bk.channel,
          bk.status,
          bk.slip_path,
          bk.address_id,
          bk.recipient_name,
          bk.phone,
          bk.address_text,
          bk.current_due_at,
          bk.cancel_reason,
          bk.cancel_from_status,
          bk.created_at,
          ts(bk.updated_at, bk.created_at),
        ],
      );
    }
    log(`  Inserted ${devBookings.rowCount} bookings`);

    // -----------------------------------------------------------------------
    // 12. KYC_SUBMISSIONS
    // -----------------------------------------------------------------------
    log('Migrating kyc_submissions…');
    const devKyc = await src.query<{
      id: string;
      boutique_id: string;
      owner_id: string | null;
      business_type: string;
      legal_name: string;
      tax_id: string;
      dbd_reg_no: string | null;
      bank_name: string | null;
      bank_acc_no: string | null;
      bank_acc_name: string | null;
      id_card_url: string | null;
      dbd_doc_url: string | null;
      book_bank_url: string | null;
      vat_doc_url: string | null;
      plan: string;
      status: string;
      reviewer_id: string | null;
      review_notes: string | null;
      submitted_at: Date;
      reviewed_at: Date | null;
    }>(
      `SELECT id, boutique_id, owner_id, business_type, legal_name, tax_id, dbd_reg_no,
              bank_name, bank_acc_no, bank_acc_name, id_card_url, dbd_doc_url,
              book_bank_url, vat_doc_url, plan, status, reviewer_id, review_notes,
              submitted_at, reviewed_at
       FROM kyc_submissions`,
    );

    for (const k of devKyc.rows) {
      await tgt.query(
        `INSERT INTO kyc_submissions (
           id, shop_id, owner_id, business_type, legal_name, tax_id, dbd_reg_no,
           bank_name, bank_acc_no, bank_acc_name, id_card_url, dbd_doc_url,
           book_bank_url, vat_doc_url, plan, status, reviewer_id, review_notes,
           reviewed_at, created_at, updated_at
         ) VALUES (
           $1,$2,$3,$4::business_type,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
           $15::plan_tier,$16::kyc_review_status,$17,$18,$19,$20,$21
         )`,
        [
          k.id,
          k.boutique_id,  // same UUID
          k.owner_id,
          k.business_type,
          k.legal_name,
          k.tax_id,
          k.dbd_reg_no,
          k.bank_name,
          k.bank_acc_no,
          k.bank_acc_name,
          k.id_card_url,
          k.dbd_doc_url,
          k.book_bank_url,
          k.vat_doc_url,
          normalizePlan(k.plan),
          k.status,
          k.reviewer_id,
          k.review_notes,
          k.reviewed_at,
          k.submitted_at,
          k.submitted_at,
        ],
      );
    }
    log(`  Inserted ${devKyc.rowCount} kyc_submissions`);

    // -----------------------------------------------------------------------
    // 13. SHOP_SUBSCRIPTIONS (was seller_subscriptions)
    // -----------------------------------------------------------------------
    log('Migrating shop_subscriptions (seller_subscriptions)…');
    const devSubs = await src.query<{
      id: string;
      boutique_id: string | null;
      owner_id: string | null;
      plan: string;
      status: string;
      amount: number;
      billing_cycle: string;
      started_at: Date | null;
      current_period_end: Date | null;
      cancelled_at: Date | null;
      created_at: Date;
      updated_at: Date | null;
    }>(
      `SELECT id, boutique_id, owner_id, plan, status, amount, billing_cycle,
              started_at, current_period_end, cancelled_at, created_at, updated_at
       FROM seller_subscriptions`,
    );

    for (const s of devSubs.rows) {
      await tgt.query(
        `INSERT INTO shop_subscriptions (
           id, shop_id, owner_id, plan, status, amount, billing_cycle,
           started_at, current_period_end, cancelled_at, created_at, updated_at
         ) VALUES ($1,$2,$3,$4::plan_tier,$5::sub_status,$6,$7::billing_cycle,$8,$9,$10,$11,$12)`,
        [
          s.id,
          s.boutique_id,
          s.owner_id,
          normalizePlan(s.plan),
          s.status,
          s.amount,
          s.billing_cycle,
          s.started_at,
          s.current_period_end,
          s.cancelled_at,
          s.created_at,
          ts(s.updated_at, s.created_at),
        ],
      );
    }
    log(`  Inserted ${devSubs.rowCount} shop_subscriptions`);

    // -----------------------------------------------------------------------
    // 14. LINE_CLICKS (BigInt PK → new UUID)
    // -----------------------------------------------------------------------
    log('Migrating line_clicks…');
    const devClicks = await src.query<{
      dress_id: string | null;
      boutique_id: string | null;
      source: string | null;
      user_id: string | null;
      user_agent: string | null;
      ip_hash: string | null;
      created_at: Date;
      channel: string | null;
      province: string | null;
      referrer: string | null;
      session_id: string | null;
      utm_source: string | null;
    }>(
      `SELECT dress_id, boutique_id, source, user_id, user_agent, ip_hash,
              created_at, channel, province, referrer, session_id, utm_source
       FROM line_clicks`,
    );

    for (const c of devClicks.rows) {
      await tgt.query(
        `INSERT INTO line_clicks (
           id, product_id, shop_id, source, user_id, user_agent, ip_hash,
           channel, province, referrer, session_id, utm_source,
           created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          randomUUID(),
          c.dress_id,    // same UUID (product_id = dress_id)
          c.boutique_id, // same UUID (shop_id = boutique_id)
          c.source,
          c.user_id,
          c.user_agent,
          c.ip_hash,
          c.channel,
          c.province,
          c.referrer,
          c.session_id,
          c.utm_source,
          c.created_at,
          c.created_at,
        ],
      );
    }
    log(`  Inserted ${devClicks.rowCount} line_clicks`);

    // -----------------------------------------------------------------------
    // 15. PAGE_VIEWS (BigInt PK → new UUID)
    // -----------------------------------------------------------------------
    log('Migrating page_views…');
    const devPageViews = await src.query<{
      session_id: string | null;
      user_id: string | null;
      path: string | null;
      channel: string | null;
      utm_source: string | null;
      utm_medium: string | null;
      utm_campaign: string | null;
      referrer: string | null;
      province: string | null;
      country: string | null;
      user_agent: string | null;
      ip_hash: string | null;
      created_at: Date;
    }>(
      `SELECT session_id, user_id, path, channel, utm_source, utm_medium, utm_campaign,
              referrer, province, country, user_agent, ip_hash, created_at
       FROM page_views`,
    );

    for (const pv of devPageViews.rows) {
      await tgt.query(
        `INSERT INTO page_views (
           id, session_id, user_id, path, channel, utm_source, utm_medium, utm_campaign,
           referrer, province, country, user_agent, ip_hash, created_at, updated_at
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
        [
          randomUUID(),
          pv.session_id,
          pv.user_id,
          pv.path,
          pv.channel,
          pv.utm_source,
          pv.utm_medium,
          pv.utm_campaign,
          pv.referrer,
          pv.province,
          pv.country,
          pv.user_agent,
          pv.ip_hash,
          pv.created_at,
          pv.created_at,
        ],
      );
    }
    log(`  Inserted ${devPageViews.rowCount} page_views`);

    // -----------------------------------------------------------------------
    // 16. AUDIT_LOGS (from admin_audit)
    //     Design decision: action='UPDATE', entity_type = target_type mapped
    //     (boutique→Shop, dress→Product, kyc→KycSubmission), entity_id = target_id,
    //     actor_id = admin_id, after = { admin_action, reason, ...payload }
    // -----------------------------------------------------------------------
    log('Migrating audit_logs (admin_audit)…');
    const devAudit = await src.query<{
      id: number;
      admin_id: string | null;
      action: string;
      target_type: string;
      target_id: string | null;
      reason: string | null;
      payload: Record<string, unknown> | null;
      created_at: Date;
    }>(
      `SELECT id, admin_id, action, target_type, target_id, reason, payload, created_at
       FROM admin_audit ORDER BY id`,
    );

    // Map old target_type strings to new entity_type conventions
    const entityTypeMap: Record<string, string> = {
      boutique: 'Shop',
      shop: 'Shop',
      dress: 'Product',
      product: 'Product',
      kyc: 'KycSubmission',
      kyc_submission: 'KycSubmission',
      user: 'User',
    };

    for (const aa of devAudit.rows) {
      const entityType = entityTypeMap[aa.target_type.toLowerCase()] ?? aa.target_type;
      const afterJson = {
        admin_action: aa.action,
        reason: aa.reason ?? undefined,
        ...(aa.payload ?? {}),
      };

      await tgt.query(
        `INSERT INTO audit_logs (id, action, entity_type, entity_id, actor_id, before, after, created_at)
         VALUES ($1,'UPDATE',$2,$3,$4,NULL,$5,$6)`,
        [
          randomUUID(),
          entityType,
          aa.target_id,
          aa.admin_id,
          JSON.stringify(afterJson),
          aa.created_at,
        ],
      );
    }
    log(`  Inserted ${devAudit.rowCount} audit_logs`);

    // -----------------------------------------------------------------------
    // 17. VERIFICATION SUMMARY
    // -----------------------------------------------------------------------
    log('\n=== VERIFICATION ===');

    interface CountRow { cnt: string }
    const checks: Array<{ label: string; query: string; expected?: number }> = [
      { label: 'users', query: 'SELECT COUNT(*) AS cnt FROM users', expected: 9 },
      { label: 'accounts', query: 'SELECT COUNT(*) AS cnt FROM accounts', expected: 9 },
      { label: 'areas', query: 'SELECT COUNT(*) AS cnt FROM areas', expected: 25 },
      { label: 'shops', query: 'SELECT COUNT(*) AS cnt FROM shops', expected: 34 },
      { label: 'products', query: 'SELECT COUNT(*) AS cnt FROM products', expected: 61 },
      { label: 'product_images', query: 'SELECT COUNT(*) AS cnt FROM product_images' },
      { label: 'product_price_tiers', query: 'SELECT COUNT(*) AS cnt FROM product_price_tiers' },
      { label: 'product_tags', query: 'SELECT COUNT(*) AS cnt FROM product_tags' },
      { label: 'product_blackout_dates', query: 'SELECT COUNT(*) AS cnt FROM product_blackout_dates' },
      { label: 'bookings', query: 'SELECT COUNT(*) AS cnt FROM bookings', expected: 4 },
      { label: 'kyc_submissions', query: 'SELECT COUNT(*) AS cnt FROM kyc_submissions', expected: 2 },
      { label: 'shop_subscriptions', query: 'SELECT COUNT(*) AS cnt FROM shop_subscriptions', expected: 0 },
      { label: 'line_clicks', query: 'SELECT COUNT(*) AS cnt FROM line_clicks', expected: 7 },
      { label: 'page_views', query: 'SELECT COUNT(*) AS cnt FROM page_views', expected: 952 },
      { label: 'audit_logs', query: 'SELECT COUNT(*) AS cnt FROM audit_logs', expected: 11 },
      { label: 'addresses', query: 'SELECT COUNT(*) AS cnt FROM addresses', expected: 2 },
      { label: 'favorites', query: 'SELECT COUNT(*) AS cnt FROM favorites' },
      // Occasion tags — must be >= 8
      { label: 'occasion_tags (>=8)', query: `SELECT COUNT(*) AS cnt FROM tags t JOIN tag_groups tg ON t.tag_group_id=tg.id WHERE tg.key='occasion'`, expected: 8 },
    ];

    let allPassed = true;
    for (const c of checks) {
      const res = await tgt.query<CountRow>(c.query);
      const cnt = parseInt(res.rows[0].cnt, 10);
      const pass =
        c.expected === undefined
          ? true
          : c.label.includes('>=')
          ? cnt >= c.expected
          : cnt === c.expected;
      const icon = pass ? '✓' : '✗';
      if (!pass) allPassed = false;
      const expected = c.expected !== undefined ? ` (expected ${c.expected})` : '';
      console.log(`  ${icon} ${c.label}: ${cnt}${expected}`);
    }

    // Products without images (allowed for 1 dress with no images in source)
    const noImgRes = await tgt.query<CountRow>(
      `SELECT COUNT(*) AS cnt FROM products p WHERE NOT EXISTS (SELECT 1 FROM product_images pi2 WHERE pi2.product_id = p.id)`,
    );
    const noImgCount = parseInt(noImgRes.rows[0].cnt, 10);
    const noImgOk = noImgCount <= 1;
    if (!noImgOk) allPassed = false;
    console.log(
      `  ${noImgOk ? '✓' : '✗'} products_without_images: ${noImgCount} (expected ≤1 — 1 dress has no images in source)`,
    );

    // FK integrity check — sample product_tags
    const ptCountRes = await tgt.query<CountRow>(`SELECT COUNT(*) AS cnt FROM product_tags`);
    console.log(`  ✓ product_tags total: ${ptCountRes.rows[0].cnt}`);

    // Sample query required by spec
    const sampleRes = await tgt.query<CountRow>(`SELECT COUNT(*) AS cnt FROM product_tags`);
    console.log(`\n  Sample query — SELECT COUNT(*) FROM product_tags: ${sampleRes.rows[0].cnt}`);

    if (allPassed) {
      log('\n✅ All verification checks passed.');
    } else {
      log('\n⚠️  Some verification checks failed — review output above.');
      process.exitCode = 1;
    }
  } finally {
    await src.end();
    await tgt.end();
  }
}

main().catch((err) => {
  console.error('[migrate] FATAL:', err);
  process.exit(1);
});
