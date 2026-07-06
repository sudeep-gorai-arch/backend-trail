import multer from "multer";

// ===================================================
// ALLOWED MIME TYPES
// ===================================================

const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
]);

const ALLOWED_VIDEO_MIME_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-m4v",
  "video/m4v",
]);

// ===================================================
// FILE FILTER
// ===================================================

const mediaFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const mimetype = String(file.mimetype || "").toLowerCase();

  if (
    ALLOWED_IMAGE_MIME_TYPES.has(mimetype) ||
    ALLOWED_VIDEO_MIME_TYPES.has(mimetype)
  ) {
    cb(null, true);
    return;
  }

  cb(
    new Error(
      "Only image files or video wallpaper files are allowed. Supported images: JPG, PNG, WEBP, AVIF. Supported videos: MP4, WEBM, MOV, M4V."
    )
  );
};

// ===================================================
// MEMORY STORAGE FOR R2 / PROCESSING
// ===================================================

const storage = multer.memoryStorage();

// ===================================================
// EXPORT
// ===================================================

export const upload = multer({
  storage,

  fileFilter: mediaFilter,

  limits: {
    fileSize: 120 * 1024 * 1024,
  },
});