import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

type AnyObj = Record<string, any>;

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
      downloadsHistory: true,
    },
  },
};

const normalizeWallpaperMedia = (wallpaper: AnyObj): AnyObj => {
  const imageUrl =
    wallpaper.imageUrl ??
    wallpaper.image_url ??
    wallpaper.displayUrl ??
    wallpaper.display_url ??
    wallpaper.displayPath ??
    wallpaper.display_path ??
    wallpaper.originalUrl ??
    wallpaper.original_url ??
    wallpaper.originalPath ??
    wallpaper.original_path ??
    wallpaper.downloadUrl ??
    wallpaper.download_url ??
    null;

  const thumbnailUrl =
    wallpaper.thumbnailUrl ??
    wallpaper.thumbnail_url ??
    wallpaper.thumbnailPath ??
    wallpaper.thumbnail_path ??
    wallpaper.thumbUrl ??
    wallpaper.thumb_url ??
    wallpaper.previewUrl ??
    wallpaper.preview_url ??
    wallpaper.displayUrl ??
    wallpaper.display_url ??
    wallpaper.displayPath ??
    wallpaper.display_path ??
    imageUrl ??
    null;

  return {
    ...wallpaper,
    imageUrl,
    thumbnailUrl,
  };
};

const getUser = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!user) {
    throw ApiError.notFound("User not found.");
  }

  return user;
};

const getWallpaper = async (wallpaperId: string): Promise<AnyObj> => {
  const wallpaper = await prisma.wallpaper.findUnique({
    where: {
      id: wallpaperId,
    },
    include: wallpaperInclude,
  });

  if (!wallpaper) {
    throw ApiError.notFound("Wallpaper not found.");
  }

  if (!wallpaper.active) {
    throw ApiError.notFound("Wallpaper is inactive.");
  }

  return normalizeWallpaperMedia(wallpaper as AnyObj);
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
    await getUser(userId);

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
          createdAt: "desc",
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
      items: favorites.map((favorite) => {
        const wallpaper = normalizeWallpaperMedia(favorite.wallpaper as AnyObj);

        return {
          ...wallpaper,

          isFavorite: true,

          favoriteCount:
            wallpaper.favoriteCount ??
            wallpaper.favorite_count ??
            wallpaper._count?.favorites ??
            0,

          downloadCount:
            wallpaper.downloadCount ??
            wallpaper.download_count ??
            wallpaper._count?.downloadsHistory ??
            0,

          favoritedAt: favorite.createdAt,
        };
      }),

      total,
    };
  },

  async add(userId: string, wallpaperId: string) {
    await getUser(userId);
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
    await getUser(userId);

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
    await getUser(userId);
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
    await getUser(userId);
    await getWallpaper(wallpaperId);

    return getFavoriteStatus(userId, wallpaperId);
  },
};