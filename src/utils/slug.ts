import slugify from "slugify";
import prisma from "../config/prisma";

/**
 * Convert text to URL slug
 */
export const generateSlug = (text: string): string => {
    return slugify(text, {
        lower: true,
        strict: true,
        trim: true,
    });
};

/**
 * Generate unique slug
 *
 * Example:
 *
 * mountain
 * mountain-2
 * mountain-3
 *
 */
export const generateUniqueSlug = async (
    model:
        | "category"
        | "wallpaper"
        | "tag",

    text: string,

    excludeId?: string
): Promise<string> => {
    const baseSlug = generateSlug(text);

    let slug = baseSlug;

    let counter = 2;

    while (true) {
        let existing: any = null;

        switch (model) {
            case "category":
                existing = await prisma.category.findFirst({
                    where: {
                        slug,
                        NOT: excludeId
                            ? {
                                id: excludeId,
                            }
                            : undefined,
                    },
                    select: {
                        id: true,
                    },
                });
                break;

            case "wallpaper":
                existing = await prisma.wallpaper.findFirst({
                    where: {
                        slug,
                        NOT: excludeId
                            ? {
                                id: excludeId,
                            }
                            : undefined,
                    },
                    select: {
                        id: true,
                    },
                });
                break;

            case "tag":
                existing = await prisma.tag.findFirst({
                    where: {
                        name: slug,
                        NOT: excludeId
                            ? {
                                id: excludeId,
                            }
                            : undefined,
                    },
                    select: {
                        id: true,
                    },
                });
                break;
        }

        if (!existing) {
            return slug;
        }

        slug = `${baseSlug}-${counter}`;

        counter++;
    }
};

/**
 * Create folder-safe name
 */
export const folderName = (text: string): string => {
    return generateSlug(text).replace(/-/g, "_");
};

/**
 * Generate random filename
 */
export const randomFileName = (
    extension: string
): string => {
    const timestamp = Date.now();

    const random = Math.random()
        .toString(36)
        .substring(2, 10);

    return `${timestamp}_${random}.${extension}`;
};

/**
 * Extract filename without extension
 */
export const fileNameWithoutExtension = (
    file: string
): string => {
    return file.replace(/\.[^/.]+$/, "");
};