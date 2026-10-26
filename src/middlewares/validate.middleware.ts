import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { ApiError } from "../utils/ApiError";

interface ValidationSchemas {
  body?: z.ZodObject;
  query?: z.ZodObject;
  params?: z.ZodObject;
}

export const validate =
  (schemas: ValidationSchemas) =>
    (req: Request, _res: Response, next: NextFunction) => {
      try {
        if (schemas.body) {
          const parsed = schemas.body.parse(req.body);

          req.body = {
            ...req.body,
            ...parsed,
          };
        }

        if (schemas.query) {
          // Express exposes req.query through a prototype getter in some versions;
          // assign an own property instead of writing to that getter.
          Object.defineProperty(req, 'query', {
            configurable: true,
            enumerable: true,
            writable: true,
            value: schemas.query.parse(req.query),
          });
        }

        if (schemas.params) {
          (req as Request & { params: unknown }).params =
            schemas.params.parse(req.params) as Request['params'];
        }

        next();
      } catch (error) {
        if (error instanceof ZodError) {
          return next(
            ApiError.badRequest(
              "Validation failed",
              z.flattenError(error).fieldErrors
            )
          );
        }

        next(error);
      }
    };