import { z } from "zod";

// ======================================
// PARAMS
// ======================================

export const userIdParams = z.object({
    id: z.string().uuid(),
});

// ======================================
// UPDATE PROFILE
// ======================================

export const updateProfileBody = z.object({
    username: z
        .string()
        .trim()
        .min(3)
        .max(50)
        .optional(),

    bio: z
        .string()
        .trim()
        .max(500)
        .optional(),

    avatarUrl: z
        .string()
        .trim()
        .optional(),
});

// ======================================
// ADMIN UPDATE USER
// ======================================

export const updateUserBody = z.object({
    username: z
        .string()
        .trim()
        .min(3)
        .max(50)
        .optional(),

    bio: z
        .string()
        .trim()
        .max(500)
        .optional(),

    avatarUrl: z
        .string()
        .trim()
        .optional(),

    roleId: z
        .string()
        .uuid()
        .optional(),

    isPremium: z
        .coerce
        .boolean()
        .optional(),

    premiumUntil: z
        .coerce
        .date()
        .optional(),
});

// ======================================
// CHANGE USER ROLE
// ======================================

export const changeRoleBody = z.object({
    roleId: z.string().uuid(),
});

// ======================================
// PREMIUM
// ======================================

export const premiumBody = z.object({
    isPremium: z.coerce.boolean(),

    premiumUntil: z
        .coerce
        .date()
        .optional(),
});

// ======================================
// USER LIST
// ======================================

export const userListQuery = z.object({
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

    search: z
        .string()
        .trim()
        .optional(),

    roleId: z
        .string()
        .uuid()
        .optional(),

    premium: z
        .coerce
        .boolean()
        .optional(),

    provider: z
        .enum([
            "LOCAL",
            "GOOGLE",
        ])
        .optional(),
});