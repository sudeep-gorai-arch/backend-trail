import { Request, Response, NextFunction } from "express";
import sharp from "sharp";
import fs from "fs";
import path from "path";

const CATEGORY_DIR = path.join(
    process.cwd(),
    "storage",
    "categories"
);

if (!fs.existsSync(CATEGORY_DIR)) {
    fs.mkdirSync(CATEGORY_DIR, { recursive: true });
}

export async function compressCategoryThumbnail(
    req: Request,
    _res: Response,
    next: NextFunction
) {
    try {
        if (!req.file) return next();

        const filename =
            Date.now() + "_" + Math.random().toString(36).slice(2) + ".webp";

        const output = path.join(CATEGORY_DIR, filename);

        await sharp(req.file.path)
            .resize(400, 400, {
                fit: "cover",
                position: "centre",
            })
            .webp({
                quality: 72,
                effort: 6,
            })
            .toFile(output);

        fs.unlinkSync(req.file.path);

        req.body.thumbnailUrl = `categories/${filename}`;

        next();
    } catch (err) {
        next(err);
    }
}