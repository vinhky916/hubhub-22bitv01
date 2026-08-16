import prisma from '../../config/database';
import { AppError } from '../../infrastructure/middlewares/error.middleware';
import { BookingStatus } from '@prisma/client';
import { couponUseCase, loyaltyUseCase, cmsUseCase } from '../../config/container';
import socketService from '../../infrastructure/services/socket.service';
import auditService from '../../infrastructure/services/audit.service';
import PaymentService from '../../infrastructure/services/payment.service';
import mailService from '../../infrastructure/services/mail.service';

const paymentService = new PaymentService();

export class BookingUseCase {
  public async cleanupExpiredBookings() {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const expiredBookings = await prisma.booking.findMany({
      where: {
        status: { in: [BookingStatus.PENDING, BookingStatus.PAYMENT_PROCESSING] },
        createdAt: { lt: tenMinutesAgo }
      }
    });

    for (const booking of expiredBookings) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED }
      });

      try {
        const couponUsages = await prisma.couponUsage.findMany({ where: { bookingId: booking.id } });
        for (const usage of couponUsages) {
          await prisma.coupon.update({
            where: { id: usage.couponId },
            data: { usedCount: { decrement: 1 } }
          });
        }
        await prisma.couponUsage.deleteMany({ where: { bookingId: booking.id } });
        await loyaltyUseCase.refundPoints(booking.id);
      } catch (err) {
        console.error(`Failed to refund coupon/points for expired booking ${booking.id}:`, err);
      }

      socketService.emitBookingStatusUpdate(booking.id, BookingStatus.CANCELLED);
    }
  }

  public async createBooking(userId: string | null, data: any) {
    await this.cleanupExpiredBookings();
    const { checkInDate, checkOutDate, guestName, guestEmail, guestPhone, notes, couponCode, insuranceSelected, bookingItems, usePoints, numGuests } = data;

    let finalUserId = userId;
    if (!finalUserId) {
      const emailLower = guestEmail.toLowerCase().trim();
      let user = await prisma.user.findUnique({ where: { email: emailLower } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: emailLower,
            fullName: guestName,
            phoneNumber: guestPhone || null,
            password: '', // Guest user has no password
            role: 'CUSTOMER',
            isVerified: true
          }
        });
      }
      finalUserId = user.id;
    }

    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);

    // 1. Lấy thông tin khách sạn từ các phòng được đặt (giả sử đặt các phòng thuộc cùng 1 khách sạn)
    const firstRoomType = await prisma.roomType.findUnique({
      where: { id: bookingItems[0].roomTypeId },
      include: { hotel: true },
    });
    if (!firstRoomType) throw new AppError('Loại phòng đặt không tồn tại', 400);
    const hotelId = firstRoomType.hotelId;

    // Biến lưu tổng giá trị đặt phòng trước giảm giá và tổng sức chứa số khách
    let totalPrice = 0;
    let calculatedTotalGuests = 0;
    const itemsToCreate: {
      roomTypeId: string;
      ratePlanId?: string | null;
      ratePlanName?: string;
      cancellationPolicySnapshot?: string;
      paymentPolicySnapshot?: string;
      quantity: number;
      price: number;
    }[] = [];

    // Duyệt qua từng loại phòng trong đơn đặt
    for (const item of bookingItems) {
      const rt = await prisma.roomType.findUnique({
        where: { id: item.roomTypeId },
        include: { rooms: true },
      });

      if (!rt) throw new AppError(`Không tìm thấy loại phòng ID: ${item.roomTypeId}`, 404);
      if (rt.hotelId !== hotelId) throw new AppError('Tất cả phòng đặt phải thuộc về cùng một khách sạn', 400);

      // Cộng dồn sức chứa phòng
      calculatedTotalGuests += (rt.capacity || 2) * item.quantity;

      // --- A. Kiểm Tra Chặn Phòng và Tình Trạng Trống ---
      
      // Lấy lịch chặn/giá của loại phòng này trong khoảng thời gian đi
      const calendarOverrides = await prisma.roomPriceCalendar.findMany({
        where: {
          roomTypeId: rt.id,
          date: {
            gte: start,
            lt: end,
          },
        },
      });

      // Nếu bất kỳ ngày nào bị chặn, trả về lỗi chặn phòng
      if (calendarOverrides.some((c) => c.isBlocked)) {
        throw new AppError(`Loại phòng "${rt.name}" đã bị đóng/chặn đặt trong khoảng thời gian này`, 400);
      }

      // Đếm số lượng phòng đã bị đặt và chưa hủy trong khoảng ngày này
      const overlappingBookings = await prisma.booking.findMany({
        where: {
          status: {
            in: [
              BookingStatus.PENDING,
              BookingStatus.PAYMENT_PROCESSING,
              BookingStatus.CONFIRMED,
              BookingStatus.CHECKED_IN,
            ],
          },
          checkInDate: { lt: end },
          checkOutDate: { gt: start },
          bookingItems: {
            some: { roomTypeId: rt.id },
          },
        },
        include: {
          bookingItems: true,
        },
      });

      const bookedQuantity = overlappingBookings.reduce((sum, b) => {
        const bookedItem = b.bookingItems.find((i) => i.roomTypeId === rt.id);
        return sum + (bookedItem ? bookedItem.quantity : 0);
      }, 0);

      const availableCount = rt.rooms.length - bookedQuantity;
      if (availableCount < item.quantity) {
        throw new AppError(
          `Loại phòng "${rt.name}" không đủ phòng trống. Chỉ còn lại ${availableCount} phòng trống.`,
          400
        );
      }

      // --- B. Tính toán giá phòng và chính sách của từng gói Rate Plan ---
      let roomTypeTotalPrice = 0;
      let ratePlan: any = null;
      if (item.ratePlanId) {
        ratePlan = await (prisma.ratePlan as any).findUnique({ where: { id: item.ratePlanId } });
      }

      // Cộng giá tiền từng đêm lưu trú (Check-in đến trước ngày Check-out)
      for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        const override = calendarOverrides.find(
          (c) => c.date.toISOString().split('T')[0] === dateStr
        );
        
        let nightBasePrice = override ? parseFloat(override.price.toString()) : parseFloat(rt.basePrice.toString());
        let finalNightPrice = nightBasePrice;

        if (ratePlan) {
          if (ratePlan.priceModifierType === 'PERCENTAGE_DISCOUNT') {
            finalNightPrice = nightBasePrice * (1 - parseFloat(ratePlan.priceModifierValue.toString()) / 100);
          } else if (ratePlan.priceModifierType === 'AMOUNT_DISCOUNT') {
            finalNightPrice = Math.max(0, nightBasePrice - parseFloat(ratePlan.priceModifierValue.toString()));
          } else if (ratePlan.priceModifierType === 'FIXED_PRICE' && parseFloat(ratePlan.priceModifierValue.toString()) > 0) {
            finalNightPrice = parseFloat(ratePlan.priceModifierValue.toString());
          }
        }

        roomTypeTotalPrice += finalNightPrice;
      }

      // Tổng tiền cho loại phòng này = tổng giá tiền các đêm * số lượng phòng đặt
      const itemFinalPrice = roomTypeTotalPrice * item.quantity;
      totalPrice += itemFinalPrice;

      // Build snapshots chính sách
      let cancelSnap = 'Miễn phí hủy trước 24h';
      let paySnap = 'Thanh toán tại khách sạn';

      if (ratePlan) {
        if (ratePlan.cancellationPolicy === 'NON_REFUNDABLE') {
          cancelSnap = 'Không hoàn tiền nếu hủy';
        } else if (ratePlan.cancellationPolicy === 'FREE_CANCEL') {
          cancelSnap = `Miễn phí hủy trước ${ratePlan.freeCancelHoursBefore || 24} giờ check-in`;
        } else if (ratePlan.cancellationPolicy === 'CANCEL_BEFORE_DAYS') {
          cancelSnap = `Miễn phí hủy trước ${ratePlan.freeCancelDaysBefore || 1} ngày check-in`;
        } else if (ratePlan.cancellationPolicy === 'CANCEL_BEFORE_HOURS') {
          cancelSnap = `Miễn phí hủy trước ${ratePlan.freeCancelHoursBefore || 24} giờ check-in`;
        }

        if (ratePlan.paymentPolicy === 'PAY_ONLINE') {
          paySnap = 'Thanh toán online 100%';
        } else if (ratePlan.paymentPolicy === 'DEPOSIT') {
          const depVal = ratePlan.depositType === 'PERCENTAGE' ? `${ratePlan.depositValue}%` : `${Number(ratePlan.depositValue).toLocaleString('vi-VN')}đ`;
          paySnap = `Đặt cọc ${depVal} trước, còn lại trả tại khách sạn`;
        } else {
          paySnap = 'Thanh toán tại khách sạn';
        }
      }

      itemsToCreate.push({
        roomTypeId: rt.id,
        ratePlanId: ratePlan ? ratePlan.id : null,
        ratePlanName: ratePlan ? ratePlan.name : 'Gói Tiêu chuẩn',
        cancellationPolicySnapshot: cancelSnap,
        paymentPolicySnapshot: paySnap,
        quantity: item.quantity,
        price: itemFinalPrice, // Giá trị lưu lại cho item
      });
    }

    // --- 2. Áp dụng Coupon giảm giá (nếu có) ---
    let discountAmount = 0;
    let validatedCoupon = null;

    if (couponCode) {
      validatedCoupon = await couponUseCase.validateCoupon(couponCode, hotelId, totalPrice, finalUserId);
      discountAmount = validatedCoupon.discountAmount;
    }

    // --- 2.5. Áp dụng Điểm thưởng Loyalty (nếu dùng) ---
    let pointsUsedVal = 0;
    let pointsDiscountVal = 0;

    if (usePoints && Number(usePoints) > 0) {
      pointsUsedVal = Math.floor(Number(usePoints));
      const userPointsBalance = await loyaltyUseCase.getUserPointsBalance(finalUserId);
      
      if (pointsUsedVal > userPointsBalance) {
        throw new AppError(`Số điểm sử dụng vượt quá số điểm hiện có (${userPointsBalance} điểm)`, 400);
      }

      pointsDiscountVal = pointsUsedVal * 200; // 1 điểm = 200 VND
      const maxPointsDiscount = totalPrice * 0.3; // Tối đa 30% giá trị booking gốc

      if (pointsDiscountVal > maxPointsDiscount) {
        throw new AppError(`Giá trị quy đổi điểm thưởng (${pointsDiscountVal.toLocaleString('vi-VN')} đ) vượt quá giới hạn 30% giá trị booking (${maxPointsDiscount.toLocaleString('vi-VN')} đ)`, 400);
      }
    }

    const finalPrice = totalPrice - discountAmount - pointsDiscountVal + (insuranceSelected ? 43500 : 0);

    const commissionRate = cmsUseCase.getSettings().commissionRate || 10;
    const commissionAmount = Number((finalPrice * (commissionRate / 100)).toFixed(2));
    const ownerNetAmount = Number((finalPrice - commissionAmount).toFixed(2));

    // --- 3. Tạo đơn Booking trong Database sử dụng Transaction ---
    const booking = await prisma.$transaction(async (tx) => {
      // 3.1. Tạo đơn Đặt phòng
      const newBooking = await tx.booking.create({
        data: {
          userId: finalUserId,
          checkInDate: start,
          checkOutDate: end,
          totalPrice,
          discountAmount,
          finalPrice,
          commissionRate,
          commissionAmount,
          ownerNetAmount,
          refundAmount: 0,
          payoutStatus: 'PENDING',
          pointsUsed: pointsUsedVal,
          pointsDiscount: pointsDiscountVal,
          status: BookingStatus.PENDING,
          insuranceSelected: !!insuranceSelected,
          guestName,
          guestEmail,
          guestPhone,
          notes,
          numGuests: (numGuests && Number(numGuests) > 1) ? Number(numGuests) : (calculatedTotalGuests || 1),
          bookingItems: {
            create: itemsToCreate.map((item: any) => ({
              roomTypeId: item.roomTypeId,
              ratePlanId: item.ratePlanId,
              ratePlanName: item.ratePlanName,
              cancellationPolicySnapshot: item.cancellationPolicySnapshot,
              paymentPolicySnapshot: item.paymentPolicySnapshot,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        },
        include: {
          bookingItems: true,
        },
      });

      // 3.2. Nếu áp dụng coupon thành công, tạo bản ghi CouponUsage và tăng count
      if (validatedCoupon) {
        await tx.couponUsage.create({
          data: {
            couponId: validatedCoupon.couponId,
            userId: finalUserId,
            bookingId: newBooking.id,
          },
        });

        await tx.coupon.update({
          where: { id: validatedCoupon.couponId },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        });
      }

      // 3.3. Nếu tiêu điểm Loyalty thành công, tạo bản ghi LoyaltyTransaction và cập nhật user
      if (pointsUsedVal > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            userId: finalUserId,
            bookingId: newBooking.id,
            points: -pointsUsedVal,
            type: 'SPEND',
            description: `Sử dụng điểm tích lũy thanh toán đơn phòng #${newBooking.id.substring(0, 8).toUpperCase()}`
          }
        });

        const currentPoints = await loyaltyUseCase.getUserPointsBalance(finalUserId);
        await tx.user.update({
          where: { id: finalUserId },
          data: { loyaltyPoints: Math.max(0, currentPoints - pointsUsedVal) }
        });

        await tx.notification.create({
          data: {
            userId: finalUserId,
            title: 'Khấu trừ điểm tích lũy 💳',
            content: `Bạn đã sử dụng ${pointsUsedVal} điểm Loyalty cho đơn đặt phòng #${newBooking.id.substring(0, 8).toUpperCase()}.`,
            type: 'SYSTEM'
          }
        });
      }

      return newBooking;
    });

    // Phát tín hiệu Real-time cho Chủ khách sạn (Owner) & Admin khi có ĐƠN ĐẶT PHÒNG MỚI!
    socketService.emitBookingStatusUpdate(booking.id, BookingStatus.PENDING).catch(err => {
      console.error('[Create Booking Socket Error]:', err);
    });

    // Gửi email xác nhận đặt phòng kèm vé QR Code cho người dùng
    if (booking.guestEmail) {
      mailService.sendBookingTicketEmail({
        email: booking.guestEmail,
        guestName: booking.guestName,
        bookingId: booking.id,
        hotelName: firstRoomType.hotel.name || 'Khách sạn của chúng tôi',
        roomTypeName: firstRoomType.name || 'Phòng nghỉ',
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        finalPrice: Number(booking.finalPrice)
      }).catch(err => console.error('[CreateBooking Mail Error]:', err));
    }

    return booking;
  }

  public async getBookingDetail(bookingId: string, userId: string | null, userRole: string | null) {
    await this.cleanupExpiredBookings();
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            roomType: {
              include: { hotel: true },
            },
          },
        },
        payment: true,
      },
    });

    if (!booking) throw new AppError('Không tìm thấy đơn đặt phòng', 404);

    // Nếu khách vãng lai (không có userId) truy cập bằng UUID bảo mật, cho phép xem chi tiết
    if (!userId) {
      return booking;
    }

    // Kiểm tra quyền truy cập (Người đặt đơn hoặc Chủ khách sạn của phòng đó hoặc Admin)
    const isOwnerOfRooms = booking.bookingItems.some(
      (item) => item.roomType.hotel.ownerId === userId
    );

    if (userRole !== Role.ADMIN && booking.userId !== userId && !isOwnerOfRooms) {
      throw new AppError('Bạn không có quyền truy cập đơn đặt phòng này', 403);
    }

    return booking;
  }

  public async updateBookingStatus(bookingId: string, status: BookingStatus, userId: string | null, userRole: string | null) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            roomType: { include: { hotel: true } }
          }
        }
      }
    });

    if (!booking) throw new AppError('Không tìm thấy đơn đặt phòng', 404);

    if (userId) {
      const isHotelOwner = booking.bookingItems.some(
        (item) => item.roomType.hotel.ownerId === userId
      );

      if (userRole !== Role.ADMIN && !isHotelOwner) {
        if (booking.userId === userId) {
          // Khách hàng chính chủ có thể:
          // 1. Hủy đơn (CANCELLED) khi đang PENDING, CONFIRMED, PAYMENT_PROCESSING
          if (status === BookingStatus.CANCELLED) {
            if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.CONFIRMED && booking.status !== BookingStatus.PAYMENT_PROCESSING) {
              throw new AppError('Không thể hủy đơn đặt phòng ở trạng thái hiện tại', 400);
            }
          } 
          // 2. Xác nhận đơn (CONFIRMED) khi đang PENDING hoặc PAYMENT_PROCESSING (ví dụ: Thanh toán tại khách sạn)
          else if (status === BookingStatus.CONFIRMED) {
            if (booking.status !== BookingStatus.PENDING && booking.status !== BookingStatus.PAYMENT_PROCESSING) {
              throw new AppError('Đơn đặt phòng không ở trạng thái chờ xác nhận', 400);
            }
          } else {
            throw new AppError('Bạn không có quyền thay đổi trạng thái đơn đặt phòng này', 403);
          }
        } else {
          throw new AppError('Bạn không có quyền thay đổi trạng thái đơn đặt phòng này', 403);
        }
      }
    } else {
      // Cho phép khách vãng lai chưa đăng nhập HỦY hoặc XÁC NHẬN đơn nếu đang PENDING / PAYMENT_PROCESSING
      if ((status === BookingStatus.CANCELLED || status === BookingStatus.CONFIRMED) && 
          (booking.status === BookingStatus.PENDING || booking.status === BookingStatus.PAYMENT_PROCESSING)) {
        // Hợp lệ
      } else {
        throw new AppError('Vui lòng đăng nhập để thay đổi trạng thái đơn hàng', 401);
      }
    }

    // Đổi trạng thái
    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { status },
    });

    // Log action to AuditLog
    if (userId) {
      await auditService.log({
        userId,
        action: `UPDATE_STATUS_${status}`,
        entityName: 'Booking',
        entityId: bookingId,
        oldValues: { status: booking.status },
        newValues: { status }
      });
    }

    // Xử lý hoàn coupon, điểm tích lũy & HOÀN TIỀN khi HỦY đơn
    if (status === BookingStatus.CANCELLED) {
      try {
        // Kiểm tra xem đơn hàng có thuộc gói Không Hoàn Tiền (Non-refundable) không
        const firstItem = booking.bookingItems?.[0];
        const cancelPolicy = (firstItem as any)?.cancellationPolicySnapshot || '';
        const ratePlanName = (firstItem as any)?.ratePlanName || '';

        const isNonRefundable = 
          cancelPolicy.includes('Không hoàn tiền') || 
          cancelPolicy.toUpperCase().includes('NON_REFUNDABLE') || 
          ratePlanName.includes('Non-refundable') ||
          ratePlanName.includes('Không hoàn');

        // Thu hồi coupon
        const couponUsages = await prisma.couponUsage.findMany({ where: { bookingId } });
        for (const usage of couponUsages) {
          await prisma.coupon.update({
            where: { id: usage.couponId },
            data: { usedCount: { decrement: 1 } }
          });
        }
        await prisma.couponUsage.deleteMany({ where: { bookingId } });

        const existingPayment = await prisma.payment.findUnique({ where: { bookingId } });

        if (isNonRefundable) {
          console.log(`[Cancel Booking] Booking #${bookingId} thuộc gói KHÔNG HOÀN TIỀN. Không kích hoạt hoàn tiền VNPay.`);
          // Gửi thông báo cho khách hàng là đơn đã hủy nhưng không được hoàn tiền theo chính sách
          if (booking.userId && existingPayment && existingPayment.status === 'COMPLETED') {
            await prisma.notification.create({
              data: {
                userId: booking.userId,
                title: 'Đã hủy đơn đặt phòng ⚠️',
                content: `Đơn đặt phòng #${bookingId.substring(0, 8).toUpperCase()} đã hủy thành công. Lưu ý: Do đơn phòng thuộc gói "Không hoàn tiền khi hủy" nên số tiền ${Number(booking.finalPrice).toLocaleString('vi-VN')}đ không được hoàn lại theo chính sách của khách sạn.`,
                type: 'SYSTEM'
              }
            });
          }
        } else {
          // Hoàn điểm Loyalty cho các đơn được phép hủy
          await loyaltyUseCase.refundPoints(bookingId);

          // Nếu đơn hàng Miễn phí hủy đã thanh toán Online trước đó (COMPLETED), gọi API hoàn tiền VNPay Sandbox
          if (existingPayment && existingPayment.status === 'COMPLETED') {
            const refundRes = await paymentService.refundVnPayTransaction({
              bookingId,
              amount: Number(booking.finalPrice),
              transactionNo: existingPayment.transactionId || undefined,
              userEmail: booking.guestEmail || undefined,
            });

            await prisma.payment.update({
              where: { id: existingPayment.id },
              data: {
                status: 'REFUNDED',
                transactionId: refundRes.vnpayTransactionNo || existingPayment.transactionId,
              }
            });

            // Tạo thông báo hoàn tiền tự động qua VNPay Sandbox cho khách hàng
            if (booking.userId) {
              await prisma.notification.create({
                data: {
                  userId: booking.userId,
                  title: 'Hoàn tiền VNPay Sandbox thành công 💸',
                  content: `Đơn đặt phòng #${bookingId.substring(0, 8).toUpperCase()} đã hủy thành công. Cổng VNPay Sandbox đã gửi lệnh hoàn trả 100% số tiền ${Number(booking.finalPrice).toLocaleString('vi-VN')}đ về tài khoản ngân hàng/ví VNPay của bạn. Mã giao dịch hoàn tiền: ${refundRes.vnpayTransactionNo}`,
                  type: 'SYSTEM'
                }
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to cleanup coupon/points/refund on cancel:', err);
      }
    }

    // Xử lý điểm tích lũy Loyalty khi hoàn thành/xác nhận
    const allowedEarnStatuses: BookingStatus[] = [
      BookingStatus.CONFIRMED,
      BookingStatus.CHECKED_IN,
      BookingStatus.CHECKED_OUT,
      BookingStatus.COMPLETED
    ];
    if (allowedEarnStatuses.includes(status)) {
      try {
        await loyaltyUseCase.earnPoints(bookingId);
      } catch (err) {
        console.error('Failed to earn points:', err);
      }
    }

    // Phát tín hiệu Socket.io thời gian thực
    socketService.emitBookingStatusUpdate(bookingId, status);

    // Gửi email thông báo cập nhật trạng thái đơn phòng cho khách hàng
    if (booking.guestEmail) {
      mailService.sendBookingStatusUpdateEmail({
        email: booking.guestEmail,
        guestName: booking.guestName,
        bookingId: booking.id,
        hotelName: booking.bookingItems[0]?.roomType.hotel.name || 'Khách sạn',
        roomTypeName: booking.bookingItems[0]?.roomType.name || 'Phòng nghỉ',
        status,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        finalPrice: Number(booking.finalPrice)
      }).catch(err => console.error('[BookingUseCase] Status update email send error:', err));
    }

    return updated;
  }

  public async getMyBookings(userId: string, role?: string) {
    await this.cleanupExpiredBookings();

    if (role === 'HOTEL_OWNER') {
      const bookings = await prisma.booking.findMany({
        where: {
          bookingItems: {
            some: {
              roomType: {
                hotel: {
                  ownerId: userId,
                },
              },
            },
          },
        },
        include: {
          bookingItems: {
            include: {
              roomType: {
                include: { hotel: true },
              },
            },
          },
          payment: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return bookings;
    }

    const bookings = await prisma.booking.findMany({
      where: {
        userId,
      },
      include: {
        bookingItems: {
          include: {
            roomType: {
              include: { hotel: true },
            },
          },
        },
        payment: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return bookings;
  }

  public async applyDiscount(bookingId: string, userId: string, couponCode?: string, usePoints?: number) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            roomType: {
              include: { hotel: true }
            }
          }
        }
      }
    });

    if (!booking) {
      throw new AppError('Không tìm thấy đơn đặt phòng', 404);
    }

    if (booking.userId !== userId) {
      throw new AppError('Bạn không có quyền sửa đổi đơn đặt phòng này', 403);
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new AppError('Chỉ có thể áp dụng mã giảm giá/điểm thưởng cho đơn đặt phòng đang chờ thanh toán', 400);
    }

    // A. Thu hồi (revert) các chiết khấu cũ trước khi áp dụng mới
    // 1. Thu hồi coupon cũ
    const oldUsages = await prisma.couponUsage.findMany({
      where: { bookingId }
    });
    for (const usage of oldUsages) {
      await prisma.coupon.update({
        where: { id: usage.couponId },
        data: { usedCount: { decrement: 1 } }
      });
    }
    await prisma.couponUsage.deleteMany({
      where: { bookingId }
    });

    // 2. Thu hồi điểm tích lũy cũ đã tiêu
    const oldPointsSpend = await prisma.loyaltyTransaction.findFirst({
      where: { bookingId, type: 'SPEND' }
    });
    if (oldPointsSpend) {
      await prisma.loyaltyTransaction.delete({
        where: { id: oldPointsSpend.id }
      });
      // Hoàn trả cache points tạm thời vào User
      const userPoints = await loyaltyUseCase.getUserPointsBalance(userId);
      await prisma.user.update({
        where: { id: userId },
        data: { loyaltyPoints: userPoints }
      });
    }

    // B. Tính toán chiết khấu mới
    // 1. Áp dụng Coupon mới
    let discountAmount = 0;
    let validatedCoupon = null;
    if (couponCode && couponCode.trim() !== '') {
      const hotelId = booking.bookingItems[0]?.roomType.hotelId;
      validatedCoupon = await couponUseCase.validateCoupon(couponCode.trim(), hotelId, Number(booking.totalPrice), booking.userId);
      discountAmount = validatedCoupon.discountAmount;
    }

    // 2. Áp dụng Điểm thưởng Loyalty mới
    let pointsUsedVal = 0;
    let pointsDiscountVal = 0;
    if (usePoints && Number(usePoints) > 0) {
      pointsUsedVal = Math.floor(Number(usePoints));
      const userPointsBalance = await loyaltyUseCase.getUserPointsBalance(userId);
      if (pointsUsedVal > userPointsBalance) {
        throw new AppError(`Số điểm sử dụng vượt quá số điểm hiện có (${userPointsBalance} điểm)`, 400);
      }
      pointsDiscountVal = pointsUsedVal * 200;
      const maxPointsDiscount = Number(booking.totalPrice) * 0.3;
      if (pointsDiscountVal > maxPointsDiscount) {
        throw new AppError(`Giá trị quy đổi điểm thưởng vượt quá giới hạn 30% giá trị phòng`, 400);
      }
    }

    // 3. Tính giá cuối cùng
    const insurancePrice = booking.insuranceSelected ? 43500 : 0;
    const finalPrice = Math.max(0, Number(booking.totalPrice) - discountAmount - pointsDiscountVal + insurancePrice);

    // C. Lưu vào Database thông qua Transaction
    const updatedBooking = await prisma.$transaction(async (tx) => {
      const updated = await tx.booking.update({
        where: { id: bookingId },
        data: {
          discountAmount,
          pointsUsed: pointsUsedVal,
          pointsDiscount: pointsDiscountVal,
          finalPrice
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
        }
      });

      if (validatedCoupon) {
        await tx.couponUsage.create({
          data: {
            couponId: validatedCoupon.couponId,
            userId,
            bookingId
          }
        });
        await tx.coupon.update({
          where: { id: validatedCoupon.couponId },
          data: { usedCount: { increment: 1 } }
        });
      }

      if (pointsUsedVal > 0) {
        await tx.loyaltyTransaction.create({
          data: {
            userId,
            bookingId,
            points: -pointsUsedVal,
            type: 'SPEND',
            description: `Tiêu điểm tích lũy thanh toán đơn phòng #${bookingId.substring(0, 8).toUpperCase()}`
          }
        });
        const currentUserPoints = await loyaltyUseCase.getUserPointsBalance(userId);
        await tx.user.update({
          where: { id: userId },
          data: { loyaltyPoints: currentUserPoints - pointsUsedVal }
        });
      }

      return updated;
    });

    return updatedBooking;
  }

  public async getBookingAuditLogs(bookingId: string, userId: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            roomType: { include: { hotel: true } }
          }
        }
      }
    });
    if (!booking) throw new AppError('Không tìm thấy đơn đặt phòng', 404);

    const isOwnerOfRooms = booking.bookingItems.some(
      (item) => item.roomType.hotel.ownerId === userId
    );
    const isUserAdmin = await prisma.user.findUnique({ where: { id: userId } }).then(u => u?.role === 'ADMIN');

    if (!isUserAdmin && booking.userId !== userId && !isOwnerOfRooms) {
      throw new AppError('Bạn không có quyền truy cập nhật ký hoạt động này', 403);
    }

    const logs = await prisma.auditLog.findMany({
      where: {
        entityName: 'Booking',
        entityId: bookingId
      },
      include: {
        user: {
          select: {
            fullName: true,
            email: true,
            role: true
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    return logs;
  }

  public async updateInternalNotes(bookingId: string, userId: string, internalNotes: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            roomType: { include: { hotel: true } }
          }
        }
      }
    });
    if (!booking) throw new AppError('Không tìm thấy đơn đặt phòng', 404);

    const isOwnerOfRooms = booking.bookingItems.some(
      (item) => item.roomType.hotel.ownerId === userId
    );
    const isUserAdmin = await prisma.user.findUnique({ where: { id: userId } }).then(u => u?.role === 'ADMIN');

    if (!isUserAdmin && !isOwnerOfRooms) {
      throw new AppError('Chỉ chủ khách sạn hoặc Admin mới được phép ghi chú nội bộ', 403);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: { internalNotes }
    });

    await auditService.log({
      userId,
      action: 'UPDATE_INTERNAL_NOTES',
      entityName: 'Booking',
      entityId: bookingId,
      oldValues: { internalNotes: booking.internalNotes },
      newValues: { internalNotes }
    });

    return updated;
  }

  public async updateRoomAssignments(bookingId: string, userId: string, roomAssignments: { [itemId: string]: string }) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            roomType: { include: { hotel: true } }
          }
        }
      }
    });
    if (!booking) throw new AppError('Không tìm thấy đơn đặt phòng', 404);

    const isOwnerOfRooms = booking.bookingItems.some(
      (item) => item.roomType.hotel.ownerId === userId
    );
    const isUserAdmin = await prisma.user.findUnique({ where: { id: userId } }).then(u => u?.role === 'ADMIN');

    if (!isUserAdmin && !isOwnerOfRooms) {
      throw new AppError('Chỉ chủ khách sạn hoặc Admin mới được phép gán phòng', 403);
    }

    const oldAssignments: any = {};
    booking.bookingItems.forEach(item => {
      oldAssignments[item.id] = item.roomNumbers;
    });

    await prisma.$transaction(async (tx) => {
      for (const [itemId, roomNumbers] of Object.entries(roomAssignments)) {
        await tx.bookingItem.update({
          where: { id: itemId },
          data: { roomNumbers: roomNumbers || null }
        });
      }
    });

    await auditService.log({
      userId,
      action: 'ASSIGN_ROOMS',
      entityName: 'Booking',
      entityId: bookingId,
      oldValues: oldAssignments,
      newValues: roomAssignments
    });

    return prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            roomType: { include: { hotel: true } }
          }
        },
        payment: true
      }
    });
  }

  public async changeBookingDates(bookingId: string, userId: string, checkInDateStr: string, checkOutDateStr: string) {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingItems: {
          include: {
            roomType: { include: { hotel: true } }
          }
        }
      }
    });
    if (!booking) throw new AppError('Không tìm thấy đơn đặt phòng', 404);

    const isOwnerOfRooms = booking.bookingItems.some(
      (item) => item.roomType.hotel.ownerId === userId
    );
    const isUserAdmin = await prisma.user.findUnique({ where: { id: userId } }).then(u => u?.role === 'ADMIN');

    if (!isUserAdmin && !isOwnerOfRooms) {
      throw new AppError('Chỉ chủ khách sạn hoặc Admin mới được phép đổi ngày', 403);
    }

    const checkInDate = new Date(checkInDateStr);
    const checkOutDate = new Date(checkOutDateStr);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      throw new AppError('Ngày không hợp lệ', 400);
    }

    if (checkInDate >= checkOutDate) {
      throw new AppError('Ngày Check-in phải trước ngày Check-out', 400);
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: {
        checkInDate,
        checkOutDate
      },
      include: {
        bookingItems: {
          include: {
            roomType: { include: { hotel: true } }
          }
        },
        payment: true
      }
    });

    await auditService.log({
      userId,
      action: 'CHANGE_BOOKING_DATES',
      entityName: 'Booking',
      entityId: bookingId,
      oldValues: { checkInDate: booking.checkInDate, checkOutDate: booking.checkOutDate },
      newValues: { checkInDate, checkOutDate }
    });

    return updated;
  }
}

// Map roles
const Role = {
  ADMIN: 'ADMIN',
  HOTEL_OWNER: 'HOTEL_OWNER',
  CUSTOMER: 'CUSTOMER',
};

export default new BookingUseCase();
