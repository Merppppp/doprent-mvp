-- Expand the `size` enum to the canonical size set used by both the product
-- form and the browse filter. ADDITIVE ONLY — no existing label is renamed or
-- removed, so no product/variant data is affected. Positioned with BEFORE/AFTER
-- so the enum sort order matches the canonical UI order
-- (XXXS, XXS, XS, S, M, L, XL, XXL, 3XL, 4XL, Free size).
--
-- NOTE: `ALTER TYPE ... ADD VALUE` is supported inside a transaction on
-- PostgreSQL 12+. The new labels are only ADDED here (never used in this same
-- migration), so this is safe under `prisma migrate deploy`.
ALTER TYPE "size" ADD VALUE IF NOT EXISTS 'XXXS' BEFORE 'XS';
ALTER TYPE "size" ADD VALUE IF NOT EXISTS 'XXS' BEFORE 'XS';
ALTER TYPE "size" ADD VALUE IF NOT EXISTS 'XXL' AFTER 'XL';
ALTER TYPE "size" ADD VALUE IF NOT EXISTS '3XL' AFTER 'XXL';
ALTER TYPE "size" ADD VALUE IF NOT EXISTS '4XL' AFTER '3XL';
ALTER TYPE "size" ADD VALUE IF NOT EXISTS 'Free size' AFTER '4XL';
