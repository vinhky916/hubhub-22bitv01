// Use-case: AuthUseCase (Clean Architecture — không import prisma)
import * as bcrypt from 'bcrypt';
import crypto from 'crypto';
import { IUserRepository } from '../../domain/repositories/user.repository';
import { AppError } from '../../infrastructure/middlewares/error.middleware';

export interface IMailService {
  sendOTP(email: string, otp: string, name: string): Promise<void>;
  sendResetPassword(email: string, token: string, name: string): Promise<void>;
}

export interface IJwtService {
  generateAccessToken(payload: { userId: string; role: string }): string;
  generateRefreshToken(payload: { userId: string; role: string }): string;
  verifyRefreshToken(token: string): any;
}

export class AuthUseCase {
  constructor(
    private userRepo: IUserRepository,
    private mailService: IMailService,
    private jwtService: IJwtService,
  ) { }

  private generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  public async register(data: any) {
    const { email, password, fullName, phoneNumber, role } = data;

    const existingUser = await this.userRepo.findByEmail(email);
    if (existingUser) {
      if (!existingUser.isVerified) {
        const otpCode = this.generateOTP();
        const otpExpiresAt = new Date();
        otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);
        const hashedPassword = await bcrypt.hash(password, 10);

        const updatedUser = await this.userRepo.update(existingUser.id, {
          password: hashedPassword,
          fullName,
          phoneNumber: phoneNumber?.trim() || existingUser.phoneNumber,
          otpCode,
          otpExpiresAt,
        });

        try {
          await this.mailService.sendOTP(updatedUser.email, otpCode, updatedUser.fullName);
        } catch (mailErr) {
          console.error('[AuthUseCase] Lỗi gửi email OTP:', mailErr);
        }

        return {
          userId: updatedUser.id,
          email: updatedUser.email,
          fullName: updatedUser.fullName,
          isVerified: false,
        };
      }
      throw new AppError('Email đã được sử dụng trên hệ thống', 400);
    }

    if (phoneNumber && phoneNumber.trim() !== '') {
      const existingPhone = await this.userRepo.findByPhone(phoneNumber.trim());
      if (existingPhone) throw new AppError('Số điện thoại đã được đăng ký sử dụng trên hệ thống', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const otpCode = this.generateOTP();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

    const user = await this.userRepo.create({
      email,
      password: hashedPassword,
      fullName,
      phoneNumber,
      role,
      isVerified: false,
      isApproved: role !== 'HOTEL_OWNER',
      otpCode,
      otpExpiresAt,
    });

    try {
      await this.mailService.sendOTP(user.email, otpCode, user.fullName);
    } catch (mailError) {
      console.error('[AuthUseCase] Lỗi gửi email OTP khi đăng ký:', mailError);
    }

    return {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      isVerified: user.isVerified,
    };
  }

  public async verifyEmail(email: string, otpCode: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    if (user.isVerified) throw new AppError('Tài khoản này đã được xác thực trước đó', 400);
    if (!user.otpCode || user.otpCode !== otpCode) throw new AppError('Mã OTP không chính xác', 400);
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) throw new AppError('Mã OTP đã hết hạn sử dụng', 400);

    const updatedUser = await this.userRepo.update(user.id, { isVerified: true, otpCode: null, otpExpiresAt: null });
    return { email: updatedUser.email, isVerified: true };
  }

  public async resendOTP(email: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError('Không tìm thấy người dùng', 404);
    if (user.isVerified) throw new AppError('Tài khoản đã được xác thực', 400);

    const otpCode = this.generateOTP();
    const otpExpiresAt = new Date();
    otpExpiresAt.setMinutes(otpExpiresAt.getMinutes() + 10);

    await this.userRepo.update(user.id, { otpCode, otpExpiresAt });
    await this.mailService.sendOTP(user.email, otpCode, user.fullName);
    return {
      success: true,
    };
  }

