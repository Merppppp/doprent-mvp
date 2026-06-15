-- Migration: add body-measurement columns to product_variants
-- Applied manually via Supabase SQL Editor / psql — DO NOT run prisma migrate deploy against any DB.

ALTER TABLE "product_variants" ADD COLUMN "bust_cm" integer;
ALTER TABLE "product_variants" ADD COLUMN "waist_cm" integer;
ALTER TABLE "product_variants" ADD COLUMN "length_cm" integer;
