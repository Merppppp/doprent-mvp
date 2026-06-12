# Migration from VPS Dev DB → Local Restructured DB

Script: `scripts/migrate-from-dev.ts`
Run: `npx tsx scripts/migrate-from-dev.ts`

## Source → Target mapping

| Source table | Target table | Notes |
|---|---|---|
| `areas` | `areas` | Match by key; UPDATE label/lat/lng; insert missing |
| `boutiques` | `shops` | `area_key` → `area_id` lookup; same UUID preserved |
| `users` | `users` | All 9 users incl password_hash/role/email_verified; same UUIDs |
| `accounts` | `accounts` | OAuth links; same UUIDs; no created_at in source → NOW() |
| `dresses` | `products` | `boutique_id` kept as `shop_id` (same UUID); `product_type_id` = "dress" type; `category_id` = NULL |
| `dresses.images[]` | `product_images` | jsonb array → rows with sort_order=index |
| `dresses.price_tiers[]` | `product_price_tiers` | jsonb array (min/per_day fields) → rows |
| `dresses.occasions[]` | `product_tags` | string array → tag key lookup in `tags` (group=occasion) |
| `dress_blackouts` | `product_blackout_dates` | No source `id` column → generated UUIDs |
| `bookings` | `bookings` | `boutique_id`→`shop_id`, `dress_id`→`product_id` (same UUIDs) |
| `kyc_submissions` | `kyc_submissions` | `boutique_id`→`shop_id`; KycPlan "Boost/Featured/Free" lowercased → PlanTier |
| `seller_subscriptions` | `shop_subscriptions` | `boutique_id`→`shop_id`; plan lowercased |
| `addresses` | `addresses` | Same UUIDs; no `updated_at` in source → copy `created_at` |
| `line_clicks` | `line_clicks` | BigInt PK → new UUIDs; `dress_id`→`product_id`, `boutique_id`→`shop_id` |
| `page_views` | `page_views` | BigInt PK → new UUIDs |
| `admin_audit` | `audit_logs` | `action='UPDATE'`; `entity_type` mapped (dress→Product, boutique→Shop, kyc→KycSubmission); `after` = `{admin_action, reason, ...payload}` |
| `users.saved_dress_ids[]` | `favorites` | Array of UUIDs → rows (all NULL/empty in dev → 0 rows) |

Tables intentionally **skipped**: `sessions`, `verification_tokens` (auth state), `occasions` (replaced by tags).

## Idempotency

The script **truncates all business tables** before inserting. Re-running is safe.
Preserved tables: `_prisma_migrations`, `product_types`, `product_categories`, `tag_groups`, `tags`, `areas`.

## Verification results (2026-06-12)

```
✓ users: 9
✓ accounts: 9
✓ areas: 25
✓ shops: 34
✓ products: 61
✓ product_images: 60 (1 dress had no images — allowed)
✓ product_price_tiers: 4
✓ product_tags: 101
✓ product_blackout_dates: 0 (none in dev)
✓ bookings: 4
✓ kyc_submissions: 2
✓ shop_subscriptions: 0 (none in dev)
✓ line_clicks: 7
✓ page_views: 952
✓ audit_logs: 11
✓ addresses: 2
✓ occasion_tags: 8 ≥ 8
✓ products_without_images: 1 ≤ 1
```

## Connections

- SOURCE (read-only): `127.0.0.1:15432` (SSH tunnel to VPS dev DB)
- TARGET: `127.0.0.1:5432` (local Homebrew PG16 `doprent_restructure`)
