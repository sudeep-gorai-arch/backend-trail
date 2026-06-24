import multer, { FileFilterCallback } from "multer";
import type { Request } from "express";

/**
 * Use memory storage because files will be uploaded directly to Cloudflare R2.
 * Do not use local disk storage on Render for permanent uploads.
 */
const storage = multer.memoryStorage();

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: FileFilterCallback
) => {
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
    return;
  }

  cb(
    new Error(
      "Only JPG, JPEG, PNG and WEBP images are allowed"
    )
  );
};

export const upload = multer({
  storage,

  limits: {
    fileSize: 10 * 1024 * 1024,
  },

  fileFilter,
});