-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('LOCAL', 'GOOGLE');

-- CreateEnum
CREATE TYPE "WallpaperQuality" AS ENUM ('HD', 'FULL_HD', 'QHD', 'UHD_4K', 'UHD_8K');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "ImageFormat" AS ENUM ('WEBP', 'JPG', 'PNG', 'AVIF');

-- CreateEnum
CREATE TYPE "VariantType" AS ENUM ('THUMBNAIL', 'DISPLAY', 'HD', 'FULL_HD', 'QHD', 'UHD', 'ORIGINAL');

-- CreateEnum
CREATE TYPE "SubscriptionPlatform" AS ENUM ('RAZORPAY', 'GOOGLE', 'APPLE', 'STRIPE');

-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT,
    "google_id" TEXT,
    "auth_provider" "AuthProvider" NOT NULL DEFAULT 'LOCAL',
    "avatar_url" TEXT,
    "bio" TEXT,
    "lastSeen" TIMESTAMP(3),
    "is_premium" BOOLEAN NOT NULL DEFAULT false,
    "premium_until" TIMESTAMP(3),
    "favoriteCount" INTEGER NOT NULL DEFAULT 0,
    "daily_download_count" INTEGER NOT NULL DEFAULT 0,
    "last_download_reset" TIMESTAMP(3),
    "role_id" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "login_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "logout_at" TIMESTAMPTZ(6),

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "description" TEXT,
    "folder_name" TEXT NOT NULL,
    "cover_image" TEXT,
    "thumbnail_url" TEXT,
    "wallpaper_count" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallpapers" (
    "id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" UUID NOT NULL,
    "original_path" TEXT NOT NULL,
    "display_path" TEXT NOT NULL,
    "thumbnail_path" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "aspect_ratio" DOUBLE PRECISION NOT NULL,
    "original_size" INTEGER NOT NULL,
    "display_size" INTEGER NOT NULL,
    "thumbnail_size" INTEGER NOT NULL,
    "quality" "WallpaperQuality" NOT NULL DEFAULT 'UHD_4K',
    "format" TEXT NOT NULL DEFAULT 'webp',
    "isPremium" BOOLEAN NOT NULL DEFAULT false,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featured_order" INTEGER NOT NULL DEFAULT 0,
    "featured_at" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "likeCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "dominant_color" TEXT,
    "searchable_text" TEXT,
    "checksum" TEXT,
    "blur_hash" TEXT,
    "cache_version" INTEGER NOT NULL DEFAULT 1,
    "status" "UploadStatus" NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wallpapers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "wallpaper_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallpaper_tags" (
    "wallpaperId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "wallpaper_tags_pkey" PRIMARY KEY ("wallpaperId","tagId")
);

