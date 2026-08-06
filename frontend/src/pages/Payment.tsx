import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import apiClient from '../core/api/client';
import { formatFullDateVN } from '../utils/date';
import { formatPrice } from '../utils/price';
import { useModal } from '../components/common/ModalContext';
import {
  Lock,
  ShieldCheck,
  Clock,
  ChevronDown,
  User,
  Users,
  Bed,
  Utensils,
  Calendar,
  XCircle,
  AlertTriangle,
  Sparkles,
  Bell,
  Hotel,
  ThumbsUp,
  Building,
  CreditCard,
  FileText,
  Gift,
  Check,
  AlertCircle
} from 'lucide-react';

interface BookingDetail {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  discountAmount: number;
  pointsUsed: number;
  pointsDiscount: number;
  finalPrice: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string | null;
  insuranceSelected: boolean;
  createdAt: string;
  status: string;
  bookingItems: {
    ratePlanName?: string | null;
    cancellationPolicySnapshot?: string | null;
    paymentPolicySnapshot?: string | null;
    roomType: {
      name: string;
      bedCount: number;
      bedType?: string | null;
      includeBreakfast?: boolean;
      paymentPolicy?: string | null;
      hotel: {
        name: string;
        address: string;
        checkInTime: string | null;
        checkOutTime: string | null;
      };
    };
    quantity: number;
    price: number;
  }[];
}

const isHotelPaymentAllowed = (b: BookingDetail | null): boolean => {
  if (!b || !b.bookingItems || b.bookingItems.length === 0) return false;
  return b.bookingItems.every((item) => {
    const snap = (item.paymentPolicySnapshot || '').toLowerCase();
    const roomPolicy = (item.roomType?.paymentPolicy || '').toUpperCase();

    if ((snap.includes('online 100%') || roomPolicy === 'PAY_ONLINE') && !snap.includes('khách sạn') && !snap.includes('trả tại')) {
      return false;
    }

    return true;
  });
};

