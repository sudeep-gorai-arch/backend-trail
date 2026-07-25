import { createHash } from 'crypto';

import {
  PaymentStatus,
  SubscriptionPlatform,
} from '@prisma/client';

import prisma from '../config/prisma';
import { env } from '../config/env';
import { googlePlayApi } from '../config/googlePlay';
import {
  PaidSubscriptionPlan,
  SUBSCRIPTION_PLANS,
} from '../config/subscriptionPlans';
import { ApiError } from '../utils/ApiError';
import { subscriptionService } from './subscription.service';

type GooglePlayPlan = Extract<
  PaidSubscriptionPlan,
  'MONTHLY' | 'YEARLY' | 'LIFETIME'
>;

type VerifyInput = {
  plan: GooglePlayPlan;
  productId: string;
  purchaseToken: string;
  packageName: string;
};

type PurchaseSnapshot = {
  entitled: boolean;
  startDate: Date;
  endDate: Date;
  orderId: string;
  amount: number;
  currency: string;
  acknowledgementPending: boolean;
  obfuscatedAccountId?: string;
  raw: any;
};

const PRODUCT_ID_BY_PLAN: Record<GooglePlayPlan, string> = {
  MONTHLY: env.GOOGLE_PLAY_MONTHLY_PRODUCT_ID,
  YEARLY: env.GOOGLE_PLAY_YEARLY_PRODUCT_ID,
  LIFETIME: env.GOOGLE_PLAY_LIFETIME_PRODUCT_ID,
};

const PLAN_BY_PRODUCT_ID = Object.fromEntries(
  Object.entries(PRODUCT_ID_BY_PLAN).map(([plan, productId]) => [productId, plan]),
) as Record<string, GooglePlayPlan>;

const hashAccountId = (userId: string) =>
  createHash('sha256').update(userId).digest('hex');

const tokenOrderId = (purchaseToken: string) =>
  `google_${createHash('sha256')
    .update(purchaseToken)
    .digest('hex')
    .slice(0, 48)}`;

const lifetimeEndDate = (from: Date) => {
  const end = new Date(from);
  end.setFullYear(end.getFullYear() + 100);
  return end;
};

const moneyToNumber = (money: any, fallback: number) => {
  if (!money) return fallback;

  const units = Number(money.units ?? 0);
  const nanos = Number(money.nanos ?? 0);
  const value = units + nanos / 1_000_000_000;

  return Number.isFinite(value) && value >= 0 ? value : fallback;
};

const assertProductMapping = (
  plan: GooglePlayPlan,
  productId: string,
) => {
  if (PRODUCT_ID_BY_PLAN[plan] !== productId) {
    throw ApiError.badRequest('Google Play product and plan do not match.');
  }
};

const assertPackageName = (packageName: string) => {
  if (packageName !== env.GOOGLE_PLAY_PACKAGE_NAME) {
    throw ApiError.badRequest('Invalid Android package name.');
  }
};

const assertAccountOwner = (userId: string, obfuscatedAccountId?: string) => {
  if (
    obfuscatedAccountId &&
    obfuscatedAccountId !== hashAccountId(userId)
  ) {
    throw ApiError.badRequest('Google Play purchase belongs to another account.');
  }
};

const getSubscriptionSnapshot = async (
  productId: string,
  purchaseToken: string,
  selectedPlan: (typeof SUBSCRIPTION_PLANS)[GooglePlayPlan],
): Promise<PurchaseSnapshot> => {
  const purchase = await googlePlayApi.getSubscription(purchaseToken);
  const lineItem = (purchase.lineItems ?? []).find(
    (item: any) => item.productId === productId,
  );

  if (!lineItem) {
    throw ApiError.badRequest('Subscription product was not found in the purchase.');
  }

  const expiry = new Date(lineItem.expiryTime);
  const start = purchase.startTime ? new Date(purchase.startTime) : new Date();
  const state = String(purchase.subscriptionState ?? '');
  const entitledStates = new Set([
    'SUBSCRIPTION_STATE_ACTIVE',
    'SUBSCRIPTION_STATE_IN_GRACE_PERIOD',
    'SUBSCRIPTION_STATE_CANCELED',
  ]);
  const entitled =
    entitledStates.has(state) &&
    Number.isFinite(expiry.getTime()) &&
    expiry > new Date();

  const price = lineItem.autoRenewingPlan?.recurringPrice;

  return {
    entitled,
    startDate: start,
    endDate: expiry,
    orderId:
      lineItem.latestSuccessfulOrderId ??
      purchase.latestOrderId ??
      tokenOrderId(purchaseToken),
    amount: moneyToNumber(price, selectedPlan.amount),
    currency: price?.currencyCode ?? selectedPlan.currency,
    acknowledgementPending:
      purchase.acknowledgementState ===
      'ACKNOWLEDGEMENT_STATE_PENDING',
    obfuscatedAccountId:
      purchase.externalAccountIdentifiers?.obfuscatedExternalAccountId,
    raw: purchase,
  };
};