-- CreateTable
CREATE TABLE "downloads" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "guest_id" TEXT,
    "wallpaper_id" UUID NOT NULL,
    "quality" TEXT NOT NULL DEFAULT '4K',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "downloads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallpaper_likes" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "wallpaper_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallpaper_likes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallpaper_variants" (
    "id" UUID NOT NULL,
    "wallpaperId" UUID NOT NULL,
    "type" "VariantType" NOT NULL,
    "url" TEXT NOT NULL,
    "width" INTEGER NOT NULL,
    "height" INTEGER NOT NULL,
    "size" INTEGER NOT NULL,
    "format" "ImageFormat" NOT NULL DEFAULT 'WEBP',
    "compressionQuality" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "wallpaper_variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "plan" "SubscriptionPlan" NOT NULL,
    "platform" "SubscriptionPlatform" NOT NULL,
    "orderId" TEXT,
    "paymentId" TEXT,
    "signature" TEXT,
    "purchaseToken" TEXT,
    "transactionId" TEXT,
    "amount" DOUBLE PRECISION,
    "currency" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "subscriptionId" UUID,
    "orderId" TEXT NOT NULL,
    "paymentId" TEXT,
    "signature" TEXT,
    "platform" "SubscriptionPlatform" NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "PaymentStatus" NOT NULL,
    "receipt" TEXT,
    "notes" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "guests" (
    "id" TEXT NOT NULL,
    "device_hash" TEXT,
    "daily_download_count" INTEGER NOT NULL DEFAULT 0,
    "last_download_reset" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_google_id_key" ON "users"("google_id");

-- CreateIndex
CREATE INDEX "users_role_id_idx" ON "users"("role_id");

-- CreateIndex
CREATE INDEX "users_google_id_idx" ON "users"("google_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_token_key" ON "user_sessions"("token");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_token_idx" ON "user_sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "categories_slug_key" ON "categories"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "categories_folder_name_key" ON "categories"("folder_name");

-- CreateIndex
CREATE INDEX "categories_active_idx" ON "categories"("active");

-- CreateIndex
CREATE INDEX "categories_sort_order_idx" ON "categories"("sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "wallpapers_slug_key" ON "wallpapers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "wallpapers_checksum_key" ON "wallpapers"("checksum");

-- CreateIndex
CREATE INDEX "wallpapers_categoryId_idx" ON "wallpapers"("categoryId");

-- CreateIndex
CREATE INDEX "wallpapers_active_idx" ON "wallpapers"("active");

-- CreateIndex
CREATE INDEX "wallpapers_isFeatured_idx" ON "wallpapers"("isFeatured");

-- CreateIndex
CREATE INDEX "wallpapers_isPremium_idx" ON "wallpapers"("isPremium");

-- CreateIndex
CREATE INDEX "wallpapers_downloadCount_idx" ON "wallpapers"("downloadCount");

-- CreateIndex
CREATE INDEX "wallpapers_likeCount_idx" ON "wallpapers"("likeCount");

-- CreateIndex
CREATE INDEX "wallpapers_slug_idx" ON "wallpapers"("slug");

-- CreateIndex
CREATE INDEX "wallpapers_active_categoryId_idx" ON "wallpapers"("active", "categoryId");

-- CreateIndex
CREATE INDEX "wallpapers_active_isPremium_idx" ON "wallpapers"("active", "isPremium");

-- CreateIndex
CREATE INDEX "wallpapers_active_isFeatured_idx" ON "wallpapers"("active", "isFeatured");

-- CreateIndex
CREATE INDEX "wallpapers_categoryId_createdAt_idx" ON "wallpapers"("categoryId", "createdAt");

-- CreateIndex
CREATE INDEX "wallpapers_downloadCount_likeCount_idx" ON "wallpapers"("downloadCount", "likeCount");

-- CreateIndex
CREATE INDEX "wallpapers_status_idx" ON "wallpapers"("status");

-- CreateIndex
CREATE INDEX "favorites_user_id_idx" ON "favorites"("user_id");

-- CreateIndex
CREATE INDEX "favorites_wallpaper_id_idx" ON "favorites"("wallpaper_id");

-- CreateIndex
CREATE UNIQUE INDEX "favorites_user_id_wallpaper_id_key" ON "favorites"("user_id", "wallpaper_id");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE INDEX "tags_name_idx" ON "tags"("name");

-- CreateIndex
CREATE INDEX "wallpaper_tags_tagId_idx" ON "wallpaper_tags"("tagId");

-- CreateIndex
CREATE INDEX "wallpaper_tags_wallpaperId_idx" ON "wallpaper_tags"("wallpaperId");

-- CreateIndex
CREATE INDEX "downloads_user_id_idx" ON "downloads"("user_id");

-- CreateIndex
CREATE INDEX "downloads_guest_id_idx" ON "downloads"("guest_id");

-- CreateIndex
CREATE INDEX "downloads_wallpaper_id_idx" ON "downloads"("wallpaper_id");

-- CreateIndex
CREATE INDEX "downloads_created_at_idx" ON "downloads"("created_at");

-- CreateIndex
CREATE INDEX "wallpaper_likes_user_id_idx" ON "wallpaper_likes"("user_id");

-- CreateIndex
CREATE INDEX "wallpaper_likes_wallpaper_id_idx" ON "wallpaper_likes"("wallpaper_id");

-- CreateIndex
CREATE UNIQUE INDEX "wallpaper_likes_user_id_wallpaper_id_key" ON "wallpaper_likes"("user_id", "wallpaper_id");

-- CreateIndex
CREATE INDEX "wallpaper_variants_wallpaperId_idx" ON "wallpaper_variants"("wallpaperId");

-- CreateIndex
CREATE INDEX "wallpaper_variants_type_idx" ON "wallpaper_variants"("type");

-- CreateIndex
CREATE UNIQUE INDEX "wallpaper_variants_wallpaperId_type_key" ON "wallpaper_variants"("wallpaperId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_orderId_key" ON "Subscription"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_paymentId_key" ON "Subscription"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_purchaseToken_key" ON "Subscription"("purchaseToken");

-- CreateIndex
CREATE INDEX "Subscription_userId_idx" ON "Subscription"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_orderId_key" ON "payments"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "payments_paymentId_key" ON "payments"("paymentId");

-- CreateIndex
CREATE INDEX "payments_userId_idx" ON "payments"("userId");

-- CreateIndex
CREATE INDEX "payments_status_idx" ON "payments"("status");

-- CreateIndex
CREATE UNIQUE INDEX "guests_device_hash_key" ON "guests"("device_hash");

-- CreateIndex
CREATE INDEX "guests_device_hash_idx" ON "guests"("device_hash");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallpapers" ADD CONSTRAINT "wallpapers_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_wallpaper_id_fkey" FOREIGN KEY ("wallpaper_id") REFERENCES "wallpapers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallpaper_tags" ADD CONSTRAINT "wallpaper_tags_wallpaperId_fkey" FOREIGN KEY ("wallpaperId") REFERENCES "wallpapers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallpaper_tags" ADD CONSTRAINT "wallpaper_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_guest_id_fkey" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_wallpaper_id_fkey" FOREIGN KEY ("wallpaper_id") REFERENCES "wallpapers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallpaper_likes" ADD CONSTRAINT "wallpaper_likes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallpaper_likes" ADD CONSTRAINT "wallpaper_likes_wallpaper_id_fkey" FOREIGN KEY ("wallpaper_id") REFERENCES "wallpapers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallpaper_variants" ADD CONSTRAINT "wallpaper_variants_wallpaperId_fkey" FOREIGN KEY ("wallpaperId") REFERENCES "wallpapers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
