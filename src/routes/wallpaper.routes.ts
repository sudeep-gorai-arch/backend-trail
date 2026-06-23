import { Router } from 'express';
import { z } from 'zod';

import { wallpaperController } from '../controllers/wallpaper.controller';

import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

// your multer middleware
import { upload } from '../middlewares/upload.middleware';


const router = Router();


const listQuery = z.object({

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),

  offset: z.coerce
    .number()
    .int()
    .min(0)
    .default(0),

  search: z
    .string()
    .trim()
    .min(1)
    .optional(),

  category: z
    .string()
    .trim()
    .min(1)
    .optional(),

});



const limitQuery = z.object({

  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),

});



const idParam = z.object({

  id: z.string().uuid(),

});





// ======================================
// CREATE SINGLE WALLPAPER
// POST /api/wallpapers
// ======================================

router.post(
  '/',
  upload.single('image'),
  asyncHandler(
    wallpaperController.create
  ),
);




// ======================================
// BATCH UPLOAD WALLPAPERS
// POST /api/wallpapers/batch
// ======================================

router.post(
  '/batch',
  upload.array(
    'images',
    50
  ),
  asyncHandler(
    wallpaperController.batchUpload
  ),
);





// ======================================
// FEATURED
// GET /api/wallpapers/featured
// ======================================

router.get(
  '/featured',

  validate({
    query: limitQuery
  }),

  asyncHandler(
    wallpaperController.featured
  ),

);





// ======================================
// TRENDING
// GET /api/wallpapers/trending
// ======================================

router.get(
  '/trending',

  validate({
    query: limitQuery
  }),

  asyncHandler(
    wallpaperController.trending
  ),

);







// ======================================
// GET WALLPAPER BY ID
// GET /api/wallpapers/:id
// ======================================

router.get(
  '/:id',

  validate({
    params: idParam
  }),

  asyncHandler(
    wallpaperController.getById
  ),

);






// ======================================
// UPDATE WALLPAPER
// PUT /api/wallpapers/:id
// ======================================

router.put(
  '/:id',

  validate({
    params: idParam
  }),

  asyncHandler(
    wallpaperController.update
  ),

);







// ======================================
// DELETE WALLPAPER
// DELETE /api/wallpapers/:id
// ======================================

router.delete(
  '/:id',

  validate({
    params: idParam
  }),

  asyncHandler(
    wallpaperController.delete
  ),

);







// ======================================
// LIST WALLPAPERS
// GET /api/wallpapers
// keep last
// ======================================

router.get(
  '/',

  validate({
    query: listQuery
  }),

  asyncHandler(
    wallpaperController.list
  ),

);



export default router;