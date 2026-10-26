import { createHash } from 'crypto';

/**
 * Google Play renewal order IDs change over the lifetime of a purchase token.
 * Subscription.orderId is unique and must not be overwritten with a renewal
 * order that may already be attached to another record.
 */
export const googlePlayStableOrderId = (purchaseToken: string): string =>
  `google_${createHash('sha256')
    .update(purchaseToken)
    .digest('hex')
    .slice(0, 48)}`;
