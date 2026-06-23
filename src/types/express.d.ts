import 'express';

/**
 * Augments Express's Request so authenticated handlers can read `req.user`,
 * which the auth middleware attaches after verifying the JWT.
 */
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

export {};