const getOneTimeSnapshot = async (
  productId: string,
  purchaseToken: string,
  selectedPlan: (typeof SUBSCRIPTION_PLANS)[GooglePlayPlan],
): Promise<PurchaseSnapshot> => {
  const purchase = await googlePlayApi.getOneTimeProduct(purchaseToken);
  const lineItem = (purchase.productLineItem ?? []).find(
    (item: any) => item.productId === productId,
  );

  if (!lineItem) {
    throw ApiError.badRequest('One-time product was not found in the purchase.');
  }

  const start = purchase.purchaseCompletionTime
    ? new Date(purchase.purchaseCompletionTime)
    : new Date();

  return {
    entitled:
      purchase.purchaseStateContext?.purchaseState === 'PURCHASED' &&
      lineItem.productOfferDetails?.consumptionState !==
        'CONSUMPTION_STATE_CONSUMED',
    startDate: start,
    endDate: lifetimeEndDate(start),
    orderId: purchase.orderId ?? tokenOrderId(purchaseToken),
    amount: selectedPlan.amount,
    currency: selectedPlan.currency,
    acknowledgementPending:
      purchase.acknowledgementState === 'ACKNOWLEDGEMENT_STATE_PENDING',
    obfuscatedAccountId: purchase.obfuscatedExternalAccountId,
    raw: purchase,
  };
};

const fetchSnapshot = async (
  plan: GooglePlayPlan,
  productId: string,
  purchaseToken: string,
) => {
  const selectedPlan = SUBSCRIPTION_PLANS[plan];

  return plan === 'LIFETIME'
    ? getOneTimeSnapshot(productId, purchaseToken, selectedPlan)
    : getSubscriptionSnapshot(productId, purchaseToken, selectedPlan);
};

const acknowledge = async (
  plan: GooglePlayPlan,
  productId: string,
  purchaseToken: string,
) => {
  if (plan === 'LIFETIME') {
    await googlePlayApi.acknowledgeOneTimeProduct(productId, purchaseToken);
  } else {
    await googlePlayApi.acknowledgeSubscription(productId, purchaseToken);
  }
};

const deactivatePurchase = async (userId: string, purchaseToken: string) => {
  await prisma.subscription.updateMany({
    where: { userId, purchaseToken },
    data: { active: false },
  });

  const anotherActive = await prisma.subscription.findFirst({
    where: {
      userId,
      active: true,
      status: PaymentStatus.PAID,
      endDate: { gt: new Date() },
    },
    orderBy: { endDate: 'desc' },
  });

  await prisma.user.update({
    where: { id: userId },
    data: {
      isPremium: Boolean(anotherActive),
      premiumUntil: anotherActive?.endDate ?? null,
    },
  });
};

