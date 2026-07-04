import { z } from "zod";

// ======================================
// PARAMS
// ======================================

export const categorySlugParams = z.object({
    slug: z
        .string()
        .trim()
        .min(2)
        .max(100),
});

// ======================================
// LIST QUERY
// ======================================

export const categoryListQuery = z.object({
    active: z.coerce.boolean().optional(),

    search: z
        .string()
        .trim()
        .optional(),

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
});

// ======================================
// CREATE CATEGORY
// ======================================

export const createCategoryBody = z.object({
    name: z.string().trim().min(2).max(100),

    slug: z.string().trim().max(100).optional(),

    icon: z.string().trim().max(100).optional(),

    description: z.string().trim().max(500).optional(),

    thumbnailUrl: z.string().trim().optional(),

    coverImage: z.string().trim().optional(),

    folderName: z.string().trim().optional(),

    active: z.coerce.boolean().default(true),

    sortOrder: z.coerce.number().int().min(0).default(0),
});

// ======================================
// UPDATE CATEGORY
// ======================================

export const updateCategoryBody = z.object({
    name: z.string().trim().min(2).max(100).optional(),

    slug: z.string().trim().max(100).optional(),

    icon: z.string().trim().max(100).optional(),

    description: z.string().trim().max(500).optional(),

    thumbnailUrl: z.string().trim().optional(),

    coverImage: z.string().trim().optional(),

    active: z.coerce.boolean().optional(),

    sortOrder: z.coerce.number().int().min(0).optional(),
});

// ======================================
// CATEGORY WALLPAPERS QUERY
// ======================================

export const categoryWallpaperQuery = z.object({
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
});

export const reorderCategoryBody = z.object({
    sortOrder: z.coerce
        .number()
        .int()
        .min(0),
});