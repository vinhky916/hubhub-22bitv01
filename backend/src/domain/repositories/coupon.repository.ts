// Repository Interface: ICouponRepository
import { CouponEntity, CouponUsageEntity, CreateCouponData } from '../entities/coupon.entity';

export interface ICouponRepository {
  findByCode(code: string): Promise<CouponEntity | null>;
  findById(id: string): Promise<CouponEntity | null>;
  create(data: CreateCouponData): Promise<CouponEntity>;
  update(id: string, data: Partial<CouponEntity>): Promise<CouponEntity>;
  delete(id: string): Promise<void>;
  findMany(filters: any): Promise<CouponEntity[]>;

  // Usage
  findUsageByUserAndCoupon(userId: string, couponId: string): Promise<CouponUsageEntity | null>;
  countUsageToday(couponId: string, todayStart: Date, todayEnd: Date): Promise<number>;

  // Hotel check (for permission validation)
  findHotelById(id: string): Promise<any | null>;
}
