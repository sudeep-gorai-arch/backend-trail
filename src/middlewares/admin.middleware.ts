import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

/** Use only after authenticate, which resolves the role from the database. */
export const adminOnly = (req: Request, _res: Response, next: NextFunction) => {
  if (req.user?.role?.name !== 'ADMIN') {
    return next(ApiError.forbidden('Admin access required'));
  }
  return next();
};
