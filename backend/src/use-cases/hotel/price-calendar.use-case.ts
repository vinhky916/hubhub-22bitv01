import prisma from '../../config/database';
import { AppError } from '../../infrastructure/middlewares/error.middleware';
import socketService from '../../infrastructure/services/socket.service';

export class PriceCalendarUseCase {
  public async getPriceCalendar(roomTypeId: string, ownerId: string, startDate: string, endDate: string) {
    // Kiểm tra quyền chủ sở hữu
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: { hotel: true },
    });
    if (!roomType) throw new AppError('Không tìm thấy loại phòng', 404);
    if (roomType.hotel.ownerId !== ownerId) throw new AppError('Bạn không sở hữu khách sạn này', 403);

    const startStr = typeof startDate === 'string' ? startDate.split('T')[0] : new Date(startDate).toISOString().split('T')[0];
    const endStr = typeof endDate === 'string' ? endDate.split('T')[0] : new Date(endDate).toISOString().split('T')[0];

    const start = new Date(`${startStr}T00:00:00.000Z`);
    start.setDate(start.getDate() - 1);

    const end = new Date(`${endStr}T23:59:59.999Z`);
    end.setDate(end.getDate() + 1);

    const calendar = await prisma.roomPriceCalendar.findMany({
      where: {
        roomTypeId,
        date: {
          gte: start,
          lte: end,
        },
      },
      orderBy: { date: 'asc' },
    });

    return calendar;
  }

  public async updatePriceCalendar(roomTypeId: string, ownerId: string, prices: any[]) {
    // Kiểm tra quyền chủ sở hữu
    const roomType = await prisma.roomType.findUnique({
      where: { id: roomTypeId },
      include: { hotel: true },
    });
    if (!roomType) throw new AppError('Không tìm thấy loại phòng', 404);
    if (roomType.hotel.ownerId !== ownerId) throw new AppError('Bạn không sở hữu khách sạn này', 403);

    // Tiến hành upsert hoặc xóa từng bản ghi lịch giá
    const transactions = prices.map((item) => {
      // Chuẩn hóa ngày về 00:00:00.000 UTC chuẩn để tránh lệch múi giờ
      const dateOnly = typeof item.date === 'string' ? item.date.split('T')[0] : new Date(item.date).toISOString().split('T')[0];
      const dateObj = new Date(`${dateOnly}T00:00:00.000Z`);

      if (item.isRestore) {
        return prisma.roomPriceCalendar.deleteMany({
          where: {
            roomTypeId,
            date: dateObj,
          },
        });
      }

      return prisma.roomPriceCalendar.upsert({
        where: {
          roomTypeId_date: {
            roomTypeId,
            date: dateObj,
          },
        },
        update: {
          price: item.price,
          isBlocked: item.isBlocked !== undefined ? item.isBlocked : false,
        },
        create: {
          roomTypeId,
          date: dateObj,
          price: item.price,
          isBlocked: item.isBlocked !== undefined ? item.isBlocked : false,
        },
      });
    });

    // Thực hiện tất cả dưới dạng transaction
    await prisma.$transaction(transactions);

    // Phát tín hiệu Socket.io thời gian thực báo lịch phòng cập nhật
    socketService.emitCalendarUpdate(roomType.hotelId, roomTypeId);

    return { success: true };
  }
}

export default new PriceCalendarUseCase();
