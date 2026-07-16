import { Prisma, WallpaperQuality } from "@prisma/client";

import prisma from "../config/prisma";

import { ApiError } from "../utils/ApiError";

import path from "path";
import sharp from "sharp";
import { createHash } from "crypto";

import { generateUniqueSlug } from "../utils/slug";

import { deleteFromR2, uploadBufferToR2 } from "./r2.service";

// ======================================================
// TYPES
// ======================================================

type WallpaperMediaTypeValue = "IMAGE" | "VIDEO";

export interface ListWallpaperParams {
  limit: number;

  offset: number;

  search?: string;

  category?: string;

  premium?: boolean;

  featured?: boolean;

  active?: boolean;

  quality?: WallpaperQuality;

  sort?:
  | "latest"
  | "popular"
  | "downloads"
  | "likes"
  | "featured"
  | "random";
}

export interface TopWeekWallpaperParams {
  limit?: number;

  category?: string;
}

export interface CreateWallpaperInput {
  title: string;

  description?: string | null;

  categoryId: string;

  mediaType?: WallpaperMediaTypeValue | string;

  quality?: WallpaperQuality;

  isPremium?: boolean | string;

  isFeatured?: boolean | string;

  tags?: string[] | string;

  durationSeconds?: number | string | null;

  videoBitrate?: number | string | null;

  videoFps?: number | string | null;
}

export interface UpdateWallpaperInput {
  title?: string;

  description?: string | null;

  categoryId?: string;

  quality?: WallpaperQuality;

  isPremium?: boolean | string;

  isFeatured?: boolean | string;

  active?: boolean | string;

  tags?: string[] | string;
}

export interface CreateWallpaperFilesInput {
  mediaType?: WallpaperMediaTypeValue | string;

  imageFile?: Express.Multer.File;

  videoFile?: Express.Multer.File;

  previewImageFile?: Express.Multer.File;

  thumbnailFile?: Express.Multer.File;
}

export interface CreateManyWallpaperFilesInput {
  imageFiles?: Express.Multer.File[];

  videoFiles?: Express.Multer.File[];

  previewImageFiles?: Express.Multer.File[];

  thumbnailFiles?: Express.Multer.File[];
}

type ProcessedImageMedia = {
  originalPath: string;

  displayPath: string;

  thumbnailPath: string;

  originalKey: string;

  displayKey: string;

  thumbnailKey: string;

  width: number;

  height: number;

  aspectRatio: number;

  originalSize: number;

  displaySize: number;

  thumbnailSize: number;

  blurHash?: string | null;

  dominantColor?: string | null;
};

type ProcessedWallpaperMedia = {
  mediaType: WallpaperMediaTypeValue;

  originalPath: string;

  displayPath: string;

  thumbnailPath: string;

  videoPath?: string | null;

  videoPreviewPath?: string | null;

  videoThumbnailPath?: string | null;

  originalName: string;

  fileName: string;

  mimeType: string;

  extension: string;

  width: number;

  height: number;

  aspectRatio: number;

  originalSize: number;

  displaySize: number;

  thumbnailSize: number;

  videoSize?: number | null;

  durationSeconds?: number | null;

  videoBitrate?: number | null;

  videoFps?: number | null;

  checksum?: string | null;

  blurHash?: string | null;

  dominantColor?: string | null;

  format: string;
};

// ======================================================
// PRISMA INCLUDE
// ======================================================

const wallpaperInclude = {
  category: true,

  wallpaperVariants: {
    orderBy: {
      type: "asc",
    },
  },

  wallpaperTags: {
    include: {
      tag: true,
    },
  },

  _count: {
    select: {
      favorites: true,
    },
  },
} satisfies Prisma.WallpaperInclude;

// ======================================================
// MAPPER
// ======================================================

const mapWallpaper = (
  wallpaper: Prisma.WallpaperGetPayload<{
    include: typeof wallpaperInclude;
  }>
) => wallpaper;

// ======================================================
// HELPERS
// ======================================================

async function getCategory(categoryId: string) {
  const category = await prisma.category.findUnique({
    where: {
      id: categoryId,
    },

    select: {
      id: true,
      name: true,
      slug: true,
      folderName: true,
    },
  });

  if (!category) {
    throw ApiError.notFound("Category not found.");
  }

  return category;
}

function buildSearchableText(
  title: string,
  description?: string | null,
  category?: string,
  tags: string[] = []
) {
  return [title, description, category, ...tags].filter(Boolean).join(" ");
}

async function incrementCategoryCount(categoryId: string) {
  await prisma.category.update({
    where: {
      id: categoryId,
    },

    data: {
      wallpaperCount: {
        increment: 1,
      },
    },
  });
}

async function decrementCategoryCount(categoryId: string) {
  await prisma.category.update({
    where: {
      id: categoryId,
    },

    data: {
      wallpaperCount: {
        decrement: 1,
      },
    },
  });
}

function toBoolean(value: unknown, fallback = false): boolean {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    if (
      normalized === "true" ||
      normalized === "1" ||
      normalized === "yes" ||
      normalized === "on"
    ) {
      return true;
    }

    if (
      normalized === "false" ||
      normalized === "0" ||
      normalized === "no" ||
      normalized === "off"
    ) {
      return false;
    }
  }

  return Boolean(value);
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  return toBoolean(value);
}

