-- CreateEnum
CREATE TYPE "Role" AS ENUM ('customer', 'seller', 'admin');

-- CreateEnum
CREATE TYPE "Color" AS ENUM ('rose', 'ivory', 'green', 'black', 'navy', 'red', 'blue', 'purple');

-- CreateEnum
CREATE TYPE "Size" AS ENUM ('XS', 'S', 'M', 'L', 'XL');

-- CreateEnum
CREATE TYPE "AdsTier" AS ENUM ('free', 'boost', 'featured');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('pending', 'live', 'rejected', 'draft');

-- CreateEnum
CREATE TYPE "KycStatus" AS ENUM ('none', 'submitted', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "KycReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "KycPlan" AS ENUM ('Free', 'Boost', 'Featured');

-- CreateEnum
CREATE TYPE "BusinessType" AS ENUM ('individual', 'company');

-- CreateTable
CREATE TABLE "occasions" (
    "key" TEXT NOT NULL,
    "th" TEXT NOT NULL,
    "en" TEXT NOT NULL,
    "color_token" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "occasions_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "areas" (
    "key" TEXT NOT NULL,
    "th" TEXT NOT NULL,
    "lat" DECIMAL(9,6) NOT NULL,
    "lng" DECIMAL(9,6) NOT NULL,
    "keywords" TEXT[],

    CONSTRAINT "areas_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "email_verified" TIMESTAMP(3),
    "password_hash" TEXT,
    "full_name" TEXT,
    "line_id" TEXT,
    "role" "Role" NOT NULL DEFAULT 'customer',
    "saved_dress_ids" UUID[],
    "image" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

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

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "session_token" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification_tokens" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "boutiques" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "owner_id" UUID,
    "owner_name" TEXT,
    "area_key" TEXT,
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
    "since_year" INTEGER,
    "cover_color" "Color" NOT NULL DEFAULT 'rose',
    "tag" TEXT,
    "story" TEXT,
    "delivery_info" TEXT,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "ads_tier" "AdsTier" NOT NULL DEFAULT 'free',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'live',
    "reject_reason" TEXT,
    "kyc_status" "KycStatus" NOT NULL DEFAULT 'none',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boutiques_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dresses" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "tag_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "designer" TEXT,
    "boutique_id" UUID NOT NULL,
    "boutique_name" TEXT NOT NULL,
    "size" "Size" NOT NULL,
    "color" "Color" NOT NULL,
    "price_per_day" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "price_tiers" JSONB NOT NULL DEFAULT '[]',
    "description" TEXT,
    "images" JSONB NOT NULL DEFAULT '[]',
    "occasions" TEXT[],
    "line_url" TEXT NOT NULL,
    "ads_tier" "AdsTier" NOT NULL DEFAULT 'free',
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "sponsored" BOOLEAN NOT NULL DEFAULT false,
    "status" "Status" NOT NULL DEFAULT 'live',
    "reject_reason" TEXT,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "views" INTEGER NOT NULL DEFAULT 0,
    "search_vector" tsvector,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kyc_submissions" (
    "id" UUID NOT NULL,
    "boutique_id" UUID NOT NULL,
    "owner_id" UUID,
    "business_type" "BusinessType" NOT NULL,
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
    "plan" "KycPlan" NOT NULL DEFAULT 'Boost',
    "status" "KycReviewStatus" NOT NULL DEFAULT 'pending',
    "reviewer_id" UUID,
    "review_notes" TEXT,
    "submitted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewed_at" TIMESTAMP(3),

    CONSTRAINT "kyc_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "line_clicks" (
    "id" BIGSERIAL NOT NULL,
    "dress_id" UUID,
    "boutique_id" UUID,
    "source" TEXT,
    "user_id" UUID,
    "user_agent" TEXT,
    "ip_hash" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "line_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "admin_audit" (
    "id" BIGSERIAL NOT NULL,
    "admin_id" UUID,
    "action" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "target_id" UUID,
    "reason" TEXT,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "admin_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dress_blackouts" (
    "dress_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dress_blackouts_pkey" PRIMARY KEY ("dress_id","date")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_session_token_key" ON "sessions"("session_token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_token_key" ON "verification_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verification_tokens_identifier_token_key" ON "verification_tokens"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "boutiques_slug_key" ON "boutiques"("slug");

-- CreateIndex
CREATE INDEX "boutiques_status_idx" ON "boutiques"("status");

-- CreateIndex
CREATE INDEX "boutiques_featured_idx" ON "boutiques"("featured");

-- CreateIndex
CREATE INDEX "boutiques_area_key_idx" ON "boutiques"("area_key");

-- CreateIndex
CREATE INDEX "boutiques_verified_idx" ON "boutiques"("verified");

-- CreateIndex
CREATE INDEX "boutiques_district_idx" ON "boutiques"("district");

-- CreateIndex
CREATE UNIQUE INDEX "dresses_slug_key" ON "dresses"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "dresses_tag_code_key" ON "dresses"("tag_code");

-- CreateIndex
CREATE INDEX "dresses_color_idx" ON "dresses"("color");

-- CreateIndex
CREATE INDEX "dresses_size_idx" ON "dresses"("size");

-- CreateIndex
CREATE INDEX "dresses_status_idx" ON "dresses"("status");

-- CreateIndex
CREATE INDEX "dresses_available_idx" ON "dresses"("available");

-- CreateIndex
CREATE INDEX "dresses_boutique_id_idx" ON "dresses"("boutique_id");

-- CreateIndex
CREATE INDEX "dresses_price_per_day_idx" ON "dresses"("price_per_day");

-- CreateIndex
CREATE INDEX "kyc_submissions_status_idx" ON "kyc_submissions"("status");

-- CreateIndex
CREATE INDEX "kyc_submissions_boutique_id_idx" ON "kyc_submissions"("boutique_id");

-- CreateIndex
CREATE INDEX "line_clicks_dress_id_idx" ON "line_clicks"("dress_id");

-- CreateIndex
CREATE INDEX "line_clicks_boutique_id_idx" ON "line_clicks"("boutique_id");

-- CreateIndex
CREATE INDEX "line_clicks_created_at_idx" ON "line_clicks"("created_at" DESC);

-- CreateIndex
CREATE INDEX "admin_audit_target_type_target_id_idx" ON "admin_audit"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "admin_audit_created_at_idx" ON "admin_audit"("created_at" DESC);

-- CreateIndex
CREATE INDEX "dress_blackouts_dress_id_idx" ON "dress_blackouts"("dress_id");

-- CreateIndex
CREATE INDEX "dress_blackouts_date_idx" ON "dress_blackouts"("date");

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boutiques" ADD CONSTRAINT "boutiques_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "boutiques" ADD CONSTRAINT "boutiques_area_key_fkey" FOREIGN KEY ("area_key") REFERENCES "areas"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dresses" ADD CONSTRAINT "dresses_boutique_id_fkey" FOREIGN KEY ("boutique_id") REFERENCES "boutiques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_boutique_id_fkey" FOREIGN KEY ("boutique_id") REFERENCES "boutiques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_submissions" ADD CONSTRAINT "kyc_submissions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_clicks" ADD CONSTRAINT "line_clicks_dress_id_fkey" FOREIGN KEY ("dress_id") REFERENCES "dresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_clicks" ADD CONSTRAINT "line_clicks_boutique_id_fkey" FOREIGN KEY ("boutique_id") REFERENCES "boutiques"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "line_clicks" ADD CONSTRAINT "line_clicks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_audit" ADD CONSTRAINT "admin_audit_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dress_blackouts" ADD CONSTRAINT "dress_blackouts_dress_id_fkey" FOREIGN KEY ("dress_id") REFERENCES "dresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
