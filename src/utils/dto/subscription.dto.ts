export const toSubscriptionDTO = (subscription: any) => ({
    id: subscription.id,

    plan: subscription.plan,

    platform: subscription.platform,

    amount: subscription.amount,

    currency: subscription.currency,

    active: subscription.active,

    startDate: subscription.startDate,

    endDate: subscription.endDate,

    createdAt: subscription.createdAt
});