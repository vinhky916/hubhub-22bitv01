import prisma from '../../config/database';
import * as bcrypt from 'bcrypt';
import { Role, BookingStatus, RoomHousekeepingStatus } from '@prisma/client';
import { AppError } from '../../infrastructure/middlewares/error.middleware';

export class StaffUseCase {
  // Helper: Xác định hotelId được phép thao tác của user (STAFF, HOTEL_OWNER, ADMIN)
  private async resolveHotelId(userId: string, userRole: string, requestedHotelId?: string): Promise<string> {
    if (userRole === Role.STAFF) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { staffHotelId: true },
      });
      if (!user || !user.staffHotelId) {
        throw new AppError('Tài khoản nhân viên chưa được gán vào khách sạn nào', 403);
      }
      return user.staffHotelId;
    }

    if (userRole === Role.HOTEL_OWNER) {
      const ownerHotels = await prisma.hotel.findMany({
        where: { ownerId: userId },
        select: { id: true },
      });
      if (ownerHotels.length === 0) {
        throw new AppError('Bạn chưa đăng ký khách sạn nào', 400);
      }
      if (requestedHotelId) {
        const isOwned = ownerHotels.some((h) => h.id === requestedHotelId);
        if (!isOwned) {
          throw new AppError('Bạn không có quyền truy cập thông tin khách sạn này', 403);
        }
        return requestedHotelId;
      }
      return ownerHotels[0].id;
    }

    if (userRole === Role.ADMIN) {
      if (requestedHotelId) return requestedHotelId;
      const firstHotel = await prisma.hotel.findFirst({ select: { id: true } });
      if (!firstHotel) throw new AppError('Chưa có khách sạn nào trong hệ thống', 404);
      return firstHotel.id;
    }

    throw new AppError('Quyền truy cập không hợp lệ', 403);
  }

  // ==========================================
  // 1. DÀNH CHO HOTEL OWNER: QUẢN LÝ TÀI KHOẢN STAFF
  // ==========================================

  public async createStaffAccount(ownerId: string, ownerRole: string, data: any) {
    const { fullName, email, password, phoneNumber, hotelId } = data;

    if (!fullName || !email || !password || !hotelId) {
      throw new AppError('Vui lòng điền đầy đủ các thông tin bắt buộc (họ tên, email, mật khẩu, khách sạn)', 400);
    }

    // Kiểm tra owner sở hữu hotelId
    if (ownerRole !== Role.ADMIN) {
      const hotel = await prisma.hotel.findFirst({
        where: { id: hotelId, ownerId },
      });
      if (!hotel) {
        throw new AppError('Bạn không phải chủ sở hữu của khách sạn này', 403);
      }
    }

    // Kiểm tra email tồn tại
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new AppError('Email này đã được đăng ký sử dụng trong hệ thống', 400);
    }

    // Kiểm tra phone nếu có
    if (phoneNumber && phoneNumber.trim() !== '') {
      const existingPhone = await prisma.user.findFirst({
        where: { phoneNumber: phoneNumber.trim() },
      });
      if (existingPhone) {
        throw new AppError('Số điện thoại này đã được sử dụng', 400);
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const staffUser = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        fullName,
        phoneNumber: phoneNumber || null,
        role: Role.STAFF,
        staffHotelId: hotelId,
        isVerified: true,
        isApproved: true,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        role: true,
        isApproved: true,
        createdAt: true,
        staffHotel: {
          select: { id: true, name: true },
        },
      },
    });

    return staffUser;
  }

  public async getHotelStaffList(ownerId: string, ownerRole: string, hotelId?: string) {
    let hotelIds: string[] = [];

    if (ownerRole === Role.ADMIN) {
      if (hotelId) hotelIds = [hotelId];
      else {
        const allHotels = await prisma.hotel.findMany({ select: { id: true } });
        hotelIds = allHotels.map((h) => h.id);
      }
    } else {
      const ownerHotels = await prisma.hotel.findMany({
        where: { ownerId },
        select: { id: true },
      });
      hotelIds = ownerHotels.map((h) => h.id);
      if (hotelId && !hotelIds.includes(hotelId)) {
        throw new AppError('Bạn không có quyền quản lý nhân viên của khách sạn này', 403);
      }
      if (hotelId) hotelIds = [hotelId];
    }

    const staffList = await prisma.user.findMany({
      where: {
        role: Role.STAFF,
        staffHotelId: { in: hotelIds },
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        avatarUrl: true,
        isApproved: true,
        createdAt: true,
        staffHotel: {
          select: { id: true, name: true, address: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return staffList;
  }

  public async updateStaffAccount(ownerId: string, ownerRole: string, staffId: string, data: any) {
    const { fullName, phoneNumber, isApproved, staffHotelId, password } = data;

    const staffUser = await prisma.user.findUnique({
      where: { id: staffId },
      include: { staffHotel: true },
    });

    if (!staffUser || staffUser.role !== Role.STAFF) {
      throw new AppError('Không tìm thấy tài khoản nhân viên', 404);
    }

    // Check ownership
    if (ownerRole !== Role.ADMIN && staffUser.staffHotelId) {
      const hotel = await prisma.hotel.findFirst({
        where: { id: staffUser.staffHotelId, ownerId },
      });
      if (!hotel) {
        throw new AppError('Bạn không có quyền quản lý nhân viên này', 403);
      }
    }

    let hashedPassword = undefined;
    if (password && password.trim() !== '') {
      hashedPassword = await bcrypt.hash(password, 10);
    }

    const updated = await prisma.user.update({
      where: { id: staffId },
      data: {
        fullName: fullName || undefined,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
        isApproved: isApproved !== undefined ? isApproved : undefined,
        staffHotelId: staffHotelId || undefined,
        password: hashedPassword,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        phoneNumber: true,
        isApproved: true,
        staffHotel: {
          select: { id: true, name: true },
        },
      },
    });

    return updated;
  }

  public async deleteStaffAccount(ownerId: string, ownerRole: string, staffId: string) {
    const staffUser = await prisma.user.findUnique({
      where: { id: staffId },
    });

    if (!staffUser || staffUser.role !== Role.STAFF) {
      throw new AppError('Không tìm thấy tài khoản nhân viên', 404);
    }

    if (ownerRole !== Role.ADMIN && staffUser.staffHotelId) {
      const hotel = await prisma.hotel.findFirst({
        where: { id: staffUser.staffHotelId, ownerId },
      });
      if (!hotel) {
        throw new AppError('Bạn không có quyền xóa nhân viên này', 403);
      }
    }

    await prisma.user.delete({ where: { id: staffId } });
    return { success: true, message: 'Đã xóa tài khoản nhân viên thành công' };
  }

  // ==========================================
  // 2. DÀNH CHO STAFF: WORKSPACE VẬN HÀNH (FRONT DESK & HOUSEKEEPING)
  // ==========================================

  public async getStaffDashboardOverview(userId: string, role: string, requestedHotelId?: string) {
    const hotelId = await this.resolveHotelId(userId, role, requestedHotelId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // 1. Lấy thông tin khách sạn
    const hotelInfo = await prisma.hotel.findUnique({
      where: { id: hotelId },
      select: { id: true, name: true, address: true, starRating: true },
    });

    // 2. Arrivals hôm nay (Bookings đến hôm nay & chưa check-in)
    const arrivalsTodayCount = await prisma.booking.count({
      where: {
        bookingItems: { some: { roomType: { hotelId } } },
        checkInDate: { gte: startOfToday, lte: endOfToday },
        status: { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING, BookingStatus.PAYMENT_PROCESSING] },
      },
    });

    // 3. Departures hôm nay (Bookings đi hôm nay & đang ở)
    const departuresTodayCount = await prisma.booking.count({
      where: {
        bookingItems: { some: { roomType: { hotelId } } },
        checkOutDate: { gte: startOfToday, lte: endOfToday },
        status: BookingStatus.CHECKED_IN,
      },
    });

    // 4. In-House guests (Khách đang ở)
    const inHouseCount = await prisma.booking.count({
      where: {
        bookingItems: { some: { roomType: { hotelId } } },
        status: BookingStatus.CHECKED_IN,
      },
    });

    // 5. Thống kê Buồng phòng (Rooms)
    const rooms = await prisma.room.findMany({
      where: { roomType: { hotelId } },
      select: { housekeepingStatus: true },
    });

    const roomStats = {
      total: rooms.length,
      clean: rooms.filter((r) => r.housekeepingStatus === RoomHousekeepingStatus.CLEAN).length,
      dirty: rooms.filter((r) => r.housekeepingStatus === RoomHousekeepingStatus.DIRTY).length,
      inUse: rooms.filter((r) => r.housekeepingStatus === RoomHousekeepingStatus.IN_USE).length,
      maintenance: rooms.filter((r) => r.housekeepingStatus === RoomHousekeepingStatus.MAINTENANCE).length,
    };

    return {
      hotelInfo,
      stats: {
        arrivalsToday: arrivalsTodayCount,
        departuresToday: departuresTodayCount,
        inHouse: inHouseCount,
        roomStats,
      },
    };
  }

  public async getStaffBookings(userId: string, role: string, filters: any) {
    const { requestedHotelId, query, filterType, page = 1, limit = 20 } = filters;
    const hotelId = await this.resolveHotelId(userId, role, requestedHotelId);

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const whereCondition: any = {
      bookingItems: { some: { roomType: { hotelId } } },
    };

    // Filter theo loại danh sách
    if (filterType === 'ARRIVALS') {
      whereCondition.checkInDate = { gte: startOfToday, lte: endOfToday };
      whereCondition.status = { in: [BookingStatus.CONFIRMED, BookingStatus.PENDING] };
    } else if (filterType === 'DEPARTURES') {
      whereCondition.checkOutDate = { gte: startOfToday, lte: endOfToday };
      whereCondition.status = BookingStatus.CHECKED_IN;
    } else if (filterType === 'IN_HOUSE') {
      whereCondition.status = BookingStatus.CHECKED_IN;
    }

    // Search query
    if (query && query.trim() !== '') {
      const q = query.trim();
      whereCondition.OR = [
        { id: { contains: q, mode: 'insensitive' } },
        { guestName: { contains: q, mode: 'insensitive' } },
        { guestEmail: { contains: q, mode: 'insensitive' } },
        { guestPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where: whereCondition,
        include: {
          bookingItems: {
            include: {
              roomType: { select: { id: true, name: true } },
            },
          },
          payment: { select: { status: true, method: true, amount: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: Number(limit),
      }),
      prisma.booking.count({ where: whereCondition }),
    ]);

    return {
      bookings,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    };
  }

  public async updateBookingStatusByStaff(userId: string, role: string, bookingId: string, data: any) {
    const { status, internalNotes } = data;
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            roomType: { select: { hotelId: true } },
          },
        },
      },
    });

    if (!booking) throw new AppError('Không tìm thấy đơn đặt phòng', 404);

    const bookingHotelId = booking.bookingItems[0]?.roomType.hotelId;
    const hotelId = await this.resolveHotelId(userId, role, bookingHotelId);

    if (bookingHotelId !== hotelId) {
      throw new AppError('Đơn đặt phòng này không thuộc khách sạn của bạn', 403);
    }

    const updatedBooking = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: status as BookingStatus,
        internalNotes: internalNotes !== undefined ? internalNotes : undefined,
      },
      include: {
        bookingItems: {
          include: { roomType: { select: { id: true, name: true } } },
        },
        payment: true,
      },
    });

    // Tự động cập nhật phòng thực tế nếu có số phòng được gán
    for (const item of booking.bookingItems) {
      if (item.roomNumbers) {
        const numbers = item.roomNumbers.split(',').map((n) => n.trim());
        const roomsToUpdate = await prisma.room.findMany({
          where: {
            roomTypeId: item.roomTypeId,
            roomNumber: { in: numbers },
          },
        });

        let targetStatus: RoomHousekeepingStatus | null = null;
        if (status === BookingStatus.CHECKED_IN) {
          targetStatus = RoomHousekeepingStatus.IN_USE;
        } else if (status === BookingStatus.CHECKED_OUT || status === BookingStatus.COMPLETED) {
          targetStatus = RoomHousekeepingStatus.DIRTY;
        }

        if (targetStatus && roomsToUpdate.length > 0) {
          await prisma.room.updateMany({
            where: { id: { in: roomsToUpdate.map((r) => r.id) } },
            data: { housekeepingStatus: targetStatus },
          });
        }
      }
    }

    return updatedBooking;
  }

  public async assignRoomNumbers(userId: string, role: string, bookingItemId: string, roomNumbers: string) {
    const item = await prisma.bookingItem.findUnique({
      where: { id: bookingItemId },
      include: { roomType: { select: { hotelId: true } } },
    });

    if (!item) throw new AppError('Không tìm thấy phòng trong booking', 404);

    const hotelId = await this.resolveHotelId(userId, role, item.roomType.hotelId);
    if (item.roomType.hotelId !== hotelId) {
      throw new AppError('Bạn không có quyền thao tác trên phòng này', 403);
    }

    const updatedItem = await prisma.bookingItem.update({
      where: { id: bookingItemId },
      data: { roomNumbers },
    });

    return updatedItem;
  }

  public async getStaffRooms(userId: string, role: string, requestedHotelId?: string) {
    const hotelId = await this.resolveHotelId(userId, role, requestedHotelId);

    const roomTypes = await prisma.roomType.findMany({
      where: { hotelId },
      include: {
        rooms: {
          orderBy: { roomNumber: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return roomTypes;
  }

  public async updateRoomHousekeepingStatus(userId: string, role: string, roomId: string, status: RoomHousekeepingStatus) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: { roomType: { select: { hotelId: true } } },
    });

    if (!room) throw new AppError('Không tìm thấy phòng', 404);

    const hotelId = await this.resolveHotelId(userId, role, room.roomType.hotelId);
    if (room.roomType.hotelId !== hotelId) {
      throw new AppError('Bạn không có quyền thao tác trên phòng này', 403);
    }

    const updatedRoom = await prisma.room.update({
      where: { id: roomId },
      data: { housekeepingStatus: status },
    });

    return updatedRoom;
  }
}

export default new StaffUseCase();
