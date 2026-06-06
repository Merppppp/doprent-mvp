-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('booking_pending', 'waiting_for_payment', 'payment_review', 'confirmed', 'cancel_requested', 'slip_disputed', 'rejected', 'cancelled', 'payment_expired');

-- CreateEnum
CREATE TYPE "SubPlan" AS ENUM ('free', 'boost', 'featured');

-- CreateEnum
CREATE TYPE "SubStatus" AS ENUM ('active', 'past_due', 'cancelled', 'expired');

-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('monthly', 'yearly');

-- AlterTable
ALTER TABLE "boutiques" ADD COLUMN     "promptpay_id" TEXT;

-- AlterTable
ALTER TABLE "line_clicks" ADD COLUMN     "channel" TEXT,
ADD COLUMN     "province" TEXT,
ADD COLUMN     "referrer" TEXT,
ADD COLUMN     "session_id" TEXT,
ADD COLUMN     "utm_source" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "last_active_at" TIMESTAMP(3),
ADD COLUMN     "last_province" TEXT,
ADD COLUMN     "signup_campaign" TEXT,
ADD COLUMN     "signup_channel" TEXT,
ADD COLUMN     "signup_medium" TEXT,
ADD COLUMN     "signup_referrer" TEXT,
ADD COLUMN     "signup_source" TEXT;

-- CreateTable
CREATE TABLE "page_views" (
    "id" BIGSERIAL NOT NULL,
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seller_subscriptions" (
    "id" UUID NOT NULL,
    "boutique_id" UUID,
    "owner_id" UUID,
    "plan" "SubPlan" NOT NULL DEFAULT 'free',
    "status" "SubStatus" NOT NULL DEFAULT 'active',
    "amount" INTEGER NOT NULL DEFAULT 0,
    "billing_cycle" "BillingCycle" NOT NULL DEFAULT 'monthly',
    "started_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "seller_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "addresses" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "recipient_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_text" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "addresses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" UUID NOT NULL,
    "renter_id" UUID NOT NULL,
    "boutique_id" UUID NOT NULL,
    "dress_id" UUID NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE NOT NULL,
    "rental_total" INTEGER NOT NULL,
    "deposit" INTEGER NOT NULL DEFAULT 0,
    "shipping_fee" INTEGER,
    "commission_rate" DECIMAL(5,4) NOT NULL DEFAULT 0.10,
    "commission_amount" INTEGER,
    "channel" TEXT,
    "status" "BookingStatus" NOT NULL DEFAULT 'booking_pending',
    "slip_path" TEXT,
    "address_id" UUID,
    "recipient_name" TEXT,
    "phone" TEXT,
    "address_text" TEXT,
    "current_due_at" TIMESTAMP(3),
    "cancel_reason" TEXT,
    "cancel_from_status" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

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
CREATE INDEX "seller_subscriptions_boutique_id_idx" ON "seller_subscriptions"("boutique_id");

-- CreateIndex
CREATE INDEX "seller_subscriptions_status_idx" ON "seller_subscriptions"("status");

-- CreateIndex
CREATE INDEX "seller_subscriptions_plan_idx" ON "seller_subscriptions"("plan");

-- CreateIndex
CREATE INDEX "addresses_user_id_idx" ON "addresses"("user_id");

-- CreateIndex
CREATE INDEX "bookings_renter_id_idx" ON "bookings"("renter_id");

-- CreateIndex
CREATE INDEX "bookings_boutique_id_idx" ON "bookings"("boutique_id");

-- CreateIndex
CREATE INDEX "bookings_dress_id_idx" ON "bookings"("dress_id");

-- CreateIndex
CREATE INDEX "bookings_status_idx" ON "bookings"("status");

-- CreateIndex
CREATE INDEX "bookings_created_at_idx" ON "bookings"("created_at" DESC);

-- CreateIndex
CREATE INDEX "line_clicks_channel_idx" ON "line_clicks"("channel");

-- CreateIndex
CREATE INDEX "users_last_active_at_idx" ON "users"("last_active_at" DESC);

-- CreateIndex
CREATE INDEX "users_signup_channel_idx" ON "users"("signup_channel");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at" DESC);

-- AddForeignKey
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_subscriptions" ADD CONSTRAINT "seller_subscriptions_boutique_id_fkey" FOREIGN KEY ("boutique_id") REFERENCES "boutiques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "seller_subscriptions" ADD CONSTRAINT "seller_subscriptions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "addresses" ADD CONSTRAINT "addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_renter_id_fkey" FOREIGN KEY ("renter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_boutique_id_fkey" FOREIGN KEY ("boutique_id") REFERENCES "boutiques"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_dress_id_fkey" FOREIGN KEY ("dress_id") REFERENCES "dresses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "addresses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
