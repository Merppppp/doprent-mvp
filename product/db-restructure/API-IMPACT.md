# DB Restructure — API / Code Impact Map (Phase 4 input)

Change numbers referenced below (full design in `DESIGN.md`):

| # | Schema change |
|---|---|
| 1 | `occasions`: PK `key` → `id uuid` (`key` UNIQUE) |
| 2 | `areas`: PK `key` → `id uuid`; `boutiques.area_key` → `area_id` uuid FK |
| 3 | `dresses.boutique_name` **dropped** → join `boutique.name` |
| 4 | `dresses.occasions text[]` → `dress_occasions` join table |
| 5 | `dresses.images json` → `dress_images` table |
| 6 | `dresses.price_tiers json` → `dress_price_tiers` table |
| 7 | `users.saved_dress_ids uuid[]` → `saved_dresses` table |
| 8 | `line_clicks` / `page_views` / `admin_audit` PK bigint → uuid |
| 9 | `verification_tokens` + `id` uuid PK (token lookups unchanged) |
| 10 | `dress_blackouts` composite PK → `id` + `UNIQUE(dress_id, date)` |
| 11 | `kyc_submissions.submitted_at` → `created_at` (+`updated_at`) |
| 12 | audit columns everywhere + client extension (`withActor`) |
| 13 | timestamps → timestamptz (raw SQL in admin metrics — verified safe) |
| 14 | enum unification: `KycPlan(Free/Boost/Featured)` + `AdsTier` + `SubPlan` → `PlanTier(free/boost/featured)`; `cancel_from_status` text → `booking_status` enum |

Key mitigation that shrinks the blast radius: most pages consume dresses through `mapDress()` / `mapBoutique()` in **`lib/dresses.ts`**, which already returns plain shapes (`images: string[]`, `price_tiers: PriceTier[]`, `occasions: OccasionKey[]`, `boutique_name`). **Strategy: keep `lib/types.ts` public shapes identical and absorb changes inside the mappers** (include child relations, flatten to arrays). Pages then mostly keep working; only files querying `db` directly need edits.

---

## Workstream A — Data layer + catalog read path (foundation; start first)

Owner files (blocking for B and C — others build on the new mappers):

| File | Changes | Work |
|---|---|---|
| `lib/db.ts` | 12 | Add extension + `withActor` (Phase 3 skeleton in DESIGN §7); export `base` for `PrismaAdapter`. |
| `lib/types.ts` | 8, 9, 11, 14 | bigint ids → string; `submitted_at` → `created_at`; `KycPlan` type lowercase; keep `Dress`/`Boutique` public shapes UNCHANGED. |
| `lib/dresses.ts` | 1–6 | `mapDress`: include `images(orderBy sortOrder)`, `priceTiers(orderBy minDays)`, `occasions{occasion.key}`, `boutique{name, area{key}}` and flatten to the existing output shape. Search filter `boutiqueName contains` → `boutique: { name: { contains } }`; occasions filter `hasSome` → `occasions: { some: { occasion: { key: { in } } } }`. `FALLBACK_OCCASIONS` keeps `key`. |
| `lib/booking-queries.ts` | 3, 5, 6 | Add `include` for boutique name / images / tiers where selected. |
| `lib/tiers.ts` | 14 | No change (already lowercase) — verify only. |
| `prisma/seed.ts`, `prisma/seed.dev.ts` | 1, 2, 4, 5, 6, 14 | Rewrite: occasions/areas get uuid ids (`key` unique); dresses seed creates child rows (`dress_images`, `dress_price_tiers`, `dress_occasions` via nested create); boutiques connect area by `key` lookup; KYC plan lowercase. |
| `app/api/dresses/route.ts` | 3, 4, 5, 6 | Goes through new mappers / includes. |
| `app/browse`, `app/page.tsx`, `components/BrowseFilters.tsx`, `components/DressCard.tsx`, `components/Gallery.tsx`, `components/DistanceBadge.tsx`, `app/boutiques/page.tsx`, `app/boutique/[slug]/page.tsx` | 1–5 (indirect) | Should need **no edits** if mappers preserve shapes — verify + typecheck. DistanceBadge keeps receiving `area.key` via mapper. |
| `app/dress/[id]/page.tsx`, `opengraph-image.tsx` | 3, 4, 5, 7 | `boutique_name` → `boutique.name` via mapper; saved-check reads `saved_dresses` (`db.savedDress.findMany({ where: { userId } })`). |

## Workstream B — Seller + admin write path

