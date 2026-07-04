import path from "path";

const BASE_URL =
    process.env.APP_URL || "http://localhost:5000";

/**
 * Converts Windows paths to URL paths.
 */
const normalize = (value: string) =>
    value.replace(/\\/g, "/");

/**
 * Remove uploads prefix if exists.
 */
const stripUploads = (value: string) => {
    value = normalize(value);

    if (value.startsWith("uploads/")) {
        return value.substring(8);
    }

    return value;
};

/**
 * Build URL from relative uploads path.
 */
export const buildImageUrl = (
    relativePath: string
): string => {
    relativePath = stripUploads(relativePath);

    return `${BASE_URL}/uploads/${relativePath}`;
};

/**
 * Original Image URL
 */
export const getOriginalUrl = (
    category: string,
    fileName: string
) => {
    return buildImageUrl(
        path.join(
            category,
            "original",
            fileName
        )
    );
};

/**
 * Display Image URL
 */
export const getDisplayUrl = (
    category: string,
    fileName: string
) => {
    return buildImageUrl(
        path.join(
            category,
            "display",
            fileName
        )
    );
};

/**
 * Thumbnail URL
 */
export const getThumbnailUrl = (
    category: string,
    fileName: string
) => {
    return buildImageUrl(
        path.join(
            category,
            "thumbnail",
            fileName
        )
    );
};

/**
 * Build URL from absolute path.
 */
export const absolutePathToUrl = (
    absolutePath: string
) => {
    absolutePath = normalize(absolutePath);

    const uploadsIndex =
        absolutePath.indexOf("uploads");

    if (uploadsIndex === -1) {
        return "";
    }

    const relative =
        absolutePath.substring(uploadsIndex);

    return buildImageUrl(relative);
};

/**
 * Remove base url from image.
 */
export const getRelativeImagePath = (
    url: string
) => {
    return url.replace(`${BASE_URL}/uploads/`, "");
};

/**
 * Get filename
 */
export const getFileName = (
    url: string
) => {
    return path.basename(url);
};

/**
 * Get category folder
 */
export const getCategoryFolder = (
    url: string
) => {
    const parts =
        normalize(url).split("/");

    const uploadsIndex =
        parts.indexOf("uploads");

    if (uploadsIndex === -1) {
        return "";
    }

    return parts[uploadsIndex + 1];
};

/**
 * Returns every image variant.
 */
export const getWallpaperUrls = (
    category: string,
    fileName: string
) => ({
    original: getOriginalUrl(
        category,
        fileName
    ),

    display: getDisplayUrl(
        category,
        fileName
    ),

    thumbnail: getThumbnailUrl(
        category,
        fileName
    ),
});