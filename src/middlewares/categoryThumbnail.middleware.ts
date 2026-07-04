import { Request, Response, NextFunction } from "express";
import sharp from "sharp";

export async function compressCategoryThumbnail(
  req: Request,
  _res: Response,
  next: NextFunction
) {
  try {
    if (!req.file) {
      return next();
    }

    if (!req.file.buffer || req.file.buffer.length === 0) {
      return next(new Error("Uploaded thumbnail file buffer is empty."));
    }

    const compressedBuffer = await sharp(req.file.buffer)
      .resize(400, 400, {
        fit: "cover",
        position: "centre",
      })
      .webp({
        quality: 72,
        effort: 6,
      })
      .toBuffer();

    req.file.buffer = compressedBuffer;
    req.file.mimetype = "image/webp";

    req.file.originalname = req.file.originalname.replace(
      /\.[^/.]+$/,
      ".webp"
    );

    return next();
  } catch (err) {
    return next(err);
  }
}