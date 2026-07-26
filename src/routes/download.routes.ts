import { Router } from 'express';
import { z } from 'zod';

import { downloadController } from '../controllers/download.controller';
import {
  authenticate,
  optionalAuthenticate,
} from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const preflightBody = z.object({
  wallpaperId: z.string().uuid(),
});

const commitBody = preflightBody.extend({
  clientRequestId: z.string().uuid(),
});

router.get(
  '/',
  authenticate,
  validate({ query: pageQuery }),
  asyncHandler(downloadController.list),
);

// Logged-in flow. Authentication is optional here to preserve the old endpoint,
// but the frontend uses /public/* for guests so ownership is unambiguous.
router.post(
  '/preflight',
  optionalAuthenticate,
  validate({ body: preflightBody }),
  asyncHandler(downloadController.preflight),
);
router.post(
  '/commit',
  optionalAuthenticate,
  validate({ body: commitBody }),
  asyncHandler(downloadController.commit),
);

// Explicit guest routes ignore any Authorization header and use x-guest-id.
router.post(
  '/public/preflight',
  validate({ body: preflightBody }),
  asyncHandler(downloadController.preflight),
);
router.post(
  '/public/commit',
  validate({ body: commitBody }),
  asyncHandler(downloadController.commit),
);

// Backward-compatible endpoint for already-released app builds.
router.post(
  '/',
  optionalAuthenticate,
  validate({ body: preflightBody }),
  asyncHandler(downloadController.record),
);

export default router;