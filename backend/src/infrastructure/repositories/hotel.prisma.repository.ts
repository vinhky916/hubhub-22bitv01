// Infrastructure: HotelPrismaRepository
// Implements IHotelRepository

import prisma from '../../config/database';
import { IHotelRepository } from '../../domain/repositories/hotel.repository';

export class HotelPrismaRepository implements IHotelRepository {
  // --- Hotel ---
  async findById(id: string) {
    return prisma.hotel.findUnique({ where: { id } }) as any;
  }

  async findByIdWithDetails(id: string) {
    return prisma.hotel.findUnique({
      where: { id },
      include: {
        owner: { select: { id: true, fullName: true, email: true } },
        category: true,
        province: true,
        district: true,
        ward: true,
        images: true,
        amenities: { include: { amenity: true } },
        roomTypes: { include: { images: true, rooms: true, ratePlans: true } },
        reviews: {
          include: { user: { select: { fullName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        nearbyLocations: true,
      },
    }) as any;
  }

  async create(data: any) {
    return prisma.hotel.create({ data, include: { images: true, amenities: { include: { amenity: true } } } }) as any;
  }

  async update(id: string, data: any) {
    return prisma.hotel.update({
      where: { id },
      data,
      include: { images: true, amenities: { include: { amenity: true } } },
    }) as any;
  }

  async search(filters: any, userId?: string) {
    const {
      provinceId, districtId, wardId, categoryId, propertyType, starRating,
      priceMin, priceMax, amenityIds, searchQuery, status, ownerId,
      limit = 10, page = 1, checkIn, checkOut,
    } = filters;

    const parsedLimit = isNaN(parseInt(limit)) ? 10 : parseInt(limit);
    const parsedPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;

    const where: any = {};
    if (ownerId) where.ownerId = ownerId;
    if (status) { if (status !== 'ALL') where.status = status; } else if (!ownerId) where.status = 'APPROVED';
    if (provinceId) where.provinceId = provinceId;
    if (districtId) where.districtId = districtId;
    if (wardId) where.wardId = wardId;
    if (categoryId) where.categoryId = categoryId;
    if (propertyType && propertyType !== 'ALL') where.propertyType = propertyType;
    if (starRating && !isNaN(parseInt(starRating))) where.starRating = parseInt(starRating);

    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim() !== '') {
      const q = searchQuery.trim();
      const allProvinces = await prisma.province.findMany({ select: { id: true, name: true } });
      const matchedProvinceIds = allProvinces
        .filter(p => this._normalize(p.name).includes(this._normalize(q)) || this._normalize(q).includes(this._normalize(p.name)))
        .map(p => p.id);

      const ORConditions: any[] = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { address: { contains: q, mode: 'insensitive' } },
      ];
      if (matchedProvinceIds.length > 0) {
        ORConditions.push({ provinceId: { in: matchedProvinceIds } });
      } else {
        ORConditions.push(
          { province: { name: { contains: q, mode: 'insensitive' } } },
          { district: { name: { contains: q, mode: 'insensitive' } } },
          { ward: { name: { contains: q, mode: 'insensitive' } } }
        );
      }
      where.OR = ORConditions;
    }

    let parsedAmenityIds: string[] = [];
    if (amenityIds) {
      parsedAmenityIds = Array.isArray(amenityIds) ? amenityIds : [amenityIds];
    }
    if (parsedAmenityIds.length > 0) {
      where.amenities = {
        some: { amenity: { OR: parsedAmenityIds.map(n => ({ OR: [{ id: n }, { name: { contains: n, mode: 'insensitive' } }] })) } },
      };
    }

    if (priceMin || priceMax) {
      const gteVal = priceMin && !isNaN(parseFloat(priceMin)) ? parseFloat(priceMin) : undefined;
      const lteVal = priceMax && !isNaN(parseFloat(priceMax)) ? parseFloat(priceMax) : undefined;
      if (gteVal !== undefined || lteVal !== undefined) {
        where.roomTypes = { some: { basePrice: { gte: gteVal, lte: lteVal } } };
      }
    }

    const [total, hotels, userFavorites] = await Promise.all([
      prisma.hotel.count({ where }),
      prisma.hotel.findMany({
        relationLoadStrategy: 'join',
        where,
        include: {
          images: true, category: true, province: true, district: true, ward: true,
          owner: { select: { fullName: true, email: true } },
          roomTypes: { select: { id: true, basePrice: true } },
          reviews: { select: { ratingOverall: true } },
          amenities: { include: { amenity: true } },
        },
        skip,
        take: parsedLimit,
        orderBy: { createdAt: 'desc' },
      }),
      userId ? prisma.favorite.findMany({ where: { userId }, select: { hotelId: true } }) : Promise.resolve([]),
    ]);

    return { hotels: hotels as any[], total, userFavorites: userFavorites as any[] };
  }

  async approve(id: string, status: string, rejectReason?: string) {
    return prisma.hotel.update({
      where: { id },
      data: { status: status as any, rejectReason: status === 'REJECTED' ? rejectReason : null },
    }) as any;
  }

  async findFirstByOwner(ownerId: string) {
    return prisma.hotel.findFirst({ where: { ownerId } }) as any;
  }

  async findAllByOwner(ownerId: string) {
    return prisma.hotel.findMany({ where: { ownerId }, select: { id: true } as any }) as any;
  }

  async findAll(select?: any) {
    return prisma.hotel.findMany({ select }) as any;
  }

  // --- Amenity / Category / Province ---
  async findCategoryById(id: string) { return prisma.category.findUnique({ where: { id } }); }
  async findProvinceById(id: string) { return prisma.province.findUnique({ where: { id } }); }
  async findDistrictById(id: string) { return prisma.district.findUnique({ where: { id } }); }
  async findWardById(id: string) { return prisma.ward.findUnique({ where: { id } }); }
  async deleteHotelAmenities(hotelId: string) { await prisma.hotelAmenity.deleteMany({ where: { hotelId } }); }
  async createHotelAmenities(data: any[]) { await prisma.hotelAmenity.createMany({ data }); }
  async deleteHotelImages(hotelId: string) { await prisma.hotelImage.deleteMany({ where: { hotelId } }); }
  async createHotelImages(data: any[]) { await prisma.hotelImage.createMany({ data }); }

  // --- Review ---
  async createReview(data: any) { return prisma.review.create({ data, include: { user: { select: { fullName: true, avatarUrl: true } } } }) as any; }
  async findReviewById(id: string) { return prisma.review.findUnique({ where: { id }, include: { hotel: true } }) as any; }
  async updateReview(id: string, data: any) {
    return prisma.review.update({ where: { id }, data, include: { user: { select: { fullName: true, avatarUrl: true, email: true } } } }) as any;
  }
  async incrementReviewLikes(id: string) { return prisma.review.update({ where: { id }, data: { likesCount: { increment: 1 } } }) as any; }

  // --- Favorite ---
  async findFavorite(userId: string, hotelId: string) {
    return prisma.favorite.findUnique({ where: { userId_hotelId: { userId, hotelId } } }) as any;
  }
  async createFavorite(userId: string, hotelId: string) {
    return prisma.favorite.create({ data: { userId, hotelId } }) as any;
  }
  async deleteFavorite(userId: string, hotelId: string) {
    await prisma.favorite.delete({ where: { userId_hotelId: { userId, hotelId } } });
  }
  async findFavoritesByUser(userId: string) {
    return prisma.favorite.findMany({
      where: { userId },
      include: {
        hotel: {
          include: {
            images: true, category: true, province: true, district: true, ward: true,
            roomTypes: { select: { id: true, basePrice: true } },
            reviews: { select: { ratingOverall: true } },
          },
        },
      },
    }) as any;
  }

  // --- RoomType ---
  async findRoomTypeById(id: string) { return (prisma.roomType as any).findUnique({ where: { id } }); }
  async findRoomTypeWithHotel(id: string) { return (prisma.roomType as any).findUnique({ where: { id }, include: { hotel: true } }); }
  async createRoomType(data: any) { return (prisma.roomType as any).create({ data, include: { images: true, rooms: true } }); }
  async updateRoomType(id: string, data: any) { return (prisma.roomType as any).update({ where: { id }, data, include: { images: true, rooms: true } }); }
  async deleteRoomType(id: string) { await prisma.roomType.delete({ where: { id } }); }
  async findRoomTypesByHotel(hotelId: string) { return (prisma.roomType as any).findMany({ where: { hotelId } }); }

  // --- Room ---
  async findRoomById(id: string) { return prisma.room.findUnique({ where: { id }, include: { roomType: { include: { hotel: true } } } }) as any; }
  async createRoom(data: any) { return prisma.room.create({ data }) as any; }
  async createManyRooms(data: any[]) { await prisma.room.createMany({ data }); }
  async deleteRoom(id: string) { await prisma.room.delete({ where: { id } }); }
  async deleteManyRooms(ids: string[]) { await prisma.room.deleteMany({ where: { id: { in: ids } } }); }
  async findRoomsByType(roomTypeId: string) { return prisma.room.findMany({ where: { roomTypeId } }) as any; }
  async updateRoom(id: string, data: any) { return prisma.room.update({ where: { id }, data }) as any; }
  async updateManyRooms(ids: string[], data: any) { await prisma.room.updateMany({ where: { id: { in: ids } }, data }); }
  async findRoomsByNumbers(roomTypeId: string, numbers: string[]) {
    return prisma.room.findMany({ where: { roomTypeId, roomNumber: { in: numbers } } }) as any;
  }
  async deleteRoomsByIds(ids: string[]) { await prisma.room.deleteMany({ where: { id: { in: ids } } }); }
  async findRoomFirst(roomTypeId: string, roomNumber: string) {
    return prisma.room.findFirst({ where: { roomTypeId, roomNumber } }) as any;
  }

  // --- PriceCalendar ---
  async findPriceCalendar(roomTypeId: string, from: Date, to: Date) {
    return prisma.roomPriceCalendar.findMany({ where: { roomTypeId, date: { gte: from, lte: to } }, orderBy: { date: 'asc' } }) as any;
  }
  async upsertPriceCalendar(data: any) {
    await prisma.roomPriceCalendar.upsert({
      where: { roomTypeId_date: { roomTypeId: data.roomTypeId, date: data.date } },
      update: { price: data.price, isBlocked: data.isBlocked },
      create: data,
    });
  }
  async deletePriceCalendar(roomTypeId: string, date: Date) {
    await prisma.roomPriceCalendar.deleteMany({ where: { roomTypeId, date } });
  }
  async runPriceCalendarTransaction(operations: Promise<any>[]) {
    await prisma.$transaction(operations as any);
  }

  // --- RatePlan ---
  async findRatePlansByRoomType(roomTypeId: string) { return (prisma.ratePlan as any).findMany({ where: { roomTypeId, isActive: true }, orderBy: { createdAt: 'asc' } }); }
  async findRatePlanById(id: string) { return (prisma.ratePlan as any).findUnique({ where: { id }, include: { roomType: { include: { hotel: true } } } }); }
  async createRatePlan(data: any) { return (prisma.ratePlan as any).create({ data }); }
  async updateRatePlan(id: string, data: any) { return (prisma.ratePlan as any).update({ where: { id }, data }); }
  async deleteRatePlan(id: string) { await (prisma.ratePlan as any).delete({ where: { id } }); }

  // --- NearbyLocation ---
  async createManyNearbyLocations(data: any[]) { await (prisma.nearbyLocation as any).createMany({ data }); }

  // --- Misc ---
  async findAmenities(orderBy?: any) { return prisma.amenity.findMany({ orderBy: orderBy || { name: 'asc' } }); }
  async findAmenityByName(name: string) { return prisma.amenity.findFirst({ where: { name: { equals: name, mode: 'insensitive' } } }); }
  async createAmenity(data: any) { return prisma.amenity.create({ data }); }
  async findCategories(orderBy?: any) { return prisma.category.findMany({ orderBy: orderBy || { name: 'asc' } }); }
  async findProvinces(orderBy?: any) { return prisma.province.findMany({ orderBy: orderBy || { name: 'asc' } }); }
  async findDistricts(provinceId: string, orderBy?: any) { return prisma.district.findMany({ where: { provinceId }, orderBy: orderBy || { name: 'asc' } }); }
  async findWards(districtId: string, orderBy?: any) { return prisma.ward.findMany({ where: { districtId }, orderBy: orderBy || { name: 'asc' } }); }
  async findAllProvinces() { return prisma.province.findMany({ select: { id: true, name: true } }); }

  private _normalize(str: string): string {
    if (!str) return '';
    return str.toLowerCase()
      .replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a')
      .replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e')
      .replace(/ì|í|ị|ỉ|ĩ/g, 'i')
      .replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o')
      .replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u')
      .replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y')
      .replace(/đ/g, 'd');
  }
}
