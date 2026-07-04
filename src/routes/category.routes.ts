import { Router } from "express";

import { categoryController } from "../controllers/category.controller";

import { validate } from "../middlewares/validate.middleware";

import { asyncHandler } from "../utils/asyncHandler";

import { upload } from "../middlewares/upload.middleware";

import { compressCategoryThumbnail } from "../middlewares/categoryThumbnail.middleware";

import {
  categorySlugParams,
  categoryListQuery,
  createCategoryBody,
  updateCategoryBody,
  reorderCategoryBody,
} from "../validations/category.validation";

const router = Router();

// ======================================================
// PUBLIC ROUTES
// ======================================================

// GET /api/categories
router.get(
  "/",
  validate({
    query: categoryListQuery,
  }),
  asyncHandler(categoryController.list)
);

// GET /api/categories/:slug
router.get(
  "/:slug",
  validate({
    params: categorySlugParams,
  }),
  asyncHandler(categoryController.getBySlug)
);

// ======================================================
// ADMIN ROUTES
// ======================================================

// POST /api/categories
router.post(
  "/",
  upload.single("thumbnail"),
  compressCategoryThumbnail,
  validate({
    body: createCategoryBody,
  }),
  asyncHandler(categoryController.create)
);

// PUT /api/categories/:slug
router.put(
  "/:slug",
  upload.single("thumbnail"),
  compressCategoryThumbnail,
  validate({
    params: categorySlugParams,
    body: updateCategoryBody,
  }),
  asyncHandler(categoryController.update)
);

// PATCH /api/categories/:slug
router.patch(
  "/:slug",
  upload.single("thumbnail"),
  compressCategoryThumbnail,
  validate({
    params: categorySlugParams,
    body: updateCategoryBody,
  }),
  asyncHandler(categoryController.update)
);

// PATCH /api/categories/:slug/toggle
router.patch(
  "/:slug/toggle",
  validate({
    params: categorySlugParams,
  }),
  asyncHandler(categoryController.toggleActive)
);

// PATCH /api/categories/:slug/reorder
router.patch(
  "/:slug/reorder",
  validate({
    params: categorySlugParams,
    body: reorderCategoryBody,
  }),
  asyncHandler(categoryController.reorder)
);

// DELETE /api/categories/:slug
router.delete(
  "/:slug",
  validate({
    params: categorySlugParams,
  }),
  asyncHandler(categoryController.delete)
);

export default router;