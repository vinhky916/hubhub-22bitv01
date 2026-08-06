import prisma from '../../config/database';
import { AppError } from '../../infrastructure/middlewares/error.middleware';
import { HotelStatus, Role } from '@prisma/client';
import axios from 'axios';
import socketService from '../../infrastructure/services/socket.service';

function removeVietnameseTones(str: string): string {
  if (!str) return '';
  let result = str;
  result = result.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  result = result.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  result = result.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  result = result.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  result = result.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  result = result.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  result = result.replace(/đ/g, 'd');
  result = result.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, 'A');
  result = result.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, 'E');
  result = result.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, 'I');
  result = result.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, 'O');
  result = result.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, 'U');
  result = result.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, 'Y');
  result = result.replace(/Đ/g, 'D');
  return result;
}

export class HotelUseCase {
  public async createHotel(ownerId: string, data: any) {
    const {
      name,
      description,
      address,
      categoryId,
      propertyType,
      provinceId,
      districtId,
      wardId,
      latitude,
      longitude,
      starRating,
      amenityIds,
      images,
      checkInTime,
      checkOutTime,
    } = data;

    // Kiểm tra Category, Province, District, Ward có tồn tại không
    const categoryExists = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!categoryExists) throw new AppError('Danh mục khách sạn không tồn tại', 400);

    const provinceExists = await prisma.province.findUnique({ where: { id: provinceId } });
    if (!provinceExists) throw new AppError('Tỉnh/Thành phố không hợp lệ', 400);

    const districtExists = await prisma.district.findUnique({ where: { id: districtId } });
    if (!districtExists) throw new AppError('Quận/Huyện không hợp lệ', 400);

    const wardExists = await prisma.ward.findUnique({ where: { id: wardId } });
    if (!wardExists) throw new AppError('Phường/Xã không hợp lệ', 400);

    // Tạo khách sạn mới ở trạng thái PENDING
    const hotel = await prisma.hotel.create({
      data: {
        ownerId,
        categoryId,
        propertyType: propertyType || 'HOTEL',
        name,
        description,
        address,
        provinceId,
        districtId,
        wardId,
        latitude,
        longitude,
        starRating,
        checkInTime,
        checkOutTime,
        status: HotelStatus.PENDING,
        images: {
          create: images.map((img: any) => ({
            url: img.url,
            isPrimary: img.isPrimary,
          })),
        },
        amenities: {
          create: amenityIds.map((id: string) => ({
            amenityId: id,
          })),
        },
      },
      include: {
        images: true,
        amenities: {
          include: { amenity: true },
        },
      },
    });

