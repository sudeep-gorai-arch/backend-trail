import { Request, Response } from 'express';

import { subscriptionService } from '../services/subscription.service';

import {
  createOrderBody,
  verifyPaymentBody,
} from '../validations/subscription.validation';

const getUserId = (req: Request) => {
  const userId = (req as any).user?.id;

  if (!userId) {
    throw new Error('Unauthorized');
  }

  return userId;
};

export const subscriptionController = {
  async createOrder(req: Request, res: Response) {
    const userId = getUserId(req);
    const body = createOrderBody.parse(req.body);

    const order = await subscriptionService.createOrder(userId, body.plan);

    return res.status(201).json({
      success: true,
      message: 'Razorpay order created successfully.',
      data: order,
    });
  },

  async verifyPayment(req: Request, res: Response) {
    const userId = getUserId(req);
    const body = verifyPaymentBody.parse(req.body);

    const status = await subscriptionService.verify(userId, body);

    return res.status(200).json({
      success: true,
      message: 'Payment verified successfully.',
      data: status,
    });
  },

  async getStatus(req: Request, res: Response) {
    const userId = getUserId(req);

    const status = await subscriptionService.status(userId);

    return res.status(200).json({
      success: true,
      data: status,
    });
  },

  async getPlans(_req: Request, res: Response) {
    const plans = await subscriptionService.plans();

    return res.status(200).json({
      success: true,
      data: plans,
    });
  },
};