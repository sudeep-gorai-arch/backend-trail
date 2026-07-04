import { Router } from "express";
import { z } from "zod";

import { downloadController } from "../controllers/download.controller";

import {
  authenticate,
  optionalAuthenticate,
} from "../middlewares/auth.middleware";

import { validate } from "../middlewares/validate.middleware";

import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

const pageQuery = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(20),

  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),
});

const recordBody = z.object({
  wallpaperId: z.string().uuid(),
});

/*
---------------------------------
DOWNLOAD HISTORY (LOGIN REQUIRED)
---------------------------------
*/

router.get(
  "/",
  authenticate,
  validate({
    query: pageQuery,
  }),
  asyncHandler(downloadController.list)
);

/*
---------------------------------
DOWNLOAD WALLPAPER
(GUEST OR LOGGED IN)
---------------------------------
*/

router.post(
  "/",
  optionalAuthenticate,
  validate({
    body: recordBody,
  }),
  asyncHandler(downloadController.record)
);

export default router;