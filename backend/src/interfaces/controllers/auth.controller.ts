import { Request, Response, NextFunction } from 'express';
import { authUseCase, userUseCase, userRepo } from '../../config/container';
import { AuthenticatedRequest } from '../../infrastructure/middlewares/auth.middleware';
import prisma from '../../config/database'; // Chỉ dùng cho các truy vấn admin phức tạp chưa có repository
import axios from 'axios';

export class AuthController {
  public async register(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await authUseCase.register(req.body);
      res.status(201).json({
        success: true,
        message: 'Đăng ký tài khoản thành công. Vui lòng kiểm tra email để lấy mã OTP xác thực.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async verifyEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otpCode, otp } = req.body;
      const codeToVerify = otpCode || otp;
      const result = await authUseCase.verifyEmail(email, codeToVerify);
      res.status(200).json({
        success: true,
        message: 'Xác thực tài khoản thành công. Bây giờ bạn có thể đăng nhập.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async resendOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await authUseCase.resendOTP(email);
      res.status(200).json({
        success: true,
        message: 'Mã OTP mới đã được gửi đến email của bạn.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async checkOTP(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otpCode } = req.body;
      const result = await authUseCase.checkOTP(email, otpCode);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async login(req: Request, res: Response, next: NextFunction) {
    try {
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;
      const result = await authUseCase.login(req.body, userAgent, ipAddress);

      // Lưu Refresh Token vào HTTP-Only Cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        success: true,
        message: 'Đăng nhập thành công',
        data: {
          accessToken: result.accessToken,
          user: result.user,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  public async refresh(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      const result = await authUseCase.refresh(refreshToken);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async logout(req: Request, res: Response, next: NextFunction) {
    try {
      const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
      await authUseCase.logout(refreshToken);

      res.clearCookie('refreshToken', {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
      });

      res.status(200).json({
        success: true,
        message: 'Đăng xuất thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  public async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const result = await authUseCase.forgotPassword(email);
      res.status(200).json({
        success: true,
        message: 'Mã khôi phục mật khẩu đã được gửi đến email của bạn.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      await authUseCase.resetPassword(req.body);
      res.status(200).json({
        success: true,
        message: 'Thay đổi mật khẩu thành công. Bạn có thể sử dụng mật khẩu mới để đăng nhập.',
      });
    } catch (error) {
      next(error);
    }
  }

  public async getMe(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const profile = await userUseCase.getProfile(userId);
      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateProfile(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const updatedProfile = await userUseCase.updateProfile(userId, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật hồ sơ cá nhân thành công',
        data: updatedProfile,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getAllUsers(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { role, search, page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: any = {};
      if (role && role !== 'ALL') where.role = role;
      if (search) {
        where.OR = [
          { fullName: { contains: search as string, mode: 'insensitive' } },
          { email: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true, email: true, fullName: true, phoneNumber: true,
            role: true, isVerified: true, isApproved: true, createdAt: true, avatarUrl: true,
            _count: { select: { bookings: true, hotels: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.user.count({ where })
      ]);

      res.status(200).json({ success: true, data: { users, total } });
    } catch (error) {
      next(error);
    }
  }

  public async getAllBookings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { status, search, page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: any = {};
      if (status && status !== 'ALL') {
        where.status = status;
      } else {
        where.NOT = {
          status: 'CANCELLED',
          OR: [
            { payment: null },
            { payment: { is: { status: { not: 'COMPLETED' as any } } } }
          ]
        };
      }
      if (search) {
        where.OR = [
          { guestName: { contains: search as string, mode: 'insensitive' } },
          { guestEmail: { contains: search as string, mode: 'insensitive' } },
          { guestPhone: { contains: search as string, mode: 'insensitive' } },
        ];
      }

      const [bookings, total] = await Promise.all([
        prisma.booking.findMany({
          where,
          include: {
            user: { select: { fullName: true, email: true } },
            bookingItems: {
              include: { roomType: { include: { hotel: { select: { name: true } } } } }
            },
            payment: { select: { method: true, status: true } }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.booking.count({ where })
      ]);

      const formatted = bookings.map(b => ({
        id: b.id,
        guestName: b.guestName || b.user?.fullName || 'N/A',
        guestEmail: b.guestEmail || b.user?.email || 'N/A',
        guestPhone: b.guestPhone || 'N/A',
        hotelName: b.bookingItems[0]?.roomType?.hotel?.name || 'N/A',
        roomTypeName: b.bookingItems[0]?.roomType?.name || 'N/A',
        checkInDate: b.checkInDate.toISOString().split('T')[0],
        checkOutDate: b.checkOutDate.toISOString().split('T')[0],
        finalPrice: Number(b.finalPrice),
        status: b.status,
        paymentMethod: b.payment?.method || 'N/A',
        paymentStatus: b.payment?.status || 'N/A',
        createdAt: b.createdAt.toISOString(),
      }));

      res.status(200).json({ success: true, data: { bookings: formatted, total } });
    } catch (error) {
      next(error);
    }
  }

  public async getAllPayments(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { method, status, page = '1', limit = '20' } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: any = {};
      if (method && method !== 'ALL') where.method = method;
      if (status && status !== 'ALL') where.status = status;

      const [payments, total] = await Promise.all([
        prisma.payment.findMany({
          where,
          include: {
            booking: {
              include: {
                user: { select: { fullName: true, email: true } },
                bookingItems: { include: { roomType: { include: { hotel: { select: { name: true } } } } } }
              }
            }
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.payment.count({ where })
      ]);

      const formatted = payments.map(p => ({
        id: p.id,
        amount: Number(p.amount),
        method: p.method,
        status: p.status,
        transactionId: p.transactionId || 'N/A',
        guestName: p.booking?.user?.fullName || 'N/A',
        guestEmail: p.booking?.user?.email || 'N/A',
        hotelName: p.booking?.bookingItems[0]?.roomType?.hotel?.name || 'N/A',
        createdAt: p.createdAt.toISOString(),
      }));

      res.status(200).json({ success: true, data: { payments: formatted, total } });
    } catch (error) {
      next(error);
    }
  }

  public async getAllReviews(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { page = '1', limit = '20', search } = req.query;
      const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

      const where: any = {};
      if (search) {
        where.OR = [
          { comment: { contains: search as string, mode: 'insensitive' } },
          { hotel: { name: { contains: search as string, mode: 'insensitive' } } }
        ];
      }

      const [reviews, total] = await Promise.all([
        prisma.review.findMany({
          where,
          include: {
            user: { select: { fullName: true, email: true, avatarUrl: true } },
            hotel: { select: { name: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit as string),
        }),
        prisma.review.count({ where })
      ]);

      const formatted = reviews.map(r => ({
        id: r.id,
        guestName: r.user.fullName,
        guestEmail: r.user.email,
        avatarUrl: r.user.avatarUrl,
        hotelName: r.hotel.name,
        ratingOverall: r.ratingOverall,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      }));

      res.status(200).json({ success: true, data: { reviews: formatted, total } });
    } catch (error) {
      next(error);
    }
  }

  public async redirectToGoogle(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
      
      if (!clientId) {
        return res.status(400).send('Google Client ID is not configured in .env');
      }

      const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&response_type=code&scope=profile%20email&prompt=select_account`;

      res.redirect(googleUrl);
    } catch (error) {
      next(error);
    }
  }

  public async handleGoogleCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.query;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;

      if (!code) {
        return res.status(400).send('OAuth authorization code is missing');
      }

      const clientId = process.env.GOOGLE_CLIENT_ID;
      const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
      const redirectUri = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      if (!clientId || !clientSecret) {
        return res.status(500).send('Google OAuth configuration is incomplete in .env');
      }

      // 1. Đổi authorization code lấy token
      const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      });

      const { access_token } = tokenResponse.data;

      // 2. Lấy thông tin user profile
      const userinfoResponse = await axios.get('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });

      const profile = userinfoResponse.data;

      // 3. Tiến hành đăng nhập/đăng ký ở UseCase
      const result = await authUseCase.socialLogin(
        {
          email: profile.email,
          fullName: profile.name,
          avatarUrl: profile.picture,
        },
        userAgent,
        ipAddress
      );

      // 4. Lưu Refresh Token vào HTTP-Only Cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // 5. Chuyển hướng trình duyệt về frontend trang LoginSuccess kèm accessToken
      return res.redirect(`${frontendUrl}/login-success?token=${result.accessToken}`);
    } catch (error: any) {
      console.error('[Google OAuth Callback Error]:', error?.response?.data || error.message);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Đăng nhập Google thất bại')}`);
    }
  }

  public async redirectToFacebook(req: Request, res: Response, next: NextFunction) {
    try {
      const appId = process.env.FACEBOOK_APP_ID;
      const redirectUri = process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:5000/api/auth/facebook/callback';

      if (!appId) {
        return res.status(400).send('Facebook App ID is not configured in .env');
      }

      const facebookUrl = `https://www.facebook.com/v18.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&scope=email,public_profile`;

      res.redirect(facebookUrl);
    } catch (error) {
      next(error);
    }
  }

  public async handleFacebookCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code } = req.query;
      const userAgent = req.headers['user-agent'];
      const ipAddress = req.ip;

      if (!code) {
        return res.status(400).send('OAuth authorization code is missing');
      }

      const appId = process.env.FACEBOOK_APP_ID;
      const appSecret = process.env.FACEBOOK_APP_SECRET;
      const redirectUri = process.env.FACEBOOK_CALLBACK_URL || 'http://localhost:5000/api/auth/facebook/callback';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

      if (!appId || !appSecret) {
        return res.status(500).send('Facebook OAuth configuration is incomplete in .env');
      }

      // 1. Đổi authorization code lấy token
      const tokenResponse = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        },
      });

      const { access_token } = tokenResponse.data;

      // 2. Lấy thông tin user profile từ Facebook Graph API
      const profileResponse = await axios.get('https://graph.facebook.com/me', {
        params: {
          fields: 'id,name,email,picture.type(large)',
          access_token,
        },
      });

      const profile = profileResponse.data;

      // 3. Tiến hành đăng nhập/đăng ký
      const result = await authUseCase.socialLogin(
        {
          email: profile.email || `${profile.id}@facebook.com`, // Đảm bảo email duy nhất nếu Facebook không trả về email công khai
          fullName: profile.name,
          avatarUrl: profile.picture?.data?.url || null,
        },
        userAgent,
        ipAddress
      );

      // 4. Lưu Refresh Token vào Cookie
      res.cookie('refreshToken', result.refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      // 5. Chuyển hướng về frontend
      return res.redirect(`${frontendUrl}/login-success?token=${result.accessToken}`);
    } catch (error: any) {
      console.error('[Facebook OAuth Callback Error]:', error?.response?.data || error.message);
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      return res.redirect(`${frontendUrl}/login?error=${encodeURIComponent('Đăng nhập Facebook thất bại')}`);
    }
  }

  public async toggleApproveUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        return;
      }
      const updated = await prisma.user.update({
        where: { id },
        data: { isApproved: !user.isApproved }
      });
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }

  public async deleteUser(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ success: false, message: 'Không tìm thấy người dùng' });
        return;
      }
      if (user.role === 'ADMIN') {
        res.status(400).json({ success: false, message: 'Không thể xóa tài khoản Quản trị viên' });
        return;
      }

      // Xóa tất cả các liên kết liên quan để tránh lỗi khóa ngoại
      await prisma.hotel.deleteMany({ where: { ownerId: id } });
      await prisma.favorite.deleteMany({ where: { userId: id } });
      await prisma.review.deleteMany({ where: { userId: id } });
      await prisma.recentlyViewed.deleteMany({ where: { userId: id } });
      await prisma.notification.deleteMany({ where: { userId: id } });
      await prisma.message.deleteMany({ where: { senderId: id } });
      await prisma.conversation.deleteMany({ where: { OR: [ { customerId: id }, { hotelOwnerId: id } ] } });
      await prisma.refreshToken.deleteMany({ where: { userId: id } });
      await prisma.session.deleteMany({ where: { userId: id } });
      
      // Xóa người dùng khỏi hệ thống
      await prisma.user.delete({ where: { id } });

      res.status(200).json({ success: true, message: 'Xóa người dùng thành công' });
    } catch (error) {
      next(error);
    }
  }

  public async getMyNotifications(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const notifications = await prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' }
      });
      res.status(200).json({ success: true, data: notifications });
    } catch (error) {
      next(error);
    }
  }

  public async markNotificationAsRead(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updated = await prisma.notification.update({
        where: { id },
        data: { isRead: true }
      });
      res.status(200).json({ success: true, data: updated });
    } catch (error) {
      next(error);
    }
  }
}

export default new AuthController();