  public async checkOTP(email: string, otpCode: string) {
    if (!email || !otpCode || otpCode.trim().length !== 6) {
      return { valid: false, message: 'Mã OTP phải có đúng 6 chữ số' };
    }
    const user = await this.userRepo.findByEmail(email.trim());
    if (!user) return { valid: false, message: 'Không tìm thấy tài khoản người dùng' };
    if (!user.otpCode || user.otpCode.trim() !== otpCode.trim()) {
      return { valid: false, message: 'Mã OTP không chính xác' };
    }
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      return { valid: false, message: 'Mã OTP đã hết hạn sử dụng' };
    }
    return { valid: true, message: 'Mã OTP chính xác' };
  }

  public async login(data: any, userAgent?: string, ipAddress?: string) {
    const { email, password } = data;
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError('Email hoặc mật khẩu không chính xác', 401);

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) throw new AppError('Email hoặc mật khẩu không chính xác', 401);
    if (!user.isVerified) throw new AppError('Tài khoản chưa được xác thực email. Vui lòng xác thực trước.', 403);
    if (user.role !== 'ADMIN' && !user.isApproved) throw new AppError('Tài khoản của bạn đã bị khóa hoặc đang chờ phê duyệt. Vui lòng liên hệ Admin.', 403);

    const accessToken = this.jwtService.generateAccessToken({ userId: user.id, role: user.role });
    const refreshTokenString = this.jwtService.generateRefreshToken({ userId: user.id, role: user.role });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.userRepo.createRefreshToken(refreshTokenString, user.id, expiresAt);
    await this.userRepo.createSession(user.id, userAgent, ipAddress, expiresAt);

    return {
      accessToken,
      refreshToken: refreshTokenString,
      user: { id: user.id, email: user.email, fullName: user.fullName, phoneNumber: user.phoneNumber, avatarUrl: user.avatarUrl, role: user.role },
    };
  }

  public async refresh(refreshToken: string) {
    if (!refreshToken) throw new AppError('Email hoặc mật khẩu sai. Vui lòng nhập lại!', 401);
    try {
      this.jwtService.verifyRefreshToken(refreshToken);
      const dbToken = await this.userRepo.findRefreshToken(refreshToken);
      if (!dbToken || dbToken.expiresAt < new Date()) throw new AppError('Email hoặc mật khẩu sai. Vui lòng nhập lại!', 401);

      const accessToken = this.jwtService.generateAccessToken({ userId: dbToken.userId, role: (dbToken.user as any).role });
      return { accessToken };
    } catch {
      throw new AppError('Email hoặc mật khẩu sai. Vui lòng nhập lại!', 401);
    }
  }

  public async logout(refreshToken: string) {
    if (!refreshToken) return;
    try { await this.userRepo.deleteRefreshToken(refreshToken); } catch { /* ignore */ }
  }

  public async forgotPassword(email: string) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) throw new AppError('Không tìm thấy người dùng đăng ký bằng email này', 404);

    const otpCode = this.generateOTP();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    await this.userRepo.update(user.id, { otpCode, otpExpiresAt: expiresAt });
    await this.mailService.sendResetPassword(email, otpCode, user.fullName);

    return {
      success: true,
      email: user.email,
    };
  }

  public async resetPassword(data: any) {
    const { email, otpCode, token, password } = data;
    const code = (otpCode || token)?.trim();
    if (!code) throw new AppError('Mã OTP khôi phục không được để trống', 400);

    let user = null;
    if (email) {
      user = await this.userRepo.findByEmail(email.trim());
    }
    if (!user) {
      user = await this.userRepo.findByOtpToken(code);
    }

    if (!user) throw new AppError('Không tìm thấy tài khoản người dùng', 404);
    if (!user.otpCode || user.otpCode !== code) throw new AppError('Mã OTP khôi phục không chính xác', 400);
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) throw new AppError('Mã OTP đã hết hạn sử dụng', 400);

    const hashedPassword = await bcrypt.hash(password, 10);
    await this.userRepo.update(user.id, { password: hashedPassword, otpCode: null, otpExpiresAt: null });
    return { success: true };
  }

  public async socialLogin(data: any, userAgent?: string, ipAddress?: string) {
    const { email, fullName, avatarUrl } = data;
    if (!email) throw new AppError('Email không được để trống', 400);

    let user = await this.userRepo.findByEmail(email);
    if (!user) {
      const randomPassword = crypto.randomUUID();
      const hashedPassword = await bcrypt.hash(randomPassword, 10);
      user = await this.userRepo.create({
        email,
        fullName: fullName || email.split('@')[0],
        avatarUrl: avatarUrl || null,
        password: hashedPassword,
        isVerified: true,
        role: 'CUSTOMER',
      });
      console.log(`[AuthUseCase] Tự động đăng ký người dùng Google/Facebook mới: ${email}`);
    } else if (avatarUrl && user.avatarUrl !== avatarUrl) {
      user = await this.userRepo.update(user.id, { avatarUrl });
    }

    const accessToken = this.jwtService.generateAccessToken({ userId: user.id, role: user.role });
    const refreshTokenString = this.jwtService.generateRefreshToken({ userId: user.id, role: user.role });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.userRepo.createRefreshToken(refreshTokenString, user.id, expiresAt);
    await this.userRepo.createSession(user.id, userAgent, ipAddress, expiresAt);

    return {
      accessToken,
      refreshToken: refreshTokenString,
      user: { id: user.id, email: user.email, fullName: user.fullName, phoneNumber: user.phoneNumber, avatarUrl: user.avatarUrl, role: user.role },
    };
  }
}

export default AuthUseCase;
