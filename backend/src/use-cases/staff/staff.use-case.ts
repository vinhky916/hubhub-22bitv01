// Use-case: StaffUseCase (Clean Architecture — không import prisma)
import * as bcrypt from 'bcrypt';
import { IStaffRepository } from '../../domain/repositories/staff.repository';
import { AppError } from '../../infrastructure/middlewares/error.middleware';

export class StaffUseCase {
  constructor(private staffRepo: IStaffRepository) {}

  private async resolveHotelId(userId: string, userRole: string, requestedHotelId?: string): Promise<string> {
    if (userRole === 'STAFF') {
      const user = await this.staffRepo.findUserById(userId, { staffHotel: true });
      if (!user || !user.staffHotelId) throw new AppError('Tài khoản nhân viên chưa được gán vào khách sạn nào', 403);
      return user.staffHotelId;
    }

    if (userRole === 'HOTEL_OWNER') {
      const ownerHotels = await this.staffRepo.findHotelsByOwner(userId);
      if (ownerHotels.length === 0) throw new AppError('Bạn chưa đăng ký khách sạn nào', 400);
      if (requestedHotelId) {
        const isOwned = ownerHotels.some((h: any) => h.id === requestedHotelId);
        if (!isOwned) throw new AppError('Bạn không có quyền truy cập thông tin khách sạn này', 403);
        return requestedHotelId;
      }
      return ownerHotels[0].id;
    }

    if (userRole === 'ADMIN') {
      if (requestedHotelId) return requestedHotelId;
      const firstHotel = await this.staffRepo.findFirstHotel();
      if (!firstHotel) throw new AppError('Chưa có khách sạn nào trong hệ thống', 404);
      return firstHotel.id;
    }

    throw new AppError('Quyền truy cập không hợp lệ', 403);
  }

