import prisma from '../../config/database';
import { AppError } from '../../infrastructure/middlewares/error.middleware';
import { Role } from '@prisma/client';

export class CouponUseCase {
  public async createCoupon(userId: string, userRole: Role, data: any) {
    const { code, description, discountType, discountValue, minOrderValue, maxDiscountAmount, startDate, endDate, usageLimit, dailyUsageLimit, targetUserType, hotelId } = data;

    // Phân quyền tạo coupon
    if (hotelId) {
      // Coupon của khách sạn: Kiểm tra xem user có phải chủ khách sạn này không
      const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
      if (!hotel) throw new AppError('Khách sạn không tồn tại', 404);
      if (userRole !== Role.ADMIN && hotel.ownerId !== userId) {
        throw new AppError('Bạn không có quyền tạo coupon cho khách sạn này', 403);
      }
    } else {
      // Coupon toàn sàn: Chỉ Admin được phép tạo
      if (userRole !== Role.ADMIN) {
        throw new AppError('Chỉ Admin mới có quyền tạo mã giảm giá toàn hệ thống', 403);
      }
    }

    // Kiểm tra trùng mã
    const existing = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } });
    if (existing) throw new AppError('Mã giảm giá này đã tồn tại', 400);

    const startD = startDate ? new Date(startDate) : new Date();
    const endD = new Date(endDate);
    if (!isNaN(endD.getTime()) && endD.getHours() === 0 && endD.getMinutes() === 0 && endD.getSeconds() === 0) {
      endD.setHours(23, 59, 59, 999);
    }

    const coupon = await (prisma.coupon as any).create({
      data: {
        code: code.toUpperCase(),
        description,
        discountType,
        discountValue,
        minOrderValue: minOrderValue || 0,
        maxDiscountAmount: maxDiscountAmount || null,
        startDate: startD,
        endDate: endD,
        usageLimit: Number(usageLimit),
        dailyUsageLimit: dailyUsageLimit ? Number(dailyUsageLimit) : null,
        targetUserType: targetUserType || 'ALL',
        hotelId: hotelId || null,
      },
    });

    return coupon;
  }

  public async validateCoupon(code: string, hotelId?: string, amount?: number, userId?: string) {
    const coupon = await prisma.coupon.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!coupon || !coupon.isActive) {
      throw new AppError('Mã giảm giá không tồn tại hoặc đã bị khóa', 404);
    }

    const now = new Date();
    if (now < coupon.startDate) {
      throw new AppError('Mã giảm giá chưa đến thời gian áp dụng', 400);
    }
    if (now > coupon.endDate) {
      throw new AppError('Mã giảm giá đã hết hạn sử dụng', 400);
    }

    if (coupon.usedCount >= coupon.usageLimit) {
      throw new AppError('Mã giảm giá đã hết lượt sử dụng', 400);
    }

    // Kiểm tra giới hạn 1 lượt sử dụng / 1 tài khoản
    if (userId) {
      const userUsage = await prisma.couponUsage.findFirst({
        where: {
          couponId: coupon.id,
          userId: userId,
        },
      });

      if (userUsage) {
        throw new AppError('Bạn đã sử dụng mã giảm giá này rồi. Mỗi tài khoản chỉ được áp dụng mã 1 lần!', 400);
      }
    }

    // Kiểm tra giới hạn lượt dùng trong ngày hôm nay
    if ((coupon as any).dailyUsageLimit) {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const todayUsedCount = await prisma.couponUsage.count({
        where: {
          couponId: coupon.id,
          usedAt: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
      });

      if (todayUsedCount >= (coupon as any).dailyUsageLimit) {
        throw new AppError(`Mã giảm giá đã đạt giới hạn ${(coupon as any).dailyUsageLimit} lượt dùng trong ngày hôm nay. Vui lòng quay lại vào ngày mai!`, 400);
      }
    }

    // Kiểm tra đối tượng sử dụng
    if ((coupon as any).targetUserType === 'NEW') {
      if (!userId) {
        throw new AppError('Mã giảm giá này chỉ dành riêng cho khách hàng mới. Vui lòng đăng nhập tài khoản để áp dụng mã!', 401);
      }
      const existingBookingsCount = await prisma.booking.count({
        where: {
          userId,
          status: { notIn: ['CANCELLED' as any] },
        },
      });
      if (existingBookingsCount > 0) {
        throw new AppError('Mã giảm giá này chỉ dành riêng cho khách hàng mới đặt phòng lần đầu', 400);
      }
    } else if ((coupon as any).targetUserType === 'VIP') {
      if (!userId) {
        throw new AppError('Mã giảm giá này chỉ dành riêng cho thành viên VIP. Vui lòng đăng nhập tài khoản!', 401);
      }
      const user = await prisma.user.findUnique({ where: { id: userId } });
      if (!user || (user.loyaltyPoints < 200 && user.role !== 'ADMIN')) {
        throw new AppError('Mã giảm giá này chỉ dành riêng cho khách hàng thân thiết / VIP', 400);
      }
    }

    // Kiểm tra tính hợp lệ về khách sạn
    if (coupon.hotelId && coupon.hotelId !== hotelId) {
      throw new AppError('Mã giảm giá này chỉ áp dụng cho một số khách sạn nhất định', 400);
    }

    // Kiểm tra giá trị tối thiểu của đơn hàng
    if (amount !== undefined && amount < parseFloat(coupon.minOrderValue.toString())) {
      throw new AppError(`Mã giảm giá chỉ áp dụng cho đơn phòng từ ${Number(coupon.minOrderValue).toLocaleString('vi-VN')} VNĐ`, 400);
    }

    // Tính toán số tiền được giảm
    let discountAmount = 0;
    if (amount !== undefined) {
      if (coupon.discountType === 'PERCENTAGE') {
        discountAmount = amount * (parseFloat(coupon.discountValue.toString()) / 100);
        if (coupon.maxDiscountAmount) {
          const maxVal = parseFloat(coupon.maxDiscountAmount.toString());
          if (discountAmount > maxVal) {
            discountAmount = maxVal;
          }
        }
      } else {
        discountAmount = parseFloat(coupon.discountValue.toString());
      }

      // Đảm bảo số tiền giảm không lớn hơn tổng tiền đơn phòng
      discountAmount = Math.min(discountAmount, amount);
    }

    return {
      couponId: coupon.id,
      code: coupon.code,
      description: coupon.description,
      discountType: coupon.discountType,
      discountValue: parseFloat(coupon.discountValue.toString()),
      discountAmount,
    };
  }

  public async getCoupons(hotelId?: string, all: boolean = false) {
    const where: any = {};
    
    if (!all) {
      const now = new Date();
      where.isActive = true;
      where.startDate = { lte: now };
      where.endDate = { gte: now };
    }

    if (hotelId) {
      where.OR = [
        { hotelId: null }, // Lấy coupon toàn sàn
        { hotelId: hotelId }, // Lấy coupon riêng của khách sạn
      ];
    }

    const coupons = await prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return coupons.map((c) => ({
      ...c,
      discountValue: parseFloat(c.discountValue.toString()),
      minOrderValue: parseFloat(c.minOrderValue.toString()),
      maxDiscountAmount: c.maxDiscountAmount ? parseFloat(c.maxDiscountAmount.toString()) : null,
    }));
  }

  public async deleteCoupon(userId: string, userRole: Role, couponId: string) {
    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new AppError('Mã giảm giá không tồn tại', 404);

    if (coupon.hotelId) {
      const hotel = await prisma.hotel.findUnique({ where: { id: coupon.hotelId } });
      if (userRole !== Role.ADMIN && (!hotel || hotel.ownerId !== userId)) {
        throw new AppError('Bạn không có quyền xóa coupon này', 403);
      }
    } else {
      if (userRole !== Role.ADMIN) {
        throw new AppError('Chỉ Admin mới có quyền xóa mã giảm giá toàn sàn', 403);
      }
    }

    await prisma.coupon.delete({ where: { id: couponId } });
    return { id: couponId };
  }

  public async toggleCouponStatus(userId: string, userRole: Role, couponId: string) {
    const coupon = await prisma.coupon.findUnique({ where: { id: couponId } });
    if (!coupon) throw new AppError('Mã giảm giá không tồn tại', 404);

    if (coupon.hotelId) {
      const hotel = await prisma.hotel.findUnique({ where: { id: coupon.hotelId } });
      if (userRole !== Role.ADMIN && (!hotel || hotel.ownerId !== userId)) {
        throw new AppError('Bạn không có quyền chỉnh sửa coupon này', 403);
      }
    } else {
      if (userRole !== Role.ADMIN) {
        throw new AppError('Chỉ Admin mới có quyền chỉnh sửa mã giảm giá toàn sàn', 403);
      }
    }

    const updated = await prisma.coupon.update({
      where: { id: couponId },
      data: { isActive: !coupon.isActive },
    });

    return updated;
  }
}

export default new CouponUseCase();