function toOptionalNumber(value: unknown): number | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  const numberValue = Number(value);

  return Number.isFinite(numberValue) ? numberValue : null;
}

function parseStringArray(value: unknown): string[] {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .flatMap((item) => parseStringArray(item))
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);

      if (Array.isArray(parsed)) {
        return parseStringArray(parsed);
      }
    } catch {
      // Not JSON, continue with comma split
    }

    return trimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [String(value).trim()].filter(Boolean);
}

function getIndexedValue(value: unknown, index: number): string | undefined {
  const values = parseStringArray(value);

  return values[index];
}

function normalizeMediaType(
  rawMediaType?: unknown,
  hasVideoFile = false
): WallpaperMediaTypeValue {
  const value = String(rawMediaType || "")
    .trim()
    .toUpperCase();

  if (value === "VIDEO") {
    return "VIDEO";
  }

  if (value === "IMAGE") {
    return "IMAGE";
  }

  return hasVideoFile ? "VIDEO" : "IMAGE";
}

function createWallpaperData(
  data: CreateWallpaperInput,
  slug: string,
  media: ProcessedWallpaperMedia,
  searchableText: string
): Prisma.WallpaperCreateInput {
  const isPremium = toBoolean(data.isPremium, false);

  const isFeatured = toBoolean(data.isFeatured, false);

  return {
    title: data.title.trim(),

    slug,

    description: data.description,

    category: {
      connect: {
        id: data.categoryId,
      },
    },

    mediaType: media.mediaType,

    originalPath: media.originalPath,

    displayPath: media.displayPath,

    thumbnailPath: media.thumbnailPath,

    videoPath: media.videoPath,

    videoPreviewPath: media.videoPreviewPath,

    videoThumbnailPath: media.videoThumbnailPath,

    durationSeconds: media.durationSeconds,

    videoBitrate: media.videoBitrate,

    videoFps: media.videoFps,

    originalName: media.originalName,

    fileName: media.fileName,

    mimeType: media.mimeType,

    extension: media.extension,

    width: media.width,

    height: media.height,

    aspectRatio: media.aspectRatio,

    originalSize: media.originalSize,

    displaySize: media.displaySize,

    thumbnailSize: media.thumbnailSize,

    videoSize: media.videoSize,

    quality: data.quality ?? WallpaperQuality.UHD_4K,

    format: media.format,

    checksum: media.checksum,

    blurHash: media.blurHash,

    dominantColor: media.dominantColor,

    searchableText,

    isPremium,

    isFeatured,

    featuredAt: isFeatured ? new Date() : null,

    status: "READY",
  };
}

function toVariantFormat(extensionOrMimeType?: string | null) {
  const value = String(extensionOrMimeType || "")
    .trim()
    .toLowerCase();

  if (value.includes("png")) return "PNG";
  if (value.includes("avif")) return "AVIF";
  if (value.includes("jpg") || value.includes("jpeg")) return "JPG";
  if (value.includes("mp4")) return "MP4";
  if (value.includes("webm")) return "WEBM";
  if (value.includes("mov") || value.includes("quicktime")) return "MOV";
  if (value.includes("m4v")) return "M4V";

  return "WEBP";
}

async function createWallpaperVariants(
  wallpaperId: string,
  data: {
    mediaType: WallpaperMediaTypeValue;

    originalPath: string;

    displayPath: string;

    thumbnailPath: string;

    videoPath?: string | null;

    videoPreviewPath?: string | null;

    videoThumbnailPath?: string | null;

    width: number;

    height: number;

    originalSize: number;

    displaySize: number;

    thumbnailSize: number;

    videoSize?: number | null;

    extension?: string;

    mimeType?: string;
  }
) {
  const displayWidth = Math.min(data.width, 1440);
  const displayHeight = Math.round((displayWidth * data.height) / data.width);

  const thumbnailWidth = Math.min(data.width, 400);
  const thumbnailHeight = Math.round((thumbnailWidth * data.height) / data.width);

  const variants: Prisma.WallpaperVariantCreateManyInput[] = [
    {
      wallpaperId,

      type: "ORIGINAL",

      url: data.originalPath,

      width: data.width,

      height: data.height,

      size: data.originalSize,

      format: toVariantFormat(data.extension) as any,

      compressionQuality: data.mediaType === "VIDEO" ? 100 : 95,

      isDefault: false,
    },

    {
      wallpaperId,

      type: "DISPLAY",

      url: data.displayPath,

      width: displayWidth,

      height: displayHeight,

      size: data.displaySize,

      format: "WEBP" as any,

      compressionQuality: 82,

      isDefault: data.mediaType === "IMAGE",
    },

    {
      wallpaperId,

      type: "THUMBNAIL",

      url: data.thumbnailPath,

      width: thumbnailWidth,

      height: thumbnailHeight,

      size: data.thumbnailSize,

      format: "WEBP" as any,

      compressionQuality: 65,

      isDefault: false,
    },
  ];

  if (data.mediaType === "VIDEO" && data.videoPath) {
    variants.push({
      wallpaperId,

      type: "VIDEO" as any,

      url: data.videoPath,

      width: data.width,

      height: data.height,

      size: data.videoSize ?? data.originalSize,

      format: toVariantFormat(data.mimeType || data.extension) as any,

      compressionQuality: 100,

      isDefault: true,
    });
  }

  if (data.mediaType === "VIDEO" && data.videoPreviewPath) {
    variants.push({
      wallpaperId,

      type: "VIDEO_PREVIEW" as any,

      url: data.videoPreviewPath,

      width: displayWidth,

      height: displayHeight,

      size: data.displaySize,

      format: "WEBP" as any,

      compressionQuality: 82,

      isDefault: false,
    });
  }

  if (data.mediaType === "VIDEO" && data.videoThumbnailPath) {
    variants.push({
      wallpaperId,

      type: "VIDEO_THUMBNAIL" as any,

      url: data.videoThumbnailPath,

      width: thumbnailWidth,

      height: thumbnailHeight,

      size: data.thumbnailSize,

      format: "WEBP" as any,

      compressionQuality: 65,

      isDefault: false,
    });
  }

  await prisma.wallpaperVariant.createMany({
    data: variants,
  });
}

