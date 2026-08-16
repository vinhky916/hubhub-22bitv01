// Infrastructure: UserPrismaRepository
// Implements IUserRepository — Prisma chỉ nằm ở đây, không lọt vào use-cases

import prisma from '../../config/database';
import { IUserRepository } from '../../domain/repositories/user.repository';
import {
  UserEntity,
  CreateUserData,
  UpdateUserData,
  RefreshTokenEntity,
  SessionEntity,
  LoyaltyTransactionEntity,
} from '../../domain/entities/user.entity';

export class UserPrismaRepository implements IUserRepository {
  async findById(id: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({ where: { id } }) as any;
  }

  async findByEmail(email: string): Promise<UserEntity | null> {
    return prisma.user.findUnique({ where: { email } }) as any;
  }

  async findByPhone(phone: string): Promise<UserEntity | null> {
    return prisma.user.findFirst({ where: { phoneNumber: phone } }) as any;
  }

  async findByOtpToken(otpCode: string): Promise<UserEntity | null> {
    return prisma.user.findFirst({
      where: { otpCode, otpExpiresAt: { gt: new Date() } },
    }) as any;
  }

  async create(data: CreateUserData): Promise<UserEntity> {
    return prisma.user.create({ data: data as any }) as any;
  }

  async update(id: string, data: UpdateUserData): Promise<UserEntity> {
    return prisma.user.update({ where: { id }, data: data as any }) as any;
  }

  async delete(id: string): Promise<void> {
    await prisma.user.delete({ where: { id } });
  }

  async createRefreshToken(token: string, userId: string, expiresAt: Date): Promise<RefreshTokenEntity> {
    return prisma.refreshToken.create({
      data: { token, userId, expiresAt },
    }) as any;
  }

  async findRefreshToken(token: string): Promise<(RefreshTokenEntity & { user: UserEntity }) | null> {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    }) as any;
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.deleteMany({ where: { token } });
  }

  async createSession(userId: string, userAgent?: string, ipAddress?: string, expiresAt?: Date): Promise<SessionEntity> {
    const exp = expiresAt || (() => { const d = new Date(); d.setDate(d.getDate() + 7); return d; })();
    return prisma.session.create({
      data: { userId, userAgent, ipAddress, expiresAt: exp },
    }) as any;
  }

  async aggregateLoyaltyPoints(userId: string, type: string, dateFilter?: Date): Promise<number> {
    const where: any = { userId, type };
    if (dateFilter) where.createdAt = { gte: dateFilter };
    const result = await prisma.loyaltyTransaction.aggregate({ where, _sum: { points: true } });
    return result._sum.points || 0;
  }

  async aggregateLoyaltyPointsRange(userId: string, type: string, from: Date, to: Date): Promise<number> {
    const result = await prisma.loyaltyTransaction.aggregate({
      where: { userId, type, createdAt: { gte: from, lt: to } },
      _sum: { points: true },
    });
    return result._sum.points || 0;
  }

  async createLoyaltyTransaction(data: {
    userId: string;
    bookingId?: string | null;
    points: number;
    type: string;
    description?: string;
    expiredAt?: Date;
  }): Promise<LoyaltyTransactionEntity> {
    return prisma.loyaltyTransaction.create({ data: data as any }) as any;
  }

  async findLoyaltyTransaction(filter: { bookingId: string; type: string }): Promise<LoyaltyTransactionEntity | null> {
    return prisma.loyaltyTransaction.findFirst({ where: filter }) as any;
  }

  async findAllLoyaltyTransactions(userId: string): Promise<LoyaltyTransactionEntity[]> {
    return prisma.loyaltyTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    }) as any;
  }

  async createNotification(data: { userId: string; title: string; content: string; type: string }): Promise<void> {
    await (prisma.notification as any).create({ data });
  }
}
