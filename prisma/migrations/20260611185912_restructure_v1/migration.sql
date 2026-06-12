-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('customer', 'seller', 'admin');

-- CreateEnum
CREATE TYPE "audit_action" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateEnum
CREATE TYPE "color" AS ENUM ('rose', 'ivory', 'green', 'black', 'navy', 'red', 'blue', 'purple');

-- CreateEnum
CREATE TYPE "size" AS ENUM ('XS', 'S', 'M', 'L', 'XL');

-- CreateEnum
CREATE TYPE "plan_tier" AS ENUM ('free', 'boost', 'featured');

-- CreateEnum
CREATE TYPE "listing_status" AS ENUM ('pending', 'live', 'rejected', 'draft');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('none', 'submitted', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "kyc_review_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "business_type" AS ENUM ('individual', 'company');

-- CreateEnum
CREATE TYPE "booking_status" AS ENUM ('booking_pending', 'waiting_for_payment', 'payment_review', 'confirmed', 'cancel_requested', 'slip_disputed', 'rejected', 'cancelled', 'payment_expired');

-- CreateEnum
CREATE TYPE "sub_status" AS ENUM ('active', 'past_due', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "billing_cycle" AS ENUM ('monthly', 'yearly');

-- CreateTable
CREATE TABLE "product_types" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" UUID NOT NULL,
    "parent_id" UUID,
    "product_type_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_groups" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tag_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "tag_group_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "th" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "keywords" TEXT[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "email_verified" TIMESTAMPTZ(6),
    "password_hash" TEXT,
    "full_name" TEXT,
    "line_id" TEXT,
    "role" "user_role" NOT NULL DEFAULT 'customer',
    "image" TEXT,
    "signup_source" TEXT,
    "signup_medium" TEXT,
    "signup_campaign" TEXT,
    "signup_referrer" TEXT,
    "signup_channel" TEXT,
    "last_active_at" TIMESTAMPTZ(6),
    "last_province" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "id" UUID NOT NULL,
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMPTZ(6) NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shops" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" UUID,
    "owner_name" TEXT,
    "area_id" UUID,
    "area_label" TEXT NOT NULL,
    "address" TEXT,
    "house_no" TEXT,
    "street" TEXT,
    "subdistrict" TEXT,
    "district" TEXT,
    "province" TEXT NOT NULL DEFAULT 'กรุงเทพมหานคร',
    "postal_code" TEXT,
    "lat" DECIMAL(9,6),
    "lng" DECIMAL(9,6),
    "hours" TEXT,
    "line_url" TEXT NOT NULL,
    "instagram" TEXT,
    "promptpay_id" TEXT,
    "since_year" INTEGER,
    "cover_color" "color" NOT NULL DEFAULT 'rose',
    "tag" TEXT,
    "story" TEXT,
    "delivery_info" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "ads_tier" "plan_tier" NOT NULL DEFAULT 'free',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "listing_status" NOT NULL DEFAULT 'live',
    "reject_reason" TEXT,
    "kyc_status" "kyc_status" NOT NULL DEFAULT 'none',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "tag_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designer" TEXT,
    "shop_id" UUID NOT NULL,
    "product_type_id" UUID NOT NULL,
    "category_id" UUID,
    "size" "size" NOT NULL,
    "color" "color" NOT NULL,
    "price_per_day" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "description" TEXT,
    "line_url" TEXT NOT NULL,
    "ads_tier" "plan_tier" NOT NULL DEFAULT 'free',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "status" "listing_status" NOT NULL DEFAULT 'live',
    "reject_reason" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "views" INTEGER NOT NULL DEFAULT 0,
    "search_vector" tsvector,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_images" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_price_tiers" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "min_days" INTEGER NOT NULL,
    "price_per_day" INTEGER NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_price_tiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_tags" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "tag_id" UUID NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_submissions" (
    "id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "owner_id" UUID,
    "business_type" "business_type" NOT NULL,
    "legal_name" TEXT NOT NULL,
    "tax_id" TEXT NOT NULL,
    "dbd_reg_no" TEXT,
    "bank_name" TEXT,
    "bank_acc_no" TEXT,
    "bank_acc_name" TEXT,
    "id_card_url" TEXT,
    "dbd_doc_url" TEXT,
    "book_bank_url" TEXT,
    "vat_doc_url" TEXT,
    "plan" "plan_tier" NOT NULL DEFAULT 'boost',
    "status" "kyc_review_status" NOT NULL DEFAULT 'pending',
    "reviewer_id" UUID,
    "review_notes" TEXT,
    "reviewed_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_clicks" (
    "id" UUID NOT NULL,
    "product_id" UUID,
    "shop_id" UUID,
    "source" TEXT,
    "user_id" UUID,
    "channel" TEXT,
    "utm_source" TEXT,
    "referrer" TEXT,
    "province" TEXT,
    "session_id" TEXT,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "page_views" (
    "id" UUID NOT NULL,
    "session_id" TEXT,
    "user_id" UUID,
    "path" TEXT,
    "channel" TEXT,
    "utm_source" TEXT,
    "utm_medium" TEXT,
    "utm_campaign" TEXT,
    "referrer" TEXT,
    "province" TEXT,
    "country" TEXT,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shop_subscriptions" (
    "id" UUID NOT NULL,
    "shop_id" UUID,
    "owner_id" UUID,
    "plan" "plan_tier" NOT NULL DEFAULT 'free',
    "status" "sub_status" NOT NULL DEFAULT 'active',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "billing_cycle" "billing_cycle" NOT NULL DEFAULT 'monthly',
    "started_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shop_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line" TEXT NOT NULL,
    "subdistrict" TEXT,
    "district" TEXT,
    "province" TEXT DEFAULT 'กรุงเทพมหานคร',
    "postal_code" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "renter_id" UUID NOT NULL,
    "shop_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "rental_total" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "shipping_fee" INTEGER,
    "commission_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    "commission_amount" INTEGER,
    "channel" TEXT,
    "status" "booking_status" NOT NULL DEFAULT 'booking_pending',
    "slip_path" TEXT,
    "address_id" UUID,
    "recipient_name" TEXT,
    "phone" TEXT,
    "address_text" TEXT,
    "current_due_at" TIMESTAMPTZ(6),
    "cancel_reason" TEXT,
    "cancel_from_status" "booking_status",
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_blackout_dates" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_by" UUID,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_blackout_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "action" "audit_action" NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" UUID,
    "actor_id" UUID,
    "before" JSONB,
    "after" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "product_types_key_key" ON "product_types"("key");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_key_key" ON "product_categories"("key");

-- CreateIndex
CREATE INDEX "product_categories_parent_id_idx" ON "product_categories"("parent_id");

-- CreateIndex
CREATE INDEX "product_categories_product_type_id_idx" ON "product_categories"("product_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "tag_groups_key_key" ON "tag_groups"("key");

-- CreateIndex
CREATE UNIQUE INDEX "tags_key_key" ON "tags"("key");

-- CreateIndex
CREATE INDEX "tags_tag_group_id_idx" ON "tags"("tag_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "areas_key_key" ON "areas"("key");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_last_active_at_idx" ON "users"("last_active_at" DESC);

-- CreateIndex
CREATE INDEX "users_signup_channel_idx" ON "users"("signup_channel");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at" DESC);

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "shops_slug_key" ON "shops"("slug");

-- CreateIndex
CREATE INDEX "shops_status_idx" ON "shops"("status");

-- CreateIndex
CREATE INDEX "shops_featured_idx" ON "shops"("featured");

-- CreateIndex
CREATE INDEX "shops_area_id_idx" ON "shops"("area_id");

-- CreateIndex
CREATE INDEX "shops_verified_idx" ON "shops"("verified");

-- CreateIndex
CREATE INDEX "shops_district_idx" ON "shops"("district");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_tag_code_key" ON "products"("tag_code");

-- CreateIndex
CREATE INDEX "products_color_idx" ON "products"("color");

-- CreateIndex
CREATE INDEX "products_size_idx" ON "products"("size");

-- CreateIndex
CREATE INDEX "products_status_idx" ON "products"("status");

-- CreateIndex
CREATE INDEX "products_available_idx" ON "products"("available");

-- CreateIndex
CREATE INDEX "products_shop_id_idx" ON "products"("shop_id");

-- CreateIndex
CREATE INDEX "products_product_type_id_idx" ON "products"("product_type_id");

-- CreateIndex
CREATE INDEX "products_category_id_idx" ON "products"("category_id");

-- CreateIndex
CREATE INDEX "products_price_per_day_idx" ON "products"("price_per_day");

-- CreateIndex
CREATE INDEX "product_images_product_id_sort_order_idx" ON "product_images"("product_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "product_price_tiers_product_id_min_days_key" ON "product_price_tiers"("product_id", "min_days");

-- CreateIndex
CREATE INDEX "product_tags_tag_id_idx" ON "product_tags"("tag_id");

-- CreateIndex
CREATE UNIQUE INDEX "product_tags_product_id_tag_id_key" ON "product_tags"("product_id", "tag_id");

-- CreateIndex
CREATE INDEX "favorites_product_id_idx" ON "favorites"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_product_id_key" ON "favorites"("user_id", "product_id");

-- CreateIndex
CREATE INDEX "kyc_submissions_status_idx" ON "kyc_submissions"("status");

-- CreateIndex
CREATE INDEX "kyc_submissions_shop_id_idx" ON "kyc_submissions"("shop_id");

-- CreateIndex
CREATE INDEX "line_clicks_product_id_idx" ON "line_clicks"("product_id");

-- CreateIndex
CREATE INDEX "line_clicks_shop_id_idx" ON "line_clicks"("shop_id");

-- CreateIndex
CREATE INDEX "line_clicks_channel_idx" ON "line_clicks"("channel");

-- CreateIndex
CREATE INDEX "line_clicks_created_at_idx" ON "line_clicks"("created_at" DESC);

-- CreateIndex
CREATE INDEX "page_views_created_at_idx" ON "page_views"("created_at" DESC);

-- CreateIndex
CREATE INDEX "page_views_channel_idx" ON "page_views"("channel");

-- CreateIndex
CREATE INDEX "page_views_session_id_idx" ON "page_views"("session_id");

-- CreateIndex
CREATE INDEX "page_views_user_id_idx" ON "page_views"("user_id");

-- CreateIndex
CREATE INDEX "page_views_province_idx" ON "page_views"("province");

-- CreateIndex
CREATE INDEX "shop_subscriptions_shop_id_idx" ON "shop_subscriptions"("shop_id");

-- CreateIndex
CREATE INDEX "shop_subscriptions_status_idx" ON "shop_subscriptions"("status");

-- CreateIndex
CREATE INDEX "shop_subscriptions_plan_idx" ON "shop_subscriptions"("plan");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE INDEX "bookings_renter_id_idx" ON "bookings"("renter_id");

-- CreateIndex
CREATE INDEX "bookings_shop_id_idx" ON "bookings"("shop_id");

-- CreateIndex
CREATE INDEX "bookings_product_id_idx" ON "bookings"("product_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at" DESC);

-- CreateIndex
CREATE INDEX "product_blackout_dates_product_id_idx" ON "product_blackout_dates"("product_id");

-- CreateIndex
CREATE INDEX "product_blackout_dates_date_idx" ON "product_blackout_dates"("date");

-- CreateIndex
CREATE UNIQUE INDEX "product_blackout_dates_product_id_date_key" ON "product_blackout_dates"("product_id", "date");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tags" ADD CONSTRAINT "tags_tag_group_id_fkey" FOREIGN KEY ("tag_group_id") REFERENCES "tag_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shops" ADD CONSTRAINT "shops_area_id_fkey" FOREIGN KEY ("area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_product_type_id_fkey" FOREIGN KEY ("product_type_id") REFERENCES "product_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_price_tiers" ADD CONSTRAINT "product_price_tiers_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_tags" ADD CONSTRAINT "product_tags_tag_id_fkey" FOREIGN KEY ("tag_id") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_clicks" ADD CONSTRAINT "line_clicks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_clicks" ADD CONSTRAINT "line_clicks_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_clicks" ADD CONSTRAINT "line_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_subscriptions" ADD CONSTRAINT "shop_subscriptions_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shop_subscriptions" ADD CONSTRAINT "shop_subscriptions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_shop_id_fkey" FOREIGN KEY ("shop_id") REFERENCES "shops"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "product_blackout_dates" ADD CONSTRAINT "product_blackout_dates_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ════════════════════════════════════════════════════════════════════════════
-- Hand-appended section (DESIGN.md §4, §9 + search_vector re-creation)
-- ════════════════════════════════════════════════════════════════════════════

-- ── §4 shared updated_at trigger ─────────────────────────────────────────────
-- One shared function, one BEFORE UPDATE trigger per table (all except
-- append-only audit_logs). Covers raw SQL / psql edits that bypass Prisma.
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := CURRENT_TIMESTAMP;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_product_types_updated_at          BEFORE UPDATE ON "product_types"          FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_product_categories_updated_at     BEFORE UPDATE ON "product_categories"     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tag_groups_updated_at             BEFORE UPDATE ON "tag_groups"             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_tags_updated_at                   BEFORE UPDATE ON "tags"                   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_areas_updated_at                  BEFORE UPDATE ON "areas"                  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_users_updated_at                  BEFORE UPDATE ON "users"                  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_accounts_updated_at               BEFORE UPDATE ON "accounts"               FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_sessions_updated_at               BEFORE UPDATE ON "sessions"               FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_verification_tokens_updated_at    BEFORE UPDATE ON "verification_tokens"    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_shops_updated_at                  BEFORE UPDATE ON "shops"                  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_products_updated_at               BEFORE UPDATE ON "products"               FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_product_images_updated_at         BEFORE UPDATE ON "product_images"         FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_product_price_tiers_updated_at    BEFORE UPDATE ON "product_price_tiers"    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_product_tags_updated_at           BEFORE UPDATE ON "product_tags"           FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_favorites_updated_at              BEFORE UPDATE ON "favorites"              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_kyc_submissions_updated_at        BEFORE UPDATE ON "kyc_submissions"        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_line_clicks_updated_at            BEFORE UPDATE ON "line_clicks"            FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_page_views_updated_at             BEFORE UPDATE ON "page_views"             FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_shop_subscriptions_updated_at     BEFORE UPDATE ON "shop_subscriptions"     FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_addresses_updated_at              BEFORE UPDATE ON "addresses"              FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_bookings_updated_at               BEFORE UPDATE ON "bookings"               FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_product_blackout_dates_updated_at BEFORE UPDATE ON "product_blackout_dates" FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── products.search_vector full-text search (re-created from the original
--    supabase/migrations/2026-05-26_add_search_vector.sql, commit 01c5f79;
--    adapted: dresses→products, boutique_name dropped from the schema so the
--    vector now indexes name + designer + description) ─────────────────────────
CREATE INDEX products_search_idx ON "products" USING gin (search_vector);

CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'simple',
    coalesce(NEW.name, '') || ' ' ||
    coalesce(NEW.designer, '') || ' ' ||
    coalesce(NEW.description, '')
  );
  RETURN NEW;
END $$;

CREATE TRIGGER products_search_vector_trigger
  BEFORE INSERT OR UPDATE ON "products"
  FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

-- ── COMMENT ON TABLE/COLUMN (generated by scripts/gen-comments.ts from schema.prisma /// docs) ──
COMMENT ON TABLE "product_types" IS 'ตารางอ้างอิงประเภทสินค้าให้เช่า (เช่น dress, suit) — DopRent เป็นแพลตฟอร์มเช่าหลายประเภทสินค้า';
COMMENT ON COLUMN "product_types"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "product_types"."key" IS 'Business key (เช่น "dress", "suit") — UNIQUE, ใช้ใน URL/filter';
COMMENT ON COLUMN "product_types"."label" IS 'ชื่อแสดงผล (ไทย)';
COMMENT ON COLUMN "product_types"."is_active" IS 'ปิดการใช้งานประเภทสินค้าโดยไม่ต้องลบ (FK เป็น RESTRICT — ห้ามลบถ้ามีสินค้าอ้างอยู่)';
COMMENT ON COLUMN "product_types"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed)';
COMMENT ON COLUMN "product_types"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "product_types"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด';
COMMENT ON COLUMN "product_types"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "product_categories" IS 'หมวดหมู่สินค้าแบบลำดับชั้น (dynamic, adjacency list) — ต้นไม้หมวดหมู่ 1 ต้นสังกัด 1 ประเภทสินค้า (เช่น dress → ชุดราตรี/ชุดไทย, suit → สูทลำลอง) เพิ่ม/ย้ายหมวดได้โดยไม่ต้องแก้ schema';
COMMENT ON COLUMN "product_categories"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "product_categories"."parent_id" IS 'FK → product_categories.id หมวดแม่ (NULL = หมวดราก; RESTRICT — ห้ามลบหมวดที่ยังมีหมวดลูก, ดูเหตุผลใน DESIGN §3.2)';
COMMENT ON COLUMN "product_categories"."product_type_id" IS 'FK → product_types.id ประเภทสินค้าเจ้าของต้นไม้หมวดหมู่นี้ (RESTRICT — ปิดใช้งานผ่าน is_active แทนการลบ)';
COMMENT ON COLUMN "product_categories"."key" IS 'Business key (เช่น "evening-dress") — UNIQUE ทั้งระบบ, ใช้ใน URL/filter';
COMMENT ON COLUMN "product_categories"."label" IS 'ชื่อแสดงผล (ไทย)';
COMMENT ON COLUMN "product_categories"."sort_order" IS 'ลำดับการแสดงผลภายในหมวดแม่เดียวกัน';
COMMENT ON COLUMN "product_categories"."is_active" IS 'ปิดการใช้งานหมวดโดยไม่ต้องลบ';
COMMENT ON COLUMN "product_categories"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed)';
COMMENT ON COLUMN "product_categories"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "product_categories"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด';
COMMENT ON COLUMN "product_categories"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "tag_groups" IS 'กลุ่มแท็ก (เช่น color, style, occasion) — มิติ filter แบบ dynamic, เพิ่มกลุ่มใหม่ได้โดยไม่แก้ schema (rev 3: ตาราง occasions เดิมถูกแทนด้วยกลุ่มแท็ก key=''occasion'')';
COMMENT ON COLUMN "tag_groups"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "tag_groups"."key" IS 'Business key (เช่น "occasion", "style") — UNIQUE';
COMMENT ON COLUMN "tag_groups"."label" IS 'ชื่อแสดงผล (ไทย)';
COMMENT ON COLUMN "tag_groups"."sort_order" IS 'ลำดับการแสดงผลของกลุ่มใน UI filter';
COMMENT ON COLUMN "tag_groups"."is_active" IS 'ปิดการใช้งานกลุ่มโดยไม่ต้องลบ';
COMMENT ON COLUMN "tag_groups"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed)';
COMMENT ON COLUMN "tag_groups"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "tag_groups"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด';
COMMENT ON COLUMN "tag_groups"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "tags" IS 'แท็กในกลุ่ม (เช่น "wedding" ในกลุ่ม occasion) — แทน occasions เดิม + รองรับมิติใหม่ในอนาคต';
COMMENT ON COLUMN "tags"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "tags"."tag_group_id" IS 'FK → tag_groups.id กลุ่มของแท็กนี้ (RESTRICT — ลบกลุ่มไม่ได้ถ้ายังมีแท็ก, ปิดผ่าน is_active)';
COMMENT ON COLUMN "tags"."key" IS 'Business key (เช่น "wedding") — UNIQUE ทั้งระบบ, ใช้ใน URL/filter';
COMMENT ON COLUMN "tags"."label" IS 'ชื่อแสดงผล (ไทย)';
COMMENT ON COLUMN "tags"."is_active" IS 'ปิดการใช้งานแท็กโดยไม่ต้องลบ';
COMMENT ON COLUMN "tags"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed)';
COMMENT ON COLUMN "tags"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "tags"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด';
COMMENT ON COLUMN "tags"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "areas" IS 'ตารางอ้างอิงย่าน/พื้นที่ให้บริการ (เดิมกรุงเทพฯ) ใช้ค้นหาร้านใกล้เคียง';
COMMENT ON COLUMN "areas"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "areas"."key" IS 'Business key เดิม (เช่น "siam") — UNIQUE, ใช้ใน URL/filter';
COMMENT ON COLUMN "areas"."th" IS 'ชื่อย่านภาษาไทย';
COMMENT ON COLUMN "areas"."lat" IS 'ละติจูดจุดศูนย์กลางย่าน';
COMMENT ON COLUMN "areas"."lng" IS 'ลองจิจูดจุดศูนย์กลางย่าน';
COMMENT ON COLUMN "areas"."keywords" IS 'คำค้นที่ map มาที่ย่านนี้';
COMMENT ON COLUMN "areas"."is_active" IS 'ปิดการใช้งานย่านโดยไม่ต้องลบ';
COMMENT ON COLUMN "areas"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "areas"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "areas"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "areas"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "users" IS 'ผู้ใช้ทุกบทบาท (customer / seller / admin) — สร้างผ่าน NextAuth (Google) หรือ email+password';
COMMENT ON COLUMN "users"."id" IS 'Primary key (uuid) — อ้างโดย NextAuth JWT';
COMMENT ON COLUMN "users"."email" IS 'อีเมล (UNIQUE) — NULL ได้กรณี provider ไม่ส่งอีเมล';
COMMENT ON COLUMN "users"."email_verified" IS 'เวลายืนยันอีเมลสำเร็จ (NULL = ยังไม่ยืนยัน)';
COMMENT ON COLUMN "users"."password_hash" IS 'bcrypt hash สำหรับ login แบบ credentials (NULL = OAuth-only)';
COMMENT ON COLUMN "users"."full_name" IS 'ชื่อ-นามสกุล (NextAuth adapter field ชื่อ `name`)';
COMMENT ON COLUMN "users"."line_id" IS 'LINE id ของผู้ใช้ (ติดต่อกลับ)';
COMMENT ON COLUMN "users"."role" IS 'บทบาทในระบบ';
COMMENT ON COLUMN "users"."image" IS 'URL รูปโปรไฟล์ (จาก OAuth)';
COMMENT ON COLUMN "users"."signup_source" IS 'utm_source แรกที่พามาสมัคร';
COMMENT ON COLUMN "users"."signup_medium" IS 'utm_medium แรก';
COMMENT ON COLUMN "users"."signup_campaign" IS 'utm_campaign แรก';
COMMENT ON COLUMN "users"."signup_referrer" IS 'referrer แรก';
COMMENT ON COLUMN "users"."signup_channel" IS 'ช่องทางที่สรุปแล้ว (organic/social/ads/...)';
COMMENT ON COLUMN "users"."last_active_at" IS 'เวลา activity ล่าสุด (ใช้คำนวณ MAU)';
COMMENT ON COLUMN "users"."last_province" IS 'จังหวัดล่าสุดที่ใช้งาน';
COMMENT ON COLUMN "users"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "users"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "users"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "users"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "accounts" IS 'บัญชี OAuth ที่ผูกกับผู้ใช้ (NextAuth adapter table — ห้ามเปลี่ยนชื่อ field มาตรฐาน)';
COMMENT ON COLUMN "accounts"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "accounts"."user_id" IS 'FK → users.id';
COMMENT ON COLUMN "accounts"."type" IS 'ชนิดบัญชี (oauth/email/credentials) — กำหนดโดย NextAuth';
COMMENT ON COLUMN "accounts"."provider" IS 'ชื่อ provider (google)';
COMMENT ON COLUMN "accounts"."provider_account_id" IS 'id ผู้ใช้ฝั่ง provider';
COMMENT ON COLUMN "accounts"."refresh_token" IS 'OAuth refresh token';
COMMENT ON COLUMN "accounts"."access_token" IS 'OAuth access token';
COMMENT ON COLUMN "accounts"."expires_at" IS 'เวลา access token หมดอายุ (epoch seconds)';
COMMENT ON COLUMN "accounts"."token_type" IS 'ชนิด token (bearer)';
COMMENT ON COLUMN "accounts"."scope" IS 'OAuth scopes ที่ได้รับ';
COMMENT ON COLUMN "accounts"."id_token" IS 'OIDC id_token';
COMMENT ON COLUMN "accounts"."session_state" IS 'OAuth session_state';
COMMENT ON COLUMN "accounts"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "accounts"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "accounts"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "accounts"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "sessions" IS 'session ฝั่ง DB ของ NextAuth (ปัจจุบันใช้ JWT strategy — ตารางนี้แทบไม่ถูกเขียน แต่คงไว้ตาม adapter มาตรฐาน)';
COMMENT ON COLUMN "sessions"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "sessions"."session_token" IS 'token ประจำ session (UNIQUE)';
COMMENT ON COLUMN "sessions"."user_id" IS 'FK → users.id';
COMMENT ON COLUMN "sessions"."expires" IS 'เวลาหมดอายุ session';
COMMENT ON COLUMN "sessions"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "sessions"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "sessions"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "sessions"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "verification_tokens" IS 'token ยืนยันอีเมล (NextAuth standard + custom email-verify flow) เดิม composite PK (identifier, token) → เพิ่ม id uuid PK, คง UNIQUE เดิมไว้ (@auth/prisma-adapter รุ่น >=2 ลบ field `id` ออกจากผลลัพธ์เองอยู่แล้ว — ปลอดภัย)';
COMMENT ON COLUMN "verification_tokens"."id" IS 'Primary key (uuid) — เพิ่มใหม่ตามมาตรฐานทุกตาราง';
COMMENT ON COLUMN "verification_tokens"."identifier" IS 'อีเมล/ตัวระบุผู้รับ token';
COMMENT ON COLUMN "verification_tokens"."token" IS 'token (UNIQUE)';
COMMENT ON COLUMN "verification_tokens"."expires" IS 'เวลาหมดอายุ token';
COMMENT ON COLUMN "verification_tokens"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "verification_tokens"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "verification_tokens"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "verification_tokens"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "shops" IS 'ร้านให้เช่าสินค้า (เดิม boutiques) — 1 ร้านมีเจ้าของ 1 คน (owner), มีสินค้าหลายรายการ';
COMMENT ON COLUMN "shops"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "shops"."slug" IS 'slug สำหรับ URL (UNIQUE)';
COMMENT ON COLUMN "shops"."name" IS 'ชื่อร้าน';
COMMENT ON COLUMN "shops"."owner_id" IS 'FK → users.id เจ้าของร้าน (SetNull เมื่อ user ถูกลบ)';
COMMENT ON COLUMN "shops"."owner_name" IS 'ชื่อเจ้าของร้านที่แสดงผล (กรอกเอง — ไม่ใช่ snapshot ของ users.full_name)';
COMMENT ON COLUMN "shops"."area_id" IS 'FK → areas.id ย่านที่ตั้งร้าน (เดิมอ้างด้วย area key string)';
COMMENT ON COLUMN "shops"."area_label" IS 'ป้ายชื่อย่านที่แสดงผล (รองรับย่านอิสระที่ไม่อยู่ใน areas)';
COMMENT ON COLUMN "shops"."address" IS 'ที่อยู่แบบข้อความเต็ม (legacy/รวม)';
COMMENT ON COLUMN "shops"."house_no" IS 'บ้านเลขที่';
COMMENT ON COLUMN "shops"."street" IS 'ถนน/ซอย';
COMMENT ON COLUMN "shops"."subdistrict" IS 'แขวง/ตำบล';
COMMENT ON COLUMN "shops"."district" IS 'เขต/อำเภอ';
COMMENT ON COLUMN "shops"."province" IS 'จังหวัด';
COMMENT ON COLUMN "shops"."postal_code" IS 'รหัสไปรษณีย์';
COMMENT ON COLUMN "shops"."lat" IS 'ละติจูดที่ตั้งร้าน';
COMMENT ON COLUMN "shops"."lng" IS 'ลองจิจูดที่ตั้งร้าน';
COMMENT ON COLUMN "shops"."hours" IS 'เวลาทำการ (ข้อความอิสระ)';
COMMENT ON COLUMN "shops"."line_url" IS 'LINE OA deep-link ของร้าน (CTA หลัก)';
COMMENT ON COLUMN "shops"."instagram" IS 'Instagram handle/URL';
COMMENT ON COLUMN "shops"."promptpay_id" IS 'PromptPay id รับเงิน (เบอร์/เลขบัตร ปชช.)';
COMMENT ON COLUMN "shops"."since_year" IS 'ปีที่เปิดร้าน';
COMMENT ON COLUMN "shops"."cover_color" IS 'โทนสี cover การ์ดร้าน';
COMMENT ON COLUMN "shops"."tag" IS 'ป้าย tag การตลาดสั้น ๆ';
COMMENT ON COLUMN "shops"."story" IS 'เรื่องราว/คำแนะนำร้าน';
COMMENT ON COLUMN "shops"."delivery_info" IS 'ข้อมูลการจัดส่ง';
COMMENT ON COLUMN "shops"."featured" IS 'ร้านแนะนำ (คัดโดย admin)';
COMMENT ON COLUMN "shops"."ads_tier" IS 'ระดับแผนโฆษณาปัจจุบันของร้าน';
COMMENT ON COLUMN "shops"."verified" IS 'ผ่านการยืนยันตัวตนแล้ว (badge)';
COMMENT ON COLUMN "shops"."status" IS 'สถานะ workflow การเผยแพร่ร้าน';
COMMENT ON COLUMN "shops"."reject_reason" IS 'เหตุผลเมื่อถูก reject';
COMMENT ON COLUMN "shops"."kyc_status" IS 'สถานะ KYC ล่าสุด (rollup จาก kyc_submissions เพื่อ gate ฟีเจอร์เร็ว ๆ)';
COMMENT ON COLUMN "shops"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "shops"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "shops"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "shops"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "products" IS 'สินค้าให้เช่า (เดิม dresses) — สินค้า 1 รายการของร้าน, แยกประเภทผ่าน product_types เปลี่ยนแปลงสำคัญ: ตัด boutique_name (denormalized) ออก → join shops.name, ย้าย images/price_tiers/occasions ออกเป็นตารางลูก, เพิ่ม product_type_id';
COMMENT ON COLUMN "products"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "products"."slug" IS 'slug สำหรับ URL (UNIQUE)';
COMMENT ON COLUMN "products"."tag_code" IS 'รหัส tag ติดสินค้า (UNIQUE, สร้างอัตโนมัติ)';
COMMENT ON COLUMN "products"."name" IS 'ชื่อสินค้า';
COMMENT ON COLUMN "products"."designer" IS 'ชื่อดีไซเนอร์/แบรนด์';
COMMENT ON COLUMN "products"."shop_id" IS 'FK → shops.id ร้านเจ้าของสินค้า';
COMMENT ON COLUMN "products"."product_type_id" IS 'FK → product_types.id ประเภทสินค้า (RESTRICT — ลบประเภทไม่ได้ถ้ามีสินค้าอ้างอยู่; ใช้ is_active แทน)';
COMMENT ON COLUMN "products"."category_id" IS 'FK → product_categories.id หมวดหมู่ของสินค้า (host decision: สินค้า 1 ชิ้นมีได้ 1 หมวดเท่านั้น; NULL ได้ — สินค้าสร้างก่อนจัดหมวดได้; SET NULL — ลบหมวดแล้วสินค้ากลายเป็น "ยังไม่จัดหมวด", ดู DESIGN §3.2)';
COMMENT ON COLUMN "products"."size" IS 'ไซซ์';
COMMENT ON COLUMN "products"."color" IS 'สีหลักของสินค้า (ใช้ filter)';
COMMENT ON COLUMN "products"."price_per_day" IS 'ราคาเช่าต่อวัน (บาท จำนวนเต็ม)';
COMMENT ON COLUMN "products"."deposit" IS 'ค่ามัดจำ (บาท)';
COMMENT ON COLUMN "products"."description" IS 'คำอธิบายสินค้า';
COMMENT ON COLUMN "products"."line_url" IS 'LINE deep-link ของสินค้า (CTA หลัก)';
COMMENT ON COLUMN "products"."ads_tier" IS 'ระดับแผนโฆษณาของสินค้า';
COMMENT ON COLUMN "products"."featured" IS 'สินค้าแนะนำ (คัดโดย admin)';
COMMENT ON COLUMN "products"."sponsored" IS 'ติดป้าย sponsored';
COMMENT ON COLUMN "products"."status" IS 'สถานะ workflow การเผยแพร่สินค้า';
COMMENT ON COLUMN "products"."reject_reason" IS 'เหตุผลเมื่อถูก reject';
COMMENT ON COLUMN "products"."available" IS 'เปิดให้เช่าอยู่ (toggle โดยร้าน)';
COMMENT ON COLUMN "products"."views" IS 'ตัวนับยอดเข้าชมหน้า detail';
COMMENT ON COLUMN "products"."search_vector" IS 'full-text search vector (จัดการผ่าน raw SQL/trigger)';
COMMENT ON COLUMN "products"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "products"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "products"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "products"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "product_images" IS 'รูปภาพของสินค้า (เดิมเก็บเป็น Json array ใน dresses.images)';
COMMENT ON COLUMN "product_images"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "product_images"."product_id" IS 'FK → products.id (Cascade)';
COMMENT ON COLUMN "product_images"."url" IS 'URL รูป (MinIO/R2)';
COMMENT ON COLUMN "product_images"."alt" IS 'ข้อความ alt สำหรับ accessibility/SEO';
COMMENT ON COLUMN "product_images"."sort_order" IS 'ลำดับการแสดง (0 = รูปหลัก/cover)';
COMMENT ON COLUMN "product_images"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "product_images"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "product_images"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "product_images"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "product_price_tiers" IS 'ราคาเช่าแบบขั้นบันไดตามจำนวนวัน (เดิมเก็บเป็น Json ใน dresses.price_tiers)';
COMMENT ON COLUMN "product_price_tiers"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "product_price_tiers"."product_id" IS 'FK → products.id (Cascade)';
COMMENT ON COLUMN "product_price_tiers"."min_days" IS 'จำนวนวันขั้นต่ำที่ tier นี้เริ่มใช้';
COMMENT ON COLUMN "product_price_tiers"."price_per_day" IS 'ราคาต่อวันของ tier นี้ (บาท)';
COMMENT ON COLUMN "product_price_tiers"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "product_price_tiers"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "product_price_tiers"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "product_price_tiers"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "product_tags" IS 'ตารางเชื่อมสินค้า↔แท็ก (rev 3: แทน product_occasions เดิม — เดิมสุดคือ String[] ใน dresses.occasions)';
COMMENT ON COLUMN "product_tags"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "product_tags"."product_id" IS 'FK → products.id (Cascade)';
COMMENT ON COLUMN "product_tags"."tag_id" IS 'FK → tags.id (Cascade)';
COMMENT ON COLUMN "product_tags"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "product_tags"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "product_tags"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "product_tags"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "favorites" IS 'สินค้าที่ผู้ใช้บันทึกไว้ (wishlist — เดิม saved_dresses / users.saved_dress_ids uuid[])';
COMMENT ON COLUMN "favorites"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "favorites"."user_id" IS 'FK → users.id (Cascade)';
COMMENT ON COLUMN "favorites"."product_id" IS 'FK → products.id (Cascade — ลบสินค้าแล้วรายการ favorite หายตาม, แก้ปัญหา id ค้างของ array เดิม)';
COMMENT ON COLUMN "favorites"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "favorites"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "favorites"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "favorites"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "kyc_submissions" IS 'คำขอยืนยันตัวตนผู้ขาย (KYC) — 1 ร้านยื่นได้หลายครั้ง เปลี่ยนแปลง: submitted_at เดิม → created_at มาตรฐาน';
COMMENT ON COLUMN "kyc_submissions"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "kyc_submissions"."shop_id" IS 'FK → shops.id (Cascade)';
COMMENT ON COLUMN "kyc_submissions"."owner_id" IS 'FK → users.id เจ้าของผู้ยื่น (SetNull)';
COMMENT ON COLUMN "kyc_submissions"."business_type" IS 'ประเภทธุรกิจ (บุคคล/นิติบุคคล)';
COMMENT ON COLUMN "kyc_submissions"."legal_name" IS 'ชื่อตามกฎหมาย (บุคคล/บริษัท)';
COMMENT ON COLUMN "kyc_submissions"."tax_id" IS 'เลขประจำตัวผู้เสียภาษี';
COMMENT ON COLUMN "kyc_submissions"."dbd_reg_no" IS 'เลขทะเบียน DBD (กรณีนิติบุคคล)';
COMMENT ON COLUMN "kyc_submissions"."bank_name" IS 'ธนาคารบัญชีรับเงิน';
COMMENT ON COLUMN "kyc_submissions"."bank_acc_no" IS 'เลขบัญชีรับเงิน';
COMMENT ON COLUMN "kyc_submissions"."bank_acc_name" IS 'ชื่อบัญชีรับเงิน';
COMMENT ON COLUMN "kyc_submissions"."id_card_url" IS 'URL เอกสารบัตรประชาชน (private bucket)';
COMMENT ON COLUMN "kyc_submissions"."dbd_doc_url" IS 'URL หนังสือรับรอง DBD';
COMMENT ON COLUMN "kyc_submissions"."book_bank_url" IS 'URL หน้า book bank';
COMMENT ON COLUMN "kyc_submissions"."vat_doc_url" IS 'URL ภ.พ.20 (VAT)';
COMMENT ON COLUMN "kyc_submissions"."plan" IS 'แผนที่สมัครตอนยื่น KYC';
COMMENT ON COLUMN "kyc_submissions"."status" IS 'สถานะการตรวจ KYC';
COMMENT ON COLUMN "kyc_submissions"."reviewer_id" IS 'FK → users.id แอดมินผู้ตรวจ';
COMMENT ON COLUMN "kyc_submissions"."review_notes" IS 'บันทึกผลการตรวจ';
COMMENT ON COLUMN "kyc_submissions"."reviewed_at" IS 'เวลาที่ตรวจเสร็จ';
COMMENT ON COLUMN "kyc_submissions"."created_by" IS 'uuid ผู้สร้าง record (= ผู้ยื่น)';
COMMENT ON COLUMN "kyc_submissions"."created_at" IS 'เวลายื่นคำขอ (เดิมชื่อ submitted_at)';
COMMENT ON COLUMN "kyc_submissions"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "kyc_submissions"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "line_clicks" IS 'เหตุการณ์คลิกปุ่ม LINE (success metric หลักของ v0.1) — append-only เปลี่ยนแปลง: PK BigInt → uuid ตามมาตรฐานทุกตาราง';
COMMENT ON COLUMN "line_clicks"."id" IS 'Primary key (uuid) — เดิม bigserial';
COMMENT ON COLUMN "line_clicks"."product_id" IS 'FK → products.id สินค้าที่ถูกคลิก (SetNull)';
COMMENT ON COLUMN "line_clicks"."shop_id" IS 'FK → shops.id ร้านที่ถูกคลิก (SetNull)';
COMMENT ON COLUMN "line_clicks"."source" IS 'ตำแหน่งปุ่มบนหน้า (detail/card/...)';
COMMENT ON COLUMN "line_clicks"."user_id" IS 'FK → users.id ผู้คลิก (NULL = anonymous)';
COMMENT ON COLUMN "line_clicks"."channel" IS 'ช่องทาง acquisition ของ session';
COMMENT ON COLUMN "line_clicks"."utm_source" IS 'utm_source ของ session';
COMMENT ON COLUMN "line_clicks"."referrer" IS 'referrer ของ session';
COMMENT ON COLUMN "line_clicks"."province" IS 'จังหวัดผู้ใช้ (geo)';
COMMENT ON COLUMN "line_clicks"."session_id" IS 'session id ฝั่ง client';
COMMENT ON COLUMN "line_clicks"."user_agent" IS 'user agent';
COMMENT ON COLUMN "line_clicks"."ip_hash" IS 'hash ของ IP (privacy)';
COMMENT ON COLUMN "line_clicks"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "line_clicks"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "line_clicks"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "line_clicks"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "page_views" IS 'pageview ผู้เยี่ยมชม (anon + authed) — top-of-funnel analytics, append-only เปลี่ยนแปลง: PK BigInt → uuid';
COMMENT ON COLUMN "page_views"."id" IS 'Primary key (uuid) — เดิม bigserial';
COMMENT ON COLUMN "page_views"."session_id" IS 'session id ฝั่ง client';
COMMENT ON COLUMN "page_views"."user_id" IS 'FK → users.id (NULL = anonymous)';
COMMENT ON COLUMN "page_views"."path" IS 'path ของหน้า';
COMMENT ON COLUMN "page_views"."channel" IS 'ช่องทาง acquisition';
COMMENT ON COLUMN "page_views"."utm_source" IS 'utm_source';
COMMENT ON COLUMN "page_views"."utm_medium" IS 'utm_medium';
COMMENT ON COLUMN "page_views"."utm_campaign" IS 'utm_campaign';
COMMENT ON COLUMN "page_views"."referrer" IS 'referrer';
COMMENT ON COLUMN "page_views"."province" IS 'จังหวัด (geo)';
COMMENT ON COLUMN "page_views"."country" IS 'ประเทศ (geo)';
COMMENT ON COLUMN "page_views"."user_agent" IS 'user agent';
COMMENT ON COLUMN "page_views"."ip_hash" IS 'hash ของ IP (privacy)';
COMMENT ON COLUMN "page_views"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "page_views"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "page_views"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "page_views"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "shop_subscriptions" IS 'แผนสมาชิกแบบเสียเงินของร้าน (เดิม seller_subscriptions) — ขับเคลื่อน MRR';
COMMENT ON COLUMN "shop_subscriptions"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "shop_subscriptions"."shop_id" IS 'FK → shops.id (Cascade)';
COMMENT ON COLUMN "shop_subscriptions"."owner_id" IS 'FK → users.id เจ้าของ (SetNull)';
COMMENT ON COLUMN "shop_subscriptions"."plan" IS 'แผนที่สมัคร';
COMMENT ON COLUMN "shop_subscriptions"."status" IS 'สถานะ subscription';
COMMENT ON COLUMN "shop_subscriptions"."amount" IS 'ยอดจ่ายต่อรอบ (บาท)';
COMMENT ON COLUMN "shop_subscriptions"."billing_cycle" IS 'รอบบิล (รายเดือน/รายปี)';
COMMENT ON COLUMN "shop_subscriptions"."started_at" IS 'เวลาเริ่ม subscription';
COMMENT ON COLUMN "shop_subscriptions"."current_period_end" IS 'เวลาสิ้นสุดรอบบิลปัจจุบัน';
COMMENT ON COLUMN "shop_subscriptions"."cancelled_at" IS 'เวลายกเลิก';
COMMENT ON COLUMN "shop_subscriptions"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "shop_subscriptions"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "shop_subscriptions"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "shop_subscriptions"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "addresses" IS 'ที่อยู่จัดส่งของผู้ใช้';
COMMENT ON COLUMN "addresses"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "addresses"."user_id" IS 'FK → users.id (Cascade)';
COMMENT ON COLUMN "addresses"."label" IS 'ป้ายชื่อที่อยู่ (บ้าน/ที่ทำงาน)';
COMMENT ON COLUMN "addresses"."recipient_name" IS 'ชื่อผู้รับ';
COMMENT ON COLUMN "addresses"."phone" IS 'เบอร์โทรผู้รับ';
COMMENT ON COLUMN "addresses"."address_line" IS 'ที่อยู่บรรทัดหลัก';
COMMENT ON COLUMN "addresses"."subdistrict" IS 'แขวง/ตำบล';
COMMENT ON COLUMN "addresses"."district" IS 'เขต/อำเภอ';
COMMENT ON COLUMN "addresses"."province" IS 'จังหวัด';
COMMENT ON COLUMN "addresses"."postal_code" IS 'รหัสไปรษณีย์';
COMMENT ON COLUMN "addresses"."is_default" IS 'ที่อยู่หลัก (default) ของผู้ใช้';
COMMENT ON COLUMN "addresses"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "addresses"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "addresses"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "addresses"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "bookings" IS 'การจอง — state machine 9 สถานะ, snapshot ราคา/ค่าคอม/ที่อยู่ ณ เวลาจอง';
COMMENT ON COLUMN "bookings"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "bookings"."renter_id" IS 'FK → users.id ผู้เช่า (Cascade)';
COMMENT ON COLUMN "bookings"."shop_id" IS 'FK → shops.id (Cascade)';
COMMENT ON COLUMN "bookings"."product_id" IS 'FK → products.id (Cascade)';
COMMENT ON COLUMN "bookings"."start_date" IS 'วันเริ่มเช่า';
COMMENT ON COLUMN "bookings"."end_date" IS 'วันคืนสินค้า';
COMMENT ON COLUMN "bookings"."rental_total" IS 'ค่าเช่ารวม snapshot ณ เวลาจอง (บาท)';
COMMENT ON COLUMN "bookings"."deposit" IS 'ค่ามัดจำ snapshot (บาท)';
COMMENT ON COLUMN "bookings"."shipping_fee" IS 'ค่าส่ง (บาท)';
COMMENT ON COLUMN "bookings"."commission_rate" IS 'อัตราค่าคอมแพลตฟอร์ม snapshot (คงที่แม้ปรับ rate ภายหลัง)';
COMMENT ON COLUMN "bookings"."commission_amount" IS 'ยอดค่าคอมที่คำนวณแล้ว (บาท)';
COMMENT ON COLUMN "bookings"."channel" IS 'ช่องทาง acquisition (first-touch) ของผู้เช่า';
COMMENT ON COLUMN "bookings"."status" IS 'สถานะการจองตาม state machine';
COMMENT ON COLUMN "bookings"."slip_path" IS 'path ไฟล์สลิปโอนเงิน (private bucket)';
COMMENT ON COLUMN "bookings"."address_id" IS 'FK → addresses.id ที่อยู่ที่เลือกตอนจอง (SetNull — ใช้ snapshot ด้านล่างแสดงผล)';
COMMENT ON COLUMN "bookings"."recipient_name" IS 'snapshot ชื่อผู้รับ';
COMMENT ON COLUMN "bookings"."phone" IS 'snapshot เบอร์โทร';
COMMENT ON COLUMN "bookings"."address_text" IS 'snapshot ที่อยู่เต็ม (ข้อความ)';
COMMENT ON COLUMN "bookings"."current_due_at" IS 'เส้นตายของสถานะปัจจุบัน (เช่น หมดเวลาชำระเงิน)';
COMMENT ON COLUMN "bookings"."cancel_reason" IS 'เหตุผลการยกเลิก';
COMMENT ON COLUMN "bookings"."cancel_from_status" IS 'สถานะก่อนยกเลิก (เดิมเป็น String → ใช้ enum เดียวกับ status)';
COMMENT ON COLUMN "bookings"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "bookings"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "bookings"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "bookings"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "product_blackout_dates" IS 'วันที่ร้านปิดไม่ให้จองสินค้า (blackout — เดิม dress_blackouts, composite PK (dress_id, date))';
COMMENT ON COLUMN "product_blackout_dates"."id" IS 'Primary key (uuid) — เพิ่มใหม่, คง UNIQUE(product_id, date)';
COMMENT ON COLUMN "product_blackout_dates"."product_id" IS 'FK → products.id (Cascade)';
COMMENT ON COLUMN "product_blackout_dates"."date" IS 'วันที่ปิดจอง';
COMMENT ON COLUMN "product_blackout_dates"."created_by" IS 'uuid ผู้สร้าง record (NULL = system/seed; ไม่มี FK — ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "product_blackout_dates"."created_at" IS 'เวลาสร้าง record';
COMMENT ON COLUMN "product_blackout_dates"."updated_by" IS 'uuid ผู้แก้ไขล่าสุด (ไม่มี FK)';
COMMENT ON COLUMN "product_blackout_dates"."updated_at" IS 'เวลาแก้ไขล่าสุด (DB trigger set_updated_at + Prisma @updatedAt)';

COMMENT ON TABLE "audit_logs" IS 'Audit log รวม (host decision: merge admin_audit เข้าตารางนี้) 1) mechanical before/after ของทุก mutating operation — เขียนโดย Prisma client extension 2) admin business actions (approve KYC, reject product, ...) — เขียน explicit โดย admin actions; เหตุผลของแอดมินเก็บใน after->>''reason'' append-only, ไม่มี FK ไป users (ต้องอยู่รอดแม้ user ถูก hard delete)';
COMMENT ON COLUMN "audit_logs"."id" IS 'Primary key (uuid)';
COMMENT ON COLUMN "audit_logs"."action" IS 'ชนิด operation (admin business actions ใช้ UPDATE/DELETE ตาม mutation จริง)';
COMMENT ON COLUMN "audit_logs"."entity_type" IS 'ชื่อ entity/ตาราง (เช่น "Product", "Booking") หรือ business entity ("kyc")';
COMMENT ON COLUMN "audit_logs"."entity_id" IS 'uuid ของ row ที่ถูกกระทำ';
COMMENT ON COLUMN "audit_logs"."actor_id" IS 'uuid ผู้กระทำจาก session (NULL = system/cron/anonymous)';
COMMENT ON COLUMN "audit_logs"."before" IS 'สภาพ row ก่อนแก้ (NULL สำหรับ CREATE)';
COMMENT ON COLUMN "audit_logs"."after" IS 'สภาพ row หลังแก้ (NULL สำหรับ DELETE); admin actions ใส่ reason/action ชื่อธุรกิจที่นี่';
COMMENT ON COLUMN "audit_logs"."created_at" IS 'เวลาเกิดเหตุการณ์';

