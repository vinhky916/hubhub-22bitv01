import { Router } from 'express';
import authController from '../controllers/auth.controller';
import { validateRequest } from '../../infrastructure/middlewares/validation.middleware';
import { requireAuth, requireRole } from '../../infrastructure/middlewares/auth.middleware';
import { Role } from '@prisma/client';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../dtos/auth.dto';

const router = Router();

router.post('/register', validateRequest(registerSchema), authController.register);
router.post('/verify-email', validateRequest(verifyEmailSchema), authController.verifyEmail);
router.post('/resend-otp', authController.resendOTP);
router.post('/check-otp', authController.checkOTP);
router.post('/login', validateRequest(loginSchema), authController.login);
router.post('/refresh-token', authController.refresh);
router.post('/logout', authController.logout);
router.post('/forgot-password', validateRequest(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', validateRequest(resetPasswordSchema), authController.resetPassword);

// --- Google & Facebook OAuth ---
router.get('/google', authController.redirectToGoogle);
router.get('/google/callback', authController.handleGoogleCallback);
router.get('/facebook', authController.redirectToFacebook);
router.get('/facebook/callback', authController.handleFacebookCallback);

// Các route yêu cầu đăng nhập
router.get('/me', requireAuth, authController.getMe);
router.put('/profile', requireAuth, validateRequest(updateProfileSchema), authController.updateProfile);
router.get('/notifications', requireAuth, authController.getMyNotifications);
router.put('/notifications/:id/read', requireAuth, authController.markNotificationAsRead);

// --- Admin routes ---
router.get('/admin/users', requireAuth, requireRole([Role.ADMIN]), authController.getAllUsers);
router.put('/admin/users/:id/toggle-approve', requireAuth, requireRole([Role.ADMIN]), authController.toggleApproveUser);
router.delete('/admin/users/:id', requireAuth, requireRole([Role.ADMIN]), authController.deleteUser);
router.get('/admin/bookings', requireAuth, requireRole([Role.ADMIN]), authController.getAllBookings);
router.get('/admin/payments', requireAuth, requireRole([Role.ADMIN]), authController.getAllPayments);
router.get('/admin/reviews', requireAuth, requireRole([Role.ADMIN]), authController.getAllReviews);

export default router;
