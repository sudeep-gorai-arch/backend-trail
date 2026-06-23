import { Router } from 'express';
import { userController } from '../controllers/user.controller';
import { authenticate } from '../middlewares/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// GET /api/users/me  (protected)
router.get('/me', authenticate, asyncHandler(userController.me));

export default router;
