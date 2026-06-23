import { Router } from 'express';
import { z } from 'zod';
import { favoriteController } from '../controllers/favorite.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Every favorites route requires a logged-in user.
router.use(authenticate);

const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
const addBody = z.object({ wallpaperId: z.string().uuid() });
const wallpaperParam = z.object({ wallpaperId: z.string().uuid() });

// GET /api/favorites
router.get('/', validate({ query: pageQuery }), asyncHandler(favoriteController.list));
// POST /api/favorites
router.post('/', validate({ body: addBody }), asyncHandler(favoriteController.add));
// DELETE /api/favorites/:wallpaperId
router.delete(
  '/:wallpaperId',
  validate({ params: wallpaperParam }),
  asyncHandler(favoriteController.remove),
);

export default router;
