// Domain Entity: User
// Lớp thuần TypeScript — không phụ thuộc vào Prisma hay bất kỳ framework nào

export type UserRole = 'ADMIN' | 'CUSTOMER' | 'HOTEL_OWNER' | 'STAFF';

export interface UserEntity {
  id: string;
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  isVerified: boolean;
  isApproved: boolean;
  loyaltyPoints: number;
  staffHotelId?: string | null;
  otpCode?: string | null;
  otpExpiresAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  fullName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  role: UserRole;
  isVerified?: boolean;
  isApproved?: boolean;
  otpCode?: string | null;
  otpExpiresAt?: Date | null;
}

export interface UpdateUserData {
  email?: string;
  password?: string;
  fullName?: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  isVerified?: boolean;
  isApproved?: boolean;
  loyaltyPoints?: number;
  staffHotelId?: string | null;
  otpCode?: string | null;
  otpExpiresAt?: Date | null;
}

export interface RefreshTokenEntity {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface SessionEntity {
  id: string;
  userId: string;
  userAgent?: string | null;
  ipAddress?: string | null;
  expiresAt: Date;
  createdAt: Date;
}

export interface LoyaltyTransactionEntity {
  id: string;
  userId: string;
  bookingId?: string | null;
  points: number;
  type: 'EARN' | 'SPEND' | 'REFUND';
  description?: string | null;
  expiredAt?: Date | null;
  createdAt: Date;
}
