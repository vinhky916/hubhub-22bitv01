import { Request, Response, NextFunction } from 'express';
import prisma from '../../config/database';
import { Role, BookingStatus } from '@prisma/client';
import { cmsUseCase } from '../../config/container';

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

      // Find owner's hotels with security check
      let myHotelIds: string[] = [];
      if (reqHotelId && reqHotelId !== 'ALL') {
        const hotel = await prisma.hotel.findFirst({
          where: { id: reqHotelId, ownerId },
          select: { id: true }
        });
        if (!hotel) {
          return res.status(403).json({
            success: false,
            message: 'Bạn không có quyền truy cập dữ liệu khách sạn này'
          });
        }
        myHotelIds = [hotel.id];
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
              cancellationRate: 0,
              financials: {
                grossRevenue: 0,
                platformCommission: 0,
                netPayout: 0,
                totalRefunded: 0,
                pendingPayout: 0,
                commissionRate: 10
              }
            },
            financialTransactions: [],
            chartData: [],
            occupancyData: []
          }
        });
      }

      // Query real bookings belonging to owner's hotels
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
          bookingItems: {
            include: {
              roomType: {
                include: { hotel: true }
              }
            }
          },
          payment: true
        },
        orderBy: { createdAt: 'desc' }
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

      // System Commission Rate configured by Admin
      const activeCommissionRate = cmsUseCase.getSettings().commissionRate || 10;

      // --- FINANCIAL OVERVIEW KPI CALCULATIONS (Enterprise ERP Rules) ---
      // Valid bookings eligible for Gross Revenue & Commission
      const validStatuses: BookingStatus[] = [
        BookingStatus.CONFIRMED,
        BookingStatus.CHECKED_IN,
        BookingStatus.CHECKED_OUT,
        BookingStatus.COMPLETED
      ];

      const validBookings = ownerBookings.filter(b => validStatuses.includes(b.status));

      // Helper function to resolve effective financial fields for a booking
      const resolveBookingFinancials = (b: any) => {
        const gross = Number(b.finalPrice) || 0;
        const commRate = (b.commissionRate && Number(b.commissionRate) > 0) ? Number(b.commissionRate) : activeCommissionRate;
        
        const commAmt = (b.commissionAmount && Number(b.commissionAmount) > 0)
          ? Number(b.commissionAmount)
          : Number((gross * (commRate / 100)).toFixed(2));
          
        const refAmt = (b.refundAmount && Number(b.refundAmount) > 0)
          ? Number(b.refundAmount)
          : (b.status === BookingStatus.REFUNDED ? gross : 0);
          
        const ownerNet = (b.ownerNetAmount && Number(b.ownerNetAmount) > 0)
          ? Number(b.ownerNetAmount)
          : Math.max(0, gross - commAmt - refAmt);

        return { gross, commRate, commAmt, refAmt, ownerNet };
      };

      // Helper function to resolve effective payout status & payout date per booking
      const resolveBookingPayoutInfo = (b: any) => {
        const dbStatus = b.payoutStatus;
        let resolvedStatus: string = dbStatus || 'PENDING';

        if (!dbStatus || dbStatus === 'PENDING') {
          if (b.status === BookingStatus.COMPLETED) resolvedStatus = 'PAID';
          else if (b.status === BookingStatus.CHECKED_OUT) resolvedStatus = 'ELIGIBLE';
          else if (b.status === BookingStatus.CONFIRMED || b.status === BookingStatus.CHECKED_IN) resolvedStatus = 'PENDING';
          else if (b.status === BookingStatus.CANCELLED || b.status === BookingStatus.REFUNDED) resolvedStatus = 'FAILED';
        }

        const resolvedAt = (resolvedStatus === 'PAID' && b.payoutAt)
          ? new Date(b.payoutAt).toISOString()
          : (resolvedStatus === 'PAID' ? b.updatedAt.toISOString() : null);

        return { resolvedStatus, resolvedAt };
      };

      // 1. Gross Revenue (Before refund)
      const grossRevenue = validBookings.reduce((sum, b) => sum + Number(b.finalPrice), 0);

      // 2. Platform Commission (Snapshot or System Rate)
      const platformCommission = validBookings.reduce((sum, b) => {
        const { commAmt } = resolveBookingFinancials(b);
        return sum + commAmt;
      }, 0);

      // 3. Total Refunded (Sum of refundAmount for COMPLETED refunds or REFUNDED bookings)
      const totalRefunded = ownerBookings.reduce((sum, b) => {
        const { refAmt } = resolveBookingFinancials(b);
        return sum + refAmt;
      }, 0);

      // 4. Net Payout (Owner Net = grossRevenue - platformCommission - refund)
      const netPayout = validBookings.reduce((sum, b) => {
        const { ownerNet } = resolveBookingFinancials(b);
        return sum + ownerNet;
      }, 0);

      // 5. Pending Payout (WHERE payoutStatus IN ('PENDING', 'ELIGIBLE', 'PROCESSING'))
      const pendingPayoutBookings = validBookings.filter(b => {
        const { resolvedStatus } = resolveBookingPayoutInfo(b);
        return ['PENDING', 'ELIGIBLE', 'PROCESSING'].includes(resolvedStatus);
      });

      const pendingPayout = pendingPayoutBookings.reduce((sum, b) => {
        const { ownerNet } = resolveBookingFinancials(b);
        return sum + ownerNet;
      }, 0);

      // Financial Transactions detail array for Owner Table
      const financialTransactions = ownerBookings.map(b => {
        const hName = b.bookingItems?.[0]?.roomType?.hotel?.name || 'Khách sạn';
        const { gross, commRate, commAmt, refAmt, ownerNet } = resolveBookingFinancials(b);
        
        const { resolvedStatus, resolvedAt } = resolveBookingPayoutInfo(b);
        const payoutAmount = ['PAID', 'ELIGIBLE', 'PROCESSING'].includes(resolvedStatus) ? ownerNet : 0;

        return {
          id: b.id,
          hotelName: hName,
          guestName: b.guestName,
          guestPhone: b.guestPhone,
          guestEmail: b.guestEmail,
          checkInDate: b.checkInDate,
          checkOutDate: b.checkOutDate,
          createdAt: b.createdAt,
          bookingStatus: b.status,
          grossRevenue: gross,
          commissionRate: commRate,
          commissionAmount: commAmt,
          refundAmount: refAmt,
          ownerNetAmount: ownerNet,
          payoutAmount,
          payoutStatus: resolvedStatus,
          payoutAt: resolvedAt
        };
      });

      // Chart Data Generation based on timeFrame parameter (month | week | day)
      const timeFrame = (req.query.timeFrame as string) || 'month';
      const chartData = [];

      if (timeFrame === 'day') {
        // Last 7 days (day by day)
        for (let i = 6; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
          const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
          const dayBookings = ownerBookings.filter(b => b.createdAt >= dayStart && b.createdAt <= dayEnd && b.status !== BookingStatus.CANCELLED);
          const rev = dayBookings.reduce((s, b) => s + Number(b.finalPrice), 0);

          chartData.push({
            name: `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`,
            DoanhThu: rev,
            Bookings: dayBookings.length
          });
        }
      } else if (timeFrame === 'week') {
        // Current Week: Monday to Sunday (day by day)
        const d = new Date(now);
        const dayOfWeek = d.getDay();
        const diffToMonday = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diffToMonday));
        monday.setHours(0, 0, 0, 0);

        const dayLabels = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

        for (let i = 0; i < 7; i++) {
          const dayStart = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 0, 0, 0);
          const dayEnd = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i, 23, 59, 59, 999);

          const dayBookings = ownerBookings.filter(b => b.createdAt >= dayStart && b.createdAt <= dayEnd && b.status !== BookingStatus.CANCELLED);
          const rev = dayBookings.reduce((s, b) => s + Number(b.finalPrice), 0);

          chartData.push({
            name: `${dayLabels[i]} (${dayStart.getDate().toString().padStart(2, '0')}/${(dayStart.getMonth() + 1).toString().padStart(2, '0')})`,
            DoanhThu: rev,
            Bookings: dayBookings.length
          });
        }
      } else {
        // Current Month: Every single day in the current month (day by day)
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
          const dayStart = new Date(currentYear, currentMonth, dayNum, 0, 0, 0);
          const dayEnd = new Date(currentYear, currentMonth, dayNum, 23, 59, 59, 999);

          const dayBookings = ownerBookings.filter(b => b.createdAt >= dayStart && b.createdAt <= dayEnd && b.status !== BookingStatus.CANCELLED);
          const rev = dayBookings.reduce((s, b) => s + Number(b.finalPrice), 0);

          chartData.push({
            name: `${dayNum.toString().padStart(2, '0')}/${(currentMonth + 1).toString().padStart(2, '0')}`,
            DoanhThu: rev,
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
            cancellationRate,
            financials: {
              grossRevenue,
              platformCommission,
              netPayout,
              totalRefunded,
              pendingPayout,
              commissionRate: activeCommissionRate
            }
          },
          financialTransactions,
          chartData,
          occupancyData,
          recentReviews: formattedRecentReviews
        }
      });
    } catch (error) {
      next(error);
    }
  }

  public async getSystemHotelStats(req: Request, res: Response, next: NextFunction) {
    try {
      const timeRange = (req.query.timeRange as string) || 'all';
      const categoryFilter = (req.query.category as string) || 'ALL';
      const provinceFilter = (req.query.province as string) || 'ALL';

      const now = new Date();
      let startDate: Date | undefined;

      if (timeRange === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (timeRange === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (timeRange === '30days') {
        startDate = new Date(now.valueOf() - 30 * 24 * 60 * 60 * 1000);
      } else if (timeRange === 'year') {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      // Base query for hotels
      const hotelWhere: any = {};
      if (categoryFilter !== 'ALL') {
        hotelWhere.categoryId = categoryFilter;
      }
      if (provinceFilter !== 'ALL') {
        hotelWhere.provinceId = provinceFilter;
      }

      const hotels = await prisma.hotel.findMany({
        where: hotelWhere,
        include: {
          owner: { select: { fullName: true, email: true } },
          category: { select: { name: true, slug: true } },
          province: { select: { name: true } },
          district: { select: { name: true } },
          roomTypes: {
            include: {
              rooms: true
            }
          },
          reviews: {
            select: { ratingOverall: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      // Fetch all bookings for analysis
      const bookingWhere: any = {};
      if (startDate) {
        bookingWhere.createdAt = { gte: startDate };
      }

      const allBookings = await prisma.booking.findMany({
        where: bookingWhere,
        include: {
          bookingItems: {
            include: {
              roomType: { select: { hotelId: true } }
            }
          }
        }
      });

      // Calculate stats per hotel
      let systemTotalRooms = 0;
      let systemTotalOccupiedRooms = 0;
      let systemTotalRevenue = 0;
      const commissionRate = 0.10; // 10% platform commission

      // Pre-calculate room housekeeping totals
      const roomHousekeepingCounts = await prisma.room.groupBy({
        by: ['housekeepingStatus'],
        _count: { _all: true }
      });

      const housekeepingStats = {
        CLEAN: 0,
        DIRTY: 0,
        IN_USE: 0,
        MAINTENANCE: 0
      };
      roomHousekeepingCounts.forEach(item => {
        if (item.housekeepingStatus in housekeepingStats) {
          (housekeepingStats as any)[item.housekeepingStatus] = item._count._all;
        }
      });

      // Pre-calculate booking status counts
      const bookingStatusCounts = await prisma.booking.groupBy({
        by: ['status'],
        _count: { _all: true },
        ...(startDate ? { where: { createdAt: { gte: startDate } } } : {})
      });

      const bookingStatusStats: Record<string, number> = {
        PENDING: 0,
        PAYMENT_PROCESSING: 0,
        CONFIRMED: 0,
        CHECKED_IN: 0,
        CHECKED_OUT: 0,
        COMPLETED: 0,
        CANCELLED: 0,
        REFUNDED: 0
      };
      bookingStatusCounts.forEach(item => {
        bookingStatusStats[item.status] = item._count._all;
      });

      // Process each hotel for detailed matrix
      const hotelMatrix = hotels.map(hotel => {
        const totalRoomTypes = hotel.roomTypes.length;
        const totalRooms = hotel.roomTypes.reduce((sum, rt) => sum + rt.rooms.length, 0);
        systemTotalRooms += totalRooms;

        let cleanRooms = 0;
        let dirtyRooms = 0;
        let inUseRooms = 0;
        let maintenanceRooms = 0;

        hotel.roomTypes.forEach(rt => {
          rt.rooms.forEach(r => {
            if (r.housekeepingStatus === 'CLEAN') cleanRooms++;
            else if (r.housekeepingStatus === 'DIRTY') dirtyRooms++;
            else if (r.housekeepingStatus === 'IN_USE') inUseRooms++;
            else if (r.housekeepingStatus === 'MAINTENANCE') maintenanceRooms++;
          });
        });

        // Filter bookings belonging to this hotel
        const hotelBookings = allBookings.filter(b => 
          b.bookingItems.some(bi => bi.roomType?.hotelId === hotel.id)
        );

        const totalBookings = hotelBookings.length;
        const completedBookings = hotelBookings.filter(b => 
          b.status === 'CONFIRMED' || b.status === 'CHECKED_IN' || b.status === 'CHECKED_OUT' || b.status === 'COMPLETED'
        ).length;
        const cancelledBookings = hotelBookings.filter(b => b.status === 'CANCELLED' || b.status === 'REFUNDED').length;

        const grossRevenue = hotelBookings
          .filter(b => b.status !== 'CANCELLED' && b.status !== 'REFUNDED')
          .reduce((sum, b) => sum + Number(b.finalPrice), 0);

        systemTotalRevenue += grossRevenue;

        const commissionEarned = grossRevenue * commissionRate;

        // Occupancy calculation for this hotel
        const currentlyOccupied = inUseRooms;
        systemTotalOccupiedRooms += currentlyOccupied;
        const occupancyRate = totalRooms > 0 ? Math.min(100, Math.round((currentlyOccupied / totalRooms) * 100)) : 0;

        // Average rating (scale 10)
        const reviewCount = hotel.reviews.length;
        let averageRating = 0;
        if (reviewCount > 0) {
          const sumRating = hotel.reviews.reduce((s, r) => s + r.ratingOverall, 0);
          const rawAvg = sumRating / reviewCount;
          averageRating = Number((rawAvg <= 5 ? rawAvg * 2 : rawAvg).toFixed(1));
        }

        return {
          id: hotel.id,
          name: hotel.name,
          propertyType: hotel.propertyType,
          categoryName: hotel.category?.name || 'Khác',
          status: hotel.status,
          starRating: hotel.starRating,
          ownerName: hotel.owner?.fullName || 'N/A',
          ownerEmail: hotel.owner?.email || 'N/A',
          provinceName: hotel.province?.name || 'N/A',
          districtName: hotel.district?.name || 'N/A',
          address: hotel.address,
          totalRoomTypes,
          totalRooms,
          cleanRooms,
          dirtyRooms,
          inUseRooms,
          maintenanceRooms,
          totalBookings,
          completedBookings,
          cancelledBookings,
          grossRevenue,
          commissionEarned,
          averageRating,
          reviewCount,
          occupancyRate,
          createdAt: hotel.createdAt.toISOString()
        };
      });

      // Overall System Summary
      const approvedHotels = hotels.filter(h => h.status === 'APPROVED').length;
      const pendingHotels = hotels.filter(h => h.status === 'PENDING').length;
      const suspendedHotels = hotels.filter(h => h.status === 'SUSPENDED').length;
      const rejectedHotels = hotels.filter(h => h.status === 'REJECTED').length;

      const systemOccupancyRate = systemTotalRooms > 0 
        ? Math.min(100, Math.round((systemTotalOccupiedRooms / systemTotalRooms) * 100)) 
        : 0;

      const allReviewsStats = await prisma.review.aggregate({ _avg: { ratingOverall: true }, _count: { _all: true } });
      const rawSystemAvg = allReviewsStats._avg.ratingOverall || 0;
      const systemAverageRating = rawSystemAvg > 0 
        ? Number((rawSystemAvg <= 5 ? rawSystemAvg * 2 : rawSystemAvg).toFixed(1)) 
        : 0;
      const totalReviews = allReviewsStats._count._all || 0;

      // Property Type breakdown chart data
      const propertyTypeMap: Record<string, { name: string; hotelCount: number; revenue: number; bookingCount: number }> = {
        HOTEL: { name: 'Khách sạn', hotelCount: 0, revenue: 0, bookingCount: 0 },
        RESORT: { name: 'Resort', hotelCount: 0, revenue: 0, bookingCount: 0 },
        VILLA: { name: 'Biệt thự / Villa', hotelCount: 0, revenue: 0, bookingCount: 0 },
        APARTMENT: { name: 'Căn hộ', hotelCount: 0, revenue: 0, bookingCount: 0 },
        HOMESTAY: { name: 'Homestay', hotelCount: 0, revenue: 0, bookingCount: 0 },
        GUESTHOUSE: { name: 'Nhà nghỉ', hotelCount: 0, revenue: 0, bookingCount: 0 },
      };

      hotelMatrix.forEach(hm => {
        const pType = hm.propertyType || 'HOTEL';
        if (!propertyTypeMap[pType]) {
          propertyTypeMap[pType] = { name: pType, hotelCount: 0, revenue: 0, bookingCount: 0 };
        }
        propertyTypeMap[pType].hotelCount += 1;
        propertyTypeMap[pType].revenue += hm.grossRevenue;
        propertyTypeMap[pType].bookingCount += hm.totalBookings;
      });

      const propertyTypeStats = Object.keys(propertyTypeMap).map(key => ({
        type: key,
        name: propertyTypeMap[key].name,
        hotelCount: propertyTypeMap[key].hotelCount,
        revenue: propertyTypeMap[key].revenue,
        commission: propertyTypeMap[key].revenue * commissionRate,
        bookingCount: propertyTypeMap[key].bookingCount
      }));

      // Province distribution chart data
      const provinceMap: Record<string, { name: string; hotelCount: number; revenue: number; bookingCount: number }> = {};
      hotelMatrix.forEach(hm => {
        const prov = hm.provinceName || 'Khác';
        if (!provinceMap[prov]) {
          provinceMap[prov] = { name: prov, hotelCount: 0, revenue: 0, bookingCount: 0 };
        }
        provinceMap[prov].hotelCount += 1;
        provinceMap[prov].revenue += hm.grossRevenue;
        provinceMap[prov].bookingCount += hm.totalBookings;
      });

      const provinceStats = Object.values(provinceMap)
        .sort((a, b) => b.hotelCount - a.hotelCount || b.revenue - a.revenue)
        .slice(0, 10);

      // Top 10 Hotels Leaderboard (sorted by revenue)
      const topHotels = [...hotelMatrix]
        .sort((a, b) => b.grossRevenue - a.grossRevenue)
        .slice(0, 10);

      res.status(200).json({
        success: true,
        data: {
          summary: {
            totalHotels: hotels.length,
            approvedHotels,
            pendingHotels,
            suspendedHotels,
            rejectedHotels,
            totalRoomTypes: hotels.reduce((sum, h) => sum + h.roomTypes.length, 0),
            totalRooms: systemTotalRooms,
            occupiedRooms: systemTotalOccupiedRooms,
            systemOccupancyRate,
            totalBookings: allBookings.length,
            totalRevenue: systemTotalRevenue,
            totalCommission: systemTotalRevenue * commissionRate,
            commissionRate: 10,
            systemAverageRating,
            totalReviews
          },
          propertyTypeStats,
          provinceStats,
          housekeepingStats,
          bookingStatusStats,
          topHotels,
          hotelMatrix
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new StatsController();

