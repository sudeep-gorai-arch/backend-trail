import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/ApiError';

/** Catches any request that didn't match a route and forwards a 404. */
export const notFound = (req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};