const persistEntitlement = async (
  userId: string,
  input: VerifyInput,
  snapshot: PurchaseSnapshot,
) => {
  const existingToken = await prisma.subscription.findUnique({
    where: { purchaseToken: input.purchaseToken },
  });

  if (existingToken && existingToken.userId !== userId) {
    throw ApiError.conflict('Google Play purchase was already claimed.');
  }

  const duplicateOrder = await prisma.payment.findUnique({
    where: { orderId: snapshot.orderId },
  });

  if (duplicateOrder && duplicateOrder.userId !== userId) {
    throw ApiError.conflict('Google Play order was already claimed.');
  }

  await prisma.$transaction(async tx => {
    const activeLifetime = await tx.subscription.findFirst({
      where: {
        userId,
        active: true,
        plan: 'LIFETIME',
        status: PaymentStatus.PAID,
        endDate: { gt: new Date() },
        NOT: { purchaseToken: input.purchaseToken },
      },
    });

    const shouldActivate = input.plan === 'LIFETIME' || !activeLifetime;

    if (shouldActivate) {
      await tx.subscription.updateMany({
        where: {
          userId,
          active: true,
          NOT: { purchaseToken: input.purchaseToken },
        },
        data: { active: false },
      });
    }

    const subscription = existingToken
      ? await tx.subscription.update({
          where: { id: existingToken.id },
          data: {
            plan: input.plan,
            platform: SubscriptionPlatform.GOOGLE,
            orderId: snapshot.orderId,
            transactionId: snapshot.orderId,
            amount: snapshot.amount,
            currency: snapshot.currency,
            status: PaymentStatus.PAID,
            startDate: snapshot.startDate,
            endDate: snapshot.endDate,
            active: shouldActivate,
          },
        })
      : await tx.subscription.create({
          data: {
            userId,
            plan: input.plan,
            platform: SubscriptionPlatform.GOOGLE,
            orderId: snapshot.orderId,
            purchaseToken: input.purchaseToken,
            transactionId: snapshot.orderId,
            amount: snapshot.amount,
            currency: snapshot.currency,
            status: PaymentStatus.PAID,
            startDate: snapshot.startDate,
            endDate: snapshot.endDate,
            active: shouldActivate,
          },
        });

    const notes = {
      plan: input.plan,
      productId: input.productId,
      purchaseToken: input.purchaseToken,
      googlePlayPurchase: snapshot.raw,
    } as any;

    if (duplicateOrder) {
      await tx.payment.update({
        where: { id: duplicateOrder.id },
        data: {
          subscriptionId: subscription.id,
          platform: SubscriptionPlatform.GOOGLE,
          amount: snapshot.amount,
          currency: snapshot.currency,
          status: PaymentStatus.PAID,
          paidAt: snapshot.startDate,
          notes,
        },
      });
    } else {
      await tx.payment.create({
        data: {
          userId,
          subscriptionId: subscription.id,
          orderId: snapshot.orderId,
          paymentId: snapshot.orderId,
          platform: SubscriptionPlatform.GOOGLE,
          amount: snapshot.amount,
          currency: snapshot.currency,
          status: PaymentStatus.PAID,
          receipt: input.purchaseToken,
          paidAt: snapshot.startDate,
          notes,
        },
      });
    }

    const strongestEntitlement = await tx.subscription.findFirst({
      where: {
        userId,
        active: true,
        status: PaymentStatus.PAID,
        endDate: { gt: new Date() },
      },
      orderBy: { endDate: 'desc' },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        isPremium: Boolean(strongestEntitlement),
        premiumUntil: strongestEntitlement?.endDate ?? null,
      },
    });
  });
};

export const googlePlayBillingService = {
  async verifyAndActivate(userId: string, input: VerifyInput) {
    assertPackageName(input.packageName);
    assertProductMapping(input.plan, input.productId);

    const snapshot = await fetchSnapshot(
      input.plan,
      input.productId,
      input.purchaseToken,
    );

    assertAccountOwner(userId, snapshot.obfuscatedAccountId);

    if (!snapshot.entitled) {
      throw ApiError.badRequest(
        'Google Play purchase is pending, expired, cancelled or refunded.',
      );
    }

    await persistEntitlement(userId, input, snapshot);

    if (snapshot.acknowledgementPending) {
      await acknowledge(input.plan, input.productId, input.purchaseToken);
    }

    return subscriptionService.status(userId);
  },

  async syncActivePurchase(userId: string) {
    const active = await prisma.subscription.findFirst({
      where: {
        userId,
        active: true,
        platform: SubscriptionPlatform.GOOGLE,
        purchaseToken: { not: null },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!active?.purchaseToken) return;

    const plan = active.plan as GooglePlayPlan;
    const productId = PRODUCT_ID_BY_PLAN[plan];

    if (!productId) return;

    try {
      const snapshot = await fetchSnapshot(
        plan,
        productId,
        active.purchaseToken,
      );

      assertAccountOwner(userId, snapshot.obfuscatedAccountId);

      if (!snapshot.entitled) {
        await deactivatePurchase(userId, active.purchaseToken);
        return;
      }

      await persistEntitlement(
        userId,
        {
          plan,
          productId,
          purchaseToken: active.purchaseToken,
          packageName: env.GOOGLE_PLAY_PACKAGE_NAME,
        },
        snapshot,
      );

      if (snapshot.acknowledgementPending) {
        await acknowledge(plan, productId, active.purchaseToken);
      }
    } catch (error: any) {
      // Do not remove valid local access on transient Google API/network errors.
      // Permanent expiry/refund states are handled through snapshot.entitled=false.
      if (error?.statusCode && error.statusCode < 500) {
        console.warn('GOOGLE PLAY SYNC WARNING', error.message);
      } else {
        console.error('GOOGLE PLAY SYNC ERROR', error);
      }
    }
  },

  planForProductId(productId: string) {
    return PLAN_BY_PRODUCT_ID[productId] ?? null;
  },
};
