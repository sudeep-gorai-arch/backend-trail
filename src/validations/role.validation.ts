import { z } from "zod";

// ======================================
// PARAMS
// ======================================

export const roleIdParams = z.object({
    id: z.string().uuid(),
});

// ======================================
// CREATE ROLE
// ======================================

export const createRoleBody = z.object({
    name: z
        .string()
        .trim()
        .min(2)
        .max(50),

    description: z
        .string()
        .trim()
        .max(500)
        .optional(),
});

// ======================================
// UPDATE ROLE
// ======================================

export const updateRoleBody = z.object({
    name: z
        .string()
        .trim()
        .min(2)
        .max(50)
        .optional(),

    description: z
        .string()
        .trim()
        .max(500)
        .optional(),
});

// ======================================
// ROLE LIST
// ======================================

export const roleListQuery = z.object({
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