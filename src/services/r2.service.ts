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

const getKeyFromUrlOrKey = (value: string) => {
  const publicUrl = env.R2_PUBLIC_URL.replace(/\/$/, "");

  if (value.startsWith(publicUrl)) {
    return value.replace(`${publicUrl}/`, "");
  }

  try {
    const url = new URL(value);
    return url.pathname.replace(/^\//, "");
  } catch {
    return value.replace(/^\//, "");
  }
};

export const uploadBufferToR2 = async ({
  buffer,
  originalName,
  contentType,
  folder = "wallpapers",
}: {
  buffer: Buffer;
  originalName: string;
  contentType: string;
  folder?: string;
}) => {
  if (!buffer || buffer.length === 0) {
    throw new Error("File buffer is empty.");
  }

  const ext = getSafeExtension(originalName);
  const key = `${folder}/${randomUUID()}${ext}`;

  await r2.send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  return {
    key,
    url: getPublicUrl(key),
  };
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

export const deleteFromR2 = async (keyOrUrl?: string | null) => {
  if (!keyOrUrl) return;

  const key = getKeyFromUrlOrKey(keyOrUrl);

  await r2.send(
    new DeleteObjectCommand({
      Bucket: env.R2_BUCKET_NAME,
      Key: key,
    })
  );
};