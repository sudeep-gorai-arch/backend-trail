import { Request } from "express";
import { absoluteUrl } from "./url";

type AnyObj = Record<string, any>;

const makeUrl = (req: Request, value?: string | null) => {
  if (!value) return null;
  return absoluteUrl(req, value);
};

const getVariant = (w: AnyObj) => {
  if (!Array.isArray(w.wallpaperVariants)) return null;

  return (
    w.wallpaperVariants.find((v: AnyObj) => v.type === "ORIGINAL") ||
    w.wallpaperVariants.find((v: AnyObj) => v.quality === "4K") ||
    w.wallpaperVariants[0] ||
    null
  );
};

export type WallpaperRow = AnyObj;

export const toCategoryDTO = (req: Request, c: AnyObj) => ({
  id: c.id,
  name: c.name,
  slug: c.slug,
  icon: c.icon ?? null,
  thumbnailUrl: makeUrl(req, c.thumbnailUrl ?? c.thumbnail_url ?? c.icon),
  createdAt: c.createdAt,
  count: c.count ?? c._count?.wallpapers ?? 0,
});

export const toWallpaperDTO = (req: Request, w: WallpaperRow) => {
  const variant = getVariant(w);

  const imageUrl =
    w.imageUrl ??
    w.image_url ??
    w.url ??
    variant?.imageUrl ??
    variant?.image_url ??
    variant?.url ??
    null;

  const thumbnailUrl =
    w.thumbnailUrl ??
    w.thumbnail_url ??
    variant?.thumbnailUrl ??
    variant?.thumbnail_url ??
    w.previewUrl ??
    null;

  const videoUrl =
    w.videoUrl ??
    w.video_url ??
    variant?.videoUrl ??
    variant?.video_url ??
    null;

  return {
    id: w.id,
    title: w.title,
    description: w.description ?? null,

    imageUrl: makeUrl(req, imageUrl),
    videoUrl: makeUrl(req, videoUrl),
    thumbnailUrl: makeUrl(req, thumbnailUrl),

    quality: w.quality ?? variant?.quality ?? "4K",
    resolution: w.resolution ?? variant?.resolution ?? "2160x3840",

    isPremium: Boolean(w.isPremium ?? w.is_premium ?? false),
    isFeatured: Boolean(w.isFeatured ?? w.is_featured ?? false),

    likes: w.likes ?? w._count?.likes ?? w._count?.wallpaperLikes ?? 0,
    favoriteCount: w.favoriteCount ?? w._count?.favorites ?? 0,
    downloadCount: w.downloadCount ?? w.download_count ?? 0,

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
            w.category.thumbnailUrl ??
              w.category.thumbnail_url ??
              w.category.icon
          ),
        }
      : null,
  };
};