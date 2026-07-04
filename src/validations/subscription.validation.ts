import { z } from 'zod';

const paidPlan = z.enum(['MONTHLY', 'QUARTERLY', 'YEARLY', 'LIFETIME']);

export const createOrderBody = z.object({
  plan: paidPlan,
});

export const verifyPaymentBody = z.object({
  plan: paidPlan,
  razorpay_order_id: z.string().trim().min(1, 'razorpay_order_id is required'),
  razorpay_payment_id: z.string().trim().min(1, 'razorpay_payment_id is required'),
  razorpay_signature: z.string().trim().min(1, 'razorpay_signature is required'),
});