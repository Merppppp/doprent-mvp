# DB Restructure — API / Code Impact Map (Phase 4 input, rev 2)

Change numbers referenced below (full design in `DESIGN.md`):

| # | Schema change |
|---|---|
| 1 | `occasions`: PK `key` → `id uuid` (`key` UNIQUE) |
| 2 | `areas`: PK `key` → `id uuid`; `shops.area_key` → `area_id` uuid FK |
| 3 | `dresses.boutique_name` **dropped** → join `shop.name` |
| 4 | `dresses.occasions text[]` → `product_occasions` join table |
| 5 | `dresses.images json` → `product_images` table |
| 6 | `dresses.price_tiers json` → `product_price_tiers` table |
| 7 | `users.saved_dress_ids uuid[]` → `favorites` table |
| 8 | `line_clicks` / `page_views` PK bigint → uuid |
| 9 | `verification_tokens` + `id` uuid PK (token lookups unchanged) |
| 10 | `dress_blackouts` → `product_blackout_dates`; composite PK → `id` + `UNIQUE(product_id, date)` |
| 11 | `kyc_submissions.submitted_at` → `created_at` (+`updated_at`) |
| 12 | audit columns everywhere + client extension (`withActor`) |
| 13 | timestamps → timestamptz (raw SQL in admin metrics — verified safe) |
| 14 | enum unification: `KycPlan(Free/Boost/Featured)` + `AdsTier` + `SubPlan` → `PlanTier(free/boost/featured)`; `cancel_from_status` text → `booking_status` enum |
| **15** | **(rev 2) Deep renames** — see table R below. Affects every file that touches `db.dress*` / `db.boutique*` / related field names. |
| **16** | **(rev 2) `product_types` table + `products.product_type_id` (NOT NULL, RESTRICT)** — new required field on product create; new filter dimension. |
| **17** | **(rev 2) `admin_audit` dropped → merged into `audit_logs`** (`logAdminAction` rewrite, DESIGN §6.1). |

## Table R — rename map (change 15)

| Old model / accessor | New model / accessor | Old field names | New field names |
|---|---|---|---|
| `Dress` / `db.dress` | `Product` / `db.product` | `boutiqueId`, `boutique` | `shopId`, `shop` (+ new `productTypeId`, `productType`) |
| `DressImage` (was new) | `ProductImage` / `db.productImage` | `dressId`, `dress` | `productId`, `product` |
| `DressPriceTier` | `ProductPriceTier` / `db.productPriceTier` | `dressId` | `productId` |
| `DressOccasion` | `ProductOccasion` / `db.productOccasion` | `dressId` | `productId` |
| `DressBlackout` / `db.dressBlackout` | `ProductBlackoutDate` / `db.productBlackoutDate` | `dressId`; compound key `dressId_date` | `productId`; compound key `productId_date` |
| `SavedDress` (was new) | `Favorite` / `db.favorite` | `dressId`; `userId_dressId` | `productId`; `userId_productId` |
| `Boutique` / `db.boutique` | `Shop` / `db.shop` | relation `dresses` | relation `products` |
| `SellerSubscription` / `db.sellerSubscription` | `ShopSubscription` / `db.shopSubscription` | `boutiqueId`, `boutique` | `shopId`, `shop` |
| `AdminAudit` / `db.adminAudit` | **dropped** → `db.auditLog` | — | DESIGN §6.1 convention |
| `Booking` fields | (model unchanged) | `boutiqueId`, `dressId`, `boutique`, `dress` | `shopId`, `productId`, `shop`, `product` |
| `KycSubmission` fields | (model unchanged) | `boutiqueId`, `boutique` | `shopId`, `shop` |
| `LineClick` fields | (model unchanged) | `boutiqueId`, `dressId` | `shopId`, `productId` |
| `User` relations | (model unchanged) | `boutiques`, `savedDresses`, `sellerSubscriptions`, `adminAuditLogs` | `shops`, `favorites`, `shopSubscriptions`, (dropped) |
| `Area` relation | (model unchanged) | `boutiques` | `shops` |

