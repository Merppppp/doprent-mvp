-- ===========================================================
-- DopRent — Add delivery_info column to boutiques (2026-05-24)
--
-- Stores free-text delivery/pickup conditions, e.g.
-- "รับที่ร้านเท่านั้น" or "ส่ง Kerry ได้ทั่วไทย ค่าส่งผู้เช่าออก"
-- Shown on the boutique profile page so customers know
-- before contacting the shop.
--
-- Safe to re-run (IF NOT EXISTS on the column add).
-- ===========================================================

alter table boutiques
  add column if not exists delivery_info text;

-- Grant anon read access (public-safe: it's store policy info).
-- Note: revoke/grant on individual columns is additive in Postgres;
-- we can just grant the new column without re-revoking everything.
grant select (delivery_info) on boutiques to anon;
