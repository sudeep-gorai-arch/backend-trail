import { Router } from 'express';

import { authenticate } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/asyncHandler';

import { subscriptionController } from '../controllers/subscription.controller';

import {
  createOrderBody,
  verifyPaymentBody,
} from '../validations/subscription.validation';

const router = Router();

// ======================================================
// PUBLIC
// ======================================================

// GET /api/subscriptions/plans
router.get('/plans', asyncHandler(subscriptionController.getPlans));

// ======================================================
// PROTECTED
// ======================================================

router.use(authenticate);

// ======================================
// CREATE RAZORPAY ORDER
// POST /api/subscriptions/create-order
// ======================================

router.post(
  '/create-order',
  validate({
    body: createOrderBody,
  }),
  asyncHandler(subscriptionController.createOrder),
);

// ======================================
// VERIFY PAYMENT
// POST /api/subscriptions/verify
// ======================================

router.post(
  '/verify',
  validate({
    body: verifyPaymentBody,
  }),
  asyncHandler(subscriptionController.verifyPayment),
);

// ======================================
// CANCEL SUBSCRIPTION AUTO-RENEWAL
// POST /api/subscriptions/cancel
// ======================================

router.post('/cancel', asyncHandler(subscriptionController.cancelSubscription));

// ======================================
// PREMIUM STATUS
// GET /api/subscriptions/status
// ======================================

router.get('/status', asyncHandler(subscriptionController.getStatus));

export default router;