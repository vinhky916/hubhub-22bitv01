// Domain Entity: Coupon, CouponUsage
// Lớp thuần TypeScript — không phụ thuộc vào Prisma hay bất kỳ framework nào

export type DiscountType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type TargetUserType = 'ALL' | 'NEW' | 'VIP';

export interface CouponEntity {
  id: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount?: number | null;
  startDate: Date;
  endDate: Date;
  usageLimit: number;
  dailyUsageLimit?: number | null;
  usedCount: number;
  isActive: boolean;
  targetUserType: TargetUserType;
  hotelId?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponUsageEntity {
  id: string;
  couponId: string;
  userId?: string | null;
  bookingId: string;
  usedAt: Date;
}

export interface CreateCouponData {
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue?: number;
  maxDiscountAmount?: number | null;
  startDate: Date;
  endDate: Date;
  usageLimit: number;
  dailyUsageLimit?: number | null;
  targetUserType?: TargetUserType;
  hotelId?: string | null;
}

export interface ValidatedCouponResult {
  couponId: string;
  code: string;
  description?: string | null;
  discountType: DiscountType;
  discountValue: number;
  discountAmount: number;
}
