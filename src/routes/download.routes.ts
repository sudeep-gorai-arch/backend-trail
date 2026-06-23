// import { Router } from 'express';
// import { z } from 'zod';
// import { downloadController } from '../controllers/download.controller';
// import { authenticate } from '../middlewares/auth.middleware';
// import { validate } from '../middlewares/validate.middleware';
// import { asyncHandler } from '../utils/asyncHandler';

// const router = Router();

// router.use(authenticate);

// const pageQuery = z.object({
//   limit: z.coerce.number().int().min(1).max(50).default(20),
//   offset: z.coerce.number().int().min(0).default(0),
// });
// const recordBody = z.object({ wallpaperId: z.string().uuid() });

// // GET /api/downloads
// router.get('/', validate({ query: pageQuery }), asyncHandler(downloadController.list));
// // POST /api/downloads
// router.post('/', validate({ body: recordBody }), asyncHandler(downloadController.record));

// export default router;

import { Router } from 'express';
import { z } from 'zod';

import { downloadController }
  from '../controllers/download.controller';

import { authenticate }
  from '../middlewares/auth.middleware';

import { validate }
  from '../middlewares/validate.middleware';

import { asyncHandler }
  from '../utils/asyncHandler';



const router = Router();



const pageQuery = z.object({

  limit:
    z.coerce
      .number()
      .int()
      .min(1)
      .max(50)
      .default(20),


  offset:
    z.coerce
      .number()
      .int()
      .min(0)
      .default(0),

});



const recordBody =
  z.object({

    wallpaperId:
      z.string().uuid()

  });





/*
-------------------------------
AUTH ROUTES
-------------------------------
*/


router.get(
  '/',
  authenticate,
  validate({
    query: pageQuery
  }),
  asyncHandler(
    downloadController.list
  )
);



router.post(
  '/',
  authenticate,
  validate({
    body: recordBody
  }),
  asyncHandler(
    downloadController.record
  )
);






/*
-------------------------------
PUBLIC DOWNLOAD
-------------------------------
*/


router.post(
  '/public',
  validate({
    body: recordBody
  }),
  asyncHandler(
    downloadController.recordPublic
  )
);



export default router;
