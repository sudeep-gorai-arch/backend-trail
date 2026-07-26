import { randomUUID } from 'crypto';

import prisma from '../config/prisma';
import { ApiError } from '../utils/ApiError';

const FREE_DAILY_LIMIT = 5;
const SERIALIZABLE_RETRY_COUNT = 3;

type AnyObj = Record<string, any>;

type DownloadAccessInput = {
  wallpaperId: string;
  userId: string | null;
  guestId: string | null;
};

type CommitDownloadInput = DownloadAccessInput & {
  clientRequestId: string;
};

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

const normalizeMediaType = (wallpaper: AnyObj) => {
  const value = String(
    wallpaper.mediaType ??
      wallpaper.media_type ??
      (wallpaper.videoPath || wallpaper.video_path ? 'VIDEO' : 'IMAGE'),
  ).toUpperCase();
  return value === 'VIDEO' ? 'VIDEO' : 'IMAGE';
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
    imageUrl;
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
    imageUrl;
  const videoThumbnailUrl =
    wallpaper.videoThumbnailUrl ??
    wallpaper.video_thumbnail_url ??
    wallpaper.videoThumbnailPath ??
    wallpaper.video_thumbnail_path ??
    thumbnailUrl;
  const downloadUrl =
    mediaType === 'VIDEO'
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
    isVideo: mediaType === 'VIDEO',
    imageUrl,
    thumbnailUrl,
    videoUrl,
    videoPreviewUrl,
    videoThumbnailUrl,
    downloadUrl,
  };
};

const getWallpaper = async (wallpaperId: string): Promise<AnyObj> => {
  const wallpaper = await prisma.wallpaper.findUnique({
    where: { id: wallpaperId },
    include: wallpaperInclude,
  });

  if (!wallpaper || !wallpaper.active) {
    throw ApiError.notFound('Wallpaper not found.');
  }

  const record = wallpaper as AnyObj;
  if (record.status && record.status !== 'READY') {
    throw ApiError.badRequest('Wallpaper is still processing.');
  }

  return normalizeWallpaperMedia(record);
};

const getUser = async (userId: string) => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw ApiError.notFound('User not found.');
  return user;
};

const getGuest = async (guestId: string) => {
  return prisma.guest.upsert({
    where: { id: guestId },
    update: {},
    create: { id: guestId },
  });
};

const isSameCalendarDay = (a: Date | null, b = new Date()) =>
  Boolean(a && a.toDateString() === b.toDateString());

const isPremiumActive = (premiumUntil: Date | null, isPremium: boolean) =>
  Boolean(isPremium && premiumUntil && premiumUntil > new Date());

const assertDownloadAllowed = (input: {
  isGuest: boolean;
  premiumActive: boolean;
  wallpaperPremium: boolean;
  dailyCount: number;
}) => {
  if (input.wallpaperPremium) {
    if (input.isGuest) {
      throw ApiError.forbidden('Please sign in to download premium wallpapers.');
    }
    if (!input.premiumActive) {
      throw ApiError.forbidden('Premium subscription required.');
    }
  }

  if (!input.premiumActive && input.dailyCount >= FREE_DAILY_LIMIT) {
    throw ApiError.forbidden(
      `Daily free download limit (${FREE_DAILY_LIMIT}) reached.`,
    );
  }
};

const resetUserDailyCountIfNeeded = async (user: AnyObj) => {
  if (isSameCalendarDay(user.lastDownloadReset)) {
    return Number(user.dailyDownloadCount || 0);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { dailyDownloadCount: 0, lastDownloadReset: new Date() },
    select: { dailyDownloadCount: true },
  });
  return updated.dailyDownloadCount;
};

const resetGuestDailyCountIfNeeded = async (guest: AnyObj) => {
  if (isSameCalendarDay(guest.lastDownloadReset)) {
    return Number(guest.dailyDownloadCount || 0);
  }

  const updated = await prisma.guest.update({
    where: { id: guest.id },
    data: { dailyDownloadCount: 0, lastDownloadReset: new Date() },
    select: { dailyDownloadCount: true },
  });
  return updated.dailyDownloadCount;
};

