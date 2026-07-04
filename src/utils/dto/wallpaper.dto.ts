import { Request } from "express";

import { absoluteUrl } from "../url";

export const toWallpaperDTO = (
    req: Request,
    wallpaper: any
) => ({
    id: wallpaper.id,

    title: wallpaper.title,

    slug: wallpaper.slug,

    description: wallpaper.description,

    imageUrl: absoluteUrl(req, wallpaper.displayPath),

    thumbnailUrl: absoluteUrl(req, wallpaper.thumbnailPath),

    downloadUrl: absoluteUrl(req, wallpaper.originalPath),

    originalPath: wallpaper.originalPath,

    displayPath: wallpaper.displayPath,

    thumbnailPath: wallpaper.thumbnailPath,

    originalName: wallpaper.originalName,

    fileName: wallpaper.fileName,

    mimeType: wallpaper.mimeType,

    extension: wallpaper.extension,

    width: wallpaper.width,

    height: wallpaper.height,

    resolution:
        wallpaper.resolution ||
        (
            wallpaper.width && wallpaper.height
                ? `${wallpaper.width}x${wallpaper.height}`
                : ""
        ),

    aspectRatio: wallpaper.aspectRatio,

    originalSize: wallpaper.originalSize,

    displaySize: wallpaper.displaySize,

    thumbnailSize: wallpaper.thumbnailSize,

    quality: wallpaper.quality,

    format: wallpaper.format,

    isPremium: wallpaper.isPremium,

    isFeatured: wallpaper.isFeatured,

    featuredOrder: wallpaper.featuredOrder,

    active: wallpaper.active,

    likes: wallpaper.likeCount,

    likeCount: wallpaper.likeCount,

    downloads: wallpaper.downloadCount,

    downloadCount: wallpaper.downloadCount,

    favoriteCount:
        wallpaper.favoriteCount ??
        wallpaper._count?.favorites ??
        0,

    favoritesCount:
        wallpaper.favoriteCount ??
        wallpaper._count?.favorites ??
        0,

    isFavorite:
        wallpaper.isFavorite ??
        wallpaper.favorite ??
        false,

    views: wallpaper.viewCount,

    viewCount: wallpaper.viewCount,

    dominantColor: wallpaper.dominantColor,

    blurHash: wallpaper.blurHash,

    cacheVersion: wallpaper.cacheVersion,

    status: wallpaper.status,

    createdAt: wallpaper.createdAt,

    updatedAt: wallpaper.updatedAt,

    categoryId: wallpaper.categoryId,

    category: wallpaper.category && {
        id: wallpaper.category.id,

        name: wallpaper.category.name,

        slug: wallpaper.category.slug,

        thumbnailUrl: wallpaper.category.thumbnailUrl
            ? absoluteUrl(req, wallpaper.category.thumbnailUrl)
            : null,
    },

    tags:
        wallpaper.wallpaperTags?.map((x: any) => x.tag.name) ?? [],

    variants:
        wallpaper.wallpaperVariants?.map((v: any) => ({
            type: v.type,

            url: absoluteUrl(req, v.url),

            width: v.width,

            height: v.height,

            size: v.size,

            format: v.format,

            quality: v.compressionQuality,

            isDefault: v.isDefault,
        })) ?? [],
});