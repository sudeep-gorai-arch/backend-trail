import path from "path";

// =======================================
// ROOT PATHS
// =======================================

export const ROOT_DIR = process.cwd();

export const UPLOADS_DIR = path.join(ROOT_DIR, "uploads");

export const TEMP_DIR = path.join(UPLOADS_DIR, "temp");

export const CACHE_DIR = path.join(ROOT_DIR, ".cache");

// =======================================
// WALLPAPER FOLDERS
// =======================================

export const IMAGE_FOLDERS = {
    ORIGINAL: "original",
    DISPLAY: "display",
    THUMBNAIL: "thumbnail",
} as const;

// =======================================
// IMAGE DIMENSIONS
// =======================================

export const IMAGE_SIZES = {
    THUMBNAIL: {
        width: 400,
        height: null,
    },

    DISPLAY: {
        width: 1440,
        height: null,
    },

    HD: {
        width: 1280,
        height: 720,
    },

    FULL_HD: {
        width: 1920,
        height: 1080,
    },

    QHD: {
        width: 2560,
        height: 1440,
    },

    UHD: {
        width: 3840,
        height: 2160,
    },
} as const;

// =======================================
// WEBP QUALITY
// =======================================

export const IMAGE_QUALITY = {
    ORIGINAL: 95,

    DISPLAY: 82,

    THUMBNAIL: 65,
} as const;

// =======================================
// SHARP OPTIONS
// =======================================

export const SHARP_OPTIONS = {
    fit: "inside",

    withoutEnlargement: true,

    effort: 6,
} as const;

// =======================================
// FILE LIMITS
// =======================================

export const MAX_UPLOAD_SIZE =
    30 * 1024 * 1024;

export const MAX_CATEGORY_IMAGE_SIZE =
    5 * 1024 * 1024;

// =======================================
// SUPPORTED FORMATS
// =======================================

export const ALLOWED_IMAGE_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
] as const;

export const ALLOWED_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
] as const;

// =======================================
// CACHE
// =======================================

export const CACHE_TIME = {
    WALLPAPERS: 60 * 10,

    FEATURED: 60 * 15,

    CATEGORIES: 60 * 60,

    HOME: 60 * 5,

    SEARCH: 60 * 3,
} as const;

// =======================================
// PAGINATION
// =======================================

export const DEFAULT_PAGE_SIZE = 20;

export const MAX_PAGE_SIZE = 100;

// =======================================
// DOWNLOAD QUALITY
// =======================================

export const DOWNLOAD_TYPES = [
    "ORIGINAL",
    "DISPLAY",
    "THUMBNAIL",
] as const;

// =======================================
// IMAGE FORMATS
// =======================================

export const IMAGE_FORMAT = "webp";

// =======================================
// HASH
// =======================================

export const BLURHASH_COMPONENT_X = 4;

export const BLURHASH_COMPONENT_Y = 4;

// =======================================
// MIME TYPES
// =======================================

export const MIME_TYPES = {
    WEBP: "image/webp",

    JPEG: "image/jpeg",

    PNG: "image/png",
} as const;