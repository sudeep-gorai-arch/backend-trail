import { Router } from "express";

import { favoriteController } from "../controllers/favorite.controller";

import { authenticate } from "../middlewares/auth.middleware";

import { validate } from "../middlewares/validate.middleware";

import { asyncHandler } from "../utils/asyncHandler";

import {
  favoriteListQuery,
  addFavoriteBody,
  favoriteParams,
} from "../validations/favorite.validation";

const router = Router();

// ======================================
// AUTH REQUIRED
// ======================================

router.use(authenticate);

// ======================================
// LIST FAVORITES
// GET /api/favorites
// ======================================

router.get(
  "/",
  validate({
    query: favoriteListQuery,
  }),
  asyncHandler(favoriteController.list)
);

// ======================================
// ADD FAVORITE
// POST /api/favorites
// Body: { wallpaperId }
// ======================================

router.post(
  "/",
  validate({
    body: addFavoriteBody,
  }),
  asyncHandler(favoriteController.add)
);

// ======================================
// FAVORITE STATUS
// GET /api/favorites/status/:wallpaperId
// Used by mobile app when opening wallpaper details
// ======================================

router.get(
  "/status/:wallpaperId",
  validate({
    params: favoriteParams,
  }),
  asyncHandler(favoriteController.status)
);

// ======================================
// TOGGLE FAVORITE
// POST /api/favorites/toggle/:wallpaperId
// Optional endpoint for one-click add/remove
// ======================================

router.post(
  "/toggle/:wallpaperId",
  validate({
    params: favoriteParams,
  }),
  asyncHandler(favoriteController.toggle)
);

// ======================================
// BACKWARD COMPATIBILITY
// GET /api/favorites/:wallpaperId/status
// ======================================

router.get(
  "/:wallpaperId/status",
  validate({
    params: favoriteParams,
  }),
  asyncHandler(favoriteController.status)
);

// ======================================
// BACKWARD COMPATIBILITY
// POST /api/favorites/:wallpaperId/toggle
// ======================================

router.post(
  "/:wallpaperId/toggle",
  validate({
    params: favoriteParams,
  }),
  asyncHandler(favoriteController.toggle)
);

// ======================================
// REMOVE FAVORITE
// DELETE /api/favorites/:wallpaperId
// ======================================

router.delete(
  "/:wallpaperId",
  validate({
    params: favoriteParams,
  }),
  asyncHandler(favoriteController.remove)
);

export default router;