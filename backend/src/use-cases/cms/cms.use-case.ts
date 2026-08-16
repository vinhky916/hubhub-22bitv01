// Use-case: CmsUseCase (Clean Architecture — không import prisma)
import { ICmsRepository } from '../../domain/repositories/cms.repository';
import { AppError } from '../../infrastructure/middlewares/error.middleware';
import { SystemSettings } from '../../domain/entities/cms.entity';

let systemSettingsMemory: SystemSettings = {
  commissionRate: 10,
  supportEmail: 'support@cloudbooking.vn',
  supportPhone: '1900 6868',
  maintenanceMode: false,
  announcementText: 'Chào mừng bạn đến với CloudBooking - Hệ thống đặt phòng hàng đầu Việt Nam!',
  updatedAt: new Date().toISOString(),
};

export class CmsUseCase {
  constructor(private cmsRepo: ICmsRepository) {}

  // --- BANNERS ---
  public async getBanners(position?: string, activeOnly: boolean = false) {
    const filters: any = {};
    if (position) filters.position = position;
    if (activeOnly) filters.isActive = true;
    return this.cmsRepo.findBanners(filters);
  }

  public async createBanner(data: { title?: string; imageUrl: string; linkUrl?: string; position: string; isActive?: boolean }) {
    if (!data.imageUrl || !data.position) throw new AppError('Vui lòng cung cấp đầy đủ Link Hình ảnh và Vị trí hiển thị', 400);
    return this.cmsRepo.createBanner({ title: data.title || '', imageUrl: data.imageUrl, linkUrl: data.linkUrl || null, position: data.position, isActive: data.isActive !== undefined ? data.isActive : true });
  }

  public async updateBanner(id: string, data: any) {
    const banner = await this.cmsRepo.findBannerById(id);
    if (!banner) throw new AppError('Banner không tồn tại', 404);
    return this.cmsRepo.updateBanner(id, data);
  }

  public async deleteBanner(id: string) {
    const banner = await this.cmsRepo.findBannerById(id);
    if (!banner) throw new AppError('Banner không tồn tại', 404);
    await this.cmsRepo.deleteBanner(id);
    return { id };
  }

  public async toggleBannerStatus(id: string) {
    const banner = await this.cmsRepo.findBannerById(id) as any;
    if (!banner) throw new AppError('Banner không tồn tại', 404);
    return this.cmsRepo.updateBanner(id, { isActive: !banner.isActive });
  }

  // --- CATEGORIES ---
  public async getCategories() {
    let categories = await this.cmsRepo.findCategories() as any[];

    if (categories.length < 6) {
      const defaultCategories = [
        { name: 'Khách sạn (Hotel)', slug: 'hotel', description: 'Các cơ sở lưu trú chuẩn khách sạn với dịch vụ chuyên nghiệp.' },
        { name: 'Căn hộ (Apartment)', slug: 'apartment', description: 'Căn hộ dịch vụ tiện nghi đầy đủ không gian sống gia đình.' },
        { name: 'Villa / Biệt thự', slug: 'villa', description: 'Biệt thự riêng tư sang trọng nghỉ dưỡng nhóm & gia đình.' },
        { name: 'Resort / Khu nghỉ dưỡng', slug: 'resort', description: 'Khu nghỉ dưỡng quy mô lớn với nhiều tiện ích thư giãn.' },
        { name: 'Homestay', slug: 'homestay', description: 'Không gian ấm cúng trải nghiệm văn hóa địa phương.' },
        { name: 'Nhà nghỉ (Guesthouse)', slug: 'guesthouse', description: 'Lựa chọn lưu trú bình dân, tiết kiệm tối đa chi phí.' },
      ];

      for (const defCat of defaultCategories) {
        const exists = categories.some(c => c.slug === defCat.slug || c.name === defCat.name);
        if (!exists) {
          try { await this.cmsRepo.createCategory(defCat); } catch { /* Ignore concurrent creation */ }
        }
      }
      categories = await this.cmsRepo.findCategories() as any[];
    }
    return categories;
  }

  public async createCategory(data: { name: string; slug?: string; imageUrl?: string; description?: string }) {
    if (!data.name) throw new AppError('Tên danh mục không được để trống', 400);
    const slug = data.slug || data.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-');
    const existing = await this.cmsRepo.findCategoryByNameOrSlug(data.name, slug);
    if (existing) throw new AppError('Tên danh mục hoặc slug đã tồn tại', 400);
    return this.cmsRepo.createCategory({ name: data.name, slug, imageUrl: data.imageUrl || null, description: data.description || null });
  }

