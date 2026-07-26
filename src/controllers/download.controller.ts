import { Request, Response } from 'express';

import { downloadService } from '../services/download.service';
import { response, buildPagination } from '../utils/ApiResponse';
import { toWallpaperDTO } from '../utils/dto';
import { absoluteUrl } from '../utils/url';

const withAbsoluteMedia = (req: Request, payload: Record<string, any>) => ({
  ...payload,
  downloadUrl: absoluteUrl(req, payload.downloadUrl),
  imageUrl: absoluteUrl(req, payload.imageUrl),
  thumbnailUrl: absoluteUrl(req, payload.thumbnailUrl),
  videoUrl: absoluteUrl(req, payload.videoUrl),
  videoPreviewUrl: absoluteUrl(req, payload.videoPreviewUrl),
  videoThumbnailUrl: absoluteUrl(req, payload.videoThumbnailUrl),
});

const getOwner = (req: Request) => ({
  userId: req.user?.id ?? null,
  guestId: req.header('x-guest-id') ?? null,
});

export const downloadController = {
  async list(req: Request, res: Response) {
    const { limit, offset } = req.query as unknown as {
      limit: number;
      offset: number;
    };
    const { items, total } = await downloadService.list(
      req.user!.id,
      limit,
      offset,
    );

    response.success(
      res,
      items.map(wallpaper => ({
        ...toWallpaperDTO(req, wallpaper),
        downloadedAt: wallpaper.downloadedAt,
      })),
      { pagination: buildPagination(total, limit, offset, items.length) },
    );
  },

  async preflight(req: Request, res: Response) {
    const result = await downloadService.preflight({
      wallpaperId: req.body.wallpaperId,
      ...getOwner(req),
    });
    response.success(res, withAbsoluteMedia(req, result), {
      message: 'Download allowed',
    });
  },

  async commit(req: Request, res: Response) {
    const result = await downloadService.commit({
      wallpaperId: req.body.wallpaperId,
      clientRequestId: req.body.clientRequestId,
      ...getOwner(req),
    });
    response.success(res, withAbsoluteMedia(req, result), {
      status: result.idempotent ? 200 : 201,
      message: result.idempotent
        ? 'Download already recorded'
        : 'Download recorded',
    });
  },

  async record(req: Request, res: Response) {
    const result = await downloadService.record({
      wallpaperId: req.body.wallpaperId,
      ...getOwner(req),
    });
    response.success(res, withAbsoluteMedia(req, result), {
      status: 201,
      message: 'Download recorded',
    });
  },
};