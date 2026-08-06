import { Response } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middlewares/auth.middleware';
import { PaymentUseCase } from '../../use-cases/payment/payment.use-case';
import paymentUseCaseInstance from '../../use-cases/payment/payment.use-case';

export class PaymentController {
  constructor(private paymentUseCase: PaymentUseCase) {}

  createStripeIntent = async (req: any, res: Response) => {
    try {
      const { bookingId } = req.body;
      const userId = req.user?.userId || null;

      const data = await this.paymentUseCase.createStripeIntent(bookingId, userId);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  };

  handleStripeWebhook = async (req: any, res: Response) => {
    try {
      const signature = req.headers['stripe-signature'] as string;
      const secret = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_mock';
      const rawBody = req.rawBody || req.body;

      await this.paymentUseCase.handleStripeWebhook(rawBody, signature, secret);
      return res.status(200).json({ received: true });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  };

  generateVnPayUrl = async (req: any, res: Response) => {
    try {
      const { bookingId, bankCode, frontendUrl } = req.body;
      const userId = req.user?.userId || null;

      // Xử lý IP: IPv6 loopback ::ffff:127.0.0.1 → 127.0.0.1
      let ipAddress = req.ip || req.connection?.remoteAddress || '127.0.0.1';
      if (ipAddress === '::1' || ipAddress.startsWith('::ffff:')) {
        ipAddress = '127.0.0.1';
      }

      const baseReturnUrl = process.env.VNPAY_RETURN_URL || 'http://localhost:5000/api/payment/vnpay-callback';
      // Đính kèm origin để callback điều hướng đúng cổng frontend (đặc biệt hữu ích khi phát triển local)
      const returnUrl = `${baseReturnUrl}?origin=${encodeURIComponent(frontendUrl || 'http://localhost:5173')}`;

      const data = await this.paymentUseCase.generateVnPayCheckoutUrl(
        bookingId,
        userId,
        ipAddress,
        returnUrl,
        bankCode
      );
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      console.error('[VNPay] Error generating URL:', err.message);
      return res.status(400).json({ success: false, message: err.message });
    }
  };


  handleVnPayCallback = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const queryParams = req.query;
      const result = await this.paymentUseCase.handleVnPayCallback(queryParams);
      
      const targetOrigin = (queryParams.origin as string) || process.env.FRONTEND_URL || 'http://localhost:5173';
      if (result.success) {
        return res.redirect(`${targetOrigin}/my-bookings?payment=success&bookingId=${result.bookingId}`);
      } else {
        return res.redirect(`${targetOrigin}/checkout?payment=failed&bookingId=${result.bookingId}`);
      }
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  };

  confirmStripePayment = async (req: any, res: Response) => {
    try {
      const { bookingId } = req.body;
      const data = await this.paymentUseCase.confirmStripePayment(bookingId);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  };

  generatePayPalCheckout = async (req: any, res: Response) => {
    try {
      const { bookingId, frontendUrl } = req.body;
      const userId = req.user?.userId || null;
      const data = await this.paymentUseCase.generatePayPalCheckout(bookingId, userId, frontendUrl);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  };

  confirmPayPalPayment = async (req: any, res: Response) => {
    try {
      const { bookingId, paypalTxnId } = req.body;
      const data = await this.paymentUseCase.confirmPayPalPayment(bookingId, paypalTxnId);
      return res.status(200).json({ success: true, data });
    } catch (err: any) {
      return res.status(400).json({ success: false, message: err.message });
    }
  };

  handlePayPalCallback = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const queryParams = req.query as any;
      const bookingId = queryParams.bookingId as string;
      const orderId = (queryParams.token as string) || (queryParams.orderId as string);

      const result = await this.paymentUseCase.confirmPayPalPayment(bookingId, orderId);

      const targetOrigin = (queryParams.origin as string) || process.env.FRONTEND_URL || 'http://localhost:5173';
      if (result.success) {
        return res.redirect(`${targetOrigin}/my-bookings?payment=success&bookingId=${bookingId}&method=paypal`);
      } else {
        return res.redirect(`${targetOrigin}/checkout?payment=failed&bookingId=${bookingId}`);
      }
    } catch (err: any) {
      console.error('[PayPal Callback Error]:', err.message);
      const targetOrigin = (req.query.origin as string) || process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${targetOrigin}/my-bookings?payment=success&bookingId=${req.query.bookingId}`);
    }
  };
}

// Export singleton instance
export default new PaymentController(paymentUseCaseInstance);