async function syncWallpaperTags(wallpaperId: string, rawTags: string[] | string = []) {
  const tags = parseStringArray(rawTags);

  if (!tags.length) {
    return;
  }

  for (const value of tags) {
    const name = value.trim();

    if (!name) {
      continue;
    }

    const tag = await prisma.tag.upsert({
      where: {
        name,
      },

      update: {},

      create: {
        name,
      },
    });

    await prisma.wallpaperTag.upsert({
      where: {
        wallpaperId_tagId: {
          wallpaperId,
          tagId: tag.id,
        },
      },

      update: {},

      create: {
        wallpaperId,
        tagId: tag.id,
      },
    });
  }
}

async function removeWallpaperTags(wallpaperId: string) {
  await prisma.wallpaperTag.deleteMany({
    where: {
      wallpaperId,
    },
  });
}

async function deleteWallpaperFiles(wallpaper: {
  originalPath?: string | null;
  displayPath?: string | null;
  thumbnailPath?: string | null;
  videoPath?: string | null;
  videoPreviewPath?: string | null;
  videoThumbnailPath?: string | null;
  variantPaths?: Array<string | null | undefined>;
}) {
  const files = [
    wallpaper.originalPath,
    wallpaper.displayPath,
    wallpaper.thumbnailPath,
    wallpaper.videoPath,
    wallpaper.videoPreviewPath,
    wallpaper.videoThumbnailPath,
    ...(wallpaper.variantPaths || []),
  ];

  const uniqueFiles = Array.from(
    new Set(
      files
        .map((file) => String(file || "").trim())
        .filter(Boolean)
    )
  );

  await Promise.all(
    uniqueFiles.map(async (file) => {
      try {
        await deleteFromR2(file);
      } catch {
        // Ignore delete failures so DB delete does not fail
      }
    })
  );
}

function buildChecksum(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function safeFolderName(value?: string | null) {
  return (
    String(value || "uncategorized")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-_]+/g, "-")
      .replace(/^-+|-+$/g, "") || "uncategorized"
  );
}

function getExtension(filename: string, mimetype?: string) {
  const ext = path.extname(filename || "").replace(".", "").toLowerCase();

  if (ext) return ext;

  const mime = String(mimetype || "").toLowerCase();

  if (mime.includes("png")) return "png";
  if (mime.includes("webp")) return "webp";
  if (mime.includes("avif")) return "avif";
  if (mime.includes("jpeg") || mime.includes("jpg")) return "jpg";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime")) return "mov";
  if (mime.includes("m4v")) return "m4v";

  return "jpg";
}

function isVideoFile(file?: Express.Multer.File) {
  return String(file?.mimetype || "")
    .toLowerCase()
    .startsWith("video/");
}

async function buildGeneratedPreviewImageBuffer() {
  return sharp({
    create: {
      width: 1080,
      height: 1920,
      channels: 4,
      background: {
        r: 15,
        g: 15,
        b: 16,
        alpha: 1,
      },
    },
  })
    .webp({
      quality: 82,
      effort: 6,
    })
    .toBuffer();
}

async function processWallpaperForR2(
  file: Express.Multer.File,
  categoryFolder: string,
  slug: string,
  folders = {
    original: "originals",
    display: "display",
    thumbnail: "thumbnails",
  }
): Promise<ProcessedImageMedia> {
  if (!file.buffer || file.buffer.length === 0) {
    throw ApiError.badRequest("Uploaded wallpaper file buffer is empty.");
  }

  const metadata = await sharp(file.buffer).rotate().metadata();

  const width = metadata.width ?? 0;
  const height = metadata.height ?? 0;

  if (!width || !height) {
    throw ApiError.badRequest("Invalid wallpaper image.");
  }

  const displayBuffer = await sharp(file.buffer)
    .rotate()
    .resize({
      width: 1440,
      withoutEnlargement: true,
    })
    .webp({
      quality: 82,
      effort: 6,
    })
    .toBuffer();

  const thumbnailBuffer = await sharp(file.buffer)
    .rotate()
    .resize(400, 400, {
      fit: "cover",
      position: "centre",
    })
    .webp({
      quality: 65,
      effort: 6,
    })
    .toBuffer();

  const originalUpload = await uploadBufferToR2({
    buffer: file.buffer,
    originalName:
      file.originalname || `${slug}.${getExtension(file.originalname, file.mimetype)}`,
    contentType: file.mimetype || "application/octet-stream",
    folder: `${folders.original}/${categoryFolder}`,
  });

  const displayUpload = await uploadBufferToR2({
    buffer: displayBuffer,
    originalName: `${slug}-display.webp`,
    contentType: "image/webp",
    folder: `${folders.display}/${categoryFolder}`,
  });

  const thumbnailUpload = await uploadBufferToR2({
    buffer: thumbnailBuffer,
    originalName: `${slug}-thumbnail.webp`,
    contentType: "image/webp",
    folder: `${folders.thumbnail}/${categoryFolder}`,
  });

  return {
    originalPath: originalUpload.url,
    displayPath: displayUpload.url,
    thumbnailPath: thumbnailUpload.url,
    originalKey: originalUpload.key,
    displayKey: displayUpload.key,
    thumbnailKey: thumbnailUpload.key,
    width,
    height,
    aspectRatio: width / height,
    originalSize: file.size || file.buffer.length,
    displaySize: displayBuffer.length,
    thumbnailSize: thumbnailBuffer.length,
    blurHash: null,
    dominantColor: null,
  };
}

