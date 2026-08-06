import { Router } from 'express';
import bookingController from '../controllers/booking.controller';
import statsController from '../controllers/stats.controller';
import { requireAuth, requireRole, optionalAuth } from '../../infrastructure/middlewares/auth.middleware';
import { Role } from '@prisma/client';
import { validateRequest } from '../../infrastructure/middlewares/validation.middleware';
import { createBookingSchema } from '../dtos/booking.dto';

const router = Router();

// Route tạo đặt phòng yêu cầu người dùng phải đăng nhập trước
router.post('/', requireAuth, validateRequest(createBookingSchema), bookingController.create);

// Route thống kê cho quản trị viên và đối tác chủ phòng
router.get('/admin-stats', requireAuth, requireRole([Role.ADMIN]), statsController.getAdminStats);
router.get('/owner-stats', requireAuth, requireRole([Role.HOTEL_OWNER]), statsController.getOwnerStats);

// Các route xem lịch sử và quản lý đơn vẫn yêu cầu xác thực người dùng
router.get('/my', requireAuth, bookingController.getMyBookings);
router.get('/:id', bookingController.getDetail);
router.put('/:id/status', optionalAuth, bookingController.updateStatus);
router.put('/:id/apply-discount', requireAuth, bookingController.applyDiscount);
router.get('/:id/audit-logs', requireAuth, bookingController.getAuditLogs);
router.put('/:id/internal-notes', requireAuth, bookingController.updateInternalNotes);
router.put('/:id/assign-rooms', requireAuth, bookingController.updateRoomAssignments);
router.put('/:id/change-dates', requireAuth, bookingController.changeBookingDates);

export default router;
