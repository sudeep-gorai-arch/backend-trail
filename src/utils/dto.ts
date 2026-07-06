import { Request } from "express";
import { absoluteUrl } from "./url";

type AnyObj = Record<string, any>;

const makeUrl = (req: Request, value?: string | null) => {
  if (!value) return null;

  const url = String(value).trim();

  if (!url) return null;

  return absoluteUrl(req, url);
};

const firstValue = (...values: Array<string | null | undefined>) => {
  for (const value of values) {
    if (value && String(value).trim()) {
      return String(value).trim();
    }
  }

  return null;
};

const getVariantByType = (w: AnyObj, types: string[]) => {
  if (!Array.isArray(w.wallpaperVariants)) return null;

  const upperTypes = types.map((t) => String(t).toUpperCase());

  return (
    w.wallpaperVariants.find((v: AnyObj) =>
      upperTypes.includes(String(v.type || "").toUpperCase())
    ) || null
  );
};

const getImageVariant = (w: AnyObj) => {
  if (!Array.isArray(w.wallpaperVariants)) return null;

  return (
    getVariantByType(w, ["ORIGINAL"]) ||
    getVariantByType(w, ["DISPLAY"]) ||
    getVariantByType(w, ["THUMBNAIL"]) ||
    w.wallpaperVariants.find((v: AnyObj) => v.quality === "4K") ||
    w.wallpaperVariants[0] ||
    null
  );
};

const getVideoVariant = (w: AnyObj) => {
  if (!Array.isArray(w.wallpaperVariants)) return null;

  return (
    getVariantByType(w, ["VIDEO"]) ||
    getVariantByType(w, ["ORIGINAL"]) ||
    w.wallpaperVariants.find((v: AnyObj) =>
      ["MP4", "WEBM", "MOV", "M4V"].includes(
        String(v.format || "").toUpperCase()
      )
    ) ||
    null
  );
};

const getVideoPreviewVariant = (w: AnyObj) => {
  if (!Array.isArray(w.wallpaperVariants)) return null;

  return (
    getVariantByType(w, ["VIDEO_PREVIEW"]) ||
    getVariantByType(w, ["VIDEO_THUMBNAIL"]) ||
    getVariantByType(w, ["THUMBNAIL"]) ||
    null
  );
};

const normalizeMediaType = (w: AnyObj, rawVideoUrl?: string | null) => {
  const mediaType = String(
    w.mediaType || w.media_type || (rawVideoUrl ? "VIDEO" : "IMAGE")
  ).toUpperCase();

  return mediaType === "VIDEO" ? "VIDEO" : "IMAGE";
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
  const imageVariant = getImageVariant(w);
  const videoVariant = getVideoVariant(w);
  const videoPreviewVariant = getVideoPreviewVariant(w);

  const rawVideoUrl = firstValue(
    w.videoUrl,
    w.video_url,
    w.videoPath,
    w.video_path,
    videoVariant?.videoUrl,
    videoVariant?.video_url,
    videoVariant?.url,
    videoVariant?.path
  );

  const mediaType = normalizeMediaType(w, rawVideoUrl);
  const isVideo = mediaType === "VIDEO";

  const rawVideoPreviewUrl = firstValue(
    w.videoPreviewUrl,
    w.video_preview_url,
    w.videoPreviewPath,
    w.video_preview_path,
    w.videoThumbnailUrl,
    w.video_thumbnail_url,
    w.videoThumbnailPath,
    w.video_thumbnail_path,
    videoPreviewVariant?.videoPreviewUrl,
    videoPreviewVariant?.video_preview_url,
    videoPreviewVariant?.videoThumbnailUrl,
    videoPreviewVariant?.video_thumbnail_url,
    videoPreviewVariant?.thumbnailUrl,
    videoPreviewVariant?.thumbnail_url,
    videoPreviewVariant?.url,
    videoPreviewVariant?.path
  );

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
    imageVariant?.imageUrl,
    imageVariant?.image_url,
    imageVariant?.url,
    imageVariant?.displayUrl,
    imageVariant?.display_url,
    imageVariant?.displayPath,
    imageVariant?.display_path,
    imageVariant?.originalUrl,
    imageVariant?.original_url,
    imageVariant?.originalPath,
    imageVariant?.original_path,
    imageVariant?.path
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
    w.videoThumbnailUrl,
    w.video_thumbnail_url,
    w.videoThumbnailPath,
    w.video_thumbnail_path,
    rawVideoPreviewUrl,
    imageVariant?.thumbnailUrl,
    imageVariant?.thumbnail_url,
    imageVariant?.thumbnailPath,
    imageVariant?.thumbnail_path,
    imageVariant?.previewUrl,
    imageVariant?.preview_url,
    imageVariant?.displayUrl,
    imageVariant?.display_url,
    imageVariant?.displayPath,
    imageVariant?.display_path,
    rawImageUrl
  );

  const imageUrl = makeUrl(req, rawImageUrl || rawThumbnailUrl);
  const videoUrl = makeUrl(req, rawVideoUrl);
  const videoPreviewUrl = makeUrl(req, rawVideoPreviewUrl);
  const thumbnailUrl = makeUrl(
    req,
    rawThumbnailUrl || rawVideoPreviewUrl || rawImageUrl
  );

  const downloadUrl = isVideo
    ? videoUrl || videoPreviewUrl || imageUrl
    : imageUrl || thumbnailUrl;

  const downloadsThisWeek =
    w.downloadsThisWeek ??
    w.weeklyDownloads ??
    w.downloads_this_week ??
    w.week_downloads ??
    null;

  const width = w.width ?? imageVariant?.width ?? null;
  const height = w.height ?? imageVariant?.height ?? null;

  return {
    id: w.id,

    title: w.title,

    description: w.description ?? null,

    mediaType,

    isVideo,

    imageUrl,

    videoUrl,

    videoPreviewUrl,

    thumbnailUrl,

    downloadUrl,

    quality: w.quality ?? imageVariant?.quality ?? "4K",

    resolution:
      w.resolution ??
      imageVariant?.resolution ??
      (width && height ? `${width}x${height}` : "2160x3840"),

    width,

    height,

    durationSeconds:
      w.durationSeconds ?? w.duration_seconds ?? w.videoDuration ?? null,

    videoBitrate: w.videoBitrate ?? w.video_bitrate ?? null,

    videoFps: w.videoFps ?? w.video_fps ?? null,

    mimeType: w.mimeType ?? w.mime_type ?? null,

    extension: w.extension ?? null,

    isPremium: Boolean(w.isPremium ?? w.is_premium ?? false),

    isFeatured: Boolean(w.isFeatured ?? w.is_featured ?? false),

    likes:
      w.likes ??
      w.likeCount ??
      w.like_count ??
      w._count?.likes ??
      w._count?.wallpaperLikes ??
      0,

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