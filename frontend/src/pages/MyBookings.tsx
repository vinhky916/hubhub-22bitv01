import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import apiClient from '../core/api/client';
import { formatDateVN } from '../utils/date';
import { formatPrice } from '../utils/price';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { useModal } from '../components/common/ModalContext';
import socket from '../core/socket/socket';
import { 
  Calendar, MapPin, QrCode, CreditCard, Clock, CheckCircle2, AlertTriangle,
  Eye, Users, Building2, Phone, Mail, FileText, X, Check, ArrowRight,
  PhoneCall, MessageSquare, Navigation, HelpCircle, Send, Sparkles
} from 'lucide-react';

interface BookingItem {
  id: string;
  price: number;
  quantity?: number;
  paymentPolicySnapshot?: string;
  roomType: {
    id: string;
    name: string;
    hotelId?: string;
    images?: { url: string }[];
    hotel: {
      id: string;
      name: string;
      address: string;
      images?: { url: string }[];
      province?: { name: string };
      owner?: {
        id?: string;
        phoneNumber?: string;
        email?: string;
      }
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
  numGuests?: number;
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
  createdAt?: string;
}

export const MyBookings: React.FC = () => {
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useModal();
  const { user } = useSelector((state: RootState) => state.auth);
  const { currency } = useSelector((state: RootState) => state.settings);
  const [searchParams] = useSearchParams();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [selectedQrBooking, setSelectedQrBooking] = useState<Booking | null>(null);
  const [selectedDetailBooking, setSelectedDetailBooking] = useState<Booking | null>(null);
  const [selectedContactBooking, setSelectedContactBooking] = useState<Booking | null>(null);
  
  // Realtime Live Chat States
  const [activeLiveChatBooking, setActiveLiveChatBooking] = useState<Booking | null>(null);
  const [activeConversation, setActiveConversation] = useState<any | null>(null);
  const [chatMessagesList, setChatMessagesList] = useState<any[]>([]);
  const [chatInputText, setChatInputText] = useState('');
  const [loadingChat, setLoadingChat] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Review Modal States
  const [selectedReviewBooking, setSelectedReviewBooking] = useState<Booking | null>(null);
  const [ratingCleanliness, setRatingCleanliness] = useState(5);
  const [ratingLocation, setRatingLocation] = useState(5);
  const [ratingService, setRatingService] = useState(5);
  const [ratingFacilities, setRatingFacilities] = useState(5);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Lock body scroll when any modal is open
  const isMyBookingsModalOpen = Boolean(selectedQrBooking || selectedReviewBooking || selectedDetailBooking || selectedContactBooking || activeLiveChatBooking);

  useEffect(() => {
    if (isMyBookingsModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMyBookingsModalOpen]);

  // Payment status query param
  const paymentStatus = searchParams.get('payment');
  const queryBookingId = searchParams.get('bookingId');

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/bookings/my');
      if (res.data.success) {
        setBookings(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch user bookings:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();

    const handleBookingStatusUpdated = () => {
      fetchBookings();
    };

    window.addEventListener('booking:statusUpdated', handleBookingStatusUpdated);

    return () => {
      window.removeEventListener('booking:statusUpdated', handleBookingStatusUpdated);
    };
  }, []);

  // Realtime Live Chat Socket Handlers
  const handleOpenLiveChat = async (booking: Booking) => {
    const item = booking.bookingItems?.[0];
    const hotelId = item?.roomType?.hotel?.id || item?.roomType?.hotelId;
    if (!hotelId) {
      await showAlert("Không tìm thấy thông tin khách sạn để kết nối chat.", { type: 'error' });
      return;
    }

    // Close contact popup if open
    setSelectedContactBooking(null);
    setSelectedDetailBooking(null);
    setActiveLiveChatBooking(booking);
    setLoadingChat(true);

    try {
      const res = await apiClient.post('/chats/conversations', { hotelId });
      if (res.data.success) {
        const conv = res.data.data;
        setActiveConversation(conv);

        const msgRes = await apiClient.get(`/chats/conversations/${conv.id}/messages`);
        if (msgRes.data.success) {
          setChatMessagesList(msgRes.data.data);
        }

        socket.connect();
        if (user?.id) {
          socket.emit('joinUser', user.id);
        }
        socket.emit('joinConversation', conv.id);
      }
    } catch (err) {
      console.error('Failed to initialize chat:', err);
      await showAlert("Không thể khởi tạo cuộc trò chuyện lúc này.", { type: 'error' });
    } finally {
      setLoadingChat(false);
    }
  };

  useEffect(() => {
    if (!activeConversation) return;

    const handleIncomingMessage = (msg: any) => {
      if (msg && (msg.conversationId === activeConversation.id || !msg.conversationId)) {
        setChatMessagesList((prev) => {
          if (prev.some((m) => m.id === msg.id || (m.content === msg.content && m.senderId === msg.senderId && Math.abs(new Date(m.createdAt || 0).getTime() - new Date(msg.createdAt || 0).getTime()) < 3000))) {
            return prev;
          }
          return [...prev, msg];
        });
      }
    };

    socket.on('receiveMessage', handleIncomingMessage);
    socket.on('newMessage', handleIncomingMessage);

    return () => {
      socket.off('receiveMessage', handleIncomingMessage);
      socket.off('newMessage', handleIncomingMessage);
    };
  }, [activeConversation]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessagesList]);

  const handleSendChatMessage = async (customText?: string) => {
    const text = customText || chatInputText;
    if (!text.trim() || !activeConversation || !user?.id) return;

    const contentToPost = text.trim();
    setChatInputText('');

    // Optimistic local update so user sees their message IMMEDIATELY!
    const tempMsg = {
      id: `temp-${Date.now()}`,
      conversationId: activeConversation.id,
      senderId: user.id,
      content: contentToPost,
      createdAt: new Date().toISOString(),
      sender: {
        id: user.id,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl
      }
    };
    setChatMessagesList((prev) => [...prev, tempMsg]);

    setSendingMsg(true);
    try {
      if (!socket.connected) {
        socket.connect();
      }
      socket.emit('joinConversation', activeConversation.id);
      socket.emit('sendMessage', {
        conversationId: activeConversation.id,
        senderId: user.id,
        content: contentToPost
      });
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  const getStatusBadge = (status: string, booking?: Booking) => {
    const isPayAtHotel = booking?.bookingItems?.[0]?.paymentPolicySnapshot?.includes('khách sạn') || booking?.payment?.method === 'hotel';
    const isPaid = booking?.payment?.status === 'COMPLETED';

    switch (status) {
      case 'PENDING':
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-xl font-black text-[10px] uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Chờ thanh toán</span>;
      case 'PAYMENT_PROCESSING':
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-xl font-black text-[10px] uppercase flex items-center gap-1"><Clock className="w-3 h-3" /> Đang xử lý</span>;
      case 'CONFIRMED':
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-xl font-black text-[10px] uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã giữ phòng
            </span>
            {isPaid ? (
              <span className="bg-emerald-100 text-emerald-800 text-[9px] px-2 py-0.5 rounded-full font-extrabold">Đã TT Online</span>
            ) : isPayAtHotel ? (
              <span className="bg-amber-100 text-amber-800 border border-amber-200 text-[9px] px-2 py-0.5 rounded-full font-extrabold">
                🏨 TT tại khách sạn
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[9px] px-2 py-0.5 rounded-full font-extrabold">Chưa thanh toán</span>
            )}
          </div>
        );
      case 'CHECKED_IN':
        return <span className="bg-blue-100 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-xl font-black text-[10px] uppercase">Đã nhận phòng</span>;
      case 'CHECKED_OUT':
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1 rounded-xl font-black text-[10px] uppercase">Đã trả phòng</span>;
      case 'COMPLETED':
        return <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-xl font-black text-[10px] uppercase">Hoàn thành</span>;
      case 'CANCELLED': {
        const isRefunded = booking?.payment?.status === 'REFUNDED';
        return (
          <div className="flex flex-col items-end gap-1">
            <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-1 rounded-xl font-black text-[10px] uppercase flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Đã hủy
            </span>
            {isRefunded && (
              <span className="bg-amber-100 text-amber-800 border border-amber-300 text-[9px] px-2 py-0.5 rounded-full font-extrabold flex items-center gap-1">
                💸 Đã hoàn tiền
              </span>
            )}
          </div>
        );
      }
      default:
        return null;
    }
  };

  const handlePayNow = (booking: Booking) => {
    navigate(`/payment?bookingId=${booking.id}`);
  };

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
      
      setSuccessToast("Gửi đánh giá phòng nghỉ thành công!");
      setTimeout(() => setSuccessToast(''), 3000);
      setSelectedReviewBooking(null);
      setReviewComment('');
      fetchBookings();
    } catch (err) {
      console.error(err);
      await showAlert("Không thể gửi đánh giá phòng nghỉ lúc này.", { type: 'error' });
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight">Lịch sử đặt phòng</h1>
          <p className="text-xs text-slate-500 font-semibold mt-1">Theo dõi, quản lý chi tiết và trải nghiệm vé đặt chỗ nghỉ của bạn</p>
        </div>
        <div className="bg-blue-50 border border-blue-150 text-blue-700 font-black text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-blue-600" />
          <span>{bookings.length} đơn lưu trú</span>
        </div>
      </div>

      {paymentStatus === 'success' && queryBookingId && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-semibold space-y-1 shadow-sm animate-in fade-in duration-300">
          <p className="font-extrabold flex items-center gap-1.5 text-sm text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Thanh toán đặt phòng thành công!
          </p>
          <p className="font-medium text-emerald-700 leading-relaxed">
            Vé check-in và hóa đơn chi tiết đã được gửi về email đăng ký của bạn. Bạn cũng có thể mở mã QR Code vé trực tiếp dưới đây để làm thủ tục nhận phòng.
          </p>
        </div>
      )}

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-slate-100 rounded-3xl h-44 animate-pulse"></div>
          ))}
        </div>
      ) : bookings.length === 0 ? (
        <div className="bg-white border border-slate-200 p-12 text-center rounded-3xl space-y-4 shadow-xs">
          <Calendar className="w-14 h-14 text-slate-300 mx-auto animate-bounce" />
          <div className="space-y-1">
            <h3 className="font-extrabold text-slate-800 text-base">Bạn chưa có đơn đặt phòng nào</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto font-semibold">
              Khám phá ngay hàng nghìn ưu đãi khách sạn, Villa ven biển và Resort cao cấp trên CloudBooking.
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-6 py-3 rounded-xl shadow-md transition-all active:scale-95 inline-flex items-center gap-2"
          >
            Khám phá chỗ nghỉ ngay <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {bookings.map((booking) => {
            const item = booking.bookingItems?.[0];
            const hotel = item?.roomType?.hotel;
            const hotelName = hotel?.name || 'Khách sạn nghỉ dưỡng';
            const hotelAddress = hotel?.address || 'Việt Nam';
            const hotelImg = hotel?.images?.[0]?.url || item?.roomType?.images?.[0]?.url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
            
            const checkInDate = new Date(booking.checkInDate);
            const checkOutDate = new Date(booking.checkOutDate);
            const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
            const guestsCount = booking.numGuests || 2;
            const roomTypeNames = booking.bookingItems?.map(i => `${i.roomType?.name || 'Hạng phòng tiêu chuẩn'}${i.quantity && i.quantity > 1 ? ` (x${i.quantity})` : ''}`).join(', ') || 'Hạng phòng tiêu chuẩn';

            return (
              <div
                key={booking.id}
                className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-[0_4px_16px_rgba(15,23,42,0.03)] hover:shadow-md transition-all p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-5 group"
              >
                <div className="relative w-full sm:w-44 h-44 sm:h-36 shrink-0 rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
                  <img src={hotelImg} alt={hotelName} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                  <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white/20">
                    {nights} đêm lưu trú
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-[11px] text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-xl inline-block shadow-2xs">
                          Mã vé: #{booking.id.substring(0, 8).toUpperCase()}
                        </span>
                      </div>
                      <h3 className="font-black text-slate-800 text-sm sm:text-base leading-snug">{hotelName}</h3>
                      <p className="flex items-center gap-1 text-[11px] text-slate-500 font-medium">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{hotelAddress}</span>
                      </p>
                    </div>
                    <div>
                      {getStatusBadge(booking.status, booking)}
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-semibold">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">HẠNG PHÒNG ĐẶT</span>
                      <span className="text-slate-800 font-black line-clamp-1">{roomTypeNames}</span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">SỐ KHÁCH & ĐÊM</span>
                      <span className="text-slate-800 font-extrabold flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                        {guestsCount} Khách • {nights} đêm
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">THỜI GIAN LƯU TRÚ</span>
                      <span className="text-slate-800 font-bold">
                        {formatDateVN(booking.checkInDate)} &rarr; {formatDateVN(booking.checkOutDate)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1.5 border-t border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase block">TỔNG THÀNH TIỀN</span>
                      <span className="text-rose-600 font-black text-base sm:text-lg">{formatPrice(booking.finalPrice, currency)}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => setSelectedDetailBooking(booking)}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs active:scale-95"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" /> Chi tiết
                      </button>

                      <button
                        onClick={() => setSelectedContactBooking(booking)}
                        className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <PhoneCall className="w-3.5 h-3.5 text-emerald-600" /> Liên hệ KS
                      </button>

                      {booking.status === 'PENDING' && (
                        <button
                          onClick={() => handlePayNow(booking)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 active:scale-95"
                        >
                          <CreditCard className="w-3.5 h-3.5" /> Thanh toán ngay
                        </button>
                      )}

                      {booking.status === 'CONFIRMED' && (
                        <>
                          <button
                            onClick={() => setSelectedQrBooking(booking)}
                            className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 active:scale-95"
                          >
                            <QrCode className="w-3.5 h-3.5" /> Vé QR
                          </button>

                          {booking.payment?.status !== 'COMPLETED' && (
                            <button
                              onClick={() => handlePayNow(booking)}
                              className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-colors shadow-sm flex items-center gap-1.5 active:scale-95"
                            >
                              <CreditCard className="w-3.5 h-3.5" /> Thanh toán Online
                            </button>
                          )}
                        </>
                      )}

                      {(booking.status === 'PENDING' || booking.status === 'PAYMENT_PROCESSING' || booking.status === 'CONFIRMED') && (
                        <button
                          onClick={async () => {
                            const confirmed = await showConfirm(
                              'Bạn có chắc chắn muốn hủy đơn đặt phòng này? Đặt phòng của bạn sẽ bị hủy và phòng sẽ được giải phóng cho khách hàng khác.',
                              { title: 'Xác nhận hủy đặt phòng', type: 'danger', confirmText: 'Hủy phòng' }
                            );
                            if (confirmed) {
                              try {
                                const res = await apiClient.put(`/bookings/${booking.id}/status`, { status: 'CANCELLED' });
                                if (res.data.success || res.status === 200) {
                                  setSuccessToast('Đã hủy đơn đặt phòng thành công!');
                                  setTimeout(() => setSuccessToast(''), 3000);
                                  fetchBookings();
                                }
                              } catch (err: any) {
                                await showAlert(err.response?.data?.message || 'Không thể hủy đơn.', { type: 'error' });
                              }
                            }
                          }}
                          className="bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 font-extrabold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1 active:scale-95"
                        >
                          <AlertTriangle className="w-3.5 h-3.5" /> Hủy phòng
                        </button>
                      )}

                      {(booking.status === 'CHECKED_OUT' || booking.status === 'COMPLETED') && (
                        <button
                          onClick={() => setSelectedReviewBooking(booking)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm active:scale-95"
                        >
                          Viết đánh giá
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: CHI TIẾT ĐƠN ĐẶT PHÒNG (BOOKING DETAIL MODAL) */}
      {selectedDetailBooking && (() => {
        const item = selectedDetailBooking.bookingItems?.[0];
        const hotel = item?.roomType?.hotel;
        const hotelName = hotel?.name || 'Khách sạn lưu trú';
        const hotelAddress = hotel?.address || 'Việt Nam';
        const hotelImg = hotel?.images?.[0]?.url || item?.roomType?.images?.[0]?.url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=600&q=80';
        const hotelPhone = hotel?.owner?.phoneNumber || '0901 234 567';

        const checkInDate = new Date(selectedDetailBooking.checkInDate);
        const checkOutDate = new Date(selectedDetailBooking.checkOutDate);
        const nights = Math.max(1, Math.round((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24)));
        const guestsCount = selectedDetailBooking.numGuests || 2;

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-5 p-6 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h3 className="font-black text-slate-900 text-base uppercase">Chi tiết đơn đặt phòng</h3>
                  <p className="text-[11px] text-slate-400 font-bold">Mã vé: #{selectedDetailBooking.id.substring(0, 8).toUpperCase()}</p>
                </div>
                <button
                  onClick={() => setSelectedDetailBooking(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-extrabold text-sm transition-all"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 bg-slate-50 border border-slate-100 p-4 rounded-2xl">
                <img src={hotelImg} alt={hotelName} className="w-full sm:w-36 h-28 object-cover rounded-xl shrink-0" />
                <div className="space-y-1.5 flex-1 justify-between flex flex-col">
                  <div>
                    <h4 className="font-extrabold text-slate-800 text-sm sm:text-base leading-snug">{hotelName}</h4>
                    <p className="flex items-center gap-1 text-xs text-slate-500 font-medium mt-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{hotelAddress}</span>
                    </p>
                  </div>
                  <div>
                    {getStatusBadge(selectedDetailBooking.status, selectedDetailBooking)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-blue-50/70 border border-blue-100 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black uppercase text-blue-600 block">NHẬN PHÒNG (CHECK-IN)</span>
                  <p className="text-sm font-black text-slate-800">{formatDateVN(selectedDetailBooking.checkInDate)}</p>
                  <p className="text-[11px] font-semibold text-slate-500">Từ 14:00 chiều</p>
                </div>

                <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-2xl space-y-1">
                  <span className="text-[10px] font-black uppercase text-amber-700 block">TRẢ PHÒNG (CHECK-OUT)</span>
                  <p className="text-sm font-black text-slate-800">{formatDateVN(selectedDetailBooking.checkOutDate)}</p>
                  <p className="text-[11px] font-semibold text-slate-500">Trước 12:00 trưa ({nights} đêm)</p>
                </div>
              </div>

              <div className="bg-emerald-50/60 border border-emerald-100 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="font-extrabold text-xs text-emerald-900 uppercase flex items-center gap-1.5">
                    <PhoneCall className="w-4 h-4 text-emerald-600" />
                    Trung tâm liên hệ & Hỗ trợ Lễ tân Khách sạn
                  </h4>
                  <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Phục vụ 24/7</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                  <a
                    href={`tel:${hotelPhone}`}
                    className="bg-white hover:bg-emerald-100/50 border border-emerald-200 p-2.5 rounded-xl flex items-center gap-2.5 text-slate-800 font-bold transition-all shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-semibold">HOTLINE LỄ TÂN</span>
                      <span className="text-emerald-700 font-black">{hotelPhone}</span>
                    </div>
                  </a>

                  <button
                    onClick={() => handleOpenLiveChat(selectedDetailBooking)}
                    className="bg-white hover:bg-blue-50 border border-blue-200 p-2.5 rounded-xl flex items-center gap-2.5 text-slate-800 font-bold transition-all shadow-2xs text-left"
                  >
                    <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-semibold">TIN NHẮN TRỰC TIẾP</span>
                      <span className="text-blue-700 font-black">Chat với Lễ tân</span>
                    </div>
                  </button>

                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelName + ' ' + hotelAddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-white hover:bg-purple-50 border border-purple-200 p-2.5 rounded-xl flex items-center gap-2.5 text-slate-800 font-bold transition-all shadow-2xs"
                  >
                    <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                      <Navigation className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block font-semibold">BẢN ĐỒ BẢO MẬT</span>
                      <span className="text-purple-700 font-black">Xem chỉ đường</span>
                    </div>
                  </a>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">Danh sách hạng phòng & Khách liên hệ</h4>
                
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3 text-xs">
                  {selectedDetailBooking.bookingItems?.map((it, idx) => (
                    <div key={it.id || idx} className="flex justify-between items-center border-b border-slate-200/60 pb-2.5 last:border-0 last:pb-0">
                      <div>
                        <p className="font-black text-slate-800">{it.roomType?.name || 'Hạng phòng nghỉ'}</p>
                        <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Số lượng: {it.quantity || 1} phòng • Sức chứa: {guestsCount} khách</p>
                      </div>
                      <span className="font-extrabold text-slate-700">{formatPrice(it.price || selectedDetailBooking.finalPrice, currency)}</span>
                    </div>
                  ))}

                  <div className="pt-2 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600 font-medium">
                    <p className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-blue-600" /> <span className="font-bold">Khách đại diện:</span> {selectedDetailBooking.guestName}</p>
                    <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-emerald-600" /> <span className="font-bold">SĐT:</span> {selectedDetailBooking.guestPhone}</p>
                    <p className="flex items-center gap-1.5 col-span-1 sm:col-span-2"><Mail className="w-3.5 h-3.5 text-purple-600" /> <span className="font-bold">Email:</span> {selectedDetailBooking.guestEmail}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t border-slate-100 pt-4">
                <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-tight">Chi tiết chi phí & Phương thức thanh toán</h4>
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-2 text-xs font-semibold">
                  <div className="flex justify-between text-slate-500">
                    <span>Giá niêm yết phòng gốc:</span>
                    <span>{formatPrice(selectedDetailBooking.totalPrice, currency)}</span>
                  </div>
                  {selectedDetailBooking.discountAmount > 0 && (
                    <div className="flex justify-between text-rose-500">
                      <span>Voucher / Khuyến mãi giảm giá:</span>
                      <span>-{formatPrice(selectedDetailBooking.discountAmount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-800 font-black text-sm pt-2 border-t border-slate-200">
                    <span>Tổng thanh toán thực tế:</span>
                    <span className="text-rose-600">{formatPrice(selectedDetailBooking.finalPrice, currency)}</span>
                  </div>
                  <div className="pt-2 text-[11px] text-slate-500 font-medium space-y-2 border-t border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600">Phương thức thanh toán khách chọn:</span>
                      <span className="font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-lg">
                        {(() => {
                          const method = (selectedDetailBooking.payment?.method || '').toUpperCase();
                          if (method === 'VNPAY') return 'Thanh toán Online qua cổng VNPay Sandbox';
                          if (method === 'STRIPE') return 'Thanh toán Online qua Thẻ quốc tế (Stripe)';
                          if (method === 'PAYPAL') return 'Thanh toán Online qua Ví PayPal';
                          if (method === 'HOTEL' || method === 'PAY_AT_HOTEL' || method === 'CASH') return 'Thanh toán trực tiếp tại khách sạn (Pay at Hotel)';
                          const snap = selectedDetailBooking.bookingItems?.[0]?.paymentPolicySnapshot;
                          if (snap) return snap;
                          return 'Thanh toán tại khách sạn';
                        })()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-600">Trạng thái giao dịch tiền:</span>
                      <span className={`font-black uppercase text-[10px] px-2.5 py-0.5 rounded-full ${
                        selectedDetailBooking.payment?.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : selectedDetailBooking.payment?.status === 'REFUNDED'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {selectedDetailBooking.payment?.status === 'COMPLETED'
                          ? 'Đã thanh toán Online (100% Khách đã trả)'
                          : selectedDetailBooking.payment?.status === 'REFUNDED'
                          ? 'Đã hoàn tiền lại cho khách'
                          : 'Thanh toán sau khi nhận phòng tại quầy'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                {selectedDetailBooking.status === 'CONFIRMED' && (
                  <button
                    onClick={() => {
                      const b = selectedDetailBooking;
                      setSelectedDetailBooking(null);
                      setSelectedQrBooking(b);
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Xem vé QR
                  </button>
                )}
                <button
                  onClick={() => setSelectedDetailBooking(null)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 2: VÉ ĐIỆN TỬ QR CHECK-IN */}
      {selectedQrBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-2xl w-full max-w-sm text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-800 text-sm uppercase">Vé điện tử Check-in</h3>
              <button
                onClick={() => setSelectedQrBooking(null)}
                className="text-slate-400 hover:text-slate-650 p-1 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-800 text-sm">{selectedQrBooking.bookingItems?.[0]?.roomType?.hotel?.name}</h4>
              <p className="text-[10px] text-slate-400 font-bold">Mã vé: #{selectedQrBooking.id.substring(0, 8).toUpperCase()}</p>
            </div>

            <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 inline-block mx-auto">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=booking_id:${selectedQrBooking.id}`}
                alt="QR Code Ticket"
                className="w-44 h-44 bg-white p-2 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-3 text-left space-y-1 font-semibold text-emerald-800 text-xs">
              <p className="flex items-center gap-1 font-extrabold"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Hướng dẫn thủ tục:</p>
              <p className="font-medium text-[10px] text-emerald-700 leading-relaxed">
                Xuất trình màn hình mã QR Code này cho nhân viên lễ tân khi check-in để làm thủ tục nhận phòng tức thì không cần giấy tờ.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 text-left border-t border-slate-100 pt-4">
              <div>
                <span className="text-[9px] text-slate-400 block font-bold">KHÁCH HÀNG</span>
                <span className="line-clamp-1 font-black text-slate-800">{selectedQrBooking.guestName}</span>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-bold">HẠNG PHÒNG</span>
                <span className="line-clamp-1 font-black text-slate-800">{selectedQrBooking.bookingItems?.[0]?.roomType?.name}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: POPUP LIÊN HỆ TRỰC TIẾP VỚI KHÁCH SẠN */}
      {selectedContactBooking && (() => {
        const item = selectedContactBooking.bookingItems?.[0];
        const hotel = item?.roomType?.hotel;
        const hotelName = hotel?.name || 'Khách sạn lưu trú';
        const hotelAddress = hotel?.address || 'Việt Nam';
        const hotelPhone = hotel?.owner?.phoneNumber || '0901 234 567';

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-2xl w-full max-w-md space-y-5 animate-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-900 text-sm uppercase flex items-center gap-2">
                  <PhoneCall className="w-4.5 h-4.5 text-emerald-600" /> Liên hệ Khách sạn
                </h3>
                <button
                  onClick={() => setSelectedContactBooking(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-xs"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-800 text-sm sm:text-base">{hotelName}</h4>
                <p className="flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{hotelAddress}</span>
                </p>
              </div>

              <div className="space-y-2.5 pt-2">
                <a
                  href={`tel:${hotelPhone}`}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center justify-between transition-all shadow-md active:scale-95"
                >
                  <span className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4" /> Gọi Lễ tân Khách sạn ({hotelPhone})
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </a>

                <button
                  onClick={() => handleOpenLiveChat(selectedContactBooking)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center justify-between transition-all shadow-md active:scale-95"
                >
                  <span className="flex items-center gap-2.5">
                    <MessageSquare className="w-4 h-4" /> Nhắn tin Chat trực tiếp với Lễ tân
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hotelName + ' ' + hotelAddress)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs px-4 py-3 rounded-2xl flex items-center justify-between transition-all active:scale-95"
                >
                  <span className="flex items-center gap-2.5">
                    <Navigation className="w-4 h-4 text-purple-600" /> Mở bản đồ chỉ đường (Google Maps)
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>

              <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-[11px] text-slate-500 space-y-1">
                <p className="font-bold text-slate-700">💡 Gợi ý câu hỏi phổ biến:</p>
                <p>• Xin nhận phòng sớm (Early check-in) / Trả phòng muộn</p>
                <p>• Dịch vụ đưa đón sân bay hoặc chuẩn bị giường phụ/nôi em bé</p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* MODAL 4: HỘP THOẠI CHAT TRỰC TIẾP REALTIME VỚI LỄ TÂN KHÁCH SẠN */}
      {activeLiveChatBooking && (() => {
        const item = activeLiveChatBooking.bookingItems?.[0];
        const hotel = item?.roomType?.hotel;
        const hotelName = hotel?.name || 'Khách sạn';

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-4">
            <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl w-full max-w-md h-[560px] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
              
              <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-sm">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xs sm:text-sm line-clamp-1">{hotelName}</h3>
                    <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      ● Lễ tân đang hoạt động online
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setActiveLiveChatBooking(null);
                    setActiveConversation(null);
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg text-sm font-bold transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-slate-50 border-b border-slate-100 p-2.5 flex items-center gap-2 overflow-x-auto shrink-0 scrollbar-none text-[10px] font-bold text-blue-700">
                <span className="text-slate-400 shrink-0 flex items-center gap-1"><Sparkles className="w-3 h-3 text-amber-500" /> Hỏi nhanh:</span>
                {[
                  'Tôi muốn xin nhận phòng sớm 12h?',
                  'Khách sạn có dịch vụ đón sân bay không?',
                  'Chuẩn bị giúp tôi phòng tầng cao nhé!'
                ].map((pill, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChatMessage(pill)}
                    className="bg-white hover:bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-full shrink-0 shadow-2xs transition-all active:scale-95 text-slate-700 hover:text-blue-700 font-semibold"
                  >
                    {pill}
                  </button>
                ))}
              </div>

              <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 text-xs">
                {loadingChat ? (
                  <div className="flex items-center justify-center h-full text-slate-400 font-bold">
                    Đang kết nối hội thoại với Lễ tân...
                  </div>
                ) : chatMessagesList.length === 0 ? (
                  <div className="text-center py-10 space-y-2 text-slate-400">
                    <MessageSquare className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-bold text-slate-600">Bắt đầu trò chuyện với Lễ tân {hotelName}</p>
                    <p className="text-[10px] text-slate-400 max-w-xs mx-auto font-normal">
                      Mọi thắc mắc về thời gian nhận phòng, yêu cầu đặc biệt hoặc dịch vụ đưa đón sẽ được hỗ trợ ngay lập tức.
                    </p>
                  </div>
                ) : (
                  chatMessagesList.map((msg, idx) => {
                    const isMe = msg.senderId === user?.id;
                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
                      >
                        <span className="text-[9px] text-slate-400 mb-0.5 px-1 font-semibold">
                          {isMe ? 'Bạn' : 'Lễ tân khách sạn'}
                        </span>
                        <div
                          className={`max-w-[80%] p-3 rounded-2xl font-semibold leading-relaxed shadow-2xs ${
                            isMe
                              ? 'bg-blue-600 text-white rounded-br-none'
                              : 'bg-white border border-slate-200 text-slate-800 rounded-bl-none'
                          }`}
                        >
                          {msg.content}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatBottomRef} />
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChatMessage();
                }}
                className="p-3 bg-white border-t border-slate-100 flex items-center gap-2 shrink-0"
              >
                <input
                  type="text"
                  value={chatInputText}
                  onChange={(e) => setChatInputText(e.target.value)}
                  placeholder="Nhập nội dung nhắn tin cho Lễ tân..."
                  className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-800 font-semibold outline-none focus:border-blue-600 focus:bg-white transition-all placeholder-slate-400"
                />
                <button
                  type="submit"
                  disabled={sendingMsg || !chatInputText.trim()}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white p-2.5 rounded-xl transition-all shadow-md active:scale-95 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 5: VIẾT ĐÁNH GIÁ (REVIEW SUBMISSION MODAL) */}
      {selectedReviewBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleSubmitReview} className="bg-white border border-slate-100 p-6 rounded-3xl shadow-2xl w-full max-w-md space-y-4 text-slate-800 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-950 text-sm uppercase">Viết đánh giá phòng nghỉ</h3>
              <button
                type="button"
                onClick={() => setSelectedReviewBooking(null)}
                className="text-slate-400 hover:text-slate-655 p-1 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="font-extrabold text-slate-800 text-sm">{selectedReviewBooking.bookingItems?.[0]?.roomType?.hotel?.name}</h4>
              <p className="text-[10px] text-slate-400 font-bold">Mã vé: #{selectedReviewBooking.id.substring(0, 8).toUpperCase()}</p>
            </div>

            <div className="space-y-3 pt-2 text-xs font-bold text-slate-600 border-t border-slate-50">
              {[
                { name: 'Độ sạch sẽ', value: ratingCleanliness, setter: setRatingCleanliness },
                { name: 'Vị trí', value: ratingLocation, setter: setRatingLocation },
                { name: 'Dịch vụ phục vụ', value: ratingService, setter: setRatingService },
                { name: 'Tiện nghi', value: ratingFacilities, setter: setRatingFacilities },
                { name: 'Giá trị xứng đáng', value: ratingValue, setter: setRatingValue },
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

            <div className="space-y-1 pt-2 border-t border-slate-50 text-xs font-bold text-slate-600">
              <label className="text-[10px] font-bold text-slate-400 uppercase">Ý kiến nhận xét của bạn</label>
              <textarea
                required
                rows={3}
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                placeholder="Khách sạn sạch sẽ, nhân viên thân thiện, đồ ăn sáng ngon..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 font-semibold placeholder-slate-400 transition-all"
              />
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedReviewBooking(null)}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl text-xs font-extrabold transition-all"
              >
                Quay lại
              </button>
              <button
                type="submit"
                disabled={submittingReview || !reviewComment.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white px-5 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95"
              >
                {submittingReview ? 'Đang gửi...' : 'Gửi đánh giá'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Success Toast */}
      {successToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white font-extrabold px-6 py-4 rounded-2xl shadow-2xl z-[9999] flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}
    </div>
  );
};
export default MyBookings;
