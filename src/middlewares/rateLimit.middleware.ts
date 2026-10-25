import type { Request, Response, NextFunction } from 'express';

export type RateLimitPolicy = { windowMs: number; max: number };
type WindowEntry = { count: number; resetAt: number };

const windows = new Map<string, WindowEntry>();
let calls = 0;

/**
 * Best-effort, per-instance protection for sensitive routes.
 * Do not trust client-supplied user IDs or X-Forwarded-For headers as keys.
 * For multiple instances, replace with shared edge / Redis rate limiting.
 */
export const rateLimit = (scope: string, { windowMs, max }: RateLimitPolicy) =>
  (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    if (++calls % 100 === 0) {
      for (const [key, entry] of windows) {
        if (entry.resetAt <= now) windows.delete(key);
      }
    }

    const ip = String(req.ip || req.socket.remoteAddress || 'unknown');
    const key = scope + ':' + ip;
    const existing = windows.get(key);
    const entry = existing && existing.resetAt > now
      ? existing
      : { count: 0, resetAt: now + windowMs };

    entry.count += 1;
    windows.set(key, entry);

    res.setHeader('RateLimit-Limit', String(max));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    if (entry.count > max) {
      res.setHeader('Retry-After', String(Math.max(1, Math.ceil((entry.resetAt - now) / 1000))));
      res.status(429).json({ success: false, message: 'Too many requests. Please try again shortly.' });
      return;
    }
    next();
  };
