// Infrastructure: PaymentPrismaRepository
import prisma from '../../config/database';
import { IPaymentRepository } from '../../domain/repositories/payment.repository';

export class PaymentPrismaRepository implements IPaymentRepository {
  async findByBookingId(bookingId: string) {
    return prisma.payment.findUnique({ where: { bookingId } }) as any;
  }

  async upsert(data: any) {
    return prisma.payment.upsert({
      where: { bookingId: data.bookingId },
      update: { amount: data.amount, method: data.method, status: data.status as any, transactionId: data.transactionId },
      create: { bookingId: data.bookingId, amount: data.amount, method: data.method, status: data.status as any, transactionId: data.transactionId },
    }) as any;
  }

  async update(bookingId: string, data: any) {
    return prisma.payment.update({ where: { bookingId }, data }) as any;
  }
}
