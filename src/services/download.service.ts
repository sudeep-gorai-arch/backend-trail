import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

const FREE_DAILY_LIMIT = 5;

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
      downloads: true,
    },
  },
};

const normalizeWallpaperMedia = (wallpaper: AnyObj): AnyObj => {
  const imageUrl =
    wallpaper.imageUrl ??
    wallpaper.image_url ??
    null;

  const thumbnailUrl =
    wallpaper.thumbnailUrl ??
    wallpaper.thumbnail_url ??
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

const isPremiumActive = (premiumUntil: Date | null, isPremium: boolean) => {
  return Boolean(
    isPremium &&
      premiumUntil !== null &&
      premiumUntil > new Date(),
  );
};

const resetUserDailyLimit = async (
  userId: string,
  lastReset: Date | null,
) => {
  const today = new Date().toDateString();

  if (lastReset?.toDateString() !== today) {
    await prisma.user.update({
      where: {
        id: userId,
      },

      data: {
        dailyDownloadCount: 0,
        lastDownloadReset: new Date(),
      },
    });

    return 0;
  }

  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },

    select: {
      dailyDownloadCount: true,
    },
  });

  return user?.dailyDownloadCount ?? 0;
};

const createDownloadRecord = async ({
  userId,
  wallpaperId,
  quality,
  incrementUserDailyCount,
}: {
  userId: string | null;
  wallpaperId: string;
  quality: string;
  incrementUserDailyCount: boolean;
}) => {
  return prisma.$transaction(async (tx) => {
    const download = await tx.download.create({
      data: {
        userId,
        wallpaperId,
        quality,
      },
    });

    await tx.wallpaper.update({
      where: {
        id: wallpaperId,
      },

      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    if (userId && incrementUserDailyCount) {
      await tx.user.update({
        where: {
          id: userId,
        },

        data: {
          dailyDownloadCount: {
            increment: 1,
          },
        },
      });
    }

    return download;
  });
};

const buildDownloadResponse = (download: AnyObj, wallpaper: AnyObj) => {
  const imageUrl = wallpaper.imageUrl ?? null;
  const thumbnailUrl = wallpaper.thumbnailUrl ?? imageUrl ?? null;

  return {
    ...download,

    wallpaperId: wallpaper.id,

    downloadUrl: imageUrl ?? thumbnailUrl,

    imageUrl,

    thumbnailUrl,

    quality: wallpaper.quality ?? download.quality ?? "4K",

    isPremium: Boolean(wallpaper.isPremium),

    downloadCount:
      wallpaper.downloadCount ??
      wallpaper.download_count ??
      wallpaper._count?.downloads ??
      0,

    favoriteCount:
      wallpaper.favoriteCount ??
      wallpaper.favorite_count ??
      wallpaper._count?.favorites ??
      0,
  };
};

export const downloadService = {
  /*
  ------------------------------------
  LOGGED-IN USER DOWNLOAD
  Controller calls:
  downloadService.record(req.user!.id, wallpaperId)
  ------------------------------------
  */

  async record(userId: string, wallpaperId: string) {
    const user = await getUser(userId);
    const wallpaper = await getWallpaper(wallpaperId);

    const premiumActive = isPremiumActive(user.premiumUntil, user.isPremium);

    if (wallpaper.isPremium && !premiumActive) {
      throw ApiError.forbidden("Premium subscription required.");
    }

    const dailyCount = await resetUserDailyLimit(
      user.id,
      user.lastDownloadReset,
    );

    if (!premiumActive && dailyCount >= FREE_DAILY_LIMIT) {
      throw ApiError.forbidden(
        `Daily free download limit (${FREE_DAILY_LIMIT}) reached.`,
      );
    }

    const download = await createDownloadRecord({
      userId: user.id,
      wallpaperId: String(wallpaper.id),
      quality: String(wallpaper.quality ?? "4K"),
      incrementUserDailyCount: !premiumActive,
    });

    return buildDownloadResponse(download as AnyObj, wallpaper);
  },

  /*
  ------------------------------------
  GUEST / PUBLIC DOWNLOAD
  Controller calls:
  downloadService.recordPublic(wallpaperId)
  ------------------------------------
  */

  async recordPublic(wallpaperId: string) {
    const wallpaper = await getWallpaper(wallpaperId);

    if (wallpaper.isPremium) {
      throw ApiError.forbidden("Premium wallpaper requires login.");
    }

    const download = await createDownloadRecord({
      userId: null,
      wallpaperId: String(wallpaper.id),
      quality: String(wallpaper.quality ?? "4K"),
      incrementUserDailyCount: false,
    });

    return buildDownloadResponse(download as AnyObj, wallpaper);
  },

  /*
  ------------------------------------
  USER DOWNLOAD HISTORY
  ------------------------------------
  */

  async list(userId: string, limit: number, offset: number) {
    const [downloads, total] = await Promise.all([
      prisma.download.findMany({
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

      prisma.download.count({
        where: {
          userId,
        },
      }),
    ]);

    return {
      items: downloads.map((download) => {
        const wallpaper = normalizeWallpaperMedia(download.wallpaper as AnyObj);

        return {
          ...wallpaper,

          downloadedAt: download.createdAt,

          downloadQuality: download.quality,

          downloadCount:
            wallpaper.downloadCount ??
            wallpaper.download_count ??
            wallpaper._count?.downloads ??
            0,

          favoriteCount:
            wallpaper.favoriteCount ??
            wallpaper.favorite_count ??
            wallpaper._count?.favorites ??
            0,
        };
      }),

      total,
    };
  },
};