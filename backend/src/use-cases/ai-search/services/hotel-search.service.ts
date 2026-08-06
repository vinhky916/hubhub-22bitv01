import prisma from '../../../config/database';
import { HotelStatus, Prisma } from '@prisma/client';

export class HotelSearchService {
  /**
   * Truy vấn danh sách khách sạn có phân trang
   */
  public async searchHotels(where: Prisma.HotelWhereInput, orderBy: Prisma.HotelOrderByWithRelationInput[], page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [hotels, total] = await Promise.all([
      prisma.hotel.findMany({
        where,
        include: {
          images: true,
          category: true,
          province: true,
          district: true,
          ward: true,
          roomTypes: {
            orderBy: { basePrice: 'asc' },
          },
          reviews: {
            select: { ratingOverall: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.hotel.count({ where })
    ]);

    return { hotels, total };
  }

  /**
   * Truy vấn danh sách các Tỉnh/Thành phố THỰC TẾ đang có phòng trong DB để làm gợi ý khi 0 kết quả
   */
  public async getActiveProvinces(): Promise<string[]> {
    try {
      const activeHotels = await prisma.hotel.findMany({
        where: { status: HotelStatus.APPROVED },
        select: { province: { select: { name: true } } },
        distinct: ['provinceId'],
        take: 5
      });
      return activeHotels.map(h => h.province?.name).filter((name): name is string => Boolean(name));
    } catch (err) {
      console.error('[HotelSearchService] Lỗi lấy danh sách tỉnh active:', err);
      return ['Đà Lạt', 'Đà Nẵng'];
    }
  }
}

export default new HotelSearchService();
