import { Router } from 'express';
import { z } from 'zod';
import { categoryController } from '../controllers/category.controller';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

const slugParam = z.object({ slug: z.string().trim().min(1) });
const pageQuery = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/categories
router.get('/', asyncHandler(categoryController.list));

// GET /api/categories/:slug/wallpapers
router.get(
  '/:slug/wallpapers',
  validate({ params: slugParam, query: pageQuery }),
  asyncHandler(categoryController.wallpapers),
);

export default router;