**Measured blast radius** (rg on current code): `db.dress*` in 15 files, `db.boutique*` in 18 files, `boutiqueId` in 24 files, `dressId` in 26 files, `db.dressBlackout` in 2, `db.sellerSubscription` in 1 (`app/admin/metrics/page.tsx`), `db.adminAudit` in 1 (`app/actions/admin.ts`). These are mostly mechanical find/replace at the Prisma-call layer; the lists in Workstreams A–C below already cover all of these files for other changes, so the rename rides along with the same edits (no extra files beyond those listed, plus the global sweep note below).

### Rename strategy — what MUST rename vs host-optional

- **Mandatory (this restructure):** Prisma model names, `db.*` accessors, Prisma field names (`shopId`/`productId`), and `lib/` layer internals that mirror them (`lib/dresses.ts` query internals, `lib/booking-queries.ts`, types that mirror DB rows in `lib/types.ts`).
- **Host-optional (pure churn — flag, don't do by default):**
  - UI component **file names**: `DressCard.tsx`, `DressCardImage.tsx`, `DressResults.tsx`, `DressForm.tsx`, `DressArt.tsx`, `DressAvailabilityCalendar.tsx` may keep `Dress*` naming — they render dress-type products today and renaming them touches every import with zero behavior gain. Revisit when the suit category actually ships UI.
  - Public **route segments** (`/dress/[id]`, `/boutique/[slug]`, `/boutiques`): renaming = SEO/deep-link breakage; out of scope for a DB restructure. Keep URLs.
  - Public **TS type names** in `lib/types.ts` (`Dress`, `Boutique` shapes consumed by pages): keeping the names keeps the rev-1 "absorb in the mapper" strategy intact — the mapper can map `Product`+`Shop` rows into the existing `Dress`/`Boutique` shapes so pages don't churn. Rename later in a dedicated sweep if the host wants vocabulary purity in the UI layer.
  - `lib/dresses.ts` file name itself — same logic.

Key mitigation that shrinks the blast radius: most pages consume products through `mapDress()` / `mapBoutique()` in **`lib/dresses.ts`**, which already returns plain shapes (`images: string[]`, `price_tiers: PriceTier[]`, `occasions: OccasionKey[]`, `boutique_name`). **Strategy: keep `lib/types.ts` public shapes identical and absorb changes (incl. the renames) inside the mappers** (query `db.product`/`db.shop`, include child relations, flatten to arrays, emit the existing field names). Pages then mostly keep working; only files querying `db` directly need edits.

---

## Workstream A — Data layer + catalog read path (foundation; start first)

Owner files (blocking for B and C — others build on the new mappers):

| File | Changes | Work |
|---|---|---|
| `lib/db.ts` | 12, 17 | Add extension + `withActor` (DESIGN §7); export `base` for `PrismaAdapter` and for `logAdminAction`. |
| `lib/types.ts` | 8, 9, 11, 14, 15, 16 | bigint ids → string; `submitted_at` → `created_at`; `KycPlan` type lowercase; + `ProductType` type + `product_type_key` on the product shape; keep `Dress`/`Boutique` public shapes otherwise UNCHANGED (renaming these TS types = host-optional, see strategy). |
| `lib/dresses.ts` | 1–6, 15, 16 | All queries: `db.dress`→`db.product`, `db.boutique`→`db.shop`, field renames per Table R. `mapDress`: include `images(orderBy sortOrder)`, `priceTiers(orderBy minDays)`, `occasions{occasion.key}`, `productType{key}`, `shop{name, area{key}}` and flatten to the existing output shape (`boutique_name` ← `shop.name`). Search filter `boutiqueName contains` → `shop: { name: { contains } }`; occasions filter → `occasions: { some: { occasion: { key: { in } } } }`. Catalog default filter: `productType: { key: "dress" }` (preserves today's behavior until multi-type browse ships). `FALLBACK_OCCASIONS` keeps `key`. |
| `lib/booking-queries.ts` | 3, 5, 6, 15 | `dress`→`product`, `boutique`→`shop` includes; add `include` for shop name / images / tiers where selected. |
| `lib/tiers.ts` | 14 | No change (already lowercase) — verify only. |
| `prisma/seed.ts`, `prisma/seed.dev.ts` | 1, 2, 4, 5, 6, 14, 15, 16 | Rewrite: **seed `product_types` (`dress`, `suit`) FIRST**; occasions/areas get uuid ids (`key` unique); product seed connects `productType` by key `"dress"` and creates child rows (`product_images`, `product_price_tiers`, `product_occasions` via nested create); shops connect area by `key` lookup; KYC plan lowercase. |
| `app/api/dresses/route.ts` | 3–6, 15 | Goes through new mappers / `db.product`. Route path stays `/api/dresses` (host-optional rename — external callers may exist). |
| `app/browse`, `app/page.tsx`, `components/BrowseFilters.tsx`, `components/DressCard.tsx`, `components/Gallery.tsx`, `components/DistanceBadge.tsx`, `app/boutiques/page.tsx`, `app/boutique/[slug]/page.tsx` | 1–5 (indirect) | Should need **no edits** if mappers preserve shapes — verify + typecheck. Component/route names keep `Dress`/`boutique` (host-optional). DistanceBadge keeps receiving `area.key` via mapper. |
| `app/dress/[id]/page.tsx`, `opengraph-image.tsx` | 3, 4, 5, 7, 15 | `boutique_name` → mapper; saved-check reads `favorites` (`db.favorite.findMany({ where: { userId } })`). |

## Workstream B — Seller + admin write path

| File | Changes | Work |
|---|---|---|
| `app/actions/seller.ts` | 2–6, 12, 14, 15, 16 | `createBoutique`/`updateBoutique` → `db.shop` (function names: rename to `createShop` etc. recommended while editing anyway — internal symbols, cheap). `createDress`/`updateDress` → `db.product`: drop `boutiqueName`; **set `productTypeId` (resolve `db.productType.findUnique({ where: { key: "dress" } })` — seller UI is dress-only today)**; nested `create`/`deleteMany+createMany` for images/tiers/occasions (connect occasion by `key`). `updateDressPriceTiers` → `db.productPriceTier` rewrite. KYC `plan` lowercase. Wrap mutations in `withActor`. |
| `app/sell/kyc/KycWizard.tsx` | 14 | `Plan` type + option values → lowercase; labels unchanged. |
| `app/actions/admin.ts` | 12, 14, 15, 17 | `kyc.plan === "Boost"` → `"boost"`; all `db.dress`/`db.boutique` → `db.product`/`db.shop`; **`logAdminAction` rewritten to write `audit_logs` rows** (`after: { admin_action, reason, ... }` — DESIGN §6.1 helper, writes via `base` so it isn't re-audited); `withActor`. This is the only file writing `db.adminAudit` today; no other file reads it (verified by rg) — no admin audit *list* UI exists yet, so the merge has zero read-path impact; future audit UI uses the §6.1 query. |
| `app/actions/availability.ts` | 10, 12, 15 | `db.dressBlackout` → `db.productBlackoutDate`; compound-unique accessor `dressId_date` → **`productId_date`** (Prisma derives the name from the renamed fields — must change, not optional); or switch to `findFirst`/`deleteMany`. |
| `app/api/dress-blackouts/route.ts` | 10, 15 | Same as above. Route path stays (host-optional). |
| `app/sell/(authed)/dresses/[id]/edit/page.tsx`, `dress/[id]/edit/page.tsx`, `DressForm.tsx` | 4, 5, 6, 15 | Fetch via mapper (occasions as keys, images as urls); form payload format unchanged. File names keep `Dress*` (host-optional). |
| `app/sell/(authed)/dashboard/page.tsx` | 3, 4, 5, 14, 15 | `db.product` + include shop/images; `adsTier` typing via `PlanTier`. |
| `app/sell/(authed)/edit/*` | 2, 15 | Edit form keeps using area `key` in the UI; server resolves key→id; `db.shop`. |
| `app/admin/dresses/*`, `app/admin/boutiques/*`, `app/admin/kyc/*` | 3, 5, 11, 14, 15 | `db.product`/`db.shop`; include shop name/images; `submitted_at` → `created_at`; plan casing. Admin route segments keep names (host-optional). |
| `app/admin/metrics/page.tsx` | 4, 8, 13, 15 | Raw SQL: table names `dresses`→`products`, `boutiques`→`shops`, `seller_subscriptions`→`shop_subscriptions`, `dress_id`→`product_id`, `boutique_id`→`shop_id`; occasions metric `unnest(d.occasions)` → `JOIN product_occasions po JOIN occasions o`. ⚠ raw SQL is invisible to typecheck — this file needs manual verification in `next dev` after rename. |
| `app/admin/clicks/page.tsx` | 3, 8, 15 | LineClick `id` bigint→string if rendered/keyed; `dressId`/`boutiqueId` → `productId`/`shopId` in selects. |

## Workstream C — Renter/booking + auth/tracking

| File | Changes | Work |
|---|---|---|
| `app/actions/bookings.ts` | 3, 5, 6, 12, 15 | Booking create/read: `dressId`→`productId`, `boutiqueId`→`shopId`; read tiers via relation; `withActor`. |
| `app/api/bookings/route.ts` + `app/api/bookings/[id]/**` (7 routes) | 3, 5, 6, 12, 15 | Field renames + includes where product fields used; inject actor. |
| `app/actions/saved.ts`, `components/SaveButton.tsx` | 7, 15 | Replace array toggle with `db.favorite.create`/`delete` (compound key **`userId_productId`**) — component unchanged (file name `SaveButton` fine). |
| `app/account/page.tsx`, `app/account/bookings/**` | 3, 4, 5, 7, 15 | Via mappers + `favorites` fetch. |
| `app/checkout/address/page.tsx`, `components/CheckoutForm.tsx`, `components/DateRangePicker.tsx`, `components/LineMessageCopyBox.tsx` | 3, 5, 6 (indirect) | Props come from mapped shapes — verify only. |
| `app/api/track/route.ts` | 8, 12, 15 | UUID PK transparent; `dressId`/`boutiqueId` payload fields → write to `productId`/`shopId` (keep accepting old JSON keys from cached clients during deploy window); keep excluded from audit (volume). |
| `app/api/auth/{signup,verify-email,resend-verification,forgot-password,reset-password,check-verification}/route.ts` | 9 | Token queried by UNIQUE `token` — **no breaking change**; verify `upsert where { token }` still compiles. |
| `auth.ts`, `middleware.ts`, `app/api/auth/[...nextauth]/route.ts` | 12 | Pass un-extended `base` client to `PrismaAdapter` (DESIGN §8.4). Renames don't touch adapter tables. |
| `app/api/cron/expire-payments/route.ts` | 12, 15 | Runs with null actor — confirm extension tolerates it; booking field renames. |
| `app/debug/page.tsx`, `components/Header.tsx` | 7, 15 | Saved count via `db.favorite.count`. |

---

## Sequencing & verification

1. **A first** (db.ts, types.ts, mappers, seeds) — B and C depend on the mapper contract.
2. B and C can run **in parallel** after A lands.
3. The rename (15) is enforced by the compiler: after `prisma generate`, every stale `db.dress`/`db.boutique`/`boutiqueId` reference is a type error — `npm run typecheck` is the rename checklist. **Exceptions invisible to typecheck:** raw SQL in `app/admin/metrics/page.tsx` and any string literals (`entityType` values, track-API payload keys) — grep `dress\b|boutique` after the sweep.
4. Gate for every workstream: `npm run typecheck` + `npm run lint` + manual flow check in `next dev` (no automated tests in this repo).
5. Highest-risk spots: `lib/dresses.ts` mapper rewrite (touches every page), `app/admin/metrics/page.tsx` raw SQL (rename + join rewrite), seller `updateDress` child-table sync + `productTypeId` injection, KycPlan value-case change, `logAdminAction` → audit_logs rewrite.
