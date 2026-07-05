import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

const FREE_DAILY_LIMIT = 5;

type AnyObj = Record<string, any>;

interface RecordDownloadInput {
  wallpaperId: string;
  userId: string | null;
  guestId: string | null;
}

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

const getGuest = async (guestId: string) => {
  let guest = await prisma.guest.findUnique({
    where: {
      id: guestId,
    },
  });

  if (!guest) {
    guest = await prisma.guest.create({
      data: {
        id: guestId,
      },
    });
  }

  return guest;
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

  const wallpaperRecord = wallpaper as AnyObj;

  if (wallpaperRecord.status && wallpaperRecord.status !== "READY") {
    throw ApiError.badRequest("Wallpaper is still processing.");
  }

  return normalizeWallpaperMedia(wallpaperRecord);
};

const isPremiumActive = (
  premiumUntil: Date | null,
  isPremium: boolean,
) => {
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

const resetGuestDailyLimit = async (
  guestId: string,
  lastReset: Date | null,
) => {
  const today = new Date().toDateString();

  if (lastReset?.toDateString() !== today) {
    await prisma.guest.update({
      where: {
        id: guestId,
      },
      data: {
        dailyDownloadCount: 0,
        lastDownloadReset: new Date(),
      },
    });

    return 0;
  }

  const guest = await prisma.guest.findUnique({
    where: {
      id: guestId,
    },
    select: {
      dailyDownloadCount: true,
    },
  });

  return guest?.dailyDownloadCount ?? 0;
};

const checkDownloadPermission = ({
  isGuest,
  premiumActive,
  wallpaperPremium,
  dailyCount,
}: {
  isGuest: boolean;
  premiumActive: boolean;
  wallpaperPremium: boolean;
  dailyCount: number;
}) => {
  if (wallpaperPremium) {
    if (isGuest) {
      throw ApiError.forbidden(
        "Please sign in to download premium wallpapers.",
      );
    }

    if (!premiumActive) {
      throw ApiError.forbidden("Premium subscription required.");
    }
  }

  if (!premiumActive && dailyCount >= FREE_DAILY_LIMIT) {
    throw ApiError.forbidden(
      `Daily free download limit (${FREE_DAILY_LIMIT}) reached.`,
    );
  }
};

const recordTransaction = async ({
  userId,
  guestId,
  wallpaperId,
  quality,
  incrementUser,
  incrementGuest,
}: {
  userId: string | null;
  guestId: string | null;
  wallpaperId: string;
  quality: string;
  incrementUser: boolean;
  incrementGuest: boolean;
}) => {
  return prisma.$transaction(async (tx) => {
    const download = await tx.download.create({
      data: {
        userId,
        guestId,
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

    if (incrementUser && userId) {
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

    if (incrementGuest && guestId) {
      await tx.guest.update({
        where: {
          id: guestId,
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

export const downloadService = {
  async record({
    wallpaperId,
    userId,
    guestId,
  }: RecordDownloadInput) {
    if (!wallpaperId) {
      throw ApiError.badRequest("Wallpaper ID is required.");
    }

    if (!userId && !guestId) {
      throw ApiError.badRequest("Guest ID is required.");
    }

    const wallpaper = await getWallpaper(wallpaperId);

    let premiumActive = false;
    let dailyCount = 0;
    let incrementUser = false;
    let incrementGuest = false;

    if (userId) {
      const user = await getUser(userId);

      premiumActive = isPremiumActive(
        user.premiumUntil,
        user.isPremium,
      );

      dailyCount = await resetUserDailyLimit(
        user.id,
        user.lastDownloadReset,
      );

      checkDownloadPermission({
        isGuest: false,
        premiumActive,
        wallpaperPremium: Boolean(wallpaper.isPremium),
        dailyCount,
      });

      incrementUser = !premiumActive;
    } else {
      const guest = await getGuest(guestId!);

      dailyCount = await resetGuestDailyLimit(
        guest.id,
        guest.lastDownloadReset,
      );

      checkDownloadPermission({
        isGuest: true,
        premiumActive: false,
        wallpaperPremium: Boolean(wallpaper.isPremium),
        dailyCount,
      });

      incrementGuest = true;
    }

    const download = await recordTransaction({
      userId,
      guestId,
      wallpaperId: String(wallpaper.id),
      quality: String(wallpaper.quality ?? "4K"),
      incrementUser,
      incrementGuest,
    });

    const downloadUrl =
      wallpaper.originalPath ??
      wallpaper.original_path ??
      wallpaper.downloadUrl ??
      wallpaper.download_url ??
      wallpaper.imageUrl ??
      wallpaper.thumbnailUrl ??
      null;

    return {
      ...download,

      wallpaperId: wallpaper.id,

      downloadUrl,

      imageUrl: wallpaper.imageUrl ?? downloadUrl,

      thumbnailUrl:
        wallpaper.thumbnailUrl ??
        wallpaper.imageUrl ??
        downloadUrl,

      quality: wallpaper.quality ?? "4K",

      isPremium: Boolean(wallpaper.isPremium),

      downloadCount:
        wallpaper.downloadCount ??
        wallpaper.download_count ??
        wallpaper._count?.downloadsHistory ??
        0,

      favoriteCount:
        wallpaper.favoriteCount ??
        wallpaper.favorite_count ??
        wallpaper._count?.favorites ??
        0,
    };
  },

  async list(
    userId: string,
    limit: number,
    offset: number,
  ) {
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
        const wallpaper = normalizeWallpaperMedia(
          download.wallpaper as AnyObj,
        );

        return {
          ...wallpaper,

          downloadedAt: download.createdAt,

          downloadQuality: download.quality,

          downloadCount:
            wallpaper.downloadCount ??
            wallpaper.download_count ??
            wallpaper._count?.downloadsHistory ??
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