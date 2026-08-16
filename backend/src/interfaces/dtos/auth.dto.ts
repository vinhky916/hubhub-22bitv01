import { z } from 'zod';
import { Role } from '@prisma/client';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Email không đúng định dạng'),
    password: z
      .string()
      .min(6, 'Mật khẩu phải tối thiểu 6 ký tự')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số'
      ),
    fullName: z.string().min(2, 'Họ tên phải tối thiểu 2 ký tự'),
    phoneNumber: z.string().optional(),
    role: z.nativeEnum(Role).refine((val) => val === Role.CUSTOMER || val === Role.HOTEL_OWNER, {
      message: 'Chỉ chấp nhận vai trò CUSTOMER hoặc HOTEL_OWNER',
    }),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Email không đúng định dạng'),
    password: z.string().min(1, 'Mật khẩu không được để trống'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    email: z.string().email('Email không đúng định dạng'),
    otpCode: z.string().optional(),
    otp: z.string().optional(),
  }).refine((data) => (data.otpCode && data.otpCode.length === 6) || (data.otp && data.otp.length === 6), {
    message: 'Mã OTP phải có độ dài đúng 6 ký tự',
    path: ['otpCode'],
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Email không đúng định dạng'),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Email không đúng định dạng').optional(),
    otpCode: z.string().optional(),
    token: z.string().optional(),
    password: z
      .string()
      .min(6, 'Mật khẩu phải tối thiểu 6 ký tự')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Mật khẩu phải chứa ít nhất 1 chữ hoa, 1 chữ thường và 1 chữ số'
      ),
  }),
});

export const updateProfileSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, 'Họ tên phải tối thiểu 2 ký tự').optional(),
    phoneNumber: z.string().optional(),
    avatarUrl: z.string().url('Đường dẫn ảnh đại diện không hợp lệ').or(z.literal('')).optional(),
    gender: z.string().optional(),
    dateOfBirth: z.string().optional(),
  }),
});
