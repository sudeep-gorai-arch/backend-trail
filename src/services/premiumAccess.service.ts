import prisma from '../config/prisma';

export const hasActivePremiumAccess = async (
  userId?: string | null,
): Promise<boolean> => {
  if (!userId) return false;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isPremium: true,
      premiumUntil: true,
    },
  });

  return Boolean(
    user?.isPremium &&
      user.premiumUntil &&
      user.premiumUntil.getTime() > Date.now(),
  );
};