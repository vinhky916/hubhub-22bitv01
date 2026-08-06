import axios from 'axios';
import aiConfig from '../../config/ai.config';
import conversationStateManager from './conversation-state.manager';
import { PropertyType } from '@prisma/client';
import {
  BookingSlots,
  NlpParseResult,
  ChatHistoryItem,
  MissingSlot
} from '../../interfaces/types/ai-search.types';

export class NlpProcessorService {
  private getTodayString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
    const dayName = daysOfWeek[now.getDay()];
    return `${year}-${month}-${day} (${dayName})`;
  }

  private getSystemPrompt(): string {
    const today = this.getTodayString();
    return `Bạn là "Trợ Lý AI Tư Vấn Du Lịch" thông minh, tự nhiên và thân thiện của Cloud Booking.
HÔM NAY LÀ: ${today}.

Nhiệm vụ của bạn là đọc tin nhắn của người dùng, trò chuyện tự nhiên như ChatGPT/Gemini và phân tích ý định (intent) thành ĐỐI TƯỢNG JSON CHÍNH XÁC BÁM SÁT DỮ LIỆU.

--- CÁC LOẠI INTENT ---
1. "SEARCH": Tìm kiếm / lọc danh sách phòng khi đã có thông tin địa điểm (city/landmark).
2. "HOTEL_INFO": Hỏi thông tin/tiện ích chi tiết của khách sạn hoặc khu vực đang bàn luận (vd: "ở đó có tiện ích gì", "có phòng gym không", "có spa không", "có máy lạnh không", "ở khách sạn này có hồ bơi không", "có chỗ đỗ xe không", "dịch vụ ở đây thế nào").
   - Nếu hỏi chung về các tiện ích: questionAmenity = "ALL"
   - Nếu hỏi tiện ích cụ thể: questionAmenity = tên tiện ích (vd: "Phòng Gym / Thể hình", "Dịch vụ Spa / Massage", "Điều hòa nhiệt độ", "Hồ bơi", "Bãi đỗ xe", "Wifi miễn phí", "Nhà hàng ăn uống", "Quầy bar / Lounge")
3. "FAQ": Hỏi chính sách hủy phòng, phương thức thanh toán, quy trình đặt phòng.
4. "BOOKING_STATUS": Tra cứu đơn đặt phòng cá nhân.
5. "GENERAL": Chào hỏi, trò chuyện tự nhiên.

--- DẠNG JSON TRẢ VỀ ---
Chỉ trả về 1 chuỗi JSON thuần túy:
{
  "intent": "SEARCH" | "HOTEL_INFO" | "FAQ" | "BOOKING_STATUS" | "GENERAL",
  "replyText": "Lời thoại tự nhiên",
  "slots": {
    "city": string | null,
    "checkInDate": "YYYY-MM-DD" | null,
    "checkOutDate": "YYYY-MM-DD" | null,
    "nights": number | null,
    "adults": number | null,
    "children": number | null,
    "roomCount": number | null,
    "capacity": number | null,
    "priceMin": number | null,
    "priceMax": number | null,
    "starRating": number | null,
    "propertyType": "HOTEL" | "RESORT" | "VILLA" | "HOMESTAY" | "APARTMENT" | "GUESTHOUSE" | null,
    "amenities": string[],
    "landmark": string | null,
    "sortBy": "PRICE_ASC" | "RATING_DESC" | "NEWEST_DESC" | "POPULAR_DESC" | null,
    "targetHotelName": string | null,
    "questionAmenity": string | null
  }
}`;
  }

  public async processNlp(queryText: string, history: ChatHistoryItem[] = [], sessionId: string = 'default'): Promise<NlpParseResult> {
    const provider = aiConfig.preferProvider;
    console.log(`[NlpProcessorService]: Analyzing query: "${queryText}" (Session: ${sessionId}) via ${provider}`);

    let rawResult: { intent: any; replyText: string; slots: BookingSlots };

    try {
      if (provider === 'gemini') {
        rawResult = await this.callGemini(queryText, history);
      } else if (provider === 'openai') {
        rawResult = await this.callOpenAI(queryText, history);
      } else {
        rawResult = this.parseMockNlp(queryText, history);
      }
    } catch (err) {
      console.error('[NlpProcessorService Error]: AI parsing failed, using fallback mock:', err);
      rawResult = this.parseMockNlp(queryText, history);
    }

    // 1. Tích lũy Slot vào ConversationStateManager
    const accumulatedSlots = conversationStateManager.accumulateSlots(sessionId, rawResult.slots);

    // 2. Lấy tên Khách sạn mục tiêu từ ConversationState
    const state = conversationStateManager.getOrCreateState(sessionId);
    if (!accumulatedSlots.targetHotelName && state.currentHotelName) {
      accumulatedSlots.targetHotelName = state.currentHotelName;
      accumulatedSlots.targetHotelId = state.currentHotelId;
    }
    if (!accumulatedSlots.city && state.accumulatedSlots.city) {
      accumulatedSlots.city = state.accumulatedSlots.city;
    }

    // 3. Kiểm tra thông tin mơ hồ và giao tiếp tự nhiên (Clarification Flow)
    const { needsClarification, missingSlots, clarificationPrompt } = this.checkClarification(
      rawResult.intent,
      accumulatedSlots,
      queryText
    );

    return {
      intent: rawResult.intent,
      replyText: rawResult.replyText,
      slots: accumulatedSlots,
      needsClarification,
      missingSlots,
      clarificationPrompt
    };
  }

  private checkClarification(intent: string, slots: BookingSlots, queryText: string): { needsClarification: boolean; missingSlots: MissingSlot[]; clarificationPrompt?: string } {
    if (intent !== 'SEARCH') {
      return { needsClarification: false, missingSlots: [] };
    }

    const missingSlots: MissingSlot[] = [];

    if (!slots.city && !slots.landmark) {
      missingSlots.push('LOCATION');
    }
    if (!slots.checkInDate) {
      missingSlots.push('DATES');
    }
    if (!slots.adults) {
      missingSlots.push('GUESTS');
    }

    if (missingSlots.includes('LOCATION')) {
      return {
        needsClarification: true,
        missingSlots,
        clarificationPrompt: 'Chào bạn! 😊 Bạn muốn tìm khách sạn hay chỗ ở tại địa điểm nào (ví dụ: **Đà Lạt**, **Đà Nẵng**, **Phú Quốc**, **Nha Trang**, **Thành phố Hồ Chí Minh**...)? Cho tôi biết thêm chi tiết để tôi gợi ý chính xác nhất nhé!'
      };
    }

    return {
      needsClarification: false,
      missingSlots
    };
  }

  private async callGemini(queryText: string, history: ChatHistoryItem[] = []): Promise<any> {
    const modelsToTry = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-1.5-pro'];
    let lastError: any = null;

    const geminiContents: any[] = [];
    const recentHistory = history.slice(-4);
    for (const item of recentHistory) {
      geminiContents.push({
        role: item.sender === 'user' ? 'user' : 'model',
        parts: [{ text: item.text }]
      });
    }
    geminiContents.push({
      role: 'user',
      parts: [{ text: queryText }]
    });

    for (const model of modelsToTry) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${aiConfig.geminiApiKey}`;
        const response = await axios.post(url, {
          system_instruction: {
            parts: [{ text: this.getSystemPrompt() }]
          },
          contents: geminiContents,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1
          }
        });

        const textOutput = response.data.candidates[0].content.parts[0].text;
        const cleanJson = textOutput.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleanJson);
      } catch (err) {
        lastError = err;
      }
    }
    throw lastError;
  }

  private async callOpenAI(queryText: string, history: ChatHistoryItem[] = []): Promise<any> {
    const url = 'https://api.openai.com/v1/chat/completions';
    const messages: any[] = [{ role: 'system', content: this.getSystemPrompt() }];
    const recentHistory = history.slice(-4);
    for (const item of recentHistory) {
      messages.push({
        role: item.sender === 'user' ? 'user' : 'assistant',
        content: item.text
      });
    }
    messages.push({ role: 'user', content: queryText });

    const response = await axios.post(
      url,
      {
        model: 'gpt-4o-mini',
        messages,
        response_format: { type: 'json_object' },
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiConfig.openaiApiKey}`
        }
      }
    );

    const content = response.data.choices[0].message.content;
    return JSON.parse(content.trim());
  }

  // Fallback Mock NLP Parser với từ điển linh hoạt
  private parseMockNlp(queryText: string, history: ChatHistoryItem[] = []): { intent: any; replyText: string; slots: BookingSlots } {
    const text = queryText.toLowerCase().trim();

    // Từ điển tiện ích linh hoạt
    const amenityKeywords: Record<string, string> = {
      'hồ bơi': 'Hồ bơi', 'bể bơi': 'Hồ bơi', 'swimming pool': 'Hồ bơi',
      'wifi': 'Wifi miễn phí', 'mạng': 'Wifi miễn phí', 'internet': 'Wifi miễn phí',
      'đỗ xe': 'Bãi đỗ xe', 'đậu xe': 'Bãi đỗ xe', 'bãi xe': 'Bãi đỗ xe', 'ô tô': 'Bãi đỗ xe',
      'gym': 'Phòng Gym / Thể hình', 'thể hình': 'Phòng Gym / Thể hình', 'tập gym': 'Phòng Gym / Thể hình',
      'spa': 'Dịch vụ Spa / Massage', 'massage': 'Dịch vụ Spa / Massage',
      'máy lạnh': 'Điều hòa nhiệt độ', 'điều hòa': 'Điều hòa nhiệt độ',
      'nhà hàng': 'Nhà hàng ăn uống', 'ăn sáng': 'Nhà hàng ăn uống', 'ăn uống': 'Nhà hàng ăn uống',
      'bar': 'Quầy bar / Lounge', 'lounge': 'Quầy bar / Lounge', 'quầy bar': 'Quầy bar / Lounge'
    };

    // 1. HOTEL_INFO Intent: Hỏi tiện ích của khách sạn / chỗ ở đang bàn luận
    let matchedAmenity: string | null = null;
    for (const [kw, officialName] of Object.entries(amenityKeywords)) {
      if (text.includes(kw)) {
        matchedAmenity = officialName;
        break;
      }
    }

    if (
      matchedAmenity ||
      text.includes('tiện ích') ||
      text.includes('dịch vụ') ||
      text.includes('ở đây có') ||
      text.includes('ở khách sạn này') ||
      text.includes('khách sạn có') ||
      text.includes('chỗ đó có')
    ) {
      return {
        intent: 'HOTEL_INFO',
        replyText: '',
        slots: {
          ...this.emptySlots(),
          questionAmenity: matchedAmenity || 'ALL'
        }
      };
    }

    // 2. FAQ Intents
    if (text.includes('đơn đặt') || text.includes('booking của tôi') || text.includes('phòng tôi đã đặt')) {
      return { intent: 'BOOKING_STATUS', replyText: '', slots: this.emptySlots() };
    }

    if (text.includes('hủy phòng') || text.includes('hoàn tiền')) {
      return {
        intent: 'FAQ',
        replyText: 'Chính sách hủy phòng tại Cloud Booking: Bạn được HỦY PHÒNG MIỄN PHÍ trước 24 giờ tính đến mốc thời gian nhận phòng.',
        slots: this.emptySlots()
      };
    }

    if (text.includes('thanh toán') || text.includes('vnpay') || text.includes('momo')) {
      return {
        intent: 'FAQ',
        replyText: 'Cloud Booking hỗ trợ 3 cổng thanh toán: VNPay (QR/Thẻ ATM), Ví MoMo và Thanh toán tiền mặt tại khách sạn.',
        slots: this.emptySlots()
      };
    }

    if (text.includes('xin chào') || text.includes('hello') || text.includes('chào bạn')) {
      return {
        intent: 'GENERAL',
        replyText: 'Xin chào! Tôi là Trợ lý AI của Cloud Booking. Bạn muốn tìm khách sạn ở đâu hay cần tư vấn dịch vụ gì hôm nay?',
        slots: this.emptySlots()
      };
    }

    // 3. SEARCH Intent
    const slots: BookingSlots = this.emptySlots();

    if (text.includes('resort') || text.includes('khu nghỉ dưỡng')) slots.propertyType = PropertyType.RESORT;
    else if (text.includes('villa') || text.includes('biệt thự')) slots.propertyType = PropertyType.VILLA;
    else if (text.includes('homestay')) slots.propertyType = PropertyType.HOMESTAY;
    else if (text.includes('căn hộ') || text.includes('apartment')) slots.propertyType = PropertyType.APARTMENT;
    else if (text.includes('nhà nghỉ')) slots.propertyType = PropertyType.GUESTHOUSE;
    else if (text.includes('khách sạn')) slots.propertyType = PropertyType.HOTEL;

    if (text.includes('đà lạt') || text.includes('dalat')) slots.city = 'Đà Lạt';
    else if (text.includes('đà nẵng') || text.includes('da nang')) slots.city = 'Đà Nẵng';
    else if (text.includes('nha trang')) slots.city = 'Nha Trang';
    else if (text.includes('phú quốc')) slots.city = 'Phú Quốc';
    else if (text.includes('hồ chí minh') || text.includes('sài gòn') || text.includes('tphcm')) slots.city = 'Thành phố Hồ Chí Minh';
    else if (text.includes('hà nội') || text.includes('hn')) slots.city = 'Thành phố Hà Nội';
    else if (text.includes('cà mau')) slots.city = 'Cà Mau';

    if (text.includes('4 người lớn') || text.includes('gia đình')) { slots.adults = 4; slots.capacity = 4; }
    else if (text.includes('2 người lớn') || text.includes('cặp đôi') || text.includes('2 người')) { slots.adults = 2; slots.capacity = 2; }
    
    if (text.includes('2 trẻ em') || text.includes('2 bé')) slots.children = 2;
    else if (text.includes('1 trẻ em') || text.includes('1 bé')) slots.children = 1;

    if (text.includes('2 phòng')) slots.roomCount = 2;

    const now = new Date();
    if (text.includes('ngày mai')) {
      const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfter = new Date(tomorrow); dayAfter.setDate(dayAfter.getDate() + 1);
      slots.checkInDate = tomorrow.toISOString().split('T')[0];
      slots.checkOutDate = dayAfter.toISOString().split('T')[0];
      slots.nights = 1;
    } else if (text.includes('cuối tuần')) {
      const sat = new Date(now); sat.setDate(sat.getDate() + ((6 - sat.getDay() + 7) % 7));
      const sun = new Date(sat); sun.setDate(sun.getDate() + 1);
      slots.checkInDate = sat.toISOString().split('T')[0];
      slots.checkOutDate = sun.toISOString().split('T')[0];
      slots.nights = 1;
    }

    const priceMatch = text.match(/(dưới|trên|khoảng|tầm)?\s*(\d+(\.\d+)?)\s*(triệu|tr)/);
    if (priceMatch) {
      const val = parseFloat(priceMatch[2]) * 1000000;
      if (priceMatch[1] === 'dưới') slots.priceMax = val;
      else if (priceMatch[1] === 'trên') slots.priceMin = val;
      else { slots.priceMin = Math.max(0, val - 300000); slots.priceMax = val + 300000; }
    }

    if (text.includes('giá rẻ') || text.includes('thấp nhất')) slots.sortBy = 'PRICE_ASC';
    else if (text.includes('đánh giá cao') || text.includes('nhiều sao')) slots.sortBy = 'RATING_DESC';

    return {
      intent: 'SEARCH',
      replyText: '',
      slots
    };
  }

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
}

export default new NlpProcessorService();
