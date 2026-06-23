import { Request, Response } from 'express';
import { likeService } from '../services/like.service';
import { sendSuccess } from '../utils/ApiResponse';

export const likeController = {
 async like(req:Request,res:Response){sendSuccess(res, await likeService.like(req.user!.id, req.params.id));},
 async unlike(req:Request,res:Response){sendSuccess(res, await likeService.unlike(req.user!.id, req.params.id));},
 async status(req:Request,res:Response){sendSuccess(res, await likeService.status(req.user!.id, req.params.id));}
};
