import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

const FREE_DAILY_LIMIT = 5;

const wallpaperInclude = {
  category: {
    select: {
      id: true,
      name: true,
      slug: true,
      thumbnailUrl: true,
    },
  },
};

interface RecordDownloadInput {
  wallpaperId: string;
  userId: string | null;
  guestId: string | null;
}

/* ===========================================================
   USER
=========================================================== */

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

/* ===========================================================
   GUEST
=========================================================== */

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

/* ===========================================================
   WALLPAPER
=========================================================== */

const getWallpaper = async (wallpaperId: string) => {
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

  if (wallpaper.status !== "READY") {
    throw ApiError.badRequest(
      "Wallpaper is still processing."
    );
  }

  return wallpaper;
};

/* ===========================================================
   PREMIUM
=========================================================== */

const isPremiumActive = (
  premiumUntil: Date | null,
  isPremium: boolean
) => {
  return (
    isPremium &&
    premiumUntil !== null &&
    premiumUntil > new Date()
  );
};

/* ===========================================================
   DAILY LIMIT
=========================================================== */

const resetUserDailyLimit = async (
  userId: string,
  lastReset: Date | null
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
  lastReset: Date | null
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

/* ===========================================================
   PERMISSION
=========================================================== */

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
        "Please sign in to download premium wallpapers."
      );
    }

    if (!premiumActive) {
      throw ApiError.forbidden(
        "Premium subscription required."
      );
    }
  }

  if (
    !premiumActive &&
    dailyCount >= FREE_DAILY_LIMIT
  ) {
    throw ApiError.forbidden(
      `Daily free download limit (${FREE_DAILY_LIMIT}) reached.`
    );
  }
};

/* ===========================================================
   TRANSACTION
=========================================================== */

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
    const download =
      await tx.download.create({
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
    if (!userId && !guestId) {
      throw ApiError.badRequest(
        "Guest ID is required."
      );
    }

    const wallpaper =
      await getWallpaper(wallpaperId);

    let premiumActive = false;
    let dailyCount = 0;
    let incrementUser = false;
    let incrementGuest = false;

    /*
    ------------------------------------
    LOGGED IN USER
    ------------------------------------
    */

    if (userId) {
      const user =
        await getUser(userId);

      premiumActive =
        isPremiumActive(
          user.premiumUntil,
          user.isPremium
        );

      dailyCount =
        await resetUserDailyLimit(
          user.id,
          user.lastDownloadReset
        );

      checkDownloadPermission({
        isGuest: false,
        premiumActive,
        wallpaperPremium:
          wallpaper.isPremium,
        dailyCount,
      });

      incrementUser = !premiumActive;
    }

    /*
    ------------------------------------
    GUEST USER
    ------------------------------------
    */

    else {
      const guest =
        await getGuest(
          guestId!
        );

      dailyCount =
        await resetGuestDailyLimit(
          guest.id,
          guest.lastDownloadReset
        );

      checkDownloadPermission({
        isGuest: true,
        premiumActive: false,
        wallpaperPremium:
          wallpaper.isPremium,
        dailyCount,
      });

      incrementGuest = true;
    }

    /*
    ------------------------------------
    TRANSACTION
    ------------------------------------
    */

    const download =
      await recordTransaction({
        userId,
        guestId,
        wallpaperId:
          wallpaper.id,
        quality:
          wallpaper.quality,
        incrementUser,
        incrementGuest,
      });

    return {
      ...download,

      downloadUrl:
        wallpaper.originalPath,

      quality:
        wallpaper.quality,

      isPremium:
        wallpaper.isPremium,
    };
  },

  /*
  ------------------------------------
  USER DOWNLOAD HISTORY
  ------------------------------------
  */

  async list(
    userId: string,
    limit: number,
    offset: number
  ) {
    const [
      downloads,
      total,
    ] =
      await Promise.all([
        prisma.download.findMany({
          where: {
            userId,
          },

          include: {
            wallpaper: {
              include:
                wallpaperInclude,
            },
          },

          orderBy: {
            createdAt:
              "desc",
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
      items:
        downloads.map(
          (
            download
          ) => ({
            ...download.wallpaper,

            downloadedAt:
              download.createdAt,

            downloadQuality:
              download.quality,
          })
        ),

      total,
    };
  },
};