  public async updateCategory(id: string, data: any) {
    const cat = await this.cmsRepo.findCategoryById(id);
    if (!cat) throw new AppError('Danh mục không tồn tại', 404);
    return this.cmsRepo.updateCategory(id, data);
  }

  public async deleteCategory(id: string) {
    const cat = await this.cmsRepo.findCategoryById(id);
    if (!cat) throw new AppError('Danh mục không tồn tại', 404);
    await this.cmsRepo.deleteCategory(id);
    return { id };
  }

  // --- AMENITIES ---
  public async getAmenities() { return this.cmsRepo.findAmenities(); }

  public async createAmenity(data: { name: string; icon?: string }) {
    if (!data.name) throw new AppError('Tên tiện ích không được để trống', 400);
    const existing = await this.cmsRepo.findAmenityByName(data.name);
    if (existing) throw new AppError('Tiện ích này đã tồn tại', 400);
    return this.cmsRepo.createAmenity({ name: data.name, icon: data.icon || 'Check' });
  }

  public async deleteAmenity(id: string) {
    const amenity = await this.cmsRepo.deleteAmenity(id);
    if (!amenity) throw new AppError('Tiện ích không tồn tại', 404);
    return { id };
  }

  // --- ROOMS INVENTORY ---
  public async getRoomInventoryOverview() {
    const [totalRoomTypes, totalRooms, cleanRooms, dirtyRooms, inUseRooms, maintenanceRooms, roomTypes] = await Promise.all([
      this.cmsRepo.countRoomTypes(),
      this.cmsRepo.countRooms(),
      this.cmsRepo.countRooms({ housekeepingStatus: 'CLEAN' }),
      this.cmsRepo.countRooms({ housekeepingStatus: 'DIRTY' }),
      this.cmsRepo.countRooms({ housekeepingStatus: 'IN_USE' }),
      this.cmsRepo.countRooms({ housekeepingStatus: 'MAINTENANCE' }),
      this.cmsRepo.findRoomTypes(20),
    ]);

    return {
      stats: { totalRoomTypes, totalRooms, cleanRooms, dirtyRooms, inUseRooms, maintenanceRooms },
      roomTypes: (roomTypes as any[]).map(rt => ({
        id: rt.id, name: rt.name, hotelName: rt.hotel.name,
        basePrice: parseFloat(rt.basePrice.toString()), capacity: rt.capacity,
        bedCount: rt.bedCount, size: rt.size, roomCount: rt._count.rooms,
      })),
    };
  }

  // --- FINANCIAL REPORTS ---
  public async getFinancialReports() {
    const allBookings = await this.cmsRepo.findBookingsForFinancials() as any[];
    let totalRevenue = 0, totalDiscount = 0;
    const paymentMethodStats: Record<string, number> = { VNPAY: 0, MOMO: 0, STRIPE: 0, CASH: 0, OTHER: 0 };

    allBookings.forEach(b => {
      const price = parseFloat(b.finalPrice.toString());
      totalRevenue += price;
      totalDiscount += parseFloat(b.discountAmount.toString());
      if (b.payment?.method) {
        const method = b.payment.method.toUpperCase();
        paymentMethodStats[method] = (paymentMethodStats[method] || 0) + price;
      } else {
        paymentMethodStats['OTHER'] += price;
      }
    });

    const commissionEarned = (totalRevenue * systemSettingsMemory.commissionRate) / 100;
    const topHotels = await this.cmsRepo.findApprovedHotels(5);

    return {
      summary: { totalBookings: allBookings.length, totalRevenue, totalDiscount, commissionRate: systemSettingsMemory.commissionRate, commissionEarned },
      paymentMethodStats, topHotels,
    };
  }

  // --- SYSTEM SETTINGS ---
  public getSettings(): SystemSettings { return systemSettingsMemory; }

  public updateSettings(data: Partial<SystemSettings>): SystemSettings {
    systemSettingsMemory = { ...systemSettingsMemory, ...data, updatedAt: new Date().toISOString() };
    return systemSettingsMemory;
  }
}

export default CmsUseCase;
