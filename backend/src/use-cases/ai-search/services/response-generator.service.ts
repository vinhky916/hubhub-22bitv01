import { BookingSlots, FormattedHotelCard, NlpParseResult } from '../../../interfaces/types/ai-search.types';

export class ResponseGeneratorService {
  /**
   * Phản hồi khi tìm thấy kết quả từ Database
   */
  public generateSuccessResponse(nlpResult: NlpParseResult, hotels: FormattedHotelCard[], total: number): string {
    const slots = nlpResult.slots;
    const validPrices = hotels.map(h => h.priceFrom).filter(p => p > 0);
    const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : 0;

    // Tên loại chỗ ở
    const propertyTypeNames: Record<string, string> = {
      'RESORT': 'Khu nghỉ dưỡng (Resort)',
      'VILLA': 'Biệt thự (Villa)',
      'HOMESTAY': 'Homestay',
      'APARTMENT': 'Căn hộ dịch vụ',
      'GUESTHOUSE': 'Nhà nghỉ',
      'HOTEL': 'Khách sạn'
    };

    const typeText = slots.propertyType ? propertyTypeNames[slots.propertyType] || 'chỗ ở' : 'khách sạn';
    const locationText = slots.city ? ` tại **${slots.city}**` : '';
    const priceInfo = minPrice > 0 ? ` (giá từ **${minPrice.toLocaleString('vi-VN')} VNĐ/đêm**)` : '';

    // Chi tiết ngày đi & số đêm
    let dateText = '';
    if (slots.checkInDate && slots.checkOutDate) {
      dateText = ` cho **${slots.nights || 1} đêm** (từ **${slots.checkInDate}** đến **${slots.checkOutDate}**)`;
    }

    // Chi tiết số khách
    let guestText = '';
    if (slots.adults) {
      guestText = ` dành cho **${slots.adults} người lớn**${slots.children ? `, **${slots.children} trẻ em**` : ''}`;
    }

    let message = `Hệ thống Cloud Booking đã tìm thấy **${total}** ${typeText} phù hợp${locationText}${dateText}${guestText}${priceInfo}.\n\nDưới đây là danh sách lựa chọn tốt nhất dành cho bạn:`;

    // Nhắc nhở gợi ý làm rõ nếu thiếu ngày hoặc thiếu số khách
    if (nlpResult.missingSlots.includes('DATES') || nlpResult.missingSlots.includes('GUESTS')) {
      message += `\n\n💡 *Mẹo: Bạn có thể nhập thêm ngày đi/về (ví dụ: "đi ngày mai 2 đêm") hoặc số người (ví dụ: "4 người lớn 2 trẻ em") để tôi kiểm tra chính xác 100% phòng trống nhé!*`;
    }

    return message;
  }

  /**
   * Phản hồi khi 0 kết quả (Zero results)
   */
  public generateZeroResultsResponse(nlpResult: NlpParseResult, activeCities: string[]): string {
    const slots = nlpResult.slots;
    const suggestedCitiesText = activeCities.length > 0
      ? activeCities.map(c => `**${c}**`).join(', ')
      : '**Đà Lạt**, **Đà Nẵng**';

    const locationName = slots.city || slots.landmark;
    if (locationName) {
      return `Rất tiếc, hiện tại hệ thống Cloud Booking chưa có đối tác chỗ ở nào tại khu vực **${locationName}** 😅.\n\nHệ thống hiện đang có sẵn nhiều khách sạn & resort tuyệt đẹp tại các địa điểm: ${suggestedCitiesText}. Bạn có muốn tham khảo các khu vực này không?`;
    } else {
      return `Rất tiếc, hiện tại hệ thống chưa tìm thấy chỗ ở nào khớp chính xác với tất cả các tiêu chí bạn đưa ra 😅.\n\nBạn thử nới rộng khoảng giá hoặc điều chỉnh lại một vài tiện ích xem sao nhé!`;
    }
  }

  /**
   * Phản hồi thông tin Booking cá nhân khi người dùng đã đăng nhập
   */
  public generatePersonalBookingResponse(userName: string, userBookings: any[]): string {
    if (!userBookings || userBookings.length === 0) {
      return `Xin chào **${userName}**! Hiện tại bạn chưa có đơn đặt phòng nào trên Cloud Booking. Bạn có muốn tôi giúp tìm một địa điểm nghỉ dưỡng tuyệt vời cho chuyến đi sắp tới không?`;
    }

    const latest = userBookings[0];
    const hotelName = latest.hotel?.name || 'Khách sạn';
    const statusText = latest.status === 'CONFIRMED' ? 'Đã xác nhận' : (latest.status === 'PENDING' ? 'Chờ thanh toán' : latest.status);

    return `Xin chào **${userName}**! Bạn đang có đơn đặt phòng tại **${hotelName}** (Mã booking: \`${latest.id.slice(0, 8)}\`). Trạng thái: **${statusText}**.\n\nBạn cần hỗ trợ thêm thông tin gì về đơn đặt phòng này không?`;
  }
}

export default new ResponseGeneratorService();
