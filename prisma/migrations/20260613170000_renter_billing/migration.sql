-- Migration: 20260613170000_renter_billing
-- Adds optional billing/tax-invoice columns to the users table.
-- All columns are NULLable — no DEFAULT, no NOT NULL — so they can be added
-- online without a table rewrite on any Postgres version.
--
-- DEPLOY NOTE: ALTER TABLE … ADD COLUMN on an existing table in Postgres inherits
-- the table's existing privilege grants automatically.  The app role that already
-- has INSERT/UPDATE/SELECT on "users" will cover these new columns with zero extra
-- GRANT statements.  No privilege change is needed in uat or prod.

ALTER TABLE "users"
  ADD COLUMN "billing_company_name" TEXT,
  ADD COLUMN "billing_tax_id"       TEXT,
  ADD COLUMN "billing_address"      TEXT,
  ADD COLUMN "billing_branch"       TEXT;

COMMENT ON COLUMN "users"."billing_company_name" IS 'ชื่อบริษัท/นิติบุคคล สำหรับออกใบกำกับภาษี (ไม่บังคับ)';
COMMENT ON COLUMN "users"."billing_tax_id"       IS 'เลขประจำตัวผู้เสียภาษี 13 หลัก (ไม่บังคับ)';
COMMENT ON COLUMN "users"."billing_address"      IS 'ที่อยู่สำหรับออกใบกำกับภาษี (ไม่บังคับ)';
COMMENT ON COLUMN "users"."billing_branch"       IS 'สาขา เช่น สำนักงานใหญ่ / สาขา 00001 (ไม่บังคับ)';
