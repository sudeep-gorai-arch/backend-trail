import { Request } from "express";
import { absoluteUrl } from "./url";

type AnyObj = Record<string, any>;

const makeUrl = (req: Request, value?: string | null) => {
  if (!value) return null;

  const url = String(value).trim();

  if (!url) return null;

  return absoluteUrl(req, url);
};

const getVariant = (w: AnyObj) => {
  if (!Array.isArray(w.wallpaperVariants)) return null;

  return (
    w.wallpaperVariants.find(
      (v: AnyObj) => String(v.type || "").toUpperCase() === "ORIGINAL"
    ) ||
    w.wallpaperVariants.find(
      (v: AnyObj) => String(v.type || "").toUpperCase() === "DISPLAY"
    ) ||
    w.wallpaperVariants.find(
      (v: AnyObj) => String(v.type || "").toUpperCase() === "THUMBNAIL"
    ) ||
    w.wallpaperVariants.find((v: AnyObj) => v.quality === "4K") ||
    w.wallpaperVariants[0] ||
    null
  );
};

const firstValue = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (value && String(value).trim()) {
      return String(value).trim();
    }
  }

  return null;
};

export type WallpaperRow = AnyObj;

export const toCategoryDTO = (req: Request, c: AnyObj) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,

  icon: c.icon ?? null,

  thumbnailUrl: makeUrl(
    req,
    firstValue(c.thumbnailUrl, c.thumbnail_url, c.icon)
  ),

  createdAt: c.createdAt,

  count: c.count ?? c._count?.wallpapers ?? 0,
});

export const toWallpaperDTO = (req: Request, w: WallpaperRow) => {
  const variant = getVariant(w);

  const rawImageUrl = firstValue(
    w.imageUrl,
    w.image_url,
    w.url,
    w.displayUrl,
    w.display_url,
    w.displayPath,
    w.display_path,
    w.originalUrl,
    w.original_url,
    w.originalPath,
    w.original_path,
    w.downloadUrl,
    w.download_url,
    variant?.imageUrl,
    variant?.image_url,
    variant?.url,
    variant?.displayUrl,
    variant?.display_url,
    variant?.displayPath,
    variant?.display_path,
    variant?.originalUrl,
    variant?.original_url,
    variant?.originalPath,
    variant?.original_path,
    variant?.path
  );

  const rawThumbnailUrl = firstValue(
    w.thumbnailUrl,
    w.thumbnail_url,
    w.thumbnailPath,
    w.thumbnail_path,
    w.thumbUrl,
    w.thumb_url,
    w.previewUrl,
    w.preview_url,
    w.displayUrl,
    w.display_url,
    w.displayPath,
    w.display_path,
    variant?.thumbnailUrl,
    variant?.thumbnail_url,
    variant?.thumbnailPath,
    variant?.thumbnail_path,
    variant?.previewUrl,
    variant?.preview_url,
    variant?.displayUrl,
    variant?.display_url,
    variant?.displayPath,
    variant?.display_path,
    rawImageUrl
  );

  const rawVideoUrl = firstValue(
    w.videoUrl,
    w.video_url,
    variant?.videoUrl,
    variant?.video_url
  );

  const imageUrl = makeUrl(req, rawImageUrl || rawThumbnailUrl);
  const thumbnailUrl = makeUrl(req, rawThumbnailUrl || rawImageUrl);

  const downloadsThisWeek =
    w.downloadsThisWeek ??
    w.weeklyDownloads ??
    w.downloads_this_week ??
    w.week_downloads ??
    null;

  return {
    id: w.id,

    title: w.title,

    description: w.description ?? null,

    imageUrl,

    videoUrl: makeUrl(req, rawVideoUrl),

    thumbnailUrl,

    quality: w.quality ?? variant?.quality ?? "4K",

    resolution: w.resolution ?? variant?.resolution ?? "2160x3840",

    isPremium: Boolean(w.isPremium ?? w.is_premium ?? false),

    isFeatured: Boolean(w.isFeatured ?? w.is_featured ?? false),

    likes: w.likes ?? w._count?.likes ?? w._count?.wallpaperLikes ?? 0,

    favoriteCount: w.favoriteCount ?? w._count?.favorites ?? 0,

    downloadCount:
      w.downloadCount ??
      w.download_count ??
      w._count?.downloads ??
      w.downloads ??
      0,

    downloadsThisWeek: downloadsThisWeek ?? 0,

    weeklyDownloads: downloadsThisWeek ?? 0,

    isFavorite: w.isFavorite ?? false,

    createdAt: w.createdAt,

    updatedAt: w.updatedAt,

    category: w.category
      ? {
          id: w.category.id,
          name: w.category.name,
          slug: w.category.slug,

          icon: w.category.icon ?? null,

          thumbnailUrl: makeUrl(
            req,
            firstValue(
              w.category.thumbnailUrl,
              w.category.thumbnail_url,
              w.category.icon
            )
          ),
        }
      : null,
  };
};