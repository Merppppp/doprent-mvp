-- ===========================================================
-- DopRent — Add tag_code to dresses (2026-05-25)
--
-- Generates a short unique reference code (e.g. DR0042) for
-- each dress. Used in the copy-to-LINE message box so customers
-- can reference a specific dress when contacting the shop.
--
-- Safe to re-run (IF NOT EXISTS on sequence and column).
-- ===========================================================

create sequence if not exists dress_tag_seq start 1;

alter table dresses
  add column if not exists tag_code text unique
    default 'DR' || lpad(nextval('dress_tag_seq')::text, 4, '0');
