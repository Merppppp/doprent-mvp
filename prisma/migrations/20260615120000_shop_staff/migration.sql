-- Migration: 20260615120000_shop_staff
-- Adds shop_staff table for staff authentication
-- Note: uat/prod DBA must GRANT SELECT,INSERT,UPDATE,DELETE ON shop_staff TO <app_role>

CREATE TABLE "shop_staff" (
    "id"                   UUID         NOT NULL DEFAULT gen_random_uuid(),
    "shop_id"              UUID         NOT NULL,
    "username"             TEXT         NOT NULL,
    "display_name"         TEXT         NOT NULL,
    "pin_hash"             TEXT         NOT NULL,
    "can_manage_bookings"  BOOLEAN      NOT NULL DEFAULT TRUE,
    "can_manage_products"  BOOLEAN      NOT NULL DEFAULT FALSE,
    "is_active"            BOOLEAN      NOT NULL DEFAULT TRUE,
    "failed_attempts"      INTEGER      NOT NULL DEFAULT 0,
    "locked_until"         TIMESTAMPTZ(6),
    "last_login_at"        TIMESTAMPTZ(6),
    "created_by"           UUID,
    "created_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
    "updated_by"           UUID,
    "updated_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),

    CONSTRAINT "shop_staff_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "shop_staff_username_key" ON "shop_staff"("username");

CREATE INDEX "shop_staff_shop_id_idx" ON "shop_staff"("shop_id");

ALTER TABLE "shop_staff"
    ADD CONSTRAINT "shop_staff_shop_id_fkey"
    FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;
