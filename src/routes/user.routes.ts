import { Router } from "express";

import { authenticate } from "../middlewares/auth.middleware";

import { asyncHandler } from "../utils/asyncHandler";

import { userController } from "../controllers/user.controller";

const router = Router();

router.use(authenticate);

// ==============================
// ME
// GET /api/users/me
// ==============================

router.get(
  "/me",
  asyncHandler(userController.me)
);

// ==============================
// UPDATE PROFILE
// PUT /api/users/me
// ==============================

router.put(
  "/me",
  asyncHandler(userController.updateProfile)
);

// ==============================
// DELETE ACCOUNT AND DATA
// DELETE /api/users/me
// ==============================

router.delete(
  "/me",
  asyncHandler(userController.deleteAccount)
);

export default router;