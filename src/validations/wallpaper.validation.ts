import { z } from "zod";

import { WallpaperQuality } from "@prisma/client";

// ======================================
// BOOLEAN HELPERS
// ======================================

function parseBooleanInput(
  value: unknown
): boolean | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return parseBooleanInput(value[0]);
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();

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

  return undefined;
}

const optionalBoolean = z.preprocess(
  parseBooleanInput,
  z.boolean().optional()
);

const requiredBoolean = z.preprocess(
  parseBooleanInput,
  z.boolean()
);

const defaultFalseBoolean = z.preprocess(
  (value) => {
    const parsed = parseBooleanInput(value);

    return parsed === undefined
      ? false
      : parsed;
  },
  z.boolean()
);

// ======================================
// PARAMS
// ======================================

export const wallpaperIdParams = z.object({
  id: z.string().uuid(),
});

export const wallpaperSlugParams = z.object({
  slug: z.string().trim().min(2).max(200),
});

// ======================================
// LIST QUERY
// ======================================

export const wallpaperListQuery = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20),

  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),

  search: z.string().trim().optional(),

  category: z.string().trim().optional(),

  featured: optionalBoolean,

  premium: optionalBoolean,

  active: optionalBoolean,

  quality: z.nativeEnum(WallpaperQuality).optional(),

  sort: z
    .enum([
      "latest",
      "popular",
      "downloads",
      "likes",
      "featured",
    ])
    .default("latest"),
});

// ======================================
// CREATE
// ======================================

export const createWallpaperBody = z.object({
  title: z
    .string()
    .trim()
    .min(2)
    .max(200),

  slug: z
    .string()
    .trim()
    .max(200)
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  categoryId: z.string().uuid(),

  quality: z
    .nativeEnum(WallpaperQuality)
    .default(WallpaperQuality.UHD_4K),

  isPremium: defaultFalseBoolean,

  isFeatured: defaultFalseBoolean,

  featuredOrder: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),

  tags: z.array(z.string()).default([]),
});

// ======================================
// UPDATE
// ======================================

export const updateWallpaperBody = z.object({
  title: z
    .string()
    .trim()
    .min(2)
    .max(200)
    .optional(),

  slug: z
    .string()
    .trim()
    .max(200)
    .optional(),

  description: z
    .string()
    .trim()
    .max(1000)
    .optional(),

  categoryId: z
    .string()
    .uuid()
    .optional(),

  quality: z
    .nativeEnum(WallpaperQuality)
    .optional(),

  isPremium: optionalBoolean,

  isFeatured: optionalBoolean,

  featuredOrder: z.coerce
    .number()
    .int()
    .min(0)
    .optional(),

  active: optionalBoolean,

  tags: z.array(z.string()).optional(),
});

// ======================================
// FEATURED ORDER
// ======================================

export const updateFeaturedOrderBody = z.object({
  featuredOrder: z.coerce
    .number()
    .int()
    .min(0),
});

// ======================================
// CHANGE STATUS
// ======================================

export const wallpaperStatusBody = z.object({
  active: requiredBoolean,
});

// ======================================
// DOWNLOAD
// ======================================

export const wallpaperDownloadBody = z.object({
  quality: z
    .nativeEnum(WallpaperQuality)
    .optional(),
});

// ======================================
// SEARCH
// ======================================

export const wallpaperSearchQuery = z.object({
  q: z
    .string()
    .trim()
    .min(1),

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20),

  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),
});