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
          (req as Request & { query: unknown }).query =
            schemas.query.parse(req.query) as Request['query'];
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