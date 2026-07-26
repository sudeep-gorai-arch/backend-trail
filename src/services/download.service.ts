import { randomUUID } from "crypto";

import prisma from "../config/prisma";
import { ApiError } from "../utils/ApiError";

const FREE_DAILY_LIMIT = 5;

type AnyObj = Record<string, any>;

interface DownloadAccessInput {
  wallpaperId: string;
  userId: string | null;
  guestId: string | null;
}

interface RecordDownloadInput extends DownloadAccessInput {
  downloadId?: string | null;
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
// ACCESS RESOLUTION
// ======================================================

type DownloadAccessContext = {
  wallpaper: AnyObj;
  premiumActive: boolean;
  dailyCount: number;
  incrementUser: boolean;
  incrementGuest: boolean;
};

const resolveDownloadAccess = async ({
  wallpaperId,
  userId,
  guestId,
}: DownloadAccessInput): Promise<DownloadAccessContext> => {
  if (!wallpaperId) {
    throw ApiError.badRequest("Wallpaper ID is required.");
  }

  if (!userId && !guestId) {
    throw ApiError.badRequest("Guest ID is required.");
  }

  const wallpaper = await getWallpaper(wallpaperId);

  if (userId) {
    const user = await getUser(userId);
    const premiumActive = isPremiumActive(user.premiumUntil, user.isPremium);
    const dailyCount = await resetUserDailyLimit(
      user.id,
      user.lastDownloadReset,
    );

    checkDownloadPermission({
      isGuest: false,
      premiumActive,
      wallpaperPremium: Boolean(wallpaper.isPremium),
      dailyCount,
    });

    return {
      wallpaper,
      premiumActive,
      dailyCount,
      incrementUser: !premiumActive,
      incrementGuest: false,
    };
  }

  const guest = await getGuest(guestId!);
  const dailyCount = await resetGuestDailyLimit(
    guest.id,
    guest.lastDownloadReset,
  );

  checkDownloadPermission({
    isGuest: true,
    premiumActive: false,
    wallpaperPremium: Boolean(wallpaper.isPremium),
    dailyCount,
  });

  return {
    wallpaper,
    premiumActive: false,
    dailyCount,
    incrementUser: false,
    incrementGuest: true,
  };
};

const buildUsageMetadata = ({
  userId,
  dailyCount,
  premiumActive,
}: {
  userId: string | null;
  dailyCount: number;
  premiumActive: boolean;
}) => ({
  isGuest: !userId,
  dailyDownloadCount: premiumActive ? 0 : dailyCount,
  dailyDownloadLimit: premiumActive ? null : FREE_DAILY_LIMIT,
  remainingDailyDownloads: premiumActive
    ? null
    : Math.max(FREE_DAILY_LIMIT - dailyCount, 0),
});

// ======================================================
// RECORD TRANSACTION
// ======================================================

const recordTransaction = async ({
  downloadId,
  userId,
  guestId,
  wallpaperId,
  quality,
  incrementUser,
  incrementGuest,
}: {
  downloadId: string;
  userId: string | null;
  guestId: string | null;
  wallpaperId: string;
  quality: string;
  incrementUser: boolean;
  incrementGuest: boolean;
}) => {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.download.findUnique({
      where: { id: downloadId },
    });

    if (existing) {
      return { download: existing, created: false };
    }

    const download = await tx.download.create({
      data: {
        id: downloadId,
        userId,
        guestId,
        wallpaperId,
        quality,
      },
    });

    await tx.wallpaper.update({
      where: { id: wallpaperId },
      data: {
        downloadCount: { increment: 1 },
      },
    });

    if (incrementUser && userId) {
      await tx.user.update({
        where: { id: userId },
        data: {
          dailyDownloadCount: { increment: 1 },
        },
      });
    }

    if (incrementGuest && guestId) {
      await tx.guest.update({
        where: { id: guestId },
        data: {
          dailyDownloadCount: { increment: 1 },
        },
      });
    }

    return { download, created: true };
  });
};

