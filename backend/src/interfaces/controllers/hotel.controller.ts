import { Request, Response, NextFunction } from 'express';
import hotelUseCase from '../../use-cases/hotel/hotel.use-case';
import roomUseCase from '../../use-cases/hotel/room.use-case';
import priceCalendarUseCase from '../../use-cases/hotel/price-calendar.use-case';
import { AuthenticatedRequest } from '../../infrastructure/middlewares/auth.middleware';
import { Role, HotelStatus } from '@prisma/client';
import { verifyAccessToken } from '../../infrastructure/security/jwt';
import prisma from '../../config/database';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class HotelController {
  // --- Khách Sạn (Hotels) ---
  
  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const result = await hotelUseCase.createHotel(ownerId, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo khách sạn thành công. Vui lòng chờ kiểm duyệt từ Admin.',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async update(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = req.params.id;
      const { userId, role } = req.user!;
      const result = await hotelUseCase.updateHotel(hotelId, userId, role, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin khách sạn thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getDetail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { checkIn, checkOut } = req.query;
      const result = await hotelUseCase.getHotelDetail(
        id,
        checkIn as string | undefined,
        checkOut as string | undefined
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async search(req: Request, res: Response, next: NextFunction) {
    try {
      let userId: string | undefined = undefined;
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
          const token = authHeader.split(' ')[1];
          const decoded = verifyAccessToken(token);
          userId = decoded.userId;
        } catch (e) {
          // Bỏ qua lỗi token nếu là public search
        }
      }

      const result = await hotelUseCase.searchHotels(req.query, userId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async approve(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { status, rejectReason } = req.body;
      const result = await hotelUseCase.approveHotel(id, status as HotelStatus, rejectReason);
      res.status(200).json({
        success: true,
        message: `Đã thay đổi trạng thái khách sạn thành: ${status}`,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Loại Phòng (Room Types) ---

  public async createRoomType(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const hotelId = req.params.id;
      const ownerId = req.user!.userId;
      const result = await roomUseCase.createRoomType(hotelId, ownerId, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo loại phòng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateRoomType(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roomTypeId = req.params.id;
      const ownerId = req.user!.userId;
      const result = await roomUseCase.updateRoomType(roomTypeId, ownerId, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật loại phòng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async deleteRoomType(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roomTypeId = req.params.id;
      const ownerId = req.user!.userId;
      await roomUseCase.deleteRoomType(roomTypeId, ownerId);
      res.status(200).json({
        success: true,
        message: 'Xóa loại phòng thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Phòng Vật Lý (Rooms) ---

  public async createRoom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const ownerId = req.user!.userId;
      const { roomTypeId, roomNumber } = req.body;
      const result = await roomUseCase.createRoom(roomTypeId, roomNumber, ownerId);
      res.status(201).json({
        success: true,
        message: 'Thêm số phòng vật lý thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async deleteRoom(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roomId = req.params.id;
      const ownerId = req.user!.userId;
      await roomUseCase.deleteRoom(roomId, ownerId);
      res.status(200).json({
        success: true,
        message: 'Xóa phòng vật lý thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  public async updateRoomNumbersBulk(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roomTypeId = req.params.id;
      const ownerId = req.user!.userId;
      const { roomNumbers } = req.body;
      const result = await roomUseCase.updateRoomNumbersBulk(roomTypeId, ownerId, roomNumbers);
      res.status(200).json({
        success: true,
        message: 'Cập nhật danh sách số phòng thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Lịch Giá Động (Price Calendar) ---

  public async getPriceCalendar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roomTypeId = req.params.id;
      const ownerId = req.user!.userId;
      const { startDate, endDate } = req.query;
      const result = await priceCalendarUseCase.getPriceCalendar(
        roomTypeId,
        ownerId,
        startDate as string,
        endDate as string
      );
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async updatePriceCalendar(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const roomTypeId = req.params.id;
      const ownerId = req.user!.userId;
      const { prices } = req.body;
      await priceCalendarUseCase.updatePriceCalendar(roomTypeId, ownerId, prices);
      res.status(200).json({
        success: true,
        message: 'Cập nhật lịch giá phòng thành công',
      });
    } catch (error) {
      next(error);
    }
  }

  public async toggleFavorite(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const hotelId = req.params.id;
      const result = await hotelUseCase.toggleFavorite(userId, hotelId);
      res.status(200).json({
        success: true,
        message: result.isFavorite ? 'Đã thêm khách sạn vào mục yêu thích' : 'Đã xóa khách sạn khỏi mục yêu thích',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getMyFavorites(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const result = await hotelUseCase.getMyFavorites(userId);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async createReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const hotelId = req.params.id;
      const { ratingCleanliness, ratingLocation, ratingService, ratingFacilities, ratingValue, comment } = req.body;

      if (!comment || typeof comment !== 'string') {
        res.status(400).json({ success: false, message: 'Nhận xét không được để trống.' });
        return;
      }

      const rc = Number(ratingCleanliness) || 5;
      const rl = Number(ratingLocation) || 5;
      const rs = Number(ratingService) || 5;
      const rf = Number(ratingFacilities) || 5;
      const rv = Number(ratingValue) || 5;
      const ratingOverall = parseFloat(((rc + rl + rs + rf + rv) / 5).toFixed(1));

      const review = await prisma.review.create({
        data: {
          userId,
          hotelId,
          ratingCleanliness: rc,
          ratingLocation: rl,
          ratingService: rs,
          ratingFacilities: rf,
          ratingValue: rv,
          ratingOverall,
          comment,
        },
        include: {
          user: {
            select: {
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      });

      res.status(201).json({
        success: true,
        message: 'Gửi đánh giá thành công',
        data: review,
      });
    } catch (error) {
      next(error);
    }
  }

  public async replyReview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const userRole = req.user!.role;
      const reviewId = req.params.id;
      const { replyText } = req.body;

      if (!replyText || typeof replyText !== 'string' || !replyText.trim()) {
        res.status(400).json({ success: false, message: 'Nội dung phản hồi không được để trống.' });
        return;
      }

      const review = await prisma.review.findUnique({
        where: { id: reviewId },
        include: { hotel: true },
      });

      if (!review) {
        res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
        return;
      }

      if (userRole !== Role.ADMIN && review.hotel.ownerId !== userId) {
        res.status(403).json({ success: false, message: 'Bạn không có quyền phản hồi đánh giá này.' });
        return;
      }

      const updatedReview = await prisma.review.update({
        where: { id: reviewId },
        data: {
          ownerReply: replyText.trim(),
          ownerRepliedAt: new Date(),
        },
        include: {
          user: {
            select: {
              fullName: true,
              avatarUrl: true,
              email: true,
            },
          },
        },
      });

      res.status(200).json({
        success: true,
        message: 'Gửi phản hồi đánh giá thành công',
        data: updatedReview,
      });
    } catch (error) {
      next(error);
    }
  }

  public async toggleLikeReview(req: Request, res: Response, next: NextFunction) {
    try {
      const reviewId = req.params.id;
      const review = await prisma.review.findUnique({ where: { id: reviewId } });
      if (!review) {
        res.status(404).json({ success: false, message: 'Không tìm thấy đánh giá.' });
        return;
      }

      const updated = await prisma.review.update({
        where: { id: reviewId },
        data: {
          likesCount: { increment: 1 }
        }
      });

      res.status(200).json({
        success: true,
        message: 'Cảm ơn bạn đã thích đánh giá!',
        data: { likesCount: updated.likesCount }
      });
    } catch (error) {
      next(error);
    }
  }

  public async getMeta(req: Request, res: Response, next: NextFunction) {
    try {
      const amenities = await prisma.amenity.findMany({ orderBy: { name: 'asc' } });
      const categories = await prisma.category.findMany({ orderBy: { name: 'asc' } });
      res.status(200).json({
        success: true,
        data: { amenities, categories },
      });
    } catch (error) {
      next(error);
    }
  }

  public async createAmenity(req: Request, res: Response, next: NextFunction) {
    try {
      const { name, icon } = req.body;
      const existing = await prisma.amenity.findFirst({
        where: { name: { equals: name, mode: 'insensitive' } }
      });
      if (existing) {
        res.status(200).json({
          success: true,
          data: existing
        });
        return;
      }
      const newAmenity = await prisma.amenity.create({
        data: { name, icon: icon || 'Sparkles' }
      });
      res.status(201).json({
        success: true,
        data: newAmenity
      });
    } catch (error) {
      next(error);
    }
  }

  public async getLocations(req: Request, res: Response, next: NextFunction) {
    try {
      const { provinceId, districtId } = req.query;
      if (districtId) {
        const wards = await prisma.ward.findMany({
          where: { districtId: districtId as string },
          orderBy: { name: 'asc' }
        });
        res.status(200).json({ success: true, data: wards });
        return;
      }
      if (provinceId) {
        const districts = await prisma.district.findMany({
          where: { provinceId: provinceId as string },
          orderBy: { name: 'asc' }
        });
        res.status(200).json({ success: true, data: districts });
        return;
      }
      const provinces = await prisma.province.findMany({ orderBy: { name: 'asc' } });
      res.status(200).json({ success: true, data: provinces });
    } catch (error) {
      next(error);
    }
  }

  public async uploadImage(req: Request, res: Response, next: NextFunction) {
    try {
      const { image } = req.body;
      if (!image) {
        res.status(400).json({ success: false, message: 'No image data provided' });
        return;
      }

      const matches = image.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        res.status(400).json({ success: false, message: 'Invalid base64 image format' });
        return;
      }

      const ext = matches[1];
      const base64Data = matches[2];
      const buffer = Buffer.from(base64Data, 'base64');

      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const filename = `${crypto.randomUUID()}.${ext === 'jpeg' ? 'jpg' : ext}`;
      const filepath = path.join(uploadsDir, filename);

      fs.writeFileSync(filepath, buffer);

      const imageUrl = `${req.protocol}://${req.get('host')}/uploads/${filename}`;

      res.status(200).json({
        success: true,
        data: { url: imageUrl }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new HotelController();
