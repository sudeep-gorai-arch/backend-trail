import { Request, Response, NextFunction } from 'express';
import { AnyZodObject, ZodError } from 'zod';
import { ApiError } from '../utils/ApiError';

interface Schemas {
  body?: AnyZodObject;
  query?: AnyZodObject;
  params?: AnyZodObject;
}

/**
 * Validates and coerces request parts against the provided zod schemas.
 * Parsed (and type-coerced) values replace the originals so controllers read
 * clean data — e.g. `?limit=10` becomes the number 10.
 */
export const validate =
  (schemas: Schemas) =>
  (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      // query/params are read-only getters in some setups, so cast to assign
      if (schemas.query) (req as unknown as { query: unknown }).query = schemas.query.parse(req.query);
      if (schemas.params) (req as unknown as { params: unknown }).params = schemas.params.parse(req.params);
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return next(
          ApiError.badRequest('Validation failed', err.flatten().fieldErrors),
        );
      }
      return next(err);
    }
  };
