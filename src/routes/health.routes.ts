import { Router } from 'express';
import { healthController } from '../controllers/health.controller';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * @route   GET /api/health
 * @desc    Comprehensive system metrics and database connectivity status check
 * @access  Public
 */
router.get('/', asyncHandler(healthController.getHealth));



export default router;
