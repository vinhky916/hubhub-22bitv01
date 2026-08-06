import { ConversationState, BookingSlots } from '../../interfaces/types/ai-search.types';

export class ConversationStateManager {
  private sessions: Map<string, ConversationState> = new Map();

  private emptySlots(): BookingSlots {
    return {
      city: null,
      checkInDate: null,
      checkOutDate: null,
      nights: null,
      adults: null,
      children: null,
      roomCount: null,
      capacity: null,
      priceMin: null,
      priceMax: null,
      starRating: null,
      propertyType: null,
      amenities: [],
      landmark: null,
      sortBy: null,
      targetHotelId: null,
      targetHotelName: null,
      questionAmenity: null
    };
  }

  /**
   * Lấy hoặc Khởi tạo trạng thái cho một Session ID
   */
  public getOrCreateState(sessionId: string, userId?: string): ConversationState {
    let state = this.sessions.get(sessionId);
    if (!state) {
      state = {
        sessionId,
        userId,
        currentHotelId: null,
        currentHotelName: null,
        lastSearchHotels: [],
        accumulatedSlots: this.emptySlots(),
        updatedAt: Date.now()
      };
      this.sessions.set(sessionId, state);
    }
    return state;
  }

  /**
   * Cập nhật thông tin partial vào trạng thái
   */
  public updateState(sessionId: string, partial: Partial<ConversationState>): ConversationState {
    const state = this.getOrCreateState(sessionId);
    Object.assign(state, partial, { updatedAt: Date.now() });
    return state;
  }

  /**
   * Đặt Khách sạn mục tiêu đang được bàn luận
   */
  public setTargetHotel(sessionId: string, hotelId: string, hotelName: string): void {
    const state = this.getOrCreateState(sessionId);
    state.currentHotelId = hotelId;
    state.currentHotelName = hotelName;
    state.accumulatedSlots.targetHotelId = hotelId;
    state.accumulatedSlots.targetHotelName = hotelName;
    state.updatedAt = Date.now();
  }

  /**
   * Cập nhật danh sách kết quả tìm kiếm gần nhất
   */
  public setLastSearchHotels(sessionId: string, hotels: { id: string; name: string }[]): void {
    const state = this.getOrCreateState(sessionId);
    state.lastSearchHotels = hotels;
    if (hotels.length > 0) {
      state.currentHotelId = hotels[0].id;
      state.currentHotelName = hotels[0].name;
      state.accumulatedSlots.targetHotelId = hotels[0].id;
      state.accumulatedSlots.targetHotelName = hotels[0].name;
    }
    state.updatedAt = Date.now();
  }

  /**
   * Tích lũy Slot từ câu lệnh mới vào bộ nhớ phiên
   */
  public accumulateSlots(sessionId: string, newSlots: BookingSlots): BookingSlots {
    const state = this.getOrCreateState(sessionId);
    const acc = state.accumulatedSlots;

    if (newSlots.city) acc.city = newSlots.city;
    if (newSlots.checkInDate) acc.checkInDate = newSlots.checkInDate;
    if (newSlots.checkOutDate) acc.checkOutDate = newSlots.checkOutDate;
    if (newSlots.nights) acc.nights = newSlots.nights;
    if (newSlots.adults) acc.adults = newSlots.adults;
    if (newSlots.children) acc.children = newSlots.children;
    if (newSlots.roomCount) acc.roomCount = newSlots.roomCount;
    if (newSlots.capacity) acc.capacity = newSlots.capacity;
    if (newSlots.priceMin) acc.priceMin = newSlots.priceMin;
    if (newSlots.priceMax) acc.priceMax = newSlots.priceMax;
    if (newSlots.starRating) acc.starRating = newSlots.starRating;
    if (newSlots.propertyType) acc.propertyType = newSlots.propertyType;
    if (newSlots.amenities && newSlots.amenities.length > 0) {
      acc.amenities = Array.from(new Set([...acc.amenities, ...newSlots.amenities]));
    }
    if (newSlots.landmark) acc.landmark = newSlots.landmark;
    if (newSlots.sortBy) acc.sortBy = newSlots.sortBy;
    if (newSlots.targetHotelId) acc.targetHotelId = newSlots.targetHotelId;
    if (newSlots.targetHotelName) acc.targetHotelName = newSlots.targetHotelName;
    if (newSlots.questionAmenity) acc.questionAmenity = newSlots.questionAmenity;

    state.updatedAt = Date.now();
    return { ...acc };
  }

  /**
   * Xóa bộ nhớ phiên (dùng khi làm mới chatbox)
   */
  public clearState(sessionId: string): void {
    this.sessions.delete(sessionId);
  }
}

export default new ConversationStateManager();
