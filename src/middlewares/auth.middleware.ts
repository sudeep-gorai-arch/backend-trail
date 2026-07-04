import { Request, Response, NextFunction } from "express";

import { verifyToken } from "../utils/jwt";

import { ApiError } from "../utils/ApiError";

/*
----------------------------------------
LOGIN REQUIRED
----------------------------------------
*/

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    return next(
      ApiError.unauthorized(
        "Missing or malformed Authorization header"
      )
    );
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verifyToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    return next();
  } catch {
    return next(
      ApiError.unauthorized(
        "Invalid or expired token"
      )
    );
  }
};

/*
----------------------------------------
OPTIONAL LOGIN
----------------------------------------
*/

export const optionalAuthenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;

  // No token → Guest
  if (!header) {
    return next();
  }

  // Malformed header
  if (!header.startsWith("Bearer ")) {
    return next(
      ApiError.unauthorized(
        "Malformed Authorization header"
      )
    );
  }

  const token = header.slice("Bearer ".length).trim();

  try {
    const payload = verifyToken(token);

    req.user = {
      id: payload.sub,
      email: payload.email,
    };

    return next();
  } catch {
    return next(
      ApiError.unauthorized(
        "Invalid or expired token"
      )
    );
  }
};