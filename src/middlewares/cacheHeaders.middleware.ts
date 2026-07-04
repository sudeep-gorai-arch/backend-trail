import { Request, Response, NextFunction } from "express";
export const cacheHeaders=(_req:Request,res:Response,next:NextFunction)=>{
  res.setHeader("Cache-Control","public,max-age=31536000,immutable");
  next();
};
