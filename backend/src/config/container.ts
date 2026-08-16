// DI Container — Dependency Injection wiring
// Tất cả Repositories và Use-cases được khởi tạo và inject ở đây
// Controllers chỉ import từ file này, không tự tạo instances

// ==========================================
// INFRASTRUCTURE LAYER — Repositories (Prisma)
// ==========================================
import { UserPrismaRepository } from '../infrastructure/repositories/user.prisma.repository';
import { HotelPrismaRepository } from '../infrastructure/repositories/hotel.prisma.repository';
import { BookingPrismaRepository } from '../infrastructure/repositories/booking.prisma.repository';
import { CouponPrismaRepository } from '../infrastructure/repositories/coupon.prisma.repository';
import { PaymentPrismaRepository } from '../infrastructure/repositories/payment.prisma.repository';
import { CmsPrismaRepository } from '../infrastructure/repositories/cms.prisma.repository';
import { StaffPrismaRepository } from '../infrastructure/repositories/staff.prisma.repository';

// Infrastructure services (external-facing)
import mailService from '../infrastructure/services/mail.service';
import socketService from '../infrastructure/services/socket.service';
import auditService from '../infrastructure/services/audit.service';
import { PaymentService } from '../infrastructure/services/payment.service';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from '../infrastructure/security/jwt';

// ==========================================
// DOMAIN LAYER — Repository instances
// ==========================================
const userRepo = new UserPrismaRepository();
const hotelRepo = new HotelPrismaRepository();
const bookingRepo = new BookingPrismaRepository();
const couponRepo = new CouponPrismaRepository();
const paymentRepo = new PaymentPrismaRepository();
const cmsRepo = new CmsPrismaRepository();
const staffRepo = new StaffPrismaRepository();

// ==========================================
// USE-CASE LAYER — with DI
// ==========================================
import { AuthUseCase } from '../use-cases/auth/auth.use-case';
import { LoyaltyUseCase } from '../use-cases/user/loyalty.use-case';
import { CouponUseCase } from '../use-cases/coupon/coupon.use-case';
import { CmsUseCase } from '../use-cases/cms/cms.use-case';
import { StaffUseCase } from '../use-cases/staff/staff.use-case';

// JWT adapter để conform vào interface
const jwtService = {
  generateAccessToken: (payload: { userId: string; role: string }) => generateAccessToken(payload),
  generateRefreshToken: (payload: { userId: string; role: string }) => generateRefreshToken(payload),
  verifyRefreshToken: (token: string) => verifyRefreshToken(token),
};

// Instantiate use-cases với DI
export const authUseCase = new AuthUseCase(userRepo, mailService, jwtService);
export const loyaltyUseCase = new LoyaltyUseCase(userRepo);
export const couponUseCase = new CouponUseCase(couponRepo);
export const cmsUseCase = new CmsUseCase(cmsRepo);
export const staffUseCase = new StaffUseCase(staffRepo);

// Hotel, Booking, Payment use-cases vẫn giữ cấu trúc cũ nhưng đã có repositories
// (sẽ refactor tiếp ở bước sau nếu cần — hiện tại dùng singleton pattern để không break)
import hotelUseCaseInstance from '../use-cases/hotel/hotel.use-case';
import roomUseCaseInstance from '../use-cases/hotel/room.use-case';
import priceCalendarUseCaseInstance from '../use-cases/hotel/price-calendar.use-case';
import ratePlanUseCaseInstance from '../use-cases/hotel/rate-plan.use-case';
import bookingUseCaseInstance from '../use-cases/booking/booking.use-case';
import paymentUseCaseInstance from '../use-cases/payment/payment.use-case';
import userUseCaseInstance from '../use-cases/user/user.use-case';
import chatUseCaseInstance from '../use-cases/chat/chat.use-case';
import aiSearchUseCaseInstance from '../use-cases/ai-search/ai-search.use-case';

export const hotelUseCase = hotelUseCaseInstance;
export const roomUseCase = roomUseCaseInstance;
export const priceCalendarUseCase = priceCalendarUseCaseInstance;
export const ratePlanUseCase = ratePlanUseCaseInstance;
export const bookingUseCase = bookingUseCaseInstance;
export const paymentUseCase = paymentUseCaseInstance;
export const userUseCase = userUseCaseInstance;
export const chatUseCase = chatUseCaseInstance;
export const aiSearchUseCase = aiSearchUseCaseInstance;

// Expose repositories for direct use by controllers that still need them (transitional)
export { userRepo, hotelRepo, bookingRepo, couponRepo, paymentRepo, cmsRepo, staffRepo };
export { socketService, auditService, mailService };
