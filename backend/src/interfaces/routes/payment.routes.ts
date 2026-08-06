import { Router } from 'express';
import paymentController from '../controllers/payment.controller';
import { requireAuth } from '../../infrastructure/middlewares/auth.middleware';

const router = Router();

// Stripe routes
router.post('/stripe/intent', paymentController.createStripeIntent);
router.post('/stripe/confirm', paymentController.confirmStripePayment);
router.post('/stripe-webhook', paymentController.handleStripeWebhook);

// VNPay routes
router.post('/vnpay/url', paymentController.generateVnPayUrl);
router.get('/vnpay-callback', paymentController.handleVnPayCallback);

// PayPal Sandbox routes
router.post('/paypal/create-order', paymentController.generatePayPalCheckout);
router.post('/paypal/checkout', paymentController.generatePayPalCheckout);
router.post('/paypal/capture-order', paymentController.confirmPayPalPayment);
router.post('/paypal/confirm', paymentController.confirmPayPalPayment);
router.get('/paypal-callback', paymentController.handlePayPalCallback);

export default router;
