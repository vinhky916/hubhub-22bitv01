// Domain Entity: Payment
// Lớp thuần TypeScript — không phụ thuộc vào Prisma hay bất kỳ framework nào

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface PaymentEntity {
  id: string;
  bookingId: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  transactionId?: string | null;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertPaymentData {
  bookingId: string;
  amount: number;
  method: string;
  status: PaymentStatus;
  transactionId?: string | null;
}

export interface UpdatePaymentData {
  status?: PaymentStatus;
  transactionId?: string | null;
  paidAt?: Date | null;
}
