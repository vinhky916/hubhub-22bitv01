// Repository Interface: ICmsRepository
import { CategoryEntity, AmenityEntity, BannerEntity } from '../entities/cms.entity';

export interface ICmsRepository {
  // Banners
  findBanners(filters?: any): Promise<BannerEntity[]>;
  findBannerById(id: string): Promise<BannerEntity | null>;
  createBanner(data: any): Promise<BannerEntity>;
  updateBanner(id: string, data: any): Promise<BannerEntity>;
  deleteBanner(id: string): Promise<void>;

  // Categories
  findCategories(): Promise<any[]>;
  findCategoryById(id: string): Promise<CategoryEntity | null>;
  findCategoryByNameOrSlug(name: string, slug: string): Promise<CategoryEntity | null>;
  createCategory(data: any): Promise<CategoryEntity>;
  updateCategory(id: string, data: any): Promise<CategoryEntity>;
  deleteCategory(id: string): Promise<void>;

  // Amenities
  findAmenities(): Promise<AmenityEntity[]>;
  findAmenityByName(name: string): Promise<AmenityEntity | null>;
  createAmenity(data: any): Promise<AmenityEntity>;
  deleteAmenity(id: string): Promise<AmenityEntity | null>;

  // Room Inventory
  countRoomTypes(): Promise<number>;
  countRooms(filter?: any): Promise<number>;
  findRoomTypes(take?: number): Promise<any[]>;

  // Financial Reports
  findBookingsForFinancials(): Promise<any[]>;
  findApprovedHotels(take?: number): Promise<any[]>;
}
