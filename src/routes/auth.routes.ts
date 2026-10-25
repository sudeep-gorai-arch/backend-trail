import { Router } from 'express';
import { rateLimit } from '../middlewares/rateLimit.middleware';
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
  rateLimit('login', { windowMs: 15 * 60_000, max: 30 }),

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
  rateLimit('google-login', { windowMs: 15 * 60_000, max: 60 }),
  validate({ body: z.object({ idToken: z.string().min(1).max(10000) }) }),
  asyncHandler(authController.google),
);



export default router;