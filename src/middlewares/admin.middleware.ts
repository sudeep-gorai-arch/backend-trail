import { Response, NextFunction } from "express";
import { ApiError } from "../utils/ApiError";

export const adminOnly = (req: any, _res: Response, next: NextFunction) => {
  if (!req.user || req.user.role?.name !== "ADMIN") {
    return next(ApiError.forbidden("Admin access required"));
  }
  next();
};
