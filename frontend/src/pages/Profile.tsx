import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../store';
import { updateUserProfile } from '../store/slices/authSlice';
import apiClient from '../core/api/client';
import { formatPrice } from '../utils/price';
import { formatDateVN } from '../utils/date';
import { useModal } from '../components/common/ModalContext';
import {
  User,
  Mail,
  Phone,
  Calendar,
  CreditCard,
  Award,
  CheckCircle2,
  AlertTriangle,
  Clock,
  QrCode,
  Trash2,
  Plus,
  Compass,
  Eye,
  EyeOff,
  MapPin,
  Bell,
  Info,
  Upload,
  Hotel,
  RotateCcw
} from 'lucide-react';

interface BookingItem {
  id: string;
  price: number;
  paymentPolicySnapshot?: string;
  roomType: {
    name: string;
    hotel: {
      name: string;
      address: string;
      province: { name: string };
    }
  }
}

interface Booking {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
  status: 'PENDING' | 'PAYMENT_PROCESSING' | 'CONFIRMED' | 'CHECKED_IN' | 'CHECKED_OUT' | 'COMPLETED' | 'CANCELLED';
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  bookingItems: BookingItem[];
  payment?: {
    id: string;
    method: string;
    status: string;
  };
}

interface PaymentCard {
  id: string;
  cardNumber: string;
  cardHolder: string;
  expiryDate: string;
  cardType: 'visa' | 'mastercard' | 'jcb' | 'unknown';
  isDefault: boolean;
}

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showAlert, showConfirm } = useModal();
  const [searchParams] = useSearchParams();

  const { user } = useSelector((state: RootState) => state.auth);
  const { language, currency } = useSelector((state: RootState) => state.settings);

  // Tab Selection
  const initialTab = searchParams.get('tab') || 'info';
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // --- Profile States ---
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [gender, setGender] = useState(user?.gender || 'MALE');
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? new Date(user.dateOfBirth).toISOString().substring(0, 10) : '');
  const [updatingProfile, setUpdatingProfile] = useState(false);

  // --- Bookings States ---
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(true);
  const [bookingFilter, setBookingFilter] = useState<'all' | 'upcoming' | 'past' | 'cancelled'>('all');
  const [selectedQrBooking, setSelectedQrBooking] = useState<Booking | null>(null);

  // Reviews inside bookings
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<Booking | null>(null);
  const [ratingCleanliness, setRatingCleanliness] = useState(5);
  const [ratingLocation, setRatingLocation] = useState(5);
  const [ratingService, setRatingService] = useState(5);
  const [ratingFacilities, setRatingFacilities] = useState(5);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  // --- Payment Cards States ---
  const [cards, setCards] = useState<PaymentCard[]>([]);
  const [isAddCardOpen, setIsAddCardOpen] = useState(false);
  const [newCardNumber, setNewCardNumber] = useState('');
  const [newCardHolder, setNewCardHolder] = useState('');
  const [newExpiryDate, setNewExpiryDate] = useState('');
  const [newCvv, setNewCvv] = useState('');
  const [showCvv, setShowCvv] = useState(false);

  // --- Toast/Notification States ---
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  // Trigger toast notification
  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // --- Loyalty States ---
  const [loyaltySummary, setLoyaltySummary] = useState<any>(null);
  const [loyaltyHistory, setLoyaltyHistory] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);

  const fetchLoyaltyData = async () => {
    setLoyaltyLoading(true);
    try {
      const [summaryRes, historyRes] = await Promise.all([
        apiClient.get('/loyalty/summary'),
        apiClient.get('/loyalty/history')
      ]);
      if (summaryRes.data.success) setLoyaltySummary(summaryRes.data.data);
      if (historyRes.data.success) setLoyaltyHistory(historyRes.data.data);
    } catch (err) {
      console.error('Failed to fetch loyalty data:', err);
    } finally {
      setLoyaltyLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await apiClient.get('/auth/notifications');
      if (res.data.success) {
        setNotifications(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  // Fetch Bookings
  const fetchBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await apiClient.get('/bookings/my');
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch bookings:', err);
    } finally {
      setBookingsLoading(false);
    }
  };

  // Load Saved Payment Cards from localStorage
  const loadSavedCards = () => {
    try {
      const saved = localStorage.getItem(`cloudbooking_cards_${user?.id}`);
      if (saved) {
        setCards(JSON.parse(saved));
      } else {
        // Seed initial mock cards
        const initialCards: PaymentCard[] = [
          {
            id: 'card-1',
            cardNumber: '4000123456789010',
            cardHolder: user?.fullName.toUpperCase() || 'KHÁCH HÀNG',
            expiryDate: '12/28',
            cardType: 'visa',
            isDefault: true,
          }
        ];
        localStorage.setItem(`cloudbooking_cards_${user?.id}`, JSON.stringify(initialCards));
        setCards(initialCards);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    fetchBookings();
    loadSavedCards();
    fetchLoyaltyData();
    fetchNotifications();
  }, [user]);

  // Real-time listener for Profile page booking auto refresh
  useEffect(() => {
    const handleBookingUpdated = () => {
      fetchBookings();
      fetchLoyaltyData();
      fetchNotifications();
    };

    window.addEventListener('booking:statusUpdated', handleBookingUpdated);

    return () => {
      window.removeEventListener('booking:statusUpdated', handleBookingUpdated);
    };
  }, []);

  // Sync profile details when redux user changes (e.g. after update or login)
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setPhoneNumber(user.phoneNumber || '');
      setAvatarUrl(user.avatarUrl || '');
      setGender(user.gender || 'MALE');
      setDateOfBirth(user.dateOfBirth ? new Date(user.dateOfBirth).toISOString().substring(0, 10) : '');
    }
  }, [user]);

  // Sync tab selection from query params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab) setActiveTab(tab);
  }, [searchParams]);

  // Calculate Loyalty Points dynamically
  const loyaltyPoints = loyaltySummary?.pointsBalance ?? 0;
  const loyaltyTier = loyaltySummary?.tier ?? 'Bronze';
  const nextTierPoints = loyaltySummary?.nextTierPoints ?? 1000;
  const pointsToNext = loyaltySummary?.pointsToNext ?? 1000;
  const nextTierName = loyaltySummary?.nextTierName ?? 'Silver';
  const expiringSoon = loyaltySummary?.expiringSoon ?? 0;

  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAvatar(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });

      const res = await apiClient.post('/hotels/upload-image', { image: base64 });
      if (res.data.success) {
        setAvatarUrl(res.data.data.url);
        triggerToast(language === 'vi' ? 'Đã tải ảnh đại diện lên thành công!' : 'Avatar uploaded successfully!');
      }
    } catch (err) {
      console.error(err);
      triggerToast(language === 'vi' ? 'Lỗi tải ảnh đại diện lên.' : 'Failed to upload avatar image.', 'error');
    } finally {
      setUploadingAvatar(false);
      e.target.value = '';
    }
  };

  // Update Profile Request
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdatingProfile(true);
    try {
      const res = await apiClient.put('/auth/profile', {
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        avatarUrl: avatarUrl.trim(),
        gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
      });

      if (res.data.success) {
        dispatch(updateUserProfile(res.data.data));
        triggerToast(language === 'vi' ? 'Cập nhật thông tin cá nhân thành công!' : 'Profile updated successfully!');
      }
    } catch (err: any) {
      console.error(err);
      triggerToast(err.response?.data?.message || 'Cập nhật hồ sơ thất bại.', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  // Add Card Request
  const handleAddCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCardNumber.length < 16) {
      triggerToast(language === 'vi' ? 'Số thẻ phải chứa 16 chữ số' : 'Card number must be 16 digits', 'error');
      return;
    }

    let detectedType: 'visa' | 'mastercard' | 'jcb' | 'unknown' = 'unknown';
    if (newCardNumber.startsWith('4')) detectedType = 'visa';
    else if (newCardNumber.startsWith('5')) detectedType = 'mastercard';
    else if (newCardNumber.startsWith('35')) detectedType = 'jcb';

    const newCard: PaymentCard = {
      id: `card-${Date.now()}`,
      cardNumber: newCardNumber,
      cardHolder: newCardHolder.toUpperCase().trim(),
      expiryDate: newExpiryDate,
      cardType: detectedType,
      isDefault: cards.length === 0,
    };

    const updatedCards = [...cards, newCard];
    setCards(updatedCards);
    localStorage.setItem(`cloudbooking_cards_${user?.id}`, JSON.stringify(updatedCards));
    
    // Clear Form
    setNewCardNumber('');
    setNewCardHolder('');
    setNewExpiryDate('');
    setNewCvv('');
    setIsAddCardOpen(false);
    
    triggerToast(language === 'vi' ? 'Đã liên kết thẻ thành công!' : 'Card linked successfully!');
  };

  // Delete Card
  const handleDeleteCard = (cardId: string) => {
    const updatedCards = cards.filter(c => c.id !== cardId);
    // If the default card is deleted, make another default
    if (cards.find(c => c.id === cardId)?.isDefault && updatedCards.length > 0) {
      updatedCards[0].isDefault = true;
    }
    setCards(updatedCards);
    localStorage.setItem(`cloudbooking_cards_${user?.id}`, JSON.stringify(updatedCards));
    triggerToast(language === 'vi' ? 'Đã gỡ liên kết thẻ.' : 'Card removed.');
  };

  // Set Default Card
  const handleSetDefaultCard = (cardId: string) => {
    const updatedCards = cards.map(c => ({
      ...c,
      isDefault: c.id === cardId,
    }));
    setCards(updatedCards);
    localStorage.setItem(`cloudbooking_cards_${user?.id}`, JSON.stringify(updatedCards));
    triggerToast(language === 'vi' ? 'Đã thiết lập thẻ mặc định.' : 'Default card updated.');
  };

  // Get status badge for bookings
  const getBookingStatusBadge = (status: string, booking?: Booking) => {
    const isPayAtHotel = booking?.bookingItems[0]?.paymentPolicySnapshot?.includes('khách sạn') || booking?.payment?.method === 'hotel';
    const isPaid = booking?.payment?.status === 'COMPLETED';

    switch (status) {
      case 'PENDING':
        return <span className="bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-extrabold text-[10px] sm:text-xs flex items-center gap-1.5 border border-amber-200/50 shadow-sm"><Clock className="w-3.5 h-3.5 shrink-0" /> {language === 'vi' ? 'Chờ thanh toán' : 'Pending payment'}</span>;
      case 'PAYMENT_PROCESSING':
        return <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-extrabold text-[10px] sm:text-xs flex items-center gap-1.5 border border-blue-200/50 shadow-sm"><Clock className="w-3.5 h-3.5 shrink-0" /> {language === 'vi' ? 'Đang xử lý' : 'Processing'}</span>;
      case 'CONFIRMED':
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-extrabold text-[10px] sm:text-xs flex items-center gap-1.5 border border-green-200/50 shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {language === 'vi' ? 'Đã giữ phòng' : 'Confirmed'}
            </span>
            {isPaid ? (
              <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-bold">
                {language === 'vi' ? 'Đã TT Online' : 'Paid Online'}
              </span>
            ) : isPayAtHotel ? (
              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <Hotel className="w-3 h-3 text-amber-800 shrink-0" /> {language === 'vi' ? 'Thanh toán tại khách sạn' : 'Pay at Hotel'}
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-full font-bold">
                {language === 'vi' ? 'Chưa TT' : 'Unpaid'}
              </span>
            )}
          </div>
        );
      case 'CHECKED_IN':
        return <span className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full font-extrabold text-[10px] sm:text-xs border border-emerald-200/50 shadow-sm">{language === 'vi' ? 'Đã nhận phòng' : 'Checked In'}</span>;
      case 'CHECKED_OUT':
        return <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full font-extrabold text-[10px] sm:text-xs border border-slate-200/30">{language === 'vi' ? 'Đã trả phòng' : 'Checked Out'}</span>;
      case 'COMPLETED':
        return <span className="bg-green-50 text-green-700 px-2.5 py-1 rounded-full font-extrabold text-[10px] sm:text-xs border border-green-200/50 shadow-sm">{language === 'vi' ? 'Hoàn thành' : 'Completed'}</span>;
      case 'CANCELLED': {
        const isRefunded = booking?.payment?.status === 'REFUNDED';
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="bg-red-50 text-red-700 px-2.5 py-1 rounded-full font-extrabold text-[10px] sm:text-xs flex items-center gap-1.5 border border-red-200/50 shadow-sm">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> {language === 'vi' ? 'Đã hủy' : 'Cancelled'}
            </span>
            {isRefunded && (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                <RotateCcw className="w-3 h-3 text-amber-800 shrink-0" /> {language === 'vi' ? 'Đã hoàn tiền (VNPay)' : 'Refunded (VNPay)'}
              </span>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Payment checkout navigation
  const handlePayNow = (booking: Booking) => {
    navigate(`/payment?bookingId=${booking.id}`);
  };

  // Review submission
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReviewBooking) return;
    const item = selectedReviewBooking.bookingItems[0];
    if (!item) return;

    const hotelId = (item.roomType as any).hotelId || (item.roomType.hotel as any).id;
    if (!hotelId) {
      await showAlert("Không tìm thấy thông tin khách sạn để gửi đánh giá.", { type: 'error' });
      return;
    }

    setSubmittingReview(true);
    try {
      const payload = {
        ratingCleanliness,
        ratingLocation,
        ratingService,
        ratingFacilities,
        ratingValue,
        comment: reviewComment.trim(),
      };

      await apiClient.post(`/hotels/${hotelId}/reviews`, payload);
      triggerToast(language === 'vi' ? 'Gửi đánh giá thành công!' : 'Review submitted successfully!');
      setSelectedReviewBooking(null);
      setReviewComment('');
      fetchBookings();
    } catch (err) {
      console.error(err);
      triggerToast(language === 'vi' ? 'Không thể gửi đánh giá lúc này.' : 'Failed to submit review.', 'error');
    } finally {
      setSubmittingReview(false);
    }
  };

  // Filtered bookings
  const getFilteredBookings = () => {
    return bookings.filter(b => {
      if (bookingFilter === 'upcoming') {
        return b.status === 'CONFIRMED' || b.status === 'PENDING' || b.status === 'PAYMENT_PROCESSING';
      }
      if (bookingFilter === 'past') {
        return b.status === 'CHECKED_OUT' || b.status === 'COMPLETED';
      }
      if (bookingFilter === 'cancelled') {
        return b.status === 'CANCELLED';
      }
      return true;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Sidebar Profile Header & Navigation */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white border border-slate-150 rounded-2xl p-6 shadow-sm text-center relative overflow-hidden space-y-5">
            {/* Design accents */}
            <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-r from-blue-600 to-indigo-600 z-0 opacity-90" />
            
            {/* Profile Avatar Card */}
            <div className="relative z-10 pt-4 flex flex-col items-center">
              {user?.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.fullName}
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-md bg-white"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-slate-100 border-4 border-white shadow-md text-slate-500 flex items-center justify-center font-black text-3xl select-none">
                  {user?.fullName.charAt(0).toUpperCase()}
                </div>
              )}
              
              <h2 className="mt-3 font-extrabold text-slate-800 text-lg leading-tight">{user?.fullName}</h2>
              <span className="mt-1 inline-block px-2.5 py-0.5 bg-blue-50 text-[#006ce4] rounded-full text-[10px] font-black tracking-wider uppercase border border-blue-100">
                {user?.role === 'CUSTOMER' ? (language === 'vi' ? 'Khách du lịch' : 'Customer') : user?.role}
              </span>
            </div>

            {/* Loyalty Tier Display */}
            <div className="border-t border-slate-100 pt-4 space-y-2.5">
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span className="flex items-center gap-1"><Award className="w-4 h-4 text-amber-500" /> {language === 'vi' ? 'Cấp thành viên:' : 'Tier Level:'}</span>
                <span className={`uppercase font-black tracking-wider text-xs ${
                  loyaltyTier === 'Gold' ? 'text-amber-600 bg-amber-550/10 px-2 py-0.5 rounded' : 
                  loyaltyTier === 'Silver' ? 'text-slate-500 bg-slate-100 px-2 py-0.5 rounded' : 'text-amber-700 bg-amber-50 px-2 py-0.5 rounded'
                }`}>
                  {loyaltyTier === 'Bronze' && (language === 'vi' ? 'Hạng Đồng' : 'Bronze')}
                  {loyaltyTier === 'Silver' && (language === 'vi' ? 'Hạng Bạc' : 'Silver')}
                  {loyaltyTier === 'Gold' && (language === 'vi' ? 'Hạng Vàng' : 'Gold')}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                <span>{language === 'vi' ? 'Điểm thưởng:' : 'Points Balance:'}</span>
                <span className="text-blue-600 font-extrabold">{loyaltyPoints} {language === 'vi' ? 'điểm' : 'pts'}</span>
              </div>
            </div>
          </div>

          {/* Navigation Sidebar Buttons */}
          <div className="bg-white border border-slate-150 rounded-2xl overflow-hidden shadow-sm">
            {[
              { id: 'info', labelVi: 'Thông tin cá nhân', labelEn: 'Personal Info', icon: <User className="w-4.5 h-4.5" /> },
              { id: 'bookings', labelVi: 'Đặt chỗ của tôi', labelEn: 'My Bookings', icon: <Calendar className="w-4.5 h-4.5" /> },
              { id: 'payments', labelVi: 'Phương thức thanh toán', labelEn: 'Payment Methods', icon: <CreditCard className="w-4.5 h-4.5" /> },
              { id: 'rewards', labelVi: 'Điểm tích lũy & Ưu đãi', labelEn: 'Loyalty Rewards', icon: <Award className="w-4.5 h-4.5" /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  navigate(`/profile?tab=${tab.id}`, { replace: true });
                }}
                className={`w-full text-left px-5 py-4 flex items-center gap-3.5 font-bold text-xs sm:text-sm border-b last:border-b-0 transition-all border-slate-100 ${
                  activeTab === tab.id
                    ? 'bg-blue-50/50 text-[#006ce4] border-l-4 border-l-blue-600'
                    : 'text-slate-650 hover:bg-slate-50/40 hover:text-slate-900 border-l-4 border-l-transparent'
                }`}
              >
                <span className={activeTab === tab.id ? 'text-[#006ce4]' : 'text-slate-400'}>{tab.icon}</span>
                <span>{language === 'vi' ? tab.labelVi : tab.labelEn}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Tab Content */}
        <div className="lg:col-span-8">
          
          {/* Tab 1: Personal Info */}
          {activeTab === 'info' && (
            <div className="bg-white border border-slate-150 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg sm:text-xl font-extrabold text-slate-800">{language === 'vi' ? 'Thông tin cá nhân' : 'Personal Information'}</h3>
                <p className="text-xs text-slate-400 font-medium mt-1">{language === 'vi' ? 'Cập nhật thông tin liên hệ và hồ sơ của bạn.' : 'Update your contact details and user profile.'}</p>
              </div>

              <form onSubmit={handleUpdateProfile} className="space-y-5 text-slate-700 text-xs sm:text-sm font-semibold">
                
                {/* Email Field (Disabled) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Địa chỉ Email' : 'Email Address'}</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="email"
                      disabled
                      value={user?.email || ''}
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 text-slate-400 rounded-xl cursor-not-allowed font-medium"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium">{language === 'vi' ? 'Địa chỉ email không thể thay đổi.' : 'Email address cannot be modified.'}</span>
                </div>

                {/* Full Name Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Họ và tên' : 'Full Name'}</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder={language === 'vi' ? 'Nhập họ và tên đầy đủ' : 'Enter your full name'}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-600 focus:outline-none rounded-xl text-slate-800 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Phone Number Field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Số điện thoại' : 'Phone Number'}</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder={language === 'vi' ? 'Ví dụ: 0987654321' : 'Example: 0987654321'}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-600 focus:outline-none rounded-xl text-slate-800 transition-all font-semibold"
                    />
                  </div>
                </div>

                {/* Gender & Date of Birth (Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Gender Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      {language === 'vi' ? 'Giới tính' : 'Gender'}
                    </label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-4 py-3 bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-600 focus:outline-none rounded-xl text-slate-800 transition-all font-semibold"
                    >
                      <option value="MALE">{language === 'vi' ? 'Nam' : 'Male'}</option>
                      <option value="FEMALE">{language === 'vi' ? 'Nữ' : 'Female'}</option>
                      <option value="OTHER">{language === 'vi' ? 'Khác' : 'Other'}</option>
                    </select>
                  </div>

                  {/* Date of Birth Field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      {language === 'vi' ? 'Ngày sinh' : 'Date of Birth'}
                    </label>
                    <div className="relative">
                      <Calendar className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                      <input
                        type="date"
                        value={dateOfBirth}
                        onChange={(e) => setDateOfBirth(e.target.value)}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-600 focus:outline-none rounded-xl text-slate-800 transition-all font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* Avatar Field (File Upload from Computer + URL) */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    {language === 'vi' ? 'Ảnh đại diện (Avatar)' : 'Avatar Image'}
                  </label>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    {/* Nút chọn ảnh từ máy tính */}
                    <label className="cursor-pointer bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold px-4 py-3 rounded-xl border border-blue-200 flex items-center justify-center gap-2 text-xs transition-all active:scale-95 shrink-0 shadow-sm">
                      <Upload className="w-4 h-4 text-blue-600" />
                      <span>
                        {uploadingAvatar
                          ? (language === 'vi' ? 'Đang tải ảnh...' : 'Uploading...')
                          : (language === 'vi' ? 'Chọn ảnh từ máy tính' : 'Upload from PC')}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarFileChange}
                        disabled={uploadingAvatar}
                        className="hidden"
                      />
                    </label>

                    {/* Hoặc nhập đường dẫn URL */}
                    <div className="relative flex-1">
                      <Compass className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
                      <input
                        type="text"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder={language === 'vi' ? 'Hoặc dán URL ảnh tại đây...' : 'Or paste image URL here...'}
                        className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-350 focus:border-blue-600 focus:outline-none rounded-xl text-slate-800 transition-all font-semibold text-xs sm:text-sm"
                      />
                    </div>
                  </div>

                  {avatarUrl && (
                    <div className="flex items-center gap-3 pt-1">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{language === 'vi' ? 'Xem trước ảnh:' : 'Live Preview:'}</span>
                      <img src={avatarUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover border-2 border-blue-500 shadow-sm" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                    </div>
                  )}
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-slate-100 flex justify-end">
                  <button
                    type="submit"
                    disabled={updatingProfile}
                    className="bg-[#006ce4] hover:bg-[#0056b3] disabled:bg-slate-200 text-white font-extrabold px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 flex items-center gap-1.5 text-xs sm:text-sm"
                  >
                    {updatingProfile ? (language === 'vi' ? 'Đang lưu...' : 'Saving...') : (language === 'vi' ? 'Lưu thay đổi' : 'Save Changes')}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Tab 2: My Bookings */}
          {activeTab === 'bookings' && (
            <div className="bg-white border border-slate-150 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-800">{language === 'vi' ? 'Đặt chỗ của tôi' : 'My Bookings'}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">{language === 'vi' ? 'Quản lý lịch sử đặt phòng nghỉ của bạn.' : 'Manage your reservation history.'}</p>
                </div>
                
                {/* Status Tabs filters */}
                <div className="flex flex-wrap gap-1">
                  {[
                    { id: 'all', labelVi: 'Tất cả', labelEn: 'All' },
                    { id: 'upcoming', labelVi: 'Sắp đi', labelEn: 'Upcoming' },
                    { id: 'past', labelVi: 'Lịch sử', labelEn: 'Past' },
                    { id: 'cancelled', labelVi: 'Đã hủy', labelEn: 'Cancelled' },
                  ].map((filter) => (
                    <button
                      key={filter.id}
                      onClick={() => setBookingFilter(filter.id as any)}
                      className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                        bookingFilter === filter.id
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-slate-50 text-slate-655 hover:bg-slate-100'
                      }`}
                    >
                      {language === 'vi' ? filter.labelVi : filter.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {bookingsLoading ? (
                <div className="space-y-4">
                  {[1, 2].map((n) => (
                    <div key={n} className="bg-slate-50 border border-slate-200/50 rounded-xl h-36 animate-pulse"></div>
                  ))}
                </div>
              ) : getFilteredBookings().length === 0 ? (
                <div className="text-center py-16 space-y-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="font-extrabold text-slate-700">{language === 'vi' ? 'Không tìm thấy đặt phòng nào' : 'No reservations found'}</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    {language === 'vi' ? 'Hãy khám phá thêm hàng loạt ưu đãi tại chỗ nghỉ cao cấp.' : 'Explore hundreds of high quality hotel properties.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {getFilteredBookings().map((booking) => {
                    const item = booking.bookingItems[0];
                    return (
                      <div
                        key={booking.id}
                        className="bg-white border border-slate-200/70 rounded-xl overflow-hidden shadow-sm p-4 sm:p-5 space-y-4 hover:border-slate-300 transition-all text-xs sm:text-sm"
                      >
                        {/* Header info */}
                        <div className="flex justify-between items-start gap-4 border-b border-slate-50 pb-3">
                          <div>
                            <h4 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug">{item?.roomType.hotel.name}</h4>
                            <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium mt-1">
                              <MapPin className="w-3.5 h-3.5 shrink-0" />
                              <span className="line-clamp-1">{item?.roomType.hotel.address}</span>
                            </div>
                          </div>
                          {getBookingStatusBadge(booking.status, booking)}
                        </div>

                        {/* Middle Specs grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-semibold text-slate-655">
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{language === 'vi' ? 'NHẬN PHÒNG' : 'CHECK-IN'}</span>
                            <span className="text-slate-800 font-bold">{formatDateVN(booking.checkInDate)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{language === 'vi' ? 'TRẢ PHÒNG' : 'CHECK-OUT'}</span>
                            <span className="text-slate-800 font-bold">{formatDateVN(booking.checkOutDate)}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{language === 'vi' ? 'HỌ TÊN KHÁCH' : 'GUEST NAME'}</span>
                            <span className="text-slate-800 font-bold line-clamp-1">{booking.guestName}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">{language === 'vi' ? 'TỔNG TIỀN THỰC TẾ' : 'FINAL PRICE'}</span>
                            <span className="text-red-500 font-black">{formatPrice(booking.finalPrice, currency)}</span>
                          </div>
                        </div>

                        {/* Footer details & action buttons */}
                        <div className="flex justify-between items-center pt-3 border-t border-slate-55 text-[10px] font-bold text-slate-400">
                          <span>{language === 'vi' ? 'Mã đặt phòng:' : 'Booking ID:'} {booking.id.substring(0, 8).toUpperCase()}</span>
                          
                          <div className="flex flex-wrap gap-2">
                            {booking.status === 'PENDING' && (
                              <button
                                onClick={() => handlePayNow(booking)}
                                className="bg-[#006ce4] hover:bg-[#0056b3] text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-colors shadow flex items-center gap-1"
                              >
                                <CreditCard className="w-3.5 h-3.5" /> {language === 'vi' ? 'Thanh toán ngay' : 'Pay Now'}
                              </button>
                            )}

                            {booking.status === 'CONFIRMED' && (
                              <>
                                <button
                                  onClick={() => setSelectedQrBooking(booking)}
                                  className="bg-slate-800 hover:bg-slate-900 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                                >
                                  <QrCode className="w-3.5 h-3.5" /> {language === 'vi' ? 'Xem vé QR' : 'QR Ticket'}
                                </button>

                                {booking.payment?.status !== 'COMPLETED' && (
                                  <button
                                    onClick={() => handlePayNow(booking)}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-colors shadow flex items-center gap-1"
                                  >
                                    <CreditCard className="w-3.5 h-3.5" /> {language === 'vi' ? 'Thanh toán Online ngay' : 'Pay Online Now'}
                                  </button>
                                )}
                              </>
                            )}

                            {(booking.status === 'PENDING' || booking.status === 'PAYMENT_PROCESSING' || booking.status === 'CONFIRMED') && (
                              <button
                                onClick={async () => {
                                  const confirmed = await showConfirm(
                                    language === 'vi'
                                      ? 'Bạn có chắc chắn muốn hủy đơn đặt phòng này? Đặt phòng của bạn sẽ bị hủy và phòng sẽ được giải phóng.'
                                      : 'Are you sure you want to cancel this booking?',
                                    { title: language === 'vi' ? 'Xác nhận hủy đặt phòng' : 'Confirm Cancellation', type: 'danger', confirmText: language === 'vi' ? 'Hủy phòng' : 'Cancel Booking' }
                                  );
                                  if (confirmed) {
                                    try {
                                      const res = await apiClient.put(`/bookings/${booking.id}/status`, { status: 'CANCELLED' });
                                      if (res.data.success || res.status === 200) {
                                        triggerToast(language === 'vi' ? 'Hủy đơn đặt phòng thành công!' : 'Booking cancelled successfully!');
                                        fetchBookings();
                                      }
                                    } catch (err: any) {
                                      triggerToast(err.response?.data?.message || 'Không thể hủy đơn.', 'error');
                                    }
                                  }
                                }}
                                className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
                              >
                                <AlertTriangle className="w-3.5 h-3.5" /> {language === 'vi' ? 'Hủy phòng' : 'Cancel Stay'}
                              </button>
                            )}

                            {(booking.status === 'CHECKED_OUT' || booking.status === 'COMPLETED') && (
                              <button
                                onClick={() => setSelectedReviewBooking(booking)}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1 shadow-sm"
                              >
                                {language === 'vi' ? 'Viết đánh giá' : 'Write Review'}
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 3: Payment Methods */}
          {activeTab === 'payments' && (
            <div className="bg-white border border-slate-150 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h3 className="text-lg sm:text-xl font-extrabold text-slate-800">{language === 'vi' ? 'Phương thức thanh toán nhanh' : 'Saved Cards'}</h3>
                  <p className="text-xs text-slate-400 font-medium mt-1">{language === 'vi' ? 'Thêm thẻ tín dụng/ghi nợ để thanh toán nhanh hơn.' : 'Add credit or debit cards for faster booking.'}</p>
                </div>
                
                <button
                  type="button"
                  onClick={() => setIsAddCardOpen(true)}
                  className="bg-[#006ce4] hover:bg-[#0056b3] text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>{language === 'vi' ? 'Thêm thẻ' : 'Add Card'}</span>
                </button>
              </div>

              {cards.length === 0 ? (
                <div className="text-center py-16 space-y-3 bg-slate-50/50 border border-slate-100 rounded-2xl">
                  <CreditCard className="w-10 h-10 text-slate-350 mx-auto" />
                  <h4 className="font-extrabold text-slate-700">{language === 'vi' ? 'Chưa liên kết thẻ thanh toán' : 'No credit cards linked'}</h4>
                  <p className="text-xs text-slate-455 max-w-xs mx-auto">
                    {language === 'vi' ? 'Liên kết thẻ Visa, Mastercard hoặc JCB để đặt phòng siêu nhanh chỉ với 1 click.' : 'Link Visa, Mastercard or JCB cards to book properties instantly.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      className={`relative rounded-2xl p-5 shadow-md flex flex-col justify-between text-white select-none h-44 overflow-hidden group ${
                        card.cardType === 'visa' ? 'bg-gradient-to-br from-indigo-700 via-purple-700 to-pink-600' :
                        card.cardType === 'mastercard' ? 'bg-gradient-to-br from-red-600 via-orange-600 to-amber-500' :
                        card.cardType === 'jcb' ? 'bg-gradient-to-br from-blue-700 via-sky-655 to-[#006ce4]' :
                        'bg-gradient-to-br from-slate-750 to-slate-900'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="flex justify-between items-start relative z-10">
                        <div>
                          <p className="text-[10px] font-black tracking-widest opacity-80">CLOUD BOOKING CARD</p>
                          {card.isDefault && (
                            <span className="inline-block mt-1 bg-white/20 text-white font-extrabold text-[9px] px-2 py-0.5 rounded border border-white/10 select-none">
                              {language === 'vi' ? 'Mặc định' : 'Default'}
                            </span>
                          )}
                        </div>
                        
                        {/* Brand Logo */}
                        <div className="font-black text-lg italic tracking-wider select-none">
                          {card.cardType === 'visa' && 'VISA'}
                          {card.cardType === 'mastercard' && 'Mastercard'}
                          {card.cardType === 'jcb' && 'JCB'}
                          {card.cardType === 'unknown' && 'CARD'}
                        </div>
                      </div>

                      {/* Card Chip symbol */}
                      <div className="w-9 h-6 bg-amber-400/90 rounded border border-amber-300 relative z-10 overflow-hidden shadow-inner flex flex-col gap-0.5 p-1 select-none">
                        <div className="grid grid-cols-3 gap-0.5 flex-1">
                          <div className="border-r border-slate-500/25"></div>
                          <div className="border-r border-slate-500/25"></div>
                          <div></div>
                        </div>
                      </div>

                      {/* Card Number & Info */}
                      <div className="space-y-1 relative z-10 mt-auto">
                        <p className="font-mono text-base tracking-widest select-all">
                          {`•••• •••• •••• ${card.cardNumber.slice(-4)}`}
                        </p>
                        <div className="flex justify-between items-end text-xs">
                          <div>
                            <span className="text-[8px] block opacity-70 leading-none">CARDHOLDER</span>
                            <span className="font-extrabold tracking-wide uppercase font-mono">{card.cardHolder}</span>
                          </div>
                          <div>
                            <span className="text-[8px] block opacity-70 leading-none">EXPIRES</span>
                            <span className="font-extrabold font-mono">{card.expiryDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Card Hover Delete & Default actions */}
                      <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 z-20 rounded-2xl">
                        {!card.isDefault && (
                          <button
                            type="button"
                            onClick={() => handleSetDefaultCard(card.id)}
                            className="bg-white text-slate-800 font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-md hover:bg-slate-100 transition-colors active:scale-95"
                          >
                            {language === 'vi' ? 'Đặt mặc định' : 'Set Default'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="bg-red-600 hover:bg-red-750 text-white font-extrabold text-xs px-3 py-1.5 rounded-lg shadow-md transition-colors active:scale-95 flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === 'vi' ? 'Xóa thẻ' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 4: Loyalty Points & Perks */}
          {activeTab === 'rewards' && (
            <div className="bg-white border border-slate-150 rounded-2xl shadow-sm p-6 sm:p-8 space-y-6">
              {loyaltyLoading && !loyaltySummary ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 font-semibold text-xs">
                  <span className="animate-spin text-2xl text-blue-500">⌛</span>
                  <span>{language === 'vi' ? 'Đang tải dữ liệu tích điểm...' : 'Loading loyalty rewards data...'}</span>
                </div>
              ) : (
                <>
                  <div className="border-b border-slate-100 pb-4">
                    <h3 className="text-lg sm:text-xl font-extrabold text-slate-800">{language === 'vi' ? 'Điểm thưởng tích lũy' : 'Loyalty Rewards & Levels'}</h3>
                    <p className="text-xs text-slate-400 font-medium mt-1">{language === 'vi' ? 'Đặt phòng tích lũy điểm thưởng để thăng cấp thành viên và nhận chiết khấu trực tiếp.' : 'Book, earn loyalty points, level up, and enjoy direct discounts.'}</p>
                  </div>

              {/* Progress Card */}
              <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm relative overflow-hidden space-y-4 select-none">
                {/* Background lighting */}
                <div className="absolute top-0 right-0 w-44 h-44 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-2xl z-0" />
                
                <div className="flex justify-between items-center relative z-10">
                  <div className="space-y-1">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{language === 'vi' ? 'HẠNG THÀNH VIÊN HIỆN TẠI' : 'CURRENT LOYALTY TIER'}</span>
                    <h4 className={`text-2xl font-black italic tracking-wide uppercase ${
                      loyaltyTier === 'Platinum' ? 'text-cyan-400' :
                      loyaltyTier === 'Gold' ? 'text-amber-400' :
                      loyaltyTier === 'Silver' ? 'text-slate-350' : 'text-amber-600'
                    }`}>
                      {loyaltyTier === 'Bronze' && (language === 'vi' ? 'HẠNG ĐỒNG' : 'BRONZE')}
                      {loyaltyTier === 'Silver' && (language === 'vi' ? 'HẠNG BẠC' : 'SILVER')}
                      {loyaltyTier === 'Gold' && (language === 'vi' ? 'HẠNG VÀNG' : 'GOLD')}
                      {loyaltyTier === 'Platinum' && (language === 'vi' ? 'HẠNG BẠCH KIM' : 'PLATINUM')}
                    </h4>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 block uppercase tracking-widest">{language === 'vi' ? 'ĐIỂM KHẢ DỤNG HỢP LỆ' : 'AVAILABLE POINTS'}</span>
                    <span className="text-2xl font-black text-blue-400">{loyaltyPoints} <span className="text-xs font-bold text-slate-350">{language === 'vi' ? 'điểm' : 'pts'}</span></span>
                  </div>
                </div>

                {/* Progress bar to next level */}
                {loyaltyTier !== 'Platinum' && (
                  <div className="space-y-2 relative z-10 pt-2 border-t border-white/5">
                    <div className="flex justify-between text-xs font-bold text-slate-350">
                      <span>{language === 'vi' ? `Cần thêm ${pointsToNext} điểm để lên hạng ${nextTierName}` : `${pointsToNext} pts to next tier (${nextTierName})`}</span>
                      <span>{loyaltyPoints} / {nextTierPoints}</span>
                    </div>
                    {/* Visual Progress Bar */}
                    <div className="w-full bg-slate-800 rounded-full h-3 overflow-hidden border border-white/5">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min((loyaltyPoints / nextTierPoints) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Warning for expiring points */}
                {expiringSoon > 0 && (
                  <div className="bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs rounded-xl p-3 flex items-center gap-2 relative z-10">
                    <Info className="w-4 h-4 shrink-0 text-amber-400" />
                    <span>
                      {language === 'vi'
                        ? `Chú ý: Bạn có ${expiringSoon} điểm tích lũy sắp hết hạn sử dụng trong 30 ngày tới!`
                        : `Attention: You have ${expiringSoon} points expiring in the next 30 days!`}
                    </span>
                  </div>
                )}
              </div>

              {/* Perks details tables & perks list */}
              <div className="space-y-4 pt-2">
                <h4 className="font-extrabold text-slate-800 text-sm">{language === 'vi' ? 'Quy chế tích lũy và đặc quyền' : 'Tier Benefits & Perks'}</h4>
                
                <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm bg-white text-xs text-slate-700">
                  {/* Header Row */}
                  <div className="grid grid-cols-3 bg-slate-50 border-b border-slate-150 font-black text-slate-655 text-[10px] sm:text-xs uppercase tracking-wider text-center py-3">
                    <div>{language === 'vi' ? 'Hạng thành viên' : 'Loyalty Tier'}</div>
                    <div className="border-x border-slate-200/75">{language === 'vi' ? 'Yêu cầu tích lũy' : 'Requirement'}</div>
                    <div>{language === 'vi' ? 'Đặc quyền thành viên' : 'Benefits & Perks'}</div>
                  </div>

                  {/* Bronze Row */}
                  <div className="grid grid-cols-3 border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-center py-3.5 font-bold">
                    <div className="text-amber-700 uppercase font-black tracking-wide">{language === 'vi' ? 'Đồng (Bronze)' : 'Bronze'}</div>
                    <div className="border-x border-slate-100 text-slate-500 font-semibold">0 - 999 {language === 'vi' ? 'điểm' : 'pts'}</div>
                    <div className="text-slate-600 font-semibold">{language === 'vi' ? 'Tích lũy x1.0 điểm' : 'Earn x1.0 points'}</div>
                  </div>

                  {/* Silver Row */}
                  <div className="grid grid-cols-3 border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-center py-3.5 font-bold">
                    <div className="text-slate-500 uppercase font-black tracking-wide">{language === 'vi' ? 'Bạc (Silver)' : 'Silver'}</div>
                    <div className="border-x border-slate-100 text-slate-500 font-semibold">1,000 - 4,999 {language === 'vi' ? 'điểm' : 'pts'}</div>
                    <div className="text-slate-750 font-semibold text-left pl-4 space-y-0.5 py-2">
                      <p>• {language === 'vi' ? 'Tích lũy x1.1 điểm' : 'Earn x1.1 points'}</p>
                      <p>• {language === 'vi' ? 'Ưu tiên CSKH' : 'Priority Support'}</p>
                    </div>
                  </div>

                  {/* Gold Row */}
                  <div className="grid grid-cols-3 border-b border-slate-100 hover:bg-slate-50/50 transition-colors text-center py-3.5 font-bold">
                    <div className="text-amber-500 uppercase font-black tracking-wide">{language === 'vi' ? 'Vàng (Gold)' : 'Gold'}</div>
                    <div className="border-x border-slate-100 text-slate-500 font-semibold">5,000 - 9,999 {language === 'vi' ? 'điểm' : 'pts'}</div>
                    <div className="text-slate-750 font-semibold text-left pl-4 space-y-0.5 py-2">
                      <p>• {language === 'vi' ? 'Tích lũy x1.25 điểm' : 'Earn x1.25 points'}</p>
                      <p>• {language === 'vi' ? 'Quà & Voucher sinh nhật' : 'Birthday Vouchers'}</p>
                    </div>
                  </div>

                  {/* Platinum Row */}
                  <div className="grid grid-cols-3 hover:bg-slate-50/50 transition-colors text-center py-3.5 font-bold">
                    <div className="text-cyan-600 uppercase font-black tracking-wide">{language === 'vi' ? 'Bạch Kim (Platinum)' : 'Platinum'}</div>
                    <div className="border-x border-slate-100 text-slate-500 font-semibold">Từ 10,000 {language === 'vi' ? 'điểm trở lên' : '10,000+ pts'}</div>
                    <div className="text-slate-750 font-semibold text-left pl-4 space-y-0.5 py-2">
                      <p>• {language === 'vi' ? 'Tích lũy x1.5 điểm' : 'Earn x1.5 points'}</p>
                      <p>• {language === 'vi' ? 'Voucher độc quyền VIP' : 'Exclusive VIP Voucher'}</p>
                      <p>• {language === 'vi' ? 'Hỗ trợ khẩn cấp 24/7' : '24/7 Support'}</p>
                    </div>
                  </div>
                </div>

                {/* Point exchange rules alert */}
                <div className="bg-blue-50/40 border border-blue-100 rounded-2xl p-4 text-xs font-semibold text-slate-700 leading-relaxed space-y-1.5">
                  <p className="flex items-center gap-1.5 font-extrabold text-[#006ce4] text-sm"><Award className="w-5 h-5 shrink-0" /> {language === 'vi' ? 'Quy chế tích điểm và thanh toán:' : 'Earning and spending rules:'}</p>
                  <ul className="list-disc pl-5 space-y-1 text-slate-600 font-medium">
                    <li>{language === 'vi' ? 'Đơn phòng sau khi thanh toán thành công và hoàn tất trả phòng (Checked-out) sẽ tự động cộng điểm tích lũy.' : 'Points are automatically added after check-out is complete on fully paid stays.'}</li>
                    <li>{language === 'vi' ? 'Mỗi 10.000 VNĐ chi tiêu thanh toán sẽ quy đổi tương ứng với 1 điểm thưởng cơ bản.' : 'Each 10,000 VND spent converts to 1 base loyalty point.'}</li>
                    <li>{language === 'vi' ? 'Khi thanh toán đơn tiếp theo, 1 điểm quy đổi = 200 VNĐ. Tối đa khấu trừ không vượt quá 30% giá phòng.' : 'Redeem points at checkout (1 point = 200 VND) up to a maximum of 30% of the total booking price.'}</li>
                    <li>{language === 'vi' ? 'Điểm thưởng có giá trị sử dụng trong vòng 1 năm kể từ thời điểm nhận.' : 'Points expire exactly 1 year from the date they are earned.'}</li>
                  </ul>
                </div>

                {/* Loyalty Notifications Section */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Bell className="w-4 h-4 text-blue-500" />
                    <span>{language === 'vi' ? 'Thông báo về điểm gần đây' : 'Recent Loyalty Notifications'}</span>
                  </h4>
                  
                  {notifications.filter(n => 
                    n.title.toLowerCase().includes('điểm') || 
                    n.title.toLowerCase().includes('hạng') || 
                    n.title.toLowerCase().includes('loyalty') || 
                    n.content.toLowerCase().includes('điểm') || 
                    n.content.toLowerCase().includes('hạng') || 
                    n.content.toLowerCase().includes('loyalty')
                  ).length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-4 text-center text-slate-400 font-medium text-xs">
                      {language === 'vi' ? 'Chưa có thông báo điểm thưởng nào.' : 'No loyalty notifications yet.'}
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                      {notifications.filter(n => 
                        n.title.toLowerCase().includes('điểm') || 
                        n.title.toLowerCase().includes('hạng') || 
                        n.title.toLowerCase().includes('loyalty') || 
                        n.content.toLowerCase().includes('điểm') || 
                        n.content.toLowerCase().includes('hạng') || 
                        n.content.toLowerCase().includes('loyalty')
                      ).slice(0, 5).map(n => (
                        <div key={n.id} className="bg-slate-50/70 border border-slate-100 rounded-xl p-3 text-xs flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="font-extrabold text-slate-800">{n.title}</p>
                            <p className="text-slate-500 font-medium text-[11px]">{n.content}</p>
                          </div>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap ml-2">
                            {formatDateVN(n.createdAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Loyalty History table */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-extrabold text-slate-800 text-sm flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-blue-500" />
                    <span>{language === 'vi' ? 'Lịch sử biến động điểm' : 'Points Transaction History'}</span>
                  </h4>
                  
                  {loyaltyHistory.length === 0 ? (
                    <div className="bg-slate-50 rounded-xl p-4 text-center text-slate-400 font-medium text-xs">
                      {language === 'vi' ? 'Chưa có giao dịch tích điểm nào.' : 'No point transactions yet.'}
                    </div>
                  ) : (
                    <div className="border border-slate-150 rounded-2xl overflow-hidden shadow-sm bg-white text-xs text-slate-700">
                      <div className="grid grid-cols-4 bg-slate-50 border-b border-slate-150 font-black text-slate-655 text-[10px] sm:text-xs uppercase tracking-wider text-center py-2.5">
                        <div>{language === 'vi' ? 'Thời gian' : 'Date'}</div>
                        <div>{language === 'vi' ? 'Loại' : 'Type'}</div>
                        <div>{language === 'vi' ? 'Biến động' : 'Points'}</div>
                        <div>{language === 'vi' ? 'Nội dung' : 'Description'}</div>
                      </div>

                      <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                        {loyaltyHistory.map((h: any) => (
                          <div key={h.id} className="grid grid-cols-4 items-center text-center py-3 font-semibold text-slate-600 hover:bg-slate-50/50 transition-colors">
                            <div className="text-[11px] font-medium text-slate-500">
                              {formatDateVN(h.createdAt)}
                            </div>
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                h.type === 'EARN' ? 'bg-green-50 text-green-700' :
                                h.type === 'REFUND' ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'
                              }`}>
                                {h.type === 'EARN' && (language === 'vi' ? 'Cộng điểm' : 'Earn')}
                                {h.type === 'REFUND' && (language === 'vi' ? 'Hoàn điểm' : 'Refund')}
                                {h.type === 'SPEND' && (language === 'vi' ? 'Tiêu điểm' : 'Spend')}
                              </span>
                            </div>
                            <div className={`font-bold ${h.points > 0 ? 'text-green-600' : 'text-red-500'}`}>
                              {h.points > 0 ? `+${h.points}` : h.points}
                            </div>
                            <div className="text-[11px] font-medium text-slate-500 text-left px-2 line-clamp-1" title={h.description}>
                              {h.description}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
            )}
          </div>
        )}

        </div>

      </div>

      {/* --- MODAL 1: QR Ticket Modal --- */}
      {selectedQrBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-2xl w-full max-w-sm text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-800 text-sm">{language === 'vi' ? 'Vé check-in QR Code' : 'Check-in QR Ticket'}</h3>
              <button
                onClick={() => setSelectedQrBooking(null)}
                className="text-slate-400 hover:text-slate-655 p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-800 text-sm">{selectedQrBooking.bookingItems[0]?.roomType.hotel.name}</h4>
              <p className="text-[10px] text-slate-400 font-medium">Mã đặt phòng: {selectedQrBooking.id.substring(0, 8).toUpperCase()}</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 inline-block mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=booking_id:${selectedQrBooking.id}`}
                alt="QR Code Ticket"
                className="w-44 h-44 bg-white p-2 border border-slate-205 rounded-lg shadow-sm"
              />
            </div>

            <div className="bg-green-50 border border-green-100 rounded-2xl p-3.5 text-left space-y-1 font-semibold text-green-700 text-xs">
              <p className="flex items-center gap-1 font-bold"><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> {language === 'vi' ? 'Hướng dẫn làm thủ tục:' : 'Check-in Guide:'}</p>
              <p className="font-normal text-[10px] text-green-600 leading-relaxed">
                {language === 'vi' 
                  ? 'Vui lòng xuất trình mã QR Code này cho nhân viên lễ tân khi làm thủ tục nhận phòng để tiến hành check-in nhanh không cần giấy tờ.'
                  : 'Present this QR code to the receptionist upon arrival to complete check-in without physical paperwork.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 text-left border-t border-slate-100 pt-4">
              <div>
                <span className="text-[9px] text-slate-450 block">{language === 'vi' ? 'TÊN KHÁCH' : 'GUEST'}</span>
                <span className="line-clamp-1 text-slate-800">{selectedQrBooking.guestName}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-450 block">{language === 'vi' ? 'HẠNG PHÒNG' : 'ROOM TYPE'}</span>
                <span className="line-clamp-1 text-slate-800">{selectedQrBooking.bookingItems[0]?.roomType.name}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 2: Rating & Review Modal --- */}
      {selectedReviewBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleSubmitReview} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-2xl w-full max-w-md space-y-4 text-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-955 text-sm">{language === 'vi' ? 'Viết nhận xét đánh giá' : 'Submit Stay Review'}</h3>
              <button
                type="button"
                onClick={() => setSelectedReviewBooking(null)}
                className="text-slate-400 hover:text-slate-655 p-1 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-800 text-sm">{selectedReviewBooking.bookingItems[0]?.roomType.hotel.name}</h4>
              <p className="text-[10px] text-slate-400 font-medium">Mã đặt phòng: {selectedReviewBooking.id.substring(0, 8).toUpperCase()}</p>
            </div>

            {/* Criteria Scores */}
            <div className="space-y-3 pt-2 text-xs font-bold text-slate-655 border-t border-slate-50">
              {[
                { name: language === 'vi' ? 'Độ sạch sẽ' : 'Cleanliness', value: ratingCleanliness, setter: setRatingCleanliness },
                { name: language === 'vi' ? 'Vị trí' : 'Location', value: ratingLocation, setter: setRatingLocation },
                { name: language === 'vi' ? 'Chất lượng phục vụ' : 'Service', value: ratingService, setter: setRatingService },
                { name: language === 'vi' ? 'Tiện nghi' : 'Facilities', value: ratingFacilities, setter: setRatingFacilities },
                { name: language === 'vi' ? 'Giá trị xứng đáng' : 'Value for money', value: ratingValue, setter: setRatingValue },
              ].map((crit) => (
                <div key={crit.name} className="flex items-center justify-between">
                  <span className="text-slate-700 font-semibold">{crit.name}</span>
                  <div className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => crit.setter(star)}
                        className={`text-base leading-none focus:outline-none transition-all ${
                          star <= crit.value ? 'text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Comment Area */}
            <div className="space-y-1 pt-2 border-t border-slate-50 text-xs font-bold text-slate-655">
              <label className="text-[10px] font-bold text-slate-400 uppercase">{language === 'vi' ? 'Nội dung nhận xét' : 'Your Review Comment'}</label>
              <textarea
                required
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder={language === 'vi' ? 'Chỗ nghỉ sạch sẽ, lễ tân thân thiện...' : 'Property was very clean, staff was friendly...'}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 font-semibold placeholder-slate-400 transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReviewBooking(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
              >
                {language === 'vi' ? 'Quay lại' : 'Back'}
              </button>
              <button
                type="submit"
                disabled={submittingReview || !reviewComment.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
              >
                {submittingReview ? (language === 'vi' ? 'Đang gửi...' : 'Submitting...') : (language === 'vi' ? 'Gửi đánh giá' : 'Submit')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- MODAL 3: Add Card Modal --- */}
      {isAddCardOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleAddCard} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-2xl w-full max-w-sm space-y-4 text-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-955 text-sm">{language === 'vi' ? 'Liên kết thẻ thanh toán' : 'Add New Card'}</h3>
              <button
                type="button"
                onClick={() => setIsAddCardOpen(false)}
                className="text-slate-400 hover:text-slate-655 p-1 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            {/* Visual Credit Card Preview inside form */}
            <div className="bg-gradient-to-br from-indigo-700 to-indigo-900 text-white rounded-xl p-4 space-y-4 shadow select-none">
              <div className="flex justify-between items-start">
                <span className="text-[8px] font-black tracking-widest opacity-85">LINK QUICK PAY</span>
                <span className="font-black text-sm italic">
                  {newCardNumber.startsWith('4') && 'VISA'}
                  {newCardNumber.startsWith('5') && 'Mastercard'}
                  {newCardNumber.startsWith('35') && 'JCB'}
                  {!newCardNumber.startsWith('4') && !newCardNumber.startsWith('5') && !newCardNumber.startsWith('35') && 'CARD'}
                </span>
              </div>
              <p className="font-mono text-sm tracking-wider">
                {newCardNumber ? newCardNumber.replace(/(\d{4})/g, '$1 ').trim() : '•••• •••• •••• ••••'}
              </p>
              <div className="flex justify-between text-[10px]">
                <div>
                  <span className="text-[7px] block opacity-70">HOLDER</span>
                  <span className="font-mono font-bold uppercase">{newCardHolder || 'FULL NAME'}</span>
                </div>
                <div>
                  <span className="text-[7px] block opacity-70">EXPIRES</span>
                  <span className="font-mono font-bold">{newExpiryDate || 'MM/YY'}</span>
                </div>
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-3.5 text-xs font-bold text-slate-650">
              {/* Card Number */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">{language === 'vi' ? 'Số thẻ (16 chữ số)' : 'Card Number'}</label>
                <input
                  type="text"
                  required
                  maxLength={16}
                  value={newCardNumber}
                  onChange={(e) => setNewCardNumber(e.target.value.replace(/\D/g, ''))}
                  placeholder="4000 1234 5678 9010"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 font-semibold"
                />
              </div>

              {/* Cardholder Name */}
              <div className="space-y-1">
                <label className="text-[10px] text-slate-400 uppercase font-bold">{language === 'vi' ? 'Họ và tên chủ thẻ' : 'Cardholder Name'}</label>
                <input
                  type="text"
                  required
                  value={newCardHolder}
                  onChange={(e) => setNewCardHolder(e.target.value)}
                  placeholder="NGUYEN VAN A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 font-semibold uppercase"
                />
              </div>

              {/* Expiry Date & CVV */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">{language === 'vi' ? 'Ngày hết hạn' : 'Expiry Date'}</label>
                  <input
                    type="text"
                    required
                    maxLength={5}
                    value={newExpiryDate}
                    onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length > 2) {
                        val = val.slice(0, 2) + '/' + val.slice(2, 4);
                      }
                      setNewExpiryDate(val);
                    }}
                    placeholder="MM/YY"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 font-semibold text-center"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 uppercase font-bold">CVV</label>
                  <div className="relative">
                    <input
                      type={showCvv ? 'text' : 'password'}
                      required
                      maxLength={3}
                      value={newCvv}
                      onChange={(e) => setNewCvv(e.target.value.replace(/\D/g, ''))}
                      placeholder="•••"
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 font-semibold text-center pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCvv(!showCvv)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-650"
                    >
                      {showCvv ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddCardOpen(false)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-bold transition-all"
              >
                {language === 'vi' ? 'Hủy' : 'Cancel'}
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md"
              >
                {language === 'vi' ? 'Liên kết' : 'Link Card'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* --- TOAST SUCCESS/ERROR BANNER --- */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 font-extrabold px-6 py-4 rounded-xl shadow-2xl z-55 flex items-center gap-3 animate-bounce border ${
          toastType === 'success' ? 'bg-emerald-500 border-emerald-600 text-white' : 'bg-red-500 border-red-600 text-white'
        }`}>
          {toastType === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span>{toastMessage}</span>
        </div>
      )}

    </div>
  );
};

export default Profile;
