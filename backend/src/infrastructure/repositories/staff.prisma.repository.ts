// Infrastructure: StaffPrismaRepository
import prisma from '../../config/database';
import { IStaffRepository } from '../../domain/repositories/staff.repository';

export class StaffPrismaRepository implements IStaffRepository {
  async findUserById(id: string, include?: any) {
    return prisma.user.findUnique({ where: { id }, ...(include ? { include } : {}) }) as any;
  }
  async findUserByEmail(email: string) { return prisma.user.findUnique({ where: { email } }) as any; }
  async findUserByPhone(phone: string) { return prisma.user.findFirst({ where: { phoneNumber: phone } }) as any; }
  async createStaffUser(data: any) { return prisma.user.create(data) as any; }
  async updateUser(id: string, data: any) { return prisma.user.update({ where: { id }, data }) as any; }
  async deleteUser(id: string) { await prisma.user.delete({ where: { id } }); }
  async findStaffList(hotelIds: string[]) {
    return prisma.user.findMany({
      where: { role: 'STAFF', staffHotelId: { in: hotelIds } },
      select: {
        id: true, fullName: true, email: true, phoneNumber: true, avatarUrl: true,
        isApproved: true, createdAt: true,
        staffHotel: { select: { id: true, name: true, address: true } },
      },
      orderBy: { createdAt: 'desc' },
    }) as any;
  }

  async findHotelById(id: string) { return prisma.hotel.findUnique({ where: { id } }) as any; }
  async findHotelsByOwner(ownerId: string) {
    return prisma.hotel.findMany({ where: { ownerId }, select: { id: true } as any }) as any;
  }
  async findFirstHotel() { return prisma.hotel.findFirst({ select: { id: true } as any }) as any; }

  async findBookings(filter: any, include?: any, skip?: number, take?: number) {
    return prisma.booking.findMany({
      where: filter,
      ...(include ? { include } : {}),
      orderBy: { createdAt: 'desc' },
      ...(skip !== undefined ? { skip } : {}),
      ...(take !== undefined ? { take } : {}),
    }) as any;
  }
  async countBookings(filter: any) { return prisma.booking.count({ where: filter }); }
  async updateBooking(id: string, data: any) {
    return prisma.booking.update({
      where: { id },
      data,
      include: { bookingItems: { include: { roomType: { select: { id: true, name: true } } } }, payment: true },
    }) as any;
  }
  async findBookingById(id: string, include?: any) {
    return prisma.booking.findUnique({ where: { id }, ...(include ? { include } : {}) }) as any;
  }
  async updateBookingItem(id: string, data: any) { return prisma.bookingItem.update({ where: { id }, data }) as any; }
  async findBookingItemById(id: string, include?: any) {
    return prisma.bookingItem.findUnique({ where: { id }, ...(include ? { include } : {}) }) as any;
  }

  async findRoomTypes(filter: any, include?: any) {
    return (prisma.roomType as any).findMany({
      where: filter,
      ...(include ? { include } : {}),
      orderBy: { name: 'asc' },
    }) as any;
  }
  async findRoomById(id: string, include?: any) {
    return prisma.room.findUnique({ where: { id }, ...(include ? { include } : {}) }) as any;
  }
  async updateRoom(id: string, data: any) { return prisma.room.update({ where: { id }, data }) as any; }
  async updateManyRooms(ids: string[], data: any) {
    await prisma.room.updateMany({ where: { id: { in: ids } }, data });
  }
  async findRooms(filter: any, select?: any) {
    return prisma.room.findMany({ where: filter, ...(select ? { select } : {}) }) as any;
  }
}
