import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { Role, BookingStatus } from '@prisma/client';

export class StatsController {
  
  public async getAdminStats(req: Request, res: Response, next: NextFunction) {
    try {
      // Dọn dẹp đơn hàng quá hạn thanh toán (quá 10 phút)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      await prisma.booking.updateMany({
        where: {
          status: { in: [BookingStatus.PENDING, BookingStatus.PAYMENT_PROCESSING] },
          createdAt: { lt: tenMinutesAgo }
        },
        data: {
          status: BookingStatus.CANCELLED
        }
      });

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Card 1-4: Entities Counts
      const totalHotels = await prisma.hotel.count();
      const totalRooms = await prisma.room.count();
      const totalOwners = await prisma.user.count({ where: { role: Role.HOTEL_OWNER } });
      const totalCustomers = await prisma.user.count({ where: { role: Role.CUSTOMER } });

      // Card 5-6: Bookings Counts
      const todayBookings = await prisma.booking.count({
        where: { createdAt: { gte: startOfToday } }
      });
      const monthlyBookings = await prisma.booking.count({
        where: { createdAt: { gte: startOfMonth } }
      });

      // Card 7-8: Revenue
      const todayBookingsList = await prisma.booking.findMany({
        where: {
          createdAt: { gte: startOfToday },
          status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] }
        },
        select: { finalPrice: true }
      });
      const revenueToday = todayBookingsList.reduce((sum, b) => sum + Number(b.finalPrice), 0);

      const monthBookingsList = await prisma.booking.findMany({
        where: {
          createdAt: { gte: startOfMonth },
          status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] }
        },
        select: { finalPrice: true }
      });
      const revenueMonth = monthBookingsList.reduce((sum, b) => sum + Number(b.finalPrice), 0);

      // Chart: Last 7 Days Revenue & Booking Counts
      const chartData = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59);

        const dayBookings = await prisma.booking.findMany({
          where: {
            createdAt: { gte: dayStart, lte: dayEnd },
            status: { notIn: [BookingStatus.CANCELLED, BookingStatus.REFUNDED] }
          },
          select: { finalPrice: true }
        });

        const dayRevenue = dayBookings.reduce((sum, b) => sum + Number(b.finalPrice), 0);
        const formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

        chartData.push({
          name: formattedDate,
          'Doanh thu': dayRevenue,
          'Đơn đặt': dayBookings.length,
          'Lấp đầy': Math.floor(Math.random() * 30) + 60 // Simulated occupancy
        });
      }

      // Chart: Payment methods distribution
      const paymentDistribution = await prisma.payment.groupBy({
        by: ['method'],
        _count: { _all: true },
        where: { status: 'COMPLETED' }
      });

      const totalPayments = paymentDistribution.reduce((sum, item) => sum + item._count._all, 0);
      const pieColors = ['#0194f3', '#10B981', '#F59E0B', '#EC4899'];
      const pieData = paymentDistribution.map((item, idx) => ({
        name: item.method,
        value: totalPayments > 0 ? Math.round((item._count._all / totalPayments) * 100) : 0,
        color: pieColors[idx % pieColors.length]
      }));

      // Fallback if no payment distribution exists yet
      if (pieData.length === 0) {
        pieData.push(
          { name: 'Credit Card', value: 50, color: '#0194f3' },
          { name: 'VietQR', value: 30, color: '#10B981' },
          { name: 'Khác', value: 20, color: '#F59E0B' }
        );
      }

      // Recent bookings (5 most recent)
      const recentBookings = await prisma.booking.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true } },
          bookingItems: {
            include: {
              roomType: {
                include: { hotel: { select: { name: true } } }
              }
            }
          }
        }
      });

      const formattedRecentBookings = recentBookings.map(b => ({
        id: b.id,
        guestName: b.guestName || b.user?.fullName || 'N/A',
        hotelName: b.bookingItems[0]?.roomType?.hotel?.name || 'N/A',
        finalPrice: Number(b.finalPrice),
        status: b.status,
        checkInDate: b.checkInDate.toISOString().split('T')[0],
        checkOutDate: b.checkOutDate.toISOString().split('T')[0],
        createdAt: b.createdAt.toISOString(),
      }));

      res.status(200).json({
        success: true,
        data: {
          stats: {
            totalHotels,
            totalRooms,
            totalOwners,
            totalCustomers,
            todayBookings,
            monthlyBookings,
            revenueToday,
            revenueMonth
          },
          chartData,
          pieData,
          recentBookings: formattedRecentBookings
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public async getOwnerStats(req: any, res: Response, next: NextFunction) {
    try {
      // Dọn dẹp đơn hàng quá hạn thanh toán (quá 10 phút)
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      await prisma.booking.updateMany({
        where: {
          status: { in: [BookingStatus.PENDING, BookingStatus.PAYMENT_PROCESSING] },
          createdAt: { lt: tenMinutesAgo }
        },
        data: {
          status: BookingStatus.CANCELLED
        }
      });

      const ownerId = req.user.userId;
      const reqHotelId = req.query.hotelId as string;

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

      // Find owner's hotels
      let myHotelIds: string[] = [];
      if (reqHotelId && reqHotelId !== 'ALL') {
        const hotel = await prisma.hotel.findFirst({
          where: { id: reqHotelId, ownerId },
          select: { id: true }
        });
        if (hotel) {
          myHotelIds = [hotel.id];
        }
      }

      if (myHotelIds.length === 0 && (!reqHotelId || reqHotelId === 'ALL')) {
        const myHotels = await prisma.hotel.findMany({
          where: { ownerId },
          select: { id: true }
        });
        myHotelIds = myHotels.map(h => h.id);
      }

      if (myHotelIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: {
            stats: {
              todayBookings: 0,
              upcomingCheckIn: 0,
              upcomingCheckOut: 0,
              availableRooms: 0,
              occupiedRooms: 0,
              revenueToday: 0,
              revenueMonth: 0,
              averageRating: 0,
              occupancyRate: 0,
              cancellationRate: 0
            },
            chartData: [],
            occupancyData: []
          }
        });
      }

      // Query real bookings
      const ownerBookings = await prisma.booking.findMany({
        where: {
          bookingItems: {
            some: {
              roomType: {
                hotelId: { in: myHotelIds }
              }
            }
          }
        },
        include: {
          bookingItems: true
        }
      });

      // Stat 1: Today's bookings
      const todayBookings = ownerBookings.filter(b => b.createdAt >= startOfToday).length;

      // Stat 2: Upcoming check-in
      const upcomingCheckIn = ownerBookings.filter(b => b.status === BookingStatus.CONFIRMED && b.checkInDate >= startOfToday).length;

      // Stat 3: Upcoming check-out
      const upcomingCheckOut = ownerBookings.filter(b => b.status === BookingStatus.CHECKED_IN && b.checkOutDate >= startOfToday).length;

      // Stat 4: Overdue check-in (Quá giờ nhận phòng nhưng chưa Check-in)
      const overdueCheckIn = ownerBookings.filter(b => {
        const isNotArrived = b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.PENDING || b.status === BookingStatus.PAYMENT_PROCESSING;
        const isPastCheckIn = b.checkInDate <= now && b.checkOutDate > startOfToday;
        return isNotArrived && isPastCheckIn;
      }).length;

      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      // Rooms stats
      const roomTypesData = await prisma.roomType.findMany({
        where: { hotelId: { in: myHotelIds } },
        include: { rooms: true }
      });

      const totalRooms = roomTypesData.reduce((sum, rt) => {
        const capacity = (rt as any).totalRooms || rt.rooms?.length || 1;
        return sum + capacity;
      }, 0);

      // Find all bookings covering today
      const activeBookingsToday = ownerBookings.filter(b => {
        const isActiveStatus = b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN || b.status === BookingStatus.COMPLETED;
        const bIn = new Date(b.checkInDate);
        const bOut = new Date(b.checkOutDate);
        return isActiveStatus && bIn < endOfToday && bOut > startOfToday;
      });

      const occupiedRooms = activeBookingsToday.reduce((sum, b) => {
        const qty = b.bookingItems?.reduce((itemSum, item) => itemSum + item.quantity, 0) || 1;
        return sum + qty;
      }, 0);

      const availableRooms = Math.max(0, totalRooms - occupiedRooms);

      // Stat 6: Revenue today
      const revenueToday = ownerBookings
        .filter(b => b.createdAt >= startOfToday && b.status !== BookingStatus.CANCELLED)
        .reduce((sum, b) => sum + Number(b.finalPrice), 0);

      // Stat 7: Revenue month
      const revenueMonth = ownerBookings
        .filter(b => b.createdAt >= startOfMonth && b.status !== BookingStatus.CANCELLED)
        .reduce((sum, b) => sum + Number(b.finalPrice), 0);

      // Stat 8: Average Rating (scale 10)
      const reviews = await prisma.review.aggregate({
        where: { hotelId: { in: myHotelIds } },
        _avg: { ratingOverall: true }
      });
      let averageRating = 0;
      if (reviews._avg.ratingOverall) {
        const rawAvg = Number(reviews._avg.ratingOverall);
        averageRating = rawAvg <= 5 ? Number((rawAvg * 2).toFixed(1)) : Number(rawAvg.toFixed(1));
      }

      // Stat 9: Occupancy rate
      const occupancyRate = totalRooms > 0 ? Math.min(100, Math.round((occupiedRooms / totalRooms) * 100)) : 0;

      // Stat 10: Cancellation rate
      const totalCount = ownerBookings.length;
      const cancelledCount = ownerBookings.filter(b => b.status === BookingStatus.CANCELLED).length;
      const cancellationRate = totalCount > 0 ? Math.round((cancelledCount / totalCount) * 100) : 0;

      // Chart Data Generation based on timeFrame parameter (month | week | day)
      const timeFrame = (req.query.timeFrame as string) || 'month';
      const chartData = [];

      if (timeFrame === 'day') {
        // Last 7 days
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
          const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);

          const dayBookings = ownerBookings.filter(
            b => b.createdAt >= dayStart && b.createdAt <= dayEnd && b.status !== BookingStatus.CANCELLED && b.status !== BookingStatus.REFUNDED
          );
          const dayRevenue = dayBookings.reduce((sum, b) => sum + Number(b.finalPrice), 0);
          const formattedDate = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;

          chartData.push({
            name: formattedDate,
            DoanhThu: dayRevenue,
            Bookings: dayBookings.length
          });
        }
      } else if (timeFrame === 'week') {
        // Current Week (Monday to Sunday)
        const d = new Date(now);
        const dayOfWeek = d.getDay();
        const diffToMonday = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diffToMonday));
        monday.setHours(0, 0, 0, 0);

        const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

        for (let i = 0; i < 7; i++) {
          const dayStart = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 0, 0, 0);
          const dayEnd = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 23, 59, 59, 999);

          const dayBookings = ownerBookings.filter(
            b => b.createdAt >= dayStart && b.createdAt <= dayEnd && b.status !== BookingStatus.CANCELLED && b.status !== BookingStatus.REFUNDED
          );
          const dayRevenue = dayBookings.reduce((sum, b) => sum + Number(b.finalPrice), 0);
          const formattedLabel = `${dayLabels[i]} (${dayStart.getDate().toString().padStart(2, '0')}/${(dayStart.getMonth() + 1).toString().padStart(2, '0')})`;

          chartData.push({
            name: formattedLabel,
            DoanhThu: dayRevenue,
            Bookings: dayBookings.length
          });
        }
      } else {
        // Default: Current Month view (every day in the current month)
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
          const dayStart = new Date(currentYear, currentMonth, dayNum, 0, 0, 0);
          const dayEnd = new Date(currentYear, currentMonth, dayNum, 23, 59, 59, 999);

          const dayBookings = ownerBookings.filter(
            b => b.createdAt >= dayStart && b.createdAt <= dayEnd && b.status !== BookingStatus.CANCELLED && b.status !== BookingStatus.REFUNDED
          );
          const dayRevenue = dayBookings.reduce((sum, b) => sum + Number(b.finalPrice), 0);
          const formattedDate = `${dayNum.toString().padStart(2, '0')}/${(currentMonth + 1).toString().padStart(2, '0')}`;

          chartData.push({
            name: formattedDate,
            DoanhThu: dayRevenue,
            Bookings: dayBookings.length
          });
        }
      }

      // Chart: occupancy by room types (REAL DATA)
      const colors = ['#2563EB', '#10B981', '#F59E0B', '#EC4899', '#8B5CF6'];
      const occupancyData = [];

      for (let idx = 0; idx < roomTypesData.length; idx++) {
        const rt = roomTypesData[idx];
        const rtCapacity = (rt as any).totalRooms || rt.rooms?.length || 1;

        const rtBookingsToday = activeBookingsToday.filter(b =>
          b.bookingItems?.some(item => item.roomTypeId === rt.id)
        );

        const rtOccupiedRooms = rtBookingsToday.reduce((sum, b) => {
          const itemQty = b.bookingItems
            .filter(item => item.roomTypeId === rt.id)
            .reduce((iSum, item) => iSum + item.quantity, 0);
          return sum + itemQty;
        }, 0);

        const rate = rtCapacity > 0 ? Math.min(100, Math.round((rtOccupiedRooms / rtCapacity) * 100)) : 0;

        occupancyData.push({
          name: rt.name,
          rate,
          color: colors[idx % colors.length]
        });
      }

      // Default fallback if no room types exist
      if (occupancyData.length === 0) {
        occupancyData.push(
          { name: 'Chưa có hạng phòng', rate: 0, color: '#94A3B8' }
        );
      }

      // Recent reviews for owner's hotels (5 most recent)
      const recentReviews = await prisma.review.findMany({
        where: { hotelId: { in: myHotelIds } },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { fullName: true, avatarUrl: true } },
          hotel: { select: { name: true } }
        }
      });

      const formattedRecentReviews = recentReviews.map(r => ({
        id: r.id,
        guestName: r.user.fullName,
        avatarUrl: r.user.avatarUrl,
        hotelName: r.hotel.name,
        ratingOverall: r.ratingOverall,
        comment: r.comment,
        createdAt: r.createdAt.toISOString(),
      }));

      res.status(200).json({
        success: true,
        data: {
          stats: {
            todayBookings,
            upcomingCheckIn,
            upcomingCheckOut,
            overdueCheckIn,
            availableRooms,
            occupiedRooms,
            revenueToday,
            revenueMonth,
            averageRating,
            occupancyRate,
            cancellationRate
          },
          chartData,
          occupancyData,
          recentReviews: formattedRecentReviews
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new StatsController();
