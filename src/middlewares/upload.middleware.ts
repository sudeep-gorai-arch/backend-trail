import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// ===================================================
// TEMP DIRECTORY
// ===================================================

const TEMP_DIR = path.join(process.cwd(), "uploads", "temp");

if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// ===================================================
// IMAGE FILTER
// ===================================================

const imageFilter: multer.Options["fileFilter"] = (
    _req,
    file,
    cb
) => {

    const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/jpg",
        "image/avif"
    ];

    if (allowed.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Only image files are allowed."));
    }
};

// ===================================================
// STORAGE
// ===================================================

const storage = multer.diskStorage({

    destination(_req, _file, cb) {

        cb(null, TEMP_DIR);

    },

    filename(_req, file, cb) {

        const ext = path.extname(file.originalname);

        cb(
            null,
            crypto.randomUUID() + ext
        );

    }

});

// ===================================================
// EXPORT
// ===================================================

export const upload = multer({

    storage,

    fileFilter: imageFilter,

    limits: {

        fileSize: 25 * 1024 * 1024

    }

});