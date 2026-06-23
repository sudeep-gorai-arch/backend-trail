import { Request } from 'express';

/**
 * Turns a stored media path into an absolute URL the mobile client can fetch.
 * Already-absolute (http/https) URLs are returned unchanged — relative paths
 * like "/videos/foo.mp4" get the current host prefixed.
 */
export const absoluteUrl = (req: Request, path?: string | null): string => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path;
  const host = req.get('host') ?? 'localhost';
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${req.protocol}://${host}${normalized}`;
};
