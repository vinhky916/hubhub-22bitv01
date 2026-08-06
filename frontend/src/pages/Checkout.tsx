import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import apiClient from '../core/api/client';
import { formatFullDateVN } from '../utils/date';
import { formatPrice } from '../utils/price';
import { 
  CreditCard, 
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Users,
  Bed,
  Wifi,
  Utensils,
  ThumbsUp,
  Gift,
  AlertCircle,
  Mail,
  User,
  Check,
  FileText,
  Clock,
  AlertTriangle,
  X
} from 'lucide-react';

const StarIcon = ({ size = 16 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 12 12"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="shrink-0"
  >
    <path
      fill="#FFDC00"
      d="M3.48181495,11.5430154 C3.01970697,11.7914814 2.44367293,11.6182904 2.19520692,11.1561824 C2.09540205,10.9705609 2.06015424,10.7570215 2.09501099,10.5491721 L2.58088786,7.65190901 L0.521517564,5.5988966 C0.149946355,5.22847254 0.149016407,4.62696653 0.519440465,4.25539532 C0.663624686,4.11076458 0.850578093,4.01644739 1.05258287,3.98642726 L3.88066099,3.56614383 L5.14441015,0.947312068 C5.37243489,0.474782844 5.94034608,0.276572791 6.4128753,0.504597525 C6.60623248,0.597904384 6.76228299,0.753954894 6.85558985,0.947312068 L8.11933901,3.56614383 L10.9474171,3.98642726 C11.4663881,4.06355205 11.8245753,4.54678317 11.7474505,5.06575419 C11.7174304,5.26775897 11.6231132,5.45471238 11.4784824,5.5988966 L9.41911214,7.65190901 L9.90498901,10.5491721 C9.99176552,11.0666168 9.64264,11.5564348 9.12519533,11.6432113 C8.91734599,11.6780681 8.70380652,11.6428203 8.51818505,11.5430154 L6,10.1890388 L3.48181495,11.5430154 Z"
    />
  </svg>
);

interface BookingPreview {
  hotelId: string;
  hotelName: string;
  roomTypeId: string;
  ratePlanId?: string | null;
  checkInDate: string;
  checkOutDate: string;
  quantity?: number;
  numGuests?: number;
}

export const Checkout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useSelector((state: RootState) => state.auth);

  const preview = location.state as BookingPreview;

  const [guestName, setGuestName] = useState(user?.fullName || '');
  const [guestEmail, setGuestEmail] = useState(user?.email || '');
  const [guestPhone, setGuestPhone] = useState(user?.phoneNumber || '');
  const [notes, setNotes] = useState('');

  const [basePrice, setBasePrice] = useState(0);
  const [discount] = useState(0);
  const [finalPrice, setFinalPrice] = useState(0);
  
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');

  // Voucher / Coupon state (transferred to Payment page)
  const [appliedCoupon] = useState<any | null>(null);

  // Traveloka specific states
  const [hotelDetail, setHotelDetail] = useState<any>(null);
  const [bookForSelf, setBookForSelf] = useState(true);
  const [passengerName, setPassengerName] = useState('');
  const [specialRequests, setSpecialRequests] = useState<string[]>([]);
  const [insuranceSelected, setInsuranceSelected] = useState(false);
  const [showPriceDetails, setShowPriceDetails] = useState(true);
  const [roomTypeName, setRoomTypeName] = useState('');
  const [policyModalOpen, setPolicyModalOpen] = useState(false);

  // Validation touch states for UI warning labels
  const [touchedName, setTouchedName] = useState(false);
  const [touchedPhone, setTouchedPhone] = useState(false);
  const [touchedEmail, setTouchedEmail] = useState(false);
  const [touchedPassenger, setTouchedPassenger] = useState(false);

  const { language, currency } = useSelector((state: RootState) => state.settings);

  useEffect(() => {
    setFinalPrice(basePrice - discount + (insuranceSelected ? 43500 : 0));
  }, [basePrice, discount, insuranceSelected]);

  useEffect(() => {
    if (policyModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [policyModalOpen]);

  useEffect(() => {
    if (!user) {
      navigate('/login', { state: { from: '/checkout' } });
      return;
    }
    if (!preview) {
      navigate('/');
      return;
    }

    const fetchPricePreview = async () => {
      try {
        const res = await apiClient.get(`/hotels/${preview.hotelId}`, {
          params: { checkIn: preview.checkInDate, checkOut: preview.checkOutDate }
        });
        if (res.data.success) {
          setHotelDetail(res.data.data);
          const roomType = res.data.data.roomTypes.find((rt: any) => rt.id === preview.roomTypeId);
          if (roomType) {
            setRoomTypeName(roomType.name);
            setBasePrice(roomType.calculatedPrice * (preview.quantity || 1));
            setFinalPrice(roomType.calculatedPrice * (preview.quantity || 1));
          }
        }
      } catch (err) {
        console.error('Failed to preview price:', err);
      }
    };
    fetchPricePreview();
  }, [preview, navigate]);

  const handleCheckoutSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setCheckoutError('');

    // Trigger validation
    setTouchedName(true);
    setTouchedPhone(true);
    setTouchedEmail(true);
    if (!bookForSelf) setTouchedPassenger(true);

    if (!guestName || !guestPhone || !guestEmail || (!bookForSelf && !passengerName)) {
      setCheckoutError(
        language === 'vi' 
          ? 'Vui lòng điền đầy đủ các thông tin bắt buộc.' 
          : 'Please fill in all required fields.'
      );
      return;
    }

    setCheckoutLoading(true);

    try {
      const combinedNotes = [
        ...specialRequests,
        notes.trim()
      ].filter(Boolean).join(', ');

      const bookingPayload = {
        checkInDate: preview.checkInDate,
        checkOutDate: preview.checkOutDate,
        guestName: bookForSelf ? guestName : passengerName,
        guestEmail,
        guestPhone,
        notes: combinedNotes,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined,
        insuranceSelected,
        numGuests: preview.numGuests || 1,
        bookingItems: [
          {
            roomTypeId: preview.roomTypeId,
            ratePlanId: preview.ratePlanId || undefined,
            quantity: preview.quantity || 1
          }
        ]
      };

      const bookingRes = await apiClient.post('/bookings', bookingPayload);
      const { success, data: createdBooking } = bookingRes.data;

      if (!success) {
        throw new Error(
          language === 'vi' 
            ? 'Không thể tạo đơn đặt phòng. Vui lòng kiểm tra lại.' 
            : 'Could not create reservation. Please check again.'
        );
      }

      navigate(`/payment?bookingId=${createdBooking.id}`);
    } catch (err: any) {
      console.error(err);
      setCheckoutError(err.response?.data?.message || err.message || 'Xử lý đặt phòng thất bại.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const formatVietnameseDate = (dateStr: string) => {
    return formatFullDateVN(dateStr);
  };

  const formatEnglishDate = (dateStr: string) => {
    return formatFullDateVN(dateStr);
  };

  const getNightsCount = () => {
    if (!preview.checkInDate || !preview.checkOutDate) return 1;
    const inDate = new Date(preview.checkInDate);
    const outDate = new Date(preview.checkOutDate);
    const diffTime = outDate.getTime() - inDate.getTime();
    if (diffTime <= 0) return 1;
    return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  };

  if (!preview) return null;

  const nights = getNightsCount();
  const roomPriceAfterDiscount = basePrice - discount;
  const baseRoomPriceBreakdown = Math.round(roomPriceAfterDiscount / 1.155);
  const taxAndFeesBreakdown = roomPriceAfterDiscount - baseRoomPriceBreakdown;

  const requestOptions = [
    { id: 'nosmoking', vi: 'Phòng không hút thuốc', en: 'Non-smoking room' },
    { id: 'connecting', vi: 'Phòng liên thông', en: 'Interconnecting rooms' },
    { id: 'highfloor', vi: 'Tầng lầu', en: 'High floor' },
    { id: 'bedtype', vi: 'Loại giường', en: 'Bed type' },
    { id: 'checkintime', vi: 'Giờ nhận phòng', en: 'Check-in time' },
    { id: 'checkouttime', vi: 'Giờ trả phòng', en: 'Check-out time' },
    { id: 'other', vi: 'Khác', en: 'Other' },
  ];

  const handleRequestToggle = (reqText: string) => {
    setSpecialRequests(prev => 
      prev.includes(reqText) 
        ? prev.filter(r => r !== reqText) 
        : [...prev, reqText]
    );
  };

  const getAverageRating = () => {
    if (!hotelDetail || !hotelDetail.reviews || hotelDetail.reviews.length === 0) {
      return null;
    }
    const sum = hotelDetail.reviews.reduce((acc: number, r: any) => acc + (r.ratingOverall || 0), 0);
    return (sum / hotelDetail.reviews.length).toFixed(1);
  };

  const averageRating = getAverageRating();

  return (
    <div className="bg-[#f4f6f8] min-h-screen pb-16 font-sans">
      <header className="bg-white shadow-sm border-b border-slate-100 py-3 mb-6">
        <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Hotel Info */}
          <div className="flex items-center gap-4 w-full md:w-auto">
            {hotelDetail && (
              <div className="py-1">
                <h2 className="font-extrabold text-slate-800 text-sm">{hotelDetail.name}</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="flex items-center gap-0.5">
                    {Array.from({ length: hotelDetail.starRating || 0 }).map((_, i) => (
                      <StarIcon key={i} size={10} />
                    ))}
                  </span>
                  {averageRating ? (
                    <span className="text-[10px] font-extrabold text-[#006ce4] bg-[#ebf3ff] px-1.5 py-0.5 rounded">
                      {averageRating}/10 ({hotelDetail.reviews?.length || 0} {language === 'vi' ? 'đánh giá' : 'reviews'})
                    </span>
                  ) : (
                    <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                      {language === 'vi' ? 'Chưa có đánh giá' : 'No reviews'}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Stepper progress indicator */}
          <div className="flex items-center gap-6 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-2 text-[#0194f3]">
              <span className="w-5 h-5 rounded-full bg-[#0194f3] text-white flex items-center justify-center text-[10px]">1</span>
              <span>{language === 'vi' ? 'Xem lại' : 'Review'}</span>
            </span>
            <span className="w-8 h-0.5 bg-slate-200"></span>
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 flex items-center justify-center text-[10px]">2</span>
              <span>{language === 'vi' ? 'Thanh toán' : 'Payment'}</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main content grid */}
      <main className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Left Column - Forms */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Promo login banner */}
            {!user && (
              <div className="bg-[#ebf3ff] border border-[#c2dcfc] p-4 rounded-xl flex justify-between items-center gap-4 text-xs font-extrabold text-slate-700">
                <div className="flex items-center gap-2">
                  <Gift className="w-5 h-5 text-pink-500 shrink-0" />
                  <span>
                    {language === 'vi' 
                      ? 'Đăng nhập hoặc đăng ký để có giá rẻ hơn và nhiều ưu đãi hơn!' 
                      : 'Login or Register to get cheaper rates and more benefits!'}
                  </span>
                </div>
                <button 
                  type="button" 
                  onClick={() => navigate('/login', { state: { from: location.pathname, searchState: location.state } })}
                  className="text-[#0194f3] hover:text-[#007cc7] shrink-0 font-black whitespace-nowrap"
                >
                  {language === 'vi' ? 'Đăng nhập/Đăng ký' : 'Login/Register'}
                </button>
              </div>
            )}

            {/* Error notifications */}
            {checkoutError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs font-bold shadow-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span>{checkoutError}</span>
              </div>
            )}

            {/* Form: Contact Details, Guest Details & Special Requests in ONE Container */}
            <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-6">
              
              {/* 1. Contact Details Section */}
              <div className="space-y-4">
                <div className="flex items-start gap-2 border-b border-slate-50 pb-3">
                  <Mail className="w-5 h-5 text-[#0194f3] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">{language === 'vi' ? 'Liên hệ đặt chỗ' : 'Contact details'}</h3>
                    <p className="text-xs text-slate-400 font-medium">{language === 'vi' ? 'Thêm liên hệ để nhận xác nhận đặt chỗ.' : 'Add contacts to receive confirmation vouchers.'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Full name */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">{language === 'vi' ? 'Họ tên *' : 'Full name *'}</label>
                    <input
                      type="text"
                      required
                      value={guestName}
                      onBlur={() => setTouchedName(true)}
                      onChange={(e) => setGuestName(e.target.value)}
                      placeholder={language === 'vi' ? 'Họ và tên của bạn' : 'Your full name'}
                      className={`w-full bg-white border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0194f3] font-bold text-slate-800 ${
                        touchedName && !guestName ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                      }`}
                    />
                    {touchedName && !guestName && (
                      <p className="text-[10px] text-red-500 font-bold">{language === 'vi' ? 'Họ tên là phần bắt buộc' : 'Full name is required'}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Phone number */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">{language === 'vi' ? 'Điện thoại di động *' : 'Mobile phone *'}</label>
                      <div className="flex gap-2">
                        <select className="bg-slate-50 border border-slate-200 rounded-lg px-2 text-xs font-bold text-slate-800 focus:outline-none w-20">
                          <option>+84</option>
                          <option>+1</option>
                          <option>+44</option>
                          <option>+65</option>
                        </select>
                        <input
                          type="tel"
                          required
                          value={guestPhone}
                          onBlur={() => setTouchedPhone(true)}
                          onChange={(e) => setGuestPhone(e.target.value)}
                          placeholder="0912345678"
                          className={`flex-1 bg-white border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0194f3] font-bold text-slate-800 ${
                            touchedPhone && !guestPhone ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                          }`}
                        />
                      </div>
                      {touchedPhone && !guestPhone && (
                        <p className="text-[10px] text-red-500 font-bold">{language === 'vi' ? 'Điện thoại di động là phần bắt buộc' : 'Mobile phone is required'}</p>
                      )}
                    </div>

                    {/* Email */}
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-slate-600">{language === 'vi' ? 'Email *' : 'Email *'}</label>
                      <input
                        type="email"
                        required
                        value={guestEmail}
                        onBlur={() => setTouchedEmail(true)}
                        onChange={(e) => setGuestEmail(e.target.value)}
                        placeholder="email_cua_ban@gmail.com"
                        className={`w-full bg-white border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0194f3] font-bold text-slate-800 ${
                          touchedEmail && !guestEmail ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                        }`}
                      />
                      {touchedEmail && !guestEmail && (
                        <p className="text-[10px] text-red-500 font-bold">{language === 'vi' ? 'Email là phần bắt buộc' : 'Email is required'}</p>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="selfbook"
                      checked={bookForSelf}
                      onChange={(e) => setBookForSelf(e.target.checked)}
                      className="w-4.5 h-4.5 text-[#0194f3] border-slate-300 rounded focus:ring-[#0194f3]"
                    />
                    <label htmlFor="selfbook" className="text-xs font-bold text-slate-700 cursor-pointer">
                      {language === 'vi' ? 'Tôi đặt chỗ cho chính mình' : 'I am booking for myself'}
                    </label>
                  </div>
                </div>
              </div>

              {/* 2. Guest/Passenger Details Section (Conditional divider + content) */}
              {!bookForSelf && (
                <div className="pt-6 border-t border-slate-100 space-y-4 animate-in slide-in-from-top-4 duration-200">
                  <div className="flex items-start gap-2 border-b border-slate-50 pb-3">
                    <User className="w-5 h-5 text-[#0194f3] shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-extrabold text-slate-800 text-base">{language === 'vi' ? 'Thông tin Khách hàng' : 'Passenger Details'}</h3>
                      <p className="text-xs text-slate-400 font-medium">{language === 'vi' ? 'Vui lòng điền đầy đủ các thông tin để nhận xác nhận đơn hàng' : 'Please fill in all guest details for confirmation.'}</p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-600">{language === 'vi' ? 'Họ tên *' : 'Full name *'}</label>
                    <input
                      type="text"
                      required
                      value={passengerName}
                      onBlur={() => setTouchedPassenger(true)}
                      onChange={(e) => setPassengerName(e.target.value)}
                      placeholder={language === 'vi' ? 'Họ tên đầy đủ của khách lưu trú' : 'Guest full name'}
                      className={`w-full bg-white border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:border-[#0194f3] font-bold text-slate-800 ${
                        touchedPassenger && !passengerName ? 'border-red-500 bg-red-50/20' : 'border-slate-200'
                      }`}
                    />
                    {touchedPassenger && !passengerName && (
                      <p className="text-[10px] text-red-500 font-bold">{language === 'vi' ? 'Họ tên khách là phần bắt buộc' : 'Guest name is required'}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 3. Special Requests Section */}
              <div className="pt-6 border-t border-slate-100 space-y-4">
                <div className="flex items-start gap-2 border-b border-slate-50 pb-3">
                  <Check className="w-5 h-5 text-[#0194f3] shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-extrabold text-slate-800 text-base">{language === 'vi' ? 'Yêu cầu đặc biệt' : 'Special requests'}</h3>
                    <p className="text-xs text-slate-400 font-medium leading-relaxed">
                      {language === 'vi' 
                        ? 'Tất cả các yêu cầu đặc biệt tùy thuộc vào tình trạng sẵn có và không được đảm bảo. Nhận phòng sớm hoặc đưa đón sân bay có thể phát sinh thêm phí.' 
                        : 'All special requests are subject to availability and cannot be guaranteed. Early check-in or airport shuttle may incur extra fees.'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {requestOptions.map((opt) => {
                    const label = language === 'vi' ? opt.vi : opt.en;
                    const isChecked = specialRequests.includes(label);
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleRequestToggle(label)}
                        className={`flex items-center gap-2.5 p-3 rounded-lg border text-left text-xs font-bold transition-all ${
                          isChecked 
                            ? 'border-[#0194f3] bg-[#ebf3ff]/40 text-[#007cc7]' 
                            : 'border-slate-200 hover:bg-slate-55/30 text-slate-700'
                        }`}
                      >
                        <span className={`w-4.5 h-4.5 rounded flex items-center justify-center text-[10px] border transition-all ${
                          isChecked ? 'bg-[#0194f3] border-[#0194f3] text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <Check className="w-3.5 h-3.5 text-white" />}
                        </span>
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-2">
                  <label className="text-xs font-bold text-slate-500 block mb-1">{language === 'vi' ? 'Ghi chú thêm' : 'Additional note'}</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={language === 'vi' ? 'Ví dụ: Cần phòng tầng cao, giường King-size...' : 'Example: High floor room, King-size bed...'}
                    rows={2}
                    className="w-full bg-slate-50/50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold focus:outline-none focus:bg-white text-slate-700"
                  />
                </div>
              </div>

            </div>

            {/* Accommodation Policy */}
            {hotelDetail && (
              <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
                <div className="flex justify-between items-center border-b border-slate-50 pb-3">
                  <h3 className="font-extrabold text-slate-800 text-base flex items-center gap-1.5">
                    <FileText className="w-5 h-5 text-blue-600 shrink-0" /> {language === 'vi' ? 'Chính sách Chỗ ở' : 'Accommodation Policies'}
                  </h3>
                  <button 
                    type="button" 
                    onClick={() => setPolicyModalOpen(true)}
                    className="text-[#0194f3] hover:underline text-xs font-bold"
                  >
                    {language === 'vi' ? 'Đọc tất cả' : 'Read all'}
                  </button>
                </div>
                
                <div className="space-y-3">
                  <div className="flex gap-2.5 items-start">
                    <Clock className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-extrabold text-xs text-slate-800">{language === 'vi' ? 'Nhận phòng & Trả phòng' : 'Check-in & Check-out'}</h4>
                      <p className="text-xs text-slate-500 font-semibold mt-0.5">
                        {language === 'vi' 
                          ? `Thời gian nhận phòng (Check-in) từ ${hotelDetail.checkInTime || '14:00'}. Thời gian trả phòng (Check-out) trước ${hotelDetail.checkOutTime || '12:00'} trưa.`
                          : `Check-in time from ${hotelDetail.checkInTime || '14:00'}. Check-out time before ${hotelDetail.checkOutTime || '12:00'} noon.`}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Chubb Travel Insurance */}
            <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="insurance"
                  checked={insuranceSelected}
                  onChange={(e) => setInsuranceSelected(e.target.checked)}
                  className="w-4.5 h-4.5 text-[#0194f3] border-slate-300 rounded focus:ring-[#0194f3]"
                />
                <label htmlFor="insurance" className="text-sm font-extrabold text-slate-800 cursor-pointer flex items-center gap-1.5">
                  <ShieldCheck className="w-5 h-5 text-emerald-500" /> 
                  <span>{language === 'vi' ? 'Bảo hiểm Du lịch Chubb - Hotel Protect' : 'Chubb Travel Insurance - Hotel Protect'}</span>
                </label>
              </div>

              <div className="pl-6 space-y-3">
                <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                  {language === 'vi' 
                    ? 'Bảo vệ kỳ nghỉ của Quý khách khỏi rủi ro bị hủy, mất đặt phòng khách sạn, hỗ trợ sự cố y tế và hơn thế nữa.' 
                    : 'Protect your stay against cancellation risks, room loss, medical emergencies and more.'}
                </p>

                <ul className="space-y-1.5 text-xs text-slate-700 font-bold">
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {language === 'vi' ? 'Hủy bỏ đặt phòng lên tới 20.000.000 đ' : 'Reservation cancellations up to 20,000,000 VND'}
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> {language === 'vi' ? 'Hỗ trợ thất lạc hành lý và vật dụng cá nhân' : 'Baggage and personal items loss support'}
                  </li>
                </ul>

                <div className="flex justify-between items-center pt-2 text-xs font-bold">
                  <span className="text-slate-400">{language === 'vi' ? 'Phí bảo hiểm' : 'Insurance fee'}</span>
                  <span className="text-slate-[#0194f3] font-black text-sm text-slate-800">
                    {formatPrice(43500, currency)}
                  </span>
                </div>
              </div>
            </div>



          </div>

          <div className="space-y-6 sticky top-6 self-start">
            
            {/* Trip summary card */}
            {preview && (() => {
              const targetRoomType = hotelDetail?.roomTypes?.find((rt: any) => rt.id === preview.roomTypeId);
              const targetRatePlan = preview.ratePlanId ? targetRoomType?.ratePlans?.find((rp: any) => rp.id === preview.ratePlanId) : null;
              const numGuests = preview.numGuests || targetRoomType?.capacity || 2;
              const bedCount = targetRoomType?.bedCount || 1;
              const bedType = targetRoomType?.bedType || (language === 'vi' ? 'giường' : 'bed');

              const cancelPolicy = targetRatePlan?.cancellationPolicy || targetRoomType?.cancellationPolicy || 'NON_REFUNDABLE';
              const isNonRefundable = cancelPolicy === 'NON_REFUNDABLE';
              const freeCancelHours = targetRatePlan?.freeCancelHoursBefore || 24;
              const includeBreakfast = targetRoomType?.includeBreakfast || false;

              return (
                <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-5">
                  <div className="inline-flex items-center gap-1.5 text-[10px] font-black text-[#0194f3] bg-[#ebf3ff] px-2.5 py-0.5 rounded-full border border-[#0194f3]/10 uppercase">
                    <ThumbsUp className="w-3.5 h-3.5 text-[#0194f3]" /> {language === 'vi' ? 'Lựa chọn tuyệt vời cho kỳ nghỉ' : 'Great holiday choice'}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-extrabold text-slate-800 text-sm leading-snug">
                      ({preview.quantity || 1}x) {roomTypeName || preview.roomTypeId}
                    </h3>

                    {/* Check-in / out times */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3.5 rounded-xl border border-slate-100/80">
                      <div className="space-y-1">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">{language === 'vi' ? 'Nhận phòng' : 'Check-in'}</span>
                        <p className="text-xs font-extrabold text-slate-800 leading-tight">
                          {language === 'vi' ? formatVietnameseDate(preview.checkInDate) : formatEnglishDate(preview.checkInDate)}
                        </p>
                        <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{language === 'vi' ? `Từ ${hotelDetail?.checkInTime || '14:00'}` : `From ${hotelDetail?.checkInTime || '14:00'}`}</span>
                      </div>

                      <div className="space-y-1 border-l border-slate-200 pl-4">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase block">{language === 'vi' ? 'Trả phòng' : 'Check-out'}</span>
                        <p className="text-xs font-extrabold text-slate-800 leading-tight">
                          {language === 'vi' ? formatVietnameseDate(preview.checkOutDate) : formatEnglishDate(preview.checkOutDate)}
                        </p>
                        <span className="text-[10px] font-bold text-slate-400 block mt-0.5">{language === 'vi' ? `Trước ${hotelDetail?.checkOutTime || '12:00'}` : `Before ${hotelDetail?.checkOutTime || '12:00'}`}</span>
                      </div>
                    </div>

                    {/* Duration label */}
                    <p className="text-xs font-bold text-slate-700 text-center bg-[#ebf3ff]/40 py-1 rounded">
                      {nights} {language === 'vi' ? 'đêm' : 'nights'}
                    </p>

                    {/* Specs labels (Dynamic Database Data) */}
                    <div className="space-y-2 text-xs font-bold text-slate-600 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>
                          {numGuests} {language === 'vi' ? 'khách' : 'guests'} | <Bed className="w-4 h-4 text-slate-400 inline mx-0.5" /> {bedCount} {bedType}
                        </span>
                      </div>

                      <div className={`flex items-center gap-2 ${isNonRefundable ? 'text-rose-500' : 'text-emerald-700'}`}>
                        <ShieldCheck className={`w-4 h-4 shrink-0 ${isNonRefundable ? 'text-rose-500' : 'text-emerald-600'}`} />
                        <span>
                          {isNonRefundable
                            ? (language === 'vi' ? 'Đặt phòng không hoàn tiền' : 'Non-refundable booking')
                            : (language === 'vi' ? `Miễn phí hủy phòng trước ${freeCancelHours}h` : `Free cancellation up to ${freeCancelHours}h`)}
                        </span>
                      </div>

                      {includeBreakfast && (
                        <div className="flex items-center gap-2 text-emerald-700">
                          <Utensils className="w-4 h-4 text-emerald-600 shrink-0" />
                          <span>{language === 'vi' ? 'Bao gồm bữa sáng miễn phí' : 'Free breakfast included'}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-slate-500">
                        <Wifi className="w-4 h-4 text-blue-500 shrink-0" />
                        <span>{language === 'vi' ? 'Có kết nối WiFi miễn phí' : 'Free WiFi connection'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Price breakdown and Payment details */}
            <div className="bg-white border border-slate-150 p-6 rounded-2xl shadow-sm space-y-5">
              {/* Header drop-down toggle */}
              <button
                type="button"
                onClick={() => setShowPriceDetails(!showPriceDetails)}
                className="w-full flex justify-between items-center text-slate-800 font-extrabold text-sm border-b border-slate-50 pb-2"
              >
                <span className="flex items-center gap-1.5">
                  <CreditCard className="w-4.5 h-4.5 text-[#0194f3]" />
                  {language === 'vi' ? 'Chi tiết giá' : 'Price details'}
                </span>
                <span>{showPriceDetails ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}</span>
              </button>

              {showPriceDetails && (
                <div className="space-y-3.5 text-xs font-bold text-slate-600 animate-in fade-in duration-200">
                  <div className="flex justify-between">
                    <span className="text-slate-400">{language === 'vi' ? 'Giá phòng gốc' : 'Base room price'}:</span>
                    <span>{formatPrice(baseRoomPriceBreakdown, currency)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500 font-medium pl-2 italic">
                    <span>({preview.quantity || 1}x) {roomTypeName || preview.roomTypeId} ({nights} {language === 'vi' ? 'đêm' : 'nights'})</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-400">{language === 'vi' ? 'Thuế và phí' : 'Taxes & fees'}:</span>
                    <span>{formatPrice(taxAndFeesBreakdown, currency)}</span>
                  </div>

                  {discount > 0 && (
                    <div className="flex justify-between text-green-600 font-extrabold">
                      <span>{language === 'vi' ? 'Mã giảm giá áp dụng' : 'Coupon discount'}:</span>
                      <span>-{formatPrice(discount, currency)}</span>
                    </div>
                  )}

                  {insuranceSelected && (
                    <div className="flex justify-between text-slate-700">
                      <span className="text-slate-400">{language === 'vi' ? 'Bảo hiểm Du lịch Chubb' : 'Chubb Travel Insurance'}:</span>
                      <span>{formatPrice(43500, currency)}</span>
                    </div>
                  )}
                </div>
              )}



              <hr className="border-slate-50" />

              <div className="flex justify-between items-baseline">
                <div className="text-xs font-extrabold text-slate-700">
                  <span>{language === 'vi' ? 'Tổng cộng:' : 'Total price:'}</span>
                  <span className="block text-[10px] text-slate-400 font-bold mt-0.5">
                    1 {language === 'vi' ? 'phòng' : 'room'}, {nights} {language === 'vi' ? 'đêm' : 'nights'}
                  </span>
                </div>
                <span className="text-xl font-black text-[#ff4d42]">
                  {formatPrice(finalPrice, currency)}
                </span>
              </div>

              {/* Big CTA checkout submit button */}
              <button
                type="button"
                disabled={checkoutLoading}
                onClick={() => handleCheckoutSubmit()}
                className="w-full bg-[#0194f3] hover:bg-[#007cc7] disabled:bg-slate-200 text-white font-extrabold py-3.5 rounded-xl text-sm transition-all shadow-md mt-2 flex items-center justify-center gap-2 active:scale-[0.99]"
              >
                {checkoutLoading ? (
                  <>
                    <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span>{language === 'vi' ? 'Đang khởi tạo giao dịch...' : 'Initializing payment...'}</span>
                  </>
                ) : (
                  <span>{language === 'vi' ? 'Tiếp tục' : 'Continue'}</span>
                )}
              </button>

              <p className="text-[10px] text-slate-400 font-medium text-center leading-normal">
                {language === 'vi' 
                  ? 'Bằng cách tiến hành thanh toán, bạn đã đồng ý với Điều khoản và Điều kiện, Chính sách bảo mật, và Quy trình hoàn tiền lưu trú của chúng tôi.' 
                  : 'By continuing to pay, you agree to our Terms & Conditions, Privacy Policy, and Refund Processes.'}
              </p>
            </div>

          </div>

        </div>
      </main>


      {/* Important Notes Policy Modal */}
      {policyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-2xl shadow-2xl w-full max-w-2xl space-y-4 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center border-b border-slate-100 p-6 pb-4">
              <h3 className="font-extrabold text-slate-800 text-lg flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                <span>{language === 'vi' ? 'Lưu ý quan trọng' : 'Important notes'}</span>
              </h3>
              <button
                onClick={() => setPolicyModalOpen(false)}
                className="text-slate-400 hover:text-[#ff4d42] p-1.5 hover:bg-slate-50 rounded-lg transition-colors font-bold text-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Modal Body (Scrollable) */}
            <div className="p-6 pt-0 overflow-y-auto space-y-5 text-sm leading-relaxed text-slate-600 font-semibold max-h-[60vh] pr-4 scrollbar-thin">
              {language === 'vi' ? (
                <>
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">1. Nhận phòng và trả phòng</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Thời gian nhận phòng (Check-in): từ {hotelDetail?.checkInTime || '14:00'}.<br />
                      Thời gian trả phòng (Check-out): trước {hotelDetail?.checkOutTime || '12:00'} trưa.<br />
                      Việc nhận phòng sớm hoặc trả phòng muộn phụ thuộc vào tình trạng phòng và có thể phát sinh phụ phí.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">2. Giấy tờ khi nhận phòng</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Khách lưu trú cần xuất trình CCCD/CMND, hộ chiếu hoặc giấy tờ tùy thân hợp lệ khi làm thủ tục nhận phòng.<br />
                      Thông tin trên giấy tờ phải trùng khớp với thông tin đã cung cấp khi đặt phòng.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">3. Chính sách trẻ em</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Trẻ em dưới 6 tuổi được ở miễn phí khi sử dụng giường có sẵn cùng bố mẹ.<br />
                      Trẻ em từ 6 đến dưới 12 tuổi có thể áp dụng phụ phí theo quy định của từng khách sạn.<br />
                      Trẻ từ 12 tuổi trở lên được tính như người lớn.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">4. Giường phụ</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Một số hạng phòng có thể kê thêm giường phụ theo yêu cầu.<br />
                      Việc cung cấp giường phụ phụ thuộc vào tình trạng còn trống và sẽ tính thêm chi phí theo quy định của khách sạn.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">5. Chính sách hút thuốc</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Không hút thuốc trong phòng nghỉ và các khu vực cấm hút thuốc.<br />
                      Khách vi phạm có thể bị tính phí vệ sinh hoặc bồi thường theo quy định.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">6. Thú cưng</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Thú cưng không được phép mang vào khách sạn, trừ khi khách sạn có quy định riêng cho phép.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">7. Quy định về tiếng ồn</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Khách vui lòng giữ trật tự, đặc biệt trong khoảng thời gian từ 22:00 đến 06:00.<br />
                      Không tổ chức tiệc hoặc gây ảnh hưởng đến các khách lưu trú khác nếu chưa được sự đồng ý của khách sạn.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">8. Bảo quản tài sản</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Khách tự chịu trách nhiệm đối với tài sản cá nhân trong thời gian lưu trú.<br />
                      Nên sử dụng két an toàn (nếu có) để cất giữ tài sản có giá trị.<br />
                      Khách sạn không chịu trách nhiệm đối với tài sản bị mất hoặc hư hỏng do sơ suất của khách.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">9. Hủy và thay đổi đặt phòng</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Chính sách hủy hoặc thay đổi đặt phòng phụ thuộc vào loại phòng và điều kiện của từng đơn đặt.<br />
                      Các khoản hoàn tiền (nếu có) sẽ được xử lý theo phương thức thanh toán ban đầu và quy định của khách sạn.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">10. Bồi thường thiệt hại</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Khách lưu trú phải bồi thường đối với các hư hỏng, mất mát tài sản của khách sạn do mình hoặc người đi cùng gây ra.<br />
                      Mức bồi thường được xác định dựa trên giá trị thực tế của tài sản bị hư hỏng.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">11. Quyền từ chối phục vụ</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Khách sạn có quyền từ chối nhận phòng hoặc chấm dứt việc lưu trú trong các trường hợp:<br />
                      - Cung cấp thông tin đặt phòng không chính xác.<br />
                      - Có hành vi gây mất trật tự, ảnh hưởng đến an ninh hoặc các khách lưu trú khác.<br />
                      - Vi phạm pháp luật hoặc nội quy của khách sạn.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">12. Điều khoản chung</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Khi hoàn tất việc đặt phòng, khách hàng được xem là đã đọc, hiểu và đồng ý với toàn bộ chính sách chỗ ở.<br />
                      Khách sạn có quyền cập nhật hoặc thay đổi các chính sách khi cần thiết mà không cần thông báo trước. Các thay đổi sẽ có hiệu lực kể từ thời điểm được đăng tải trên website.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">1. Check-in and Check-out</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Check-in time: from {hotelDetail?.checkInTime || '14:00'}.<br />
                      Check-out time: before {hotelDetail?.checkOutTime || '12:00'} noon.<br />
                      Early check-in or late check-out is subject to room availability and may incur surcharges.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">2. Documents Required at Check-in</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Guests must present a valid national ID card, passport, or other valid identity papers upon check-in.<br />
                      The details on the document must match the booking details provided.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">3. Child Policy</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Children under 6 stay free when sharing existing bedding with parents.<br />
                      Children from 6 to under 12 may incur additional surcharges according to hotel rules.<br />
                      Children 12 and above are charged as adults.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">4. Extra Bed</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Some room categories can accommodate an extra bed upon request.<br />
                      The provision of extra beds is subject to availability and will incur charges according to hotel rules.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">5. Smoking Policy</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Smoking is not allowed inside guest rooms and non-smoking areas.<br />
                      Violators may be charged a cleaning fee or damage compensation.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">6. Pets</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Pets are not allowed in the hotel unless specifically permitted by hotel policies.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">7. Noise Regulation</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Guests should keep quiet, especially from 22:00 to 06:00.<br />
                      No parties or disturbances to other guests without hotel consent.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">8. Property Custody</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Guests are responsible for their personal belongings during their stay.<br />
                      Using in-room safes (if available) is recommended for valuables.<br />
                      The hotel is not liable for lost or damaged personal items due to guest negligence.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">9. Cancellation and Modification</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Policies depend on room types and booking conditions.<br />
                      Refunds (if any) will be processed via the original payment method.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">10. Damage Compensation</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      Guests must compensate for any damage or loss of hotel property caused by themselves or their companions.<br />
                      Compensation is determined based on the actual value of the damaged property.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">11. Right to Refuse Service</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      The hotel reserves the right to refuse check-in or terminate stay if guest:<br />
                      - Provides incorrect booking details.<br />
                      - Behaves disruptively, affecting security or other guests.<br />
                      - Violates laws or hotel regulations.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-extrabold text-slate-850 text-base text-slate-800">12. General Terms</h4>
                    <p className="pl-4 text-xs font-semibold text-slate-500">
                      By completing booking, guests are deemed to have read, understood, and agreed to all accommodation policies.<br />
                      The hotel reserves the right to update policies without notice. Updates take effect once posted on the website.
                    </p>
                  </div>
                </>
              )}
            </div>
            
            {/* Modal Footer */}
            <div className="border-t border-slate-100 p-6 flex justify-end">
              <button
                type="button"
                onClick={() => setPolicyModalOpen(false)}
                className="bg-[#0194f3] hover:bg-[#007cc7] text-white font-extrabold px-6 py-2.5 rounded-xl text-xs transition-all shadow active:scale-[0.98]"
              >
                {language === 'vi' ? 'Đã hiểu' : 'Understood'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;
