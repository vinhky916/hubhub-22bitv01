// Repository Interface: IUserRepository
// Hợp đồng dữ liệu cho User — use-cases chỉ phụ thuộc vào interface này, không biết Prisma tồn tại

import {
  UserEntity,
  CreateUserData,
  UpdateUserData,
  RefreshTokenEntity,
  SessionEntity,
  LoyaltyTransactionEntity,
} from '../entities/user.entity';

export interface IUserRepository {
  // --- User CRUD ---
  findById(id: string): Promise<UserEntity | null>;
  findByEmail(email: string): Promise<UserEntity | null>;
  findByPhone(phone: string): Promise<UserEntity | null>;
  findByOtpToken(otpCode: string): Promise<UserEntity | null>;
  create(data: CreateUserData): Promise<UserEntity>;
  update(id: string, data: UpdateUserData): Promise<UserEntity>;
  delete(id: string): Promise<void>;

  // --- Auth tokens ---
  createRefreshToken(token: string, userId: string, expiresAt: Date): Promise<RefreshTokenEntity>;
  findRefreshToken(token: string): Promise<(RefreshTokenEntity & { user: UserEntity }) | null>;
  deleteRefreshToken(token: string): Promise<void>;
  createSession(userId: string, userAgent?: string, ipAddress?: string, expiresAt?: Date): Promise<SessionEntity>;

  // --- Loyalty transactions ---
  aggregateLoyaltyPoints(userId: string, type: string, dateFilter?: Date): Promise<number>;
  createLoyaltyTransaction(data: {
    userId: string;
    bookingId?: string | null;
    points: number;
    type: string;
    description?: string;
    expiredAt?: Date;
  }): Promise<LoyaltyTransactionEntity>;
  findLoyaltyTransaction(filter: { bookingId: string; type: string }): Promise<LoyaltyTransactionEntity | null>;
  findAllLoyaltyTransactions(userId: string): Promise<LoyaltyTransactionEntity[]>;
  aggregateLoyaltyPointsRange(userId: string, type: string, from: Date, to: Date): Promise<number>;

  // --- Notification ---
  createNotification(data: { userId: string; title: string; content: string; type: string }): Promise<void>;
}
