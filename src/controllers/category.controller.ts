import { Request, Response } from "express";

import { categoryService } from "../services/category.service";

import { toCategoryDTO } from "../utils/dto/category.dto";

import { response } from "../utils/ApiResponse";

import { uploadImageToR2 } from "../services/r2.service";

// ======================================
// HELPERS
// ======================================

const safeFolderName = (value?: string | null) => {
  return String(value || "category")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const uploadCategoryThumbnail = async (
  req: Request,
  fallback?: string | null
) => {
  if (!req.file) {
    return fallback ?? null;
  }

  const folderSlug = safeFolderName(req.body.slug || req.body.name);

  const uploaded = await uploadImageToR2(
    req.file,
    `categories/${folderSlug}`
  );

  return uploaded.url;
};

// ======================================
// CONTROLLER
// ======================================

export const categoryController = {
  // ======================================
  // LIST
  // ======================================

  async list(
    req: Request,
    res: Response
  ) {
    const categories = await categoryService.list({
      active:
        typeof req.query.active === "boolean"
          ? req.query.active
          : undefined,

      premiumOnly:
        typeof req.query.premiumOnly === "boolean"
          ? req.query.premiumOnly
          : undefined,
    });

    return response.success(
      res,
      categories.map(category =>
        toCategoryDTO(req, category)
      )
    );
  },

  // ======================================
  // GET BY SLUG
  // ======================================

  async getBySlug(req: Request, res: Response) {
    const category = await categoryService.getBySlug(req.params.slug);

    return response.success(res, toCategoryDTO(req, category));
  },

  // ======================================
  // CREATE
  // ======================================

  async create(req: Request, res: Response) {
    const thumbnailUrl = await uploadCategoryThumbnail(
      req,
      req.body.thumbnailUrl ?? null
    );

    const category = await categoryService.create({
      name: req.body.name,

      slug: req.body.slug,

      icon: req.body.icon,

      description: req.body.description,

      folderName: req.body.folderName,

      coverImage: req.body.coverImage,

      thumbnailUrl,

      active: req.body.active,

      sortOrder: req.body.sortOrder,
    });

    return response.created(
      res,
      toCategoryDTO(req, category),
      "Category created successfully."
    );
  },

  // ======================================
  // UPDATE
  // ======================================

  async update(req: Request, res: Response) {
    const thumbnailUrl =
      req.file
        ? await uploadCategoryThumbnail(req, req.body.thumbnailUrl)
        : req.body.thumbnailUrl;

    const category = await categoryService.update(req.params.slug, {
      name: req.body.name,

      slug: req.body.slug,

      icon: req.body.icon,

      description: req.body.description,

      coverImage: req.body.coverImage,

      thumbnailUrl,

      active: req.body.active,

      sortOrder: req.body.sortOrder,
    });

    return response.success(res, toCategoryDTO(req, category), {
      message: "Category updated successfully.",
    });
  },

  // ======================================
  // DELETE
  // ======================================

  async delete(req: Request, res: Response) {
    const result = await categoryService.delete(req.params.slug);

    return response.success(
      res,
      {
        deleted: true,

        category: toCategoryDTO(req, result.category),
      },
      {
        message: "Category deleted successfully.",
      }
    );
  },

  // ======================================
  // TOGGLE ACTIVE
  // ======================================

  async toggleActive(req: Request, res: Response) {
    const category = await categoryService.toggleActive(req.params.slug);

    return response.success(res, toCategoryDTO(req, category), {
      message: "Category status updated.",
    });
  },

  // ======================================
  // REORDER
  // ======================================

  async reorder(req: Request, res: Response) {
    const category = await categoryService.reorder(
      req.params.slug,
      Number(req.body.sortOrder)
    );

    return response.success(res, toCategoryDTO(req, category), {
      message: "Category reordered successfully.",
    });
  },
};