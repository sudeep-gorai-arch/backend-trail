import { Request, Response } from "express";

import { downloadService } from "../services/download.service";

import { response, buildPagination } from "../utils/ApiResponse";

import { toWallpaperDTO } from "../utils/dto";

import { absoluteUrl } from "../utils/url";

export const downloadController = {
  async list(req: Request, res: Response) {
    const { limit, offset } = req.query as unknown as {
      limit: number;
      offset: number;
    };

    const { items, total } = await downloadService.list(
      req.user!.id,
      limit,
      offset
    );

    response.success(
      res,
      items.map((w) => ({
        ...toWallpaperDTO(req, w),
        downloadedAt: w.downloadedAt,
      })),
      {
        pagination: buildPagination(
          total,
          limit,
          offset,
          items.length
        ),
      }
    );
  },

  async record(req: Request, res: Response) {
    const { wallpaperId } = req.body as {
      wallpaperId: string;
    };

    const guestId = req.header("x-guest-id") ?? null;
    const userId = req.user?.id ?? null;

    const download = await downloadService.record({
      wallpaperId,
      userId,
      guestId,
    });

    response.success(
      res,
      {
        ...download,
        downloadUrl: absoluteUrl(req, download.downloadUrl),
      },
      {
        status: 201,
        message: "Download recorded",
      }
    );
  },
};