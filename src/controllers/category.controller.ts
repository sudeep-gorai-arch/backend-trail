import { Request, Response } from "express";

import { categoryService } from "../services/category.service";

import { toCategoryDTO } from "../utils/dto/category.dto";

import { response } from "../utils/ApiResponse";


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
    const categories =
      await categoryService.list();

    return response.success(
      res,
      categories.map((category) =>
        toCategoryDTO(req, category)
      )
    );
  },

  // ======================================
  // GET BY SLUG
  // ======================================

  async getBySlug(
    req: Request,
    res: Response
  ) {
    const category =
      await categoryService.getBySlug(
        req.params.slug
      );

    return response.success(
      res,
      toCategoryDTO(req, category)
    );
  },

  // ======================================
  // CREATE
  // ======================================

  async create(
    req: Request,
    res: Response
  ) {
    const thumbnailUrl =

      req.body.thumbnailUrl ??
      null;

    const category =
      await categoryService.create({
        name: req.body.name,

        slug: req.body.slug,

        icon: req.body.icon,

        description:
          req.body.description,

        folderName:
          req.body.folderName,

        coverImage:
          req.body.coverImage,

        thumbnailUrl,

        active:
          req.body.active,

        sortOrder:
          req.body.sortOrder,
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

  async update(
    req: Request,
    res: Response
  ) {
    const thumbnailUrl =

      req.body.thumbnailUrl;

    const category =
      await categoryService.update(
        req.params.slug,
        {
          name: req.body.name,

          slug: req.body.slug,

          icon: req.body.icon,

          description:
            req.body.description,

          coverImage:
            req.body.coverImage,

          thumbnailUrl,

          active:
            req.body.active,

          sortOrder:
            req.body.sortOrder,
        }
      );

    return response.success(
      res,
      toCategoryDTO(req, category),
      {
        message:
          "Category updated successfully.",
      }
    );
  },

  // ======================================
  // DELETE
  // ======================================

  async delete(
    req: Request,
    res: Response
  ) {
    const result =
      await categoryService.delete(
        req.params.slug
      );

    return response.success(
      res,
      {
        deleted: true,

        category: toCategoryDTO(
          req,
          result.category
        ),
      },
      {
        message:
          "Category deleted successfully.",
      }
    );
  },

  // ======================================
  // TOGGLE ACTIVE
  // ======================================

  async toggleActive(
    req: Request,
    res: Response
  ) {
    const category =
      await categoryService.toggleActive(
        req.params.slug
      );

    return response.success(
      res,
      toCategoryDTO(req, category),
      {
        message:
          "Category status updated.",
      }
    );
  },

  // ======================================
  // REORDER
  // ======================================

  async reorder(
    req: Request,
    res: Response
  ) {
    const category =
      await categoryService.reorder(
        req.params.slug,
        Number(req.body.sortOrder)
      );

    return response.success(
      res,
      toCategoryDTO(req, category),
      {
        message:
          "Category reordered successfully.",
      }
    );
  },
};