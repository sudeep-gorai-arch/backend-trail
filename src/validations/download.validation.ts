import { z } from "zod";

// ======================================
// DOWNLOAD WALLPAPER
// ======================================

export const createDownloadBody = z.object({
    wallpaperId: z.string().uuid(),

    quality: z
        .enum([
            "HD",
            "FULL_HD",
            "QHD",
            "UHD_4K",
            "UHD_8K",
            "ORIGINAL",
        ])
        .default("UHD_4K"),
});

// ======================================
// DOWNLOAD HISTORY
// ======================================

export const downloadHistoryQuery = z.object({
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

    from: z
        .string()
        .datetime()
        .optional(),

    to: z
        .string()
        .datetime()
        .optional(),
});

// ======================================
// DOWNLOAD DETAILS
// ======================================

export const downloadParams = z.object({
    id: z.string().uuid(),
});

// ======================================
// DOWNLOAD BY WALLPAPER
// ======================================

export const wallpaperDownloadParams = z.object({
    wallpaperId: z.string().uuid(),
});