import { Router } from 'express';
import { Role } from '@prisma/client';
import { requireAuth, requireRole } from '../../infrastructure/middlewares/auth.middleware';
import staffController from '../controllers/staff.controller';

const router = Router();

// Tất cả các route trong phân hệ Staff yêu cầu đăng nhập
router.use(requireAuth);

// ----------------------------------------------------
// 1. OWNER / ADMIN ROUTES: QUẢN LÝ TÀI KHOẢN NHÂN VIÊN
// ----------------------------------------------------
router.post(
  '/manage',
  requireRole([Role.HOTEL_OWNER, Role.ADMIN]),
  staffController.createStaff
);

router.get(
  '/manage',
  requireRole([Role.HOTEL_OWNER, Role.ADMIN]),
  staffController.getStaffList
);

router.put(
  '/manage/:id',
  requireRole([Role.HOTEL_OWNER, Role.ADMIN]),
  staffController.updateStaff
);

router.delete(
  '/manage/:id',
  requireRole([Role.HOTEL_OWNER, Role.ADMIN]),
  staffController.deleteStaff
);

// ----------------------------------------------------
// 2. STAFF WORKSPACE ROUTES: LỄ TÂN & BUỒNG PHÒNG
// ----------------------------------------------------
router.get(
  '/workspace/overview',
  requireRole([Role.STAFF, Role.HOTEL_OWNER, Role.ADMIN]),
  staffController.getDashboardOverview
);

router.get(
  '/workspace/bookings',
  requireRole([Role.STAFF, Role.HOTEL_OWNER, Role.ADMIN]),
  staffController.getBookings
);

router.patch(
  '/workspace/bookings/:id/status',
  requireRole([Role.STAFF, Role.HOTEL_OWNER, Role.ADMIN]),
  staffController.updateBookingStatus
);

router.patch(
  '/workspace/booking-items/:itemId/assign-room',
  requireRole([Role.STAFF, Role.HOTEL_OWNER, Role.ADMIN]),
  staffController.assignRoomNumbers
);

router.get(
  '/workspace/rooms',
  requireRole([Role.STAFF, Role.HOTEL_OWNER, Role.ADMIN]),
  staffController.getRooms
);

router.patch(
  '/workspace/rooms/:id/housekeeping',
  requireRole([Role.STAFF, Role.HOTEL_OWNER, Role.ADMIN]),
  staffController.updateRoomStatus
);

export default router;