export const Payment: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get('bookingId');
  const { language, currency } = useSelector((state: RootState) => state.settings);
  const { showAlert } = useModal();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Payment option selected (Accordion style)
  const [activeOption, setActiveOption] = useState<'card' | 'vietqr' | 'vietinbank' | 'wallet' | 'mobile' | 'store' | 'hotel'>('card');
  const [subWallet, setSubWallet] = useState<'momo' | 'zalopay' | 'shopeepay' | 'vnpay' | 'paypal'>('momo');
  const [paypalRedirecting, setPaypalRedirecting] = useState(false);

  // Form states for Credit Card
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardErrors, setCardErrors] = useState<{ [key: string]: string }>({});

  // Countdown states (10 minutes = 600 seconds)
  const [secondsLeft, setSecondsLeft] = useState(600);

  // Submit states
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitMessage, setSubmitMessage] = useState('');
  const [vnpayRedirecting, setVnpayRedirecting] = useState(false);

  const { user } = useSelector((state: RootState) => state.auth);

  // Discount & Loyalty states
  const [couponInput, setCouponInput] = useState('');
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([]);
  const [usePointsToggle, setUsePointsToggle] = useState(false);
  const [pointsInput, setPointsInput] = useState('0');
  const [availablePoints, setAvailablePoints] = useState(0);
  const [applyingDiscount, setApplyingDiscount] = useState(false);
  const [couponSuccessMessage, setCouponSuccessMessage] = useState('');
  const [couponErrorMessage, setCouponErrorMessage] = useState('');

  useEffect(() => {
    if (bookingId) {
      apiClient.get('/coupons')
        .then(res => {
          if (res.data.success && Array.isArray(res.data.data)) {
            setAvailableCoupons(res.data.data);
          }
        })
        .catch(err => console.error('Failed to fetch payment coupons:', err));
    }
  }, [bookingId]);

  // Fetch available loyalty points on mount
  useEffect(() => {
    if (user) {
      const fetchLoyaltyPoints = async () => {
        try {
          const res = await apiClient.get('/loyalty/summary');
          if (res.data.success) {
            setAvailablePoints(res.data.data.pointsBalance || 0);
          }
        } catch (err) {
          console.error('Failed to fetch loyalty points summary:', err);
        }
      };
      fetchLoyaltyPoints();
    }
  }, [user]);

  // Set initial loyalty points values from booking if already populated
  useEffect(() => {
    if (booking) {
      if (booking.pointsUsed > 0) {
        setUsePointsToggle(true);
        setPointsInput(booking.pointsUsed.toString());
      } else {
        setUsePointsToggle(false);
        setPointsInput('0');
      }
    }
  }, [booking]);

  const handleApplyDiscount = async () => {
    if (!bookingId) return;
    setApplyingDiscount(true);
    setCouponSuccessMessage('');
    setCouponErrorMessage('');
    try {
      const res = await apiClient.put(`/bookings/${bookingId}/apply-discount`, {
        couponCode: couponInput,
        usePoints: usePointsToggle ? Number(pointsInput) : 0
      });
      if (res.data.success) {
        setBooking(res.data.data);
        if (couponInput) {
          setCouponSuccessMessage(
            language === 'vi'
              ? `Áp dụng mã giảm giá thành công: giảm -${formatPrice(Number(res.data.data.discountAmount), currency)}`
              : `Successfully applied code: saved -${formatPrice(Number(res.data.data.discountAmount), currency)}`
          );
        }
        // Refresh available loyalty points
        const loyaltyRes = await apiClient.get('/loyalty/summary');
        if (loyaltyRes.data.success) {
          setAvailablePoints(loyaltyRes.data.data.pointsBalance || 0);
        }
      }
    } catch (err: any) {
      console.error(err);
      setCouponErrorMessage(err.response?.data?.message || (language === 'vi' ? 'Không thể áp dụng mã giảm giá.' : 'Could not apply code.'));
    } finally {
      setApplyingDiscount(false);
    }
  };

  const handlePointsUpdate = async (pts: string) => {
    if (!bookingId || !booking) return;
    const maxAvailableForThisBooking = availablePoints + (booking.pointsUsed || 0);
    const num = Math.min(Math.floor(Number(pts) || 0), maxAvailableForThisBooking);
    setPointsInput(num.toString());
    setApplyingDiscount(true);
    try {
      const res = await apiClient.put(`/bookings/${bookingId}/apply-discount`, {
        couponCode: couponInput,
        usePoints: num
      });
      if (res.data.success) {
        setBooking(res.data.data);
        const loyaltyRes = await apiClient.get('/loyalty/summary');
        if (loyaltyRes.data.success) {
          setAvailablePoints(loyaltyRes.data.data.pointsBalance || 0);
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setApplyingDiscount(false);
    }
  };

  useEffect(() => {
    const fetchBooking = async () => {
      if (!bookingId) {
        setError(language === 'vi' ? 'Mã đơn đặt phòng không hợp lệ.' : 'Invalid booking ID.');
        setLoading(false);
        return;
      }

      try {
        const response = await apiClient.get(`/bookings/${bookingId}`);
        if (response.data.success && response.data.data) {
          const fetchedBooking = response.data.data;
          setBooking(fetchedBooking);
          if (fetchedBooking.status === 'PENDING' || fetchedBooking.status === 'PAYMENT_PROCESSING') {
            const elapsed = Math.floor((Date.now() - new Date(fetchedBooking.createdAt).getTime()) / 1000);
            const left = Math.max(0, 600 - elapsed);
            setSecondsLeft(left);
          } else {
            setSecondsLeft(999999);
          }

          // Tự động chọn phương thức Thanh toán tại khách sạn nếu phòng cho phép và chính sách yêu cầu
          const canPayAtHotel = isHotelPaymentAllowed(fetchedBooking);
          const firstItem = fetchedBooking.bookingItems?.[0];
          if (canPayAtHotel && (firstItem?.paymentPolicySnapshot?.toLowerCase().includes('khách sạn') || firstItem?.paymentPolicySnapshot?.includes('PAY_AT_HOTEL'))) {
            setActiveOption('hotel');
          } else if (!canPayAtHotel) {
            setActiveOption('card');
          }
        } else {
          setError(language === 'vi' ? 'Không thể tải thông tin đặt phòng.' : 'Could not load booking details.');
        }
      } catch (err: any) {
        console.error(err);
        setError(err.response?.data?.message || (language === 'vi' ? 'Đã xảy ra lỗi khi tải dữ liệu.' : 'An error occurred.'));
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId, navigate, language]);

  // Countdown timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Auto-cancel booking when 10-minute timer hits 0
  useEffect(() => {
    if (secondsLeft === 0 && bookingId && booking && (booking.status === 'PENDING' || booking.status === 'PAYMENT_PROCESSING')) {
      apiClient.put(`/bookings/${bookingId}/status`, { status: 'CANCELLED' })
        .then(() => {
          setBooking((prev) => (prev ? { ...prev, status: 'CANCELLED' } : null));
        })
        .catch((err) => console.error('Failed to auto-cancel expired booking:', err));
    }
  }, [secondsLeft, bookingId, booking?.status]);

  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Format card number with spaces every 4 digits
    const val = e.target.value.replace(/\D/g, '').substring(0, 16);
    const parts = [];
    for (let i = 0; i < val.length; i += 4) {
      parts.push(val.substring(i, i + 4));
    }
    setCardNumber(parts.join(' '));
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '').substring(0, 4);
    if (val.length >= 3) {
      setExpiryDate(`${val.substring(0, 2)}/${val.substring(2)}`);
    } else {
      setExpiryDate(val);
    }
  };

  const validateCardForm = () => {
    const errs: { [key: string]: string } = {};
    const rawCard = cardNumber.replace(/\s/g, '');

    if (rawCard.length !== 16) {
      errs.cardNumber = language === 'vi' ? 'Số thẻ phải gồm 16 chữ số' : 'Card number must be 16 digits';
    }
    if (!expiryDate.includes('/') || expiryDate.length !== 5) {
      errs.expiryDate = language === 'vi' ? 'Định dạng MM/YY không hợp lệ' : 'Invalid MM/YY format';
    } else {
      const mm = Number(expiryDate.split('/')[0]);
      if (mm < 1 || mm > 12) {
        errs.expiryDate = language === 'vi' ? 'Tháng không hợp lệ' : 'Invalid month';
      }
    }
    if (cvv.length < 3 || cvv.length > 4) {
      errs.cvv = language === 'vi' ? 'Mã CVV phải từ 3-4 chữ số' : 'CVV must be 3-4 digits';
    }
    if (!cardName.trim()) {
      errs.cardName = language === 'vi' ? 'Tên trên thẻ không được để trống' : 'Card name cannot be empty';
    }

    setCardErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleVnPaySubmit = async () => {
    setVnpayRedirecting(true);
    try {
      const res = await apiClient.post('/payment/vnpay/url', {
        bookingId,
        bankCode: subWallet === 'vnpay' ? 'NCB' : undefined,
        frontendUrl: window.location.origin, // Truyền origin hiện tại để backend callback biết và redirect về đúng cổng (ví dụ: localhost:5173 hoặc localhost:5174)
      });
      if (res.data.success && res.data.data?.paymentUrl) {
        // Redirect sang trang thanh toán VNPay
        window.location.href = res.data.data.paymentUrl;
      } else {
        setVnpayRedirecting(false);
        await showAlert(language === 'vi' ? 'Không thể tạo liên kết thanh toán VNPay.' : 'Cannot generate VNPay payment URL.', { type: 'error' });
      }
    } catch (err: any) {
      setVnpayRedirecting(false);
      await showAlert(err.response?.data?.message || (language === 'vi' ? 'Lỗi kết nối VNPay.' : 'VNPay connection error.'), { type: 'error' });
    }
  };

  // PayPal Standard Checkout Flow states
  const [paypalModalOpen, setPaypalModalOpen] = useState(false);
  const [paypalStep, setPaypalStep] = useState<'CREATE' | 'AUTHENTICATE' | 'APPROVE' | 'CAPTURING' | 'SUCCESS'>('CREATE');
  const [paypalOrderData, setPaypalOrderData] = useState<{ orderId: string; amountUsd: number; approveUrl?: string } | null>(null);
  const [paypalBuyerEmail, setPaypalBuyerEmail] = useState('sb-customer@business.example.com');
  const [paypalBuyerPass, setPaypalBuyerPass] = useState('SandboxPass123');

  const handleStartPayPalCheckout = async () => {
    if (!bookingId) {
      await showAlert(language === 'vi' ? 'Không tìm thấy mã đơn đặt phòng để thanh toán.' : 'Booking ID missing.', { type: 'error' });
      return;
    }
    setPaypalRedirecting(true);
    try {
      // Gọi API backend tạo PayPal Order và lấy liên kết PayPal Sandbox Redirect
      const res = await apiClient.post('/payment/paypal/create-order', {
        bookingId,
        frontendUrl: window.location.origin,
      });

      if (res.data.success && res.data.data?.approveUrl) {
        // Chuyển hướng trực tiếp trang hiện tại sang Cổng giao dịch PayPal Sandbox
        window.location.href = res.data.data.approveUrl;
      } else {
        setPaypalRedirecting(false);
        await showAlert(res.data?.message || (language === 'vi' ? 'Không thể tạo liên kết thanh toán PayPal Sandbox.' : 'Cannot generate PayPal payment URL.'), { type: 'error' });
      }
    } catch (err: any) {
      setPaypalRedirecting(false);
      const errMsg = err.response?.data?.message || err.message || (language === 'vi' ? 'Lỗi kết nối PayPal Sandbox.' : 'PayPal connection error.');
      await showAlert(errMsg, { type: 'error' });
    }
  };

  const handlePayPalOnApproveAndCapture = async () => {
    if (!paypalOrderData) return;
    setPaypalStep('CAPTURING');
    try {
      // 3. CAPTURE ORDER (Gọi API backend /payment/paypal/capture-order với orderId)
      const confirmRes = await apiClient.post('/payment/paypal/capture-order', {
        bookingId,
        orderId: paypalOrderData.orderId
      });

      if (confirmRes.data.success) {
        setPaypalStep('SUCCESS');
        setTimeout(() => {
          setPaypalModalOpen(false);
          navigate(`/my-bookings?payment=success&bookingId=${bookingId}&method=paypal`);
        }, 1200);
      } else {
        setPaypalStep('AUTHENTICATE');
        await showAlert(language === 'vi' ? 'Không thể thực hiện Capture giao dịch trên PayPal.' : 'PayPal Capture failed.', { type: 'error' });
      }
    } catch (err: any) {
      setPaypalStep('AUTHENTICATE');
      await showAlert(err.response?.data?.message || 'Lỗi Capture giao dịch PayPal', { type: 'error' });
    }
  };

  const handlePaymentSubmit = async () => {
    // Nếu chọn thanh toán tại khách sạn (Pay at Hotel)
    if (activeOption === 'hotel') {
      setSubmitLoading(true);
      setSubmitMessage(language === 'vi' ? 'Đang xác nhận giữ phòng tại khách sạn...' : 'Confirming pay at hotel reservation...');
      try {
        const res = await apiClient.put(`/bookings/${bookingId}/status`, { status: 'CONFIRMED' });
        if (res.data.success || res.status === 200) {
          setSubmitMessage(language === 'vi' ? 'Xác nhận thành công! Đang xuất phiếu đặt phòng...' : 'Confirmed! Generating voucher...');
          setTimeout(() => {
            navigate(`/my-bookings?payment=success&bookingId=${bookingId}`);
          }, 800);
        } else {
          setSubmitLoading(false);
          await showAlert(language === 'vi' ? 'Xác nhận thất bại. Vui lòng thử lại.' : 'Confirmation failed. Please try again.', { type: 'error' });
        }
      } catch (err: any) {
        console.error(err);
        setSubmitLoading(false);
        await showAlert(err.response?.data?.message || (language === 'vi' ? 'Lỗi xác nhận đơn hàng.' : 'Error confirming booking.'), { type: 'error' });
      }
      return;
    }

    // Nếu chọn ví VNPay → dùng VNPAY gateway
    if (activeOption === 'wallet' && subWallet === 'vnpay') {
      await handleVnPaySubmit();
      return;
    }

    // Nếu chọn ví PayPal Sandbox → mở quy trình PayPal Standard Checkout
    if (activeOption === 'wallet' && subWallet === 'paypal') {
      await handleStartPayPalCheckout();
      return;
    }

    // Các phương thức khác ngoài card → thông báo demo
    if (activeOption !== 'card') {
      await showAlert(
        language === 'vi'
          ? 'Phương thức này chỉ đang demo. Vui lòng chọn Thẻ thanh toán, VNPay hoặc Thanh toán tại khách sạn.'
          : 'This method is demo only. Please use Credit Card, VNPay or Pay at Hotel.',
        { type: 'info', title: 'Thông báo phương thức thanh toán' }
      );
      return;
    }

    if (!validateCardForm()) return;

    setSubmitLoading(true);
    setSubmitMessage(language === 'vi' ? 'Đang khởi tạo kết nối an toàn SSL...' : 'Establishing SSL secure connection...');

    setTimeout(() => {
      setSubmitMessage(language === 'vi' ? 'Đang xác thực thông tin thẻ tín dụng...' : 'Verifying credit card credentials...');

      setTimeout(async () => {
        setSubmitMessage(language === 'vi' ? 'Đang tiến hành khấu trừ tài khoản...' : 'Processing account deduction...');

        try {
          const res = await apiClient.post('/payment/stripe/confirm', { bookingId });
          if (res.data.success) {
            setSubmitMessage(language === 'vi' ? 'Thanh toán thành công! Đang xuất vé điện tử...' : 'Payment successful! Generating ticket...');
            setTimeout(() => {
              navigate(`/my-bookings?payment=success&bookingId=${bookingId}`);
            }, 1000);
          } else {
            setSubmitLoading(false);
            await showAlert(language === 'vi' ? 'Thanh toán thất bại. Vui lòng thử lại.' : 'Payment failed. Please try again.', { type: 'error' });
          }
        } catch (err: any) {
          console.error(err);
          setSubmitLoading(false);
          await showAlert(err.response?.data?.message || (language === 'vi' ? 'Lỗi kết nối cổng thanh toán.' : 'Payment gateway connection error.'), { type: 'error' });
        }
      }, 1500);
    }, 1500);
  };

  // Helper date formats
  const formatVietnameseDate = (dateStr: string) => {
    return formatFullDateVN(dateStr);
  };

  const formatEnglishDate = (dateStr: string) => {
    return formatFullDateVN(dateStr);
  };

  const getNightsCount = () => {
    if (!booking) return 1;
    const inDate = new Date(booking.checkInDate);
    const outDate = new Date(booking.checkOutDate);
    const diffTime = outDate.getTime() - inDate.getTime();
    if (diffTime <= 0) return 1;
    return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  };

  if (loading) {
    return (
      <div className="max-w-[1350px] mx-auto px-4 py-20 flex flex-col items-center justify-center gap-4 text-slate-500 font-semibold">
        <Clock className="w-8 h-8 text-blue-600 animate-spin" />
        <span>{language === 'vi' ? 'Đang tải thông tin thanh toán...' : 'Loading secure checkout details...'}</span>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-[1350px] mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-red-500 flex items-center justify-center gap-1.5"><AlertTriangle className="w-6 h-6 text-red-500" /> {language === 'vi' ? 'Đã xảy ra lỗi' : 'An error occurred'}</h2>
        <p className="text-slate-600 font-bold">{error || (language === 'vi' ? 'Không tìm thấy thông tin đặt phòng.' : 'Booking details not found.')}</p>
        <button
          onClick={() => navigate('/')}
          className="bg-primary text-white px-6 py-2 rounded-lg font-bold text-xs"
        >
          {language === 'vi' ? 'Quay lại trang chủ' : 'Return Home'}
        </button>
      </div>
    );
  }

  const nights = getNightsCount();
  const firstItem = booking.bookingItems[0];
  const hotel = firstItem?.roomType.hotel;
  const roomTypeName = firstItem?.roomType.name;

  return (
    <div className="bg-[#f4f6f8] min-h-screen pb-16 font-sans">
      {/* Dynamic Checkout Header */}
      <header className="bg-white shadow-sm border-b border-slate-100 py-3 mb-4">
        <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
            <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            <span className="text-primary font-black text-2xl tracking-tighter">
              CloudBooking<span className="text-secondary">.AI</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            {language === 'vi' ? 'Thanh toán bảo mật SSL 256-bit' : 'SSL 256-bit Secure Encryption'}
          </span>
        </div>
      </header>

      <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* Layout content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

          {/* Left Column - Payment methods */}
          <div className="lg:col-span-2 space-y-4">
            {((secondsLeft === 0 && (booking.status === 'PENDING' || booking.status === 'PAYMENT_PROCESSING')) || booking.status === 'CANCELLED') ? (
              <div className="bg-white border border-slate-150 p-8 rounded-2xl shadow-sm text-center space-y-5">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10" />
                </div>
                <h3 className="text-lg font-black text-slate-800">
                  {language === 'vi' ? 'Đơn đặt phòng đã hết hạn thanh toán' : 'Payment Time Limit Expired'}
                </h3>
                <p className="text-xs text-slate-500 font-semibold max-w-md mx-auto leading-relaxed">
                  {language === 'vi'
                    ? 'Thời gian giữ phòng nghỉ tối đa 10 phút đã trôi qua. Để đảm bảo phòng trống cho các khách hàng khác, đơn đặt phòng này đã tự động được hủy bỏ. Vui lòng quay lại tìm kiếm và đặt đơn mới.'
                    : 'The 10-minute payment window has expired. To release rooms for other guests, this reservation was automatically cancelled. Please create a new booking.'}
                </p>
                <button
                  onClick={() => navigate('/')}
                  className="bg-[#0194f3] hover:bg-[#007cc7] text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all active:scale-95"
                >
                  {language === 'vi' ? 'Quay lại Trang chủ' : 'Return to Home'}
                </button>
              </div>
            ) : (
              <>


                <div className="border border-slate-150 rounded-2xl shadow-sm overflow-hidden flex flex-col bg-white">

                  {/* Integrated Countdown Alert Banner - only show for temporary PENDING/PAYMENT_PROCESSING bookings */}
                  {(booking.status === 'PENDING' || booking.status === 'PAYMENT_PROCESSING') && (
                    <div className="bg-[#0052cc] text-white py-3.5 px-5 flex flex-wrap justify-between items-center gap-3 shadow-inner">
                      <p className="text-xs sm:text-sm font-bold flex items-center gap-2">
                        <Bell className="w-4 h-4 text-amber-300" />
                        <span>
                          {language === 'vi'
                            ? 'Đừng lo lắng, giá vẫn giữ nguyên. Hoàn tất thanh toán của bạn bằng'
                            : 'Do not worry, price is locked. Complete your payment in'}
                        </span>
                      </p>
                      <div className="bg-[#003d99] px-3.5 py-1.5 rounded-lg text-sm font-black tracking-wider flex items-center gap-1.5 shrink-0">
                        <Clock className="w-4 h-4 animate-pulse text-amber-300" />
                        <span>{formatTime(secondsLeft)}</span>
                      </div>
                    </div>
                  )}

                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                    <h2 className="font-extrabold text-slate-800 text-[24px]">{language === 'vi' ? 'Bạn muốn thanh toán thế nào?' : 'How would you like to pay?'}</h2>
                    <span className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-500" /> {language === 'vi' ? 'Thanh toán an toàn' : 'Secure payment'}
                    </span>
                  </div>

                  {/* Accordion List */}
                  <div className="divide-y divide-[#E2E8F0]">

                    {/* 0. Pay at Hotel Option - Chỉ hiển thị khi phòng cho phép thanh toán tại khách sạn */}
                    {isHotelPaymentAllowed(booking) && (
                      <div className="bg-white">
                        <button
                          type="button"
                          onClick={() => setActiveOption('hotel')}
                          className="w-full px-6 py-4 flex justify-between items-center hover:bg-[#ebf3ff]/40 transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="payment_opt"
                              checked={activeOption === 'hotel'}
                              readOnly
                              className="w-4.5 h-4.5 text-[#0194f3]"
                            />
                            <span className={activeOption === 'hotel' ? "text-[18px] font-extrabold text-slate-900 flex items-center gap-2" : "text-[16px] font-bold text-slate-700 flex items-center gap-2"}>
                              <Hotel className="w-5 h-5 text-blue-600" />
                              <span>{language === 'vi' ? 'Thanh toán khi nhận phòng tại khách sạn' : 'Pay at hotel upon check-in'}</span>
                            </span>
                          </div>
                          <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full uppercase shrink-0">
                            {language === 'vi' ? 'Trả tại khách sạn' : 'Pay at hotel'}
                          </span>
                        </button>
                        {activeOption === 'hotel' && (
                          <div className="px-6 pb-6 pt-3 space-y-3 bg-emerald-50/40 border-t border-emerald-100 text-xs font-semibold text-slate-700">
                            <div className="flex items-start gap-2.5 text-emerald-900 bg-white p-3.5 rounded-xl border border-emerald-200/80 shadow-xs">
                              <ThumbsUp className="w-5 h-5 text-emerald-600 shrink-0" />
                              <p className="leading-relaxed">
                                {language === 'vi'
                                  ? 'Bạn không cần phải thanh toán trực tuyến ngay bây giờ. Phòng của bạn sẽ được xác nhận giữ chỗ ngay lập tức. Bạn chỉ cần xuất trình phiếu đặt phòng và thanh toán tiền mặt/cà thẻ khi nhận phòng tại khách sạn.'
                                  : 'No online payment required now. Your reservation will be confirmed immediately. Present your voucher and pay upon check-in.'}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* 1. Credit Card Option */}
                    <div className="bg-white">
                      <button
                        type="button"
                        onClick={() => setActiveOption('card')}
                        className="w-full px-6 py-4 flex justify-between items-center hover:bg-slate-55/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_opt"
                            checked={activeOption === 'card'}
                            readOnly
                            className="w-4.5 h-4.5 text-[#0194f3]"
                          />
                          <span className={activeOption === 'card' ? "text-[20px] font-extrabold text-slate-800" : "text-[16px] font-bold text-slate-700"}>
                            {language === 'vi' ? 'Thẻ thanh toán' : 'Credit Card'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <img src="/visa.webp" alt="Visa" className="h-[22px] w-auto object-contain" />
                          <img src="/Mastercard.webp" alt="MasterCard" className="h-[22px] w-auto object-contain" />
                          <img src="/jcb.png" alt="JCB" className="h-[22px] w-auto object-contain" />
                        </div>
                      </button>
                      {activeOption === 'card' && (
                        <div className="px-6 pb-6 pt-4 space-y-4 bg-slate-55/10 border-t border-slate-50">

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-500 block">{language === 'vi' ? 'Số thẻ *' : 'Card number *'}</label>
                              <input
                                type="text"
                                value={cardNumber}
                                onChange={handleCardNumberChange}
                                placeholder="0000 0000 0000 0000"
                                className={`w-full bg-white border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-bold ${cardErrors.cardNumber ? 'border-red-400' : 'border-slate-200'
                                  }`}
                              />
                              {cardErrors.cardNumber && <p className="text-[10px] text-red-500 font-bold">{cardErrors.cardNumber}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 block">{language === 'vi' ? 'Ngày hết hạn *' : 'Expiry date *'}</label>
                                <input
                                  type="text"
                                  value={expiryDate}
                                  onChange={handleExpiryChange}
                                  placeholder="MM/YY"
                                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-bold text-center ${cardErrors.expiryDate ? 'border-red-400' : 'border-slate-200'
                                    }`}
                                />
                                {cardErrors.expiryDate && <p className="text-[10px] text-red-500 font-bold">{cardErrors.expiryDate}</p>}
                              </div>

                              <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 block">CVV *</label>
                                <input
                                  type="password"
                                  value={cvv}
                                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').substring(0, 4))}
                                  placeholder="123"
                                  className={`w-full bg-white border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-bold text-center ${cardErrors.cvv ? 'border-red-400' : 'border-slate-200'
                                    }`}
                                />
                                {cardErrors.cvv && <p className="text-[10px] text-red-500 font-bold">{cardErrors.cvv}</p>}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-500 block">{language === 'vi' ? 'Tên trên thẻ *' : 'Card holder name *'}</label>
                            <input
                              type="text"
                              value={cardName}
                              onChange={(e) => setCardName(e.target.value.toUpperCase())}
                              placeholder="NGUYEN VAN A"
                              className={`w-full bg-white border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-primary font-bold uppercase ${cardErrors.cardName ? 'border-red-400' : 'border-slate-200'
                                }`}
                            />
                            {cardErrors.cardName && <p className="text-[10px] text-red-500 font-bold">{cardErrors.cardName}</p>}
                          </div>

                        </div>
                      )}
                    </div>

                    {/* 2. VietQR Option */}
                    <div className="bg-white">
                      <button
                        type="button"
                        onClick={() => setActiveOption('vietqr')}
                        className="w-full px-6 py-4 flex justify-between items-center hover:bg-slate-55/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_opt"
                            checked={activeOption === 'vietqr'}
                            readOnly
                            className="w-4.5 h-4.5 text-[#0194f3]"
                          />
                          <span className={activeOption === 'vietqr' ? "text-[20px] font-extrabold text-slate-800" : "text-[16px] font-bold text-slate-700"}>
                            VietQR
                          </span>
                        </div>
                        <span className="text-[10px] font-bold bg-[#ebf3ff] text-[#0194f3] px-2 py-0.5 rounded uppercase">QR Code</span>
                      </button>
                      {activeOption === 'vietqr' && (
                        <div className="px-6 pb-6 pt-4 text-center space-y-3 bg-slate-50/30 border-t border-slate-50">
                          <p className="text-xs text-slate-500 font-semibold">
                            {language === 'vi'
                              ? 'Mã QR thanh toán chuyển khoản nhanh Napas247 sẽ được tự động hiển thị sau khi khởi tạo.'
                              : 'VietQR payment transfer code will be dynamically generated.'}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* 3. VietinBank Direct Transfer */}
                    <div className="bg-white">
                      <button
                        type="button"
                        onClick={() => setActiveOption('vietinbank')}
                        className="w-full px-6 py-4 flex justify-between items-center hover:bg-slate-55/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_opt"
                            checked={activeOption === 'vietinbank'}
                            readOnly
                            className="w-4.5 h-4.5 text-[#0194f3]"
                          />
                          <span className={activeOption === 'vietinbank' ? "text-[20px] font-extrabold text-slate-800" : "text-[16px] font-bold text-slate-700"}>
                            {language === 'vi' ? 'Chuyển khoản trực tiếp' : 'Direct Bank Transfer'}
                          </span>
                        </div>
                      </button>
                      {activeOption === 'vietinbank' && (
                        <div className="px-6 pb-6 pt-4 space-y-2 bg-slate-50/30 border-t border-slate-50 text-xs font-semibold text-slate-650">
                          <p>{language === 'vi' ? 'Vui lòng thực hiện chuyển khoản đến tài khoản bên dưới:' : 'Please transfer to the following bank account:'}</p>
                          <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-1.5">
                            <p className="flex items-center gap-1.5"><Building className="w-4 h-4 text-blue-600 shrink-0" /> {language === 'vi' ? 'Ngân hàng: VietinBank' : 'Bank: VietinBank'}</p>
                            <p className="flex items-center gap-1.5"><CreditCard className="w-4 h-4 text-emerald-600 shrink-0" /> {language === 'vi' ? 'Số tài khoản: 102873492834' : 'Account No: 102873492834'}</p>
                            <p className="flex items-center gap-1.5"><User className="w-4 h-4 text-indigo-600 shrink-0" /> {language === 'vi' ? 'Tên thụ hưởng: CLOUDBOOKING JOINT STOCK' : 'Beneficiary: CLOUDBOOKING JOINT STOCK'}</p>
                            <p className="flex items-center gap-1.5"><FileText className="w-4 h-4 text-amber-600 shrink-0" /> {language === 'vi' ? `Nội dung chuyển khoản: CBOOK ${bookingId}` : `Reference code: CBOOK ${bookingId}`}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 4. Digital Wallet */}
                    <div className="bg-white">
                      <button
                        type="button"
                        onClick={() => setActiveOption('wallet')}
                        className="w-full px-6 py-4 flex justify-between items-center hover:bg-slate-55/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_opt"
                            checked={activeOption === 'wallet'}
                            readOnly
                            className="w-4.5 h-4.5 text-[#0194f3]"
                          />
                          <span className={activeOption === 'wallet' ? "text-[20px] font-extrabold text-slate-800" : "text-[16px] font-bold text-slate-700"}>
                            {language === 'vi' ? 'Ví điện tử' : 'E-Wallet'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <img src="/momo.jpg" alt="MoMo" className="h-[26px] w-[26px] rounded-lg object-contain border border-slate-100" />
                          <img src="/zalopay.jpg" alt="ZaloPay" className="h-[26px] w-[26px] rounded-lg object-contain border border-slate-100" />
                          <img src="/shopeepay.jpg" alt="ShopeePay" className="h-[26px] w-[26px] rounded-lg object-contain border border-slate-100" />
                          <img src="/vnpay.jpg" alt="VNPAY" className="h-[26px] w-[26px] rounded-lg object-contain border border-slate-100" />
                          <img src="/paypal.jpg" alt="PayPal" className="h-[26px] w-[26px] rounded-lg object-contain border border-slate-100" />
                        </div>
                      </button>
                      {activeOption === 'wallet' && (
                        <div className="px-6 pb-6 pt-4 bg-slate-50/30 border-t border-slate-50 space-y-4">

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {/* MoMo */}
                            <label
                              onClick={() => setSubWallet('momo')}
                              className={`flex justify-between items-center bg-white border rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-sm ${subWallet === 'momo' ? 'border-[#0194f3] ring-1 ring-[#0194f3]' : 'border-slate-200'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="sub_wallet"
                                  value="momo"
                                  checked={subWallet === 'momo'}
                                  readOnly
                                  className="w-4 h-4 text-[#0194f3]"
                                />
                                <span className="text-xs font-black text-slate-800">MoMo</span>
                              </div>
                              <img src="/momo.jpg" alt="MoMo" className="w-10 h-10 rounded-xl object-contain border border-pink-100" />
                            </label>

                            {/* ZaloPay */}
                            <label
                              onClick={() => setSubWallet('zalopay')}
                              className={`flex justify-between items-center bg-white border rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-sm ${subWallet === 'zalopay' ? 'border-[#0194f3] ring-1 ring-[#0194f3]' : 'border-slate-200'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="sub_wallet"
                                  value="zalopay"
                                  checked={subWallet === 'zalopay'}
                                  readOnly
                                  className="w-4 h-4 text-[#0194f3]"
                                />
                                <span className="text-xs font-black text-slate-800">ZaloPay</span>
                              </div>
                              <img src="/zalopay.jpg" alt="ZaloPay" className="w-10 h-10 rounded-xl object-contain border border-blue-100" />
                            </label>

                            {/* ShopeePay */}
                            <label
                              onClick={() => setSubWallet('shopeepay')}
                              className={`flex justify-between items-center bg-white border rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-sm ${subWallet === 'shopeepay' ? 'border-[#0194f3] ring-1 ring-[#0194f3]' : 'border-slate-200'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="sub_wallet"
                                  value="shopeepay"
                                  checked={subWallet === 'shopeepay'}
                                  readOnly
                                  className="w-4 h-4 text-[#0194f3]"
                                />
                                <span className="text-xs font-black text-slate-800">ShopeePay</span>
                              </div>
                              <img src="/shopeepay.jpg" alt="ShopeePay" className="w-10 h-10 rounded-xl object-contain border border-orange-100" />
                            </label>

                            {/* VNPay */}
                            <label
                              onClick={() => setSubWallet('vnpay')}
                              className={`flex justify-between items-center bg-white border rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-sm ${subWallet === 'vnpay' ? 'border-[#0194f3] ring-1 ring-[#0194f3]' : 'border-slate-200'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="sub_wallet"
                                  value="vnpay"
                                  checked={subWallet === 'vnpay'}
                                  readOnly
                                  className="w-4 h-4 text-[#0194f3]"
                                />
                                <span className="text-xs font-black text-slate-800">Cổng VNPAY</span>
                              </div>
                              <img src="/vnpay.jpg" alt="VNPAY" className="w-10 h-10 rounded-xl object-contain border border-red-100" />
                            </label>

                            {/* PayPal Sandbox */}
                            <label
                              onClick={() => setSubWallet('paypal')}
                              className={`flex justify-between items-center bg-white border rounded-xl p-3.5 cursor-pointer transition-all hover:shadow-sm ${subWallet === 'paypal' ? 'border-[#003087] ring-1 ring-[#003087] bg-blue-50/20' : 'border-slate-200'
                                }`}
                            >
                              <div className="flex items-center gap-3">
                                <input
                                  type="radio"
                                  name="sub_wallet"
                                  value="paypal"
                                  checked={subWallet === 'paypal'}
                                  readOnly
                                  className="w-4 h-4 text-[#003087]"
                                />
                                <div className="flex flex-col">
                                  <span className="text-xs font-black text-slate-800 flex items-center gap-2">
                                    Ví PayPal Sandbox (USD / Quốc tế)
                                  </span>
                                </div>
                              </div>
                              <img src="/paypal.jpg" alt="PayPal" className="w-10 h-10 rounded-xl object-contain border border-red-100" />
                            </label>
                          </div>

                          {/* PayPal Sandbox Info Box */}
                          {booking && subWallet === 'paypal' && (
                            <div className="mt-3 bg-blue-50/70 border border-blue-200 p-4 rounded-xl space-y-2 text-xs text-slate-700 animate-in fade-in duration-200">
                              <div className="flex justify-between items-center font-extrabold text-slate-900 border-b border-blue-200/60 pb-2">
                                <span className="flex items-center gap-1.5 text-[#003087]">
                                  💳 Thông tin quy đổi PayPal Sandbox
                                </span>
                                <span className="text-[#003087] font-black text-sm">
                                  ${(booking.finalPrice / 25000).toFixed(2)} USD
                                </span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                                <p><strong>Tỷ giá quy đổi:</strong> 1 USD = 25,000 VND</p>
                                <p><strong>Tổng thanh toán:</strong> {formatPrice(booking.finalPrice, currency)}</p>
                              </div>
                            </div>
                          )}

                        </div>
                      )}
                    </div>

                    {/* 5. Mobile Banking */}
                    <div className="bg-white">
                      <button
                        type="button"
                        onClick={() => setActiveOption('mobile')}
                        className="w-full px-6 py-4 flex justify-between items-center hover:bg-slate-55/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_opt"
                            checked={activeOption === 'mobile'}
                            readOnly
                            className="w-4.5 h-4.5 text-[#0194f3]"
                          />
                          <span className={activeOption === 'mobile' ? "text-[20px] font-extrabold text-slate-800" : "text-[16px] font-bold text-slate-700"}>
                            {language === 'vi' ? 'Ngân hàng di động' : 'Mobile Banking'}
                          </span>
                        </div>
                      </button>
                    </div>

                    {/* 6. Retail Store */}
                    <div className="bg-white">
                      <button
                        type="button"
                        onClick={() => setActiveOption('store')}
                        className="w-full px-6 py-4 flex justify-between items-center hover:bg-slate-55/20 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="radio"
                            name="payment_opt"
                            checked={activeOption === 'store'}
                            readOnly
                            className="w-4.5 h-4.5 text-[#0194f3]"
                          />
                          <span className={activeOption === 'store' ? "text-[20px] font-extrabold text-slate-800" : "text-[16px] font-bold text-slate-700"}>
                            {language === 'vi' ? 'Tại cửa hàng' : 'Convenience Store Pay'}
                          </span>
                        </div>
                        <span className="text-[9px] text-slate-400 font-bold">Circle K / FamilyMart</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Coupon & Loyalty Points Card */}
                {user && booking && (
                  <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4 mb-4 mt-4">
                    <div className="flex items-start gap-2.5 border-b border-slate-50 pb-3">
                      <Gift className="w-6 h-6 text-pink-500 shrink-0" />
                      <div>
                        <h3 className="font-extrabold text-slate-800 text-base">
                          {language === 'vi' ? 'Khuyến mãi & Điểm tích lũy' : 'Coupons & Loyalty Points'}
                        </h3>
                        <p className="text-xs text-slate-400 font-medium">
                          {language === 'vi'
                            ? 'Áp dụng mã giảm giá hoặc đổi điểm Loyalty để giảm trực tiếp vào hóa đơn thanh toán.'
                            : 'Apply a promo code or redeem loyalty points to save on your bill.'}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Coupon Input Column */}
                      <div className="space-y-3">
                        <label className="text-xs font-bold text-slate-655 block">
                          {language === 'vi' ? 'Mã giảm giá (Coupon):' : 'Promo Code (Coupon):'}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                            disabled={applyingDiscount}
                            placeholder={language === 'vi' ? 'Ví dụ: DUNGTHU10' : 'E.g. SUMMER20'}
                            className="flex-1 bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold focus:outline-none focus:border-[#0194f3] uppercase text-slate-800 disabled:bg-slate-50"
                          />
                          <button
                            type="button"
                            onClick={handleApplyDiscount}
                            disabled={applyingDiscount}
                            className="bg-[#0194f3] hover:bg-[#007cc7] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all disabled:opacity-50"
                          >
                            {applyingDiscount ? '...' : (language === 'vi' ? 'Áp dụng' : 'Apply')}
                          </button>
                        </div>
                        {couponSuccessMessage && (
                          <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><Check className="w-3.5 h-3.5 text-emerald-600" /> {couponSuccessMessage}</p>
                        )}
                        {couponErrorMessage && (
                          <p className="text-[10px] text-red-500 font-bold flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5 text-red-500" /> {couponErrorMessage}</p>
                        )}

                        {/* Available coupons select list */}
                        {availableCoupons.length > 0 && (
                          <div className="pt-2 space-y-1.5 border-t border-slate-100">
                            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                              {language === 'vi' ? 'Gợi ý mã giảm giá cho bạn:' : 'Suggested promo codes:'}
                            </p>
                            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                              {availableCoupons.map((c: any) => {
                                const discountText = c.discountType === 'PERCENTAGE'
                                  ? `Giảm ${c.discountValue}%`
                                  : `Giảm ${formatPrice(c.discountValue, currency)}`;
                                return (
                                  <div
                                    key={c.id}
                                    onClick={() => {
                                      setCouponInput(c.code);
                                    }}
                                    className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-dashed border-red-300 hover:border-red-500 cursor-pointer transition-colors group"
                                  >
                                    <div>
                                      <span className="font-extrabold text-xs text-red-600 mr-2">{c.code}</span>
                                      <span className="text-[11px] font-bold text-slate-700">{discountText}</span>
                                    </div>
                                    <span className="text-[10px] font-extrabold text-[#0194f3] group-hover:underline">
                                      {language === 'vi' ? 'Chọn mã' : 'Select'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Loyalty Points Column */}
                      <div className="space-y-3.5 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-xl">
                          <span>{language === 'vi' ? 'Điểm hiện có:' : 'Your points:'}</span>
                          <div className="text-right">
                            <span className="text-blue-600 font-black block">
                              {(availablePoints + (booking.pointsUsed || 0)).toLocaleString('vi-VN')} {language === 'vi' ? 'điểm' : 'pts'}
                            </span>
                            {booking.pointsUsed > 0 && (
                              <span className="text-[10px] text-slate-400 font-medium block">
                                ({language === 'vi' ? `Đang dùng ${booking.pointsUsed} điểm cho đơn này` : `Using ${booking.pointsUsed} pts for this booking`})
                              </span>
                            )}
                          </div>
                        </div>

                        {(availablePoints > 0 || booking.pointsUsed > 0) ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="usePointsToggle"
                                checked={usePointsToggle}
                                disabled={applyingDiscount}
                                onChange={(e) => {
                                  setUsePointsToggle(e.target.checked);
                                  if (!e.target.checked && booking.pointsUsed > 0) {
                                    handlePointsUpdate('0');
                                  }
                                }}
                                className="w-4 h-4 text-[#0194f3] border-slate-300 rounded focus:ring-[#0194f3]"
                              />
                              <label htmlFor="usePointsToggle" className="text-xs font-extrabold text-slate-700 cursor-pointer">
                                {language === 'vi' ? 'Dùng điểm tích lũy' : 'Redeem loyalty points'}
                              </label>
                            </div>

                            {usePointsToggle && (
                              <div className="space-y-1.5 pl-6 animate-in slide-in-from-top-2 duration-150">
                                <div className="flex gap-2">
                                  <input
                                    type="number"
                                    min="0"
                                    max={availablePoints + (booking.pointsUsed || 0)}
                                    value={pointsInput}
                                    disabled={applyingDiscount}
                                    onChange={(e) => setPointsInput(e.target.value)}
                                    className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-black text-slate-800 focus:outline-none focus:border-[#0194f3]"
                                  />
                                  <button
                                    type="button"
                                    disabled={applyingDiscount}
                                    onClick={() => {
                                      const maxAllowedDiscount = Number(booking.totalPrice) * 0.3;
                                      const maxAllowedPoints = Math.floor(maxAllowedDiscount / 200);
                                      const maxPoints = Math.min(availablePoints + (booking.pointsUsed || 0), maxAllowedPoints);
                                      setPointsInput(maxPoints.toString());
                                    }}
                                    className="bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-extrabold text-[10px] px-2.5 py-1 rounded-lg transition-colors"
                                  >
                                    {language === 'vi' ? 'Tối đa' : 'Max'}
                                  </button>
                                  <button
                                    type="button"
                                    disabled={applyingDiscount}
                                    onClick={() => handlePointsUpdate(pointsInput)}
                                    className="bg-[#0194f3] hover:bg-[#007cc7] text-white font-extrabold text-[10px] px-3 py-1 rounded-lg transition-colors shadow-sm"
                                  >
                                    {language === 'vi' ? 'Áp dụng' : 'Apply'}
                                  </button>
                                  {booking.pointsUsed > 0 && (
                                    <button
                                      type="button"
                                      disabled={applyingDiscount}
                                      onClick={() => handlePointsUpdate('0')}
                                      className="bg-red-50 hover:bg-red-100 text-red-600 font-extrabold text-[10px] px-3 py-1 rounded-lg transition-colors border border-red-150"
                                    >
                                      {language === 'vi' ? 'Hủy' : 'Cancel'}
                                    </button>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-medium">
                                  * {language === 'vi'
                                    ? `Tối đa 30% giá phòng: -${formatPrice(Number(booking.totalPrice) * 0.3, currency)} (${Math.floor((Number(booking.totalPrice) * 0.3) / 200)} điểm)`
                                    : `Max 30% discount: -${formatPrice(Number(booking.totalPrice) * 0.3, currency)} (${Math.floor((Number(booking.totalPrice) * 0.3) / 200)} pts)`}
                                </p>
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-[11px] text-slate-400 font-semibold italic">
                            {language === 'vi' ? 'Bạn chưa tích lũy được điểm nào.' : 'No loyalty points available.'}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom Actions Card - Fixed at bottom of left column */}
                <div className="bg-white border border-slate-150 p-5 rounded-2xl shadow-sm space-y-3 shrink-0">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <div className="space-y-0.5">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Tổng tiền phải thanh toán' : 'Total Payment Amount'}</span>
                      {Number(booking.discountAmount) > 0 && (
                        <span className="text-[10px] font-extrabold text-green-600 block">
                          {language === 'vi'
                            ? `Khấu trừ mã giảm giá: -${formatPrice(Number(booking.discountAmount), currency)}`
                            : `Coupon discount: -${formatPrice(Number(booking.discountAmount), currency)}`}
                        </span>
                      )}
                      {Number(booking.pointsDiscount) > 0 && (
                        <span className="text-[10px] font-extrabold text-green-600 block">
                          {language === 'vi'
                            ? `Khấu trừ ${booking.pointsUsed} điểm Loyalty: -${formatPrice(Number(booking.pointsDiscount), currency)}`
                            : `Loyalty points discount (${booking.pointsUsed} pts): -${formatPrice(Number(booking.pointsDiscount), currency)}`}
                        </span>
                      )}
                      <div className="text-slate-800 font-black text-xl flex items-center gap-1.5 mt-0.5">
                        <span>{formatPrice(booking.finalPrice, currency)}</span>
                        <ChevronDown className="w-4 h-4 text-slate-400 cursor-pointer" />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={submitLoading || vnpayRedirecting || paypalRedirecting}
                      onClick={handlePaymentSubmit}
                      className={`text-white font-extrabold text-sm px-8 py-3.5 rounded-xl shadow-lg transition-all hover:scale-[1.01] active:scale-95 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed ${activeOption === 'hotel'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/10'
                        : activeOption === 'wallet' && subWallet === 'vnpay'
                          ? 'bg-[#005BAA] hover:bg-[#004a8c] shadow-blue-500/10'
                          : activeOption === 'wallet' && subWallet === 'paypal'
                            ? 'bg-[#003087] hover:bg-[#002568] shadow-blue-800/10'
                            : 'bg-[#ff5e1f] hover:bg-[#e04f16] shadow-orange-500/10'
                        }`}
                    >
                      {vnpayRedirecting ? (
                        <>
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          <span>{language === 'vi' ? 'Đang chuyển sang VNPay...' : 'Redirecting to VNPay...'}</span>
                        </>
                      ) : paypalRedirecting ? (
                        <>
                          <span className="animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                          <span>{language === 'vi' ? 'Đang xử lý qua PayPal Sandbox...' : 'Processing PayPal Sandbox...'}</span>
                        </>
                      ) : activeOption === 'hotel' ? (
                        <>
                          <ShieldCheck className="w-4.5 h-4.5 text-white" />
                          <span>{language === 'vi' ? 'Xác nhận & Thanh toán tại khách sạn' : 'Confirm & Pay at Hotel'}</span>
                        </>
                      ) : activeOption === 'wallet' && subWallet === 'vnpay' ? (
                        <>
                          <img src="/vnpay.jpg" alt="VNPAY" className="w-5 h-5 rounded object-contain" />
                          <span>{language === 'vi' ? 'Thanh toán qua VNPay' : 'Pay with VNPay'}</span>
                        </>
                      ) : activeOption === 'wallet' && subWallet === 'paypal' ? (
                        <>
                          <span className="font-black italic text-white text-xs px-1 bg-white/20 rounded">PayPal</span>
                          <span>{language === 'vi' ? `Thanh toán qua PayPal Sandbox ($${(booking.finalPrice / 25000).toFixed(2)} USD)` : `Pay with PayPal Sandbox ($${(booking.finalPrice / 25000).toFixed(2)} USD)`}</span>
                        </>
                      ) : activeOption === 'card' ? (
                        <>
                          <Lock className="w-4 h-4 text-white" />
                          <span>{language === 'vi' ? 'Thanh toán Thẻ thanh toán' : 'Pay with Credit Card'}</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-4 h-4 text-white" />
                          <span>{language === 'vi' ? 'Tiếp tục thanh toán' : 'Continue Payment'}</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
                    {language === 'vi'
                      ? 'Bằng cách tiếp tục thanh toán, bạn đã đồng ý với các Điều khoản & Điều kiện và Chính sách quyền riêng tư của CloudBooking.'
                      : 'By continuing to pay, you agree to our Terms & Conditions and Privacy Policy.'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Right Column - Hotel Summary - Sticky on scroll */}
          <div className="space-y-6 sticky top-6 self-start">

            {/* Summary card */}
            <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden flex flex-col">

              {/* Premium Traveloka-style Header with background SVG and Icon */}
              <div className="relative overflow-hidden px-4 py-2 flex items-center shrink-0 border-b border-slate-100 h-[62px]">
                {/* Background image covering header */}
                <img
                  loading="eager"
                  src="https://d1785e74lyxkqq.cloudfront.net/_next/static/v4.6.0/f/fea6c9a03749dbee07609a72dfd96ad0.svg"
                  alt="header-bg"
                  className="absolute inset-0 w-full h-full object-cover z-0"
                />

                {/* Content container */}
                <div className="relative z-10 flex items-center gap-6 w-full">
                  <img
                    src="https://d1785e74lyxkqq.cloudfront.net/_next/static/v4.6.0/6/6cf973b0aa7b1d2d5df2b1786233056c.svg"
                    width="24"
                    height="24"
                    alt="hotel-icon"
                    className="shrink-0 mr-3"
                  />
                  <div className="flex flex-col justify-center">
                    <h2 className="font-bold text-[20px] leading-tight" style={{ color: 'rgb(3, 18, 26)' }}>
                      {language === 'vi' ? 'Tóm tắt khách sạn' : 'Hotel Summary'}
                    </h2>
                    <div className="font-medium text-sm leading-tight mt-0.5" style={{ color: 'rgb(104, 113, 118)' }}>
                      {language === 'vi'
                        ? `Mã đặt chỗ  ${booking ? booking.id.substring(0, 8).toUpperCase() : ''}`
                        : `Booking ID  ${booking ? booking.id.substring(0, 8).toUpperCase() : ''}`}
                    </div>
                  </div>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 text-sm font-semibold text-slate-650 flex-1">

                {/* Hotel Name */}
                <div className="space-y-1">
                  <h4 className="font-black text-base text-slate-800 leading-tight">{hotel?.name}</h4>
                </div>

                {/* Check-in / out timeline connector grid */}
                <div className="flex items-stretch justify-between gap-2.5">
                  {/* Check-in box */}
                  <div className="border border-slate-100 rounded-xl p-3 flex-1 flex flex-col items-center justify-center text-center bg-slate-50/50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{language === 'vi' ? 'Nhận phòng' : 'Check-in'}</span>
                    <span className="text-xs font-black text-slate-850 mt-1 block">
                      {language === 'vi' ? formatVietnameseDate(booking.checkInDate) : formatEnglishDate(booking.checkInDate)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold mt-1">Từ {hotel?.checkInTime || '14:00'}</span>
                  </div>

                  {/* Days/Nights connector line */}
                  <div className="flex flex-col items-center justify-center px-1 shrink-0">
                    <span className="text-[10px] text-slate-400 font-black mb-1">{nights} {language === 'vi' ? 'đêm' : 'nights'}</span>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                      <div className="w-6 h-[1px] bg-slate-200"></div>
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-200"></div>
                    </div>
                  </div>

                  {/* Check-out box */}
                  <div className="border border-slate-100 rounded-xl p-3 flex-1 flex flex-col items-center justify-center text-center bg-slate-50/50">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">{language === 'vi' ? 'Trả phòng' : 'Check-out'}</span>
                    <span className="text-xs font-black text-slate-850 mt-1 block">
                      {language === 'vi' ? formatVietnameseDate(booking.checkOutDate) : formatEnglishDate(booking.checkOutDate)}
                    </span>
                    <span className="text-[10px] text-slate-400 font-bold mt-1">Trước {hotel?.checkOutTime || '12:00'}</span>
                  </div>
                </div>

                {/* Room type title */}
                <div className="space-y-2 pt-1">
                  <p className="font-extrabold text-slate-800 text-sm">({firstItem?.quantity}x) {roomTypeName}</p>

                  {/* Rate Plan & Policy Snapshots */}
                  {(firstItem?.cancellationPolicySnapshot || firstItem?.paymentPolicySnapshot) && (
                    <div className="bg-blue-50/60 border border-blue-100 p-2.5 rounded-xl space-y-1">
                      {firstItem.cancellationPolicySnapshot && (
                        <p className="text-[11px] font-bold text-emerald-700 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {firstItem.cancellationPolicySnapshot}</p>
                      )}
                      {firstItem.paymentPolicySnapshot && (
                        <p className="text-[11px] font-bold text-blue-700 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5 text-blue-600 shrink-0" /> {firstItem.paymentPolicySnapshot}</p>
                      )}
                    </div>
                  )}

                  {/* Premium Lucide icons specifications */}
                  <div className="space-y-2.5 text-xs text-slate-500 font-bold pt-0.5 pl-0.5">
                    <p className="flex items-center gap-2.5">
                      <Users className="w-4.5 h-4.5 text-slate-400" />
                      <span>2 {language === 'vi' ? 'khách' : 'guests'}</span>
                    </p>
                    <p className="flex items-center gap-2.5">
                      <Bed className="w-4.5 h-4.5 text-slate-400" />
                      <span>{firstItem?.roomType?.bedCount} {firstItem?.roomType?.bedType || (language === 'vi' ? 'giường đôi' : 'double bed')}</span>
                    </p>
                    {firstItem?.roomType?.includeBreakfast && (
                      <p className="flex items-center gap-2.5">
                        <Utensils className="w-4.5 h-4.5 text-emerald-600" />
                        <span className="text-emerald-600 font-bold">{language === 'vi' ? 'Bao gồm bữa sáng' : 'Breakfast included'}</span>
                      </p>
                    )}
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Requests & Guest names */}
                <div className="space-y-3">
                  <div>
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Yêu cầu đặc biệt (nếu có)' : 'Special requests (if any)'}</span>
                    <p className="text-slate-850 text-xs font-bold mt-1">{booking.notes || '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Tên khách' : 'Guest Name'}</span>
                    <p className="text-slate-850 text-xs font-black mt-1">{booking.guestName}</p>
                  </div>

                  {/* Policies outline items */}
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                      <XCircle className="w-4.5 h-4.5 text-slate-400" />
                      <span>{language === 'vi' ? 'Không hoàn tiền' : 'Non-refundable'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500 text-xs font-bold">
                      <Calendar className="w-4.5 h-4.5 text-slate-400" />
                      <span>{language === 'vi' ? 'Không đổi lịch' : 'Non-reschedulable'}</span>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Contact person details with circular badge outline */}
                <div className="space-y-3">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Chi tiết người liên lạc' : 'Contact Person Details'}</span>

                  <div className="flex items-center gap-3 bg-slate-50/50 p-2.5 rounded-xl border border-slate-100/50">
                    <div className="w-9 h-9 rounded-full bg-slate-200/60 flex items-center justify-center text-slate-500 shrink-0">
                      <User className="w-5 h-5 text-slate-450" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-extrabold text-slate-800 text-xs leading-snug">{booking.guestName}</p>
                      <p className="text-xs text-slate-450 font-semibold leading-normal mt-0.5">{booking.guestPhone}</p>
                      <p className="text-xs text-slate-450 font-semibold leading-normal truncate">{booking.guestEmail}</p>
                    </div>
                  </div>
                </div>

              </div>

              {/* Green Choice Alert Box at the very bottom, full width without borders */}
              <div className="bg-[#8ff38f]/60 text-[#0d3c0d] py-4 px-6 text-center font-extrabold text-xs shrink-0 border-t border-emerald-100/30">
                {language === 'vi' ? 'Sự lựa chọn tuyệt vời cho kỳ nghỉ của bạn!' : 'Excellent choice for your trip!'}
              </div>

            </div>
          </div>

        </div>
      </div>

      {/* Full-screen Loading Overlay for processing payment */}
      {submitLoading && (
        <div className="fixed inset-0 bg-slate-900/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex justify-center">
              <span className="animate-spin text-4xl">🔒</span>
            </div>
            <div className="space-y-2">
              <h3 className="font-black text-slate-800 text-base">{language === 'vi' ? 'Thanh toán đang được bảo mật xử lý' : 'Secure payment processing'}</h3>
              <p className="text-xs text-slate-500 font-bold leading-normal">{submitMessage}</p>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
              <div className="h-full bg-primary rounded-full absolute inset-y-0 left-0 animate-progress w-2/3"></div>
            </div>
          </div>
        </div>
      )}
      {/* PAYPAL STANDARD CHECKOUT MODAL WINDOW (Official 4-Step Integration Flow) */}
      {paypalModalOpen && paypalOrderData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Top Bar - PayPal Branding */}
            <div className="bg-[#003087] text-white px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="font-black italic text-lg tracking-tight">PayPal</span>
                <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                  Sandbox Checkout
                </span>
              </div>
              <button
                type="button"
                onClick={() => { setPaypalModalOpen(false); setPaypalRedirecting(false); }}
                className="text-white/80 hover:text-white font-bold text-lg p-1 rounded-lg transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Steps Flow Header */}
            <div className="bg-slate-50 border-b border-slate-200/80 px-6 py-3 flex justify-between items-center text-[10px] font-bold text-slate-600">
              <span className={`px-2 py-0.5 rounded-full ${paypalStep === 'CREATE' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                1. Create Order
              </span>
              <span>➔</span>
              <span className={`px-2 py-0.5 rounded-full ${paypalStep === 'AUTHENTICATE' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                2. Authenticate
              </span>
              <span>➔</span>
              <span className={`px-2 py-0.5 rounded-full ${paypalStep === 'CAPTURING' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>
                3. Capture
              </span>
              <span>➔</span>
              <span className={`px-2 py-0.5 rounded-full ${paypalStep === 'SUCCESS' ? 'bg-emerald-600 text-white' : 'bg-slate-200'}`}>
                4. Success
              </span>
            </div>

            {/* Modal Content Body */}
            <div className="p-6 space-y-4 text-slate-800">
              {/* Order Info Summary */}
              <div className="bg-blue-50/70 p-3.5 rounded-2xl border border-blue-100 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="text-slate-500">Mã PayPal Order ID:</span>
                  <span className="font-mono text-[#003087] font-extrabold">{paypalOrderData.orderId}</span>
                </div>
                <div className="flex justify-between items-center text-sm font-black pt-1 border-t border-blue-200/50">
                  <span className="text-slate-700">Tổng thanh toán USD:</span>
                  <span className="text-[#003087] font-black text-base">${paypalOrderData.amountUsd.toFixed(2)} USD</span>
                </div>
              </div>

              {paypalStep === 'CREATE' && (
                <div className="py-8 text-center space-y-3">
                  <div className="animate-spin inline-block w-8 h-8 border-3 border-[#003087] border-t-transparent rounded-full" />
                  <p className="text-xs font-bold text-slate-600">Đang khởi tạo Order trên hệ thống PayPal REST API...</p>
                </div>
              )}

              {paypalStep === 'AUTHENTICATE' && (
                <div className="space-y-3 pt-1">
                  <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-[11px] font-semibold text-amber-900">
                    🔒 <strong>PayPal Sandbox Login:</strong> Đăng nhập tài khoản Buyer thử nghiệm bên dưới để phê duyệt giao dịch (OnApprove).
                  </div>

                  <div className="space-y-2 text-xs font-semibold">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Email người mua (Buyer Email)</label>
                      <input
                        type="text"
                        value={paypalBuyerEmail}
                        onChange={(e) => setPaypalBuyerEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 outline-none font-bold text-slate-800 focus:border-[#003087]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Mật khẩu Sandbox (Password)</label>
                      <input
                        type="password"
                        value={paypalBuyerPass}
                        onChange={(e) => setPaypalBuyerPass(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 outline-none font-bold text-slate-800 focus:border-[#003087]"
                      />
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handlePayPalOnApproveAndCapture}
                    className="w-full bg-[#FFC439] hover:bg-[#F2B827] text-[#003087] font-black text-sm py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2 mt-4 active:scale-98 cursor-pointer"
                  >
                    <span className="italic font-black text-base">PayPal</span>
                    <span>Phê duyệt & Capture (${paypalOrderData.amountUsd.toFixed(2)} USD)</span>
                  </button>
                </div>
              )}

              {paypalStep === 'CAPTURING' && (
                <div className="py-8 text-center space-y-3">
                  <div className="animate-spin inline-block w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full" />
                  <p className="text-xs font-black text-emerald-700">Đang thực hiện Capture Transaction trên PayPal API Sandbox...</p>
                </div>
              )}

              {paypalStep === 'SUCCESS' && (
                <div className="py-6 text-center space-y-3 animate-in zoom-in-95 duration-200">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto text-2xl font-black">
                    ✓
                  </div>
                  <h4 className="font-extrabold text-base text-slate-900">Giao Dịch PayPal Thành Công!</h4>
                  <p className="text-xs text-slate-500 font-semibold">Đang tạo vé điện tử & gửi mã QR Code về email khách hàng...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payment;