| File | Changes | Work |
|---|---|---|
| `app/actions/seller.ts` | 2, 3, 4, 5, 6, 12, 14 | `createBoutique`/`updateBoutique`: lookup `db.area.findUnique({ where: { key } })` → store `areaId`. `createDress`/`updateDress`: drop `boutiqueName`; nested `create`/`deleteMany+createMany` for images/tiers/occasions (connect occasion by `key`). `updateDressPriceTiers` → child-table rewrite. KYC `plan` values lowercase (`"Free"→"free"`). Wrap mutations in `withActor`. |
| `app/sell/kyc/KycWizard.tsx` | 14 | `Plan` type + option values → lowercase; labels unchanged. |
| `app/actions/admin.ts` | 8, 12, 14 | `kyc.plan === "Boost"` → `"boost"`; AdminAudit id now uuid (no numeric assumptions found — verify); `withActor`. |
| `app/actions/availability.ts` | 10, 12 | `dressId_date` compound-unique syntax **still works** (UNIQUE kept) — verify generated client name; or switch to `findFirst`/`deleteMany`. |
| `app/api/dress-blackouts/route.ts` | 10 | Same as above. |
| `app/sell/(authed)/dresses/[id]/edit/page.tsx`, `dress/[id]/edit/page.tsx`, `DressForm.tsx` | 4, 5, 6 | Fetch via mapper (occasions as keys, images as urls); form payload format unchanged. |
| `app/sell/(authed)/dashboard/page.tsx` | 3, 4, 5, 14 | Include boutique/images; `adsTier` typing via `PlanTier`. |
| `app/sell/(authed)/edit/*` | 2 | Edit form keeps using area `key` in the UI; server resolves key→id. |
| `app/admin/dresses/*`, `app/admin/boutiques/*`, `app/admin/kyc/*` | 3, 5, 11, 14 | Include boutique name/images; `submitted_at` → `created_at`; plan casing. |
| `app/admin/metrics/page.tsx` | 4, 8, 13 | Rewrite occasions raw SQL: `unnest(d.occasions)` → `JOIN dress_occasions d_o JOIN occasions o`; other raw queries verified safe under timestamptz/uuid. |
| `app/admin/clicks/page.tsx` | 3, 8 | LineClick `id` bigint→string if rendered/keyed. |

## Workstream C — Renter/booking + auth/tracking

| File | Changes | Work |
|---|---|---|
| `app/actions/bookings.ts` | 3, 5, 6, 12 | Read tiers via relation (use mapper or `include`); `withActor`. |
| `app/api/bookings/route.ts` + `app/api/bookings/[id]/**` (7 routes) | 3, 5, 6, 12 | Add includes where dress fields used; inject actor. |
| `app/actions/saved.ts`, `components/SaveButton.tsx` | 7 | Replace array toggle with `db.savedDress.create`/`delete` (`@@unique(userId,dressId)` → `userId_dressId` compound key) — component unchanged. |
| `app/account/page.tsx`, `app/account/bookings/**` | 3, 4, 5, 7 | Via mappers + `saved_dresses` fetch. |
| `app/checkout/address/page.tsx`, `components/CheckoutForm.tsx`, `components/DateRangePicker.tsx`, `components/LineMessageCopyBox.tsx` | 3, 5, 6 (indirect) | Props come from mapped shapes — verify only. |
| `app/api/track/route.ts` | 8, 12 | UUID PK transparent; keep excluded from audit (volume). |
| `app/api/auth/{signup,verify-email,resend-verification,forgot-password,reset-password,check-verification}/route.ts` | 9 | Token queried by UNIQUE `token` — **no breaking change**; verify `upsert where { token }` still compiles. |
| `auth.ts`, `middleware.ts`, `app/api/auth/[...nextauth]/route.ts` | 12 | Pass un-extended `base` client to `PrismaAdapter` (DESIGN §8.4). |
| `app/api/cron/expire-payments/route.ts` | 12 | Runs with null actor — confirm extension tolerates it. |
| `app/debug/page.tsx`, `components/Header.tsx` | 7 | Saved count via `db.savedDress.count`. |

---

## Sequencing & verification

1. **A first** (db.ts, types.ts, mappers, seeds) — B and C depend on the mapper contract.
2. B and C can run **in parallel** after A lands.
3. Gate for every workstream: `npm run typecheck` + `npm run lint` + manual flow check in `next dev` (no automated tests in this repo).
4. Highest-risk spots: `lib/dresses.ts` mapper rewrite (touches every page), `app/admin/metrics/page.tsx` raw SQL, seller `updateDress` child-table sync, KycPlan value-case change.
