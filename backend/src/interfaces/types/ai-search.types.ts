import { PropertyType } from '@prisma/client';

export type AiIntent = 'SEARCH' | 'FAQ' | 'HOTEL_INFO' | 'BOOKING_STATUS' | 'GENERAL';

export type AiSortOption = 'PRICE_ASC' | 'PRICE_DESC' | 'RATING_DESC' | 'POPULAR_DESC' | 'NEWEST_DESC';

export interface ChatHistoryItem {
  sender: 'user' | 'ai';
  text: string;
}

export interface BookingSlots {
  city: string | null;
  checkInDate: string | null; // Định dạng YYYY-MM-DD
  checkOutDate: string | null; // Định dạng YYYY-MM-DD
  nights: number | null;
  adults: number | null;
  children: number | null;
  roomCount: number | null;
  capacity: number | null;
  priceMin: number | null;
  priceMax: number | null;
  starRating: number | null;
  propertyType: PropertyType | null;
  amenities: string[];
  landmark: string | null;
  sortBy: AiSortOption | null;
  targetHotelId?: string | null;
  targetHotelName?: string | null;
  questionAmenity?: string | null;
}

export interface ConversationState {
  sessionId: string;
  userId?: string;
  currentHotelId?: string | null;
  currentHotelName?: string | null;
  lastSearchHotels: { id: string; name: string }[];
  accumulatedSlots: BookingSlots;
  updatedAt: number;
}

export type MissingSlot = 'LOCATION' | 'DATES' | 'GUESTS';

export interface NlpParseResult {
  intent: AiIntent;
  replyText: string;
  slots: BookingSlots;
  needsClarification: boolean;
  missingSlots: MissingSlot[];
  clarificationPrompt?: string;
}

export type ParsedAiQuery = NlpParseResult;

export interface AiSearchQueryOptions {
  sessionId?: string;
  queryText: string;
  history?: ChatHistoryItem[];
  page?: number;
  limit?: number;
  userId?: string;
}

export interface FormattedHotelCard {
  id: string;
  name: string;
  description: string;
  address: string;
  province: string;
  district: string;
  ward: string;
  starRating: number;
  propertyType?: string;
  images: { url: string }[];
  category: string;
  priceFrom: number;
  originalPriceFrom: number;
  averageRating: number;
  reviewCount: number;
}

export interface PaginatedSearchResult {
  aiAnalysis: NlpParseResult;
  replyText: string;
  hotels: FormattedHotelCard[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
  executionMs: number;
  sessionId?: string;
}
