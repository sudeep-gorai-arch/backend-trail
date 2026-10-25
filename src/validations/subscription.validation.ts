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

export const verifyGooglePlayPurchaseBody = z.object({
  plan: z.enum(['MONTHLY', 'YEARLY', 'LIFETIME']),
  productId: z.string().trim().min(1, 'productId is required'),
  purchaseToken: z.string().trim().min(1, 'purchaseToken is required'),
  packageName: z.string().trim().min(1, 'packageName is required'),
});

/**
 * These are FlexiWalls feedback categories derived from Google's publicly
 * documented cancel survey reasons. The subscriptionsv2.cancel API cannot
 * submit user survey responses to Google Play.
 */
export const googlePlayCancellationBody = z.object({
  reason: z.enum([
    'CANCEL_SURVEY_REASON_NOT_ENOUGH_USAGE',
    'CANCEL_SURVEY_REASON_TECHNICAL_ISSUES',
    'CANCEL_SURVEY_REASON_COST_RELATED',
    'CANCEL_SURVEY_REASON_FOUND_BETTER_APP',
    'CANCEL_SURVEY_REASON_OTHERS',
  ]),
}).strict();
