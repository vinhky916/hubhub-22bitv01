// Infrastructure: BookingPrismaRepository
// Implements IBookingRepository

import prisma from '../../config/database';
import { IBookingRepository } from '../../domain/repositories/booking.repository';
import { BookingEntity, CreateBookingData, BookingStatus } from '../../domain/entities/booking.entity';

export class BookingPrismaRepository implements IBookingRepository {
  async findById(id: string): Promise<BookingEntity | null> {
    return prisma.booking.findUnique({ where: { id } }) as any;
  }

  async findByIdWithDetails(id: string): Promise<any | null> {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        bookingItems: { include: { roomType: { include: { hotel: true } } } },
        payment: true,
      },
    });
  }

  async findMany(filters: any): Promise<any[]> {
    return prisma.booking.findMany(filters) as any;
  }

  async count(filters: any): Promise<number> {
    return prisma.booking.count(filters);
  }

  async create(data: CreateBookingData): Promise<BookingEntity> {
    return prisma.booking.create({
      data: {
        userId: data.userId || null,
        checkInDate: data.checkInDate,
        checkOutDate: data.checkOutDate,
        guestName: data.guestName,
        guestEmail: data.guestEmail || '',
        guestPhone: data.guestPhone || '',
        notes: data.notes,
        numGuests: data.numGuests || 1,
        insuranceSelected: data.insuranceSelected || false,
        totalPrice: data.totalPrice,
        discountAmount: data.discountAmount,
        finalPrice: data.finalPrice,
        commissionRate: data.commissionRate,
        commissionAmount: data.commissionAmount,
        ownerNetAmount: data.ownerNetAmount,
        refundAmount: 0,
        payoutStatus: 'PENDING',
        pointsUsed: data.pointsUsed || 0,
        pointsDiscount: data.pointsDiscount || 0,
        status: (data.status || 'PENDING') as any,
        bookingItems: { create: data.bookingItems as any },
      } as any,
      include: { bookingItems: true },
    }) as any;
  }

  async update(id: string, data: Partial<BookingEntity>): Promise<BookingEntity> {
    return prisma.booking.update({ where: { id }, data: data as any }) as any;
  }

  async updateStatus(id: string, status: BookingStatus): Promise<BookingEntity> {
    return prisma.booking.update({ where: { id }, data: { status: status as any } }) as any;
  }

  async updateMany(filter: any, data: Partial<BookingEntity>): Promise<void> {
    await prisma.booking.updateMany({ where: filter, data: data as any });
  }

  async findBookingItemById(id: string): Promise<any | null> {
    return prisma.bookingItem.findUnique({ where: { id }, include: { roomType: { select: { hotelId: true } } } });
  }

  async updateBookingItem(id: string, data: any): Promise<any> {
    return prisma.bookingItem.update({ where: { id }, data });
  }

  async findCouponUsagesByBooking(bookingId: string): Promise<any[]> {
    return prisma.couponUsage.findMany({ where: { bookingId } });
  }

  async createCouponUsage(data: any): Promise<void> {
    await prisma.couponUsage.create({ data });
  }

  async deleteCouponUsagesByBooking(bookingId: string): Promise<void> {
    await prisma.couponUsage.deleteMany({ where: { bookingId } });
  }

  async incrementCouponUsedCount(couponId: string): Promise<void> {
    await prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { increment: 1 } } });
  }

  async decrementCouponUsedCount(couponId: string): Promise<void> {
    await prisma.coupon.update({ where: { id: couponId }, data: { usedCount: { decrement: 1 } } });
  }

  async findLoyaltyTransaction(filter: any): Promise<any | null> {
    return prisma.loyaltyTransaction.findFirst({ where: filter });
  }

  async createLoyaltyTransaction(data: any): Promise<void> {
    await prisma.loyaltyTransaction.create({ data });
  }

  async deleteLoyaltyTransaction(id: string): Promise<void> {
    await prisma.loyaltyTransaction.delete({ where: { id } });
  }

  async createNotification(data: any): Promise<void> {
    await (prisma.notification as any).create({ data });
  }

  async findUserById(id: string): Promise<any | null> {
    return prisma.user.findUnique({ where: { id } });
  }

  async updateUserLoyaltyPoints(userId: string, points: number): Promise<void> {
    await prisma.user.update({ where: { id: userId }, data: { loyaltyPoints: points } });
  }

  async findPaymentByBookingId(bookingId: string): Promise<any | null> {
    return prisma.payment.findUnique({ where: { bookingId } });
  }

  async updatePayment(filter: any, data: any): Promise<void> {
    await prisma.payment.update({ where: filter, data });
  }

  async createAuditLog(data: any): Promise<void> {
    await (prisma.auditLog as any).create({ data });
  }

  async runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T> {
    return prisma.$transaction(fn);
  }

  async findByOwnerId(ownerId: string): Promise<any[]> {
    return prisma.booking.findMany({
      where: { bookingItems: { some: { roomType: { hotel: { ownerId } } } } },
      include: { bookingItems: { include: { roomType: { include: { hotel: true } } } }, payment: true },
      orderBy: { createdAt: 'desc' },
    }) as any;
  }

  async findExpiredBookings(before: Date): Promise<BookingEntity[]> {
    return prisma.booking.findMany({
      where: { status: { in: ['PENDING', 'PAYMENT_PROCESSING'] as any }, createdAt: { lt: before } },
    }) as any;
  }

  async countBookingsForUser(userId: string): Promise<number> {
    return prisma.booking.count({ where: { userId, status: { notIn: ['CANCELLED' as any] } } });
  }
}