const buildAccessResponse = (input: {
  wallpaper: AnyObj;
  dailyDownloadCount: number | null;
  premiumActive: boolean;
  isGuest: boolean;
  downloadCount?: number;
  idempotent?: boolean;
  downloadId?: string | null;
}) => {
  const wallpaper = normalizeWallpaperMedia(input.wallpaper);
  const dailyLimit = input.premiumActive ? null : FREE_DAILY_LIMIT;
  const dailyCount = input.premiumActive ? null : input.dailyDownloadCount;

  return {
    wallpaperId: wallpaper.id,
    mediaType: wallpaper.mediaType,
    isVideo: wallpaper.isVideo,
    downloadUrl: wallpaper.downloadUrl,
    imageUrl: wallpaper.imageUrl ?? wallpaper.downloadUrl,
    thumbnailUrl:
      wallpaper.thumbnailUrl ?? wallpaper.imageUrl ?? wallpaper.downloadUrl,
    videoUrl: wallpaper.videoUrl,
    videoPreviewUrl: wallpaper.videoPreviewUrl,
    videoThumbnailUrl: wallpaper.videoThumbnailUrl,
    extension: wallpaper.extension ?? null,
    mimeType: wallpaper.mimeType ?? wallpaper.mime_type ?? null,
    quality: wallpaper.quality ?? '4K',
    isPremium: Boolean(wallpaper.isPremium),
    isGuest: input.isGuest,
    premiumActive: input.premiumActive,
    dailyDownloadCount: dailyCount,
    dailyDownloadLimit: dailyLimit,
    remainingDailyDownloads:
      dailyLimit === null || dailyCount === null
        ? null
        : Math.max(0, dailyLimit - dailyCount),
    downloadCount:
      input.downloadCount ??
      wallpaper.downloadCount ??
      wallpaper.download_count ??
      0,
    favoriteCount:
      wallpaper.favoriteCount ??
      wallpaper.favorite_count ??
      wallpaper._count?.favorites ??
      0,
    idempotent: Boolean(input.idempotent),
    downloadId: input.downloadId ?? null,
  };
};

const getAccessState = async ({
  wallpaper,
  userId,
  guestId,
}: {
  wallpaper: AnyObj;
  userId: string | null;
  guestId: string | null;
}) => {
  if (userId) {
    const user = await getUser(userId);
    const premiumActive = isPremiumActive(user.premiumUntil, user.isPremium);
    const dailyCount = await resetUserDailyCountIfNeeded(user);

    assertDownloadAllowed({
      isGuest: false,
      premiumActive,
      wallpaperPremium: Boolean(wallpaper.isPremium),
      dailyCount,
    });

    return { isGuest: false, premiumActive, dailyCount };
  }

  if (!guestId) throw ApiError.badRequest('Guest ID is required.');

  const guest = await getGuest(guestId);
  const dailyCount = await resetGuestDailyCountIfNeeded(guest);

  assertDownloadAllowed({
    isGuest: true,
    premiumActive: false,
    wallpaperPremium: Boolean(wallpaper.isPremium),
    dailyCount,
  });

  return { isGuest: true, premiumActive: false, dailyCount };
};

const isSerializableConflict = (error: any) => error?.code === 'P2034';

const runSerializable = async <T>(operation: () => Promise<T>): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt < SERIALIZABLE_RETRY_COUNT; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isSerializableConflict(error) || attempt === SERIALIZABLE_RETRY_COUNT - 1) {
        throw error;
      }
    }
  }

  throw lastError;
};

const findExistingCommit = async (clientRequestId: string) =>
  prisma.download.findUnique({
    where: { clientRequestId },
    include: { wallpaper: { include: wallpaperInclude } },
  });

