import { Router } from 'express';
import { z } from 'zod';

import { authController } from '../controllers/auth.controller';

import { validate } from '../middlewares/validate.middleware';
import { authenticate } from '../middlewares/auth.middleware';

import { asyncHandler } from '../utils/asyncHandler';


const router = Router();


const registerSchema = z.object({

  email: z.string().email(),

  username: z
    .string()
    .min(2)
    .max(50),

  password: z
    .string()
    .min(8)
    .max(100),

});



const loginSchema = z.object({

  email: z.string().email(),

  password: z
    .string()
    .min(1),

});




// POST /api/auth/register

router.post(

  '/register',

  validate({
    body: registerSchema
  }),

  asyncHandler(
    authController.register
  )

);




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




export default router;