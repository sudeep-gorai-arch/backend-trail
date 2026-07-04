import path from "path";

const IMAGE_EXTENSIONS = [
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
    ".avif",
];

export const getExtension = (filename: string) =>
    path.extname(filename).toLowerCase();

export const getMimeType = (filename: string) => {
    const ext = getExtension(filename);

    switch (ext) {
        case ".jpg":
        case ".jpeg":
            return "image/jpeg";

        case ".png":
            return "image/png";

        case ".webp":
            return "image/webp";

        case ".gif":
            return "image/gif";

        case ".bmp":
            return "image/bmp";

        case ".avif":
            return "image/avif";

        default:
            return "application/octet-stream";
    }
};

export const isImage = (filename: string) =>
    IMAGE_EXTENSIONS.includes(getExtension(filename));

export const isWebP = (filename: string) =>
    getExtension(filename) === ".webp";

export const isPNG = (filename: string) =>
    getExtension(filename) === ".png";

export const isJPEG = (filename: string) =>
    [".jpg", ".jpeg"].includes(getExtension(filename));