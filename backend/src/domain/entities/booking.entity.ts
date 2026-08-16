// Domain Entity: Booking, BookingItem
// Lớp thuần TypeScript — không phụ thuộc vào Prisma hay bất kỳ framework nào

export type BookingStatus =
  | 'PENDING'
  | 'PAYMENT_PROCESSING'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export interface BookingEntity {
  id: string;
  userId?: string | null;
  checkInDate: Date;
  checkOutDate: Date;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  notes?: string | null;
  numGuests: number;
  status: BookingStatus;
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
  commissionRate: number;
  commissionAmount: number;
  ownerNetAmount: number;
  refundAmount: number;
  payoutStatus: string;
  pointsUsed: number;
  pointsDiscount: number;
  insuranceSelected: boolean;
  internalNotes?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BookingItemEntity {
  id: string;
  bookingId: string;
  roomTypeId: string;
  ratePlanId?: string | null;
  ratePlanName?: string | null;
  cancellationPolicySnapshot?: string | null;
  paymentPolicySnapshot?: string | null;
  quantity: number;
  price: number;
  roomNumbers?: string | null;
}

export interface CreateBookingData {
  userId?: string | null;
  checkInDate: Date;
  checkOutDate: Date;
  guestName: string;
  guestEmail?: string | null;
  guestPhone?: string | null;
  notes?: string | null;
  numGuests?: number;
  insuranceSelected?: boolean;
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
  commissionRate: number;
  commissionAmount: number;
  ownerNetAmount: number;
  pointsUsed?: number;
  pointsDiscount?: number;
  status?: BookingStatus;
  bookingItems: {
    roomTypeId: string;
    ratePlanId?: string | null;
    ratePlanName?: string;
    cancellationPolicySnapshot?: string;
    paymentPolicySnapshot?: string;
    quantity: number;
    price: number;
  }[];
}

export interface BookingFilters {
  userId?: string;
  role?: string;
  status?: BookingStatus;
  page?: number;
  limit?: number;
}

export interface NotificationEntity {
  id: string;
  userId: string;
  title: string;
  content: string;
  type: string;
  isRead: boolean;
  createdAt: Date;
}
