import prisma from '../../config/database';
import { AppError } from '../../infrastructure/middlewares/error.middleware';
import ratePlanUseCase from './rate-plan.use-case';

export class RoomUseCase {
  // --- Quản lý Loại Phòng (RoomType) ---
  
  public async createRoomType(hotelId: string, ownerId: string, data: any) {
    // Kiểm tra xem khách sạn có thuộc về owner này không
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new AppError('Không tìm thấy khách sạn', 404);
    if (hotel.ownerId !== ownerId) throw new AppError('Bạn không sở hữu khách sạn này', 403);

    const { name, description, basePrice, capacity, bedCount, bedType, size, amenities, images, roomCount, includeBreakfast, childSurcharge, cancellationPolicy, paymentPolicy } = data;

    const roomType = await (prisma.roomType as any).create({
      data: {
        hotelId,
        name,
        description,
        basePrice,
        capacity,
        bedCount,
        bedType: bedType || "Giường Đôi",
        size,
        amenities,
        includeBreakfast: !!includeBreakfast,
        childSurcharge: Number(childSurcharge) || 0,
        cancellationPolicy: cancellationPolicy || "FREE_24H",
        paymentPolicy: paymentPolicy || "PAY_AT_HOTEL",
        images: {
          create: images.map((img: any) => ({
            url: img.url,
            isPrimary: img.isPrimary,
          })),
        },
      },
      include: {
        images: true,
        rooms: true,
      },
    });

    // Tự động tạo các số phòng vật lý mẫu (101, 102...)
    if (roomCount && Number(roomCount) > 0) {
      const roomsData = Array.from({ length: Number(roomCount) }).map((_, i) => ({
        roomTypeId: roomType.id,
        roomNumber: `${101 + i}`,
        isAvailable: true,
      }));
      await prisma.room.createMany({ data: roomsData });
    }

    // Tự động tạo 2 gói Rate Plan mặc định (Flexible & Non-refundable)
    try {
      await ratePlanUseCase.createDefaultRatePlans(roomType.id, parseFloat(basePrice.toString()));
    } catch (err) {
      console.error('Failed to create default rate plans:', err);
    }

    // Load lại hạng phòng kèm danh sách phòng vừa tạo
    const result = await prisma.roomType.findUnique({
      where: { id: roomType.id },
      include: {
        images: true,
        rooms: true,
        ratePlans: true,
      }
    });

    return result || roomType;
  }

