// Domain Entity: Hotel, RoomType, Room
// Lớp thuần TypeScript — không phụ thuộc vào Prisma hay bất kỳ framework nào

export type HotelStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PropertyType = 'HOTEL' | 'APARTMENT' | 'VILLA' | 'RESORT' | 'HOMESTAY' | 'GUESTHOUSE';

export interface HotelEntity {
  id: string;
  ownerId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  address: string;
  provinceId: string;
  districtId?: string | null;
  wardId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  starRating?: number | null;
  propertyType: string;
  status: HotelStatus;
  rejectReason?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateHotelData {
  ownerId: string;
  categoryId: string;
  name: string;
  description?: string | null;
  address: string;
  provinceId: string;
  districtId?: string | null;
  wardId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  starRating?: number | null;
  propertyType?: string;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status?: HotelStatus;
  amenityIds?: string[];
  images?: { url: string; isPrimary: boolean }[];
}

export interface UpdateHotelData {
  name?: string;
  description?: string | null;
  address?: string;
  categoryId?: string;
  propertyType?: string;
  provinceId?: string;
  districtId?: string | null;
  wardId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  starRating?: number | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  status?: HotelStatus;
  rejectReason?: string | null;
  amenityIds?: string[];
  images?: { url: string; isPrimary: boolean }[];
}

export interface HotelFilters {
  provinceId?: string;
  districtId?: string;
  wardId?: string;
  categoryId?: string;
  propertyType?: string;
  starRating?: number;
  priceMin?: number;
  priceMax?: number;
  amenityIds?: string[];
  searchQuery?: string;
  status?: string;
  ownerId?: string;
  limit?: number;
  page?: number;
  checkIn?: string;
  checkOut?: string;
}

export interface RoomTypeEntity {
  id: string;
  hotelId: string;
  name: string;
  description?: string | null;
  basePrice: number;
  capacity: number;
  bedCount: number;
  bedType?: string | null;
  size?: number | null;
  amenities?: string | null;
  includeBreakfast: boolean;
  childSurcharge: number;
  cancellationPolicy?: string | null;
  paymentPolicy?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomEntity {
  id: string;
  roomTypeId: string;
  roomNumber: string;
  isAvailable: boolean;
  housekeepingStatus: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoomPriceCalendarEntity {
  id: string;
  roomTypeId: string;
  date: Date;
  price: number;
  isBlocked: boolean;
}

export interface NearbyLocationEntity {
  id: string;
  hotelId: string;
  name: string;
  type: string;
  distance: string;
}

export interface ReviewEntity {
  id: string;
  hotelId: string;
  userId: string;
  ratingOverall: number;
  ratingCleanliness?: number;
  ratingLocation?: number;
  ratingService?: number;
  ratingFacilities?: number;
  ratingValue?: number;
  comment: string;
  ownerReply?: string | null;
  ownerRepliedAt?: Date | null;
  likesCount: number;
  createdAt: Date;
}

export interface FavoriteEntity {
  id: string;
  userId: string;
  hotelId: string;
  createdAt: Date;
}
