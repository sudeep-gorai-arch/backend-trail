import { Router } from 'express';
import { z } from 'zod';

import { authController } from '../controllers/auth.controller';

import { validate } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';

import { asyncHandler } from '../utils/asyncHandler';


const router = Router();

const loginSchema = z.object({

  email: z.string().email(),

  password: z
    .string()
    .min(1),

});


// POST /api/auth/login

router.post(

  '/login',

  validate({
    body: loginSchema
  }),

  asyncHandler(
    authController.login
  )

);





// POST /api/auth/logout
// Requires Authorization: Bearer token

router.post(

  '/logout',

  authenticate,

  asyncHandler(
    authController.logout
  )

);

//Google Login
router.post(
  "/google",
  authController.google
);



export default router;