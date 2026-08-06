import { Router } from 'express';
import hotelController from '../controllers/hotel.controller';
import { validateRequest } from '../../infrastructure/middlewares/validation.middleware';
import { requireAuth, requireRole } from '../../infrastructure/middlewares/auth.middleware';
import { Role } from '@prisma/client';
import {
  createHotelSchema,
  updateHotelSchema,
  createRoomTypeSchema,
  updateRoomTypeSchema,
  createRoomSchema,
  updatePriceCalendarSchema,
  createAmenitySchema,
} from '../dtos/hotel.dto';

const router = Router();

// --- Các route public (Không cần đăng nhập) ---
router.get('/', hotelController.search);
router.get('/meta/amenities-categories', hotelController.getMeta);
router.get('/meta/locations', hotelController.getLocations);
router.get('/favorites/my', requireAuth, hotelController.getMyFavorites);
router.get('/:id', hotelController.getDetail);

// --- Các route yêu cầu đăng nhập & phân quyền ---
router.post(
  '/upload-image',
  requireAuth,
  requireRole([Role.HOTEL_OWNER, Role.ADMIN]),
  hotelController.uploadImage
);

router.post(
  '/meta/amenities',
  requireAuth,
  requireRole([Role.HOTEL_OWNER]),
  validateRequest(createAmenitySchema),
  hotelController.createAmenity
);

router.post(
  '/reviews/:id/reply',
  requireAuth,
  requireRole([Role.HOTEL_OWNER, Role.ADMIN, Role.STAFF]),
  hotelController.replyReview
);
router.post('/reviews/:id/like', hotelController.toggleLikeReview);
router.post('/:id/favorite', requireAuth, hotelController.toggleFavorite);
router.post('/:id/reviews', requireAuth, hotelController.createReview);
router.post(
  '/',
  requireAuth,
  requireRole([Role.HOTEL_OWNER]),
  validateRequest(createHotelSchema),
  hotelController.create
);

router.put(
  '/:id',
  requireAuth,
  requireRole([Role.HOTEL_OWNER, Role.ADMIN]),
  validateRequest(updateHotelSchema),
  hotelController.update
);

// Quản lý loại phòng
router.post(
  '/:id/room-types',
  requireAuth,
  requireRole([Role.HOTEL_OWNER]),
  validateRequest(createRoomTypeSchema),
  hotelController.createRoomType
);

router.put(
  '/room-types/:id',
  requireAuth,
  requireRole([Role.HOTEL_OWNER]),
  validateRequest(updateRoomTypeSchema),
  hotelController.updateRoomType
);

router.delete(
  '/room-types/:id',
  requireAuth,
  requireRole([Role.HOTEL_OWNER]),
  hotelController.deleteRoomType
);

// Quản lý phòng vật lý
router.post(
  '/rooms',
  requireAuth,
  requireRole([Role.HOTEL_OWNER]),
  validateRequest(createRoomSchema),
  hotelController.createRoom
);

router.delete(
  '/rooms/:id',
  requireAuth,
  requireRole([Role.HOTEL_OWNER]),
  hotelController.deleteRoom
);

router.put(
  '/room-types/:id/rooms',
  requireAuth,
  requireRole([Role.HOTEL_OWNER]),
  hotelController.updateRoomNumbersBulk
);

// Quản lý lịch giá phòng động
router.get(
  '/room-types/:id/price-calendar',
  requireAuth,
  requireRole([Role.HOTEL_OWNER]),
  hotelController.getPriceCalendar
);

router.post(
  '/room-types/:id/price-calendar',
  requireAuth,
  requireRole([Role.HOTEL_OWNER]),
  validateRequest(updatePriceCalendarSchema),
  hotelController.updatePriceCalendar
);

// --- Route Admin duyệt khách sạn ---
router.put(
  '/:id/approve',
  requireAuth,
  requireRole([Role.ADMIN]),
  hotelController.approve
);

export default router;
