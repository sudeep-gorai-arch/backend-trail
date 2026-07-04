import { Router } from "express";

import { likeController } from "../controllers/like.controller";

import { authenticate } from "../middlewares/auth.middleware";

import { validate } from "../middlewares/validate.middleware";

import { asyncHandler } from "../utils/asyncHandler";

import {
    likeParams,
} from "../validations/like.validation";

const router = Router();

router.use(authenticate);

// Like
router.post(
    "/:wallpaperId",
    validate({
        params: likeParams,
    }),
    asyncHandler(
        likeController.like
    )
);

// Unlike
router.delete(
    "/:wallpaperId",
    validate({
        params: likeParams,
    }),
    asyncHandler(
        likeController.unlike
    )
);

// Status
router.get(
    "/:wallpaperId/status",
    validate({
        params: likeParams,
    }),
    asyncHandler(
        likeController.status
    )
);

export default router;