import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import errorMiddleware from './infrastructure/middlewares/error.middleware';
import authRoutes from './interfaces/routes/auth.routes';
import hotelRoutes from './interfaces/routes/hotel.routes';
import bookingRoutes from './interfaces/routes/booking.routes';
import couponRoutes from './interfaces/routes/coupon.routes';
import aiRoutes from './interfaces/routes/ai.routes';
import paymentRoutes from './interfaces/routes/payment.routes';
import chatRoutes from './interfaces/routes/chat.routes';
import loyaltyRoutes from './interfaces/routes/loyalty.routes';

const app = express();

// Middlewares bảo mật & cấu hình CORS
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(
  cors({
    origin: (origin, callback) => {
      // Cho phép requests không có origin (như Postman, curl)
      if (!origin) return callback(null, true);
      
      const allowedOrigins = [
        process.env.FRONTEND_URL,
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000'
      ].filter(Boolean) as string[];

      const isLocal = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
      const isAllowed = allowedOrigins.includes(origin) || isLocal;

      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS policy blocked access from origin: ${origin}`));
      }
    },
    credentials: true,
  })
);

// Phân tích dữ liệu JSON và Cookie
app.use(
  express.json({
    limit: '50mb',
    verify: (req: any, _res, buf) => {
      if (req.originalUrl && req.originalUrl.includes('stripe-webhook')) {
        req.rawBody = buf;
      }
    },
  })
);
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Serve static files for uploaded hotel images
import path from 'path';
import fs from 'fs';
const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Route kiểm tra trạng thái hoạt động hệ thống
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

import ratePlanRoutes from './interfaces/routes/rate-plan.routes';
import staffRoutes from './interfaces/routes/staff.routes';

// Định tuyến API các modules
app.use('/api/auth', authRoutes);
app.use('/api/hotels', hotelRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/payment', paymentRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/loyalty', loyaltyRoutes);
app.use('/api/rate-plans', ratePlanRoutes);
app.use('/api/staff', staffRoutes);



// Middleware xử lý lỗi toàn cục (phải đặt cuối)
app.use(errorMiddleware);

export default app;
