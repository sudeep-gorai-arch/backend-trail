import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

const getUserOrThrow = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      role: true,

      _count: {
        select: {
          favorites: true,
          downloads: true,
          wallpaperLikes: true,
          subscriptions: true,
        },
      },
    },
  });

  if (!user) {
    throw ApiError.notFound(
      "User not found."
    );
  }

  return user;
};

export const userService = {

  async me(userId: string) {
    const user =
      await getUserOrThrow(userId);

    return {
      id: user.id,

      email: user.email,

      username: user.username,

      avatarUrl: user.avatarUrl,

      bio: user.bio,

      authProvider: user.authProvider,

      isPremium: user.isPremium,

      premiumUntil: user.premiumUntil,

      favoriteCount: user.favoriteCount,

      dailyDownloadCount:
        user.dailyDownloadCount,

      createdAt: user.createdAt,

      role: user.role,

      stats: {
        favorites:
          user._count.favorites,

        downloads:
          user._count.downloads,

        likes:
          user._count.wallpaperLikes,

        subscriptions:
          user._count.subscriptions,
      },
    };
  },

  async updateProfile(
    userId: string,
    data: {
      username?: string;
      bio?: string;
      avatarUrl?: string;
    }
  ) {
    await getUserOrThrow(userId);

    return prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        username: data.username,

        bio: data.bio,

        avatarUrl: data.avatarUrl,
      },
    });
  },

  async deleteAccount(userId: string) {
    await getUserOrThrow(userId);

    await prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return {
      deleted: true,
    };
  },
};