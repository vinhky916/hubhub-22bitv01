import prisma from '../../config/database';
import { AppError } from '../../infrastructure/middlewares/error.middleware';

export class UserUseCase {
  public async getProfile(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        createdAt: true,
        gender: true,
        dateOfBirth: true,
        staffHotelId: true,
        staffHotel: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('Không tìm thấy thông tin người dùng', 404);
    }

    return user;
  }

  public async updateProfile(userId: string, data: any) {
    const { fullName, phoneNumber, avatarUrl, gender, dateOfBirth } = data;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new AppError('Không tìm thấy người dùng', 404);
    }

    if (phoneNumber && phoneNumber.trim() !== '') {
      const cleanedPhone = phoneNumber.trim();
      const existingPhone = await prisma.user.findFirst({
        where: {
          phoneNumber: cleanedPhone,
          id: { not: userId }
        },
      });
      if (existingPhone) {
        throw new AppError('Số điện thoại đã được đăng ký sử dụng bởi tài khoản khác', 400);
      }
    }

    const parsedDateOfBirth = dateOfBirth ? new Date(dateOfBirth) : (dateOfBirth === null ? null : undefined);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        fullName: fullName || undefined,
        phoneNumber: phoneNumber !== undefined ? phoneNumber : undefined,
        avatarUrl: avatarUrl !== undefined ? avatarUrl : undefined,
        gender: gender !== undefined ? gender : undefined,
        dateOfBirth: parsedDateOfBirth,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        role: true,
        isVerified: true,
        gender: true,
        dateOfBirth: true,
        updatedAt: true,
      },
    });

    return updatedUser;
  }
}

export default new UserUseCase();
