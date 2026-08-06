import { Router } from 'express';
import couponController from '../controllers/coupon.controller';
import { requireAuth, optionalAuth } from '../../infrastructure/middlewares/auth.middleware';
import { validateRequest } from '../../infrastructure/middlewares/validation.middleware';
import { createCouponSchema, validateCouponSchema } from '../dtos/booking.dto';

const router = Router();

router.get('/', couponController.list);
router.get('/validate', optionalAuth, validateRequest(validateCouponSchema), couponController.validate);

router.post(
  '/',
  requireAuth,
  validateRequest(createCouponSchema),
  couponController.create
);

router.delete(
  '/:id',
  requireAuth,
  couponController.delete
);

router.patch(
  '/:id/toggle',
  requireAuth,
  couponController.toggle
);

export default router;
