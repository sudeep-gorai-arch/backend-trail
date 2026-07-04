import { Request } from 'express';

/**
 * Turns a stored media path into an absolute URL the mobile client can fetch.
 * Already-absolute (http/https) URLs are returned unchanged — relative paths
 * like "/videos/foo.mp4" get the current host prefixed.
 */
export const absoluteUrl = (
  req: Request,
  filePath?: string | null
): string => {
  if (!filePath) return "";

  if (/^https?:\/\//i.test(filePath)) {
    return filePath;
  }

  const host = req.get("host") ?? "localhost";

  const normalized = filePath
    .replace(/\\/g, "/")
    .replace(/^\/+/, "");

  return `${req.protocol}://${host}/storage/${normalized}`;
};