async function processGeneratedPreviewForR2(
  categoryFolder: string,
  slug: string
): Promise<ProcessedImageMedia> {
  const previewBuffer = await buildGeneratedPreviewImageBuffer();

  const file = {
    fieldname: "previewImage",
    originalname: `${slug}-preview.webp`,
    encoding: "7bit",
    mimetype: "image/webp",
    size: previewBuffer.length,
    buffer: previewBuffer,
  } as Express.Multer.File;

  return processWallpaperForR2(file, categoryFolder, slug, {
    original: "video-previews/originals",
    display: "video-previews/display",
    thumbnail: "video-previews/thumbnails",
  });
}

async function uploadVideoToR2(
  file: Express.Multer.File,
  categoryFolder: string,
  slug: string
) {
  if (!file.buffer || file.buffer.length === 0) {
    throw ApiError.badRequest("Uploaded video file buffer is empty.");
  }

  const extension = getExtension(file.originalname, file.mimetype);

  const upload = await uploadBufferToR2({
    buffer: file.buffer,
    originalName: `${slug}.${extension}`,
    contentType: file.mimetype || "application/octet-stream",
    folder: `videos/${categoryFolder}`,
  });

  return {
    url: upload.url,
    key: upload.key,
    extension,
  };
}

function normalizeCreateFiles(
  fileOrFiles: Express.Multer.File | CreateWallpaperFilesInput,
  data: CreateWallpaperInput
): Required<Pick<CreateWallpaperFilesInput, "mediaType">> &
  Omit<CreateWallpaperFilesInput, "mediaType"> {
  if ("buffer" in fileOrFiles) {
    return {
      mediaType: "IMAGE",
      imageFile: fileOrFiles,
      videoFile: undefined,
      previewImageFile: undefined,
      thumbnailFile: undefined,
    };
  }

  const mediaType = normalizeMediaType(
    fileOrFiles.mediaType || data.mediaType,
    Boolean(fileOrFiles.videoFile)
  );

  return {
    mediaType,
    imageFile: fileOrFiles.imageFile,
    videoFile: fileOrFiles.videoFile,
    previewImageFile: fileOrFiles.previewImageFile,
    thumbnailFile: fileOrFiles.thumbnailFile,
  };
}

async function createImageWallpaper(
  file: Express.Multer.File,
  data: CreateWallpaperInput
) {
  const category = await getCategory(data.categoryId);

  const slug = await generateUniqueSlug("wallpaper", data.title);

  if (!file.buffer || file.buffer.length === 0) {
    throw ApiError.badRequest("Uploaded wallpaper file buffer is empty.");
  }

  if (isVideoFile(file)) {
    throw ApiError.badRequest("Image wallpaper upload received a video file.");
  }

  const checksum = buildChecksum(file.buffer);

  const duplicate = await prisma.wallpaper.findUnique({
    where: {
      checksum,
    },
  });

  if (duplicate) {
    throw ApiError.conflict("Wallpaper already exists.");
  }

  const categoryFolder = safeFolderName(
    category.folderName || category.slug || category.name
  );

  const originalExtension = getExtension(file.originalname, file.mimetype);

  const image = await processWallpaperForR2(file, categoryFolder, slug);

  const tags = parseStringArray(data.tags);

  const searchableText = buildSearchableText(
    data.title,
    data.description,
    category.name,
    tags
  );

  const originalFileName = image.originalKey.split("/").pop() || file.originalname;

  const media: ProcessedWallpaperMedia = {
    mediaType: "IMAGE",

    originalPath: image.originalPath,

    displayPath: image.displayPath,

    thumbnailPath: image.thumbnailPath,

    videoPath: null,

    videoPreviewPath: null,

    videoThumbnailPath: null,

    originalName: file.originalname,

    fileName: originalFileName,

    mimeType: file.mimetype,

    extension: originalExtension,

    width: image.width,

    height: image.height,

    aspectRatio: image.aspectRatio,

    originalSize: image.originalSize,

    displaySize: image.displaySize,

    thumbnailSize: image.thumbnailSize,

    videoSize: null,

    durationSeconds: null,

    videoBitrate: null,

    videoFps: null,

    checksum,

    blurHash: image.blurHash,

    dominantColor: image.dominantColor,

    format: "webp",
  };

  const wallpaper = await prisma.wallpaper.create({
    data: createWallpaperData(data, slug, media, searchableText),

    include: wallpaperInclude,
  });

  await createWallpaperVariants(wallpaper.id, {
    mediaType: "IMAGE",

    originalPath: media.originalPath,

    displayPath: media.displayPath,

    thumbnailPath: media.thumbnailPath,

    width: wallpaper.width,

    height: wallpaper.height,

    originalSize: wallpaper.originalSize,

    displaySize: wallpaper.displaySize,

    thumbnailSize: wallpaper.thumbnailSize,

    extension: originalExtension,

    mimeType: file.mimetype,
  });

  await syncWallpaperTags(wallpaper.id, tags);

  await incrementCategoryCount(category.id);

  return mapWallpaper(wallpaper);
}

