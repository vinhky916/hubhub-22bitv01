// Use-case: CouponUseCase (Clean Architecture — không import prisma)
import { ICouponRepository } from '../../domain/repositories/coupon.repository';
import { AppError } from '../../infrastructure/middlewares/error.middleware';

export class CouponUseCase {
  constructor(private couponRepo: ICouponRepository) {}

  public async createCoupon(userId: string, userRole: string, data: any) {
    const { code, description, discountType, discountValue, minOrderValue, maxDiscountAmount, startDate, endDate, usageLimit, dailyUsageLimit, targetUserType, hotelId } = data;

    if (hotelId) {
      const hotel = await this.couponRepo.findHotelById(hotelId);
      if (!hotel) throw new AppError('Khách sạn không tồn tại', 404);
      if (userRole !== 'ADMIN' && hotel.ownerId !== userId) throw new AppError('Bạn không có quyền tạo coupon cho khách sạn này', 403);
    } else {
      if (userRole !== 'ADMIN') throw new AppError('Chỉ Admin mới có quyền tạo mã giảm giá toàn hệ thống', 403);
    }

    const existing = await this.couponRepo.findByCode(code.toUpperCase());
    if (existing) throw new AppError('Mã giảm giá này đã tồn tại', 400);

    const startD = startDate ? new Date(startDate) : new Date();
    const endD = new Date(endDate);
    if (!isNaN(endD.getTime()) && endD.getHours() === 0 && endD.getMinutes() === 0 && endD.getSeconds() === 0) {
      endD.setHours(23, 59, 59, 999);
    }

    return this.couponRepo.create({
      code: code.toUpperCase(), description, discountType, discountValue,
      minOrderValue: minOrderValue || 0, maxDiscountAmount: maxDiscountAmount || null,
      startDate: startD, endDate: endD, usageLimit: Number(usageLimit),
      dailyUsageLimit: dailyUsageLimit ? Number(dailyUsageLimit) : null,
      targetUserType: targetUserType || 'ALL', hotelId: hotelId || null,
    });
  }

  public async validateCoupon(code: string, hotelId?: string, amount?: number, userId?: string) {
    const coupon = await this.couponRepo.findByCode(code.toUpperCase()) as any;
    if (!coupon || !coupon.isActive) throw new AppError('Mã giảm giá không tồn tại hoặc đã bị khóa', 404);

    const now = new Date();
    if (now < coupon.startDate) throw new AppError('Mã giảm giá chưa đến thời gian áp dụng', 400);
    if (now > coupon.endDate) throw new AppError('Mã giảm giá đã hết hạn sử dụng', 400);
    if (coupon.usedCount >= coupon.usageLimit) throw new AppError('Mã giảm giá đã hết lượt sử dụng', 400);

    if (userId) {
      const userUsage = await this.couponRepo.findUsageByUserAndCoupon(userId, coupon.id);
      if (userUsage) throw new AppError('Bạn đã sử dụng mã giảm giá này rồi. Mỗi tài khoản chỉ được áp dụng mã 1 lần!', 400);
    }

    if (coupon.dailyUsageLimit) {
      const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);
      const todayUsedCount = await this.couponRepo.countUsageToday(coupon.id, todayStart, todayEnd);
      if (todayUsedCount >= coupon.dailyUsageLimit) {
        throw new AppError(`Mã giảm giá đã đạt giới hạn ${coupon.dailyUsageLimit} lượt dùng trong ngày hôm nay. Vui lòng quay lại vào ngày mai!`, 400);
      }
    }

    if (coupon.targetUserType === 'NEW') {
      if (!userId) throw new AppError('Mã giảm giá này chỉ dành riêng cho khách hàng mới. Vui lòng đăng nhập tài khoản để áp dụng mã!', 401);
    } else if (coupon.targetUserType === 'VIP') {
      if (!userId) throw new AppError('Mã giảm giá này chỉ dành riêng cho thành viên VIP. Vui lòng đăng nhập tài khoản!', 401);
    }

    if (coupon.hotelId && coupon.hotelId !== hotelId) throw new AppError('Mã giảm giá này chỉ áp dụng cho một số khách sạn nhất định', 400);
    if (amount !== undefined && amount < parseFloat(coupon.minOrderValue.toString())) {
      throw new AppError(`Mã giảm giá chỉ áp dụng cho đơn phòng từ ${Number(coupon.minOrderValue).toLocaleString('vi-VN')} VNĐ`, 400);
    }

    let discountAmount = 0;
    if (amount !== undefined) {
      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = amount * (parseFloat(coupon.discountValue.toString()) / 100);
        if (coupon.maxDiscountAmount) {
          const maxVal = parseFloat(coupon.maxDiscountAmount.toString());
          if (discountAmount > maxVal) discountAmount = maxVal;
        }
      } else {
        discountAmount = parseFloat(coupon.discountValue.toString());
      }
      discountAmount = Math.min(discountAmount, amount);
    }

    return {
      couponId: coupon.id, code: coupon.code, description: coupon.description,
      discountType: coupon.discountType, discountValue: parseFloat(coupon.discountValue.toString()), discountAmount,
    };
  }

  public async getCoupons(hotelId?: string, all: boolean = false) {
    const where: any = {};
    if (!all) {
      const now = new Date();
      where.isActive = true; where.startDate = { lte: now }; where.endDate = { gte: now };
    }
    if (hotelId) where.OR = [{ hotelId: null }, { hotelId }];

    const coupons = await this.couponRepo.findMany({ where, orderBy: { createdAt: 'desc' } }) as any[];
    return coupons.map(c => ({
      ...c,
      discountValue: parseFloat(c.discountValue.toString()),
      minOrderValue: parseFloat(c.minOrderValue.toString()),
      maxDiscountAmount: c.maxDiscountAmount ? parseFloat(c.maxDiscountAmount.toString()) : null,
    }));
  }

  public async deleteCoupon(userId: string, userRole: string, couponId: string) {
    const coupon = await this.couponRepo.findById(couponId) as any;
    if (!coupon) throw new AppError('Mã giảm giá không tồn tại', 404);

    if (coupon.hotelId) {
      const hotel = await this.couponRepo.findHotelById(coupon.hotelId) as any;
      if (userRole !== 'ADMIN' && (!hotel || hotel.ownerId !== userId)) throw new AppError('Bạn không có quyền xóa coupon này', 403);
    } else {
      if (userRole !== 'ADMIN') throw new AppError('Chỉ Admin mới có quyền xóa mã giảm giá toàn sàn', 403);
    }

    await this.couponRepo.delete(couponId);
    return { id: couponId };
  }

  public async toggleCouponStatus(userId: string, userRole: string, couponId: string) {
    const coupon = await this.couponRepo.findById(couponId) as any;
    if (!coupon) throw new AppError('Mã giảm giá không tồn tại', 404);

    if (coupon.hotelId) {
      const hotel = await this.couponRepo.findHotelById(coupon.hotelId) as any;
      if (userRole !== 'ADMIN' && (!hotel || hotel.ownerId !== userId)) throw new AppError('Bạn không có quyền chỉnh sửa coupon này', 403);
    } else {
      if (userRole !== 'ADMIN') throw new AppError('Chỉ Admin mới có quyền chỉnh sửa mã giảm giá toàn sàn', 403);
    }

    return this.couponRepo.update(couponId, { isActive: !coupon.isActive });
  }
}

export default CouponUseCase;
