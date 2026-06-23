import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const withCategory = {
  category: { select: { id: true, name: true, slug: true, icon: true } },
};

export const favoriteService = {
  /** A user's favorite wallpapers, newest first. */
  async list(userId: string, limit: number, offset: number) {
    const [rows, total] = await Promise.all([
      prisma.favorite.findMany({
        where: { userId },
        include: { wallpaper: { include: withCategory } },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.favorite.count({ where: { userId } }),
    ]);
    return { items: rows.map((r) => r.wallpaper), total };
  },

  /** Idempotent add — favoriting twice is a no-op thanks to the unique index. */
  async add(userId: string, wallpaperId: string) {
    const wallpaper = await prisma.wallpaper.findUnique({
      where: { id: wallpaperId },
    });
    if (!wallpaper) throw ApiError.notFound(`Wallpaper ${wallpaperId} not found`);

    return prisma.favorite.upsert({
      where: { userId_wallpaperId: { userId, wallpaperId } },
      update: {},
      create: { userId, wallpaperId },
    });
  },

  /** Idempotent remove — returns how many rows were deleted (0 or 1). */
  async remove(userId: string, wallpaperId: string) {
    const result = await prisma.favorite.deleteMany({
      where: { userId, wallpaperId },
    });
    return { removed: result.count };
  },
};
