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

// LIST
router.get(
  "/",
  validate({
    query: favoriteListQuery,
  }),
  asyncHandler(favoriteController.list),
);

// LIVE
router.get(
  "/live",
  validate({
    query: favoriteListQuery,
  }),
  asyncHandler(favoriteController.live),
);

// SYNC
router.post(
  "/sync",
  asyncHandler(favoriteController.sync),
);

// ADD
router.post(
  "/",
  validate({
    body: addFavoriteBody,
  }),
  asyncHandler(favoriteController.add),
);

// STATUS
router.get(
  "/status/:wallpaperId",
  validate({
    params: favoriteParams,
  }),
  asyncHandler(favoriteController.status),
);

// TOGGLE
router.post(
  "/toggle/:wallpaperId",
  validate({
    params: favoriteParams,
  }),
  asyncHandler(favoriteController.toggle),
);

// BACKWARD STATUS
router.get(
  "/:wallpaperId/status",
  validate({
    params: favoriteParams,
  }),
  asyncHandler(favoriteController.status),
);

// BACKWARD TOGGLE
router.post(
  "/:wallpaperId/toggle",
  validate({
    params: favoriteParams,
  }),
  asyncHandler(favoriteController.toggle),
);

// REMOVE
router.delete(
  "/:wallpaperId",
  validate({
    params: favoriteParams,
  }),
  asyncHandler(favoriteController.remove),
);

export default router;