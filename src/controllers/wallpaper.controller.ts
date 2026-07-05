import { Request, Response } from "express";

import { WallpaperQuality } from "@prisma/client";

import { wallpaperService } from "../services/wallpaper.service";

import { response, buildPagination } from "../utils/ApiResponse";

import { ApiError } from "../utils/ApiError";

import { toWallpaperDTO } from "../utils/dto";

// ======================================================
// HELPERS
// ======================================================

function parseBooleanQuery(
  value: unknown
): boolean | undefined {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return undefined;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return parseBooleanQuery(value[0]);
  }

  const normalized = String(value).trim().toLowerCase();

  if (
    normalized === "true" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "on"
  ) {
    return true;
  }

  if (
    normalized === "false" ||
    normalized === "0" ||
    normalized === "no" ||
    normalized === "off"
  ) {
    return false;
  }

  return undefined;
}

function parseNumberQuery(
  value: unknown,
  fallback: number
): number {
  const parsed = Number(value);

  if (Number.isFinite(parsed) && parsed >= 0) {
    return parsed;
  }

  return fallback;
}

export const wallpaperController = {
  // ======================================================
  // LIST
  // ======================================================

  async list(
    req: Request,
    res: Response
  ) {
    const limit = parseNumberQuery(req.query.limit, 20);

    const offset = parseNumberQuery(req.query.offset, 0);

    const search = req.query.search as string | undefined;

    const category = req.query.category as string | undefined;

    const premium =
      parseBooleanQuery(req.query.premium);

    const featured =
      parseBooleanQuery(req.query.featured);

    const active =
      parseBooleanQuery(req.query.active);

    const quality =
      req.query.quality as WallpaperQuality | undefined;

    const sort =
      req.query.sort as
        | "latest"
        | "popular"
        | "downloads"
        | "likes"
        | "featured"
        | undefined;

    const { items, total } =
      await wallpaperService.list({
        limit,
        offset,
        search,
        category,
        premium,
        featured,
        active,
        quality,
        sort,
      });

    response.success(
      res,
      items.map((wallpaper) =>
        toWallpaperDTO(req, wallpaper)
      ),
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

  // ======================================================
  // FEATURED
  // ======================================================

  async featured(
    req: Request,
    res: Response
  ) {
    const limit =
      parseNumberQuery(req.query.limit, 10);

    const wallpapers =
      await wallpaperService.getFeatured(
        limit
      );

    response.success(
      res,
      wallpapers.map((wallpaper) =>
        toWallpaperDTO(
          req,
          wallpaper
        )
      )
    );
  },

  // ======================================================
  // TRENDING
  // ======================================================

  async trending(
    req: Request,
    res: Response
  ) {
    const limit =
      parseNumberQuery(req.query.limit, 20);

    const wallpapers =
      await wallpaperService.getTrending(
        limit
      );

    response.success(
      res,
      wallpapers.map((wallpaper) =>
        toWallpaperDTO(
          req,
          wallpaper
        )
      )
    );
  },

  // ======================================================
  // TOP WEEK
  // ======================================================

  async topWeek(
    req: Request,
    res: Response
  ) {
    const limit =
      parseNumberQuery(req.query.limit, 10);

    const category =
      (req.query.categorySlug || req.query.category) as string | undefined;

    const wallpapers =
      await wallpaperService.getTopWeek({
        limit,
        category,
      });

    response.success(
      res,
      wallpapers.map((wallpaper) =>
        toWallpaperDTO(
          req,
          wallpaper
        )
      )
    );
  },

  // ======================================================
  // PREMIUM
  // ======================================================

  async premium(
    req: Request,
    res: Response
  ) {
    const limit =
      parseNumberQuery(req.query.limit, 20);

    const wallpapers =
      await wallpaperService.getPremium(
        limit
      );

    response.success(
      res,
      wallpapers.map((wallpaper) =>
        toWallpaperDTO(
          req,
          wallpaper
        )
      )
    );
  },

  // ======================================================
  // GET BY ID
  // ======================================================

  async getById(
    req: Request,
    res: Response
  ) {
    const wallpaper =
      await wallpaperService.getById(
        req.params.id
      );

    response.success(
      res,
      toWallpaperDTO(
        req,
        wallpaper
      )
    );
  },

  // ======================================================
  // GET BY SLUG
  // ======================================================

  async getBySlug(
    req: Request,
    res: Response
  ) {
    const wallpaper =
      await wallpaperService.getBySlug(
        req.params.slug
      );

    response.success(
      res,
      toWallpaperDTO(
        req,
        wallpaper
      )
    );
  },

  // ======================================================
  // GET BY CATEGORY
  // ======================================================

  async getByCategory(
    req: Request,
    res: Response
  ) {
    const limit =
      parseNumberQuery(req.query.limit, 20);

    const offset =
      parseNumberQuery(req.query.offset, 0);

    const {
      category,
      items,
      total,
    } =
      await wallpaperService.getByCategory(
        req.params.slug,
        limit,
        offset
      );

    response.success(
      res,
      {
        category,

        wallpapers: items.map(
          (wallpaper) =>
            toWallpaperDTO(
              req,
              wallpaper
            )
        ),
      },
      {
        pagination:
          buildPagination(
            total,
            limit,
            offset,
            items.length
          ),
      }
    );
  },

  // ======================================================
  // SEARCH
  // ======================================================

  async search(
    req: Request,
    res: Response
  ) {
    const q = req.query.q as string;

    const limit =
      parseNumberQuery(req.query.limit, 20);

    const offset =
      parseNumberQuery(req.query.offset, 0);

    const {
      items,
      total,
    } =
      await wallpaperService.search(
        q,
        limit,
        offset
      );

    response.success(
      res,
      items.map((wallpaper) =>
        toWallpaperDTO(
          req,
          wallpaper
        )
      ),
      {
        pagination:
          buildPagination(
            total,
            limit,
            offset,
            items.length
          ),
      }
    );
  },

  // ======================================================
  // RELATED
  // ======================================================

  async related(
    req: Request,
    res: Response
  ) {
    const limit =
      parseNumberQuery(req.query.limit, 10);

    const wallpapers =
      await wallpaperService.related(
        req.params.id,
        limit
      );

    response.success(
      res,
      wallpapers.map(
        (wallpaper) =>
          toWallpaperDTO(
            req,
            wallpaper
          )
      )
    );
  },

  // ======================================================
  // CREATE
  // ======================================================

  async create(
    req: Request,
    res: Response
  ) {
    if (!req.file) {
      throw ApiError.badRequest(
        "Wallpaper image is required."
      );
    }

    const wallpaper =
      await wallpaperService.create(
        req.file,
        req.body
      );

    response.created(
      res,
      toWallpaperDTO(
        req,
        wallpaper
      ),
      "Wallpaper uploaded successfully."
    );
  },

  // ======================================================
  // BATCH UPLOAD
  // ======================================================

  async batchUpload(
    req: Request,
    res: Response
  ) {
    const files =
      req.files as Express.Multer.File[];

    if (
      !files ||
      files.length === 0
    ) {
      throw ApiError.badRequest(
        "Wallpaper images are required."
      );
    }

    const wallpapers =
      await wallpaperService.createMany(
        files,
        req.body
      );

    response.created(
      res,
      wallpapers.map(
        (wallpaper) =>
          toWallpaperDTO(
            req,
            wallpaper
          )
      ),
      `${wallpapers.length} wallpapers uploaded successfully.`
    );
  },

  // ======================================================
  // UPDATE
  // ======================================================

  async update(
    req: Request,
    res: Response
  ) {
    const wallpaper =
      await wallpaperService.update(
        req.params.id,
        req.body
      );

    response.success(
      res,
      toWallpaperDTO(
        req,
        wallpaper
      ),
      {
        message:
          "Wallpaper updated successfully.",
      }
    );
  },

  // ======================================================
  // DELETE
  // ======================================================

  async delete(
    req: Request,
    res: Response
  ) {
    await wallpaperService.delete(
      req.params.id
    );

    response.success(
      res,
      {
        deleted: true,
      },
      {
        message:
          "Wallpaper deleted successfully.",
      }
    );
  },

  // ======================================================
  // TOGGLE FEATURED
  // ======================================================

  async toggleFeatured(
    req: Request,
    res: Response
  ) {
    const wallpaper =
      await wallpaperService.toggleFeatured(
        req.params.id
      );

    response.success(
      res,
      toWallpaperDTO(
        req,
        wallpaper
      ),
      {
        message:
          wallpaper.isFeatured
            ? "Wallpaper marked as featured."
            : "Wallpaper removed from featured.",
      }
    );
  },

  // ======================================================
  // TOGGLE PREMIUM
  // ======================================================

  async togglePremium(
    req: Request,
    res: Response
  ) {
    const wallpaper =
      await wallpaperService.togglePremium(
        req.params.id
      );

    response.success(
      res,
      toWallpaperDTO(
        req,
        wallpaper
      ),
      {
        message:
          wallpaper.isPremium
            ? "Wallpaper marked as premium."
            : "Wallpaper removed from premium.",
      }
    );
  },

  // ======================================================
  // TOGGLE ACTIVE
  // ======================================================

  async toggleActive(
    req: Request,
    res: Response
  ) {
    const wallpaper =
      await wallpaperService.toggleActive(
        req.params.id
      );

    response.success(
      res,
      toWallpaperDTO(
        req,
        wallpaper
      ),
      {
        message:
          wallpaper.active
            ? "Wallpaper activated."
            : "Wallpaper deactivated.",
      }
    );
  },

  // ======================================================
  // INCREMENT VIEW COUNT
  // ======================================================

  async incrementViews(
    req: Request,
    res: Response
  ) {
    await wallpaperService.incrementViews(
      req.params.id
    );

    response.success(
      res,
      {
        success: true,
      }
    );
  },

  // ======================================================
  // INCREMENT DOWNLOAD COUNT
  // ======================================================

  async incrementDownloads(
    req: Request,
    res: Response
  ) {
    await wallpaperService.incrementDownloads(
      req.params.id
    );

    response.success(
      res,
      {
        success: true,
      }
    );
  },
};