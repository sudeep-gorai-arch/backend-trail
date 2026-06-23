import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';

/**
 * Verifies the Bearer JWT and attaches `req.user`.
 * Reject with 401 if the header is missing/malformed or the token is invalid.
 */
export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return next(
      ApiError.unauthorized('Missing or malformed Authorization header'),
    );
  }

  const token = header.slice('Bearer '.length).trim();
  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    return next();
  } catch {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }
};
