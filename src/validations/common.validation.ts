import { z } from "zod";

// ======================================
// UUID
// ======================================

export const uuidSchema = z.string().uuid();

// ======================================
// SLUG
// ======================================

export const slugSchema = z
    .string()
    .trim()
    .toLowerCase()
    .regex(
        /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
        "Invalid slug format"
    );

// ======================================
// NAME
// ======================================

export const nameSchema = z
    .string()
    .trim()
    .min(2)
    .max(100);

// ======================================
// DESCRIPTION
// ======================================

export const descriptionSchema = z
    .string()
    .trim()
    .max(1000);

// ======================================
// SEARCH
// ======================================

export const searchSchema = z
    .string()
    .trim()
    .max(100);

// ======================================
// PAGINATION
// ======================================

export const paginationQuery = z.object({
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
// SORT
// ======================================

export const sortQuery = z.object({
    sortBy: z
        .string()
        .trim()
        .optional(),

    order: z
        .enum(["asc", "desc"])
        .default("desc"),
});

// ======================================
// BOOLEAN FILTER
// ======================================

export const booleanFilter = z.coerce
    .boolean()
    .optional();

// ======================================
// DATE RANGE
// ======================================

export const dateRangeQuery = z.object({
    from: z.coerce
        .date()
        .optional(),

    to: z.coerce
        .date()
        .optional(),
}).refine(
    (data) =>
        !data.from ||
        !data.to ||
        data.to >= data.from,
    {
        message: "Invalid date range",
        path: ["to"],
    }
);

// ======================================
// UUID PARAMS
// ======================================

export const idParams = z.object({
    id: uuidSchema,
});

// ======================================
// SLUG PARAMS
// ======================================

export const slugParams = z.object({
    slug: slugSchema,
});

// ======================================
// IDS ARRAY
// ======================================

export const idsArraySchema = z.object({
    ids: z
        .array(uuidSchema)
        .min(1)
        .max(500),
});

// ======================================
// FILE NAME
// ======================================

export const fileNameSchema = z
    .string()
    .trim()
    .max(255);

// ======================================
// URL
// ======================================

export const urlSchema = z
    .string()
    .url();

// ======================================
// COLOR
// ======================================

export const hexColorSchema = z
    .string()
    .regex(
        /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,
        "Invalid hex color"
    );