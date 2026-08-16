// Infrastructure: CouponPrismaRepository
import prisma from '../../config/database';
import { ICouponRepository } from '../../domain/repositories/coupon.repository';

export class CouponPrismaRepository implements ICouponRepository {
  async findByCode(code: string) { return prisma.coupon.findUnique({ where: { code } }) as any; }
  async findById(id: string) { return prisma.coupon.findUnique({ where: { id } }) as any; }
  async create(data: any) { return (prisma.coupon as any).create({ data }) as any; }
  async update(id: string, data: any) { return prisma.coupon.update({ where: { id }, data }) as any; }
  async delete(id: string) { await prisma.coupon.delete({ where: { id } }); }
  async findMany(filters: any) { return prisma.coupon.findMany(filters) as any; }
  async findUsageByUserAndCoupon(userId: string, couponId: string) {
    return prisma.couponUsage.findFirst({ where: { couponId, userId } }) as any;
  }
  async countUsageToday(couponId: string, todayStart: Date, todayEnd: Date) {
    return prisma.couponUsage.count({ where: { couponId, usedAt: { gte: todayStart, lte: todayEnd } } });
  }
  async findHotelById(id: string) { return prisma.hotel.findUnique({ where: { id } }); }
}