// ======================================================
// RESPONSE MAPPER
// ======================================================

const buildDownloadResponse = (
  download: AnyObj,
  wallpaper: AnyObj,
  metadata: AnyObj = {},
) => {
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

    ...metadata,
  };
};

// ======================================================
// SERVICE
// ======================================================

export const downloadService = {
  async preflight({ wallpaperId, userId, guestId }: DownloadAccessInput) {
    const access = await resolveDownloadAccess({
      wallpaperId,
      userId,
      guestId,
    });

    return buildDownloadResponse(
      {
        id: null,
        createdAt: null,
        preflight: true,
      },
      access.wallpaper,
      {
        allowed: true,
        ...buildUsageMetadata({
          userId,
          dailyCount: access.dailyCount,
          premiumActive: access.premiumActive,
        }),
      },
    );
  },

  async record({
    wallpaperId,
    userId,
    guestId,
    downloadId,
  }: RecordDownloadInput) {
    const resolvedDownloadId = String(downloadId || randomUUID());

    const existing = await prisma.download.findUnique({
      where: { id: resolvedDownloadId },
      include: {
        wallpaper: { include: wallpaperInclude },
      },
    });

    if (existing) {
      if (
        existing.wallpaperId !== wallpaperId ||
        existing.userId !== userId ||
        existing.guestId !== guestId
      ) {
        throw ApiError.conflict(
          "This download transaction ID is already in use.",
        );
      }

      let currentDailyCount = 0;
      let premiumActive = false;

      if (userId) {
        const user = await getUser(userId);
        premiumActive = isPremiumActive(user.premiumUntil, user.isPremium);
        currentDailyCount = await resetUserDailyLimit(
          user.id,
          user.lastDownloadReset,
        );
      } else if (guestId) {
        const guest = await getGuest(guestId);
        currentDailyCount = await resetGuestDailyLimit(
          guest.id,
          guest.lastDownloadReset,
        );
      }

      return buildDownloadResponse(
        existing as AnyObj,
        existing.wallpaper as AnyObj,
        {
          idempotent: true,
          ...buildUsageMetadata({
            userId,
            dailyCount: currentDailyCount,
            premiumActive,
          }),
        },
      );
    }

    const access = await resolveDownloadAccess({
      wallpaperId,
      userId,
      guestId,
    });

    let transactionResult: { download: AnyObj; created: boolean };

    try {
      transactionResult = (await recordTransaction({
        downloadId: resolvedDownloadId,
        userId,
        guestId,
        wallpaperId: String(access.wallpaper.id),
        quality: String(access.wallpaper.quality ?? "4K"),
        incrementUser: access.incrementUser,
        incrementGuest: access.incrementGuest,
      })) as { download: AnyObj; created: boolean };
    } catch (error: any) {
      if (error?.code !== "P2002") {
        throw error;
      }

      const racedDownload = await prisma.download.findUnique({
        where: { id: resolvedDownloadId },
      });

      if (!racedDownload) {
        throw error;
      }

      transactionResult = {
        download: racedDownload as AnyObj,
        created: false,
      };
    }

    const nextDailyCount =
      transactionResult.created &&
      (access.incrementUser || access.incrementGuest)
        ? access.dailyCount + 1
        : access.dailyCount;

    const currentDownloadCount = Number(
      access.wallpaper.downloadCount ??
        access.wallpaper.download_count ??
        access.wallpaper._count?.downloadsHistory ??
        0,
    );

    const responseWallpaper = {
      ...access.wallpaper,
      downloadCount: transactionResult.created
        ? currentDownloadCount + 1
        : currentDownloadCount,
    };

    return buildDownloadResponse(
      transactionResult.download,
      responseWallpaper,
      {
        idempotent: !transactionResult.created,
        ...buildUsageMetadata({
          userId,
          dailyCount: nextDailyCount,
          premiumActive: access.premiumActive,
        }),
      },
    );
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