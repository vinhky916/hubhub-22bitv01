// Repository Interface: IHotelRepository
// Hợp đồng dữ liệu cho Hotel, RoomType, Room — use-cases không biết Prisma tồn tại

import {
  HotelEntity,
  CreateHotelData,
  UpdateHotelData,
  HotelFilters,
  RoomTypeEntity,
  RoomEntity,
  RoomPriceCalendarEntity,
  ReviewEntity,
  FavoriteEntity,
  NearbyLocationEntity,
} from '../entities/hotel.entity';

export interface IHotelRepository {
  // --- Hotel ---
  findById(id: string): Promise<HotelEntity | null>;
  findByIdWithDetails(id: string): Promise<any | null>; // includes relations
  create(data: CreateHotelData): Promise<HotelEntity>;
  update(id: string, data: UpdateHotelData): Promise<HotelEntity>;
  search(filters: HotelFilters, userId?: string): Promise<{ hotels: any[]; total: number }>;
  approve(id: string, status: string, rejectReason?: string): Promise<HotelEntity>;
  findFirstByOwner(ownerId: string): Promise<HotelEntity | null>;
  findAllByOwner(ownerId: string): Promise<HotelEntity[]>;
  findAll(select?: any): Promise<HotelEntity[]>;

  // --- Amenity / Category / Province ---
  findCategoryById(id: string): Promise<any | null>;
  findProvinceById(id: string): Promise<any | null>;
  findDistrictById(id: string): Promise<any | null>;
  findWardById(id: string): Promise<any | null>;
  deleteHotelAmenities(hotelId: string): Promise<void>;
  createHotelAmenities(data: { hotelId: string; amenityId: string }[]): Promise<void>;
  deleteHotelImages(hotelId: string): Promise<void>;
  createHotelImages(data: { hotelId: string; url: string; isPrimary: boolean }[]): Promise<void>;

  // --- Review ---
  createReview(data: Partial<ReviewEntity>): Promise<ReviewEntity>;
  findReviewById(id: string): Promise<(ReviewEntity & { hotel: any }) | null>;
  updateReview(id: string, data: Partial<ReviewEntity>): Promise<ReviewEntity>;
  incrementReviewLikes(id: string): Promise<ReviewEntity>;

  // --- Favorite ---
  findFavorite(userId: string, hotelId: string): Promise<FavoriteEntity | null>;
  createFavorite(userId: string, hotelId: string): Promise<FavoriteEntity>;
  deleteFavorite(userId: string, hotelId: string): Promise<void>;
  findFavoritesByUser(userId: string): Promise<any[]>;

  // --- RoomType ---
  findRoomTypeById(id: string): Promise<RoomTypeEntity | null>;
  findRoomTypeWithHotel(id: string): Promise<(RoomTypeEntity & { hotel: HotelEntity }) | null>;
  createRoomType(data: any): Promise<RoomTypeEntity>;
  updateRoomType(id: string, data: any): Promise<RoomTypeEntity>;
  deleteRoomType(id: string): Promise<void>;
  findRoomTypesByHotel(hotelId: string): Promise<RoomTypeEntity[]>;

  // --- Room ---
  findRoomById(id: string): Promise<(RoomEntity & { roomType: RoomTypeEntity & { hotel: HotelEntity } }) | null>;
  createRoom(data: { roomTypeId: string; roomNumber: string; isAvailable: boolean }): Promise<RoomEntity>;
  createManyRooms(data: { roomTypeId: string; roomNumber: string; isAvailable: boolean }[]): Promise<void>;
  deleteRoom(id: string): Promise<void>;
  deleteManyRooms(ids: string[]): Promise<void>;
  findRoomsByType(roomTypeId: string): Promise<RoomEntity[]>;
  updateRoom(id: string, data: Partial<RoomEntity>): Promise<RoomEntity>;
  updateManyRooms(ids: string[], data: Partial<RoomEntity>): Promise<void>;
  findRoomsByNumbers(roomTypeId: string, numbers: string[]): Promise<RoomEntity[]>;
  deleteRoomsByIds(ids: string[]): Promise<void>;

  // --- PriceCalendar ---
  findPriceCalendar(roomTypeId: string, from: Date, to: Date): Promise<RoomPriceCalendarEntity[]>;
  upsertPriceCalendar(data: { roomTypeId: string; date: Date; price: number; isBlocked: boolean }): Promise<void>;
  deletePriceCalendar(roomTypeId: string, date: Date): Promise<void>;
  runPriceCalendarTransaction(operations: Promise<any>[]): Promise<void>;

  // --- RatePlan ---
  findRatePlansByRoomType(roomTypeId: string): Promise<any[]>;
  findRatePlanById(id: string): Promise<any | null>;
  createRatePlan(data: any): Promise<any>;
  updateRatePlan(id: string, data: any): Promise<any>;
  deleteRatePlan(id: string): Promise<void>;

  // --- NearbyLocation ---
  createManyNearbyLocations(data: any[]): Promise<void>;

  // --- Misc ---
  findAmenities(orderBy?: any): Promise<any[]>;
  findAmenityByName(name: string): Promise<any | null>;
  createAmenity(data: any): Promise<any>;
  findCategories(orderBy?: any): Promise<any[]>;
  findProvinces(orderBy?: any): Promise<any[]>;
  findDistricts(provinceId: string, orderBy?: any): Promise<any[]>;
  findWards(districtId: string, orderBy?: any): Promise<any[]>;
  findAllProvinces(): Promise<any[]>;
}
