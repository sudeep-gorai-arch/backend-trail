import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const wallpaperInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      thumbnailUrl: true,
    },
  },

  _count: {
    select: {
      favorites: true,
    },
  },
};

const getWallpaper = async (wallpaperId: string) => {
  const wallpaper = await prisma.wallpaper.findUnique({
    where: {
      id: wallpaperId,
    },

    include: wallpaperInclude,
  });

  if (!wallpaper) {
    throw ApiError.notFound('Wallpaper not found.');
  }

  if (!wallpaper.active) {
    throw ApiError.notFound('Wallpaper is inactive.');
  }

  return wallpaper;
};

const getFavoriteCount = async (wallpaperId: string) => {
  return prisma.favorite.count({
    where: {
      wallpaperId,
    },
  });
};

const getFavoriteStatus = async (userId: string, wallpaperId: string) => {
  const favorite = await prisma.favorite.findUnique({
    where: {
      userId_wallpaperId: {
        userId,
        wallpaperId,
      },
    },
  });

  const favoriteCount = await getFavoriteCount(wallpaperId);

  return {
    favorite: Boolean(favorite),
    isFavorite: Boolean(favorite),
    favoriteCount,
  };
};

export const favoriteService = {
  async list(userId: string, limit: number, offset: number) {
    const [favorites, total] = await Promise.all([
      prisma.favorite.findMany({
        where: {
          userId,
        },

        include: {
          wallpaper: {
            include: wallpaperInclude,
          },
        },

        orderBy: {
          createdAt: 'desc',
        },

        skip: offset,

        take: limit,
      }),

      prisma.favorite.count({
        where: {
          userId,
        },
      }),
    ]);

    return {
      items: favorites.map(favorite => ({
        ...favorite.wallpaper,

        isFavorite: true,

        favoriteCount: favorite.wallpaper._count?.favorites ?? 0,

        favoritedAt: favorite.createdAt,
      })),

      total,
    };
  },

  async add(userId: string, wallpaperId: string) {
    await getWallpaper(wallpaperId);

    await prisma.favorite.upsert({
      where: {
        userId_wallpaperId: {
          userId,
          wallpaperId,
        },
      },

      update: {},

      create: {
        userId,
        wallpaperId,
      },
    });

    return getFavoriteStatus(userId, wallpaperId);
  },

  async remove(userId: string, wallpaperId: string) {
    await prisma.favorite.deleteMany({
      where: {
        userId,
        wallpaperId,
      },
    });

    const favoriteCount = await getFavoriteCount(wallpaperId);

    return {
      removed: true,
      favorite: false,
      isFavorite: false,
      favoriteCount,
    };
  },

  async toggle(userId: string, wallpaperId: string) {
    await getWallpaper(wallpaperId);

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_wallpaperId: {
          userId,
          wallpaperId,
        },
      },
    });

    if (existing) {
      await prisma.favorite.delete({
        where: {
          userId_wallpaperId: {
            userId,
            wallpaperId,
          },
        },
      });

      const favoriteCount = await getFavoriteCount(wallpaperId);

      return {
        favorite: false,
        isFavorite: false,
        favoriteCount,
      };
    }

    await prisma.favorite.create({
      data: {
        userId,
        wallpaperId,
      },
    });

    const favoriteCount = await getFavoriteCount(wallpaperId);

    return {
      favorite: true,
      isFavorite: true,
      favoriteCount,
    };
  },

  async isFavorite(userId: string, wallpaperId: string) {
    await getWallpaper(wallpaperId);

    return getFavoriteStatus(userId, wallpaperId);
  },
};