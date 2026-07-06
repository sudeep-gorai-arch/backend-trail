import { Router } from "express";

import { wallpaperController } from "../controllers/wallpaper.controller";

import { upload } from "../middlewares/upload.middleware";
import { validate } from "../middlewares/validate.middleware";

import { asyncHandler } from "../utils/asyncHandler";

import {
  wallpaperIdParams,
  wallpaperSlugParams,
  wallpaperListQuery,
  wallpaperSearchQuery,
  createWallpaperBody,
  updateWallpaperBody,
} from "../validations/wallpaper.validation";

const router = Router();

// ======================================================
// LIST
// GET /api/wallpapers
// ======================================================

router.get(
  "/",
  validate({
    query: wallpaperListQuery,
  }),
  asyncHandler(wallpaperController.list)
);

// ======================================================
// FEATURED
// GET /api/wallpapers/featured
// ======================================================

router.get("/featured", asyncHandler(wallpaperController.featured));

// ======================================================
// TRENDING
// GET /api/wallpapers/trending
// ======================================================

router.get("/trending", asyncHandler(wallpaperController.trending));

// ======================================================
// TOP WEEK
// GET /api/wallpapers/top-week
//
// Important:
// This route must stay above "/:id".
// It returns the top downloaded wallpapers from the last 7 days.
// Optional query params:
// limit=10
// category=abstract
// categorySlug=abstract
// ======================================================

router.get("/top-week", asyncHandler(wallpaperController.topWeek));

// ======================================================
// PREMIUM
// GET /api/wallpapers/premium
// ======================================================

router.get("/premium", asyncHandler(wallpaperController.premium));

// ======================================================
// SEARCH
// GET /api/wallpapers/search
//
// Important:
// This route must stay above "/:id".
// ======================================================

router.get(
  "/search",
  validate({
    query: wallpaperSearchQuery,
  }),
  asyncHandler(wallpaperController.search)
);

// ======================================================
// CATEGORY WALLPAPERS
// GET /api/wallpapers/category/:slug
//
// Important:
// This route must stay above "/:id".
// ======================================================

router.get(
  "/category/:slug",
  validate({
    params: wallpaperSlugParams,
    query: wallpaperListQuery,
  }),
  asyncHandler(wallpaperController.getByCategory)
);

// ======================================================
// GET BY SLUG
// GET /api/wallpapers/slug/:slug
//
// Important:
// This route must stay above "/:id".
// ======================================================

router.get(
  "/slug/:slug",
  validate({
    params: wallpaperSlugParams,
  }),
  asyncHandler(wallpaperController.getBySlug)
);

// ======================================================
// RELATED WALLPAPERS
// GET /api/wallpapers/:id/related
// ======================================================

router.get(
  "/:id/related",
  validate({
    params: wallpaperIdParams,
  }),
  asyncHandler(wallpaperController.related)
);

// ======================================================
// GET BY ID
// GET /api/wallpapers/:id
//
// Keep this below all static routes like:
// /featured
// /trending
// /top-week
// /premium
// /search
// /category/:slug
// /slug/:slug
// ======================================================

router.get(
  "/:id",
  validate({
    params: wallpaperIdParams,
  }),
  asyncHandler(wallpaperController.getById)
);

// ======================================================
// CREATE
// POST /api/wallpapers
// multipart/form-data
//
// Supported fields:
// image => static wallpaper image
// video => video wallpaper file
// previewImage => optional image preview for video wallpaper
// thumbnail => optional thumbnail image for video wallpaper
//
// Old image-only upload remains supported.
// ======================================================

router.post(
  "/",
  upload.fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "video",
      maxCount: 1,
    },
    {
      name: "previewImage",
      maxCount: 1,
    },
    {
      name: "thumbnail",
      maxCount: 1,
    },
  ]),
  validate({
    body: createWallpaperBody,
  }),
  asyncHandler(wallpaperController.create)
);

// ======================================================
// BATCH UPLOAD
// POST /api/wallpapers/batch
// multipart/form-data
//
// Supported fields:
// images => static wallpaper image files
// videos => video wallpaper files
// previewImages => optional preview image files
// thumbnails => optional thumbnail image files
//
// Old image-only batch upload remains supported.
// ======================================================

router.post(
  "/batch",
  upload.fields([
    {
      name: "images",
      maxCount: 50,
    },
    {
      name: "videos",
      maxCount: 50,
    },
    {
      name: "previewImages",
      maxCount: 50,
    },
    {
      name: "thumbnails",
      maxCount: 50,
    },
  ]),
  asyncHandler(wallpaperController.batchUpload)
);

// ======================================================
// UPDATE
// PUT /api/wallpapers/:id
// ======================================================

router.put(
  "/:id",
  validate({
    params: wallpaperIdParams,
    body: updateWallpaperBody,
  }),
  asyncHandler(wallpaperController.update)
);

// ======================================================
// DELETE
// DELETE /api/wallpapers/:id
// ======================================================

router.delete(
  "/:id",
  validate({
    params: wallpaperIdParams,
  }),
  asyncHandler(wallpaperController.delete)
);

// ======================================================
// TOGGLE FEATURED
// PATCH /api/wallpapers/:id/featured
// ======================================================

router.patch(
  "/:id/featured",
  validate({
    params: wallpaperIdParams,
  }),
  asyncHandler(wallpaperController.toggleFeatured)
);

// ======================================================
// TOGGLE PREMIUM
// PATCH /api/wallpapers/:id/premium
// ======================================================

router.patch(
  "/:id/premium",
  validate({
    params: wallpaperIdParams,
  }),
  asyncHandler(wallpaperController.togglePremium)
);

// ======================================================
// TOGGLE ACTIVE
// PATCH /api/wallpapers/:id/active
// ======================================================

router.patch(
  "/:id/active",
  validate({
    params: wallpaperIdParams,
  }),
  asyncHandler(wallpaperController.toggleActive)
);

// ======================================================
// VIEW COUNT
// POST /api/wallpapers/:id/view
// ======================================================

router.post(
  "/:id/view",
  validate({
    params: wallpaperIdParams,
  }),
  asyncHandler(wallpaperController.incrementViews)
);

// ======================================================
// DOWNLOAD COUNT
// POST /api/wallpapers/:id/download
// ======================================================

router.post(
  "/:id/download",
  validate({
    params: wallpaperIdParams,
  }),
  asyncHandler(wallpaperController.incrementDownloads)
);

export default router;