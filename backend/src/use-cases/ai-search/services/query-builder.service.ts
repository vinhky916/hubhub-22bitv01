import { HotelStatus, Prisma, PropertyType } from '@prisma/client';
import { BookingSlots } from '../../../interfaces/types/ai-search.types';

export class QueryBuilderService {
  /**
   * Xây dựng điều kiện Prisma.HotelWhereInput từ đối tượng BookingSlots sau khi qua lớp NLP
   */
  public buildWhereClause(slots: BookingSlots, resolvedProvinceId?: string, resolvedDistrictId?: string): Prisma.HotelWhereInput {
    const where: Prisma.HotelWhereInput = {
      status: HotelStatus.APPROVED,
    };

    // A. Loại chỗ ở (PropertyType: HOTEL, RESORT, VILLA, HOMESTAY, APARTMENT, GUESTHOUSE)
    if (slots.propertyType) {
      where.propertyType = slots.propertyType;
    }

    // B. Vị trí
    if (resolvedProvinceId) {
      where.provinceId = resolvedProvinceId;
    } else if (resolvedDistrictId) {
      where.districtId = resolvedDistrictId;
    } else if (slots.city) {
      where.OR = [
        { address: { contains: slots.city, mode: 'insensitive' } },
        { name: { contains: slots.city, mode: 'insensitive' } }
      ];
    }

    // C. Khoảng giá & Sức chứa phòng (Người lớn + Trẻ em)
    const roomTypeConditions: Prisma.RoomTypeWhereInput = {};
    let hasRoomTypeCondition = false;

    if (slots.priceMin !== null || slots.priceMax !== null) {
      roomTypeConditions.basePrice = {
        gte: slots.priceMin !== null ? slots.priceMin : undefined,
        lte: slots.priceMax !== null ? slots.priceMax : undefined,
      };
      hasRoomTypeCondition = true;
    }

    // Tính tổng sức chứa tối thiểu dựa trên số lượng khách (adults + children)
    const requiredCapacity = slots.capacity || ((slots.adults || 0) + Math.ceil((slots.children || 0) / 2));
    if (requiredCapacity > 0) {
      roomTypeConditions.capacity = {
        gte: requiredCapacity,
      };
      hasRoomTypeCondition = true;
    }

    if (hasRoomTypeCondition) {
      where.roomTypes = {
        some: roomTypeConditions
      };
    }

    // D. Xếp hạng sao
    if (slots.starRating !== null) {
      where.starRating = {
        gte: slots.starRating,
      };
    }

    // E. Tiện ích
    if (slots.amenities && slots.amenities.length > 0) {
      where.AND = slots.amenities.map((name) => ({
        amenities: {
          some: {
            amenity: {
              name: { contains: name, mode: 'insensitive' },
            },
          },
        },
      }));
    }

    // F. Địa danh nổi tiếng
    if (slots.landmark) {
      const landmarkConditions: Prisma.HotelWhereInput[] = [
        { name: { contains: slots.landmark, mode: 'insensitive' } },
        { description: { contains: slots.landmark, mode: 'insensitive' } },
        { address: { contains: slots.landmark, mode: 'insensitive' } },
      ];

      if (where.OR) {
        where.AND = [
          { OR: where.OR },
          { OR: landmarkConditions }
        ];
        delete where.OR;
      } else {
        where.OR = landmarkConditions;
      }
    }

    return where;
  }

  public buildOrderByClause(sortBy: BookingSlots['sortBy']): Prisma.HotelOrderByWithRelationInput[] {
    switch (sortBy) {
      case 'PRICE_ASC':
        return [{ roomTypes: { _count: 'desc' } }];
      case 'RATING_DESC':
        return [{ starRating: 'desc' }];
      case 'NEWEST_DESC':
        return [{ createdAt: 'desc' }];
      case 'POPULAR_DESC':
      default:
        return [{ starRating: 'desc' }, { createdAt: 'desc' }];
    }
  }
}

export default new QueryBuilderService();