const assertExistingCommitOwner = (
  existing: AnyObj,
  input: CommitDownloadInput,
) => {
  const ownerMatches = input.userId
    ? existing.userId === input.userId
    : existing.guestId === input.guestId;

  if (!ownerMatches || existing.wallpaperId !== input.wallpaperId) {
    throw ApiError.conflict('Download request ID is already in use.');
  }
};

const getCurrentDailyCount = async (input: CommitDownloadInput) => {
  if (input.userId) {
    const user = await getUser(input.userId);
    return isPremiumActive(user.premiumUntil, user.isPremium)
      ? null
      : resetUserDailyCountIfNeeded(user);
  }

  const guest = await getGuest(input.guestId!);
  return resetGuestDailyCountIfNeeded(guest);
};

const buildExistingCommitResponse = async (
  existing: AnyObj,
  input: CommitDownloadInput,
) => {
  assertExistingCommitOwner(existing, input);

  const wallpaper = normalizeWallpaperMedia(existing.wallpaper as AnyObj);
  const dailyCount = await getCurrentDailyCount(input);
  let premiumActive = false;

  if (input.userId) {
    const user = await getUser(input.userId);
    premiumActive = isPremiumActive(user.premiumUntil, user.isPremium);
  }

  return buildAccessResponse({
    wallpaper,
    dailyDownloadCount: dailyCount,
    premiumActive,
    isGuest: !input.userId,
    downloadCount: wallpaper.downloadCount,
    idempotent: true,
    downloadId: existing.id,
  });
};

const commitOnce = async (input: CommitDownloadInput): Promise<AnyObj> => {
  const before = await findExistingCommit(input.clientRequestId);
  if (before) {
    return buildExistingCommitResponse(before as AnyObj, input);
  }

  try {
    return await runSerializable(() =>
      prisma.$transaction(
        async tx => {
          const wallpaper = await tx.wallpaper.findUnique({
            where: { id: input.wallpaperId },
            include: wallpaperInclude,
          });

          if (!wallpaper || !wallpaper.active) {
            throw ApiError.notFound('Wallpaper not found.');
          }

          const normalizedWallpaper = normalizeWallpaperMedia(
            wallpaper as AnyObj,
          );
          let premiumActive = false;
          let dailyCount = 0;

          if (input.userId) {
            const user = await tx.user.findUnique({
              where: { id: input.userId },
            });
            if (!user) throw ApiError.notFound('User not found.');

            premiumActive = isPremiumActive(
              user.premiumUntil,
              user.isPremium,
            );
            dailyCount = isSameCalendarDay(user.lastDownloadReset)
              ? user.dailyDownloadCount
              : 0;

            if (!isSameCalendarDay(user.lastDownloadReset)) {
              await tx.user.update({
                where: { id: user.id },
                data: {
                  dailyDownloadCount: 0,
                  lastDownloadReset: new Date(),
                },
              });
            }

            assertDownloadAllowed({
              isGuest: false,
              premiumActive,
              wallpaperPremium: Boolean(normalizedWallpaper.isPremium),
              dailyCount,
            });
          } else {
            if (!input.guestId) {
              throw ApiError.badRequest('Guest ID is required.');
            }

            let guest = await tx.guest.findUnique({
              where: { id: input.guestId },
            });
            if (!guest) {
              guest = await tx.guest.create({ data: { id: input.guestId } });
            }

            dailyCount = isSameCalendarDay(guest.lastDownloadReset)
              ? guest.dailyDownloadCount
              : 0;

            if (!isSameCalendarDay(guest.lastDownloadReset)) {
              await tx.guest.update({
                where: { id: guest.id },
                data: {
                  dailyDownloadCount: 0,
                  lastDownloadReset: new Date(),
                },
              });
            }

            assertDownloadAllowed({
              isGuest: true,
              premiumActive: false,
              wallpaperPremium: Boolean(normalizedWallpaper.isPremium),
              dailyCount,
            });
          }

          const download = await tx.download.create({
            data: {
              userId: input.userId,
              guestId: input.guestId,
              wallpaperId: input.wallpaperId,
              quality: String(normalizedWallpaper.quality ?? '4K'),
              clientRequestId: input.clientRequestId,
            },
          });

          const updatedWallpaper = await tx.wallpaper.update({
            where: { id: input.wallpaperId },
            data: { downloadCount: { increment: 1 } },
            include: wallpaperInclude,
          });

          let nextDailyCount: number | null = null;

          if (input.userId && !premiumActive) {
            const updatedUser = await tx.user.update({
              where: { id: input.userId },
              data: { dailyDownloadCount: { increment: 1 } },
              select: { dailyDownloadCount: true },
            });
            nextDailyCount = updatedUser.dailyDownloadCount;
          } else if (input.guestId) {
            const updatedGuest = await tx.guest.update({
              where: { id: input.guestId },
              data: { dailyDownloadCount: { increment: 1 } },
              select: { dailyDownloadCount: true },
            });
            nextDailyCount = updatedGuest.dailyDownloadCount;
          }

          return buildAccessResponse({
            wallpaper: normalizeWallpaperMedia(updatedWallpaper as AnyObj),
            dailyDownloadCount: nextDailyCount,
            premiumActive,
            isGuest: !input.userId,
            downloadCount: updatedWallpaper.downloadCount,
            idempotent: false,
            downloadId: download.id,
          });
        },
        { isolationLevel: 'Serializable' },
      ),
    );
  } catch (error: any) {
    // Two identical commits may reach the unique insert concurrently. The
    // loser resolves the already-created row instead of returning an error or
    // incrementing any counter again.
    if (error?.code === 'P2002') {
      const existing = await findExistingCommit(input.clientRequestId);
      if (existing) {
        return buildExistingCommitResponse(existing as AnyObj, input);
      }
    }

    throw error;
  }
};

