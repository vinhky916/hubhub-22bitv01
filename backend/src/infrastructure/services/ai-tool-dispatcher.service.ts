import prisma from '../../config/database';
import locationResolverService from './location-resolver.service';
import queryBuilderService from '../../use-cases/ai-search/services/query-builder.service';
import hotelSearchService from '../../use-cases/ai-search/services/hotel-search.service';
import hotelFormatterService from '../../use-cases/ai-search/services/hotel-formatter.service';
import responseGeneratorService from '../../use-cases/ai-search/services/response-generator.service';
import conversationStateManager from './conversation-state.manager';
import { NlpParseResult, AiSearchQueryOptions, PaginatedSearchResult } from '../../interfaces/types/ai-search.types';

export class AiToolDispatcherService {
  public async dispatch(nlpResult: NlpParseResult, options: AiSearchQueryOptions, startTime: number): Promise<PaginatedSearchResult> {
    const page = options.page || 1;
    const limit = options.limit || 10;
    const userId = options.userId;
    const sessionId = options.sessionId || 'default';

    // 0. Trường hợp AI Cần hỏi làm rõ nhu cầu (Clarification Flow)
    if (nlpResult.needsClarification && nlpResult.clarificationPrompt) {
      return {
        aiAnalysis: nlpResult,
        replyText: nlpResult.clarificationPrompt,
        hotels: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0, hasMore: false },
        executionMs: Date.now() - startTime,
        sessionId
      };
    }

    // 1. Tool: Hỏi đáp tiện ích chi tiết của 1 Khách sạn cụ thể (Hotel Info Tool)
    if (nlpResult.intent === 'HOTEL_INFO') {
      return await this.executeHotelInfoTool(nlpResult, sessionId, startTime);
    }

    // 2. Tool: Tra cứu Đơn đặt phòng cá nhân (Personal Booking Status Tool)
    if (nlpResult.intent === 'BOOKING_STATUS' && userId) {
      return await this.executeBookingTool(nlpResult, userId, page, limit, startTime, sessionId);
    }

    // 3. Tool: FAQ & Hướng dẫn hệ thống (FAQ Tool)
    if (nlpResult.intent === 'FAQ' || nlpResult.intent === 'GENERAL' || (nlpResult.intent === 'BOOKING_STATUS' && !userId)) {
      let replyText = nlpResult.replyText;
      if (nlpResult.intent === 'BOOKING_STATUS' && !userId) {
        replyText = 'Vui lòng đăng nhập tài khoản để tra cứu chi tiết các đơn đặt phòng cá nhân của bạn trên Cloud Booking nhé!';
      }

      return {
        aiAnalysis: nlpResult,
        replyText,
        hotels: [],
        pagination: { page: 1, limit, total: 0, totalPages: 0, hasMore: false },
        executionMs: Date.now() - startTime,
        sessionId
      };
    }