async function createVideoWallpaper(
  files: CreateWallpaperFilesInput,
  data: CreateWallpaperInput
) {
  const videoFile = files.videoFile;

  if (!videoFile) {
    throw ApiError.badRequest("Wallpaper video is required.");
  }

  if (!isVideoFile(videoFile)) {
    throw ApiError.badRequest("Video wallpaper upload received a non-video file.");
  }

  const category = await getCategory(data.categoryId);

  const slug = await generateUniqueSlug("wallpaper", data.title);

  if (!videoFile.buffer || videoFile.buffer.length === 0) {
    throw ApiError.badRequest("Uploaded video file buffer is empty.");
  }

  const checksum = buildChecksum(videoFile.buffer);

  const duplicate = await prisma.wallpaper.findUnique({
    where: {
      checksum,
    },
  });

  if (duplicate) {
    throw ApiError.conflict("Video wallpaper already exists.");
  }

  const categoryFolder = safeFolderName(
    category.folderName || category.slug || category.name
  );

  const videoUpload = await uploadVideoToR2(videoFile, categoryFolder, slug);

  const previewSourceFile =
    files.previewImageFile || files.thumbnailFile || files.imageFile;

  const preview = previewSourceFile
    ? await processWallpaperForR2(previewSourceFile, categoryFolder, slug, {
      original: "video-previews/originals",
      display: "video-previews/display",
      thumbnail: "video-previews/thumbnails",
    })
    : await processGeneratedPreviewForR2(categoryFolder, slug);

  const tags = parseStringArray(data.tags);

  const searchableText = buildSearchableText(
    data.title,
    data.description,
    category.name,
    [...tags, "video", "live wallpaper"]
  );

  const originalFileName =
    videoUpload.key.split("/").pop() || videoFile.originalname;

  const extension = videoUpload.extension;

  const media: ProcessedWallpaperMedia = {
    mediaType: "VIDEO",

    originalPath: preview.originalPath,

    displayPath: preview.displayPath,

    thumbnailPath: preview.thumbnailPath,

    videoPath: videoUpload.url,

    videoPreviewPath: preview.displayPath,

    videoThumbnailPath: preview.thumbnailPath,

    originalName: videoFile.originalname,

    fileName: originalFileName,

    mimeType: videoFile.mimetype,

    extension,

    width: preview.width,

    height: preview.height,

    aspectRatio: preview.aspectRatio,

    originalSize: videoFile.size || videoFile.buffer.length,

    displaySize: preview.displaySize,

    thumbnailSize: preview.thumbnailSize,

    videoSize: videoFile.size || videoFile.buffer.length,

    durationSeconds: toOptionalNumber(data.durationSeconds),

    videoBitrate: toOptionalNumber(data.videoBitrate),

    videoFps: toOptionalNumber(data.videoFps),

    checksum,

    blurHash: preview.blurHash,

    dominantColor: preview.dominantColor,

    format: extension,
  };

  const wallpaper = await prisma.wallpaper.create({
    data: createWallpaperData(data, slug, media, searchableText),

    include: wallpaperInclude,
  });

  await createWallpaperVariants(wallpaper.id, {
    mediaType: "VIDEO",

    originalPath: media.originalPath,

    displayPath: media.displayPath,

    thumbnailPath: media.thumbnailPath,

    videoPath: media.videoPath,

    videoPreviewPath: media.videoPreviewPath,

    videoThumbnailPath: media.videoThumbnailPath,

    width: wallpaper.width,

    height: wallpaper.height,

    originalSize: wallpaper.originalSize,

    displaySize: wallpaper.displaySize,

    thumbnailSize: wallpaper.thumbnailSize,

    videoSize: wallpaper.videoSize,

    extension,

    mimeType: videoFile.mimetype,
  });

  await syncWallpaperTags(wallpaper.id, tags);

  await incrementCategoryCount(category.id);

  return mapWallpaper(wallpaper);
}

// ======================================================
// SERVICE
// ======================================================

