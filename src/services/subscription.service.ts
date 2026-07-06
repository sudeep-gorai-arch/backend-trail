import { randomUUID } from 'crypto';

import {
  PaymentStatus,
  SubscriptionPlatform,
} from '@prisma/client';

import prisma from '../config/prisma';

import { env } from '../config/env';

import { razorpay } from '../config/razorpay';

import {
  PaidSubscriptionPlan,
  SUBSCRIPTION_PLANS,
} from '../config/subscriptionPlans';

import { ApiError } from '../utils/ApiError';

import { verifyRazorpaySignature } from '../utils/razorpay';

type SubscriptionPlanCode = 'FREE' | PaidSubscriptionPlan;

const PAID_PLANS: PaidSubscriptionPlan[] = [
  'MONTHLY',
  'YEARLY',
  'LIFETIME',
];

const toJsonSafe = (value: unknown) => JSON.parse(JSON.stringify(value));

const toRecord = (value: unknown): Record<string, any> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return value as Record<string, any>;
};

const assertPaidPlan = (plan: string): PaidSubscriptionPlan => {
  if (!PAID_PLANS.includes(plan as PaidSubscriptionPlan)) {
    throw ApiError.badRequest('Invalid subscription plan.');
  }

  return plan as PaidSubscriptionPlan;
};

const getEndDate = (
  plan: PaidSubscriptionPlan,
  fromDate = new Date(),
) => {
  const end = new Date(fromDate);

  switch (plan) {
    case 'MONTHLY':
      end.setMonth(end.getMonth() + 1);
      break;

    case 'YEARLY':
      end.setFullYear(end.getFullYear() + 1);
      break;

    case 'LIFETIME':
      end.setFullYear(end.getFullYear() + 100);
      break;

    default:
      end.setMonth(end.getMonth() + 1);
  }

  return end;
};

export function getSubscriptionPlan(plan: string) {
  const paidPlan = assertPaidPlan(plan);

  return SUBSCRIPTION_PLANS[paidPlan];
}

const extractRazorpaySubscriptionId = (
  subscription?: any,
  payment?: any,
): string | null => {
  const paymentNotes = toRecord(payment?.notes);

  const value =
    subscription?.razorpaySubscriptionId ??
    subscription?.razorpay_subscription_id ??
    subscription?.subscriptionId ??
    subscription?.purchaseToken ??
    paymentNotes?.razorpaySubscriptionId ??
    paymentNotes?.razorpay_subscription_id ??
    paymentNotes?.subscriptionId ??
    paymentNotes?.purchaseToken ??
    paymentNotes?.razorpaySubscription?.id ??
    null;

  if (!value) return null;

  const text = String(value).trim();

  return text || null;
};

const getCancellationFromPayment = (payment?: any) => {
  const notes = toRecord(payment?.notes);
  const cancellation = toRecord(notes.cancellation);

  return {
    cancelAtCycleEnd: Boolean(
      cancellation.cancelAtCycleEnd ?? cancellation.cancel_at_cycle_end,
    ),
    cancelledAt: cancellation.cancelledAt ?? cancellation.cancelled_at ?? null,
    razorpaySubscriptionId:
      cancellation.razorpaySubscriptionId ??
      cancellation.razorpay_subscription_id ??
      null,
  };
};

const mapSubscription = (subscription: any, payment?: any) => {
  if (!subscription) return null;

  const cancellation = getCancellationFromPayment(payment);

  return {
    id: subscription.id,
    plan: subscription.plan,
    platform: subscription.platform,
    orderId: subscription.orderId,
    razorpayOrderId: subscription.orderId,
    paymentId: subscription.paymentId,
    razorpayPaymentId: subscription.paymentId,
    razorpaySubscriptionId: extractRazorpaySubscriptionId(subscription, payment),
    purchaseToken: subscription.purchaseToken ?? null,
    amount: subscription.amount,
    currency: subscription.currency,
    status: subscription.status,
    startDate: subscription.startDate,
    endDate: subscription.endDate,
    active: subscription.active,
    cancelAtCycleEnd: cancellation.cancelAtCycleEnd,
    cancelledAt: cancellation.cancelledAt,
    createdAt: subscription.createdAt,
  };
};

const mapPayment = (payment: any) => {
  if (!payment) return null;

  return {
    id: payment.id,
    orderId: payment.orderId,
    razorpayOrderId: payment.orderId,
    paymentId: payment.paymentId,
    razorpayPaymentId: payment.paymentId,
    amount: payment.amount,
    currency: payment.currency,
    status: payment.status,
    receipt: payment.receipt,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    notes: payment.notes,
  };
};

