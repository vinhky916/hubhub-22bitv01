// Repository Interface: IPaymentRepository
import { PaymentEntity, UpsertPaymentData, UpdatePaymentData } from '../entities/payment.entity';

export interface IPaymentRepository {
  findByBookingId(bookingId: string): Promise<PaymentEntity | null>;
  upsert(data: UpsertPaymentData): Promise<PaymentEntity>;
  update(bookingId: string, data: UpdatePaymentData): Promise<PaymentEntity>;
}