  public async createStaffAccount(ownerId: string, ownerRole: string, data: any) {
    const { fullName, email, password, phoneNumber, hotelId } = data;
    if (!fullName || !email || !password || !hotelId) throw new AppError('Vui lòng điền đầy đủ các thông tin bắt buộc', 400);

    if (ownerRole !== 'ADMIN') {
      const hotel = await this.staffRepo.findHotelById(hotelId) as any;
      if (!hotel || hotel.ownerId !== ownerId) throw new AppError('Bạn không phải chủ sở hữu của khách sạn này', 403);
    }

    const existingUser = await this.staffRepo.findUserByEmail(email);
    if (existingUser) throw new AppError('Email này đã được đăng ký sử dụng trong hệ thống', 400);

    if (phoneNumber && phoneNumber.trim() !== '') {
      const existingPhone = await this.staffRepo.findUserByPhone(phoneNumber.trim());
      if (existingPhone) throw new AppError('Số điện thoại này đã được sử dụng', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    return this.staffRepo.createStaffUser({
      data: {
        email, password: hashedPassword, fullName, phoneNumber: phoneNumber || null,
        role: 'STAFF', staffHotelId: hotelId, isVerified: true, isApproved: true,
      },
      select: {
        id: true, fullName: true, email: true, phoneNumber: true, role: true,
        isApproved: true, createdAt: true, staffHotel: { select: { id: true, name: true } },
      },
    });
  }

  public async getHotelStaffList(ownerId: string, ownerRole: string, hotelId?: string) {
    let hotelIds: string[] = [];
    if (ownerRole === 'ADMIN') {
      if (hotelId) hotelIds = [hotelId];
      else {
        const allHotels = await this.staffRepo.findHotelsByOwner('__ALL__');
        hotelIds = (allHotels as any[]).map(h => h.id);
      }
    } else {
      const ownerHotels = await this.staffRepo.findHotelsByOwner(ownerId);
      hotelIds = (ownerHotels as any[]).map(h => h.id);
      if (hotelId && !hotelIds.includes(hotelId)) throw new AppError('Bạn không có quyền quản lý nhân viên của khách sạn này', 403);
      if (hotelId) hotelIds = [hotelId];
    }
    return this.staffRepo.findStaffList(hotelIds);
  }

  public async updateStaffAccount(ownerId: string, ownerRole: string, staffId: string, data: any) {
    const { fullName, phoneNumber, isApproved, staffHotelId, password } = data;
    const staffUser = await this.staffRepo.findUserById(staffId, { staffHotel: true }) as any;
    if (!staffUser || staffUser.role !== 'STAFF') throw new AppError('Không tìm thấy tài khoản nhân viên', 404);

    if (ownerRole !== 'ADMIN' && staffUser.staffHotelId) {
      const hotel = await this.staffRepo.findHotelById(staffUser.staffHotelId) as any;
      if (!hotel || hotel.ownerId !== ownerId) throw new AppError('Bạn không có quyền quản lý nhân viên này', 403);
    }

    let hashedPassword: string | undefined;
    if (password && password.trim() !== '') hashedPassword = await bcrypt.hash(password, 10);

    return this.staffRepo.updateUser(staffId, {
      fullName: fullName || undefined, phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
      isApproved: isApproved !== undefined ? isApproved : undefined,
      staffHotelId: staffHotelId || undefined, password: hashedPassword,
    });
  }

  public async deleteStaffAccount(ownerId: string, ownerRole: string, staffId: string) {
    const staffUser = await this.staffRepo.findUserById(staffId) as any;
    if (!staffUser || staffUser.role !== 'STAFF') throw new AppError('Không tìm thấy tài khoản nhân viên', 404);

    if (ownerRole !== 'ADMIN' && staffUser.staffHotelId) {
      const hotel = await this.staffRepo.findHotelById(staffUser.staffHotelId) as any;
      if (!hotel || hotel.ownerId !== ownerId) throw new AppError('Bạn không có quyền xóa nhân viên này', 403);
    }

    await this.staffRepo.deleteUser(staffId);
    return { success: true, message: 'Đã xóa tài khoản nhân viên thành công' };
  }

  public async getStaffDashboardOverview(userId: string, role: string, requestedHotelId?: string) {
    const hotelId = await this.resolveHotelId(userId, role, requestedHotelId);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const [hotelInfo, arrivalsTodayCount, departuresTodayCount, inHouseCount, rooms] = await Promise.all([
      this.staffRepo.findHotelById(hotelId),
      this.staffRepo.countBookings({
        bookingItems: { some: { roomType: { hotelId } } },
        checkInDate: { gte: startOfToday, lte: endOfToday },
        status: { in: ['CONFIRMED', 'PENDING', 'PAYMENT_PROCESSING'] },
      }),
      this.staffRepo.countBookings({
        bookingItems: { some: { roomType: { hotelId } } },
        checkOutDate: { gte: startOfToday, lte: endOfToday },
        status: 'CHECKED_IN',
      }),
      this.staffRepo.countBookings({ bookingItems: { some: { roomType: { hotelId } } }, status: 'CHECKED_IN' }),
      this.staffRepo.findRooms({ roomType: { hotelId } }, { housekeepingStatus: true }),
    ]);

    const roomsArr = rooms as any[];
    const roomStats = {
      total: roomsArr.length,
      clean: roomsArr.filter(r => r.housekeepingStatus === 'CLEAN').length,
      dirty: roomsArr.filter(r => r.housekeepingStatus === 'DIRTY').length,
      inUse: roomsArr.filter(r => r.housekeepingStatus === 'IN_USE').length,
      maintenance: roomsArr.filter(r => r.housekeepingStatus === 'MAINTENANCE').length,
    };

    return { hotelInfo, stats: { arrivalsToday: arrivalsTodayCount, departuresToday: departuresTodayCount, inHouse: inHouseCount, roomStats } };
  }

  public async getStaffBookings(userId: string, role: string, filters: any) {
    const { requestedHotelId, query, filterType, page = 1, limit = 20 } = filters;
    const hotelId = await this.resolveHotelId(userId, role, requestedHotelId);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const whereCondition: any = { bookingItems: { some: { roomType: { hotelId } } } };
    if (filterType === 'ARRIVALS') {
      whereCondition.checkInDate = { gte: startOfToday, lte: endOfToday };
      whereCondition.status = { in: ['CONFIRMED', 'PENDING'] };
    } else if (filterType === 'DEPARTURES') {
      whereCondition.checkOutDate = { gte: startOfToday, lte: endOfToday };
      whereCondition.status = 'CHECKED_IN';
    } else if (filterType === 'IN_HOUSE') {
      whereCondition.status = 'CHECKED_IN';
    }

    if (query && query.trim() !== '') {
      const q = query.trim();
      whereCondition.OR = [
        { id: { contains: q, mode: 'insensitive' } }, { guestName: { contains: q, mode: 'insensitive' } },
        { guestEmail: { contains: q, mode: 'insensitive' } }, { guestPhone: { contains: q, mode: 'insensitive' } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [bookings, total] = await Promise.all([
      this.staffRepo.findBookings(whereCondition, {
        bookingItems: { include: { roomType: { select: { id: true, name: true } } } },
        payment: { select: { status: true, method: true, amount: true } },
      }, skip, Number(limit)),
      this.staffRepo.countBookings(whereCondition),
    ]);

    return { bookings, pagination: { total, page: Number(page), limit: Number(limit), totalPages: Math.ceil(total / Number(limit)) } };
  }

  public async updateBookingStatusByStaff(userId: string, role: string, bookingId: string, data: any) {
    const { status, internalNotes } = data;
    const booking = await this.staffRepo.findBookingById(bookingId, {
      bookingItems: { include: { roomType: { select: { hotelId: true } } } },
    }) as any;
    if (!booking) throw new AppError('Không tìm thấy đơn đặt phòng', 404);

    const bookingHotelId = booking.bookingItems[0]?.roomType.hotelId;
    const hotelId = await this.resolveHotelId(userId, role, bookingHotelId);
    if (bookingHotelId !== hotelId) throw new AppError('Đơn đặt phòng này không thuộc khách sạn của bạn', 403);

    const updatedBooking = await this.staffRepo.updateBooking(bookingId, {
      status, internalNotes: internalNotes !== undefined ? internalNotes : undefined,
    });

    for (const item of booking.bookingItems) {
      if (item.roomNumbers) {
        const numbers = item.roomNumbers.split(',').map((n: string) => n.trim());
        const roomsToUpdate = await this.staffRepo.findRooms({ roomTypeId: item.roomTypeId, roomNumber: { in: numbers } });
        let targetStatus: string | null = null;
        if (status === 'CHECKED_IN') targetStatus = 'IN_USE';
        else if (status === 'CHECKED_OUT' || status === 'COMPLETED') targetStatus = 'DIRTY';

        if (targetStatus && (roomsToUpdate as any[]).length > 0) {
          await this.staffRepo.updateManyRooms((roomsToUpdate as any[]).map(r => r.id), { housekeepingStatus: targetStatus });
        }
      }
    }

    return updatedBooking;
  }

  public async assignRoomNumbers(userId: string, role: string, bookingItemId: string, roomNumbers: string) {
    const item = await this.staffRepo.findBookingItemById(bookingItemId, { roomType: { select: { hotelId: true } } }) as any;
    if (!item) throw new AppError('Không tìm thấy phòng trong booking', 404);

    const hotelId = await this.resolveHotelId(userId, role, item.roomType.hotelId);
    if (item.roomType.hotelId !== hotelId) throw new AppError('Bạn không có quyền thao tác trên phòng này', 403);

    return this.staffRepo.updateBookingItem(bookingItemId, { roomNumbers });
  }

  public async getStaffRooms(userId: string, role: string, requestedHotelId?: string) {
    const hotelId = await this.resolveHotelId(userId, role, requestedHotelId);
    return this.staffRepo.findRoomTypes({ hotelId }, { rooms: { orderBy: { roomNumber: 'asc' } } });
  }

  public async updateRoomHousekeepingStatus(userId: string, role: string, roomId: string, status: string) {
    const room = await this.staffRepo.findRoomById(roomId, { roomType: { select: { hotelId: true } } }) as any;
    if (!room) throw new AppError('Không tìm thấy phòng', 404);

    const hotelId = await this.resolveHotelId(userId, role, room.roomType.hotelId);
    if (room.roomType.hotelId !== hotelId) throw new AppError('Bạn không có quyền thao tác trên phòng này', 403);

    return this.staffRepo.updateRoom(roomId, { housekeepingStatus: status });
  }
}

export default StaffUseCase;
