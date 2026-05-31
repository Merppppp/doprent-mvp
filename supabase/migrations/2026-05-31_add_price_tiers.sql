-- DopRent — Add price_tiers to dresses (2026-05-31)
--
-- Stores tiered pricing as JSONB array: [{days: 1, price: 1000}, ...]
-- Effective rate = tier.price / tier.days, applied to rental duration.

alter table dresses
  add column if not exists price_tiers jsonb not null default '[]'::jsonb;
