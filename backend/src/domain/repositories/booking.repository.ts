// Repository Interface: IBookingRepository
// Hợp đồng dữ liệu cho Booking — use-cases không biết Prisma tồn tại

import {
  BookingEntity,
  BookingItemEntity,
  CreateBookingData,
  BookingStatus,
  NotificationEntity,
} from '../entities/booking.entity';

export interface IBookingRepository {
  // --- Booking CRUD ---
  findById(id: string): Promise<BookingEntity | null>;
  findByIdWithDetails(id: string): Promise<any | null>; // includes bookingItems, payment, roomType, hotel
  findMany(filters: any): Promise<any[]>;
  count(filters: any): Promise<number>;
  create(data: CreateBookingData): Promise<BookingEntity>;
  update(id: string, data: Partial<BookingEntity>): Promise<BookingEntity>;
  updateStatus(id: string, status: BookingStatus): Promise<BookingEntity>;
  updateMany(filter: any, data: Partial<BookingEntity>): Promise<void>;

  // --- BookingItem ---
  findBookingItemById(id: string): Promise<(BookingItemEntity & { roomType: any }) | null>;
  updateBookingItem(id: string, data: Partial<BookingItemEntity>): Promise<BookingItemEntity>;

  // --- Coupon Usage (from booking side) ---
  findCouponUsagesByBooking(bookingId: string): Promise<any[]>;
  createCouponUsage(data: { couponId: string; userId: string; bookingId: string }): Promise<void>;
  deleteCouponUsagesByBooking(bookingId: string): Promise<void>;
  incrementCouponUsedCount(couponId: string): Promise<void>;
  decrementCouponUsedCount(couponId: string): Promise<void>;

  // --- LoyaltyTransaction (from booking side) ---
  findLoyaltyTransaction(filter: { bookingId: string; type: string }): Promise<any | null>;
  createLoyaltyTransaction(data: any): Promise<void>;
  deleteLoyaltyTransaction(id: string): Promise<void>;

  // --- Notification ---
  createNotification(data: { userId: string; title: string; content: string; type: string }): Promise<void>;

  // --- User (dùng trong booking context) ---
  findUserById(id: string): Promise<any | null>;
  updateUserLoyaltyPoints(userId: string, points: number): Promise<void>;

  // --- Payment (dùng trong booking context) ---
  findPaymentByBookingId(bookingId: string): Promise<any | null>;
  updatePayment(filter: any, data: any): Promise<void>;

  // --- AuditLog ---
  createAuditLog(data: any): Promise<void>;

  // --- Transaction ---
  runTransaction<T>(fn: (tx: any) => Promise<T>): Promise<T>;

  // --- Booking queries ---
  findByOwnerId(ownerId: string): Promise<any[]>;
  findExpiredBookings(before: Date): Promise<BookingEntity[]>;
  countBookingsForUser(userId: string): Promise<number>;
}