export const wallpaperService = {
  async list({
    limit,
    offset,
    search,
    category,
    premium,
    featured,
    active = true,
    quality,
    sort,
  }: ListWallpaperParams) {
    const where: Prisma.WallpaperWhereInput = {
      deletedAt: null,
      active,
    };

    sort = "random";

    if (search) {
      where.OR = [
        {
          title: {
            contains: search,
            mode: "insensitive",
          },
        },
        {
          searchableText: {
            contains: search,
            mode: "insensitive",
          },
        },
      ];
    }

    if (category) {
      where.category = {
        OR: [
          {
            slug: category,
          },
          {
            name: {
              equals: category,
              mode: "insensitive",
            },
          },
        ],
      };
    }

    if (premium !== undefined) {
      where.isPremium = premium;
    }

    if (featured !== undefined) {
      where.isFeatured = featured;
    }

    if (quality !== undefined) {
      where.quality = quality;
    }

    console.log("Sort =", sort);

    // =====================================================
    // RANDOM SORT
    // =====================================================
    if (sort === "random") {
      const ids = await prisma.wallpaper.findMany({
        where,
        select: {
          id: true,
        },
      });

      // Fisher-Yates Shuffle
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }

      const selectedIds = ids
        .slice(offset, offset + limit)
        .map(item => item.id);

      const items = await prisma.wallpaper.findMany({
        where: {
          id: {
            in: selectedIds,
          },
        },
        include: wallpaperInclude,
      });

      // Preserve shuffled order
      const itemMap = new Map(items.map(item => [item.id, item]));

      const orderedItems = selectedIds
        .map(id => itemMap.get(id))
        .filter(
          (
            item
          ): item is Prisma.WallpaperGetPayload<{
            include: typeof wallpaperInclude;
          }> => item !== undefined
        );

      return {
        items: orderedItems.map(mapWallpaper),
        total: ids.length,
      };
    }

    // =====================================================
    // NORMAL SORTS
    // =====================================================
    const orderBy: Prisma.WallpaperOrderByWithRelationInput[] =
      sort === "popular"
        ? [
          {
            downloadCount: "desc",
          },
          {
            likeCount: "desc",
          },
          {
            createdAt: "desc",
          },
        ]
        : sort === "downloads"
          ? [
            {
              downloadCount: "desc",
            },
            {
              createdAt: "desc",
            },
          ]
          : sort === "likes"
            ? [
              {
                likeCount: "desc",
              },
              {
                createdAt: "desc",
              },
            ]
            : sort === "featured"
              ? [
                {
                  featuredOrder: "asc",
                },
                {
                  featuredAt: "desc",
                },
                {
                  createdAt: "desc",
                },
              ]
              : [
                {
                  featuredOrder: "asc",
                },
                {
                  createdAt: "desc",
                },
              ];

    const [items, total] = await Promise.all([
      prisma.wallpaper.findMany({
        where,
        include: wallpaperInclude,
        orderBy,
        skip: offset,
        take: limit,
      }),

      prisma.wallpaper.count({
        where,
      }),
    ]);

    return {
      items: items.map(mapWallpaper),
      total,
    };
  },

  async getById(id: string) {
    const wallpaper = await prisma.wallpaper.findUnique({
      where: {
        id,
      },

      include: wallpaperInclude,
    });

    if (!wallpaper) {
      throw ApiError.notFound("Wallpaper not found.");
    }

    return mapWallpaper(wallpaper);
  },

  async getBySlug(slug: string) {
    const wallpaper = await prisma.wallpaper.findUnique({
      where: {
        slug,
      },

      include: wallpaperInclude,
    });

    if (!wallpaper) {
      throw ApiError.notFound("Wallpaper not found.");
    }

    return mapWallpaper(wallpaper);
  },

  async getFeatured(limit = 10) {
    const wallpapers = await prisma.wallpaper.findMany({
      where: {
        active: true,

        deletedAt: null,

        status: "READY",

        isFeatured: true,
      },

      include: wallpaperInclude,

      orderBy: [
        {
          featuredOrder: "asc",
        },
        {
          featuredAt: "desc",
        },
      ],

      take: limit,
    });

    return wallpapers.map(mapWallpaper);
  },

  async getTrending(limit = 20) {
    const wallpapers = await prisma.wallpaper.findMany({
      where: {
        active: true,

        deletedAt: null,

        status: "READY",
      },

      include: wallpaperInclude,

      orderBy: [
        {
          downloadCount: "desc",
        },
        {
          likeCount: "desc",
        },
        {
          createdAt: "desc",
        },
      ],

      take: limit,
    });

    return wallpapers.map(mapWallpaper);
  },

  async getTopWeek({ limit = 10, category }: TopWeekWallpaperParams = {}) {
    const safeLimit = Math.min(Math.max(Number(limit) || 10, 1), 50);

    const selectedCategory = String(category || "").trim();

    const since = new Date();
    since.setDate(since.getDate() - 7);

    const wallpaperWhere: Prisma.WallpaperWhereInput = {
      active: true,

      deletedAt: null,

      status: "READY",
    };

    if (selectedCategory && selectedCategory.toLowerCase() !== "all") {
      wallpaperWhere.category = {
        OR: [
          {
            slug: selectedCategory,
          },
          {
            name: {
              equals: selectedCategory,
              mode: "insensitive",
            },
          },
        ],
      };
    }

    const downloadGroups = await prisma.download.groupBy({
      by: ["wallpaperId"],

      where: {
        createdAt: {
          gte: since,
        },

        wallpaper: {
          is: wallpaperWhere,
        },
      },

      _count: {
        wallpaperId: true,
      },
    });

    const topDownloadGroups = downloadGroups
      .sort((a, b) => b._count.wallpaperId - a._count.wallpaperId)
      .slice(0, safeLimit);

    if (!topDownloadGroups.length) {
      return [];
    }

    const weeklyDownloadCountByWallpaperId = new Map(
      topDownloadGroups.map((item) => [
        item.wallpaperId,
        item._count.wallpaperId,
      ])
    );

    const wallpapers = await prisma.wallpaper.findMany({
      where: {
        id: {
          in: topDownloadGroups.map((item) => item.wallpaperId),
        },
      },

      include: wallpaperInclude,
    });

    const wallpaperById = new Map(
      wallpapers.map((wallpaper) => [wallpaper.id, wallpaper])
    );

    const topWallpapers: Array<
      ReturnType<typeof mapWallpaper> & {
        downloadsThisWeek: number;
        weeklyDownloads: number;
      }
    > = [];

    for (const item of topDownloadGroups) {
      const wallpaper = wallpaperById.get(item.wallpaperId);

      if (!wallpaper) {
        continue;
      }

      const weeklyDownloads =
        weeklyDownloadCountByWallpaperId.get(item.wallpaperId) || 0;

      topWallpapers.push({
        ...mapWallpaper(wallpaper),

        downloadsThisWeek: weeklyDownloads,

        weeklyDownloads,
      });
    }

    return topWallpapers;
  },

  async getPremium(limit = 20) {
    const wallpapers = await prisma.wallpaper.findMany({
      where: {
        active: true,

        deletedAt: null,

        status: "READY",

        isPremium: true,
      },

      include: wallpaperInclude,

      orderBy: {
        createdAt: "desc",
      },

      take: limit,
    });

    return wallpapers.map(mapWallpaper);
  },

  async getByCategory(slug: string, limit: number, offset: number) {
    const category = await prisma.category.findUnique({
      where: {
        slug,
      },
    });

    if (!category) {
      throw ApiError.notFound("Category not found.");
    }

    const where: Prisma.WallpaperWhereInput = {
      categoryId: category.id,

      active: true,

      deletedAt: null,

      status: "READY",
    };

    const [items, total] = await Promise.all([
      prisma.wallpaper.findMany({
        where,

        include: wallpaperInclude,

        orderBy: {
          createdAt: "desc",
        },

        skip: offset,

        take: limit,
      }),

      prisma.wallpaper.count({
        where,
      }),
    ]);

    return {
      category,

      items: items.map(mapWallpaper),

      total,
    };
  },

  async create(
    fileOrFiles: Express.Multer.File | CreateWallpaperFilesInput,
    data: CreateWallpaperInput
  ) {
    const files = normalizeCreateFiles(fileOrFiles, data);

    if (files.mediaType === "VIDEO") {
      return createVideoWallpaper(files, {
        ...data,
        mediaType: "VIDEO",
      });
    }

    if (!files.imageFile) {
      throw ApiError.badRequest("Wallpaper image is required.");
    }

    return createImageWallpaper(files.imageFile, {
      ...data,
      mediaType: "IMAGE",
    });
  },

  async createMany(
    filesOrInput: Express.Multer.File[] | CreateManyWallpaperFilesInput,
    body: Omit<CreateWallpaperInput, "title"> & {
      titles?: string[] | string;
      descriptions?: string[] | string;
    }
  ) {
    const wallpapers = [];

    if (Array.isArray(filesOrInput)) {
      for (let i = 0; i < filesOrInput.length; i++) {
        wallpapers.push(
          await this.create(filesOrInput[i], {
            title: getIndexedValue(body.titles, i) ?? filesOrInput[i].originalname,

            description: getIndexedValue(body.descriptions, i) ?? null,

            categoryId: body.categoryId,

            mediaType: "IMAGE",

            quality: body.quality,

            isPremium: body.isPremium,

            isFeatured: body.isFeatured,

            tags: body.tags,
          })
        );
      }

      return wallpapers;
    }

    const imageFiles = filesOrInput.imageFiles || [];
    const videoFiles = filesOrInput.videoFiles || [];
    const previewImageFiles = filesOrInput.previewImageFiles || [];
    const thumbnailFiles = filesOrInput.thumbnailFiles || [];

    let titleIndex = 0;

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];

      wallpapers.push(
        await this.create(
          {
            mediaType: "IMAGE",
            imageFile: file,
          },
          {
            title: getIndexedValue(body.titles, titleIndex) ?? file.originalname,

            description: getIndexedValue(body.descriptions, titleIndex) ?? null,

            categoryId: body.categoryId,

            mediaType: "IMAGE",

            quality: body.quality,

            isPremium: body.isPremium,

            isFeatured: body.isFeatured,

            tags: body.tags,
          }
        )
      );

      titleIndex++;
    }

    for (let i = 0; i < videoFiles.length; i++) {
      const file = videoFiles[i];

      wallpapers.push(
        await this.create(
          {
            mediaType: "VIDEO",
            videoFile: file,
            previewImageFile: previewImageFiles[i],
            thumbnailFile: thumbnailFiles[i],
          },
          {
            title: getIndexedValue(body.titles, titleIndex) ?? file.originalname,

            description: getIndexedValue(body.descriptions, titleIndex) ?? null,

            categoryId: body.categoryId,

            mediaType: "VIDEO",

            quality: body.quality,

            isPremium: body.isPremium,

            isFeatured: body.isFeatured,

            tags: body.tags,
          }
        )
      );

      titleIndex++;
    }

    return wallpapers;
  },

  async update(id: string, data: UpdateWallpaperInput) {
    const existing = await prisma.wallpaper.findUnique({
      where: {
        id,
      },

      include: {
        category: true,

        wallpaperTags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!existing) {
      throw ApiError.notFound("Wallpaper not found.");
    }

    const categoryChanged = !!data.categoryId && data.categoryId !== existing.categoryId;

    const category = categoryChanged
      ? await getCategory(data.categoryId!)
      : {
        id: existing.category.id,
        name: existing.category.name,
        slug: existing.category.slug,
        folderName: existing.category.folderName,
      };

    if (categoryChanged) {
      await decrementCategoryCount(existing.categoryId);

      await incrementCategoryCount(category.id);
    }

    const title = data.title ?? existing.title;

    const description = data.description ?? existing.description;

    const tags =
      data.tags !== undefined
        ? parseStringArray(data.tags)
        : existing.wallpaperTags.map((tag) => tag.tag.name);

    const searchableText = buildSearchableText(
      title,
      description,
      category.name,
      tags
    );

    const active = toOptionalBoolean(data.active);

    const isPremium = toOptionalBoolean(data.isPremium);

    const isFeatured = toOptionalBoolean(data.isFeatured);

    const updateData: Prisma.WallpaperUpdateInput = {
      title,

      description,

      searchableText,

      quality: data.quality,

      active,

      isPremium,

      isFeatured,

      featuredAt:
        isFeatured === undefined
          ? undefined
          : isFeatured
            ? new Date()
            : null,
    };

    if (data.title && data.title !== existing.title) {
      updateData.slug = await generateUniqueSlug("wallpaper", data.title, existing.id);
    }

    if (categoryChanged) {
      updateData.category = {
        connect: {
          id: category.id,
        },
      };
    }

    await prisma.wallpaper.update({
      where: {
        id,
      },

      data: updateData,

      include: wallpaperInclude,
    });

    if (data.tags !== undefined) {
      await removeWallpaperTags(id);

      await syncWallpaperTags(id, tags);
    }

    await this.refreshCacheVersion(id);

    return this.getById(id);
  },

  async delete(id: string) {
    const wallpaper = await prisma.wallpaper.findUnique({
      where: {
        id,
      },

      include: {
        wallpaperVariants: {
          select: {
            url: true,
          },
        },
      },
    });

    if (!wallpaper) {
      throw ApiError.notFound("Wallpaper not found.");
    }

    await prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        active: false,

        deletedAt: new Date(),
      },
    });

    await deleteWallpaperFiles({
      originalPath: wallpaper.originalPath,

      displayPath: wallpaper.displayPath,

      thumbnailPath: wallpaper.thumbnailPath,

      videoPath: wallpaper.videoPath,

      videoPreviewPath: wallpaper.videoPreviewPath,

      videoThumbnailPath: wallpaper.videoThumbnailPath,

      variantPaths: wallpaper.wallpaperVariants.map((variant) => variant.url),
    });

    await prisma.wallpaperVariant.deleteMany({
      where: {
        wallpaperId: id,
      },
    });

    await prisma.wallpaperTag.deleteMany({
      where: {
        wallpaperId: id,
      },
    });

    await decrementCategoryCount(wallpaper.categoryId);

    return {
      deleted: true,
    };
  },

  async search(query: string, limit = 20, offset = 0) {
    const where: Prisma.WallpaperWhereInput = {
      active: true,

      deletedAt: null,

      status: "READY",

      OR: [
        {
          title: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          searchableText: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          wallpaperTags: {
            some: {
              tag: {
                name: {
                  contains: query,
                  mode: "insensitive",
                },
              },
            },
          },
        },
      ],
    };

    const [items, total] = await Promise.all([
      prisma.wallpaper.findMany({
        where,

        include: wallpaperInclude,

        skip: offset,

        take: limit,

        orderBy: {
          createdAt: "desc",
        },
      }),

      prisma.wallpaper.count({
        where,
      }),
    ]);

    return {
      items: items.map(mapWallpaper),

      total,
    };
  },

  async related(wallpaperId: string, limit = 10) {
    const wallpaper = await prisma.wallpaper.findUnique({
      where: {
        id: wallpaperId,
      },
    });

    if (!wallpaper) {
      throw ApiError.notFound("Wallpaper not found.");
    }

    const wallpapers = await prisma.wallpaper.findMany({
      where: {
        id: {
          not: wallpaper.id,
        },

        categoryId: wallpaper.categoryId,

        active: true,

        deletedAt: null,

        status: "READY",
      },

      include: wallpaperInclude,

      take: limit,

      orderBy: {
        createdAt: "desc",
      },
    });

    return wallpapers.map(mapWallpaper);
  },

  async toggleFeatured(id: string) {
    const wallpaper = await this.getById(id);

    return prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        isFeatured: !wallpaper.isFeatured,

        featuredAt: wallpaper.isFeatured ? null : new Date(),
      },

      include: wallpaperInclude,
    });
  },

  async togglePremium(id: string) {
    const wallpaper = await this.getById(id);

    return prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        isPremium: !wallpaper.isPremium,
      },

      include: wallpaperInclude,
    });
  },

  async toggleActive(id: string) {
    const wallpaper = await this.getById(id);

    return prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        active: !wallpaper.active,
      },

      include: wallpaperInclude,
    });
  },

  async incrementViews(id: string) {
    await prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        viewCount: {
          increment: 1,
        },
      },
    });
  },

  async incrementDownloads(id: string) {
    await prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });
  },

  async refreshCacheVersion(id: string) {
    await prisma.wallpaper.update({
      where: {
        id,
      },

      data: {
        cacheVersion: {
          increment: 1,
        },
      },
    });
  },
};