export type PaidSubscriptionPlan =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'YEARLY'
  | 'LIFETIME';

type PlanConfig = {
  plan: PaidSubscriptionPlan;
  title: string;
  description: string;
  amount: number;
  currency: 'INR';
  validityDays: number;
};

export const SUBSCRIPTION_PLANS: Record<PaidSubscriptionPlan, PlanConfig> = {
  MONTHLY: {
    plan: 'MONTHLY',
    title: 'Monthly Premium',
    description: 'Premium access for 1 month.',
    amount: 149,
    currency: 'INR',
    validityDays: 30,
  },

  QUARTERLY: {
    plan: 'QUARTERLY',
    title: 'Quarterly Premium',
    description: 'Premium access for 3 months.',
    amount: 249,
    currency: 'INR',
    validityDays: 90,
  },

  YEARLY: {
    plan: 'YEARLY',
    title: 'Yearly Premium',
    description: 'Premium access for 1 year.',
    amount: 399,
    currency: 'INR',
    validityDays: 365,
  },

  LIFETIME: {
    plan: 'LIFETIME',
    title: 'Lifetime Premium',
    description: 'One-time payment. Lifetime access.',
    amount: 799,
    currency: 'INR',
    validityDays: 36500,
  },
};