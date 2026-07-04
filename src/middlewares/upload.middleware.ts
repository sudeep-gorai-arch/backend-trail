import multer from "multer";

// ===================================================
// IMAGE FILTER
// ===================================================

const imageFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  const allowed = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/jpg",
    "image/avif",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed."));
  }
};

// ===================================================
// MEMORY STORAGE FOR R2
// ===================================================

const storage = multer.memoryStorage();

// ===================================================
// EXPORT
// ===================================================

export const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});