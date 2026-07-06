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

// ======================================================
// MEDIA NORMALIZER
// ======================================================

const normalizeMediaType = (wallpaper: AnyObj) => {
  const mediaType = String(
    wallpaper.mediaType ??
      wallpaper.media_type ??
      (wallpaper.videoPath || wallpaper.video_path ? "VIDEO" : "IMAGE")
  ).toUpperCase();

  return mediaType === "VIDEO" ? "VIDEO" : "IMAGE";
};

const normalizeWallpaperMedia = (wallpaper: AnyObj): AnyObj => {
  const mediaType = normalizeMediaType(wallpaper);

  const imageUrl =
    wallpaper.imageUrl ??
    wallpaper.image_url ??
    wallpaper.displayPath ??
    wallpaper.display_path ??
    wallpaper.originalPath ??
    wallpaper.original_path ??
    null;

  const thumbnailUrl =
    wallpaper.thumbnailUrl ??
    wallpaper.thumbnail_url ??
    wallpaper.thumbnailPath ??
    wallpaper.thumbnail_path ??
    wallpaper.videoThumbnailPath ??
    wallpaper.video_thumbnail_path ??
    wallpaper.videoPreviewPath ??
    wallpaper.video_preview_path ??
    wallpaper.displayPath ??
    wallpaper.display_path ??
    imageUrl ??
    null;

  const videoUrl =
    wallpaper.videoUrl ??
    wallpaper.video_url ??
    wallpaper.videoPath ??
    wallpaper.video_path ??
    null;

  const videoPreviewUrl =
    wallpaper.videoPreviewUrl ??
    wallpaper.video_preview_url ??
    wallpaper.videoPreviewPath ??
    wallpaper.video_preview_path ??
    wallpaper.displayPath ??
    wallpaper.display_path ??
    imageUrl ??
    null;

  const videoThumbnailUrl =
    wallpaper.videoThumbnailUrl ??
    wallpaper.video_thumbnail_url ??
    wallpaper.videoThumbnailPath ??
    wallpaper.video_thumbnail_path ??
    thumbnailUrl ??
    null;

  const downloadUrl =
    mediaType === "VIDEO"
      ? videoUrl ?? videoPreviewUrl ?? imageUrl ?? thumbnailUrl
      : wallpaper.originalPath ??
        wallpaper.original_path ??
        wallpaper.displayPath ??
        wallpaper.display_path ??
        imageUrl ??
        thumbnailUrl;

  return {
    ...wallpaper,

    mediaType,

    isVideo: mediaType === "VIDEO",

    imageUrl,

    thumbnailUrl,

    videoUrl,

    videoPreviewUrl,

    videoThumbnailUrl,

    downloadUrl,
  };
};

// ======================================================
// LOOKUPS
// ======================================================

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

// ======================================================
// LIMITS / PERMISSIONS
// ======================================================

const isPremiumActive = (premiumUntil: Date | null, isPremium: boolean) => {
  return Boolean(isPremium && premiumUntil !== null && premiumUntil > new Date());
};

const resetUserDailyLimit = async (userId: string, lastReset: Date | null) => {
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

const resetGuestDailyLimit = async (guestId: string, lastReset: Date | null) => {
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
      throw ApiError.forbidden("Please sign in to download premium wallpapers.");
    }

    if (!premiumActive) {
      throw ApiError.forbidden("Premium subscription required.");
    }
  }

  if (!premiumActive && dailyCount >= FREE_DAILY_LIMIT) {
    throw ApiError.forbidden(
      `Daily free download limit (${FREE_DAILY_LIMIT}) reached.`
    );
  }
};

// ======================================================
// RECORD TRANSACTION
// ======================================================

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

// ======================================================
// RESPONSE MAPPER
// ======================================================

const buildDownloadResponse = (download: AnyObj, wallpaper: AnyObj) => {
  const normalizedWallpaper = normalizeWallpaperMedia(wallpaper);

  return {
    ...download,

    wallpaperId: normalizedWallpaper.id,

    mediaType: normalizedWallpaper.mediaType,

    isVideo: normalizedWallpaper.isVideo,

    downloadUrl: normalizedWallpaper.downloadUrl,

    imageUrl: normalizedWallpaper.imageUrl ?? normalizedWallpaper.downloadUrl,

    thumbnailUrl:
      normalizedWallpaper.thumbnailUrl ??
      normalizedWallpaper.imageUrl ??
      normalizedWallpaper.videoThumbnailUrl ??
      normalizedWallpaper.downloadUrl,

    videoUrl: normalizedWallpaper.videoUrl,

    videoPreviewUrl: normalizedWallpaper.videoPreviewUrl,

    videoThumbnailUrl: normalizedWallpaper.videoThumbnailUrl,

    durationSeconds:
      normalizedWallpaper.durationSeconds ??
      normalizedWallpaper.duration_seconds ??
      null,

    videoSize:
      normalizedWallpaper.videoSize ?? normalizedWallpaper.video_size ?? null,

    mimeType: normalizedWallpaper.mimeType ?? normalizedWallpaper.mime_type ?? null,

    extension: normalizedWallpaper.extension ?? null,

    quality: normalizedWallpaper.quality ?? "4K",

    isPremium: Boolean(normalizedWallpaper.isPremium),

    downloadCount:
      normalizedWallpaper.downloadCount ??
      normalizedWallpaper.download_count ??
      normalizedWallpaper._count?.downloadsHistory ??
      0,

    favoriteCount:
      normalizedWallpaper.favoriteCount ??
      normalizedWallpaper.favorite_count ??
      normalizedWallpaper._count?.favorites ??
      0,
  };
};

// ======================================================
// SERVICE
// ======================================================

export const downloadService = {
  async record({ wallpaperId, userId, guestId }: RecordDownloadInput) {
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

      premiumActive = isPremiumActive(user.premiumUntil, user.isPremium);

      dailyCount = await resetUserDailyLimit(user.id, user.lastDownloadReset);

      checkDownloadPermission({
        isGuest: false,
        premiumActive,
        wallpaperPremium: Boolean(wallpaper.isPremium),
        dailyCount,
      });

      incrementUser = !premiumActive;
    } else {
      const guest = await getGuest(guestId!);

      dailyCount = await resetGuestDailyLimit(guest.id, guest.lastDownloadReset);

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

    return buildDownloadResponse(download as AnyObj, wallpaper);
  },

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

          mediaType: wallpaper.mediaType,

          isVideo: wallpaper.isVideo,

          downloadUrl: wallpaper.downloadUrl,

          imageUrl: wallpaper.imageUrl,

          thumbnailUrl: wallpaper.thumbnailUrl,

          videoUrl: wallpaper.videoUrl,

          videoPreviewUrl: wallpaper.videoPreviewUrl,

          videoThumbnailUrl: wallpaper.videoThumbnailUrl,

          durationSeconds:
            wallpaper.durationSeconds ?? wallpaper.duration_seconds ?? null,

          videoSize: wallpaper.videoSize ?? wallpaper.video_size ?? null,

          mimeType: wallpaper.mimeType ?? wallpaper.mime_type ?? null,

          extension: wallpaper.extension ?? null,

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