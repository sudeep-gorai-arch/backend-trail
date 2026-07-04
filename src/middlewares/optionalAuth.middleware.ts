import { Request, Response, NextFunction } from "express";
export const optionalAuth=(_req:Request,_res:Response,next:NextFunction)=>next();