export const subscriptionService = {
  async createOrder(userId: string, plan: string) {
    const paidPlan = assertPaidPlan(plan);
    const selectedPlan = getSubscriptionPlan(paidPlan);

    const amountInPaise = Math.round(selectedPlan.amount * 100);

    const receipt = `SUB${Date.now().toString().slice(-8)}${randomUUID()
      .replace(/-/g, '')
      .slice(0, 8)}`;

    const order = await razorpay.orders.create({
      amount: amountInPaise,
      currency: selectedPlan.currency,
      receipt,
      notes: {
        userId,
        plan: paidPlan,
      },
    });

    await prisma.payment.create({
      data: {
        userId,
        orderId: order.id,
        platform: SubscriptionPlatform.RAZORPAY,
        amount: Number(order.amount) / 100,
        currency: String(order.currency),
        receipt: String(order.receipt ?? receipt),
        status: PaymentStatus.PENDING,
        notes: {
          plan: paidPlan,
          razorpayOrder: toJsonSafe(order),
        },
      },
    });

    return {
      keyId: env.RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: Number(order.amount),
      currency: String(order.currency),
      receipt: String(order.receipt ?? receipt),
      plan: paidPlan,
      title: selectedPlan.title,
    };
  },

  async verify(
    userId: string,
    input: {
      plan: string;
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    },
  ) {
    const paidPlan = assertPaidPlan(input.plan);
    const selectedPlan = getSubscriptionPlan(paidPlan);

    const paymentRecord = await prisma.payment.findUnique({
      where: {
        orderId: input.razorpay_order_id,
      },
    });

    if (!paymentRecord) {
      throw ApiError.badRequest('Payment order not found.');
    }

    if (paymentRecord.userId !== userId) {
      throw ApiError.badRequest('Invalid payment owner.');
    }

    if (
      paymentRecord.status === PaymentStatus.PAID &&
      paymentRecord.paymentId === input.razorpay_payment_id
    ) {
      return subscriptionService.status(userId);
    }

    const duplicatePayment = await prisma.payment.findUnique({
      where: {
        paymentId: input.razorpay_payment_id,
      },
    });

    if (
      duplicatePayment &&
      duplicatePayment.orderId !== input.razorpay_order_id
    ) {
      throw ApiError.conflict('Payment already processed.');
    }

    const order = await razorpay.orders.fetch(input.razorpay_order_id);
    const orderNotes = (order as any)?.notes ?? {};

    if (orderNotes.userId && orderNotes.userId !== userId) {
      throw ApiError.badRequest('Invalid payment owner.');
    }

    if (orderNotes.plan && orderNotes.plan !== paidPlan) {
      throw ApiError.badRequest('Payment plan mismatch.');
    }

    const verified = verifyRazorpaySignature(
      input.razorpay_order_id,
      input.razorpay_payment_id,
      input.razorpay_signature,
    );

    if (!verified) {
      throw ApiError.badRequest('Invalid payment signature.');
    }

    const razorpayPayment = await razorpay.payments.fetch(
      input.razorpay_payment_id,
    );

    if ((razorpayPayment as any).status !== 'captured') {
      throw ApiError.badRequest('Payment has not been captured.');
    }

    if (
      Number((razorpayPayment as any).amount) !==
      selectedPlan.amount * 100
    ) {
      throw ApiError.badRequest('Payment amount mismatch.');
    }

    if (String((razorpayPayment as any).currency) !== selectedPlan.currency) {
      throw ApiError.badRequest('Invalid payment currency.');
    }

    if ((razorpayPayment as any).order_id !== input.razorpay_order_id) {
      throw ApiError.badRequest('Order verification failed.');
    }

    const now = new Date();

    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        premiumUntil: true,
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    const renewalBaseDate =
      user.premiumUntil && user.premiumUntil > now ? user.premiumUntil : now;

    const startDate = now;
    const endDate = getEndDate(paidPlan, renewalBaseDate);

    return prisma.$transaction(async tx => {
      await tx.subscription.updateMany({
        where: {
          userId,
          active: true,
        },
        data: {
          active: false,
        },
      });

      const subscription = await tx.subscription.create({
        data: {
          userId,
          plan: paidPlan,
          platform: SubscriptionPlatform.RAZORPAY,
          orderId: input.razorpay_order_id,
          paymentId: input.razorpay_payment_id,
          signature: input.razorpay_signature,
          amount: Number((razorpayPayment as any).amount) / 100,
          currency: String((razorpayPayment as any).currency),
          status: PaymentStatus.PAID,
          startDate,
          endDate,
          active: true,
        },
      });

      const payment = await tx.payment.update({
        where: {
          orderId: input.razorpay_order_id,
        },
        data: {
          subscriptionId: subscription.id,
          paymentId: input.razorpay_payment_id,
          signature: input.razorpay_signature,
          status: PaymentStatus.PAID,
          amount: Number((razorpayPayment as any).amount) / 100,
          currency: String((razorpayPayment as any).currency),
          paidAt: new Date(Number((razorpayPayment as any).created_at) * 1000),
          notes: {
            plan: paidPlan,
            razorpayOrder: toJsonSafe(order),
            razorpayPayment: toJsonSafe(razorpayPayment),
          },
        },
      });

      await tx.user.update({
        where: {
          id: userId,
        },
        data: {
          isPremium: true,
          premiumUntil: endDate,
        },
      });

      return {
        isPremium: true,
        premiumUntil: endDate,
        currentPlan: paidPlan,
        subscription: mapSubscription(subscription, payment),
        activeSubscription: mapSubscription(subscription, payment),
        latestPayment: mapPayment(payment),
      };
    });
  },

  async cancel(
    userId: string,
    input: {
      cancel_at_cycle_end?: boolean;
    } = {},
  ) {
    const cancelAtCycleEnd = input.cancel_at_cycle_end !== false;
    const now = new Date();

    const activeSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        active: true,
        status: PaymentStatus.PAID,
        endDate: {
          gt: now,
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!activeSubscription) {
      throw ApiError.notFound('No active premium subscription found.');
    }

    if (activeSubscription.plan === 'LIFETIME') {
      throw ApiError.badRequest('Lifetime plan does not have auto-renewal.');
    }

    const payment = await prisma.payment.findFirst({
      where: {
        userId,
        subscriptionId: activeSubscription.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const razorpaySubscriptionId = extractRazorpaySubscriptionId(
      activeSubscription,
      payment,
    );

    if (!razorpaySubscriptionId || !razorpaySubscriptionId.startsWith('sub_')) {
      throw ApiError.badRequest(
        'This premium purchase was created as a Razorpay order, not an auto-renewing Razorpay subscription. No autopay subscription id was found to cancel.',
      );
    }

    const razorpaySubscription = await (razorpay as any).subscriptions.cancel(
      razorpaySubscriptionId,
      {
        cancel_at_cycle_end: cancelAtCycleEnd,
      },
    );

    const cancellation = {
      cancelAtCycleEnd,
      cancelledAt: new Date().toISOString(),
      razorpaySubscriptionId,
      razorpaySubscription: toJsonSafe(razorpaySubscription),
    };

    let updatedPayment = payment;

    if (payment) {
      const existingNotes = toRecord(payment.notes);

      updatedPayment = await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          notes: {
            ...existingNotes,
            cancellation,
          },
        },
      });
    }

    const status = await subscriptionService.status(userId);

    return {
      ...status,
      activeSubscription: {
        ...(mapSubscription(activeSubscription, updatedPayment) as any),
        cancelAtCycleEnd,
        status: cancelAtCycleEnd ? 'CANCEL_SCHEDULED' : 'CANCELLED',
      },
      cancellation: {
        cancelAtCycleEnd,
        cancelledAt: cancellation.cancelledAt,
        razorpaySubscriptionId,
      },
    };
  },

  async status(userId: string) {
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        isPremium: true,
        premiumUntil: true,
        subscriptions: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
        payments: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 5,
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    const now = new Date();

    const latestSubscription = user.subscriptions[0] ?? null;

    const activeSubscription =
      user.subscriptions.find(
        subscription =>
          subscription.active &&
          subscription.status === PaymentStatus.PAID &&
          subscription.endDate > now,
      ) ?? null;

    const activePayment =
      activeSubscription
        ? user.payments.find(
            payment => payment.subscriptionId === activeSubscription.id,
          ) ?? null
        : null;

    const latestPayment = user.payments[0] ?? null;

    const premiumUntil = activeSubscription?.endDate ?? user.premiumUntil;

    const isPremium = Boolean(
      activeSubscription ||
        (user.isPremium && premiumUntil && premiumUntil > now),
    );

    if (user.isPremium !== isPremium) {
      await prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          isPremium,
        },
      });
    }

    const currentPlan: SubscriptionPlanCode =
      activeSubscription?.plan ??
      latestSubscription?.plan ??
      'FREE';

    const cancellation = getCancellationFromPayment(activePayment);

    return {
      isPremium,
      premiumUntil: premiumUntil ?? null,
      currentPlan,
      activeSubscription: mapSubscription(activeSubscription, activePayment),
      latestSubscription: mapSubscription(latestSubscription),
      latestPayment: mapPayment(latestPayment),
      cancellation: cancellation.cancelAtCycleEnd ? cancellation : undefined,
    };
  },

  async plans() {
    return Object.values(SUBSCRIPTION_PLANS).map(plan => ({
      plan: plan.plan,
      title: plan.title,
      amount: plan.amount,
      currency: plan.currency,
      validityDays: plan.validityDays,
      description: plan.description,
      displayPrice:
        plan.currency === 'INR'
          ? `₹${plan.amount.toLocaleString('en-IN')}`
          : `${plan.amount} ${plan.currency}`,
    }));
  },
};