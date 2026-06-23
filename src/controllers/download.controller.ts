import { Request, Response } from 'express';
import { downloadService } from '../services/download.service';
import { toWallpaperDTO } from '../utils/dto';
import { sendSuccess, buildPagination } from '../utils/ApiResponse';

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
    sendSuccess(
      res,
      items.map((w) => ({
        ...toWallpaperDTO(req, w),
        downloadedAt: w.downloadedAt,
      })),
      { pagination: buildPagination(total, limit, offset, items.length) },
    );
  },

  async record(req: Request, res: Response) {
    const { wallpaperId } = req.body as { wallpaperId: string };
    const download = await downloadService.record(req.user!.id, wallpaperId);
    sendSuccess(res, download, { status: 201, message: 'Download recorded' });
  },

  async recordPublic(
    req: Request,
    res: Response
  ) {


    const {
      wallpaperId
    } = req.body as {
      wallpaperId: string
    };



    const download =
      await downloadService.recordPublic(
        wallpaperId
      );



    sendSuccess(
      res,
      download,
      {
        status: 201,
        message: 'Download recorded'
      }
    );


  }
};
