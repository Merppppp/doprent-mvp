-- Migration: add user_id_cards table + bookings.id_card_path
-- Applied manually via Supabase SQL Editor (no migration runner).

-- user_id_cards: stores up to 3 national-ID photos per user
CREATE TABLE IF NOT EXISTS "user_id_cards" (
  "id"         UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL,
  "path"       TEXT NOT NULL,
  "created_by" UUID,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "updated_by" UUID,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),

  CONSTRAINT "user_id_cards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_id_cards_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "user_id_cards_user_id_idx" ON "user_id_cards"("user_id");

-- set_updated_at trigger (reuse the shared function already defined in earlier migrations)
CREATE TRIGGER "set_updated_at_user_id_cards"
  BEFORE UPDATE ON "user_id_cards"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- bookings.id_card_path: snapshot of the R2 key used for this booking
ALTER TABLE "bookings"
  ADD COLUMN IF NOT EXISTS "id_card_path" TEXT;