    // 4. Tool: Tìm kiếm Khách sạn & Chỗ ở (Hotel Search Tool)
    return await this.executeSearchTool(nlpResult, page, limit, startTime, sessionId);
  }

  private async executeHotelInfoTool(nlpResult: NlpParseResult, sessionId: string, startTime: number): Promise<PaginatedSearchResult> {
    const state = conversationStateManager.getOrCreateState(sessionId);
    const targetHotelId = nlpResult.slots.targetHotelId || state.currentHotelId;
    const targetHotelName = nlpResult.slots.targetHotelName || state.currentHotelName || 'Dalat Flower Hotel & Spa';
    const askedAmenity = nlpResult.slots.questionAmenity || 'ALL';

    let hotel = null;

    if (targetHotelId) {
      hotel = await prisma.hotel.findUnique({
        where: { id: targetHotelId },
        include: {
          amenities: { include: { amenity: true } },
          province: true,
          district: true,
          ward: true,
          images: true,
          category: true,
          roomTypes: true
        }
      });
    }

    if (!hotel && targetHotelName) {
      hotel = await prisma.hotel.findFirst({
        where: {
          name: { contains: targetHotelName, mode: 'insensitive' }
        },
        include: {
          amenities: { include: { amenity: true } },
          province: true,
          district: true,
          ward: true,
          images: true,
          category: true,
          roomTypes: true
        }
      });
    }

    let replyText = '';
    let hotelCards: any[] = [];

    if (hotel) {
      conversationStateManager.setTargetHotel(sessionId, hotel.id, hotel.name);
      const hotelAmenities = hotel.amenities.map(a => a.amenity.name);

      if (askedAmenity === 'ALL' || askedAmenity === 'TẤT CẢ' || !askedAmenity) {
        replyText = `Tại **${hotel.name}** (${hotel.district.name}, ${hotel.province.name}), bạn sẽ được trải nghiệm các tiện ích & dịch vụ cao cấp thực tế bao gồm:\n\n✨ **${hotelAmenities.join('**, **')}**.\n\nPhòng nghỉ tại đây hiện có giá ưu đãi chỉ từ **${hotel.roomTypes[0]?.basePrice ? Number(hotel.roomTypes[0].basePrice).toLocaleString('vi-VN') : '1.200.000'} VNĐ/đêm**. Bạn có muốn tư vấn thêm về loại phòng nào không? 😊`;
      } else {
        const hasAmenity = hotelAmenities.some(a => a.toLowerCase().includes(askedAmenity.toLowerCase()) || askedAmenity.toLowerCase().includes(a.toLowerCase()));

        if (hasAmenity) {
          replyText = `Có bạn nhé! Khách sạn **${hotel.name}** tại ${hotel.district.name}, ${hotel.province.name} **CÓ TÍCH HỢP** tiện ích **${askedAmenity}** phục vụ khách lưu trú! 🏊‍♂️✨\n\nBạn có muốn tiến hành xem phòng và đặt phòng tại đây không?`;
        } else {
          replyText = `Hiện tại khách sạn **${hotel.name}** chưa trang bị tiện ích **${askedAmenity}**. Tuy nhiên, chỗ ở có nhiều dịch vụ tiện nghi khác như: **${hotelAmenities.join('**, **')}**.\n\nBạn có muốn tôi gợi ý thêm các địa điểm khác có sẵn tiện ích **${askedAmenity}** không? 😊`;
        }
      }

      hotelCards = hotelFormatterService.formatHotels([hotel as any]);
    } else {
      replyText = `Chào bạn! 😊 Hiện tại tôi chưa xác định được cụ thể tên khách sạn bạn đang muốn hỏi. Bạn có thể cho tôi biết tên khách sạn hoặc thành phố bạn đang muốn tìm chỗ ở không?`;
    }

    return {
      aiAnalysis: nlpResult,
      replyText,
      hotels: hotelCards,
      pagination: { page: 1, limit: 10, total: hotelCards.length, totalPages: 1, hasMore: false },
      executionMs: Date.now() - startTime,
      sessionId
    };
  }

  private async executeBookingTool(nlpResult: NlpParseResult, userId: string, page: number, limit: number, startTime: number, sessionId: string): Promise<PaginatedSearchResult> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { fullName: true }
    });

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        bookingItems: {
          include: {
            roomType: {
              include: {
                hotel: { select: { name: true } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 3
    });

    const formattedBookings = bookings.map(b => ({
      id: b.id,
      status: b.status,
      hotel: {
        name: b.bookingItems[0]?.roomType?.hotel?.name || 'Khách sạn'
      }
    }));

    const userName = user?.fullName || 'bạn';
    const replyText = responseGeneratorService.generatePersonalBookingResponse(userName, formattedBookings);

    return {
      aiAnalysis: nlpResult,
      replyText,
      hotels: [],
      pagination: { page, limit, total: bookings.length, totalPages: 1, hasMore: false },
      executionMs: Date.now() - startTime,
      sessionId
    };
  }

  private async executeSearchTool(nlpResult: NlpParseResult, page: number, limit: number, startTime: number, sessionId: string): Promise<PaginatedSearchResult> {
    const slots = nlpResult.slots;

    const { officialName, provinceId, districtId } = await locationResolverService.resolveLocation(slots.city);

    if (officialName) {
      slots.city = officialName;
    }

    const where = queryBuilderService.buildWhereClause(slots, provinceId, districtId);
    const orderBy = queryBuilderService.buildOrderByClause(slots.sortBy);

    const { hotels: rawHotels, total } = await hotelSearchService.searchHotels(where, orderBy, page, limit);

    const formattedHotels = hotelFormatterService.formatHotels(rawHotels);

    if (formattedHotels.length > 0) {
      conversationStateManager.setLastSearchHotels(
        sessionId,
        formattedHotels.map(h => ({ id: h.id, name: h.name }))
      );
    }

    let replyText = '';
    if (formattedHotels.length > 0) {
      replyText = responseGeneratorService.generateSuccessResponse(nlpResult, formattedHotels, total);
    } else {
      const activeCities = await hotelSearchService.getActiveProvinces();
      replyText = responseGeneratorService.generateZeroResultsResponse(nlpResult, activeCities);
    }

    const totalPages = Math.ceil(total / limit);
    const hasMore = page < totalPages;

    return {
      aiAnalysis: nlpResult,
      replyText,
      hotels: formattedHotels,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasMore
      },
      executionMs: Date.now() - startTime,
      sessionId
    };
  }
}

export default new AiToolDispatcherService();
