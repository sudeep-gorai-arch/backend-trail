import { Request } from "express";
import { absoluteUrl } from "../url";

export const toCategoryDTO = (
    req: Request,
    category: any
) => ({
    id: category.id,

    name: category.name,

    slug: category.slug,

    icon: category.icon,

    description: category.description,

    folderName: category.folderName,

    coverImage: category.coverImage
        ? absoluteUrl(req, category.coverImage)
        : null,

    thumbnailUrl: category.thumbnailUrl
        ? absoluteUrl(req, category.thumbnailUrl)
        : null,

    wallpaperCount: category.wallpaperCount,

    sortOrder: category.sortOrder,

    active: category.active,

    createdAt: category.createdAt,

    updatedAt: category.updatedAt
});