  public async updateRoomType(roomTypeId: string, ownerId: string, data: any) {
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: { hotel: true },
    });
    if (!roomType) throw new AppError('Không tìm thấy loại phòng', 404);
    if (roomType.hotel.ownerId !== ownerId) throw new AppError('Bạn không sở hữu khách sạn chứa loại phòng này', 403);

    const { name, description, basePrice, capacity, bedCount, bedType, size, amenities, images, roomCount, includeBreakfast, childSurcharge, cancellationPolicy, paymentPolicy } = data;

    if (images && Array.isArray(images)) {
      await prisma.roomImage.deleteMany({ where: { roomTypeId } });
      await prisma.roomImage.createMany({
        data: images.map((img: any) => ({
          roomTypeId,
          url: img.url,
          isPrimary: img.isPrimary ?? false,
        })),
      });
    }

    // Đồng bộ số lượng phòng vật lý
    if (roomCount !== undefined) {
      const existingRooms = await prisma.room.findMany({ where: { roomTypeId } });
      const currentCount = existingRooms.length;
      const targetCount = Number(roomCount) || 0;

      if (targetCount > currentCount) {
        const diff = targetCount - currentCount;
        const roomsToCreate = Array.from({ length: diff }).map((_, i) => ({
          roomTypeId,
          roomNumber: `Phòng ${currentCount + i + 1}`,
          isAvailable: true
        }));
        await prisma.room.createMany({ data: roomsToCreate });
      } else if (targetCount < currentCount) {
        const diff = currentCount - targetCount;
        const roomsToDelete = existingRooms.slice(targetCount);
        await prisma.room.deleteMany({
          where: { id: { in: roomsToDelete.map(r => r.id) } }
        });
      }
    }

    const updated = await (prisma.roomType as any).update({
      where: { id: roomTypeId },
      data: {
        name,
        description,
        basePrice,
        capacity,
        bedCount,
        bedType: bedType !== undefined ? bedType : undefined,
        size,
        amenities,
        includeBreakfast: includeBreakfast !== undefined ? !!includeBreakfast : undefined,
        childSurcharge: childSurcharge !== undefined ? Number(childSurcharge) : undefined,
        cancellationPolicy: cancellationPolicy !== undefined ? cancellationPolicy : undefined,
        paymentPolicy: paymentPolicy !== undefined ? paymentPolicy : undefined,
      },
      include: {
        images: true,
        rooms: true,
      },
    });

    return updated;
  }

  public async deleteRoomType(roomTypeId: string, ownerId: string) {
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: { hotel: true },
    });
    if (!roomType) throw new AppError('Không tìm thấy loại phòng', 404);
    if (roomType.hotel.ownerId !== ownerId) throw new AppError('Bạn không sở hữu khách sạn chứa loại phòng này', 403);

    await prisma.roomType.delete({ where: { id: roomTypeId } });
    return { success: true };
  }

  // --- Quản lý Phòng Vật Lý (Room) ---

  public async createRoom(roomTypeId: string, roomNumber: string, ownerId: string) {
    // Kiểm tra loại phòng và khách sạn
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: { hotel: true },
    });
    if (!roomType) throw new AppError('Không tìm thấy loại phòng', 404);
    if (roomType.hotel.ownerId !== ownerId) throw new AppError('Bạn không sở hữu khách sạn chứa loại phòng này', 403);

    // Kiểm tra số phòng trùng lặp trong cùng một loại phòng hoặc khách sạn
    const existingRoom = await prisma.room.findFirst({
      where: {
        roomTypeId,
        roomNumber,
      },
    });
    if (existingRoom) {
      throw new AppError('Số phòng này đã tồn tại trong loại phòng này', 400);
    }

    const room = await prisma.room.create({
      data: {
        roomTypeId,
        roomNumber,
        isAvailable: true,
      },
    });

    return room;
  }

  public async deleteRoom(roomId: string, ownerId: string) {
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        roomType: {
          include: { hotel: true },
        },
      },
    });

    if (!room) throw new AppError('Không tìm thấy phòng vật lý', 404);
    if (room.roomType.hotel.ownerId !== ownerId) {
      throw new AppError('Bạn không sở hữu khách sạn chứa phòng này', 403);
    }

    await prisma.room.delete({ where: { id: roomId } });
    return { success: true };
  }

  public async updateRoomNumbersBulk(roomTypeId: string, ownerId: string, roomNumbers: string[]) {
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: { hotel: true },
    });
    if (!roomType) throw new AppError('Không tìm thấy loại phòng', 404);
    if (roomType.hotel.ownerId !== ownerId) throw new AppError('Bạn không sở hữu khách sạn chứa loại phòng này', 403);

    const cleanedNumbers = Array.from(
      new Set(roomNumbers.map((num) => num.toString().trim()).filter(Boolean))
    );

    if (cleanedNumbers.length === 0) {
      throw new AppError('Danh sách số phòng không được để trống', 400);
    }

    const existingRooms = await prisma.room.findMany({ where: { roomTypeId } });

    // Xóa các phòng không còn trong danh sách mới
    const toDeleteRooms = existingRooms.filter((r) => !cleanedNumbers.includes(r.roomNumber));
    if (toDeleteRooms.length > 0) {
      await prisma.room.deleteMany({
        where: { id: { in: toDeleteRooms.map((r) => r.id) } },
      });
    }

    // Tạo mới các phòng chưa tồn tại
    const existingNumbers = existingRooms.map((r) => r.roomNumber);
    const toCreateNumbers = cleanedNumbers.filter((num) => !existingNumbers.includes(num));

    if (toCreateNumbers.length > 0) {
      await prisma.room.createMany({
        data: toCreateNumbers.map((num) => ({
          roomTypeId,
          roomNumber: num,
          isAvailable: true,
          housekeepingStatus: 'CLEAN',
        })),
      });
    }

    const updatedRooms = await prisma.room.findMany({
      where: { roomTypeId },
      orderBy: { roomNumber: 'asc' },
    });

    return updatedRooms;
  }
}

export default new RoomUseCase();
