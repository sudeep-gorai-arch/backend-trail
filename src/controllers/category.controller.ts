import { Request, Response } from 'express';
import { categoryService } from '../services/category.service';
import { toWallpaperDTO } from '../utils/dto';
import { sendSuccess, buildPagination } from '../utils/ApiResponse';

export const categoryController = {
  async list(_req: Request, res: Response) {
    const categories = await categoryService.list();
    sendSuccess(res, categories);
  },

  async wallpapers(req: Request, res: Response) {
    const { limit, offset } = req.query as unknown as {
      limit: number;
      offset: number;
    };
    const { category, items, total } = await categoryService.getWallpapers(
      req.params.slug,
      limit,
      offset,
    );
    sendSuccess(
      res,
      {
        category: {
          id: category.id,
          name: category.name,
          slug: category.slug,
          icon: category.icon,
        },
        wallpapers: items.map((w) => toWallpaperDTO(req, w)),
      },
      { pagination: buildPagination(total, limit, offset, items.length) },
    );
  },
};
