-- Add optional LINE ID to the addresses table so renters can share their LINE
-- for easier shop communication. Nullable — existing rows unaffected.
ALTER TABLE addresses
  ADD COLUMN IF NOT EXISTS line_id TEXT;