export const downloadService = {
  async preflight(input: DownloadAccessInput) {
    if (!input.wallpaperId) throw ApiError.badRequest('Wallpaper ID is required.');
    if (!input.userId && !input.guestId) {
      throw ApiError.badRequest('Guest ID is required.');
    }

    const wallpaper = await getWallpaper(input.wallpaperId);
    const access = await getAccessState({ ...input, wallpaper });

    return buildAccessResponse({
      wallpaper,
      dailyDownloadCount: access.dailyCount,
      premiumActive: access.premiumActive,
      isGuest: access.isGuest,
      downloadCount: wallpaper.downloadCount,
    });
  },

  async commit(input: CommitDownloadInput) {
    if (!input.wallpaperId) throw ApiError.badRequest('Wallpaper ID is required.');
    if (!input.clientRequestId) {
      throw ApiError.badRequest('Client request ID is required.');
    }
    if (!input.userId && !input.guestId) {
      throw ApiError.badRequest('Guest ID is required.');
    }

    return commitOnce(input);
  },

  // Backward compatibility for older mobile versions. New clients use
  // preflight + commit and supply their own idempotency ID.
  async record(input: DownloadAccessInput) {
    return commitOnce({ ...input, clientRequestId: randomUUID() });
  },

  async list(userId: string, limit: number, offset: number) {
    const [downloads, total] = await Promise.all([
      prisma.download.findMany({
        where: { userId },
        include: { wallpaper: { include: wallpaperInclude } },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.download.count({ where: { userId } }),
    ]);

    return {
      items: downloads.map(download => {
        const wallpaper = normalizeWallpaperMedia(download.wallpaper as AnyObj);
        return {
          ...wallpaper,
          downloadedAt: download.createdAt,
          downloadQuality: download.quality,
          downloadCount:
            wallpaper.downloadCount ?? wallpaper._count?.downloadsHistory ?? 0,
          favoriteCount:
            wallpaper.favoriteCount ?? wallpaper._count?.favorites ?? 0,
        };
      }),
      total,
    };
  },
};