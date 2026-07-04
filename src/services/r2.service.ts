import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { randomUUID } from "crypto";
import path from "path";

import { r2 } from "../config/r2";
import { env } from "../config/env";

const getSafeExtension = (filename: string) => {
  const ext = path.extname(filename).toLowerCase();

  if ([".jpg", ".jpeg", ".png", ".webp", ".avif"].includes(ext)) {
    return ext;
  }

  return ".jpg";
};

const getPublicUrl = (key: string) => {
  const baseUrl = env.R2_PUBLIC_URL.replace(/\/$/, "");
  return `${baseUrl}/${key}`;
};

export const uploadImageToR2 = async (
  file: Express.Multer.File,
  folder = "wallpapers"
) => {
  if (!file.buffer) {
    throw new Error(
      "File buffer is missing. Make sure multer is using memoryStorage(), not diskStorage()."
    );
  }

  const ext = getSafeExtension(file.originalname);
  const key = `${folder}/${randomUUID()}${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: getPublicUrl(key),
  };
};

export const deleteFromR2 = async (key?: string | null) => {
  if (!key) return;

  await r2.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    })
  );
};