/**
 * State shown in the app comes from Google Play's subscriptionPurchaseV2.
 * Cancellation stops future renewals but does not remove access before expiry.
 * Keep raw developer API responses and purchase tokens on the backend.
 */
type PlayLineItem = {
  autoRenewingPlan?: {
    autoRenewEnabled?: boolean;
    installmentDetails?: {
      pendingCancellation?: Record<string, never> | null;
    };
  } | null;
};

export type GooglePlayRenewalDetails = {
  state: string;
  autoRenewing: boolean | null;
  cancellationScheduled: boolean;
};

export const getGooglePlayRenewalDetails = (
  purchase: {
    subscriptionState?: string | null;
    lineItems?: PlayLineItem[] | null;
  } | null | undefined,
): GooglePlayRenewalDetails | null => {
  if (!purchase?.subscriptionState) return null;

  const state = String(purchase.subscriptionState);
  const items = Array.isArray(purchase.lineItems) ? purchase.lineItems : [];
  const renewalFlags = items
    .map(item => item?.autoRenewingPlan?.autoRenewEnabled)
    .filter((flag): flag is boolean => typeof flag === 'boolean');

  const autoRenewing =
    renewalFlags.length > 0 ? renewalFlags.some(Boolean) : null;

  const installmentCancellation = items.some(item =>
    item?.autoRenewingPlan?.installmentDetails?.pendingCancellation != null,
  );

  const cancellationScheduled =
    state === 'SUBSCRIPTION_STATE_CANCELED' ||
    installmentCancellation ||
    (autoRenewing === false &&
      ['SUBSCRIPTION_STATE_ACTIVE', 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD'].includes(state));

  return { state, autoRenewing, cancellationScheduled };
};
