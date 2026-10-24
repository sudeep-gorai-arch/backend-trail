import { Request, Response, NextFunction } from 'express';
import prisma from '../config/prisma';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/ApiError';
import { activeSessionIdentity } from '../utils/sessionIdentity';

const getBearerToken = (req: Request): string | null => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim() || null;
};

const verifyActiveSession = async (token: string) => {
  const claims = verifyToken(token);
  if (!claims.sub || !claims.email) return null;

  const session = await prisma.userSession.findUnique({
    where: { token },
    select: {
      isActive: true,
      user: {
        select: {
          id: true,
          email: true,
          role: { select: { name: true } },
        },
      },
    },
  });

  return activeSessionIdentity(claims, session);
};

// Unauthorized is distinct from a database outage. Do not turn DB errors into 401.
export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const token = getBearerToken(req);
  if (!token) {
    return next(ApiError.unauthorized('Missing or malformed Authorization header'));
  }

  let claims: ReturnType<typeof verifyToken>;
  try {
    claims = verifyToken(token);
  } catch {
    return next(ApiError.unauthorized('Invalid or expired token'));
  }

  try {
    const identity = await verifyActiveSession(token);
    if (!identity || identity.id !== claims.sub) {
      return next(ApiError.unauthorized('Session is no longer active'));
    }
    req.user = identity;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const optionalAuthenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  // Guest requests remain possible when no Authorization header is provided.
  if (!req.headers.authorization) return next();

  return authenticate(req, _res, next);
};
