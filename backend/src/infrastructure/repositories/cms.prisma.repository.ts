// Infrastructure: CmsPrismaRepository
import prisma from '../../config/database';
import { ICmsRepository } from '../../domain/repositories/cms.repository';

export class CmsPrismaRepository implements ICmsRepository {
  async findBanners(filters?: any) { return (prisma.banner as any).findMany({ where: filters || {}, orderBy: { createdAt: 'desc' } }); }
  async findBannerById(id: string) { return (prisma.banner as any).findUnique({ where: { id } }); }
  async createBanner(data: any) { return (prisma.banner as any).create({ data }); }
  async updateBanner(id: string, data: any) { return (prisma.banner as any).update({ where: { id }, data }); }
  async deleteBanner(id: string) { await (prisma.banner as any).delete({ where: { id } }); }

  async findCategories() {
    return prisma.category.findMany({
      include: { _count: { select: { hotels: true } } },
      orderBy: { name: 'asc' },
    });
  }
  async findCategoryById(id: string) { return prisma.category.findUnique({ where: { id } }) as any; }
  async findCategoryByNameOrSlug(name: string, slug: string) {
    return prisma.category.findFirst({ where: { OR: [{ name }, { slug }] } }) as any;
  }
  async createCategory(data: any) { return prisma.category.create({ data }) as any; }
  async updateCategory(id: string, data: any) { return prisma.category.update({ where: { id }, data }) as any; }
  async deleteCategory(id: string) { await prisma.category.delete({ where: { id } }); }

  async findAmenities() { return prisma.amenity.findMany({ orderBy: { name: 'asc' } }) as any; }
  async findAmenityByName(name: string) { return prisma.amenity.findUnique({ where: { name } }) as any; }
  async createAmenity(data: any) { return prisma.amenity.create({ data }) as any; }
  async deleteAmenity(id: string) {
    const amenity = await prisma.amenity.findUnique({ where: { id } });
    if (!amenity) return null;
    await prisma.amenity.delete({ where: { id } });
    return amenity as any;
  }

  async countRoomTypes() { return prisma.roomType.count(); }
  async countRooms(filter?: any) { return prisma.room.count(filter ? { where: filter } : undefined); }
  async findRoomTypes(take = 20) {
    return prisma.roomType.findMany({
      take,
      include: { hotel: { select: { name: true } }, _count: { select: { rooms: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findBookingsForFinancials() {
    return prisma.booking.findMany({
      where: { status: { in: ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'] as any } },
      include: { payment: true },
    });
  }
  async findApprovedHotels(take = 5) {
    return prisma.hotel.findMany({
      where: { status: 'APPROVED' },
      take,
      select: { id: true, name: true, starRating: true, _count: { select: { roomTypes: true } } },
    });
  }
}
