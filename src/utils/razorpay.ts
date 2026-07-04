import crypto from 'crypto';

import { env } from '../config/env';

export const verifyRazorpaySignature = (
  orderId: string,
  paymentId: string,
  signature: string,
) => {
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  const expected = Buffer.from(expectedSignature);
  const received = Buffer.from(signature);

  if (expected.length !== received.length) {
    return false;
  }

  return crypto.timingSafeEqual(expected, received);
};