    return hotel;
  }

  public async updateHotel(hotelId: string, userId: string, userRole: Role, data: any) {
    const {
      name,
      description,
      address,
      categoryId,
      propertyType,
      provinceId,
      districtId,
      wardId,
      latitude,
      longitude,
      starRating,
      amenityIds,
      checkInTime,
      checkOutTime,
    } = data;

    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new AppError('Không tìm thấy khách sạn', 404);

    // Kiểm tra quyền sở hữu (chỉ Owner của khách sạn hoặc Admin mới được sửa)
    if (userRole !== Role.ADMIN && hotel.ownerId !== userId) {
      throw new AppError('Bạn không có quyền sửa khách sạn này', 403);
    }

    // Cập nhật quan hệ tiện ích nếu được truyền lên
    if (amenityIds) {
      // Xóa các tiện ích cũ
      await prisma.hotelAmenity.deleteMany({ where: { hotelId } });
      // Thêm tiện ích mới
      await prisma.hotelAmenity.createMany({
        data: amenityIds.map((id: string) => ({
          hotelId,
          amenityId: id,
        })),
      });
    }

    // Cập nhật danh sách hình ảnh nếu được truyền lên
    if (data.images) {
      await prisma.hotelImage.deleteMany({ where: { hotelId } });
      await prisma.hotelImage.createMany({
        data: data.images.map((img: any) => ({
          hotelId,
          url: img.url,
          isPrimary: img.isPrimary || false,
        })),
      });
    }

    // Cập nhật thông tin khách sạn
    const updatedHotel = await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        name,
        description,
        address,
        categoryId,
        propertyType: propertyType || undefined,
        provinceId,
        districtId,
        wardId,
        latitude,
        longitude,
        starRating,
        checkInTime,
        checkOutTime,
        status: userRole === Role.ADMIN && data.status ? data.status : undefined, // Giữ nguyên trạng thái hiện tại (không cần duyệt lại khi owner sửa)
      },
      include: {
        images: true,
        amenities: {
          include: { amenity: true },
        },
      },
    });

    return updatedHotel;
  }

  public async getHotelDetail(id: string, checkIn?: string, checkOut?: string) {
    const hotel = await prisma.hotel.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, fullName: true, email: true },
        },
        category: true,
        province: true,
        district: true,
        ward: true,
        images: true,
        amenities: {
          include: { amenity: true },
        },
        roomTypes: {
          include: {
            images: true,
            rooms: true,
            ratePlans: true,
          },
        },
        reviews: {
          include: {
            user: { select: { fullName: true, avatarUrl: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        nearbyLocations: true,
      },
    });

    if (!hotel) throw new AppError('Không tìm thấy khách sạn', 404);

    // Tính toán điểm đánh giá trung bình
    let averageRating = 0;
    if (hotel.reviews.length > 0) {
      const sum = hotel.reviews.reduce((acc, rev) => acc + rev.ratingOverall, 0);
      averageRating = parseFloat((sum / hotel.reviews.length).toFixed(1));
    }

    // Nếu người dùng có chọn ngày, ta tính toán giá động và số phòng trống của từng loại phòng
    const roomTypesWithAvailability = await Promise.all(
      hotel.roomTypes.map(async (rt) => {
        let price = parseFloat(rt.basePrice.toString());
        let availableCount = rt.rooms.length;
        let bookedQuantity = 0;
        let isBlocked = false;

        const start = checkIn ? new Date(checkIn) : new Date();
        start.setHours(0, 0, 0, 0);
        const end = checkOut ? new Date(checkOut) : new Date(start.getTime() + 24 * 60 * 60 * 1000);

        // 1. Kiểm tra chặn phòng và giá động trong khoảng thời gian lưu trú
        const calendarOverrides = await prisma.roomPriceCalendar.findMany({
          where: {
            roomTypeId: rt.id,
            date: {
              gte: start,
              lt: end,
            },
          },
        });

        // Nếu có bất cứ ngày nào bị chặn, xem như phòng không khả dụng
        if (calendarOverrides.some((c) => c.isBlocked)) {
          isBlocked = true;
          availableCount = 0;
        }

        // Tính tổng giá các ngày
        let totalPrice = 0;
        let days = 0;
        for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          const override = calendarOverrides.find(
            (c) => c.date.toISOString().split('T')[0] === dateStr
          );
          
          totalPrice += override ? parseFloat(override.price.toString()) : parseFloat(rt.basePrice.toString());
          days++;
        }
        price = days > 0 ? totalPrice / days : price; // Giá trung bình mỗi đêm

        // 2. Tính số lượng phòng đã bị đặt trong khoảng thời gian này
        const overlappingBookings = await prisma.booking.findMany({
          where: {
            status: {
              in: ['PENDING', 'PAYMENT_PROCESSING', 'CONFIRMED', 'CHECKED_IN'],
            },
            checkInDate: { lt: end },
            checkOutDate: { gt: start },
            bookingItems: {
              some: { roomTypeId: rt.id },
            },
          },
          include: {
            bookingItems: true,
          },
        });

        bookedQuantity = overlappingBookings.reduce((sum, b) => {
          const item = b.bookingItems.find((i) => i.roomTypeId === rt.id);
          return sum + (item ? item.quantity : 0);
        }, 0);

        if (!isBlocked) {
          availableCount = Math.max(0, rt.rooms.length - bookedQuantity);
        }

        return {
          id: rt.id,
          name: rt.name,
          description: rt.description,
          basePrice: parseFloat(rt.basePrice.toString()),
          calculatedPrice: isBlocked ? 0 : price,
          capacity: rt.capacity,
          bedCount: rt.bedCount,
          size: rt.size,
          amenities: rt.amenities,
          images: rt.images,
          availableRooms: availableCount,
          bookedRooms: bookedQuantity,
          totalRooms: rt.rooms.length,
          isBlocked,
          rooms: rt.rooms,
          includeBreakfast: rt.includeBreakfast,
          childSurcharge: rt.childSurcharge,
          cancellationPolicy: rt.cancellationPolicy,
          paymentPolicy: rt.paymentPolicy,
          ratePlans: (rt as any).ratePlans || [],
        };
      })
    );

    let nearbyLocations = hotel.nearbyLocations;
    if (!nearbyLocations || nearbyLocations.length === 0) {
      try {
        const fullAddress = `${hotel.address}, ${hotel.ward.name}, ${hotel.district.name}, ${hotel.province.name}`;
        nearbyLocations = await this.generateNearbyLocations(hotel.id, hotel.name, fullAddress, hotel.latitude, hotel.longitude);
      } catch (err) {
        console.error('[Nearby Locations Generate Error]:', err);
        nearbyLocations = [];
      }
    }

    return {
      ...hotel,
      averageRating,
      roomTypes: roomTypesWithAvailability,
      nearbyLocations,
    };
  }

  public async searchHotels(filters: any, userId?: string) {
    const {
      provinceId,
      districtId,
      wardId,
      categoryId,
      propertyType,
      starRating,
      priceMin,
      priceMax,
      amenityIds,
      searchQuery,
      status,
      ownerId,
      limit = 10,
      page = 1,
      checkIn,
      checkOut,
    } = filters;

    // Phân trang an toàn
    const parsedLimit = isNaN(parseInt(limit)) ? 10 : parseInt(limit);
    const parsedPage = isNaN(parseInt(page)) ? 1 : parseInt(page);
    const skip = (parsedPage - 1) * parsedLimit;

    // Xây dựng các điều kiện WHERE cho Prisma
    const where: any = {};

    if (ownerId) {
      where.ownerId = ownerId;
    }

    if (status) {
      if (status !== 'ALL') {
        where.status = status;
      }
    } else if (!ownerId) {
      where.status = HotelStatus.APPROVED;
    }

    if (provinceId) where.provinceId = provinceId;
    if (districtId) where.districtId = districtId;
    if (wardId) where.wardId = wardId;
    if (categoryId) where.categoryId = categoryId;
    if (propertyType && propertyType !== 'ALL') where.propertyType = propertyType;
    
    if (starRating && !isNaN(parseInt(starRating))) {
      where.starRating = parseInt(starRating);
    }

    // Tìm kiếm theo từ khóa tên, mô tả, địa chỉ, tỉnh/thành, quận/huyện, phường/xã
    if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim() !== '') {
      const q = searchQuery.trim();
      const normQ = removeVietnameseTones(q.toLowerCase());

      const allProvinces = await prisma.province.findMany({ select: { id: true, name: true } });
      const matchedProvinceIds = allProvinces
        .filter(p => {
          const pNorm = removeVietnameseTones(p.name.toLowerCase());
          return pNorm.includes(normQ) || normQ.includes(pNorm);
        })
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

    // Hỗ trợ amenityIds gửi lên dạng string đơn lẻ hoặc array
    let parsedAmenityIds: string[] = [];
    if (amenityIds) {
      if (Array.isArray(amenityIds)) {
        parsedAmenityIds = amenityIds;
      } else if (typeof amenityIds === 'string') {
        parsedAmenityIds = [amenityIds];
      }
    }

    // Lọc theo tên/id tiện ích linh hoạt (hỗ trợ tìm cả tên tiếng Việt một phần)
    if (parsedAmenityIds.length > 0) {
      where.amenities = {
        some: {
          amenity: {
            OR: parsedAmenityIds.map(nameOrId => ({
              OR: [
                { id: nameOrId },
                { name: { contains: nameOrId, mode: 'insensitive' } }
              ]
            }))
          },
        },
      };
    }

    // Lọc theo khoảng giá an toàn
    if (priceMin || priceMax) {
      const gteVal = priceMin && !isNaN(parseFloat(priceMin)) ? parseFloat(priceMin) : undefined;
      const lteVal = priceMax && !isNaN(parseFloat(priceMax)) ? parseFloat(priceMax) : undefined;
      if (gteVal !== undefined || lteVal !== undefined) {
        where.roomTypes = {
          some: {
            basePrice: {
              gte: gteVal,
              lte: lteVal,
            },
          },
        };
      }
    }

    // Tự động giải phóng các phòng từ những đơn hàng hết hạn thanh toán (chạy ngầm ở background, không block request đọc)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    prisma.booking.updateMany({
      where: {
        status: { in: ['PENDING', 'PAYMENT_PROCESSING'] },
        createdAt: { lt: tenMinutesAgo }
      },
      data: {
        status: 'CANCELLED'
      }
    }).catch(err => console.error('[Background Job] Failed to auto-cancel bookings:', err));

    // Chạy các truy vấn đọc song song để giảm thiểu Round-trip Database Latency sang Neon DB (US East)
    const [total, hotels, userFavorites] = await Promise.all([
      // 1. Đếm tổng số lượng phục vụ phân trang
      prisma.hotel.count({ where }),
      // 2. Lấy danh sách khách sạn trang hiện tại
      prisma.hotel.findMany({
        relationLoadStrategy: 'join',
        where,
        include: {
          images: true,
          category: true,
          province: true,
          district: true,
          ward: true,
          owner: {
            select: {
              fullName: true,
              email: true,
            },
          },
          roomTypes: {
            select: { id: true, basePrice: true },
          },
          reviews: {
            select: { ratingOverall: true },
          },
          amenities: {
            include: {
              amenity: true
            }
          }
        },
        skip,
        take: parsedLimit,
        orderBy: { createdAt: 'desc' },
      }),
      // 3. Lấy danh sách favorite của user nếu có
      userId ? prisma.favorite.findMany({
        where: { userId },
        select: { hotelId: true }
      }) : Promise.resolve([])
    ]);

    const favoriteSet = new Set(userFavorites.map(f => f.hotelId));

    // Format kết quả trả về
    const formattedHotels = await Promise.all(
      hotels.map(async (hotel) => {
        let averageRating = 0;
        if (hotel.reviews.length > 0) {
          const sum = hotel.reviews.reduce((acc, rev) => acc + rev.ratingOverall, 0);
          averageRating = parseFloat((sum / hotel.reviews.length).toFixed(1));
        }

        let priceFrom = 0;
        let originalPriceFrom = 0;

        if (hotel.roomTypes && hotel.roomTypes.length > 0) {
          const roomTypePrices = await Promise.all(
            hotel.roomTypes.map(async (rt) => {
              const basePrice = parseFloat(rt.basePrice.toString());
              let calculatedPrice = basePrice;

              if (checkIn && checkOut) {
                const start = new Date(checkIn);
                const end = new Date(checkOut);

                const overrides = await prisma.roomPriceCalendar.findMany({
                  where: {
                    roomTypeId: rt.id,
                    date: { gte: start, lt: end },
                  },
                });

                if (overrides.some((o) => o.isBlocked)) {
                  return { basePrice: Infinity, calculatedPrice: Infinity };
                }

                let total = 0;
                let days = 0;
                for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
                  const dateStr = d.toISOString().split('T')[0];
                  const override = overrides.find(
                    (o) => o.date.toISOString().split('T')[0] === dateStr
                  );
                  total += override ? parseFloat(override.price.toString()) : basePrice;
                  days++;
                }
                calculatedPrice = days > 0 ? total / days : basePrice;
              }

              return { basePrice, calculatedPrice };
            })
          );

          const validPrices = roomTypePrices.filter((p) => p.basePrice !== Infinity);
          if (validPrices.length > 0) {
            priceFrom = Math.min(...validPrices.map((p) => p.calculatedPrice));
            const cheapestRoom = validPrices.reduce((prev, curr) => 
              curr.calculatedPrice < prev.calculatedPrice ? curr : prev
            , validPrices[0]);
            originalPriceFrom = cheapestRoom.basePrice;
          } else {
            priceFrom = Math.min(...hotel.roomTypes.map((rt) => parseFloat(rt.basePrice.toString())));
            originalPriceFrom = priceFrom;
          }
        }

        return {
          id: hotel.id,
          name: hotel.name,
          description: hotel.description,
          address: hotel.address,
          province: hotel.province.name,
          provinceId: hotel.provinceId,
          district: hotel.district.name,
          districtId: hotel.districtId,
          ward: hotel.ward.name,
          wardId: hotel.wardId,
          starRating: hotel.starRating,
          propertyType: hotel.propertyType,
          status: hotel.status,
          rejectReason: hotel.rejectReason,
          owner: hotel.owner,
          images: hotel.images,
          category: hotel.category.name,
          categoryId: hotel.categoryId,
          priceFrom,
          originalPriceFrom,
          averageRating,
          reviewCount: hotel.reviews.length,
          isFavorite: favoriteSet.has(hotel.id),
          amenities: hotel.amenities.map(ha => ({
            id: ha.amenity.id,
            name: ha.amenity.name
          }))
        };
      })
    );

    return {
      hotels: formattedHotels,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Quản trị phê duyệt khách sạn (Admin)
  public async approveHotel(id: string, status: HotelStatus, rejectReason?: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id } });
    if (!hotel) throw new AppError('Không tìm thấy khách sạn', 404);

    const updatedHotel = await prisma.hotel.update({
      where: { id },
      data: {
        status,
        rejectReason: status === HotelStatus.REJECTED ? rejectReason : null,
      },
    });

    // Phát tín hiệu Socket.io thời gian thực
    socketService.emitHotelStatusUpdate(id, status, updatedHotel.ownerId);

    return updatedHotel;
  }

  // Quản lý Wishlist (Favorites) của khách hàng
  public async toggleFavorite(userId: string, hotelId: string) {
    const hotel = await prisma.hotel.findUnique({ where: { id: hotelId } });
    if (!hotel) throw new AppError('Không tìm thấy khách sạn', 404);

    const existing = await prisma.favorite.findUnique({
      where: {
        userId_hotelId: { userId, hotelId }
      }
    });

    if (existing) {
      await prisma.favorite.delete({
        where: {
          userId_hotelId: { userId, hotelId }
        }
      });
      return { isFavorite: false };
    } else {
      await prisma.favorite.create({
        data: { userId, hotelId }
      });
      return { isFavorite: true };
    }
  }

  public async getMyFavorites(userId: string) {
    const favorites = await prisma.favorite.findMany({
      where: { userId },
      include: {
        hotel: {
          include: {
            images: true,
            category: true,
            province: true,
            district: true,
            ward: true,
            roomTypes: {
              select: { id: true, basePrice: true }
            },
            reviews: {
              select: { ratingOverall: true }
            }
          }
        }
      }
    });

    return favorites.map((f) => {
      const hotel = f.hotel;
      let averageRating = 0;
      if (hotel.reviews.length > 0) {
        const sum = hotel.reviews.reduce((acc, rev) => acc + rev.ratingOverall, 0);
        averageRating = parseFloat((sum / hotel.reviews.length).toFixed(1));
      }

      return {
        id: hotel.id,
        name: hotel.name,
        description: hotel.description,
        address: hotel.address,
        province: hotel.province.name,
        district: hotel.district.name,
        ward: hotel.ward.name,
        starRating: hotel.starRating,
        images: hotel.images,
        category: hotel.category.name,
        priceFrom: hotel.roomTypes && hotel.roomTypes.length > 0
          ? Math.min(...hotel.roomTypes.map(rt => parseFloat(rt.basePrice.toString())))
          : 0,
        originalPriceFrom: hotel.roomTypes && hotel.roomTypes.length > 0
          ? Math.min(...hotel.roomTypes.map(rt => parseFloat(rt.basePrice.toString())))
          : 0,
        averageRating,
        reviewCount: hotel.reviews.length,
        isFavorite: true
      };
    });
  }

  private calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
    const R = 6371; // Bán kính Trái Đất (km)
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const d = R * c; // Khoảng cách (km)
    
    if (d < 1) {
      return `${Math.round(d * 1000)} m`;
    }
    return `${d.toFixed(2)} km`;
  }

  private async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: {
          q: address,
          format: 'json',
          limit: 1
        },
        headers: {
          'User-Agent': 'CloudBookingApplication/1.0 (contact@cloudbooking.com)'
        }
      });
      if (response.data && response.data.length > 0) {
        return {
          lat: parseFloat(response.data[0].lat),
          lng: parseFloat(response.data[0].lon)
        };
      }
    } catch (err) {
      console.error('[Geocoding Error] Failed to geocode address via Nominatim:', err);
    }
    return null;
  }

  private async fetchOverpassNearby(lat: number, lng: number): Promise<{ name: string; distance: string; type: string }[]> {
    const url = 'https://overpass-api.de/api/interpreter';
    // Quét bán kính 2km (2000m) xung quanh tọa độ
    const query = `
      [out:json][timeout:25];
      (
        node["tourism"](around:2000, ${lat}, ${lng});
        node["highway"="bus_stop"](around:2000, ${lat}, ${lng});
        node["railway"="station"](around:2000, ${lat}, ${lng});
        node["amenity"="bus_station"](around:2000, ${lat}, ${lng});
        node["amenity"="cafe"](around:2000, ${lat}, ${lng});
        node["amenity"="restaurant"](around:2000, ${lat}, ${lng});
        node["leisure"](around:2000, ${lat}, ${lng});
        node["amenity"="hospital"](around:2000, ${lat}, ${lng});
        node["amenity"="school"](around:2000, ${lat}, ${lng});
        node["shop"](around:2000, ${lat}, ${lng});
      );
      out body 20;
    `;

    try {
      const response = await axios.post(url, query, {
        headers: {
          'Content-Type': 'text/plain',
          'User-Agent': 'CloudBookingApplication/1.0 (contact@cloudbooking.com)'
        }
      });

      if (response.data && response.data.elements) {
        const elements = response.data.elements;
        const results = elements
          .filter((el: any) => el.tags && el.tags.name)
          .map((el: any) => {
            const name = el.tags.name;
            const distanceStr = this.calculateHaversineDistance(lat, lng, el.lat, el.lon);
            let type = 'OTHER';

            if (el.tags.tourism) {
              type = 'NEARBY';
            } else if (el.tags.highway === 'bus_stop' || el.tags.railway === 'station' || el.tags.amenity === 'bus_station') {
              type = 'TRANSPORT';
            } else if (el.tags.amenity === 'cafe' || el.tags.amenity === 'restaurant' || el.tags.leisure) {
              type = 'ENTERTAINMENT';
            } else if (el.tags.amenity === 'hospital' || el.tags.amenity === 'school' || el.tags.shop) {
              type = 'OTHER';
            }

            return { name, distance: distanceStr, type };
          });

        const uniqueMap = new Map<string, any>();
        results.forEach((r: any) => {
          if (!uniqueMap.has(r.name)) {
            uniqueMap.set(r.name, r);
          }
        });
        
        return Array.from(uniqueMap.values());
      }
    } catch (err) {
      console.error('[Overpass API Error] Failed to fetch POIs from Overpass:', err);
    }
    return [];
  }

  private generateMockNearbyLocations(hotelName: string, address: string): { name: string; distance: string; type: string }[] {
    const text = (address + ' ' + hotelName).toLowerCase();
    
    if (text.includes('đà lạt') || text.includes('da lat') || text.includes('lâm đồng')) {
      return [
        { name: 'Chợ Đà Lạt / Chợ Đêm Đà Lạt', distance: '168 m', type: 'NEARBY' },
        { name: 'Chợ đà lạt', distance: '231 m', type: 'NEARBY' },
        { name: '3D World Da Lat', distance: '293 m', type: 'NEARBY' },
        { name: 'Đường Nam Kỳ Khởi Nghĩa Đà Lạt', distance: '380 m', type: 'NEARBY' },
        { name: 'Hồ Xuân Hương', distance: '573 m', type: 'NEARBY' },
        { name: 'Chùa Linh Sơn', distance: '642 m', type: 'NEARBY' },
        { name: 'Bệnh Viện Đa Khoa Lâm Đồng', distance: '823 m', type: 'NEARBY' },
        { name: 'Nhà Thờ Chính Tòa Giáo Phận Đà Lạt', distance: '920 m', type: 'NEARBY' },
        { name: 'Quảng trường Lâm Viên', distance: '997 m', type: 'NEARBY' },
        { name: 'Nhà thờ Domaine de Marie', distance: '997 m', type: 'NEARBY' },
        { name: 'Biệt thự Hằng Nga', distance: '1.35 km', type: 'NEARBY' },
        { name: 'Ga Đà Lạt', distance: '1.79 km', type: 'TRANSPORT' },
        { name: 'Nhà Ga Cáp Treo Đà Lạt', distance: '2.48 km', type: 'TRANSPORT' },
        { name: 'Chợ Đêm Đà Lạt', distance: '168 m', type: 'ENTERTAINMENT' },
        { name: 'Đường Nam Kỳ Khởi Nghĩa Đà Lạt', distance: '380 m', type: 'ENTERTAINMENT' },
        { name: 'Hồ Xuân Hương', distance: '573 m', type: 'ENTERTAINMENT' },
        { name: 'Vườn hoa thành phố Đà Lạt', distance: '1.42 km', type: 'ENTERTAINMENT' },
        { name: 'Quảng trường Lâm Viên', distance: '997 m', type: 'ENTERTAINMENT' },
        { name: 'Trường Đại Học Đà Lạt', distance: '1.29 km', type: 'OTHER' },
        { name: 'Nhà thờ Domaine de Marie', distance: '997 m', type: 'OTHER' },
        { name: 'Nhà Thờ Chính Tòa Giáo Phận Đà Lạt', distance: '920 m', type: 'OTHER' },
        { name: 'Bệnh Viện Đa Khoa Lâm Đồng', distance: '823 m', type: 'OTHER' },
        { name: 'Biệt thự Hằng Nga', distance: '1.35 km', type: 'OTHER' }
      ];
    }

    if (text.includes('đà nẵng') || text.includes('da nang')) {
      return [
        { name: 'Bãi biển Mỹ Khê', distance: '450 m', type: 'NEARBY' },
        { name: 'Công viên Biển Đông', distance: '800 m', type: 'NEARBY' },
        { name: 'Cầu Rồng', distance: '1.52 km', type: 'NEARBY' },
        { name: 'Cầu Sông Hàn', distance: '1.80 km', type: 'NEARBY' },
        { name: 'Chợ Hàn Đà Nẵng', distance: '2.10 km', type: 'NEARBY' },
        { name: 'Nhà Thờ Con Gà Đà Nẵng', distance: '2.30 km', type: 'NEARBY' },
        { name: 'Bán đảo Sơn Trà', distance: '8.00 km', type: 'NEARBY' },
        { name: 'Ngũ Hành Sơn', distance: '7.50 km', type: 'NEARBY' },
        { name: 'Ga Đà Nẵng', distance: '3.20 km', type: 'TRANSPORT' },
        { name: 'Sân bay Quốc tế Đà Nẵng', distance: '4.50 km', type: 'TRANSPORT' },
        { name: 'Bến xe Trung tâm Đà Nẵng', distance: '6.00 km', type: 'TRANSPORT' },
        { name: 'Chợ Đêm Sơn Trà', distance: '1.60 km', type: 'ENTERTAINMENT' },
        { name: 'Công viên Châu Á Asia Park', distance: '3.50 km', type: 'ENTERTAINMENT' },
        { name: 'Rạp phim CGV Vincom Đà Nẵng', distance: '1.95 km', type: 'ENTERTAINMENT' },
        { name: 'Phố ẩm thực Huỳnh Thúc Kháng', distance: '2.50 km', type: 'ENTERTAINMENT' },
        { name: 'Bệnh viện Đa khoa Đà Nẵng', distance: '2.80 km', type: 'OTHER' },
        { name: 'Vincom Plaza Đà Nẵng', distance: '1.90 km', type: 'OTHER' },
        { name: 'Trường Đại học Bách Khoa Đà Nẵng', distance: '5.00 km', type: 'OTHER' },
        { name: 'Siêu thị Lotte Mart Đà Nẵng', distance: '4.20 km', type: 'OTHER' }
      ];
    }

    return [
      { name: 'Chợ truyền thống địa phương', distance: '350 m', type: 'NEARBY' },
      { name: 'Công viên văn hóa trung tâm', distance: '750 m', type: 'NEARBY' },
      { name: 'Hồ nước điều hòa thành phố', distance: '1.20 km', type: 'NEARBY' },
      { name: 'Nhà hát lớn thành phố', distance: '1.80 km', type: 'NEARBY' },
      { name: 'Trung tâm mua sắm sầm uất', distance: '900 m', type: 'NEARBY' },
      { name: 'Trạm xe buýt gần nhất', distance: '150 m', type: 'TRANSPORT' },
      { name: 'Ga tàu hoả trung tâm', distance: '2.80 km', type: 'TRANSPORT' },
      { name: 'Sân bay thành phố', distance: '9.50 km', type: 'TRANSPORT' },
      { name: 'Phố ẩm thực đi bộ đêm', distance: '650 m', type: 'ENTERTAINMENT' },
      { name: 'Rạp chiếu phim hiện đại', distance: '850 m', type: 'ENTERTAINMENT' },
      { name: 'Khu vui chơi giải trí trẻ em', distance: '1.10 km', type: 'ENTERTAINMENT' },
      { name: 'Bệnh viện đa khoa quốc tế', distance: '1.50 km', type: 'OTHER' },
      { name: 'Trường Đại học Quốc gia', distance: '2.10 km', type: 'OTHER' },
      { name: 'Siêu thị đại siêu thị', distance: '800 m', type: 'OTHER' }
    ];
  }

  public async generateNearbyLocations(hotelId: string, hotelName: string, address: string, latOverride?: number | null, lngOverride?: number | null) {
    let locations: { name: string; distance: string; type: string }[] = [];

    let lat = latOverride;
    let lng = lngOverride;

    if (!lat || !lng) {
      const coords = await this.geocodeAddress(address);
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        try {
          await prisma.hotel.update({
            where: { id: hotelId },
            data: { latitude: lat, longitude: lng }
          });
        } catch (e) {
          console.error('[Nearby] Failed to update hotel lat/lng coordinates:', e);
        }
      }
    }

    if (lat && lng) {
      locations = await this.fetchOverpassNearby(lat, lng);
    }

    if (!locations || locations.length === 0) {
      locations = this.generateMockNearbyLocations(hotelName, address);
    }

    if (locations && locations.length > 0) {
      try {
        await prisma.nearbyLocation.createMany({
          data: locations.map(loc => ({
            hotelId,
            name: loc.name,
            distance: loc.distance,
            type: loc.type,
          })),
          skipDuplicates: true
        });
      } catch (err) {
        console.error('[Nearby] DB createMany error:', err);
      }

      return await prisma.nearbyLocation.findMany({
        where: { hotelId }
      });
    }

    return [];
  }
}

export default new HotelUseCase();
