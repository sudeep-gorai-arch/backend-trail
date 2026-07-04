import { z } from "zod";

// ======================================
// PARAMS
// ======================================

export const favoriteParams = z.object({
    wallpaperId: z.string().uuid(),
});

// ======================================
// ADD FAVORITE
// ======================================

export const addFavoriteBody = z.object({
    wallpaperId: z.string().uuid(),
});

// ======================================
// LIST FAVORITES
// ======================================

export const favoriteListQuery = z.object({
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