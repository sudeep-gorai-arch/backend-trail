import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';





export const userService = {

  /** Profile + aggregate stats shown on the Profile screen. */
  async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        _count: { select: { favorites: true, downloads: true } },
      },
    });
    if (!user) throw ApiError.notFound('User not found');

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isPremium: user.isPremium,
      createdAt: user.createdAt,
      stats: {
        favorites: user._count.favorites,
        downloads: user._count.downloads,
        collections: 0, // placeholder until a Collections model exists
      },
    };
  },


};
