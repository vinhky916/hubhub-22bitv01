// Use-case: LoyaltyUseCase (Clean Architecture — không import prisma)
import { IUserRepository } from '../../domain/repositories/user.repository';
import { AppError } from '../../infrastructure/middlewares/error.middleware';

export class LoyaltyUseCase {
  constructor(private userRepo: IUserRepository) {}

  public async getUserPointsBalance(userId: string): Promise<number> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const earned = await this.userRepo.aggregateLoyaltyPoints(userId, 'EARN', oneYearAgo);
    const spentAndRefunded = await this.userRepo.aggregateLoyaltyPoints(userId, 'SPEND');
    const refunded = await this.userRepo.aggregateLoyaltyPoints(userId, 'REFUND');

    return Math.max(0, earned + spentAndRefunded + refunded);
  }

  public async getPointsExpiringSoon(userId: string): Promise<number> {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoPlus30Days = new Date(oneYearAgo);
    oneYearAgoPlus30Days.setDate(oneYearAgoPlus30Days.getDate() + 30);

    return this.userRepo.aggregateLoyaltyPointsRange(userId, 'EARN', oneYearAgo, oneYearAgoPlus30Days);
  }

  public getTierDetails(points: number) {
    let tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' = 'Bronze';
    let multiplier = 1.0;
    let nextTierPoints = 1000;
    let nextTierName = 'Silver';
    let benefitsVi: string[] = ['Tích lũy x1.0 điểm cho mỗi đơn phòng'];
    let benefitsEn: string[] = ['Earn x1.0 points on stays'];

    if (points >= 10000) {
      tier = 'Platinum'; multiplier = 1.5; nextTierPoints = 10000; nextTierName = '';
      benefitsVi = ['Tích lũy x1.5 điểm', 'Voucher độc quyền giảm 20%', 'Hỗ trợ ưu tiên 24/7'];
      benefitsEn = ['Earn x1.5 points', 'Exclusive 20% discount voucher', '24/7 Priority Support'];
    } else if (points >= 5000) {
      tier = 'Gold'; multiplier = 1.25; nextTierPoints = 10000; nextTierName = 'Platinum';
      benefitsVi = ['Tích lũy x1.25 điểm', 'Quà tặng & Voucher sinh nhật'];
      benefitsEn = ['Earn x1.25 points', 'Birthday Gift & Vouchers'];
    } else if (points >= 1000) {
      tier = 'Silver'; multiplier = 1.1; nextTierPoints = 5000; nextTierName = 'Gold';
      benefitsVi = ['Tích lũy x1.1 điểm', 'Ưu tiên chăm sóc khách hàng'];
      benefitsEn = ['Earn x1.1 points', 'Priority Customer Service'];
    }

    return { tier, multiplier, nextTierPoints, nextTierName, pointsToNext: nextTierName ? nextTierPoints - points : 0, benefitsVi, benefitsEn };
  }

  public async getLoyaltySummary(userId: string) {
    const balance = await this.getUserPointsBalance(userId);
    const expiringSoon = await this.getPointsExpiringSoon(userId);
    const tierDetails = this.getTierDetails(balance);
    return { pointsBalance: balance, expiringSoon, ...tierDetails };
  }

  public async getLoyaltyHistory(userId: string) {
    return this.userRepo.findAllLoyaltyTransactions(userId);
  }

  public async earnPoints(bookingId: string, bookingData?: { userId: string; finalPrice: number; status: string }) {
    let data = bookingData;
    if (!data) {
      const b = await import('../../config/database').then(m => m.default.booking.findUnique({ where: { id: bookingId } }));
      if (!b) return;
      data = { userId: b.userId || '', finalPrice: Number(b.finalPrice), status: b.status };
    }
    if (!data.userId) return;

    const allowedStatuses = ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'];
    if (!allowedStatuses.includes(data.status)) return;

    const existingEarn = await this.userRepo.findLoyaltyTransaction({ bookingId, type: 'EARN' });
    if (existingEarn) return;

    const currentPoints = await this.getUserPointsBalance(data.userId);
    const tierDetails = this.getTierDetails(currentPoints);
    const basePoints = Math.floor(Number(data.finalPrice) / 10000);
    const earnedPoints = Math.floor(basePoints * tierDetails.multiplier);
    if (earnedPoints <= 0) return;

    const expiredAt = new Date();
    expiredAt.setFullYear(expiredAt.getFullYear() + 1);

    await this.userRepo.createLoyaltyTransaction({
      userId: data.userId, bookingId, points: earnedPoints, type: 'EARN',
      description: `Cộng điểm tích lũy từ đơn đặt phòng #${bookingId.substring(0, 8).toUpperCase()}`,
      expiredAt,
    });

    const newPointsBalance = currentPoints + earnedPoints;
    await this.userRepo.update(data.userId, { loyaltyPoints: newPointsBalance });
    await this.userRepo.createNotification({
      userId: data.userId,
      title: 'Cộng điểm tích lũy thành công 🎉',
      content: `Bạn vừa được cộng ${earnedPoints} điểm Loyalty từ đơn phòng nghỉ đã hoàn thành.`,
      type: 'SYSTEM',
    });

    const newTierDetails = this.getTierDetails(newPointsBalance);
    if (newTierDetails.tier !== tierDetails.tier) {
      await this.userRepo.createNotification({
        userId: data.userId,
        title: 'Chúc mừng thăng hạng thành viên 🏆',
        content: `Chúc mừng bạn đã được thăng hạng thành viên lên ${newTierDetails.tier.toUpperCase()}!`,
        type: 'SYSTEM',
      });
    }
  }

  public async refundPoints(bookingId: string, bookingData?: { userId: string; pointsUsed: number }) {
    let data = bookingData;
    if (!data) {
      const b = await import('../../config/database').then(m => m.default.booking.findUnique({ where: { id: bookingId } }));
      if (!b) return;
      data = { userId: b.userId || '', pointsUsed: b.pointsUsed };
    }
    if (!data.userId) return;

    if (data.pointsUsed > 0) {
      const existingRefund = await this.userRepo.findLoyaltyTransaction({ bookingId, type: 'REFUND' });
      if (!existingRefund) {
        const currentPoints = await this.getUserPointsBalance(data.userId);
        await this.userRepo.createLoyaltyTransaction({
          userId: data.userId, bookingId, points: data.pointsUsed, type: 'REFUND',
          description: `Hoàn điểm tích lũy từ đơn đặt phòng bị hủy #${bookingId.substring(0, 8).toUpperCase()}`,
        });
        await this.userRepo.update(data.userId, { loyaltyPoints: currentPoints + data.pointsUsed });
        await this.userRepo.createNotification({
          userId: data.userId,
          title: 'Hoàn trả điểm tích lũy 🔄',
          content: `Hệ thống đã hoàn trả ${data.pointsUsed} điểm Loyalty từ đơn phòng đã hủy của bạn.`,
          type: 'SYSTEM',
        });
      }
    }

    const existingEarn = await this.userRepo.findLoyaltyTransaction({ bookingId, type: 'EARN' });
    if (existingEarn) {
      const existingReversal = await this.userRepo.findLoyaltyTransaction({ bookingId, type: 'SPEND' });
      if (!existingReversal) {
        const currentPoints = await this.getUserPointsBalance(data.userId);
        await this.userRepo.createLoyaltyTransaction({
          userId: data.userId, bookingId, points: -(existingEarn as any).points, type: 'SPEND',
          description: `Thu hồi điểm tích lũy từ đơn đặt phòng bị hủy #${bookingId.substring(0, 8).toUpperCase()}`,
        });
        await this.userRepo.update(data.userId, { loyaltyPoints: Math.max(0, currentPoints - (existingEarn as any).points) });
        await this.userRepo.createNotification({
          userId: data.userId,
          title: 'Thu hồi điểm tích lũy ⚠️',
          content: `Hệ thống đã thu hồi ${(existingEarn as any).points} điểm Loyalty từ đơn đặt phòng đã hủy của bạn.`,
          type: 'SYSTEM',
        });
      }
    }
  }
}

export default LoyaltyUseCase;
