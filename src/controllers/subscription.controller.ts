import {Request,Response} from 'express';
import {subscriptionService} from '../services/subscription.service';
import {sendSuccess} from '../utils/ApiResponse';
export const subscriptionController={
 plans:async(_req:Request,res:Response)=>sendSuccess(res,[{id:'monthly',price:49},{id:'annual',price:329}]),
 verify:async(req:Request,res:Response)=>sendSuccess(res,await subscriptionService.verify(req.user!.id,req.body)),
 status:async(req:Request,res:Response)=>sendSuccess(res,await subscriptionService.status(req.user!.id))
};
