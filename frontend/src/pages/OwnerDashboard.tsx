import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import apiClient from '../core/api/client';
import { formatDateVN, formatDateTimeVN } from '../utils/date';
import { useModal } from '../components/common/ModalContext';
import { io, Socket } from 'socket.io-client';
import {
  Percent, Plus, Search, Bell, MessageSquare,
  Sun, Moon, Globe, LogOut, Settings, User, Menu,
  Hotel, Bed, CalendarRange, CreditCard, Star, FileText, BarChart3,
  CheckCircle, Trash2, ChevronDown, Sliders, RefreshCw, X,
  Download, Send, ShieldAlert, Edit3, Upload, Users,
  DollarSign, TrendingUp, TrendingDown, RotateCcw, ShieldCheck, Lock, Zap, Clock, MapPin, Building2, ThumbsUp
} from 'lucide-react';
import OwnerStaffManagement from '../components/owner/OwnerStaffManagement';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, BarChart, Cell, Legend
} from 'recharts';
import { CustomSelect } from '../components/common/CustomSelect';
import { formatNumberDots } from '../utils/price';
import { PropertyTypeIcon, BedTypeIcon } from '../components/common/OutlineIcon';
import { exportToExcel } from '../utils/exportExcel';

// --- Interfaces ---
interface Booking {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  totalPrice: number;
  discountAmount: number;
  finalPrice: number;
  status: string;
  guestName: string;
  guestPhone: string;
  guestEmail: string;
  notes?: string;
  internalNotes?: string;
  numGuests: number;
  createdAt: string;
  pointsUsed: number;
  pointsDiscount: number;
  insuranceSelected: boolean;
  bookingItems: {
    id: string;
    price: number;
    quantity: number;
    roomNumbers?: string;
    ratePlanName?: string;
    cancellationPolicySnapshot?: string;
    paymentPolicySnapshot?: string;
    roomType: {
      id: string;
      name: string;
      capacity?: number;
      hotel: {
        id: string;
        name: string;
        checkInTime?: string;
        checkOutTime?: string;
      };
    };
  }[];
  payment?: {
    id: string;
    amount: number;
    method: string;
    status: string;
    transactionId?: string;
    paidAt?: string;
  };
}

interface RoomType {
  id: string;
  name: string;
  basePrice: number;
  description?: string;
  capacity?: number;
  bedCount?: number;
  bedType?: string;
  size?: number;
  amenities?: string[];
  images?: { url: string; isPrimary: boolean }[];
  rooms?: any[];
  includeBreakfast?: boolean;
  childSurcharge?: number;
  cancellationPolicy?: string;
  paymentPolicy?: string;
  ratePlans?: any[];
}

interface Conversation {
  id: string;
  customer: { fullName: string; avatarUrl: string | null };
  hotel: { name: string };
  messages: { content: string; createdAt: string }[];
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: { id: string; fullName: string; avatarUrl: string | null };
}

const PRESET_BED_TYPES = [
  { id: 'king', name: 'Giường King Size', desc: '2m x 2m', icon: <BedTypeIcon type="king" className="w-4 h-4 text-blue-600" /> },
  { id: 'queen', name: 'Giường Queen Size', desc: '1m8 x 2m', icon: <BedTypeIcon type="queen" className="w-4 h-4 text-blue-600" /> },
  { id: 'double', name: 'Giường Đôi (Double)', desc: '1m5 x 2m', icon: <BedTypeIcon type="double" className="w-4 h-4 text-blue-600" /> },
  { id: 'single', name: 'Giường Đơn (Single)', desc: '1m2 x 2m', icon: <BedTypeIcon type="single" className="w-4 h-4 text-blue-600" /> },
  { id: 'sofa', name: 'Giường Sofa (Sofa Bed)', desc: 'Giường xếp phòng khách', icon: <BedTypeIcon type="sofa" className="w-4 h-4 text-blue-600" /> },
  { id: 'bunk', name: 'Giường Tầng (Bunk Bed)', desc: 'Phòng Dorm / Gia đình', icon: <BedTypeIcon type="bunk" className="w-4 h-4 text-blue-600" /> },
  { id: 'superking', name: 'Giường Super King', desc: '2m2 x 2m', icon: <BedTypeIcon type="superking" className="w-4 h-4 text-blue-600" /> },
];

const getPropertyTypeConfig = (type: string) => {
  switch (type) {
    case 'VILLA':
      return {
        titleAdd: 'Tạo Villa / Căn biệt thự mới',
        titleEdit: 'Chỉnh sửa Villa / Căn biệt thự',
        subtitle: 'Nhập thông tin chi tiết, phòng ngủ, phòng tắm, tiện ích và chính sách cho Villa của bạn.',
        nameLabel: 'Tên Villa / Căn biệt thự *',
        namePlaceholder: 'Ví dụ: Villa 4 Phòng Ngủ Hướng Biển / Executive Ocean Villa',
        countLabel: 'Số lượng căn Villa hiện có *',
        countPlaceholder: '1',
        sizeLabel: 'Khuôn viên / Diện tích Villa (m²) *',
        sizePlaceholder: '150',
        showBedrooms: true,
        showBathrooms: true,
        showMultiBed: true,
        showBreakfast: true,
        bedroomLabel: 'Số phòng ngủ *',
        bathroomLabel: 'Số phòng tắm / WC *',
        amenitiesTitle: 'Tiện ích Villa & Bếp riêng',
        presetAmenities: [
          'Bếp ăn riêng đầy đủ', 'Sân nướng BBQ', 'Hồ bơi riêng', 'Máy giặt & Sấy',
          'Tủ lạnh Side-by-Side', 'Lò vi sóng', 'Dụng cụ nấu ăn', 'Sofa phòng khách',
          'Sân vườn rộng', 'Loa kéo Karaoke', 'Ban công / Hiên hóng mát', 'Điều hòa các phòng',
          'Wifi tốc độ cao', 'Bãi đỗ xe riêng', 'Bàn ăn lớn', 'Két an toàn'
        ]
      };
    case 'APARTMENT':
      return {
        titleAdd: 'Tạo loại Căn hộ mới',
        titleEdit: 'Chỉnh sửa Căn hộ',
        subtitle: 'Nhập thông tin chi tiết, số phòng ngủ, phòng tắm và chính sách cho Căn hộ của bạn.',
        nameLabel: 'Tên loại Căn hộ *',
        namePlaceholder: 'Ví dụ: Căn hộ 2 Phòng Ngủ Central Park / Studio View Sông',
        countLabel: 'Số lượng căn hộ tương tự *',
        countPlaceholder: '1',
        sizeLabel: 'Diện tích căn hộ (m²) *',
        sizePlaceholder: '65',
        showBedrooms: true,
        showBathrooms: true,
        showMultiBed: true,
        showBreakfast: false,
        bedroomLabel: 'Số phòng ngủ *',
        bathroomLabel: 'Số phòng tắm / WC *',
        amenitiesTitle: 'Tiện ích Căn hộ & Bếp',
        presetAmenities: [
          'Bếp ăn riêng', 'Tủ lạnh dung tích lớn', 'Máy giặt riêng', 'Lò vi sóng',
          'Dụng cụ nấu nướng', 'Bàn ăn gia đình', 'Sofa phòng khách', 'Ban công phơi đồ',
          'Điều hòa', 'Smart TV', 'Bàn làm việc', 'Wifi tốc độ cao', 'Máy sấy tóc',
          'Ấm đun nước', 'Thang máy tòa nhà', 'Bãi đỗ xe hầm'
        ]
      };
    case 'HOMESTAY':
      return {
        titleAdd: 'Tạo phòng / Căn Homestay mới',
        titleEdit: 'Chỉnh sửa Homestay',
        subtitle: 'Nhập thông tin chi tiết không gian, tiện ích trải nghiệm và giá cho Homestay của bạn.',
        nameLabel: 'Tên phòng / Căn Homestay *',
        namePlaceholder: 'Ví dụ: Nguyên Căn Homestay Mây Núi 3PN / Phòng Rose Room',
        countLabel: 'Số lượng phòng / Căn tương tự *',
        countPlaceholder: '1',
        sizeLabel: 'Diện tích không gian (m²) *',
        sizePlaceholder: '45',
        showBedrooms: true,
        showBathrooms: true,
        showMultiBed: true,
        showBreakfast: true,
        bedroomLabel: 'Số phòng ngủ *',
        bathroomLabel: 'Số phòng tắm / WC *',
        amenitiesTitle: 'Tiện ích Homestay & Trải nghiệm',
        presetAmenities: [
          'Wifi', 'Điều hòa', 'Sân nướng BBQ', 'Bếp dùng chung/riêng', 'Máy giặt',
          'Tủ lạnh', 'Ấm đun nước', 'Loa kéo âm thanh', 'Đốt lửa trại', 'Bàn trà sân vườn',
          'Sân vườn check-in', 'Thuê xe máy', 'Máy sấy tóc', 'Dép đi trong nhà', 'Bàn làm việc'
        ]
      };
    case 'RESORT':
      return {
        titleAdd: 'Tạo hạng phòng / Bungalow Resort mới',
        titleEdit: 'Chỉnh sửa hạng phòng / Bungalow Resort',
        subtitle: 'Cấu hình chi tiết các hạng phòng, Villa ven biển hoặc Bungalow nghỉ dưỡng của bạn.',
        nameLabel: 'Tên hạng phòng / Bungalow *',
        namePlaceholder: 'Ví dụ: Oceanfront Bungalow / Beachfront Villa Suite',
        countLabel: 'Số phòng / Bungalow hiện có *',
        countPlaceholder: '5',
        sizeLabel: 'Diện tích phòng / Bungalow (m²) *',
        sizePlaceholder: '50',
        showBedrooms: false,
        showBathrooms: false,
        showMultiBed: false,
        showBreakfast: true,
        bedroomLabel: 'Số phòng ngủ',
        bathroomLabel: 'Số phòng tắm',
        amenitiesTitle: 'Tiện nghi Resort cao cấp',
        presetAmenities: [
          'Wifi', 'Điều hòa', 'Smart TV', 'Tủ lạnh mini', 'Bồn tắm sục Jacuzzi',
          'Hiên hóng mát / Ban công', 'Lối ra bãi biển riêng', 'Ấm đun siêu tốc',
          'Két an toàn', 'Máy sấy tóc', 'Áo khoác tắm', 'Dép đi trong nhà',
          'Bàn làm việc', 'Sàn gỗ cao cấp', 'Dịch vụ phòng 24/7'
        ]
      };
    case 'GUESTHOUSE':
      return {
        titleAdd: 'Tạo hạng phòng Nhà nghỉ mới',
        titleEdit: 'Chỉnh sửa hạng phòng Nhà nghỉ',
        subtitle: 'Nhập đầy đủ thông tin phòng, loại giường và giá niêm yết cho Nhà nghỉ.',
        nameLabel: 'Tên hạng phòng nhà nghỉ *',
        namePlaceholder: 'Ví dụ: Phòng Đơn Tiêu Chuẩn / Phòng Đôi Máy Lạnh',
        countLabel: 'Số lượng phòng hiện có *',
        countPlaceholder: '5',
        sizeLabel: 'Diện tích phòng (m²) *',
        sizePlaceholder: '20',
        showBedrooms: false,
        showBathrooms: false,
        showMultiBed: false,
        showBreakfast: false,
        bedroomLabel: 'Số phòng ngủ',
        bathroomLabel: 'Số phòng tắm',
        amenitiesTitle: 'Tiện ích phòng',
        presetAmenities: [
          'Wifi miễn phí', 'Điều hòa', 'Tivi treo tường', 'Tủ lạnh mini',
          'Toilet riêng', 'Máy sấy tóc', 'Ấm đun nước', 'Dép đi trong nhà',
          'Bàn ghế nhỏ', 'Quạt máy', 'Nước uống miễn phí'
        ]
      };
    case 'HOTEL':
    default:
      return {
        titleAdd: 'Tạo hạng phòng khách sạn mới',
        titleEdit: 'Chỉnh sửa hạng phòng khách sạn',
        subtitle: 'Nhập đầy đủ thông tin chi tiết, hình ảnh và chính sách cho hạng phòng của bạn.',
        nameLabel: 'Tên hạng phòng *',
        namePlaceholder: 'Ví dụ: Standard Double Room / Deluxe Ocean View Suite',
        countLabel: 'Số phòng hiện có *',
        countPlaceholder: '5',
        sizeLabel: 'Diện tích phòng (m²) *',
        sizePlaceholder: '35',
        showBedrooms: false,
        showBathrooms: false,
        showMultiBed: false,
        showBreakfast: true,
        bedroomLabel: 'Số phòng ngủ',
        bathroomLabel: 'Số phòng tắm',
        amenitiesTitle: 'Tiện ích phòng',
        presetAmenities: [
          'Wifi', 'Điều hòa', 'Tivi', 'Tủ lạnh', 'Bồn tắm', 'Ban công',
          'Ấm đun nước', 'Dép đi trong nhà', 'Két an toàn', 'Máy sấy tóc',
          'Bàn làm việc', 'Sàn gỗ'
        ]
      };
  }
};

export const OwnerDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const { showAlert, showConfirm, showPrompt } = useModal();

  // Layout States
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeMenu, setActiveMenu] = useState<
    'dashboard' | 'hotel' | 'rooms' | 'bookings' | 'calendar' | 'promotions' | 'customers' | 'reviews' | 'reports' | 'finance' | 'support' | 'settings' | 'staff'
  >('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [successToast, setSuccessToast] = useState('');

  // Dropdowns & Filters
  const [chartTimeFrame, setChartTimeFrame] = useState<'month' | 'week' | 'day'>('month');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Common UI Filters / Modals
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoomTypeId, setSelectedRoomTypeId] = useState('');
  const [bookingStatusFilter, setBookingStatusFilter] = useState('ALL');

  // Booking Management States
  const [hotelsList, setHotelsList] = useState<{ id: string; name: string }[]>([]);
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('ALL');
  const [filterHotelId, setFilterHotelId] = useState('ALL');
  const [filterRoomTypeId, setFilterRoomTypeId] = useState('ALL');
  const [filterCreatedDate, setFilterCreatedDate] = useState('');
  const [filterCheckInDate, setFilterCheckInDate] = useState('');
  const [filterCheckOutDate, setFilterCheckOutDate] = useState('');

  // Booking Detail Modal States
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<'info' | 'payment' | 'notes'>('info');
  const [roomAssignmentsInput, setRoomAssignmentsInput] = useState<{ [itemId: string]: string }>({});
  const [internalNotesInput, setInternalNotesInput] = useState('');
  const [checkInDateInput, setCheckInDateInput] = useState('');
  const [checkOutDateInput, setCheckOutDateInput] = useState('');
  const [timelineLogs, setTimelineLogs] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [savingAssignments, setSavingAssignments] = useState(false);
  const [savingDates, setSavingDates] = useState(false);

  // Real States
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [calendarDays, setCalendarDays] = useState<any[]>([]);
  const [calendarMonthDate, setCalendarMonthDate] = useState<Date>(new Date());
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [editDay, setEditDay] = useState<any | null>(null);
  const [newPrice, setNewPrice] = useState('');
  const [newBlocked, setNewBlocked] = useState(false);

  // --- Owner Stats States ---
  const [stats, setStats] = useState<any>({
    todayBookings: 0, upcomingCheckIn: 0, upcomingCheckOut: 0,
    availableRooms: 0, occupiedRooms: 0, revenueToday: 0, revenueMonth: 0,
    averageRating: 0, occupancyRate: 0, cancellationRate: 0,
    financials: { grossRevenue: 0, platformCommission: 0, netPayout: 0, totalRefunded: 0, pendingPayout: 0, commissionRate: 10 }
  });
  const [financialTransactions, setFinancialTransactions] = useState<any[]>([]);
  const [financeSearch, setFinanceSearch] = useState('');
  const [financePayoutFilter, setFinancePayoutFilter] = useState('ALL');
  const [financePage, setFinancePage] = useState(1);

  const [chartData, setChartData] = useState<any[]>([]);
  const [occupancyData, setOccupancyData] = useState<any[]>([]);
  const [recentReviews, setRecentReviews] = useState<any[]>([]);

  // Chat States
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConv, setActiveConv] = useState<Conversation | null>(null);
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [inputMsg, setInputMsg] = useState('');
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const notificationsDropdownRef = useRef<HTMLDivElement>(null);

  // Hotel Info States
  const [hotelId, setHotelId] = useState('');
  const [hotelName, setHotelName] = useState('Rex Hotel Plaza');
  const [hotelDesc, setHotelDesc] = useState('Khách sạn trung tâm đẳng cấp 5 sao với đầy đủ hồ bơi vô cực, rooftop bar và trung tâm hội nghị.');
  const [checkInTime, setCheckInTime] = useState('14:00');
  const [checkOutTime, setCheckOutTime] = useState('12:00');
  const [hotelPolicies, setHotelPolicies] = useState('Không hút thuốc trong phòng, không mang theo thú cưng.');

  // Administrative regions
  const [provinces, setProvinces] = useState<{ id: string; name: string }[]>([]);
  const [districts, setDistricts] = useState<{ id: string; name: string }[]>([]);
  const [wards, setWards] = useState<{ id: string; name: string }[]>([]);

  const [provinceId, setProvinceId] = useState('');
  const [districtId, setDistrictId] = useState('');
  const [wardId, setWardId] = useState('');
  const [hotelAddress, setHotelAddress] = useState('');
  const [hotelLat, setHotelLat] = useState<number | ''>('');
  const [hotelLng, setHotelLng] = useState<number | ''>('');
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [locationMsg, setLocationMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // 1. Geocode address automatically using OpenStreetMap Nominatim API
  const handleGeocodeFromAddress = async () => {
    setLocationMsg(null);
    const selProvince = provinces.find(p => p.id === provinceId)?.name || '';
    const selDistrict = districts.find(d => d.id === districtId)?.name || '';
    const selWard = wards.find(w => w.id === wardId)?.name || '';

    const addressParts = [hotelAddress, selWard, selDistrict, selProvince, 'Việt Nam']
      .map(s => s.trim())
      .filter(Boolean);

    if (addressParts.length < 2) {
      setLocationMsg({ text: 'Vui lòng chọn Tỉnh/Thành, Quận/Huyện hoặc nhập địa chỉ trước khi lấy tọa độ!', error: true });
      return;
    }

    const fullQuery = addressParts.join(', ');
    setIsGeocoding(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fullQuery)}&limit=1`);
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = Number(parseFloat(data[0].lat).toFixed(6));
        const lng = Number(parseFloat(data[0].lon).toFixed(6));
        setHotelLat(lat);
        setHotelLng(lng);
        setLocationMsg({ text: `✓ Đã tự động lấy tọa độ thành công từ địa chỉ: Vĩ độ ${lat}, Kinh độ ${lng}` });
      } else {
        const fallbackQuery = [selWard, selDistrict, selProvince, 'Việt Nam'].filter(Boolean).join(', ');
        const fbRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(fallbackQuery)}&limit=1`);
        const fbData = await fbRes.json();

        if (fbData && fbData.length > 0) {
          const lat = Number(parseFloat(fbData[0].lat).toFixed(6));
          const lng = Number(parseFloat(fbData[0].lon).toFixed(6));
          setHotelLat(lat);
          setHotelLng(lng);
          setLocationMsg({ text: `✓ Đã tự động lấy tọa độ theo Phường/Quận/Tỉnh: Vĩ độ ${lat}, Kinh độ ${lng}` });
        } else {
          setLocationMsg({ text: 'Không tìm thấy tọa độ tự động cho địa chỉ này. Bạn có thể bấm chọn GPS hoặc dán link Google Maps bên dưới.', error: true });
        }
      }
    } catch (err) {
      console.error(err);
      setLocationMsg({ text: 'Lỗi kết nối dịch vụ định vị địa chỉ. Vui lòng chọn GPS thiết bị hoặc dán link Google Maps.', error: true });
    } finally {
      setIsGeocoding(false);
    }
  };

  // 2. Browser GPS Geolocation API
  const handleGetGPSLocation = () => {
    setLocationMsg(null);
    if (!navigator.geolocation) {
      setLocationMsg({ text: 'Trình duyệt không hỗ trợ tự định vị GPS.', error: true });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        setHotelLat(lat);
        setHotelLng(lng);
        setLocationMsg({ text: `✓ Đã tự động cập nhật vị trí GPS hiện tại: Vĩ độ ${lat}, Kinh độ ${lng}` });
      },
      (err) => {
        console.error(err);
        setLocationMsg({ text: 'Không thể lấy GPS. Hãy đảm bảo bạn đã cấp quyền truy cập vị trí trên trình duyệt!', error: true });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 3. Parse Google Maps link / share link
  const handleParseGoogleMapsUrl = (url: string) => {
    setGoogleMapsUrl(url);
    setLocationMsg(null);
    if (!url.trim()) return;

    let match = url.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);

    if (!match) {
      match = url.match(/(?:q|ll|query|center)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    }

    if (!match) {
      const matchLat = url.match(/!3d(-?\d+\.\d+)/);
      const matchLng = url.match(/!4d(-?\d+\.\d+)/);
      if (matchLat && matchLng) {
        match = [url, matchLat[1], matchLng[1]];
      }
    }

    if (match && match[1] && match[2]) {
      const lat = Number(parseFloat(match[1]).toFixed(6));
      const lng = Number(parseFloat(match[2]).toFixed(6));
      setHotelLat(lat);
      setHotelLng(lng);
      setLocationMsg({ text: `✓ Đã bóc tách tọa độ từ Google Maps thành công: Vĩ độ ${lat}, Kinh độ ${lng}` });
    } else {
      setLocationMsg({ text: 'Chưa bóc tách được tọa độ từ link này. Vui lòng dùng link Google Maps chứa định dạng vị trí (@vĩđộ,kinhđộ).', error: true });
    }
  };

  const [categoryId, setCategoryId] = useState('');
  const [starRating, setStarRating] = useState<number>(3);
  const [propertyType, setPropertyType] = useState<'HOTEL' | 'APARTMENT' | 'VILLA' | 'RESORT' | 'HOMESTAY' | 'GUESTHOUSE'>('HOTEL');

  const [systemAmenities, setSystemAmenities] = useState<{ id: string; name: string; icon?: string | null }[]>([]);
  const [systemCategories, setSystemCategories] = useState<{ id: string; name: string }[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [customAmenityName, setCustomAmenityName] = useState('');
  const [customAmenityCategory, setCustomAmenityCategory] = useState('general');
  const [isAmenitiesModalOpen, setIsAmenitiesModalOpen] = useState(false);
  const [hotelImages, setHotelImages] = useState<{ url: string; isPrimary: boolean }[]>([]);
  const [newImageUrl, setNewImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // Owner promotions (coupons)
  const [coupons, setCoupons] = useState<any[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState('');
  const [newCouponDesc, setNewCouponDesc] = useState('');
  const [newCouponType, setNewCouponType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [newCouponValue, setNewCouponValue] = useState('');
  const [newCouponMinOrderValue, setNewCouponMinOrderValue] = useState('');
  const [newCouponMaxDiscountAmount, setNewCouponMaxDiscountAmount] = useState('');
  const [newCouponLimit, setNewCouponLimit] = useState('');
  const [newCouponDailyLimit, setNewCouponDailyLimit] = useState('');
  const [newCouponTargetUserType, setNewCouponTargetUserType] = useState<'ALL' | 'NEW' | 'VIP'>('ALL');
  const [newCouponStart, setNewCouponStart] = useState(`${new Date().toISOString().split('T')[0]}T08:00`);
  const [newCouponEnd, setNewCouponEnd] = useState('');

  // Rate Plan States
  const [selectedRoomTypeForRatePlans, setSelectedRoomTypeForRatePlans] = useState<any | null>(null);
  const [ratePlansList, setRatePlansList] = useState<any[]>([]);
  const [loadingRatePlans, setLoadingRatePlans] = useState(false);
  const [showAddRatePlanForm, setShowAddRatePlanForm] = useState(false);
  const [editingRatePlan, setEditingRatePlan] = useState<any | null>(null);
  const [newRatePlan, setNewRatePlan] = useState({
    name: '',
    description: '',
    priceModifierType: 'FIXED_PRICE',
    priceModifierValue: 0,
    paymentPolicy: 'PAY_AT_HOTEL',
    cancellationPolicy: 'FREE_CANCEL',
    freeCancelDaysBefore: 1,
    freeCancelHoursBefore: 24,
    cancellationFeeType: 'FIRST_NIGHT',
    noShowPolicy: 'PERCENT_100'
  });

  // Owner reviews list (all reviews for owner's hotel)
  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [allReviewsLoading, setAllReviewsLoading] = useState(false);
  const [replyingReviewId, setReplyingReviewId] = useState<string | null>(null);
  const [replyInputText, setReplyInputText] = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Room numbers bulk management state
  const [managingRoomTypeForNumbers, setManagingRoomTypeForNumbers] = useState<any | null>(null);
  const [inputRoomNumbersList, setInputRoomNumbersList] = useState<string[]>([]);
  const [newSingleRoomInput, setNewSingleRoomInput] = useState('');
  const [autoTargetFloor, setAutoTargetFloor] = useState(1);
  const [autoRoomsPerFloor, setAutoRoomsPerFloor] = useState(5);
  const [autoGenMode, setAutoGenMode] = useState<'SINGLE_FLOOR' | 'MULTI_FLOOR'>('SINGLE_FLOOR');
  const [savingRoomNumbers, setSavingRoomNumbers] = useState(false);

  // Create Room State
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [editingRoomType, setEditingRoomType] = useState<any | null>(null);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomPrice, setNewRoomPrice] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState('2');
  const [newRoomBedCount, setNewRoomBedCount] = useState('1');
  const [newRoomBedType, setNewRoomBedType] = useState('Giường Đôi');
  const [newRoomBedroomCount, setNewRoomBedroomCount] = useState('1');
  const [newRoomBathroomCount, setNewRoomBathroomCount] = useState('1');

  // Reports & Financial Filters (Custom Date & Presets)
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');

  // Helper filter function for bookings by date range AND currently selected hotel
  const filterBookingsByDateRange = (list: any[]) => {
    return list.filter(b => {
      if (!b) return false;

      // Filter strictly by currently selected hotel
      if (hotelId && hotelId !== 'ALL') {
        const bHotelId = b.hotelId || b.hotel?.id || b.bookingItems?.[0]?.roomType?.hotelId || b.bookingItems?.[0]?.hotelId;
        if (bHotelId && bHotelId !== hotelId) {
          return false;
        }
      }

      // Filter by Date Range
      const bDate = new Date(b.createdAt || b.checkInDate).getTime();
      if (reportStartDate) {
        const start = new Date(reportStartDate).setHours(0, 0, 0, 0);
        if (bDate < start) return false;
      }
      if (reportEndDate) {
        const end = new Date(reportEndDate).setHours(23, 59, 59, 999);
        if (bDate > end) return false;
      }
      return true;
    });
  };

  const handleExportCustomersExcel = () => {
    const custs = getUniqueCustomers();
    if (!custs || custs.length === 0) {
      showAlert(language === 'vi' ? 'Không có dữ liệu khách hàng để xuất!' : 'No customer data to export!');
      return;
    }
    const data = custs.map(c => ({
      'Tên Khách Hàng': c.guestName,
      'Số Điện Thoại': c.guestPhone,
      'Email': c.guestEmail,
      'Tổng Số Đơn Đặt': c.totalBookings,
      'Tổng Tiền Tích Lũy (VNĐ)': Number(c.totalSpent) || 0
    }));
    exportToExcel(data, `Danh_Sach_Khach_Hang_${new Date().toISOString().slice(0, 10)}`, 'Khách Hàng');
  };

  const handleExportRoomsExcel = () => {
    if (!roomTypes || roomTypes.length === 0) {
      showAlert(language === 'vi' ? 'Không có dữ liệu loại phòng để xuất!' : 'No room data to export!');
      return;
    }
    const data = roomTypes.map((rt: any) => ({
      'Tên Loại Phòng': rt.name,
      'Giá Niêm Yết (VNĐ)': Number(rt.basePrice || rt.price) || 0,
      'Sức Chứa (Người)': rt.capacity,
      'Số Giường': rt.bedCount || rt.beds || 1,
      'Diện Tích (m2)': rt.size || rt.areaSize || 0,
      'Có Ăn Sáng': (rt.includeBreakfast ?? rt.hasBreakfast) ? 'Có' : 'Không',
      'Mô Tả': rt.description
    }));
    exportToExcel(data, `Danh_Sach_Loai_Phong_${new Date().toISOString().slice(0, 10)}`, 'Loại Phòng');
  };

  const handleExportCouponsExcel = () => {
    if (!coupons || coupons.length === 0) {
      showAlert(language === 'vi' ? 'Không có dữ liệu khuyến mãi để xuất!' : 'No coupon data to export!');
      return;
    }
    const data = coupons.map(c => ({
      'Mã Giảm Giá': c.code,
      'Mô Tả': c.description,
      'Loại Chiết Khấu': c.discountType === 'PERCENTAGE' ? 'Phần trăm (%)' : 'Cố định (đ)',
      'Giá Trị Giảm': c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : Number(c.discountValue) || 0,
      'Đã Sử Dụng': c.usedCount || 0,
      'Giới Hạn Lần Dùng': c.usageLimit,
      'Ngày Kết Thúc': formatDateVN(c.endDate),
      'Trạng Thái': c.isActive ? 'Hoạt động' : 'Tạm khóa'
    }));
    exportToExcel(data, `Danh_Sach_Ma_Giam_Gia_${new Date().toISOString().slice(0, 10)}`, 'Khuyến Mãi');
  };

  const handleExportFinanceExcel = () => {
    const validBookings = filterBookingsByDateRange(bookings.filter(b => b.status !== 'CANCELLED'));
    if (validBookings.length === 0) {
      showAlert(language === 'vi' ? 'Chưa có dữ liệu tài chính trong khoảng thời gian đã chọn!' : 'No financial data in selected range!');
      return;
    }
    const data = validBookings.map(b => ({
      'Mã Đơn': b.id.substring(0, 8).toUpperCase(),
      'Tên Khách': b.guestName,
      'Ngày Nhận Phòng': formatDateVN(b.checkInDate),
      'Ngày Trả Phòng': formatDateVN(b.checkOutDate),
      'Doanh Thu Gốc (VNĐ)': Number(b.totalPrice) || 0,
      'Chiết Khấu/Khuyến Mãi (VNĐ)': Number(b.discountAmount) || 0,
      'Doanh Thu Thực Nhận (VNĐ)': Number(b.finalPrice) || 0,
      'Trạng Thái Thanh Toán': b.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã xác nhận',
      'Ngày Giao Dịch': formatDateVN(b.createdAt)
    }));
    exportToExcel(data, `Bao_Cao_Tai_Chinh_${new Date().toISOString().slice(0, 10)}`, 'Tài Chính');
  };

  const handleExportDetailedReportsExcel = () => {
    const filteredList = filterBookingsByDateRange(bookings);
    if (!filteredList || filteredList.length === 0) {
      showAlert(language === 'vi' ? 'Không có dữ liệu báo cáo chi tiết trong khoảng thời gian đã chọn!' : 'No detailed report data in selected range!');
      return;
    }
    const data = filteredList.map(b => ({
      'Mã Đặt Phòng': b.id.substring(0, 8).toUpperCase(),
      'Tên Khách Hàng': b.guestName,
      'SĐT Liên Hệ': b.guestPhone,
      'Email': b.guestEmail,
      'Loại Phòng Đặt': b.bookingItems?.map((i: any) => `${i.roomType?.name} (x${i.quantity})`).join(', ') || 'N/A',
      'Ngày Đặt': formatDateTimeVN(b.createdAt),
      'Check-in': formatDateVN(b.checkInDate),
      'Check-out': formatDateVN(b.checkOutDate),
      'Tổng Tiền Niêm Yết (VNĐ)': Number(b.totalPrice) || 0,
      'Khuyến Mãi (VNĐ)': Number(b.discountAmount) || 0,
      'Doanh Thu Thực Nhận (VNĐ)': Number(b.finalPrice) || 0,
      'Trạng Thái': b.status === 'CONFIRMED' ? 'Đã xác nhận' : b.status === 'COMPLETED' ? 'Hoàn tất' : b.status === 'CANCELLED' ? 'Đã hủy' : 'Đang xử lý'
    }));
    exportToExcel(data, `Bao_Cao_Chi_Tiet_Kinh_Doanh_${new Date().toISOString().slice(0, 10)}`, 'Báo Cáo Chi Tiết');
  };
  // Bedroom-by-bedroom Bed State
  const [bedroomList, setBedroomList] = useState<{ id: string; name: string; beds: { [key: string]: number } }[]>([
    { id: 'rm-1', name: 'Phòng ngủ 1', beds: { double: 1 } }
  ]);

  const syncBedroomsSummary = (list: { id: string; name: string; beds: { [key: string]: number } }[]) => {
    let totalBeds = 0;
    const roomSummaries: string[] = [];

    list.forEach((rm) => {
      const activeBeds = PRESET_BED_TYPES
        .filter(b => (rm.beds[b.id] || 0) > 0)
        .map(b => `${rm.beds[b.id]} ${b.name.split(' (')[0]}`);

      const countInRoom = Object.values(rm.beds).reduce((a, b) => a + b, 0);
      totalBeds += countInRoom;

      if (activeBeds.length > 0) {
        roomSummaries.push(`${rm.name}: ${activeBeds.join(', ')}`);
      }
    });

    setNewRoomBedCount(totalBeds.toString());
    setNewRoomBedType(roomSummaries.length > 0 ? roomSummaries.join(' | ') : '1 Giường Đôi');
  };

  const handleBedroomCountChange = (countStr: string) => {
    setNewRoomBedroomCount(countStr);
    const targetCount = Math.max(1, parseInt(countStr, 10) || 1);

    setBedroomList(prev => {
      const currentRooms = prev.filter(r => r.name.startsWith('Phòng ngủ'));
      const extraRooms = prev.filter(r => !r.name.startsWith('Phòng ngủ'));

      let updatedRooms = [...currentRooms];
      if (updatedRooms.length < targetCount) {
        for (let i = updatedRooms.length + 1; i <= targetCount; i++) {
          updatedRooms.push({
            id: `rm-${Date.now()}-${i}`,
            name: `Phòng ngủ ${i}`,
            beds: { double: 1 }
          });
        }
      } else if (updatedRooms.length > targetCount) {
        updatedRooms = updatedRooms.slice(0, targetCount);
      }

      const finalList = [...updatedRooms, ...extraRooms];
      syncBedroomsSummary(finalList);
      return finalList;
    });
  };

  const handleUpdateBedroomBed = (roomIndex: number, bedId: string, delta: number) => {
    setBedroomList(prev => {
      const updated = prev.map((rm, idx) => {
        if (idx !== roomIndex) return rm;
        const cur = rm.beds[bedId] || 0;
        const next = Math.max(0, cur + delta);
        return {
          ...rm,
          beds: { ...rm.beds, [bedId]: next }
        };
      });
      syncBedroomsSummary(updated);
      return updated;
    });
  };

  const handleAddCommonArea = () => {
    setBedroomList(prev => {
      if (prev.some(r => r.name.includes('Phòng khách'))) return prev;
      const updated = [
        ...prev,
        {
          id: `rm-common-${Date.now()}`,
          name: 'Phòng khách / Không gian chung',
          beds: { sofa: 1 }
        }
      ];
      syncBedroomsSummary(updated);
      return updated;
    });
  };

  const handleRemoveBedroom = (roomIndex: number) => {
    setBedroomList(prev => {
      if (prev.length <= 1) return prev;
      const updated = prev.filter((_, idx) => idx !== roomIndex);
      syncBedroomsSummary(updated);
      return updated;
    });
  };

  const [newRoomSize, setNewRoomSize] = useState('30');
  const [newRoomCount, setNewRoomCount] = useState('1');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [newRoomImageUrl, setNewRoomImageUrl] = useState('');
  const [newRoomImages, setNewRoomImages] = useState<{ url: string; isPrimary: boolean }[]>([]);
  const [newRoomAmenities, setNewRoomAmenities] = useState<string[]>(['Wifi', 'Điều hòa', 'Tivi']);
  const [newRoomIncludeBreakfast, setNewRoomIncludeBreakfast] = useState(false);
  const [newRoomChildSurcharge, setNewRoomChildSurcharge] = useState('0');
  const [newRoomCancellationPolicy, setNewRoomCancellationPolicy] = useState('FREE_24H');
  const [newRoomPaymentPolicy, setNewRoomPaymentPolicy] = useState('PAY_AT_HOTEL');

  const [refreshCalendarTrigger, setRefreshCalendarTrigger] = useState(0);
  const [showBulkConfig, setShowBulkConfig] = useState(false);
  const [bulkStartDate, setBulkStartDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [bulkEndDate, setBulkEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  });
  const [bulkDaysOfWeek, setBulkDaysOfWeek] = useState<boolean[]>([true, true, true, true, true, true, true]); // Mon to Sun
  const [bulkAction, setBulkAction] = useState('PRICE'); // 'PRICE', 'SURCHARGE_WEEKEND', 'DISCOUNT'
  const [bulkValue, setBulkValue] = useState('');
  const [bulkAdjustmentType, setBulkAdjustmentType] = useState('PERCENTAGE'); // 'PERCENTAGE', 'FIXED'
  const [bulkBaseOn, setBulkBaseOn] = useState('BASE'); // 'BASE' or 'CALENDAR'

  // Toast Trigger
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const fetchOwnerStats = async (targetHotelId?: string, targetTimeFrame?: string) => {
    try {
      const hId = targetHotelId || hotelId;
      const tf = targetTimeFrame || chartTimeFrame;
      const params = new URLSearchParams();
      if (hId && hId !== 'ALL') params.append('hotelId', hId);
      if (tf) params.append('timeFrame', tf);

      const res = await apiClient.get(`/bookings/owner-stats?${params.toString()}`);
      setStats(res.data.data.stats);
      setFinancialTransactions(res.data.data.financialTransactions || []);
      setChartData(res.data.data.chartData);
      setOccupancyData(res.data.data.occupancyData);
      setRecentReviews(res.data.data.recentReviews || []);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAllBookings = async () => {
    setBookingsLoading(true);
    try {
      const res = await apiClient.get('/bookings/my');
      setBookings(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setBookingsLoading(false);
    }
  };

  const handleSelectHotel = async (selectedId: string) => {
    setHotelId(selectedId);
    setFilterHotelId(selectedId);
    fetchOwnerStats(selectedId, chartTimeFrame);
    if (!selectedId || selectedId === 'ALL') return;
    try {
      const hotelDetailRes = await apiClient.get(`/hotels/${selectedId}`);
      const detail = hotelDetailRes.data.data;

      setHotelName(detail.name);
      setHotelDesc(detail.description || 'Chưa cập nhật mô tả.');
      setCheckInTime(detail.checkInTime || '14:00');
      setCheckOutTime(detail.checkOutTime || '12:00');
      setHotelAddress(detail.address || '');
      setProvinceId(detail.provinceId || '');
      setDistrictId(detail.districtId || '');
      setWardId(detail.wardId || '');
      setHotelLat(detail.latitude !== null && detail.latitude !== undefined ? detail.latitude : '');
      setHotelLng(detail.longitude !== null && detail.longitude !== undefined ? detail.longitude : '');
      setCategoryId(detail.categoryId || '');
      setStarRating(detail.starRating || 3);
      if (detail.propertyType) setPropertyType(detail.propertyType);

      setRoomTypes(detail.roomTypes || []);
      if (detail.roomTypes && detail.roomTypes.length > 0) {
        setSelectedRoomTypeId(detail.roomTypes[0].id);
      } else {
        setSelectedRoomTypeId('');
      }

      // Populate amenities
      const activeAmens = detail.amenities?.map((a: any) => a.amenity.id) || [];
      setSelectedAmenities(activeAmens);

      // Populate images
      const activeImgs = detail.images?.map((img: any) => ({
        url: img.url,
        isPrimary: img.isPrimary
      })) || [];
      setHotelImages(activeImgs);
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch initial room types, bookings, and system meta
  useEffect(() => {
    const fetchOwnerHotelsAndRooms = async () => {
      try {
        if (!user?.id) return;
        const res = await apiClient.get(`/hotels?ownerId=${user.id}&status=ALL&limit=100`);
        const myHotels = res.data.data.hotels;
        setHotelsList(myHotels || []);

        if (myHotels && myHotels.length > 0) {
          const currentValid = myHotels.find((h: any) => h.id === hotelId);
          const activeHId = currentValid ? currentValid.id : myHotels[0].id;
          handleSelectHotel(activeHId);
        } else {
          fetchOwnerStats();
        }
      } catch (err) {
        console.error(err);
      }
    };

    const fetchMeta = async () => {
      try {
        const [metaRes, provincesRes] = await Promise.all([
          apiClient.get('/hotels/meta/amenities-categories'),
          apiClient.get('/hotels/meta/locations')
        ]);
        if (metaRes.data.success) {
          setSystemAmenities(metaRes.data.data.amenities || []);
          setSystemCategories(metaRes.data.data.categories || []);
        }
        if (provincesRes.data.success) {
          setProvinces(provincesRes.data.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchOwnerHotelsAndRooms();
    fetchAllBookings();
    fetchMeta();
  }, [user]);

  // Sync stats when returning to dashboard tab or changing selected hotel / timeFrame
  useEffect(() => {
    if (activeMenu === 'dashboard') {
      fetchOwnerStats(hotelId, chartTimeFrame);
    }
    if (activeMenu === 'promotions') {
      fetchOwnerCoupons();
    }
    if (activeMenu === 'reviews') {
      fetchOwnerReviews();
    }
  }, [activeMenu, hotelId, chartTimeFrame]);

  // Lắng nghe các sự kiện cập nhật thời gian thực qua CustomEvent
  useEffect(() => {
    const handleBookingUpdate = () => {
      fetchAllBookings();
      fetchOwnerStats();
    };

    const handleCalendarUpdate = () => {
      setRefreshCalendarTrigger(prev => prev + 1);
    };

    window.addEventListener('booking:statusUpdated', handleBookingUpdate);
    window.addEventListener('calendar:updated', handleCalendarUpdate);

    return () => {
      window.removeEventListener('booking:statusUpdated', handleBookingUpdate);
      window.removeEventListener('calendar:updated', handleCalendarUpdate);
    };
  }, []);

  // Load districts when provinceId changes
  useEffect(() => {
    if (!provinceId) {
      setDistricts([]);
      return;
    }
    const fetchDistricts = async () => {
      try {
        const res = await apiClient.get(`/hotels/meta/locations?provinceId=${provinceId}`);
        if (res.data.success) {
          setDistricts(res.data.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDistricts();
  }, [provinceId]);

  // Load wards when districtId changes
  useEffect(() => {
    if (!districtId) {
      setWards([]);
      return;
    }
    const fetchWards = async () => {
      try {
        const res = await apiClient.get(`/hotels/meta/locations?districtId=${districtId}`);
        if (res.data.success) {
          setWards(res.data.data || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchWards();
  }, [districtId]);

  // Price calendar builder for 15 days
  // Price calendar builder for FULL MONTH with availability calculations
  useEffect(() => {
    if (!selectedRoomTypeId) return;

    const fetchPriceCalendar = async () => {
      setCalendarLoading(true);
      try {
        const year = calendarMonthDate.getFullYear();
        const month = calendarMonthDate.getMonth();

        const lastDayOfMonth = new Date(year, month + 1, 0);
        const totalDaysInMonth = lastDayOfMonth.getDate();

        const startDateStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;

        const selRoomType = roomTypes.find((r) => r.id === selectedRoomTypeId);
        const basePrice = selRoomType?.basePrice || 1200000;
        const totalCapacity = (selRoomType as any)?.totalRooms || (selRoomType as any)?.quantity || ((selRoomType as any)?.rooms ? (selRoomType as any).rooms.length : 10);

        // Lấy lịch đặt/giá tùy chỉnh thực tế từ database
        const res = await apiClient.get(`/hotels/room-types/${selectedRoomTypeId}/price-calendar?startDate=${startDateStr}&endDate=${endDateStr}`);
        const overrides = res.data.data || [];

        const daysArray: any[] = [];
        const todayObj = new Date();
        const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;

        const shortDaysVN = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

        for (let day = 1; day <= totalDaysInMonth; day++) {
          const dateObj = new Date(year, month, day);
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

          const override = overrides.find((o: any) => {
            const rawIso = typeof o.date === 'string' ? o.date : new Date(o.date).toISOString();
            const utcDateStr = rawIso.split('T')[0];
            const localD = new Date(o.date);
            const localDateStr = `${localD.getFullYear()}-${String(localD.getMonth() + 1).padStart(2, '0')}-${String(localD.getDate()).padStart(2, '0')}`;
            return utcDateStr === dateStr || localDateStr === dateStr;
          });

          // Tính toán số phòng đã đặt trong ngày dateStr
          let bookedCount = 0;
          if (bookings && bookings.length > 0) {
            bookings.forEach((b: any) => {
              if (b.status === 'CANCELLED' || b.status === 'REJECTED') return;
              const checkInStr = typeof b.checkInDate === 'string' ? b.checkInDate.split('T')[0] : new Date(b.checkInDate).toISOString().split('T')[0];
              const checkOutStr = typeof b.checkOutDate === 'string' ? b.checkOutDate.split('T')[0] : new Date(b.checkOutDate).toISOString().split('T')[0];

              if (dateStr >= checkInStr && dateStr < checkOutStr) {
                b.bookingItems?.forEach((item: any) => {
                  const itemRtId = (item.roomType as any)?.id || item.roomTypeId;
                  if (itemRtId === selectedRoomTypeId) {
                    bookedCount += item.quantity || 1;
                  }
                });
              }
            });
          }

          const availableRooms = Math.max(0, totalCapacity - bookedCount);
          const isCustomPrice = Boolean(override && parseFloat(override.price) !== Number(basePrice));
          const isPast = dateStr < todayStr;

          daysArray.push({
            date: dateStr,
            dayNum: day,
            dayOfWeekStr: shortDaysVN[dateObj.getDay()],
            isToday: dateStr === todayStr,
            isPast,
            price: override ? parseFloat(override.price) : Number(basePrice),
            isBlocked: override ? override.isBlocked : false,
            isCustomPrice,
            totalRooms: totalCapacity,
            bookedCount,
            availableRooms,
          });
        }
        setCalendarDays(daysArray);
      } catch (err) {
        console.error(err);
      } finally {
        setCalendarLoading(false);
      }
    };

    fetchPriceCalendar();
  }, [selectedRoomTypeId, roomTypes, calendarMonthDate, bookings, refreshCalendarTrigger]);

  // Socket.io connection for owner chat
  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true,
    });

    if (user?.id) {
      socketRef.current.emit('joinUser', user.id);
    }

    const handleIncomingMessage = (message: any) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === message.id)) return prev;
        return [...prev, message];
      });

      apiClient.get('/chats/conversations').then(res => {
        if (res.data.success) {
          setConversations(res.data.data);
        }
      }).catch(() => {});
    };

    socketRef.current.on('receiveMessage', handleIncomingMessage);
    socketRef.current.on('newMessage', handleIncomingMessage);
    socketRef.current.on('conversationUpdated', () => {
      apiClient.get('/chats/conversations').then(res => {
        if (res.data.success) {
          setConversations(res.data.data);
        }
      }).catch(() => {});
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [user]);

  // Real-time listener for Owner Dashboard auto refresh
  useEffect(() => {
    const handleBookingUpdated = () => {
      fetchAllBookings();
      fetchOwnerStats();
    };

    const handleHotelUpdated = () => {
      fetchAllBookings();
      fetchOwnerStats();
    };

    window.addEventListener('booking:statusUpdated', handleBookingUpdated);
    window.addEventListener('hotel:statusUpdated', handleHotelUpdated);

    return () => {
      window.removeEventListener('booking:statusUpdated', handleBookingUpdated);
      window.removeEventListener('hotel:statusUpdated', handleHotelUpdated);
    };
  }, []);

  // Click outside listener to close header dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationsDropdownRef.current && !notificationsDropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Lock body scroll when any modal is open
  const isAnyOwnerModalOpen = Boolean(
    selectedBooking || editDay || showAddCoupon || deleteConfirmId || showAddRoom || isAmenitiesModalOpen || selectedRoomTypeForRatePlans || showBulkConfig || managingRoomTypeForNumbers
  );

  useEffect(() => {
    if (isAnyOwnerModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyOwnerModalOpen]);

  // Fetch Conversations list for owner
  useEffect(() => {
    if (activeMenu !== 'support') return;

    const fetchConvs = async () => {
      try {
        const res = await apiClient.get('/chats/conversations');
        setConversations(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchConvs();
  }, [activeMenu]);

  // Join Chat room and load messages
  useEffect(() => {
    if (!activeConv) return;

    const loadMessagesAndJoin = async () => {
      try {
        socketRef.current?.emit('joinConversation', activeConv.id);
        const res = await apiClient.get(`/chats/conversations/${activeConv.id}/messages`);
        setChatMessages(res.data.data);
      } catch (err) {
        console.error(err);
      }
    };

    loadMessagesAndJoin();
  }, [activeConv]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const getBookingGuests = (b: Booking) => {
    const calculatedCapacity = b.bookingItems?.reduce((sum, item) => {
      const roomCap = item.roomType?.capacity || 2;
      return sum + (roomCap * (item.quantity || 1));
    }, 0) || 1;

    if (b.numGuests && b.numGuests > 1) {
      return b.numGuests;
    }
    return calculatedCapacity;
  };

  const handlePrintBooking = (b: Booking) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>Phiếu Xác Nhận Đặt Phòng #${b.id.substring(0, 8).toUpperCase()}</title>
          <style>
            body { font-family: Arial, sans-serif; color: #333; padding: 20px; line-height: 1.5; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
            .title { font-size: 24px; font-weight: bold; margin: 0; }
            .subtitle { font-size: 14px; color: #666; margin: 5px 0 0 0; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 10px; }
            .label { font-weight: bold; color: #555; }
            .value { }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f5f5f5; }
            .footer { text-align: center; margin-top: 50px; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">PHIẾU XÁC NHẬN ĐẶT PHÒNG</h1>
            <p class="subtitle">Mã đặt phòng: ${b.id.toUpperCase()}</p>
          </div>
          <div class="section">
            <div class="section-title">Thông Tin Khách Hàng</div>
            <div class="grid">
              <div><span class="label">Khách hàng:</span> <span class="value">${b.guestName}</span></div>
              <div><span class="label">Số điện thoại:</span> <span class="value">${b.guestPhone}</span></div>
              <div><span class="label">Email:</span> <span class="value">${b.guestEmail}</span></div>
              <div><span class="label">Thời gian đặt:</span> <span class="value">${formatDateTimeVN(b.createdAt)}</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Chi Tiết Lưu Trú</div>
            <div class="grid">
              <div><span class="label">Ngày Check-in:</span> <span class="value">${formatDateVN(b.checkInDate)}</span></div>
              <div><span class="label">Ngày Check-out:</span> <span class="value">${formatDateVN(b.checkOutDate)}</span></div>
              <div><span class="label">Số đêm nghỉ:</span> <span class="value">${Math.max(1, Math.round((new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / (1000 * 60 * 60 * 24)))} đêm</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Danh Sách Phòng Đặt</div>
            <table>
              <thead>
                <tr>
                  <th>Khách sạn</th>
                  <th>Loại phòng</th>
                  <th>Số lượng</th>
                  <th>Số phòng đã gán</th>
                  <th>Giá phòng gốc</th>
                </tr>
              </thead>
              <tbody>
                ${b.bookingItems.map(item => `
                  <tr>
                    <td>${item.roomType.hotel.name}</td>
                    <td>${item.roomType.name}</td>
                    <td>${item.quantity}</td>
                    <td>${item.roomNumbers || 'Chưa gán'}</td>
                    <td>${formatNumberDots(item.price)} đ</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="section">
            <div class="section-title">Chi Tiết Thanh Toán</div>
            <div class="grid">
              <div><span class="label">Tổng tiền phòng:</span> <span class="value">${formatNumberDots(b.totalPrice)} đ</span></div>
              <div><span class="label">Giảm giá mã giảm giá & Điểm:</span> <span class="value">${formatNumberDots(b.discountAmount)} đ</span></div>
              <div><span class="label">Tổng thanh toán:</span> <span class="value" style="font-weight: bold; color: #006ce4;">${formatNumberDots(b.finalPrice)} đ</span></div>
              <div><span class="label">Phương thức thanh toán:</span> <span class="value">${b.payment?.method || 'N/A'}</span></div>
              <div><span class="label">Trạng thái thanh toán:</span> <span class="value">${b.payment?.status === 'COMPLETED' ? 'Đã thanh toán' : 'Chưa thanh toán'}</span></div>
              <div><span class="label">Mã giao dịch:</span> <span class="value">${b.payment?.transactionId || 'N/A'}</span></div>
            </div>
          </div>
          <div class="footer">
            Cảm ơn quý khách đã tin tưởng và sử dụng dịch vụ của CloudBooking!
          </div>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      const res = await apiClient.put(`/bookings/${bookingId}/status`, { status: newStatus });
      if (res.data.success) {
        triggerToast('Cập nhật trạng thái đơn thành công!');
        setBookings((prev) =>
          prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b))
        );
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking((prev) => prev ? { ...prev, status: newStatus } : null);
          fetchBookingAuditLogs(bookingId);
        }
      }
    } catch (err) {
      console.error(err);
      await showAlert('Không thể cập nhật trạng thái đơn.', { type: 'error' });
    }
  };

  const fetchBookingAuditLogs = async (bookingId: string) => {
    setTimelineLoading(true);
    try {
      const res = await apiClient.get(`/bookings/${bookingId}/audit-logs`);
      if (res.data.success) {
        setTimelineLogs(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch booking audit logs:', err);
    } finally {
      setTimelineLoading(false);
    }
  };

  const handleUpdateInternalNotes = async () => {
    if (!selectedBooking) return;
    setSavingNotes(true);
    try {
      const res = await apiClient.put(`/bookings/${selectedBooking.id}/internal-notes`, {
        internalNotes: internalNotesInput
      });
      if (res.data.success) {
        setSelectedBooking(prev => prev ? { ...prev, internalNotes: internalNotesInput } : null);
        fetchAllBookings();
        fetchBookingAuditLogs(selectedBooking.id);
        triggerToast('Lưu ghi chú nội bộ thành công!');
      }
    } catch (err: any) {
      console.error(err);
      await showAlert(err.response?.data?.message || 'Không thể lưu ghi chú.', { type: 'error' });
    } finally {
      setSavingNotes(false);
    }
  };

  const handleUpdateRoomAssignments = async () => {
    if (!selectedBooking) return;
    setSavingAssignments(true);
    try {
      const res = await apiClient.put(`/bookings/${selectedBooking.id}/assign-rooms`, {
        roomAssignments: roomAssignmentsInput
      });
      if (res.data.success) {
        setSelectedBooking(res.data.data);
        fetchAllBookings();
        fetchBookingAuditLogs(selectedBooking.id);
        triggerToast('Gán số phòng thành công!');
      }
    } catch (err: any) {
      console.error(err);
      await showAlert(err.response?.data?.message || 'Không thể gán phòng.', { type: 'error' });
    } finally {
      setSavingAssignments(false);
    }
  };

  const handleChangeBookingDates = async () => {
    if (!selectedBooking) return;
    setSavingDates(true);
    try {
      const res = await apiClient.put(`/bookings/${selectedBooking.id}/change-dates`, {
        checkInDate: checkInDateInput,
        checkOutDate: checkOutDateInput
      });
      if (res.data.success) {
        setSelectedBooking(res.data.data);
        fetchAllBookings();
        fetchBookingAuditLogs(selectedBooking.id);
        triggerToast('Đổi ngày lưu trú thành công!');
      }
    } catch (err: any) {
      console.error(err);
      await showAlert(err.response?.data?.message || 'Không thể đổi ngày.', { type: 'error' });
    } finally {
      setSavingDates(false);
    }
  };

  const handleSavePriceCalendar = async () => {
    if (!editDay || !selectedRoomTypeId) return;

    try {
      const updateData = {
        prices: [
          {
            date: editDay.date,
            price: Number(newPrice) || editDay.price,
            isBlocked: newBlocked,
          },
        ],
      };

      await apiClient.post(`/hotels/room-types/${selectedRoomTypeId}/price-calendar`, updateData);

      setCalendarDays((prev) =>
        prev.map((d) =>
          d.date === editDay.date
            ? { ...d, price: Number(newPrice) || d.price, isBlocked: newBlocked }
            : d
        )
      );
      setEditDay(null);
      triggerToast('Cập nhật lịch ngày thành công!');
    } catch (err) {
      console.error(err);
      await showAlert('Không thể lưu cấu hình lịch.', { type: 'error' });
    }
  };

  const handleRestoreDay = async () => {
    if (!editDay || !selectedRoomTypeId) return;
    try {
      const updateData = {
        prices: [
          {
            date: editDay.date,
            price: 0,
            isRestore: true,
          },
        ],
      };

      await apiClient.post(`/hotels/room-types/${selectedRoomTypeId}/price-calendar`, updateData);

      setRefreshCalendarTrigger((prev) => prev + 1);
      setEditDay(null);
      triggerToast('Đã khôi phục giá gốc thành công!');
    } catch (err) {
      console.error(err);
      await showAlert('Không thể khôi phục giá gốc.', { type: 'error' });
    }
  };

  const handleSaveBulkPriceCalendar = async () => {
    if (!selectedRoomTypeId) return;
    if (!bulkStartDate || !bulkEndDate) {
      await showAlert('Vui lòng chọn đầy đủ ngày bắt đầu và ngày kết thúc.', { type: 'warning' });
      return;
    }

    const start = new Date(bulkStartDate + 'T00:00:00');
    const end = new Date(bulkEndDate + 'T23:59:59');

    if (start > end) {
      await showAlert('Ngày bắt đầu không được lớn hơn ngày kết thúc.', { type: 'warning' });
      return;
    }

    if (bulkAction !== 'RESTORE' && (!bulkValue || isNaN(Number(bulkValue)) || Number(bulkValue) <= 0)) {
      await showAlert('Vui lòng nhập giá trị điều chỉnh hợp lệ lớn hơn 0.', { type: 'warning' });
      return;
    }

    const basePrice = roomTypes.find((r) => r.id === selectedRoomTypeId)?.basePrice || 1200000;
    const pricesPayload: { date: string; price: number; isBlocked?: boolean }[] = [];

    // Lặp qua từng ngày trong khoảng
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay(); // 0: Chủ Nhật, 1: Thứ Hai, ..., 6: Thứ Bảy
      // Ánh xạ getDay (0=CN, 1=T2, ..., 6=T7) sang chỉ số bulkDaysOfWeek (0=T2, 1=T3, ..., 5=T7, 6=CN)
      const index = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

      if (bulkDaysOfWeek[index]) {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;

        if (bulkAction === 'RESTORE') {
          pricesPayload.push({
            date: dateStr,
            price: 0,
            isRestore: true,
          } as any);
        } else {
          let referencePrice = Number(basePrice);
          if (bulkBaseOn === 'CALENDAR') {
            const existingDay = calendarDays.find(cd => cd.date === dateStr);
            if (existingDay) {
              referencePrice = Number(existingDay.price);
            }
          }

          let calculatedPrice = referencePrice;

          if (bulkAction === 'PRICE') {
            calculatedPrice = Number(bulkValue) || referencePrice;
          } else if (bulkAction === 'SURCHARGE_WEEKEND') {
            const val = Number(bulkValue) || 0;
            if (bulkAdjustmentType === 'PERCENTAGE') {
              calculatedPrice = referencePrice * (1 + val / 100);
            } else {
              calculatedPrice = referencePrice + val;
            }
          } else if (bulkAction === 'DISCOUNT') {
            const val = Number(bulkValue) || 0;
            if (bulkAdjustmentType === 'PERCENTAGE') {
              calculatedPrice = referencePrice * (1 - val / 100);
            } else {
              calculatedPrice = Math.max(0, referencePrice - val);
            }
          }

          pricesPayload.push({
            date: dateStr,
            price: calculatedPrice,
            isBlocked: false,
          });
        }
      }
    }

    if (pricesPayload.length === 0) {
      await showAlert('Không có ngày nào khớp với tiêu chí lựa chọn của bạn.', { type: 'warning' });
      return;
    }

    try {
      await apiClient.post(`/hotels/room-types/${selectedRoomTypeId}/price-calendar`, {
        prices: pricesPayload,
      });

      // Kích hoạt load lại lịch giá
      setRefreshCalendarTrigger((prev) => prev + 1);
      setShowBulkConfig(false);
      setBulkValue('');
      triggerToast('Đã thiết lập giá hàng loạt thành công!');
    } catch (err) {
      console.error(err);
      await showAlert('Không thể lưu cấu hình giá hàng loạt.', { type: 'error' });
    }
  };

  const handleSendChatMessage = () => {
    if (!inputMsg.trim() || !activeConv || !user) return;

    const payload = {
      conversationId: activeConv.id,
      senderId: user.id,
      content: inputMsg.trim(),
    };

    socketRef.current?.emit('sendMessage', payload);
    setInputMsg('');
  };

  const fetchOwnerCoupons = async () => {
    if (!hotelId) return;
    setCouponsLoading(true);
    try {
      const res = await apiClient.get(`/coupons?hotelId=${hotelId}&all=true`);
      setCoupons(res.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setCouponsLoading(false);
    }
  };

  const fetchOwnerReviews = async () => {
    if (!hotelId) return;
    setAllReviewsLoading(true);
    try {
      const res = await apiClient.get(`/hotels/${hotelId}`);
      setAllReviews(res.data.data.reviews || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAllReviewsLoading(false);
    }
  };

  const handleSendOwnerReply = async (reviewId: string) => {
    const textToSubmit = replyInputText.trim();
    if (!textToSubmit) return;
    setSendingReply(true);
    try {
      const res = await apiClient.post(`/hotels/reviews/${reviewId}/reply`, {
        replyText: textToSubmit
      });
      if (res.data.success) {
        const updatedReview = res.data.data;
        setAllReviews(prev =>
          prev.map(r => (r.id === reviewId ? {
            ...r,
            ownerReply: updatedReview?.ownerReply || textToSubmit,
            ownerRepliedAt: updatedReview?.ownerRepliedAt || new Date().toISOString()
          } : r))
        );
        setReplyingReviewId(null);
        setReplyInputText('');
        showAlert(
          language === 'vi' ? 'Đã gửi phản hồi thành công!' : 'Response sent successfully!',
          { type: 'success' }
        );
      }
    } catch (err: any) {
      console.error('[Send Owner Reply Error]:', err);
      showAlert(
        err.response?.data?.message || (language === 'vi' ? 'Không thể gửi phản hồi' : 'Failed to send response'),
        { type: 'error' }
      );
    } finally {
      setSendingReply(false);
    }
  };

  const [likedReviewIds, setLikedReviewIds] = useState<string[]>([]);

  const handleLikeOwnerReview = async (reviewId: string) => {
    if (likedReviewIds.includes(reviewId)) return;
    setLikedReviewIds(prev => [...prev, reviewId]);
    setAllReviews(prev =>
      prev.map(r => (r.id === reviewId ? { ...r, likesCount: (r.likesCount || 0) + 1 } : r))
    );
    try {
      await apiClient.post(`/hotels/reviews/${reviewId}/like`);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateOwnerCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelId) return;
    try {
      const payload = {
        code: newCouponCode.toUpperCase(),
        description: newCouponDesc,
        discountType: newCouponType,
        discountValue: Number(newCouponValue),
        minOrderValue: newCouponMinOrderValue ? Number(newCouponMinOrderValue) : 0,
        maxDiscountAmount: newCouponMaxDiscountAmount ? Number(newCouponMaxDiscountAmount) : null,
        startDate: new Date(newCouponStart).toISOString(),
        endDate: new Date(newCouponEnd).toISOString(),
        usageLimit: Number(newCouponLimit),
        dailyUsageLimit: newCouponDailyLimit ? Number(newCouponDailyLimit) : null,
        targetUserType: newCouponTargetUserType,
        hotelId
      };

      await apiClient.post('/coupons', payload);
      triggerToast('Tạo mã giảm giá khách sạn thành công!');
      setShowAddCoupon(false);
      setNewCouponCode('');
      setNewCouponDesc('');
      setNewCouponValue('');
      setNewCouponMinOrderValue('');
      setNewCouponMaxDiscountAmount('');
      setNewCouponLimit('');
      setNewCouponDailyLimit('');
      setNewCouponTargetUserType('ALL');
      setNewCouponStart(`${new Date().toISOString().split('T')[0]}T08:00`);
      setNewCouponEnd('');
      fetchOwnerCoupons();
    } catch (err: any) {
      console.error(err);
      await showAlert(err.response?.data?.message || 'Không thể tạo mã giảm giá.', { type: 'error' });
    }
  };

  const handleDeleteOwnerCoupon = async (id: string) => {
    try {
      await apiClient.delete(`/coupons/${id}`);
      setDeleteConfirmId(null);
      triggerToast('Xóa mã giảm giá thành công!');
      fetchOwnerCoupons();
    } catch (err: any) {
      console.error(err);
      await showAlert(err.response?.data?.message || 'Không thể xóa mã giảm giá này (có thể do phân quyền hoặc đã từng được áp dụng).', { type: 'error' });
    }
  };

  const handleToggleOwnerCouponStatus = async (id: string) => {
    try {
      const res = await apiClient.patch(`/coupons/${id}/toggle`);
      if (res.data.success) {
        triggerToast(res.data.message || 'Cập nhật trạng thái mã thành công!');
        fetchOwnerCoupons();
      }
    } catch (err: any) {
      console.error(err);
      await showAlert(err.response?.data?.message || 'Không thể thay đổi trạng thái mã giảm giá.', { type: 'error' });
    }
  };

  // Derived unique customer list from bookings
  const getUniqueCustomers = () => {
    const seen = new Set();
    const result: any[] = [];
    bookings.forEach(b => {
      const key = `${b.guestEmail || ''}-${b.guestPhone || ''}`;
      if (!seen.has(key)) {
        seen.add(key);
        result.push({
          id: b.id,
          guestName: b.guestName,
          guestPhone: b.guestPhone,
          guestEmail: b.guestEmail,
          totalBookings: bookings.filter(x => x.guestEmail === b.guestEmail || x.guestPhone === b.guestPhone).length,
          totalSpent: bookings.filter(x => x.guestEmail === b.guestEmail || x.guestPhone === b.guestPhone).reduce((acc, curr) => acc + curr.finalPrice, 0)
        });
      }
    });
    return result;
  };

  const parseBedroomsFromBedType = (bedTypeStr: string, bedroomCountNum: number) => {
    if (!bedTypeStr) {
      const list = [];
      for (let i = 1; i <= Math.max(1, bedroomCountNum); i++) {
        list.push({ id: `rm-${i}`, name: `Phòng ngủ ${i}`, beds: { double: 1 } });
      }
      return list;
    }

    if (bedTypeStr.includes('Phòng') || bedTypeStr.includes('|')) {
      const parts = bedTypeStr.split('|').map(p => p.trim()).filter(Boolean);
      const parsedList: { id: string; name: string; beds: { [key: string]: number } }[] = [];

      parts.forEach((part, idx) => {
        let roomName = `Phòng ngủ ${idx + 1}`;
        let bedsText = part;

        if (part.includes(':')) {
          const [rName, bText] = part.split(':');
          roomName = rName.trim();
          bedsText = bText.trim();
        }

        const roomBeds: { [key: string]: number } = {};
        const bLower = bedsText.toLowerCase();

        PRESET_BED_TYPES.forEach(b => {
          const k = b.id;
          let match = null;
          if (k === 'king' && bLower.includes('king') && !bLower.includes('super')) {
            match = bLower.match(/(\d+)\s*(?:giường\s*)?king/i) || bLower.match(/(\d+)\s*king/i);
          } else if (k === 'queen') {
            match = bLower.match(/(\d+)\s*(?:giường\s*)?queen/i) || bLower.match(/(\d+)\s*queen/i);
          } else if (k === 'double') {
            match = bLower.match(/(\d+)\s*(?:giường\s*)?đôi/i) || bLower.match(/(\d+)\s*double/i);
          } else if (k === 'single') {
            match = bLower.match(/(\d+)\s*(?:giường\s*)?đơn/i) || bLower.match(/(\d+)\s*single/i);
          } else if (k === 'sofa') {
            match = bLower.match(/(\d+)\s*(?:giường\s*)?sofa/i);
          } else if (k === 'bunk') {
            match = bLower.match(/(\d+)\s*(?:giường\s*)?tầng/i) || bLower.match(/(\d+)\s*bunk/i);
          } else if (k === 'superking') {
            match = bLower.match(/(\d+)\s*super\s*king/i);
          }
          if (match && match[1]) {
            roomBeds[k] = parseInt(match[1], 10);
          }
        });

        const hasBeds = Object.values(roomBeds).some(v => v > 0);
        if (!hasBeds) roomBeds.double = 1;

        parsedList.push({ id: `rm-${idx + 1}`, name: roomName, beds: roomBeds });
      });

      if (parsedList.length > 0) return parsedList;
    }

    const list = [];
    const targetCount = Math.max(1, bedroomCountNum);
    for (let i = 1; i <= targetCount; i++) {
      list.push({ id: `rm-${i}`, name: `Phòng ngủ ${i}`, beds: i === 1 ? { double: 1 } : { single: 1 } });
    }
    return list;
  };

  const handleOpenAddRoomType = () => {
    const config = getPropertyTypeConfig(propertyType);
    setEditingRoomType(null);
    setNewRoomName('');
    setNewRoomPrice('');
    setNewRoomCapacity('2');
    setNewRoomBedCount('1');
    setNewRoomBedroomCount('1');
    setNewRoomBathroomCount('1');
    const initialBedrooms = [
      { id: 'rm-1', name: 'Phòng ngủ 1', beds: { double: 1 } }
    ];
    setBedroomList(initialBedrooms);
    syncBedroomsSummary(initialBedrooms);
    setNewRoomSize(config.sizePlaceholder || '30');
    setNewRoomCount(config.countPlaceholder || '1');
    setNewRoomDesc('');
    setNewRoomImageUrl('');
    setNewRoomImages([]);
    setNewRoomAmenities(config.presetAmenities.slice(0, 4));
    setNewRoomIncludeBreakfast(config.showBreakfast);
    setNewRoomChildSurcharge('0');
    setNewRoomCancellationPolicy('FREE_24H');
    setNewRoomPaymentPolicy('PAY_AT_HOTEL');
    setShowAddRoom(true);
  };

  const handleOpenEditRoomType = (rt: any) => {
    const config = getPropertyTypeConfig(propertyType);
    setEditingRoomType(rt);
    setNewRoomName(rt.name);
    setNewRoomPrice(rt.basePrice.toString());
    setNewRoomCapacity(rt.capacity.toString());
    setNewRoomBedCount(rt.bedCount?.toString() || '1');
    setNewRoomBedType(rt.bedType || 'Giường Đôi');

    // Extract bedroom and bathroom count if saved in amenities
    const bdAmenity = rt.amenities?.find((a: string) => a.includes('Phòng ngủ'));
    const btAmenity = rt.amenities?.find((a: string) => a.includes('Phòng tắm') || a.includes('WC'));
    const bdCountNum = parseInt(bdAmenity ? bdAmenity.replace(/\D/g, '') || '1' : '1', 10);
    setNewRoomBedroomCount(bdCountNum.toString());
    setNewRoomBathroomCount(btAmenity ? btAmenity.replace(/\D/g, '') || '1' : '1');

    // Parse bedroom list from bedType
    const parsedBedrooms = parseBedroomsFromBedType(rt.bedType || '', bdCountNum);
    setBedroomList(parsedBedrooms);
    syncBedroomsSummary(parsedBedrooms);

    setNewRoomSize(rt.size?.toString() || '30');
    setNewRoomCount(rt.rooms?.length?.toString() || '1');
    setNewRoomDesc(rt.description || '');
    setNewRoomImageUrl('');
    setNewRoomImages(
      rt.images && rt.images.length > 0
        ? rt.images.map((img: any) => ({ url: img.url, isPrimary: !!img.isPrimary }))
        : []
    );
    setNewRoomAmenities(rt.amenities || config.presetAmenities.slice(0, 4));
    setNewRoomIncludeBreakfast(rt.includeBreakfast ?? config.showBreakfast);
    setNewRoomChildSurcharge(rt.childSurcharge?.toString() || '0');
    setNewRoomCancellationPolicy(rt.cancellationPolicy || 'FREE_24H');
    setNewRoomPaymentPolicy(rt.paymentPolicy || 'PAY_AT_HOTEL');
    setShowAddRoom(true);
  };

  const handleSaveRoomType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelId) return;
    try {
      const config = getPropertyTypeConfig(propertyType);
      const defaultImg = 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80';

      let finalRoomImages = [...newRoomImages];
      if (newRoomImageUrl.trim()) {
        finalRoomImages.push({ url: newRoomImageUrl.trim(), isPrimary: finalRoomImages.length === 0 });
      }

      if (finalRoomImages.length === 0) {
        finalRoomImages = [{ url: defaultImg, isPrimary: true }];
      }

      if (!finalRoomImages.some(img => img.isPrimary) && finalRoomImages.length > 0) {
        finalRoomImages[0].isPrimary = true;
      }

      let processedAmenities = [...newRoomAmenities];

      if (config.showBedrooms && newRoomBedroomCount) {
        processedAmenities = processedAmenities.filter(a => !a.includes('Phòng ngủ'));
        processedAmenities.unshift(`${newRoomBedroomCount} Phòng ngủ`);
      }

      if (config.showBathrooms && newRoomBathroomCount) {
        processedAmenities = processedAmenities.filter(a => !a.includes('Phòng tắm') && !a.includes('WC'));
        processedAmenities.unshift(`${newRoomBathroomCount} Phòng tắm`);
      }

      const payload = {
        name: newRoomName,
        description: newRoomDesc.trim() || `${config.nameLabel.replace(' *', '')} ${newRoomName} đầy đủ tiện nghi, rộng rãi và sạch sẽ.`,
        basePrice: newRoomPrice !== '' ? Number(newRoomPrice) : 800000,
        capacity: newRoomCapacity !== '' ? Number(newRoomCapacity) : 2,
        bedCount: newRoomBedCount !== '' ? Number(newRoomBedCount) : 1,
        bedType: newRoomBedType || 'Giường Đôi',
        size: newRoomSize !== '' ? Number(newRoomSize) : 30,
        roomCount: newRoomCount !== '' ? Number(newRoomCount) : 0,
        amenities: processedAmenities.length > 0 ? processedAmenities : config.presetAmenities.slice(0, 4),
        images: finalRoomImages,
        includeBreakfast: newRoomIncludeBreakfast,
        childSurcharge: Number(newRoomChildSurcharge) || 0,
        cancellationPolicy: newRoomCancellationPolicy,
        paymentPolicy: newRoomPaymentPolicy
      };

      if (editingRoomType) {
        const res = await apiClient.put(`/hotels/room-types/${editingRoomType.id}`, payload);
        const updatedRoom = res.data.data;
        setRoomTypes(prev => prev.map(rt => rt.id === updatedRoom.id ? updatedRoom : rt));
        triggerToast('Cập nhật thành công!');
      } else {
        const res = await apiClient.post(`/hotels/${hotelId}/room-types`, payload);
        const newRoom = res.data.data;
        setRoomTypes(prev => [...prev, newRoom]);
        triggerToast('Thêm mới thành công!');
      }

      setShowAddRoom(false);
      setEditingRoomType(null);
      setNewRoomName('');
      setNewRoomPrice('');
      setNewRoomCapacity('2');
      setNewRoomBedCount('1');
      setNewRoomBedroomCount('1');
      setNewRoomBathroomCount('1');
      setNewRoomSize('30');
      setNewRoomCount('1');
      setNewRoomDesc('');
      setNewRoomImageUrl('');
      setNewRoomImages([]);
      setNewRoomAmenities(config.presetAmenities.slice(0, 4));
      setNewRoomIncludeBreakfast(false);
      setNewRoomChildSurcharge('0');
      setNewRoomCancellationPolicy('FREE_24H');
      setNewRoomPaymentPolicy('PAY_AT_HOTEL');
    } catch (err) {
      console.error(err);
      await showAlert('Không thể lưu thông tin hạng phòng.', { type: 'error' });
    }
  };

  const handleSaveHotelInfo = async () => {
    // Validate các trường bắt buộc
    if (!hotelName.trim() || hotelName.trim().length < 2) {
      await showAlert('Vui lòng nhập tên chỗ lưu trú (tối thiểu 2 ký tự).', { type: 'warning' });
      return;
    }
    if (!hotelDesc.trim() || hotelDesc.trim().length < 10) {
      await showAlert('Vui lòng nhập mô tả (tối thiểu 10 ký tự).', { type: 'warning' });
      return;
    }
    if (!hotelAddress.trim() || hotelAddress.trim().length < 2) {
      await showAlert('Vui lòng nhập địa chỉ chi tiết.', { type: 'warning' });
      return;
    }
    if (!provinceId) {
      await showAlert('Vui lòng chọn Tỉnh/Thành phố.', { type: 'warning' });
      return;
    }
    if (!districtId) {
      await showAlert('Vui lòng chọn Quận/Huyện.', { type: 'warning' });
      return;
    }
    if (!wardId) {
      await showAlert('Vui lòng chọn Phường/Xã.', { type: 'warning' });
      return;
    }

    const targetCategoryId = categoryId || (systemCategories.length > 0 ? systemCategories[0].id : '');

    try {
      if (!hotelId) {
        // Tạo mới: POST /hotels
        const res = await apiClient.post('/hotels', {
          name: hotelName,
          description: hotelDesc,
          checkInTime: checkInTime || '14:00',
          checkOutTime: checkOutTime || '12:00',
          address: hotelAddress,
          provinceId,
          districtId,
          wardId,
          latitude: hotelLat !== '' ? Number(hotelLat) : null,
          longitude: hotelLng !== '' ? Number(hotelLng) : null,
          categoryId: targetCategoryId,
          propertyType,
          starRating,
          amenityIds: selectedAmenities,
          images: hotelImages
        });
        const newHotel = res.data.data;
        setHotelId(newHotel.id);
        setHotelsList(prev => [...prev, newHotel]);
        triggerToast('Đăng ký chỗ lưu trú thành công! Hồ sơ đang chờ Admin duyệt.');
        setActiveMenu('rooms');
      } else {
        // Cập nhật: PUT /hotels/:id
        await apiClient.put(`/hotels/${hotelId}`, {
          name: hotelName,
          description: hotelDesc,
          checkInTime,
          checkOutTime,
          address: hotelAddress,
          provinceId,
          districtId,
          wardId,
          latitude: hotelLat !== '' ? Number(hotelLat) : null,
          longitude: hotelLng !== '' ? Number(hotelLng) : null,
          categoryId: targetCategoryId,
          propertyType,
          starRating,
          amenityIds: selectedAmenities,
          images: hotelImages
        });
        triggerToast('Cập nhật hồ sơ chỗ lưu trú thành công.');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.message || err?.response?.data?.errors?.[0]?.message;
      await showAlert(msg || 'Không thể lưu thông tin. Vui lòng kiểm tra lại các trường bắt buộc.', { type: 'error' });
    }
  };

  const handleAddCustomAmenity = async () => {
    if (!customAmenityName.trim()) return;
    try {
      const res = await apiClient.post('/hotels/meta/amenities', {
        name: customAmenityName.trim(),
        icon: customAmenityCategory
      });
      if (res.data.success) {
        const newAmenity = res.data.data;
        setSystemAmenities(prev => {
          if (prev.some(a => a.id === newAmenity.id)) return prev;
          return [...prev, newAmenity].sort((a, b) => a.name.localeCompare(b.name));
        });
        setSelectedAmenities(prev => {
          if (prev.includes(newAmenity.id)) return prev;
          return [...prev, newAmenity.id];
        });
        setCustomAmenityName('');
        triggerToast('Đã thêm tiện ích mới thành công!');
      }
    } catch (err) {
      console.error(err);
      await showAlert('Không thể thêm tiện ích mới.', { type: 'error' });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingImage(true);
    try {
      const uploadedUrls: { url: string; isPrimary: boolean }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = (error) => reject(error);
        });

        const res = await apiClient.post('/hotels/upload-image', { image: base64 });
        if (res.data.success) {
          uploadedUrls.push({
            url: res.data.data.url,
            isPrimary: hotelImages.length === 0 && uploadedUrls.length === 0
          });
        }
      }

      if (uploadedUrls.length > 0) {
        setHotelImages(prev => {
          const hasPrimary = prev.some(img => img.isPrimary);
          const updated = [...prev, ...uploadedUrls];
          if (!hasPrimary && updated.length > 0) {
            updated[0].isPrimary = true;
          }
          return updated;
        });
        triggerToast(`Đã tải lên thành công ${uploadedUrls.length} hình ảnh!`);
      }
    } catch (err) {
      console.error(err);
      await showAlert('Đã xảy ra lỗi trong quá trình tải ảnh lên.', { type: 'error' });
    } finally {
      setIsUploadingImage(false);
      e.target.value = '';
    }
  };

  const [uploadingRoomImage, setUploadingRoomImage] = useState(false);

  const handleRoomTypeFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingRoomImage(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });

      const res = await apiClient.post('/hotels/upload-image', { image: base64 });
      if (res.data.success) {
        setNewRoomImageUrl(res.data.data.url);
        triggerToast('Đã tải ảnh hạng phòng từ máy tính lên thành công!');
      }
    } catch (err) {
      console.error(err);
      triggerToast('Đã xảy ra lỗi khi tải ảnh hạng phòng lên.');
    } finally {
      setUploadingRoomImage(false);
      e.target.value = '';
    }
  };

  const getGroupedSystemAmenities = () => {
    const grouped: Record<string, { title: string; items: { id: string; name: string; icon?: string | null }[] }> = {
      internet: { title: 'Internet & Truyền thông', items: [] },
      parking: { title: 'Chỗ đậu xe', items: [] },
      bathroom: { title: 'Phòng tắm', items: [] },
      bedroom: { title: 'Phòng ngủ', items: [] },
      outdoor: { title: 'Ngoài trời', items: [] },
      kitchen: { title: 'Nhà bếp', items: [] },
      room: { title: 'Tiện ích trong phòng', items: [] },
      media: { title: 'Truyền thông & Công nghệ', items: [] },
      services: { title: 'Dịch vụ & Tiện ích giải trí', items: [] },
      security: { title: 'An ninh', items: [] },
      general: { title: 'Tổng quát', items: [] },
      languages: { title: 'Ngôn ngữ được sử dụng', items: [] },
      other: { title: 'Tiện ích khác', items: [] }
    };

    systemAmenities.forEach((amenity) => {
      const iconKey = (amenity.icon || '').toLowerCase();
      if (grouped[iconKey]) {
        grouped[iconKey].items.push(amenity);
        return;
      }

      const lower = amenity.name.toLowerCase();
      if (lower.includes('wifi') || lower.includes('internet')) {
        grouped.internet.items.push(amenity);
      } else if (lower.includes('đỗ xe') || lower.includes('đậu xe') || lower.includes('bãi xe') || lower.includes('parking')) {
        grouped.parking.items.push(amenity);
      } else if (lower.includes('tắm') || lower.includes('sen') || lower.includes('toilet') || lower.includes('bồn') || lower.includes('khăn tắm') || lower.includes('vệ sinh')) {
        grouped.bathroom.items.push(amenity);
      } else if (lower.includes('giường') || lower.includes('mền') || lower.includes('gối') || lower.includes('chăn') || lower.includes('tủ quần áo') || lower.includes('bed')) {
        grouped.bedroom.items.push(amenity);
      } else if (lower.includes('ngoài trời') || lower.includes('sân') || lower.includes('vườn') || lower.includes('ban công') || lower.includes('hiên') || lower.includes('thượng')) {
        grouped.outdoor.items.push(amenity);
      } else if (lower.includes('bếp') || lower.includes('lò') || lower.includes('ấm đun') || lower.includes('nấu') || lower.includes('tủ lạnh')) {
        grouped.kitchen.items.push(amenity);
      } else if (lower.includes('tv') || lower.includes('tivi') || lower.includes('màn hình') || lower.includes('truyền hình')) {
        grouped.media.items.push(amenity);
      } else if (lower.includes('an ninh') || lower.includes('bảo vệ') || lower.includes('cctv') || lower.includes('báo cháy') || lower.includes('báo động') || lower.includes('chữa cháy')) {
        grouped.security.items.push(amenity);
      } else if (lower.includes('tiếng') || lower.includes('ngôn ngữ') || lower.includes('dịch thuật')) {
        grouped.languages.items.push(amenity);
      } else if (lower.includes('dọn phòng') || lower.includes('giặt') || lower.includes('đón tiễn') || lower.includes('lễ tân') || lower.includes('trông trẻ')) {
        grouped.services.items.push(amenity);
      } else if (lower.includes('điều hòa') || lower.includes('máy lạnh') || lower.includes('thang máy') || lower.includes('hút thuốc') || lower.includes('cách âm') || lower.includes('quạt')) {
        grouped.general.items.push(amenity);
      } else if (lower.includes('giá treo') || lower.includes('két sắt') || lower.includes('tiện ích phòng') || lower.includes('bàn làm việc')) {
        grouped.room.items.push(amenity);
      } else {
        if (lower.includes('dịch vụ') || lower.includes('spa') || lower.includes('massage') || lower.includes('bar') || lower.includes('hồ bơi') || lower.includes('bể bơi') || lower.includes('gym')) {
          grouped.services.items.push(amenity);
        } else {
          grouped.other.items.push(amenity);
        }
      }
    });

    return Object.values(grouped).filter(g => g.items.length > 0);
  };

  const handleDeleteRoomType = async (rtId: string) => {
    try {
      await apiClient.delete(`/hotels/room-types/${rtId}`);
      setRoomTypes(prev => prev.filter(r => r.id !== rtId));
      triggerToast('Xóa hạng phòng thành công!');
    } catch (err) {
      console.error(err);
      await showAlert('Không thể xóa hạng phòng này.', { type: 'error' });
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.dispatchEvent(new Event('auth:logout'));
      navigate('/');
    }
  };



  return (
    <div className="min-h-screen font-sans flex flex-col bg-[#F8FAFC] text-[#1E293B]">

      {/* TOAST NOTIFICATION */}
      {successToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white font-extrabold px-6 py-4 rounded-xl shadow-2xl z-55 flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}

      {/* HEADER (70px height) */}
      <header className="h-[70px] border-b border-[#E2E8F0] px-6 flex justify-between items-center z-40 sticky top-0 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.02)]">

        {/* Left header */}
        <div className="flex items-center gap-3 md:gap-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-[#64748B]"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-black text-sm">
              CB
            </div>
            <span className="font-black tracking-wide text-md text-[#0F172A] hidden sm:inline-block">
              {language === 'vi' ? 'CHỦ KHÁCH SẠN' : 'OWNER EXTRANET'}
            </span>
          </div>

          {/* Hotel Selector Dropdown */}
          {hotelsList.length > 0 && (
            <div className="flex items-center gap-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-xl px-3 py-1.5 transition-all shadow-2xs">
              <Hotel className="w-4 h-4 text-[#2563EB] shrink-0" />
              <select
                value={hotelId}
                onChange={(e) => handleSelectHotel(e.target.value)}
                className="bg-transparent border-none outline-none text-xs text-[#0F172A] font-black cursor-pointer pr-1"
              >
                {hotelsList.map(h => (
                  <option key={h.id} value={h.id}>{h.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Middle search */}
        <div className="hidden md:flex items-center w-80 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#2563EB]/25 focus-within:border-[#2563EB] focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-[#94A3B8] mr-2" />
          <input
            type="text"
            placeholder={language === 'vi' ? 'Tìm đơn đặt phòng...' : 'Search booking...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-[#1E293B] font-semibold placeholder-[#94A3B8]"
          />
        </div>

        {/* Right tools */}
        <div className="flex items-center gap-3.5">

          {/* Language selection */}
          <button
            onClick={() => setLanguage(language === 'vi' ? 'en' : 'vi')}
            className="flex items-center gap-1 text-xs font-black px-2.5 py-1.5 rounded-lg hover:bg-slate-100 text-[#64748B] hover:text-[#2563EB] transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span className="uppercase">{language}</span>
          </button>

          {/* Theme switch */}
          <button
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-[#64748B] hover:text-[#2563EB]"
          >
            {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5 text-amber-500" />}
          </button>

          {/* Notification bell */}
          <div ref={notificationsDropdownRef} className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2.5 rounded-xl hover:bg-slate-100 relative transition-colors text-[#64748B] hover:text-[#2563EB]"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-[#E2E8F0] p-4 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] z-55 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                  <h4 className="font-extrabold text-xs text-[#1E293B]">{language === 'vi' ? 'Hộp thư thông báo' : 'Notifications'}</h4>
                  <span className="text-[8px] bg-rose-55 text-rose-500 px-1.5 py-0.5 rounded font-black uppercase">NEW</span>
                </div>
                <div className="space-y-3">
                  <div className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] space-y-1 text-[#1E293B]">
                    <p className="font-bold">Đơn đặt phòng mới từ Nguyễn Văn A</p>
                    <p className="text-[#64748B]">Rex Hotel - Standard Room - 12/07 - 14/07.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* User Profile dropdown */}
          <div ref={profileDropdownRef} className="relative">
            <button
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-50 text-[#1E293B] flex items-center justify-center font-black text-sm border border-[#CBD5E1]">
                {user?.fullName?.charAt(0) || 'O'}
              </div>
              <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 rounded-2xl border border-[#E2E8F0] p-2 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] z-55 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
                  <p className="text-[11px] font-black text-[#1E293B]">{user?.fullName || 'Owner Partner'}</p>
                  <p className="text-[9px] text-[#64748B] mt-0.5">{user?.email}</p>
                </div>
                <button onClick={() => setActiveMenu('settings')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold text-left text-[#334155] hover:bg-[#F8FAFC]">
                  <User className="w-3.5 h-3.5 text-[#64748B]" /> My Profile
                </button>
                <button onClick={() => setActiveMenu('hotel')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold text-left text-[#334155] hover:bg-[#F8FAFC]">
                  <Hotel className="w-3.5 h-3.5 text-[#64748B]" /> Hotel Profile
                </button>
                <button onClick={() => setActiveMenu('finance')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold text-left text-[#334155] hover:bg-[#F8FAFC]">
                  <CreditCard className="w-3.5 h-3.5 text-[#64748B]" /> Bank Account
                </button>
                <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-extrabold text-left text-rose-500 hover:bg-rose-50">
                  <LogOut className="w-3.5 h-3.5" /> Logout
                </button>
              </div>
            )}
          </div>

        </div>
      </header>

      {/* DASHBOARD WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row relative">

        {/* COLLAPSIBLE SIDEBAR */}
        <aside className={`shrink-0 z-35 transition-all duration-300 lg:sticky lg:top-[70px] lg:h-[calc(100vh-70px)] ${sidebarCollapsed ? 'w-0 lg:w-20' : 'w-full lg:w-72'} bg-[#0F172A] border-r border-[#1E293B]`}>
          <div className="p-5 flex flex-col gap-1.5 h-full overflow-y-auto">

            <div className="space-y-6">

              {/* OPERATE */}
              <div>
                <span className={`text-[9px] font-black uppercase tracking-wider block mb-2 text-slate-400 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
                  {!sidebarCollapsed ? (language === 'vi' ? 'Vận hành' : 'Operate') : '••'}
                </span>

                <button
                  onClick={() => setActiveMenu('dashboard')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeMenu === 'dashboard' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Dashboard</span>}
                </button>

                <button
                  onClick={() => setActiveMenu('hotel')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${activeMenu === 'hotel' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <Hotel className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Khách sạn của tôi' : 'My Hotel'}</span>}
                </button>
              </div>

              {/* ROOMS & RESERVATIONS */}
              <div>
                <span className={`text-[9px] font-black uppercase tracking-wider block mb-2 text-slate-400 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
                  {!sidebarCollapsed ? (language === 'vi' ? 'Khách hàng & Đặt phòng' : 'Rooms & Bookings') : '••'}
                </span>

                <button
                  onClick={() => setActiveMenu('rooms')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeMenu === 'rooms' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <Bed className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Danh sách phòng' : 'Rooms List'}</span>}
                </button>

                <button
                  onClick={() => setActiveMenu('bookings')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${activeMenu === 'bookings' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <CalendarRange className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Đơn đặt phòng' : 'Bookings'}</span>}
                </button>

                <button
                  onClick={() => setActiveMenu('calendar')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${activeMenu === 'calendar' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <Sliders className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Lịch giá & Availability' : 'Avail Calendar'}</span>}
                </button>

                <button
                  onClick={() => setActiveMenu('staff')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${activeMenu === 'staff' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Quản lý nhân viên' : 'Staff Accounts'}</span>}
                </button>
              </div>

              {/* RETAIL & FINANCIALS */}
              <div>
                <span className={`text-[9px] font-black uppercase tracking-wider block mb-2 text-slate-400 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
                  {!sidebarCollapsed ? (language === 'vi' ? 'Khuyến mãi & Tài chính' : 'Finance') : '••'}
                </span>

                <button
                  onClick={() => setActiveMenu('promotions')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeMenu === 'promotions' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <Percent className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Voucher & Flash Sale' : 'Promotions'}</span>}
                </button>

                <button
                  onClick={() => setActiveMenu('finance')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${activeMenu === 'finance' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Giao dịch & Số dư' : 'Finance Info'}</span>}
                </button>
              </div>

              {/* CRM & MESSAGES */}
              <div>
                <span className={`text-[9px] font-black uppercase tracking-wider block mb-2 text-slate-400 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
                  {!sidebarCollapsed ? (language === 'vi' ? 'Chăm sóc & Phản hồi' : 'CRM & Support') : '••'}
                </span>

                <button
                  onClick={() => setActiveMenu('reviews')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeMenu === 'reviews' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <Star className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Đánh giá & Trả lời' : 'Reviews'}</span>}
                </button>

                <button
                  onClick={() => setActiveMenu('support')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${activeMenu === 'support' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <MessageSquare className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Tư vấn trực tuyến' : 'Live Chat'}</span>}
                </button>
              </div>

              {/* REPORT & GENERAL */}
              <div>
                <span className={`text-[9px] font-black uppercase tracking-wider block mb-2 text-slate-400 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
                  {!sidebarCollapsed ? (language === 'vi' ? 'Cấu hình chung' : 'Reports & Settings') : '••'}
                </span>

                <button
                  onClick={() => setActiveMenu('reports')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${activeMenu === 'reports' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Thống kê vận hành' : 'Operational Reports'}</span>}
                </button>

                <button
                  onClick={() => setActiveMenu('settings')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${activeMenu === 'settings' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Cấu hình tài khoản' : 'Settings'}</span>}
                </button>
              </div>

            </div>

          </div>
        </aside>

        {/* WORKSPACE AREA */}
        <main className="flex-1 p-6 sm:p-8 bg-[#F8FAFC]">

          {/* Breadcrumbs */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-[32px] font-bold text-[#0F172A] tracking-tight uppercase">
                {activeMenu}
              </h2>
              <p className="text-[10px] text-[#64748B] font-extrabold uppercase mt-1">
                Owner Extranet &gt; {activeMenu}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#334155] rounded-xl shadow-sm transition-all"><RefreshCw className="w-4 h-4" /></button>
              <button className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#334155] rounded-xl shadow-sm transition-all"><Download className="w-4 h-4" /></button>
            </div>
          </div>

          {/* 1. DASHBOARD VIEW */}
          {activeMenu === 'staff' && (
            <OwnerStaffManagement hotels={hotelsList} />
          )}

          {activeMenu === 'dashboard' && (
            <div className="space-y-6">

              {/* 10 STAT STATISTIC CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Đơn đặt hôm nay</span>
                  <p className="text-2xl font-black mt-1 text-[#0F172A]">{stats.todayBookings}</p>
                </div>
                <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Nhận phòng sắp tới</span>
                  <p className="text-2xl font-black mt-1 text-[#0F172A]">{stats.upcomingCheckIn}</p>
                </div>
                <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Trả phòng sắp tới</span>
                  <p className="text-2xl font-black mt-1 text-[#0F172A]">{stats.upcomingCheckOut}</p>
                </div>
                <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Phòng trống khả dụng</span>
                  <p className="text-2xl font-black mt-1 text-[#0F172A]">{stats.availableRooms}</p>
                </div>
                <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Phòng đang lấp đầy</span>
                  <p className="text-2xl font-black mt-1 text-[#0F172A]">{stats.occupiedRooms}</p>
                </div>
                <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Doanh thu hôm nay</span>
                  <p className="text-2xl font-black text-emerald-600 mt-1">{formatNumberDots(stats.revenueToday)} đ</p>
                </div>
                <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Doanh thu tháng này</span>
                  <p className="text-2xl font-black text-emerald-700 mt-1">{formatNumberDots(stats.revenueMonth)} đ</p>
                </div>
                <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Đánh giá trung bình</span>
                  <p className="text-2xl font-black text-[#92400E] mt-1">
                    {stats.averageRating > 0 ? `${(stats.averageRating <= 5 ? stats.averageRating * 2 : stats.averageRating).toFixed(1)} / 10 ★` : '0.0 / 10 ★'}
                  </p>
                </div>
                <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Tỷ lệ lấp đầy</span>
                  <p className="text-2xl font-black mt-1 text-[#0F172A]">{stats.occupancyRate}%</p>
                </div>
                <div className="p-4 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <span className="text-[10px] font-semibold text-[#64748B] uppercase block">Tỷ lệ hủy phòng</span>
                  <p className="text-2xl font-black text-rose-600 mt-1">{stats.cancellationRate}%</p>
                </div>
              </div>

              {/* CHARTS CONTAINER */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl lg:col-span-2 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F1F5F9]">
                    <h3 className="font-bold text-sm text-[#1E293B] uppercase tracking-wide">
                      {language === 'vi' ? 'Thống kê doanh thu & đơn đặt phòng' : 'Revenue & Bookings Analytics'}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">{language === 'vi' ? 'Xem theo:' : 'View by:'}</span>
                      <select
                        value={chartTimeFrame}
                        onChange={(e) => {
                          const val = e.target.value as 'month' | 'week' | 'day';
                          setChartTimeFrame(val);
                          fetchOwnerStats(hotelId, val);
                        }}
                        className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-1.5 text-xs font-extrabold text-[#0F172A] outline-none focus:border-[#2563EB] cursor-pointer"
                      >
                        <option value="month">Theo tháng (Các ngày trong tháng này)</option>
                        <option value="week">Theo tuần (Các ngày trong tuần này)</option>
                        <option value="day">Theo ngày (7 ngày gần nhất)</option>
                      </select>
                    </div>
                  </div>

                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} stroke="#64748b" tickLine={false} />
                        <YAxis
                          yAxisId="left"
                          fontSize={9}
                          stroke="#2563EB"
                          tickFormatter={(val) => `${formatNumberDots(val)} đ`}
                          width={90}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          fontSize={10}
                          stroke="#F59E0B"
                          tickFormatter={(val) => `${val} đơn`}
                          allowDecimals={false}
                          width={45}
                        />
                        <Tooltip
                          formatter={(value: any, name: string) => {
                            if (name === 'DoanhThu' || name === 'Doanh thu') {
                              return [`${formatNumberDots(value)} đ`, 'Doanh thu'];
                            }
                            return [`${value} đơn`, 'Số đơn đặt'];
                          }}
                          contentStyle={{ borderRadius: '12px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }}
                        />
                        <Legend
                          formatter={(value) => (value === 'DoanhThu' ? 'Doanh thu (Cột)' : 'Số đơn đặt (Đường)')}
                          wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 700 }}
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="DoanhThu"
                          name="DoanhThu"
                          fill="#2563EB"
                          radius={[6, 6, 0, 0]}
                          maxBarSize={36}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="Bookings"
                          name="Bookings"
                          stroke="#F59E0B"
                          strokeWidth={3}
                          dot={{ r: 4, fill: '#F59E0B', strokeWidth: 2, stroke: '#ffffff' }}
                          activeDot={{ r: 6 }}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl">
                  <h3 className="font-bold text-sm text-[#1E293B] mb-4 uppercase">
                    {language === 'vi' ? 'Tỉ lệ lấp đầy phòng theo hạng' : 'Occupancy Rate by Category'}
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={occupancyData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" domain={[0, 100]} fontSize={10} />
                        <YAxis type="category" dataKey="name" fontSize={9} width={80} />
                        <Tooltip formatter={(value: any) => [`${value}%`, 'Tỉ lệ lấp đầy']} />
                        <Bar dataKey="rate" fill="#2563EB" radius={[0, 10, 10, 0]}>
                          {occupancyData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>


              {/* RECENT BOOKING & RECENT REVIEWS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Bookings Table */}
                <div className="p-5 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-sm text-[#1E293B] uppercase">
                      {language === 'vi' ? 'Khách đang ở / sắp nhận phòng' : 'Upcoming / Check-in List'}
                    </h3>
                    <button onClick={() => setActiveMenu('bookings')} className="text-[10px] font-black text-[#2563EB] hover:underline uppercase">View All</button>
                  </div>

                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table className="min-w-full text-xs font-semibold text-slate-650 text-left">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] uppercase text-[#475569] font-bold">
                        <tr>
                          <th className="px-4 py-3">Khách</th>
                          <th className="px-4 py-3">Nhận / Trả</th>
                          <th className="px-4 py-3">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] bg-white">
                        {(() => {
                          const filteredBookings = bookings.filter(b => {
                            const matchHotel = !hotelId || hotelId === 'ALL' || b.bookingItems?.some(item => item.roomType?.hotel?.id === hotelId);
                            const matchStatus = b.status === 'CONFIRMED' || b.status === 'CHECKED_IN';
                            return matchHotel && matchStatus;
                          });
                          return filteredBookings.length > 0 ? filteredBookings.slice(0, 5).map((b, idx) => (
                            <tr key={b.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                              <td className="px-4 py-3">
                                <p className="font-bold text-[#1E293B]">{b.guestName}</p>
                                <p className="text-[9px] text-[#64748B]">{b.guestPhone}</p>
                              </td>
                              <td className="px-4 py-3 text-[#64748B]">
                                <p>{formatDateVN(b.checkInDate)} / {formatDateVN(b.checkOutDate)}</p>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex gap-1.5">
                                  {b.status === 'CONFIRMED' && (
                                    <button onClick={() => handleUpdateBookingStatus(b.id, 'CHECKED_IN')} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-[9px] px-2.5 py-1 rounded-xl shadow-sm">Check In</button>
                                  )}
                                  {b.status === 'CHECKED_IN' && (
                                    <span className="bg-[#DBEAFE] text-[#1D4ED8] text-[8px] font-black px-2 py-0.5 rounded-full uppercase">Đang ở</span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )) : (
                            <tr>
                              <td colSpan={3} className="text-center py-6 text-[#64748B] font-bold bg-white">Không có khách đang ở hoặc sắp nhận phòng</td>
                            </tr>
                          );
                        })()}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Reviews */}
                <div className="p-5 bg-white border border-[#E2E8F0] rounded-2xl shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-sm text-[#1E293B] uppercase">
                      {language === 'vi' ? 'Đánh giá khách hàng gần đây' : 'Guest Reviews'}
                    </h3>
                  </div>
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {recentReviews.length > 0 ? recentReviews.map((review: any) => (
                      <div key={review.id} className="p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl space-y-1.5">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-[#1E293B]">{review.guestName}</span>
                          <span className="text-amber-600 font-extrabold">{(review.ratingOverall <= 5 ? review.ratingOverall * 2 : review.ratingOverall).toFixed(1)} / 10 ★</span>
                        </div>
                        <p className="text-[10px] text-[#64748B] font-medium leading-relaxed">"{review.comment}"</p>
                        <p className="text-[8px] text-[#94A3B8] font-semibold">{formatDateVN(review.createdAt)}</p>
                      </div>
                    )) : (
                      <div className="text-center py-6 text-[#64748B] font-bold text-xs">Chưa có đánh giá nào từ khách hàng</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 2. HOTEL INFORMATION */}
          {activeMenu === 'hotel' && (
            <div className="bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl p-6 space-y-6">
              <div className="border-b border-[#E2E8F0] pb-3 flex justify-between items-center">
                <h3 className="font-bold text-base text-[#0F172A] uppercase">
                  {hotelId ? 'Hồ sơ chỗ lưu trú' : 'Đăng ký chỗ lưu trú mới'}
                </h3>
                {hotelId ? (
                  <span className="text-[10px] text-[#64748B] font-extrabold uppercase bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200">
                    Cập nhật yêu cầu phê duyệt lại
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold uppercase bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-200">
                    ⭐ Điền đủ thông tin rồi gửi đăng ký
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">

                {/* Cột 1: Thông tin cơ bản & Thời gian */}
                <div className="space-y-4">
                  <h4 className="font-black text-[#2563EB] uppercase tracking-wider text-[10px]">1. Thông tin cơ bản & Thời gian</h4>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#64748B] font-bold uppercase">Tên chỗ lưu trú</label>
                    <input type="text" value={hotelName} onChange={(e) => setHotelName(e.target.value)} className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] p-2.5 rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold" />
                  </div>

                  {/* PropertyType Selector */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-[#64748B] font-bold uppercase">Loại hình chỗ lưu trú</label>
                    <div className="grid grid-cols-3 gap-2">
                      {([
                        { value: 'HOTEL', label: 'Khách sạn' },
                        { value: 'APARTMENT', label: 'Căn hộ' },
                        { value: 'VILLA', label: 'Villa' },
                        { value: 'RESORT', label: 'Resort' },
                        { value: 'HOMESTAY', label: 'Homestay' },
                        { value: 'GUESTHOUSE', label: 'Nhà nghỉ' },
                      ] as const).map(pt => (
                        <button
                          key={pt.value}
                          type="button"
                          onClick={() => setPropertyType(pt.value)}
                          className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-[10px] font-bold ${propertyType === pt.value
                            ? 'border-[#2563EB] bg-[#EFF6FF] text-[#2563EB]'
                            : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-[#93C5FD]'
                            }`}
                        >
                          <PropertyTypeIcon type={pt.value} className="w-5 h-5" />
                          <span>{pt.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Star Rating */}
                  <div className="space-y-2">
                    <label className="text-[10px] text-[#64748B] font-bold uppercase">Hạng sao (1-5 sao)</label>
                    <div className="flex gap-2">
                      {[1, 2, 3, 4, 5].map(s => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setStarRating(s)}
                          className={`flex-1 py-2 rounded-xl border-2 text-sm font-bold transition-all ${starRating === s
                            ? 'border-amber-400 bg-amber-50 text-amber-600'
                            : 'border-[#E2E8F0] bg-white text-[#64748B] hover:border-amber-200'
                            }`}
                        >
                          {'★'.repeat(s)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#64748B] font-bold uppercase">Mô tả tổng quan</label>
                    <textarea rows={4} value={hotelDesc} onChange={(e) => setHotelDesc(e.target.value)} className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] p-2.5 rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold" />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#64748B] font-bold uppercase">Thời gian nhận phòng (Check-in)</label>
                      <input type="text" value={checkInTime} onChange={(e) => setCheckInTime(e.target.value)} className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] p-2.5 rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#64748B] font-bold uppercase">Thời gian trả phòng (Check-out)</label>
                      <input type="text" value={checkOutTime} onChange={(e) => setCheckOutTime(e.target.value)} className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] p-2.5 rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#64748B] font-bold uppercase">Chính sách chung</label>
                    <input type="text" value={hotelPolicies} onChange={(e) => setHotelPolicies(e.target.value)} className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] p-2.5 rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold" />
                  </div>
                </div>

                {/* Cột 2: Địa chỉ & Vị trí tọa độ */}
                <div className="space-y-4">
                  <h4 className="font-black text-[#2563EB] uppercase tracking-wider text-[10px]">2. Địa điểm & Vị trí bản đồ</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <div>
                      <CustomSelect
                        label="Tỉnh / Thành phố"
                        value={provinceId}
                        onChange={(val) => { setProvinceId(val); setDistrictId(''); setWardId(''); }}
                        placeholder="Chọn Tỉnh/Thành..."
                        options={provinces.map(p => ({ value: p.id, label: p.name }))}
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Quận / Huyện"
                        value={districtId}
                        onChange={(val) => { setDistrictId(val); setWardId(''); }}
                        placeholder={provinceId ? "Chọn Quận/Huyện..." : "Chọn Tỉnh trước"}
                        options={districts.map(d => ({ value: d.id, label: d.name }))}
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Phường / Xã"
                        value={wardId}
                        onChange={(val) => setWardId(val)}
                        placeholder={districtId ? "Chọn Phường/Xã..." : "Chọn Huyện trước"}
                        options={wards.map(w => ({ value: w.id, label: w.name }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-[#64748B] font-bold uppercase">Địa chỉ (Số nhà, Tên đường)</label>
                    <input type="text" value={hotelAddress} onChange={(e) => setHotelAddress(e.target.value)} placeholder="VD: 141 Nguyễn Huệ" className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] p-2.5 rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold" />
                  </div>

                  {/* Smart Location Coordinate Helper Tools */}
                  <div className="bg-blue-50/50 border border-blue-200/80 p-4 rounded-2xl space-y-3">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-1.5 border-b border-blue-100 pb-2">
                      <div>
                        <h5 className="font-extrabold text-[#2563EB] text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <MapPin className="w-4 h-4 text-blue-600" /> Công cụ hỗ trợ lấy Tọa độ tự động (Không cần nhập tay)
                        </h5>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          Bấm chọn 1 trong các cách nhanh bên dưới để tự điền Vĩ độ & Kinh độ:
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={handleGeocodeFromAddress}
                        disabled={isGeocoding}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 disabled:opacity-50 cursor-pointer"
                      >
                        <Search className="w-3.5 h-3.5" />
                        <span>{isGeocoding ? 'Đang lấy tọa độ...' : '1. Lấy tọa độ từ Địa chỉ đã chọn'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleGetGPSLocation}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all shadow-xs flex items-center gap-1.5 active:scale-95 cursor-pointer"
                      >
                        <MapPin className="w-3.5 h-3.5" />
                        <span>2. Lấy vị trí GPS hiện tại của tôi</span>
                      </button>
                    </div>

                    <div className="pt-2 border-t border-blue-100 space-y-1">
                      <label className="text-[10px] font-extrabold text-slate-600 uppercase">
                        3. Hoặc dán Link Google Maps để trích xuất tọa độ tự động:
                      </label>
                      <input
                        type="text"
                        value={googleMapsUrl}
                        onChange={(e) => handleParseGoogleMapsUrl(e.target.value)}
                        placeholder="Dán link Google Maps tại đây (VD: https://www.google.com/maps/@10.7761,106.7014)..."
                        className="w-full bg-white border border-blue-200 text-[#1E293B] p-2 text-xs rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold"
                      />
                    </div>

                    {locationMsg && (
                      <div className={`p-2.5 rounded-xl text-xs font-bold ${locationMsg.error ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'}`}>
                        {locationMsg.text}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#64748B] font-bold uppercase">Vĩ độ (Latitude)</label>
                      <input type="number" step="any" value={hotelLat} onChange={(e) => setHotelLat(e.target.value !== '' ? Number(e.target.value) : '')} placeholder="VD: 10.7761" className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] p-2.5 rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-[#64748B] font-bold uppercase">Kinh độ (Longitude)</label>
                      <input type="number" step="any" value={hotelLng} onChange={(e) => setHotelLng(e.target.value !== '' ? Number(e.target.value) : '')} placeholder="VD: 106.7014" className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] p-2.5 rounded-xl outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold" />
                    </div>
                  </div>
                </div>

              </div>

              {/* Dưới: Tiện ích & Hình ảnh */}
              <div className="border-t border-[#E2E8F0] pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-semibold">

                {/* 3. Tiện ích khách sạn */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-2">
                    <h4 className="font-black text-[#2563EB] uppercase tracking-wider text-[10px]">3. Tiện ích khách sạn</h4>
                    <button
                      type="button"
                      onClick={() => setIsAmenitiesModalOpen(true)}
                      className="text-[10px] text-[#2563EB] hover:text-[#1d4ed8] font-black underline flex items-center gap-1"
                    >
                      Thiết lập tiện ích ({selectedAmenities.length})
                    </button>
                  </div>

                  {/* Tóm tắt các tiện ích đã chọn */}
                  {selectedAmenities.length > 0 ? (
                    <div
                      onClick={() => setIsAmenitiesModalOpen(true)}
                      className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl flex flex-wrap gap-1.5 max-h-[180px] overflow-y-auto cursor-pointer hover:bg-slate-100/50 transition-colors"
                    >
                      {systemAmenities
                        .filter(a => selectedAmenities.includes(a.id))
                        .map(a => (
                          <span key={a.id} className="bg-white border border-slate-150 text-slate-700 px-2 py-0.5 rounded-lg text-[9px] font-bold shadow-sm">
                            ✓ {a.name}
                          </span>
                        ))}
                    </div>
                  ) : (
                    <div
                      onClick={() => setIsAmenitiesModalOpen(true)}
                      className="border border-dashed border-slate-300 hover:border-[#2563EB] rounded-2xl p-6 text-center cursor-pointer text-slate-400 hover:text-[#2563EB] transition-colors"
                    >
                      <p className="text-[10px] font-bold">Chưa chọn tiện ích nào.</p>
                      <p className="text-[9px] mt-0.5">Nhấp vào đây để cấu hình tiện ích khách sạn</p>
                    </div>
                  )}
                </div>

                {/* 4. Album Hình ảnh */}
                <div className="space-y-3">
                  <h4 className="font-black text-[#2563EB] uppercase tracking-wider text-[10px]">4. Hình ảnh khách sạn</h4>

                  {/* Tải ảnh từ thiết bị cục bộ */}
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                    <label className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-300 hover:border-[#2563EB] hover:bg-blue-50/10 rounded-2xl p-4 cursor-pointer transition-all text-center relative group min-h-[90px] bg-slate-50/20">
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={isUploadingImage}
                        className="hidden"
                      />
                      {isUploadingImage ? (
                        <div className="flex flex-col items-center gap-2">
                          <RefreshCw className="w-5 h-5 text-[#2563EB] animate-spin" />
                          <span className="text-[10px] font-black text-[#2563EB] uppercase">Đang tải ảnh lên...</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <span className="text-xl">📁</span>
                          <span className="text-[10px] font-black text-slate-700 uppercase group-hover:text-[#2563EB] transition-colors">
                            Chọn ảnh từ máy tính
                          </span>
                          <span className="text-[8px] text-slate-400 font-bold">
                            Hỗ trợ chọn nhiều ảnh cùng lúc
                          </span>
                        </div>
                      )}
                    </label>

                    {/* Hoặc thêm từ URL */}
                    <div className="flex flex-col justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200 sm:w-56 gap-2">
                      <span className="text-[9px] font-black text-[#64748B] uppercase tracking-wider">
                        Hoặc thêm URL ảnh:
                      </span>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="https://example.com/img.jpg"
                          value={newImageUrl}
                          onChange={(e) => setNewImageUrl(e.target.value)}
                          className="flex-1 bg-white border border-[#CBD5E1] text-[#1E293B] px-2.5 py-1.5 rounded-xl outline-none text-[10px] font-semibold focus:border-[#2563EB] placeholder-[#94A3B8]"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (!newImageUrl.trim()) return;
                            setHotelImages(prev => [...prev, { url: newImageUrl.trim(), isPrimary: prev.length === 0 }]);
                            setNewImageUrl('');
                            triggerToast('Đã thêm liên kết ảnh!');
                          }}
                          className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3 py-1.5 rounded-xl font-bold text-[10px] transition-all shadow-sm active:scale-95 whitespace-nowrap"
                        >
                          Thêm
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danh sách ảnh hiện tại */}
                  <div className="grid grid-cols-2 gap-3 max-h-[160px] overflow-y-auto pr-1">
                    {hotelImages.map((img, idx) => (
                      <div key={idx} className="relative border border-slate-200 rounded-xl overflow-hidden group shadow-sm bg-slate-50 flex items-center p-1.5 gap-2">
                        <img src={img.url} alt="Hotel Preview" className="w-12 h-12 rounded-lg object-cover bg-white border border-slate-100" />
                        <div className="flex-1 flex flex-col justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setHotelImages(prev => prev.map((item, i) => ({ ...item, isPrimary: i === idx })));
                            }}
                            className={`text-[9px] font-black px-1.5 py-0.5 rounded-full w-fit ${img.isPrimary ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-slate-100 text-slate-650 border border-slate-200 hover:bg-slate-200'
                              }`}
                          >
                            {img.isPrimary ? 'Ảnh chính' : 'Đặt chính'}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setHotelImages(prev => prev.filter((_, i) => i !== idx));
                          }}
                          className="absolute top-1 right-1 bg-rose-50 text-rose-600 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all hover:bg-rose-100"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                </div>

              </div>

              {/* Nút lưu */}
              <div className="pt-4 border-t border-[#E2E8F0] flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveHotelInfo}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-3 rounded-xl font-bold text-xs shadow-md transition-all active:scale-[0.98]"
                >
                  {hotelId ? 'Lưu thông tin hồ sơ' : 'Đăng ký chỗ lưu trú'}
                </button>
              </div>

            </div>
          )}

          {/* 3. ROOM TYPES & CRUD */}
          {activeMenu === 'rooms' && (
            <div className="space-y-5">
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3.5">
                <h3 className="font-extrabold text-[#0F172A] text-sm uppercase tracking-wider">Danh sách hạng phòng</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportRoomsExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Xuất Excel
                  </button>
                  <button
                    onClick={handleOpenAddRoomType}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> {language === 'vi' ? 'Thêm hạng phòng' : 'Add Room Type'}
                  </button>
                </div>
              </div>

              {roomTypes.length === 0 ? (
                <div className="text-center py-12 bg-white border border-[#E2E8F0] rounded-3xl p-6 text-slate-450 font-bold text-xs space-y-2">
                  <p>Chưa có hạng phòng nào được thiết lập cho khách sạn này.</p>
                  <p className="text-[10px] text-slate-400">Hãy nhấn "Thêm hạng phòng" ở trên để bắt đầu thêm!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {roomTypes.map((rt: any) => {
                    const roomImg = rt.images?.[0]?.url || 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=600&q=80';
                    const totalRoomsCount = rt.totalRooms || rt.rooms?.length || 0;
                    const occupiedRoomsCount = rt.bookedRooms || bookings.filter((b: any) => ['CONFIRMED', 'CHECKED_IN', 'PENDING'].includes(b.status) && b.bookingItems?.some((i: any) => i.roomTypeId === rt.id)).reduce((sum: number, b: any) => sum + (b.bookingItems.find((i: any) => i.roomTypeId === rt.id)?.quantity || 0), 0);
                    const remainingRoomsCount = rt.availableRooms !== undefined ? rt.availableRooms : Math.max(0, totalRoomsCount - occupiedRoomsCount);

                    return (
                      <div key={rt.id} className="bg-white rounded-3xl border border-slate-100 shadow-md hover:shadow-xl transition-all overflow-hidden flex flex-col group">
                        {/* Room Image with overlay badges */}
                        <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                          <img src={roomImg} alt={rt.name} className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" />
                          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                            {rt.size && (
                              <span className="bg-slate-900/75 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white/20">
                                {rt.size} m²
                              </span>
                            )}
                            <span className="bg-slate-900/75 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white/20">
                              {rt.capacity} Khách
                            </span>
                            <span className="bg-slate-900/75 backdrop-blur-sm text-white text-[9px] font-black px-2 py-0.5 rounded-full border border-white/20">
                              {rt.bedCount || 1} {rt.bedType || 'Giường'}
                            </span>
                            <span className="bg-emerald-600/90 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full border border-emerald-500/20 shadow-sm">
                              Còn {remainingRoomsCount}/{totalRoomsCount} phòng trống
                            </span>
                          </div>
                        </div>

                        {/* Room Details */}
                        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start gap-2">
                              <h4 className="font-black text-slate-800 text-sm sm:text-base">{rt.name}</h4>
                              <span className="text-[#2563EB] font-black text-xs sm:text-sm whitespace-nowrap bg-blue-50 border border-blue-100 px-2.5 py-0.5 rounded-full">
                                {formatNumberDots(rt.basePrice)} đ
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 font-semibold line-clamp-2 leading-relaxed">
                              {rt.description || 'Chưa có mô tả cho hạng phòng này.'}
                            </p>

                            {/* Room Availability Breakdown Bar */}
                            <div className="bg-slate-50 border border-slate-200/70 p-3 rounded-2xl flex items-center justify-between text-xs font-bold gap-2">
                              <div className="flex items-center gap-2 text-emerald-700">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                                <span>Còn trống: <strong className="text-sm font-black text-emerald-800">{remainingRoomsCount}</strong> / {totalRoomsCount} phòng</span>
                              </div>
                              {occupiedRoomsCount > 0 ? (
                                <span className="bg-amber-100 text-amber-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-amber-300">
                                  {occupiedRoomsCount} phòng đã đặt
                                </span>
                              ) : (
                                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-300">
                                  Sẵn sàng đón khách
                                </span>
                              )}
                            </div>

                            {/* Amenities list */}
                            {rt.amenities && rt.amenities.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-1">
                                {rt.amenities.slice(0, 5).map((am: string) => (
                                  <span key={am} className="bg-slate-100 text-slate-650 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                    {am}
                                  </span>
                                ))}
                                {rt.amenities.length > 5 && (
                                  <span className="bg-slate-105 text-slate-500 text-[9px] font-bold px-2 py-0.5 rounded-full">
                                    +{rt.amenities.length - 5}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Action buttons */}
                          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setManagingRoomTypeForNumbers(rt);
                                  const existingNums = rt.rooms?.map((r: any) => r.roomNumber.toString()) || [];
                                  setInputRoomNumbersList(existingNums);
                                  setNewSingleRoomInput('');
                                }}
                                className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all shadow-xs"
                              >
                                🏨 Số phòng ({rt.rooms?.length || 0})
                              </button>

                              <button
                                type="button"
                                onClick={async () => {
                                  setSelectedRoomTypeForRatePlans(rt);
                                  setLoadingRatePlans(true);
                                  try {
                                    const res = await apiClient.get(`/rate-plans/room-type/${rt.id}`);
                                    if (res.data.success) {
                                      setRatePlansList(res.data.data);
                                    }
                                  } catch (err) {
                                    console.error('Failed to fetch rate plans:', err);
                                  } finally {
                                    setLoadingRatePlans(false);
                                  }
                                }}
                                className="text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center gap-1 transition-all shadow-xs"
                              >
                                ⚙️ Gói ({rt.ratePlans?.length || 2})
                              </button>
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={() => handleOpenEditRoomType(rt)}
                                className="text-slate-650 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 p-2 rounded-xl transition-all shadow-sm"
                                title="Chỉnh sửa hạng phòng"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteRoomType(rt.id)}
                                className="text-[#DC2626] hover:text-[#B91C1C] bg-red-50 hover:bg-red-100 p-2 rounded-xl transition-all shadow-sm"
                                title="Xóa hạng phòng"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 4. RESERVATIONS & BOOKINGS LIST */}
          {activeMenu === 'bookings' && (() => {
            // Calculate quick stats dynamically from raw bookings list
            const todayStr = new Date().toDateString();
            const todayBookings = bookings.filter(b => new Date(b.createdAt).toDateString() === todayStr);
            const pendingBookings = bookings.filter(b => b.status === 'PENDING');
            const checkInToday = bookings.filter(b => new Date(b.checkInDate).toDateString() === todayStr);
            const checkOutToday = bookings.filter(b => new Date(b.checkOutDate).toDateString() === todayStr);
            const cancelledBookings = bookings.filter(b => b.status === 'CANCELLED');
            const revenueToday = bookings
              .filter(b => ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(b.status) && new Date(b.createdAt).toDateString() === todayStr)
              .reduce((acc, b) => acc + Number(b.finalPrice), 0);
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const revenueMonth = bookings
              .filter(b => ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(b.status) && new Date(b.createdAt).getMonth() === currentMonth && new Date(b.createdAt).getFullYear() === currentYear)
              .reduce((acc, b) => acc + Number(b.finalPrice), 0);

            // Filtered bookings list
            const filteredBookings = bookings.filter(b => {
              const term = searchTerm.trim().toLowerCase();
              const matchSearch = !term ||
                b.id.toLowerCase().includes(term) ||
                b.guestName.toLowerCase().includes(term) ||
                b.guestPhone.toLowerCase().includes(term) ||
                b.guestEmail.toLowerCase().includes(term);

              const nowTime = new Date();
              const todayStart = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate());
              let matchStatus = bookingStatusFilter === 'ALL' || b.status === bookingStatusFilter;
              if (bookingStatusFilter === 'OVERDUE') {
                const isNotArrived = ['CONFIRMED', 'PENDING', 'PAYMENT_PROCESSING'].includes(b.status);
                const isOverdueCheckIn = new Date(b.checkInDate) <= nowTime && new Date(b.checkOutDate) > todayStart;
                matchStatus = isNotArrived && isOverdueCheckIn;
              }

              let paymentStatus = 'UNPAID';
              if (b.payment?.status === 'COMPLETED') {
                paymentStatus = 'PAID';
              } else if (b.status === 'REFUNDED' || b.payment?.status === 'REFUNDED') {
                paymentStatus = 'REFUNDED';
              }
              const matchPaymentStatus = filterPaymentStatus === 'ALL' || paymentStatus === filterPaymentStatus;

              const matchHotel = filterHotelId === 'ALL' || b.bookingItems.some(item => item.roomType.hotel.id === filterHotelId);
              const matchRoomType = filterRoomTypeId === 'ALL' || b.bookingItems.some(item => item.roomType.id === filterRoomTypeId);

              const matchCreatedDate = !filterCreatedDate || new Date(b.createdAt).toISOString().substring(0, 10) === filterCreatedDate;
              const matchCheckInDate = !filterCheckInDate || new Date(b.checkInDate).toISOString().substring(0, 10) === filterCheckInDate;
              const matchCheckOutDate = !filterCheckOutDate || new Date(b.checkOutDate).toISOString().substring(0, 10) === filterCheckOutDate;

              return matchSearch && matchStatus && matchPaymentStatus && matchHotel && matchRoomType && matchCreatedDate && matchCheckInDate && matchCheckOutDate;
            });

            // Local CSV (Excel) Export Function
            const handleExportCSV = () => {
              const headers = [
                'Mã đặt phòng',
                'Khách hàng',
                'Số điện thoại',
                'Email',
                'Khách sạn',
                'Loại phòng',
                'Số lượng',
                'Check-in',
                'Check-out',
                'Tổng thanh toán',
                'Trạng thái đơn',
                'Trạng thái thanh toán',
                'Ngày đặt'
              ];

              const rows = filteredBookings.map(b => {
                const hotelNames = b.bookingItems.map(item => item.roomType.hotel.name).join('; ');
                const roomTypes = b.bookingItems.map(item => item.roomType.name).join('; ');
                const quantities = b.bookingItems.map(item => item.quantity).join('; ');

                let payStatus = 'Chưa thanh toán';
                if (b.payment?.status === 'COMPLETED') payStatus = 'Đã thanh toán';
                else if (b.payment?.status === 'REFUNDED') payStatus = 'Đã hoàn tiền';

                return [
                  b.id,
                  b.guestName,
                  `'${b.guestPhone}`,
                  b.guestEmail,
                  hotelNames,
                  roomTypes,
                  quantities,
                  new Date(b.checkInDate).toLocaleDateString('vi-VN'),
                  new Date(b.checkOutDate).toLocaleDateString('vi-VN'),
                  b.finalPrice,
                  b.status,
                  payStatus,
                  new Date(b.createdAt).toLocaleDateString('vi-VN')
                ];
              });

              const csvContent = "\uFEFF" + [
                headers.join(','),
                ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
              ].join('\n');

              const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.setAttribute("href", url);
              link.setAttribute("download", `danh_sach_dat_phong_${new Date().toISOString().slice(0, 10)}.csv`);
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            };

            const openBookingDetail = (b: Booking) => {
              setSelectedBooking(b);
              setDetailModalTab('info');
              setInternalNotesInput(b.internalNotes || '');
              setCheckInDateInput(new Date(b.checkInDate).toISOString().substring(0, 10));
              setCheckOutDateInput(new Date(b.checkOutDate).toISOString().substring(0, 10));

              const assignments: { [itemId: string]: string } = {};
              b.bookingItems.forEach(item => {
                assignments[item.id] = item.roomNumbers || '';
              });
              setRoomAssignmentsInput(assignments);
              fetchBookingAuditLogs(b.id);
            };

            return (
              <div className="space-y-6">
                {/* 1. Quick Stats Dashboard */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                  <div className="bg-white border border-[#E2E8F0] p-3 rounded-2xl shadow-[0_2px_8px_rgba(15,23,42,0.03)] flex flex-col justify-between">
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{language === 'vi' ? 'Đơn Hôm Nay' : 'Today Bookings'}</p>
                    <p className="text-lg font-black text-slate-800 mt-1">{todayBookings.length}</p>
                  </div>
                  <div className="bg-amber-50 border border-amber-100 p-3 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] text-amber-500 font-bold uppercase">{language === 'vi' ? 'Chờ Xác Nhận' : 'Pending'}</p>
                    <p className="text-lg font-black text-amber-700 mt-1">{pendingBookings.length}</p>
                  </div>
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] text-blue-500 font-bold uppercase">{language === 'vi' ? 'Check-in Hôm Nay' : 'Check-in Today'}</p>
                    <p className="text-lg font-black text-blue-700 mt-1">{checkInToday.length}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-100 p-3 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] text-purple-500 font-bold uppercase">{language === 'vi' ? 'Check-out Hôm Nay' : 'Check-out Today'}</p>
                    <p className="text-lg font-black text-purple-700 mt-1">{checkOutToday.length}</p>
                  </div>
                  <div className="bg-red-50 border border-red-100 p-3 rounded-2xl flex flex-col justify-between">
                    <p className="text-[10px] text-red-500 font-bold uppercase">{language === 'vi' ? 'Đơn Bị Hủy' : 'Cancelled'}</p>
                    <p className="text-lg font-black text-red-700 mt-1">{cancelledBookings.length}</p>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-2xl flex flex-col justify-between col-span-1">
                    <p className="text-[10px] text-emerald-500 font-bold uppercase">{language === 'vi' ? 'Doanh Thu Hôm Nay' : 'Revenue Today'}</p>
                    <p className="text-sm font-black text-emerald-700 mt-1">{formatNumberDots(revenueToday)} đ</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl flex flex-col justify-between col-span-1">
                    <p className="text-[10px] text-slate-500 font-bold uppercase">{language === 'vi' ? 'Doanh Thu Tháng' : 'Revenue Month'}</p>
                    <p className="text-sm font-black text-slate-700 mt-1">{formatNumberDots(revenueMonth)} đ</p>
                  </div>
                </div>

                {/* 2. Advanced Filters & Search */}
                <div className="bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-[0_2px_12px_rgba(15,23,42,0.02)] space-y-3">
                  <div className="flex justify-between items-center pb-2 border-b border-[#F1F5F9]">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-[#2563EB]" />
                      {language === 'vi' ? 'Bộ lọc & Tìm kiếm' : 'Filters & Search'}
                    </h4>
                    <div className="flex gap-2">
                      <button onClick={handleExportCSV} className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-3 py-1.5 rounded-xl transition-all flex items-center gap-1">
                        <Download className="w-3 h-3" /> {language === 'vi' ? 'Xuất Excel' : 'Export Excel'}
                      </button>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setBookingStatusFilter('ALL');
                          setFilterPaymentStatus('ALL');
                          setFilterHotelId('ALL');
                          setFilterRoomTypeId('ALL');
                          setFilterCreatedDate('');
                          setFilterCheckInDate('');
                          setFilterCheckOutDate('');
                        }}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold text-[10px] px-3 py-1.5 rounded-xl transition-all"
                      >
                        {language === 'vi' ? 'Đặt lại' : 'Reset'}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs font-semibold">
                    {/* Search Field */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Tìm kiếm nhanh' : 'Search'}</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder={language === 'vi' ? 'Mã đơn, tên, SĐT, email...' : 'Code, name, phone...'}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-8 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-none focus:border-[#2563EB] transition-all font-semibold"
                        />
                      </div>
                    </div>

                    {/* Status Filter */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Trạng thái đơn' : 'Booking Status'}</label>
                      <select
                        value={bookingStatusFilter}
                        onChange={(e) => setBookingStatusFilter(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-none focus:border-[#2563EB] font-semibold"
                      >
                        <option value="ALL">Tất cả trạng thái</option>
                        <option value="OVERDUE">⚠️ QUÁ GIỜ NHẬN PHÒNG (Overdue)</option>
                        <option value="PENDING">PENDING (Chờ xác nhận)</option>
                        <option value="CONFIRMED">CONFIRMED (Đã xác nhận)</option>
                        <option value="CHECKED_IN">CHECKED_IN (Đang lưu trú)</option>
                        <option value="CHECKED_OUT">CHECKED_OUT (Đã trả phòng)</option>
                        <option value="COMPLETED">COMPLETED (Hoàn thành)</option>
                        <option value="CANCELLED">CANCELLED (Đã hủy)</option>
                        <option value="REFUNDED">REFUNDED (Đã hoàn tiền)</option>
                      </select>
                    </div>

                    {/* Payment Status Filter */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Trạng thái thanh toán' : 'Payment Status'}</label>
                      <select
                        value={filterPaymentStatus}
                        onChange={(e) => setFilterPaymentStatus(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-none focus:border-[#2563EB] font-semibold"
                      >
                        <option value="ALL">Tất cả thanh toán</option>
                        <option value="PAID">Đã thanh toán</option>
                        <option value="UNPAID">Chưa thanh toán</option>
                        <option value="REFUNDED">Đã hoàn tiền</option>
                      </select>
                    </div>

                    {/* Hotel Filter */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Khách sạn' : 'Hotel'}</label>
                      <select
                        value={filterHotelId}
                        onChange={(e) => setFilterHotelId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-none focus:border-[#2563EB] font-semibold"
                      >
                        <option value="ALL">Tất cả khách sạn</option>
                        {hotelsList.map(h => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Room Type Filter */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Hạng phòng' : 'Room Type'}</label>
                      <select
                        value={filterRoomTypeId}
                        onChange={(e) => setFilterRoomTypeId(e.target.value)}
                        className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-none focus:border-[#2563EB] font-semibold"
                      >
                        <option value="ALL">Tất cả hạng phòng</option>
                        {roomTypes.map(rt => (
                          <option key={rt.id} value={rt.id}>{rt.name}</option>
                        ))}
                      </select>
                    </div>

                    {/* Filter Created Date */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Ngày đặt đơn' : 'Date Booked'}</label>
                      <input
                        type="date"
                        value={filterCreatedDate}
                        onChange={(e) => setFilterCreatedDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-none focus:border-[#2563EB] font-semibold"
                      />
                    </div>

                    {/* Filter Check-in Date */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Ngày Check-in' : 'Check-in Date'}</label>
                      <input
                        type="date"
                        value={filterCheckInDate}
                        onChange={(e) => setFilterCheckInDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-none focus:border-[#2563EB] font-semibold"
                      />
                    </div>

                    {/* Filter Check-out Date */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Ngày Check-out' : 'Check-out Date'}</label>
                      <input
                        type="date"
                        value={filterCheckOutDate}
                        onChange={(e) => setFilterCheckOutDate(e.target.value)}
                        className="w-full px-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-none focus:border-[#2563EB] font-semibold"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Bookings Data Table */}
                {bookingsLoading ? (
                  <div className="h-64 bg-slate-500/5 rounded-2xl animate-pulse"></div>
                ) : (
                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
                    <table className="min-w-full divide-y divide-[#E2E8F0] text-[11px] font-semibold text-slate-650 text-left">
                      <thead className="bg-[#F8FAFC] text-[9px] uppercase font-bold text-[#475569]">
                        <tr>
                          <th className="px-4 py-3">Mã đơn</th>
                          <th className="px-4 py-3">Khách đặt</th>
                          <th className="px-4 py-3">Khách sạn / Loại phòng</th>
                          <th className="px-4 py-3">Check-in / Check-out</th>
                          <th className="px-4 py-3">Số khách</th>
                          <th className="px-4 py-3">Giá tiền</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3 text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                        {filteredBookings.length === 0 ? (
                          <tr>
                            <td colSpan={8} className="text-center py-12 text-slate-400 font-bold text-xs">
                              {language === 'vi' ? 'Không tìm thấy đơn đặt phòng nào.' : 'No reservations found.'}
                            </td>
                          </tr>
                        ) : (
                          filteredBookings.map((b, idx) => {
                            const nights = Math.max(1, Math.round((new Date(b.checkOutDate).getTime() - new Date(b.checkInDate).getTime()) / (1000 * 60 * 60 * 24)));
                            const hasPaid = b.payment?.status === 'COMPLETED';
                            const refundStatus = b.status === 'REFUNDED' || b.payment?.status === 'REFUNDED';
                            const nowTime = new Date();
                            const todayStart = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate());

                            return (
                              <tr key={b.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                                <td className="px-4 py-3">
                                  <span className="font-extrabold text-[#2563EB] cursor-pointer hover:underline" onClick={() => openBookingDetail(b)}>
                                    #{b.id.substring(0, 8).toUpperCase()}
                                  </span>
                                  <p className="text-[9px] text-[#94A3B8] font-normal">{formatDateTimeVN(b.createdAt)}</p>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-extrabold">{b.guestName}</p>
                                  <p className="text-[9px] text-[#64748B] font-medium">{b.guestPhone}</p>
                                </td>
                                <td className="px-4 py-3">
                                  {b.bookingItems.map(item => (
                                    <div key={item.id}>
                                      <p className="font-extrabold text-slate-700">{item.roomType.hotel.name}</p>
                                      <p className="text-[9px] text-[#64748B] font-medium">{item.roomType.name} x{item.quantity}</p>
                                      {item.roomNumbers && (
                                        <p className="text-[8px] bg-slate-100 text-slate-650 px-1 rounded inline-block font-black mt-0.5">Số phòng: {item.roomNumbers}</p>
                                      )}
                                    </div>
                                  ))}
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-bold text-slate-700">
                                    {formatDateVN(b.checkInDate)} - {formatDateVN(b.checkOutDate)}
                                  </p>
                                  <p className="text-[9px] text-[#64748B] font-normal">{nights} đêm</p>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex items-center gap-1">
                                    <span className="font-bold text-slate-700">{getBookingGuests(b)}</span>
                                    <span className="text-[9px] text-slate-400">{language === 'vi' ? 'khách' : 'guests'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <p className="font-black text-[#0F172A]">{formatNumberDots(b.finalPrice)} đ</p>
                                  {b.discountAmount > 0 && (
                                    <p className="text-[9px] text-red-500 font-bold">-{formatNumberDots(b.discountAmount)} đ (giảm giá)</p>
                                  )}
                                </td>
                                <td className="px-4 py-3 space-y-1">
                                  {/* Đơn hàng status */}
                                  <div>
                                    <span className={`px-2 py-0.5 rounded font-black text-[9px] ${b.status === 'CONFIRMED' ? 'bg-[#EFF6FF] text-[#1E40AF]' :
                                      b.status === 'CHECKED_IN' ? 'bg-[#ECFDF5] text-[#065F46]' :
                                        b.status === 'PENDING' ? 'bg-[#FEF3C7] text-[#92400E]' :
                                          b.status === 'CANCELLED' ? 'bg-[#FEF2F2] text-[#991B1B]' :
                                            b.status === 'CHECKED_OUT' ? 'bg-[#F5F3FF] text-[#5B21B6]' :
                                              b.status === 'COMPLETED' ? 'bg-[#F3F4F6] text-[#374151]' : 'bg-[#FFF7ED] text-[#9A3412]'
                                      }`}>
                                      {b.status === 'CONFIRMED' ? 'GIỮ PHÒNG' : b.status}
                                    </span>
                                    {['CONFIRMED', 'PENDING', 'PAYMENT_PROCESSING'].includes(b.status) && new Date(b.checkInDate) <= nowTime && new Date(b.checkOutDate) > todayStart && (
                                      <span className="px-1.5 py-0.5 rounded font-black text-[8px] bg-rose-600 text-white animate-pulse block mt-1">
                                        ⚠️ QUÁ GIỜ NHẬN PHÒNG
                                      </span>
                                    )}
                                  </div>
                                  {/* Thanh toán status */}
                                  <div>
                                    {hasPaid ? (
                                      <span className="px-1.5 py-0.5 rounded font-bold text-[8px] bg-emerald-100 text-emerald-800">
                                        ĐÃ TT ONLINE
                                      </span>
                                    ) : refundStatus ? (
                                      <span className="px-1.5 py-0.5 rounded font-bold text-[8px] bg-orange-100 text-orange-850">
                                        HOÀN TIỀN
                                      </span>
                                    ) : b.bookingItems?.[0]?.paymentPolicySnapshot?.includes('khách sạn') ? (
                                      <span className="px-1.5 py-0.5 rounded font-bold text-[8px] bg-amber-100 text-amber-800 border border-amber-200">
                                        TRẢ TẠI KHÁCH SẠN
                                      </span>
                                    ) : (
                                      <span className="px-1.5 py-0.5 rounded font-bold text-[8px] bg-slate-100 text-slate-500">
                                        CHƯA TT
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="px-4 py-3">
                                  <div className="flex flex-col gap-1 items-center">
                                    <button
                                      onClick={() => openBookingDetail(b)}
                                      className="bg-slate-100 hover:bg-[#EFF6FF] hover:text-[#2563EB] text-slate-700 font-extrabold text-[9px] px-2.5 py-1 rounded-xl transition-all"
                                    >
                                      {language === 'vi' ? 'Quản lý / Chi tiết' : 'Manage / Details'}
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}


              </div>
            );
          })()}

          {/* 5. PRICE CALENDAR */}
          {activeMenu === 'calendar' && (
            <div className="space-y-4">
              {/* Nút bấm cấu hình hàng loạt */}
              <div className="flex flex-wrap justify-between items-center gap-3 border-b border-[#E2E8F0] pb-4">
                <div className="flex gap-4 items-center min-w-[240px]">
                  <CustomSelect
                    label="Hạng phòng hiển thị"
                    value={selectedRoomTypeId}
                    onChange={(val) => setSelectedRoomTypeId(val)}
                    options={roomTypes.map(rt => ({ value: rt.id, label: rt.name }))}
                  />
                </div>

                <button
                  onClick={() => setShowBulkConfig(!showBulkConfig)}
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Sliders className="w-4 h-4" /> Cấu hình giá hàng loạt / Cuối tuần
                </button>
              </div>

              {/* Form Cấu hình giá hàng loạt */}
              {showBulkConfig && (
                <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-3xl p-5 space-y-4 animate-in slide-in-from-top-3 duration-250">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <h4 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">Cài đặt giá hàng loạt / Cuối tuần</h4>
                    <button onClick={() => setShowBulkConfig(false)} className="text-slate-450 hover:text-slate-700"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4 text-xs font-semibold">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Ngày bắt đầu</label>
                      <input
                        type="date"
                        value={bulkStartDate}
                        onChange={(e) => setBulkStartDate(e.target.value)}
                        className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 outline-none font-semibold focus:border-[#2563EB] transition-all"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Ngày kết thúc</label>
                      <input
                        type="date"
                        value={bulkEndDate}
                        onChange={(e) => setBulkEndDate(e.target.value)}
                        className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 outline-none font-semibold focus:border-[#2563EB] transition-all"
                      />
                    </div>
                    <div>
                      <CustomSelect
                        label="Tính toán dựa trên"
                        value={bulkBaseOn}
                        onChange={(val) => setBulkBaseOn(val)}
                        options={[
                          { value: 'BASE', label: 'Giá gốc hạng phòng' },
                          { value: 'CALENDAR', label: 'Giá hiện tại trên lịch' }
                        ]}
                      />
                    </div>
                    <div>
                      <CustomSelect
                        label="Hình thức điều chỉnh"
                        value={bulkAction}
                        onChange={(val) => setBulkAction(val)}
                        options={[
                          { value: 'PRICE', label: 'Giá cố định (mới)', icon: <DollarSign className="w-4 h-4 text-emerald-600" /> },
                          { value: 'SURCHARGE_WEEKEND', label: 'Tăng giá (Cuối tuần / Lễ)', icon: <TrendingUp className="w-4 h-4 text-amber-600" /> },
                          { value: 'DISCOUNT', label: 'Giảm giá phòng', icon: <TrendingDown className="w-4 h-4 text-red-600" /> },
                          { value: 'RESTORE', label: 'Khôi phục giá gốc', icon: <RotateCcw className="w-4 h-4 text-blue-600" /> }
                        ]}
                      />
                    </div>
                    <div className="space-y-1">
                      {bulkAction !== 'RESTORE' && (
                        <>
                          <label className="text-[10px] font-bold text-[#64748B] uppercase">
                            {bulkAction === 'PRICE' ? 'Mức giá (đ)' : 'Giá trị điều chỉnh'}
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="number"
                              value={bulkValue}
                              onChange={(e) => setBulkValue(e.target.value)}
                              placeholder={bulkAction === 'PRICE' ? '1500000' : '10'}
                              className="flex-1 bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 outline-none font-semibold focus:border-[#2563EB] transition-all"
                            />
                            {bulkAction !== 'PRICE' && (
                              <select
                                value={bulkAdjustmentType}
                                onChange={(e) => setBulkAdjustmentType(e.target.value)}
                                className="bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl px-2.5 outline-none font-semibold focus:border-[#2563EB] transition-all cursor-pointer"
                              >
                                <option value="PERCENTAGE">%</option>
                                <option value="FIXED_AMOUNT">VND</option>
                              </select>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase block">Áp dụng cho các thứ trong tuần</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setBulkDaysOfWeek([true, true, true, true, true, true, true])}
                          className="text-[9px] font-black text-[#2563EB] hover:underline"
                        >
                          Tất cả các ngày
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          onClick={() => setBulkDaysOfWeek([false, false, false, false, true, true, true])}
                          className="text-[9px] font-black text-[#2563EB] hover:underline"
                        >
                          Cuối tuần (T6, T7, CN)
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3 p-3 bg-white border border-[#E2E8F0] rounded-2xl">
                      {['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'].map((day, idx) => (
                        <label key={day} className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={bulkDaysOfWeek[idx]}
                            onChange={(e) => {
                              const newDays = [...bulkDaysOfWeek];
                              newDays[idx] = e.target.checked;
                              setBulkDaysOfWeek(newDays);
                            }}
                            className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]/20 w-4 h-4 cursor-pointer"
                          />
                          {day}
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end pt-2 border-t border-slate-200">
                    <button
                      onClick={handleSaveBulkPriceCalendar}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm"
                    >
                      Áp dụng cấu hình hàng loạt
                    </button>
                  </div>
                </div>
              )}

              {/* Toolbar điều hướng tháng & chú thích trạng thái */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white border border-[#E2E8F0] p-4 rounded-2xl shadow-xs mb-4">
                {/* Control điều hướng tháng */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setCalendarMonthDate(new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() - 1, 1))}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg font-black text-slate-700 transition-all shadow-2xs text-base"
                      title="Tháng trước"
                    >
                      ‹
                    </button>
                    <span className="font-extrabold text-sm text-slate-900 px-4 min-w-[140px] text-center">
                      Tháng {calendarMonthDate.getMonth() + 1} / {calendarMonthDate.getFullYear()}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCalendarMonthDate(new Date(calendarMonthDate.getFullYear(), calendarMonthDate.getMonth() + 1, 1))}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white rounded-lg font-black text-slate-700 transition-all shadow-2xs text-base"
                      title="Tháng sau"
                    >
                      ›
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCalendarMonthDate(new Date())}
                    className="px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-extrabold text-xs rounded-xl transition-all border border-blue-200 shadow-2xs"
                  >
                    Hôm nay
                  </button>
                </div>

                {/* Chú thích trạng thái màu sắc */}
                <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-700">
                  <span className="flex items-center gap-1.5 bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-full border border-emerald-200">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Trống (≥3)
                  </span>
                  <span className="flex items-center gap-1.5 bg-amber-50 text-amber-800 px-2.5 py-1 rounded-full border border-amber-200">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span> Sắp hết (≤2)
                  </span>
                  <span className="flex items-center gap-1.5 bg-rose-50 text-rose-800 px-2.5 py-1 rounded-full border border-rose-200">
                    <span className="w-2 h-2 rounded-full bg-rose-500"></span> Hết phòng (0)
                  </span>
                  <span className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full border border-slate-300">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span> Tạm khóa
                  </span>
                  <span className="flex items-center gap-1.5 bg-purple-50 text-purple-800 px-2.5 py-1 rounded-full border border-purple-200">
                    ⚡ Giá tùy chỉnh
                  </span>
                </div>
              </div>

              {/* Tiêu đề các thứ trong tuần (T2 -> CN) */}
              <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-black text-slate-500 uppercase tracking-wider bg-slate-50 py-2 rounded-xl border border-slate-100">
                <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
              </div>

              {calendarLoading ? (
                <div className="h-64 bg-slate-100 rounded-2xl animate-pulse"></div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                  {/* Ô ngày của tháng trước để lịch liền mạch */}
                  {(() => {
                    const year = calendarMonthDate.getFullYear();
                    const month = calendarMonthDate.getMonth();
                    const firstDayOfWeek = new Date(year, month, 1).getDay();
                    const paddingDaysCount = (firstDayOfWeek + 6) % 7;

                    // Ngày cuối cùng của tháng trước
                    const prevMonthLastDay = new Date(year, month, 0).getDate();

                    return Array.from({ length: paddingDaysCount }).map((_, idx) => {
                      const prevDayNum = prevMonthLastDay - paddingDaysCount + 1 + idx;
                      return (
                        <div
                          key={`pad-${idx}`}
                          className="p-3 border border-slate-200/60 rounded-2xl bg-slate-100/40 text-slate-400 opacity-40 cursor-not-allowed select-none pointer-events-none flex flex-col justify-between h-28 text-center"
                        >
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-sm text-slate-400">
                              {String(prevDayNum).padStart(2, '0')}
                            </span>
                            <span className="text-[8px] font-semibold uppercase text-slate-400">Tháng trước</span>
                          </div>
                          <p className="text-xs font-bold text-slate-300">—</p>
                          <span className="text-[8px] font-bold uppercase text-slate-400">Không dùng</span>
                        </div>
                      );
                    });
                  })()}

                  {calendarDays.map((day) => {
                    const isSoldOut = day.availableRooms === 0;
                    const isLowRooms = day.availableRooms > 0 && day.availableRooms <= 2;

                    if (day.isPast) {
                      return (
                        <div
                          key={day.date}
                          className="p-3 border border-slate-200 rounded-2xl bg-slate-100/80 text-slate-400 opacity-55 cursor-not-allowed select-none pointer-events-none flex flex-col justify-between h-28 text-center"
                        >
                          {/* Header Ngày */}
                          <div className="flex justify-between items-center">
                            <span className="font-extrabold text-xs text-slate-500 bg-slate-200/50 px-2 py-0.5 rounded-lg flex items-center gap-1">
                              <span>{String(day.dayNum).padStart(2, '0')}</span>
                              <span className="text-[10px] font-medium opacity-75">({day.dayOfWeekStr})</span>
                            </span>
                            <span className="text-[8px] font-bold text-slate-400">Đã qua</span>
                          </div>

                          {/* Mức Giá */}
                          <p className="text-xs sm:text-sm font-bold text-slate-400 line-through decoration-slate-300">
                            {formatNumberDots(day.price)} đ
                          </p>

                          {/* Trạng Thái */}
                          <div>
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-slate-200/90 text-slate-500">
                              Đã qua
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={day.date}
                        onClick={() => {
                          setEditDay(day);
                          setNewPrice(day.price.toString());
                          setNewBlocked(day.isBlocked);
                        }}
                        className={`p-3 border rounded-2xl cursor-pointer text-center space-y-1.5 transition-all shadow-2xs hover:scale-102 hover:shadow-md relative overflow-hidden flex flex-col justify-between h-28 ${day.isBlocked
                          ? 'bg-slate-100 border-slate-300 text-slate-600 hover:border-slate-400'
                          : isSoldOut
                            ? 'bg-rose-50/90 border-rose-200 text-rose-900 hover:border-rose-400'
                            : isLowRooms
                              ? 'bg-amber-50/90 border-amber-200 text-amber-900 hover:border-amber-400'
                              : 'bg-emerald-50/90 border-emerald-200 text-emerald-950 hover:border-emerald-400'
                          }`}
                      >
                        {/* Header Ngày & Badge Tùy Chỉnh */}
                        <div className="flex justify-between items-center">
                          <span className={`font-extrabold text-xs xs:text-base px-2 py-0.5 rounded-lg leading-tight flex items-center gap-1 ${day.isToday ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-800 bg-slate-200/60'
                            }`}>
                            <span>{String(day.dayNum).padStart(2, '0')}</span>
                            <span className="text-[10px] font-bold opacity-75">({day.dayOfWeekStr})</span>
                          </span>
                          {day.isCustomPrice && (
                            <span className="bg-purple-100 text-purple-800 text-[9px] font-black px-1.5 py-0.5 rounded uppercase" title="Giá đã được tùy chỉnh">
                              ⚡
                            </span>
                          )}
                        </div>

                        {/* Mức Giá */}
                        <p className="text-xs sm:text-sm font-black tracking-tight text-slate-900">
                          {formatNumberDots(day.price)} đ
                        </p>

                        {/* Trạng Thái & Số Phòng Còn */}
                        <div>
                          {day.isBlocked ? (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                              Đã khóa
                            </span>
                          ) : isSoldOut ? (
                            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-200 text-rose-800">
                              Hết phòng
                            </span>
                          ) : isLowRooms ? (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-900">
                              Còn {day.availableRooms} phòng
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                              Còn {day.availableRooms} phòng
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* 6. SUPPORT LIVE CHAT */}
          {activeMenu === 'support' && (
            <div className="h-[550px] border border-[#E2E8F0] rounded-2xl flex overflow-hidden bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)] text-[#1E293B]">

              {/* Left sidebar chats list */}
              <div className="w-80 border-r border-[#E2E8F0] h-full flex flex-col">
                <div className="p-4 border-b border-[#E2E8F0]">
                  <h4 className="font-extrabold text-xs uppercase text-[#64748B]">Danh sách hội thoại</h4>
                </div>
                <div className="flex-1 overflow-y-auto divide-y divide-[#E2E8F0]">
                  {conversations.map((conv) => (
                    <div
                      key={conv.id}
                      onClick={() => setActiveConv(conv)}
                      className={`p-3.5 cursor-pointer transition-colors ${activeConv?.id === conv.id ? 'bg-[#2563EB]/10 border-l-2 border-[#2563EB]' : 'hover:bg-[#F8FAFC]'
                        }`}
                    >
                      <p className="text-xs font-bold text-[#1E293B]">{conv.customer.fullName}</p>
                      <p className="text-[9px] text-[#64748B] mt-0.5">{conv.hotel.name}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chat window */}
              <div className="flex-1 h-full flex flex-col">
                {activeConv ? (
                  <>
                    <div className="p-4 border-b border-[#E2E8F0] flex justify-between items-center bg-[#F8FAFC]">
                      <p className="text-xs font-bold text-[#1E293B]">{activeConv.customer.fullName}</p>
                      <span className="text-[8px] font-black text-emerald-600 uppercase">ONLINE</span>
                    </div>

                    <div className="flex-grow p-4 overflow-y-auto space-y-3 bg-[#F8FAFC]">
                      {chatMessages.map((msg) => (
                        <div key={msg.id} className={`flex ${msg.senderId === user?.id ? 'justify-end' : 'justify-start'}`}>
                          <div className={`p-3.5 rounded-2xl max-w-sm text-xs font-semibold leading-relaxed shadow-sm ${msg.senderId === user?.id
                            ? 'bg-[#2563EB] text-white rounded-br-none'
                            : 'bg-white text-[#1E293B] rounded-bl-none border border-[#E2E8F0]'
                            }`}>
                            <p className="font-bold text-[9px] opacity-75 mb-0.5">{msg.sender.fullName}</p>
                            <p>{msg.content}</p>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 border-t border-[#E2E8F0] flex gap-2 bg-white">
                      <input
                        type="text"
                        placeholder="Nhập nội dung tư vấn..."
                        value={inputMsg}
                        onChange={(e) => setInputMsg(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                        className="flex-grow bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-4 py-2.5 text-xs outline-none font-semibold text-[#1E293B] placeholder-[#94A3B8] focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                      />
                      <button onClick={handleSendChatMessage} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white p-2.5 rounded-xl transition-all shadow-md"><Send className="w-4 h-4" /></button>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center space-y-2 text-center text-[#64748B] p-6">
                    <MessageSquare className="w-12 h-12 text-[#2563EB] animate-pulse" />
                    <p className="text-xs font-black uppercase">Chọn một hội thoại bên trái để bắt đầu chat tư vấn khách hàng</p>
                  </div>
                )}
              </div>

            </div>
          )}

          {/* 7. PROMOTIONS & COUPONS */}
          {activeMenu === 'promotions' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3.5">
                <h3 className="font-bold text-sm text-[#1E293B] uppercase">Quản lý mã giảm giá khách sạn</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportCouponsExcel}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                  >
                    <Download className="w-4 h-4" /> Xuất Excel
                  </button>
                  <button
                    onClick={() => setShowAddCoupon(true)}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                  >
                    <Plus className="w-4 h-4" /> Thêm mã giảm giá
                  </button>
                </div>
              </div>

              {couponsLoading ? (
                <div className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
              ) : (
                <div className="overflow-x-auto border border-[#E2E8F0] rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-semibold text-slate-650 text-left">
                    <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-[#475569]">
                      <tr>
                        <th className="px-4 py-3">Mã giảm giá</th>
                        <th className="px-4 py-3">Mô tả</th>
                        <th className="px-4 py-3">Loại giảm</th>
                        <th className="px-4 py-3">Mức giảm</th>
                        <th className="px-4 py-3">Giới hạn dùng</th>
                        <th className="px-4 py-3">Ngày hết hạn</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                      {coupons.length > 0 ? coupons.map((c, idx) => (
                        <tr key={c.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                          <td className="px-4 py-4 font-mono font-extrabold text-[#2563EB] text-[13px]">{c.code}</td>
                          <td className="px-4 py-4 text-[#64748B]">{c.description}</td>
                          <td className="px-4 py-4 text-[#64748B]">
                            {c.discountType === 'PERCENTAGE' ? 'Phần trăm (%)' : 'Cố định (đ)'}
                          </td>
                          <td className="px-4 py-4 font-black text-[#0F172A]">
                            {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : `${formatNumberDots(c.discountValue)} đ`}
                          </td>
                          <td className="px-4 py-4 text-[#64748B]">{c.usedCount || 0} / {c.usageLimit} lần</td>
                          <td className="px-4 py-4 text-[#64748B]">
                            {new Date(c.endDate).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${c.isActive ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-slate-100 text-slate-500'
                              }`}>
                              {c.isActive ? 'Hoạt động' : 'Tạm khóa'}
                            </span>
                          </td>
                          <td className="px-4 py-4 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleOwnerCouponStatus(c.id)}
                              className={`text-[9px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all shadow-sm ${c.isActive
                                ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                                }`}
                            >
                              {c.isActive ? 'Khóa mã' : 'Mở khóa'}
                            </button>
                            <button
                              onClick={() => setDeleteConfirmId(c.id)}
                              className="text-[#DC2626] bg-[#FEE2E2] hover:bg-[#FECACA] p-2 rounded-xl transition-all shadow-sm"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      )) : (
                        <tr>
                          <td colSpan={7} className="text-center py-6 text-[#64748B] font-bold bg-white">
                            Chưa có chương trình khuyến mãi nào được tạo
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* 8. CUSTOMERS (Derived dynamically) */}
          {activeMenu === 'customers' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
                <h3 className="font-bold text-sm text-[#1E293B] uppercase">Danh sách khách hàng đã đặt phòng</h3>
                <button
                  onClick={handleExportCustomersExcel}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 transition-all shadow-sm active:scale-95"
                >
                  <Download className="w-4 h-4" /> Xuất Excel danh sách
                </button>
              </div>

              <div className="overflow-x-auto border border-[#E2E8F0] rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-semibold text-slate-650 text-left">
                  <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-[#475569]">
                    <tr>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3">Số điện thoại</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Tổng số đơn đặt</th>
                      <th className="px-4 py-3">Tổng tiền tích lũy</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                    {getUniqueCustomers().length > 0 ? getUniqueCustomers().map((cust, idx) => (
                      <tr key={cust.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                        <td className="px-4 py-4 font-black">{cust.guestName}</td>
                        <td className="px-4 py-4 text-[#64748B]">{cust.guestPhone}</td>
                        <td className="px-4 py-4 text-[#64748B]">{cust.guestEmail}</td>
                        <td className="px-4 py-4 text-center font-bold text-[#2563EB]">{cust.totalBookings} đơn</td>
                        <td className="px-4 py-4 font-black text-[#0F172A]">{formatNumberDots(cust.totalSpent)} đ</td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={5} className="text-center py-6 text-[#64748B] font-bold bg-white">
                          Chưa có khách hàng nào đặt phòng tại khách sạn này
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 9. REVIEWS tab */}
          {activeMenu === 'reviews' && (
            <div className="space-y-4">
              <div className="border-b border-[#E2E8F0] pb-3">
                <h3 className="font-bold text-sm text-[#1E293B] uppercase">Tất cả nhận xét & đánh giá từ khách hàng</h3>
              </div>

              {allReviewsLoading ? (
                <div className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {allReviews.length > 0 ? allReviews.map((r) => (
                    <div key={r.id} className="p-4 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.02)] rounded-2xl space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs">
                            {r.user?.fullName?.charAt(0).toUpperCase() || 'G'}
                          </div>
                          <div>
                            <p className="font-extrabold text-[#1E293B] text-xs">{r.user?.fullName || 'Khách ẩn danh'}</p>
                            <p className="text-[10px] text-[#64748B]">{r.user?.email || ''}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleLikeOwnerReview(r.id)}
                            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer active:scale-95 ${likedReviewIds.includes(r.id)
                              ? 'bg-blue-50 text-blue-600 border-blue-200'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200'
                              }`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${likedReviewIds.includes(r.id) ? 'fill-blue-600 text-blue-600' : ''}`} />
                            <span>{r.likesCount || 0}</span>
                          </button>
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-200 text-xs font-black">
                            <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                            <span>{(r.ratingOverall <= 5 ? r.ratingOverall * 2 : r.ratingOverall).toFixed(1)} / 10</span>
                          </div>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-50 space-y-3">
                        <p className="text-xs text-[#475569] font-medium leading-relaxed bg-[#F8FAFC] p-3 rounded-xl border border-slate-100">
                          "{r.comment}"
                        </p>
                        <p className="text-[8px] text-[#94A3B8] font-bold">Gửi ngày: {formatDateTimeVN(r.createdAt)}</p>

                        {/* Phản hồi hiện tại từ Chủ khách sạn */}
                        {r.ownerReply && replyingReviewId !== r.id && (
                          <div className="bg-blue-50/80 border border-blue-150 p-3 rounded-xl space-y-1 text-xs">
                            <div className="flex justify-between items-center text-[10px] font-black text-blue-700">
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-blue-600" />
                                {language === 'vi' ? 'Phản hồi từ chủ chỗ nghỉ' : 'Response from owner'}
                              </span>
                              <span className="text-[9px] font-bold text-slate-400">
                                {r.ownerRepliedAt ? formatDateTimeVN(r.ownerRepliedAt) : ''}
                              </span>
                            </div>
                            <p className="text-slate-700 font-medium leading-relaxed">
                              "{r.ownerReply}"
                            </p>
                            <button
                              type="button"
                              onClick={() => {
                                setReplyingReviewId(r.id);
                                setReplyInputText(r.ownerReply || '');
                              }}
                              className="text-[10px] font-extrabold text-blue-600 hover:underline pt-1 block"
                            >
                              {language === 'vi' ? 'Sửa phản hồi' : 'Edit response'}
                            </button>
                          </div>
                        )}

                        {/* Khung nhập phản hồi */}
                        {replyingReviewId === r.id ? (
                          <div className="space-y-2 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                            <textarea
                              rows={3}
                              value={replyInputText}
                              onChange={(e) => setReplyInputText(e.target.value)}
                              placeholder={language === 'vi' ? 'Nhập phản hồi của chủ chỗ nghỉ tới đánh giá này...' : 'Write your response to this review...'}
                              className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs font-semibold text-slate-800 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                            />
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setReplyingReviewId(null);
                                  setReplyInputText('');
                                }}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100"
                              >
                                {language === 'vi' ? 'Hủy' : 'Cancel'}
                              </button>
                              <button
                                type="button"
                                disabled={sendingReply || !replyInputText.trim()}
                                onClick={() => handleSendOwnerReply(r.id)}
                                className="px-4 py-1.5 rounded-xl text-xs font-extrabold bg-[#2563EB] hover:bg-[#1D4ED8] disabled:opacity-50 text-white shadow-sm transition-all flex items-center gap-1.5"
                              >
                                <Send className="w-3.5 h-3.5" />
                                {sendingReply ? 'Đang gửi...' : (language === 'vi' ? 'Gửi phản hồi' : 'Submit Reply')}
                              </button>
                            </div>
                          </div>
                        ) : !r.ownerReply && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingReviewId(r.id);
                              setReplyInputText('');
                            }}
                            className="text-xs font-extrabold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shadow-2xs"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                            {language === 'vi' ? 'Phản hồi lại đánh giá này' : 'Reply to review'}
                          </button>
                        )}
                      </div>
                    </div>
                  )) : (
                    <div className="col-span-2 text-center py-12 text-[#64748B] font-bold bg-white border border-dashed border-[#CBD5E1] rounded-2xl">
                      Khách sạn của bạn chưa nhận được đánh giá nào từ khách hàng
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 10. DETAILED REPORTS TAB (BÁO CÁO CHI TIẾT & HIỆU SUẤT KINH DOANH) */}
          {activeMenu === 'reports' && (() => {
            // Apply Date Range Filter
            const filteredBookings = filterBookingsByDateRange(bookings);
            const confirmedBookings = filteredBookings.filter(b => b.status !== 'CANCELLED');
            
            // Dynamic Financial KPIs calculation based on filteredBookings
            const validFilteredBookings = filteredBookings.filter(b => ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(b.status));
            const activeCommRate = stats.financials?.commissionRate || 10;

            const dynGross = validFilteredBookings.reduce((sum, b) => sum + (Number(b.finalPrice) || 0), 0);
            const dynComm = validFilteredBookings.reduce((sum, b) => {
              const comm = (b.commissionAmount && Number(b.commissionAmount) > 0)
                ? Number(b.commissionAmount)
                : Number(((Number(b.finalPrice) || 0) * (activeCommRate / 100)).toFixed(2));
              return sum + comm;
            }, 0);
            const dynRefund = filteredBookings.reduce((sum, b) => {
              const ref = (b.refundAmount && Number(b.refundAmount) > 0)
                ? Number(b.refundAmount)
                : (b.status === 'REFUNDED' ? Number(b.finalPrice) : 0);
              return sum + ref;
            }, 0);
            const dynNet = validFilteredBookings.reduce((sum, b) => {
              const comm = (b.commissionAmount && Number(b.commissionAmount) > 0)
                ? Number(b.commissionAmount)
                : Number(((Number(b.finalPrice) || 0) * (activeCommRate / 100)).toFixed(2));
              const ref = (b.refundAmount && Number(b.refundAmount) > 0) ? Number(b.refundAmount) : 0;
              const net = (b.ownerNetAmount && Number(b.ownerNetAmount) > 0)
                ? Number(b.ownerNetAmount)
                : Math.max(0, Number(b.finalPrice) - comm - ref);
              return sum + net;
            }, 0);
            const dynPending = validFilteredBookings.reduce((sum, b) => {
              let pStatus = b.payoutStatus;
              if (!pStatus || pStatus === 'PENDING') {
                if (b.status === 'COMPLETED') pStatus = 'PAID';
                else if (b.status === 'CHECKED_OUT') pStatus = 'ELIGIBLE';
                else if (b.status === 'CONFIRMED' || b.status === 'CHECKED_IN') pStatus = 'PENDING';
                else pStatus = 'FAILED';
              }
              if (['PENDING', 'ELIGIBLE', 'PROCESSING'].includes(pStatus)) {
                const comm = (b.commissionAmount && Number(b.commissionAmount) > 0)
                  ? Number(b.commissionAmount)
                  : Number(((Number(b.finalPrice) || 0) * (activeCommRate / 100)).toFixed(2));
                const ref = (b.refundAmount && Number(b.refundAmount) > 0) ? Number(b.refundAmount) : 0;
                const net = (b.ownerNetAmount && Number(b.ownerNetAmount) > 0)
                  ? Number(b.ownerNetAmount)
                  : Math.max(0, Number(b.finalPrice) - comm - ref);
                return sum + net;
              }
              return sum;
            }, 0);

            const totalBookingsCount = confirmedBookings.length;
            const avgRevenuePerBooking = totalBookingsCount > 0 ? (dynNet / totalBookingsCount) : 0;
            const totalRooms = roomTypes.reduce((acc, rt: any) => acc + (rt.rooms?.length || 5), 0);
            const avgOccupancy = totalRooms > 0 ? Math.min(96, Math.round((totalBookingsCount / (totalRooms * 30)) * 100 * 10) / 10) : 78.5;

            // Trend Chart Data (Group by date)
            const trendMap = new Map();
            confirmedBookings.forEach(b => {
              const dStr = formatDateVN(b.createdAt || b.checkInDate);
              if (!trendMap.has(dStr)) {
                trendMap.set(dStr, { date: dStr, doanhThu: 0, soDon: 0 });
              }
              const item = trendMap.get(dStr);
              item.doanhThu += Number(b.finalPrice) || Number(b.totalPrice) || 0;
              item.soDon += 1;
            });
            const trendData = Array.from(trendMap.values()).slice(-15);

            // Room Type Chart Data
            const roomChartData = roomTypes.map(rt => {
              const rtBookings = confirmedBookings.filter(b => b.bookingItems?.some((i: any) => i.roomTypeId === rt.id));
              const rtRevenue = rtBookings.reduce((sum, b) => sum + (Number(b.finalPrice) || 0), 0);
              return {
                name: rt.name,
                doanhThu: rtRevenue,
                soDon: rtBookings.length
              };
            });

            // Preset Handlers
            const handleQuickPreset = (type: string) => {
              const now = new Date();
              if (type === 'TODAY') {
                const todayIso = now.toISOString().split('T')[0];
                setReportStartDate(todayIso);
                setReportEndDate(todayIso);
              } else if (type === 'THIS_MONTH') {
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const todayIso = now.toISOString().split('T')[0];
                setReportStartDate(firstDay);
                setReportEndDate(todayIso);
              } else if (type === 'LAST_MONTH') {
                const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
                const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
                setReportStartDate(firstDay);
                setReportEndDate(lastDay);
              } else if (type === 'THIS_YEAR') {
                const firstDay = `${now.getFullYear()}-01-01`;
                const todayIso = now.toISOString().split('T')[0];
                setReportStartDate(firstDay);
                setReportEndDate(todayIso);
              } else if (type === 'ALL') {
                setReportStartDate('');
                setReportEndDate('');
              }
            };

            return (
              <div className="space-y-6">
                {/* Top Header & Range Filters */}
                <div className="bg-white border border-[#E2E8F0] p-5 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] space-y-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-black text-[#0F172A] text-base uppercase tracking-tight flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-[#2563EB]" />
                        {language === 'vi' ? 'Báo cáo chi tiết kinh doanh & hiệu suất lưu trú' : 'Detailed Business Analytics & Reports'}
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        {language === 'vi' ? 'Chọn khoảng thời gian để phân tích biểu đồ, thống kê và xuất file Excel' : 'Select date range to analyze charts, metrics and export Excel'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {hotelsList.length > 0 && (
                        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-2xl px-3.5 py-2 text-xs">
                          <Hotel className="w-4 h-4 text-[#2563EB]" />
                          <span className="font-extrabold text-blue-900">Khách sạn:</span>
                          <select
                            value={hotelId}
                            onChange={(e) => handleSelectHotel(e.target.value)}
                            className="bg-transparent font-black text-blue-700 outline-none cursor-pointer"
                          >
                            <option value="ALL">Tất cả khách sạn</option>
                            {hotelsList.map(h => (
                              <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button
                        onClick={handleExportDetailedReportsExcel}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        {language === 'vi' ? 'Xuất Excel Báo Cáo' : 'Export Report (Excel)'}
                      </button>
                    </div>
                  </div>

                  {/* Bộ chọn Ngày & Nút chọn nhanh */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-700">Lọc ngày:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-blue-500"
                        />
                        <span className="text-slate-400">&rarr;</span>
                        <input
                          type="date"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-400 font-bold text-[11px]">Chọn nhanh:</span>
                      <button onClick={() => handleQuickPreset('TODAY')} className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-extrabold transition-all">Hôm nay</button>
                      <button onClick={() => handleQuickPreset('THIS_MONTH')} className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-extrabold transition-all">Tháng này</button>
                      <button onClick={() => handleQuickPreset('LAST_MONTH')} className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-extrabold transition-all">Tháng trước</button>
                      <button onClick={() => handleQuickPreset('THIS_YEAR')} className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 font-extrabold transition-all">Năm nay</button>
                      <button onClick={() => handleQuickPreset('ALL')} className="px-3 py-1 rounded-xl bg-blue-600 text-white font-extrabold transition-all shadow-2xs">Tất cả</button>
                    </div>
                  </div>
                </div>

                {/* 5 FINANCIAL OVERVIEW KPI CARDS (DYNAMICALLY FILTERED) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Card 1: Gross Revenue */}
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-2 shadow-xs hover:border-blue-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                      <span>💰 Doanh Thu Gross</span>
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                      {formatNumberDots(dynGross)} <span className="text-xs">đ</span>
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 border-t border-slate-100 pt-1.5">
                      Tổng booking trước refund & hoa hồng
                    </p>
                  </div>

                  {/* Card 2: Net Payout */}
                  <div className="bg-emerald-50/50 border border-emerald-200 p-5 rounded-3xl space-y-2 shadow-xs hover:border-emerald-400 transition-all">
                    <div className="flex items-center justify-between text-emerald-800 text-xs font-extrabold uppercase">
                      <span>💵 Doanh Thu Thực Nhận</span>
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black text-emerald-600">
                      {formatNumberDots(dynNet)} <span className="text-xs">đ</span>
                    </p>
                    <p className="text-[10px] font-bold text-emerald-700 border-t border-emerald-100 pt-1.5">
                      Số tiền Owner hưởng sau trừ commission & refund
                    </p>
                  </div>

                  {/* Card 3: Platform Commission */}
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-2 shadow-xs hover:border-indigo-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                      <span>🏦 Hoa Hồng Sàn ({activeCommRate}%)</span>
                      <Building2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-2xl font-black text-indigo-600">
                      {formatNumberDots(dynComm)} <span className="text-xs">đ</span>
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 border-t border-slate-100 pt-1.5">
                      Tổng hoa hồng CloudBooking khấu trừ
                    </p>
                  </div>

                  {/* Card 4: Total Refunded */}
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-2 shadow-xs hover:border-rose-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                      <span>↩️ Tổng Tiền Hoàn</span>
                      <RotateCcw className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-2xl font-black text-rose-600">
                      {formatNumberDots(dynRefund)} <span className="text-xs">đ</span>
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 border-t border-slate-100 pt-1.5">
                      Tổng tiền đã refund hoàn trả cho khách
                    </p>
                  </div>

                  {/* Card 5: Pending Payout */}
                  <div className="bg-amber-50/50 border border-amber-200 p-5 rounded-3xl space-y-2 shadow-xs hover:border-amber-400 transition-all">
                    <div className="flex items-center justify-between text-amber-800 text-xs font-extrabold uppercase">
                      <span>⏳ Chờ Thanh Toán</span>
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-2xl font-black text-amber-600">
                      {formatNumberDots(dynPending)} <span className="text-xs">đ</span>
                    </p>
                    <p className="text-[10px] font-bold text-amber-700 border-t border-amber-100 pt-1.5">
                      Đủ điều kiện nhận nhưng chưa payout
                    </p>
                  </div>
                </div>

                {/* 4 Key Performance Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white border border-[#E2E8F0] p-5 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] space-y-2">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-black uppercase text-slate-500">Doanh thu thực nhận (Net)</span>
                      <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-emerald-600">{formatNumberDots(dynNet)} đ</p>
                    <p className="text-[10px] font-bold text-slate-400">Đơn đã xác nhận / hoàn thành</p>
                  </div>

                  <div className="bg-white border border-[#E2E8F0] p-5 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] space-y-2">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-black uppercase text-slate-500">Tổng số đơn thành công</span>
                      <div className="p-2 bg-blue-50 text-[#2563EB] rounded-xl">
                        <CheckCircle className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-[#0F172A]">{totalBookingsCount} đơn</p>
                    <p className="text-[10px] font-bold text-slate-400">Không tính đơn đã bị hủy</p>
                  </div>

                  <div className="bg-white border border-[#E2E8F0] p-5 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] space-y-2">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-black uppercase text-slate-500">Tỷ lệ lấp đầy TB</span>
                      <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
                        <Hotel className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-purple-600">{avgOccupancy}%</p>
                    <p className="text-[10px] font-bold text-slate-400">Tính trên công suất phòng khả dụng</p>
                  </div>

                  <div className="bg-white border border-[#E2E8F0] p-5 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] space-y-2">
                    <div className="flex justify-between items-center text-slate-400">
                      <span className="text-[11px] font-black uppercase text-slate-500">Doanh thu TB / Đơn (ADR)</span>
                      <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                        <DollarSign className="w-4 h-4" />
                      </div>
                    </div>
                    <p className="text-2xl font-black text-[#0F172A]">{formatNumberDots(Math.round(avgRevenuePerBooking))} đ</p>
                    <p className="text-[10px] font-bold text-slate-400">Giá trị đơn lưu trú trung bình</p>
                  </div>
                </div>

                {/* BIỂU ĐỒ DOANH THU & ĐẶT PHÒNG INTERACTIVE RECHARTS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Biểu đồ 1: Xu hướng Doanh thu & Đơn hàng */}
                  <div className="lg:col-span-2 bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="font-extrabold text-sm text-[#0F172A] uppercase flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-600" />
                        Biểu đồ xu hướng doanh thu & lượt đặt
                      </h4>
                      <span className="text-xs font-bold text-slate-400">{trendData.length} mốc thời gian</span>
                    </div>

                    {trendData.length > 0 ? (
                      <div className="h-72 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <ComposedChart data={trendData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                            <XAxis dataKey="date" tick={{ fontSize: 11, fontWeight: 700 }} stroke="#64748B" />
                            <YAxis yAxisId="left" orientation="left" stroke="#10B981" tick={{ fontSize: 11, fontWeight: 700 }} tickFormatter={(val) => `${val / 1000000}M`} />
                            <YAxis yAxisId="right" orientation="right" stroke="#2563EB" tick={{ fontSize: 11, fontWeight: 700 }} />
                            <Tooltip
                              formatter={(value: any, name: string) => [
                                name === 'Doanh thu' ? `${formatNumberDots(value)} đ` : `${value} đơn`,
                                name
                              ]}
                              contentStyle={{ borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 700 }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 700 }} />
                            <Bar yAxisId="left" dataKey="doanhThu" name="Doanh thu" fill="#10B981" radius={[6, 6, 0, 0]} barSize={28} />
                            <Line yAxisId="right" type="monotone" dataKey="soDon" name="Số đơn hàng" stroke="#2563EB" strokeWidth={3} dot={{ r: 4 }} />
                          </ComposedChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                        Chưa có dữ liệu giao dịch trong thời gian này
                      </div>
                    )}
                  </div>

                  {/* Biểu đồ 2: Cơ cấu doanh thu theo Hạng phòng */}
                  <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] space-y-4">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                      <h4 className="font-extrabold text-sm text-[#0F172A] uppercase flex items-center gap-2">
                        <Hotel className="w-4 h-4 text-blue-600" />
                        Cơ cấu theo loại phòng
                      </h4>
                    </div>

                    {roomChartData.length > 0 ? (
                      <div className="h-72 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={roomChartData} layout="vertical">
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#F1F5F9" />
                            <XAxis type="number" tick={{ fontSize: 10, fontWeight: 700 }} stroke="#64748B" tickFormatter={(val) => `${val / 1000000}M`} />
                            <YAxis dataKey="name" type="category" width={110} tick={{ fontSize: 10, fontWeight: 700 }} stroke="#334155" />
                            <Tooltip
                              formatter={(value: any) => [`${formatNumberDots(value)} đ`, 'Doanh thu']}
                              contentStyle={{ borderRadius: '16px', border: '1px solid #E2E8F0', fontSize: '11px', fontWeight: 700 }}
                            />
                            <Bar dataKey="doanhThu" fill="#2563EB" radius={[0, 6, 6, 0]} barSize={20} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <div className="h-64 flex items-center justify-center text-slate-400 font-bold text-xs bg-slate-50 rounded-2xl">
                        Chưa có loại phòng nào
                      </div>
                    )}
                  </div>
                </div>

                {/* Phân tích Doanh thu theo Loại phòng (Bảng Chi tiết) */}
                <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                    <h4 className="font-extrabold text-sm text-[#0F172A] uppercase">Hiệu suất kinh doanh theo loại phòng</h4>
                    <span className="text-xs text-slate-500 font-bold">{roomTypes.length} loại phòng</span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-semibold text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                          <th className="py-3 px-4">Tên loại phòng</th>
                          <th className="py-3 px-4">Giá niêm yết</th>
                          <th className="py-3 px-4">Số đơn thành công</th>
                          <th className="py-3 px-4">Tỷ lệ lấp đầy</th>
                          <th className="py-3 px-4 text-right">Tổng doanh thu</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {roomTypes.map((rt) => {
                          const rtBookings = confirmedBookings.filter(b => b.bookingItems?.some((i: any) => i.roomTypeId === rt.id));
                          const rtRevenue = rtBookings.reduce((sum, b) => sum + (Number(b.finalPrice) || 0), 0);
                          const occRate = Math.min(98, Math.round((rtBookings.length / (roomTypes.length * 10)) * 100) || 65);

                          return (
                            <tr key={rt.id} className="hover:bg-slate-50 transition-colors">
                              <td className="py-3 px-4 font-black text-slate-800">{rt.name}</td>
                              <td className="py-3 px-4 text-slate-600 font-bold">{formatNumberDots(rt.basePrice)} đ</td>
                              <td className="py-3 px-4 font-extrabold text-blue-600">{rtBookings.length} đơn</td>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                                    <div className="bg-[#2563EB] h-full rounded-full" style={{ width: `${occRate}%` }}></div>
                                  </div>
                                  <span className="font-extrabold text-[11px] text-slate-700">{occRate}%</span>
                                </div>
                              </td>
                              <td className="py-3 px-4 text-right font-black text-emerald-600">{formatNumberDots(rtRevenue)} đ</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Nhật ký tất cả giao dịch đặt phòng */}
                <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-100 pb-3">
                    <h4 className="font-extrabold text-sm text-[#0F172A] uppercase">Nhật ký giao dịch chi tiết ({filteredBookings.length} đơn)</h4>
                    <button
                      onClick={handleExportDetailedReportsExcel}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" /> Xuất File Báo Cáo
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-100 rounded-2xl">
                    <table className="w-full text-xs font-semibold text-left">
                      <thead className="bg-[#F8FAFC] text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">Mã đơn</th>
                          <th className="p-3.5">Ngày đặt</th>
                          <th className="p-3.5">Khách hàng</th>
                          <th className="p-3.5">Ngày Check-in / Out</th>
                          <th className="p-3.5">Tổng tiền gốc</th>
                          <th className="p-3.5">Giảm giá</th>
                          <th className="p-3.5">Thực nhận</th>
                          <th className="p-3.5">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredBookings.map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3.5 font-mono font-extrabold text-[#2563EB]">#{b.id.substring(0, 8).toUpperCase()}</td>
                            <td className="p-3.5 text-slate-500">{formatDateVN(b.createdAt)}</td>
                            <td className="p-3.5">
                              <p className="font-bold text-slate-800">{b.guestName}</p>
                              <p className="text-[10px] text-slate-400">{b.guestPhone}</p>
                            </td>
                            <td className="p-3.5 text-slate-600 font-bold">
                              {formatDateVN(b.checkInDate)} &rarr; {formatDateVN(b.checkOutDate)}
                            </td>
                            <td className="p-3.5 text-slate-500">{formatNumberDots(b.totalPrice)} đ</td>
                            <td className="p-3.5 text-rose-500 font-bold">{b.discountAmount ? `-${formatNumberDots(b.discountAmount)} đ` : '0 đ'}</td>
                            <td className="p-3.5 font-black text-emerald-600">{formatNumberDots(b.finalPrice)} đ</td>
                            <td className="p-3.5">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${b.status === 'CONFIRMED' || b.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : b.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                                {b.status === 'CONFIRMED' ? 'Đã xác nhận' : b.status === 'COMPLETED' ? 'Hoàn thành' : b.status === 'CANCELLED' ? 'Đã hủy' : 'Đang xử lý'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* 11. FINANCE TAB (BÁO CÁO TÀI CHÍNH & THU NHẬP OWNER) */}
          {activeMenu === 'finance' && (() => {
            // Date & Hotel Filtered Transactions
            const dateFilteredTx = financialTransactions.filter(tx => {
              if (hotelId && hotelId !== 'ALL' && tx.hotelId && tx.hotelId !== hotelId) {
                return false;
              }
              if (reportStartDate) {
                const txDate = new Date(tx.createdAt || tx.checkInDate).setHours(0, 0, 0, 0);
                const sDate = new Date(reportStartDate).setHours(0, 0, 0, 0);
                if (txDate < sDate) return false;
              }
              if (reportEndDate) {
                const txDate = new Date(tx.createdAt || tx.checkInDate).setHours(23, 59, 59, 999);
                const eDate = new Date(reportEndDate).setHours(23, 59, 59, 999);
                if (txDate > eDate) return false;
              }
              return true;
            });

            // Dynamic KPI Calculations for Finance Tab (Exclude CANCELLED bookings for Gross, Net, Comm, Pending)
            const validTxList = dateFilteredTx.filter(tx => ['CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'COMPLETED'].includes(tx.bookingStatus));
            const activeCommRate = stats.financials?.commissionRate || 10;
            const dynGross = validTxList.reduce((sum, tx) => sum + (tx.grossRevenue || 0), 0);
            const dynComm = validTxList.reduce((sum, tx) => sum + (tx.commissionAmount || 0), 0);
            const dynRefund = dateFilteredTx.reduce((sum, tx) => sum + (tx.refundAmount || 0), 0);
            const dynNet = validTxList.reduce((sum, tx) => sum + (tx.ownerNetAmount || 0), 0);
            const dynPending = validTxList.reduce((sum, tx) => {
              if (['PENDING', 'ELIGIBLE', 'PROCESSING'].includes(tx.payoutStatus)) {
                return sum + (tx.ownerNetAmount || 0);
              }
              return sum;
            }, 0);

            // Filtered Transactions for Table (including Payout status and search query)
            const filteredTx = dateFilteredTx.filter(tx => {
              if (financePayoutFilter !== 'ALL' && tx.payoutStatus !== financePayoutFilter) {
                return false;
              }
              if (financeSearch) {
                const q = financeSearch.toLowerCase();
                return (
                  tx.id?.toLowerCase().includes(q) ||
                  tx.guestName?.toLowerCase().includes(q) ||
                  tx.hotelName?.toLowerCase().includes(q) ||
                  tx.guestPhone?.toLowerCase().includes(q)
                );
              }
              return true;
            });

            const pageSize = 10;
            const totalPages = Math.ceil(filteredTx.length / pageSize) || 1;
            const pageTx = filteredTx.slice((financePage - 1) * pageSize, financePage * pageSize);

            const handleQuickPreset = (type: string) => {
              const now = new Date();
              if (type === 'TODAY') {
                const todayIso = now.toISOString().split('T')[0];
                setReportStartDate(todayIso);
                setReportEndDate(todayIso);
              } else if (type === 'THIS_MONTH') {
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
                const todayIso = now.toISOString().split('T')[0];
                setReportStartDate(firstDay);
                setReportEndDate(todayIso);
              } else if (type === 'LAST_MONTH') {
                const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split('T')[0];
                const lastDay = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().split('T')[0];
                setReportStartDate(firstDay);
                setReportEndDate(lastDay);
              } else if (type === 'THIS_YEAR') {
                const firstDay = `${now.getFullYear()}-01-01`;
                const todayIso = now.toISOString().split('T')[0];
                setReportStartDate(firstDay);
                setReportEndDate(todayIso);
              } else if (type === 'ALL') {
                setReportStartDate('');
                setReportEndDate('');
              }
            };

            return (
              <div className="space-y-6">
                {/* Header & Date Range Filter Bar */}
                <div className="bg-white border border-[#E2E8F0] p-5 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] space-y-4">
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h3 className="font-black text-[#0F172A] text-base uppercase tracking-tight flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-emerald-600" />
                        Báo Cáo Dòng Tiền, Hoa Hồng & Đối Soát Payout Owner
                      </h3>
                      <p className="text-xs text-slate-500 font-semibold mt-1">
                        Chi tiết doanh thu Gross, chiết khấu hoa hồng sàn, các khoản tiền hoàn và số tiền chờ đối soát Payout.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      {hotelsList.length > 0 && (
                        <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-2xl px-3.5 py-2 text-xs">
                          <Hotel className="w-4 h-4 text-emerald-600" />
                          <span className="font-extrabold text-emerald-900">Khách sạn:</span>
                          <select
                            value={hotelId}
                            onChange={(e) => handleSelectHotel(e.target.value)}
                            className="bg-transparent font-black text-emerald-700 outline-none cursor-pointer"
                          >
                            <option value="ALL">Tất cả khách sạn</option>
                            {hotelsList.map(h => (
                              <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                      <button
                        onClick={handleExportFinanceExcel}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-sm active:scale-95 shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        Xuất Báo Cáo Tài Chính (Excel)
                      </button>
                    </div>
                  </div>

                  {/* Bộ chọn Ngày & Nút chọn nhanh cho Tab Tài Chính */}
                  <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-slate-700">Lọc ngày:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="date"
                          value={reportStartDate}
                          onChange={(e) => setReportStartDate(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-emerald-500"
                        />
                        <span className="text-slate-400">&rarr;</span>
                        <input
                          type="date"
                          value={reportEndDate}
                          onChange={(e) => setReportEndDate(e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-slate-400 font-bold text-[11px]">Chọn nhanh:</span>
                      <button onClick={() => handleQuickPreset('TODAY')} className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 font-extrabold transition-all">Hôm nay</button>
                      <button onClick={() => handleQuickPreset('THIS_MONTH')} className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 font-extrabold transition-all">Tháng này</button>
                      <button onClick={() => handleQuickPreset('LAST_MONTH')} className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 font-extrabold transition-all">Tháng trước</button>
                      <button onClick={() => handleQuickPreset('THIS_YEAR')} className="px-3 py-1 rounded-xl bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 font-extrabold transition-all">Năm nay</button>
                      <button onClick={() => handleQuickPreset('ALL')} className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-extrabold transition-all shadow-2xs">Tất cả</button>
                    </div>
                  </div>
                </div>

                {/* 5 FINANCIAL OVERVIEW KPI CARDS (DYNAMICALLY FILTERED) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Card 1: Gross Revenue */}
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-2 shadow-xs hover:border-blue-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                      <span>💰 Doanh Thu Gross</span>
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-2xl font-black text-slate-900">
                      {formatNumberDots(dynGross)} <span className="text-xs">đ</span>
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 border-t border-slate-100 pt-1.5">
                      Tổng booking trước refund & hoa hồng
                    </p>
                  </div>

                  {/* Card 2: Net Payout */}
                  <div className="bg-emerald-50/50 border border-emerald-200 p-5 rounded-3xl space-y-2 shadow-xs hover:border-emerald-400 transition-all">
                    <div className="flex items-center justify-between text-emerald-800 text-xs font-extrabold uppercase">
                      <span>💵 Doanh Thu Thực Nhận</span>
                      <DollarSign className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-2xl font-black text-emerald-600">
                      {formatNumberDots(dynNet)} <span className="text-xs">đ</span>
                    </p>
                    <p className="text-[10px] font-bold text-emerald-700 border-t border-emerald-100 pt-1.5">
                      Số tiền Owner hưởng sau trừ commission & refund
                    </p>
                  </div>

                  {/* Card 3: Platform Commission */}
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-2 shadow-xs hover:border-indigo-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                      <span>🏦 Hoa Hồng Sàn ({activeCommRate}%)</span>
                      <Building2 className="w-4 h-4 text-indigo-600" />
                    </div>
                    <p className="text-2xl font-black text-indigo-600">
                      {formatNumberDots(dynComm)} <span className="text-xs">đ</span>
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 border-t border-slate-100 pt-1.5">
                      Tổng hoa hồng CloudBooking khấu trừ
                    </p>
                  </div>

                  {/* Card 4: Total Refunded */}
                  <div className="bg-white border border-slate-200 p-5 rounded-3xl space-y-2 shadow-xs hover:border-rose-300 transition-all">
                    <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
                      <span>↩️ Tổng Tiền Hoàn</span>
                      <RotateCcw className="w-4 h-4 text-rose-500" />
                    </div>
                    <p className="text-2xl font-black text-rose-600">
                      {formatNumberDots(dynRefund)} <span className="text-xs">đ</span>
                    </p>
                    <p className="text-[10px] font-semibold text-slate-400 border-t border-slate-100 pt-1.5">
                      Tổng tiền đã refund hoàn trả cho khách
                    </p>
                  </div>

                  {/* Card 5: Pending Payout */}
                  <div className="bg-amber-50/50 border border-amber-200 p-5 rounded-3xl space-y-2 shadow-xs hover:border-amber-400 transition-all">
                    <div className="flex items-center justify-between text-amber-800 text-xs font-extrabold uppercase">
                      <span>⏳ Chờ Thanh Toán</span>
                      <Clock className="w-4 h-4 text-amber-600" />
                    </div>
                    <p className="text-2xl font-black text-amber-600">
                      {formatNumberDots(dynPending)} <span className="text-xs">đ</span>
                    </p>
                    <p className="text-[10px] font-bold text-amber-700 border-t border-amber-100 pt-1.5">
                      Đủ điều kiện nhận nhưng chưa payout
                    </p>
                  </div>
                </div>

                {/* BẢNG KÊ KHAI TÀI CHÍNH & ĐỐI SOÁT PAYOUT CHI TIẾT */}
                <div className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-[0_4px_12px_rgba(15,23,42,0.03)] space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                    <div>
                      <h4 className="font-extrabold text-base text-[#0F172A] uppercase flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        Bảng Giao Dịch Tài Chính & Trạng Thái Payout ({filteredTx.length})
                      </h4>
                      <p className="text-xs text-slate-400 font-semibold mt-0.5">Chi tiết từng booking, giá trị Gross, phí hoa hồng, tiền hoàn và trạng thái thanh toán đối soát.</p>
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Search box */}
                      <div className="relative w-64">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Tìm mã đơn, tên khách..."
                          value={financeSearch}
                          onChange={(e) => {
                            setFinanceSearch(e.target.value);
                            setFinancePage(1);
                          }}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-xl pl-9 pr-3 py-2 outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Status Filter */}
                      <select
                        value={financePayoutFilter}
                        onChange={(e) => {
                          setFinancePayoutFilter(e.target.value);
                          setFinancePage(1);
                        }}
                        className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-extrabold rounded-xl px-3 py-2 outline-none cursor-pointer"
                      >
                        <option value="ALL">Tất cả Payout</option>
                        <option value="PENDING">PENDING (Đang chờ)</option>
                        <option value="ELIGIBLE">ELIGIBLE (Đủ điều kiện)</option>
                        <option value="PROCESSING">PROCESSING (Đang xử lý)</option>
                        <option value="PAID">PAID (Đã thanh toán)</option>
                        <option value="FAILED">FAILED (Lỗi payout)</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                    <table className="w-full text-xs font-semibold text-left">
                      <thead className="bg-[#F8FAFC] text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
                        <tr>
                          <th className="p-3.5">STT</th>
                          <th className="p-3.5">Mã đơn & Khách sạn</th>
                          <th className="p-3.5">Khách hàng</th>
                          <th className="p-3.5 text-right">Doanh Thu Gross</th>
                          <th className="p-3.5 text-right">Hoa Hồng ({stats.financials?.commissionRate || 10}%)</th>
                          <th className="p-3.5 text-right">Tiền Hoàn (Refund)</th>
                          <th className="p-3.5 text-right">Owner Net</th>
                          <th className="p-3.5 text-right">Tiền Payout</th>
                          <th className="p-3.5 text-center">Trạng Thái Payout</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {pageTx.length === 0 ? (
                          <tr>
                            <td colSpan={9} className="text-center py-8 text-slate-400 font-bold">
                              Không có giao dịch tài chính nào phù hợp với bộ lọc.
                            </td>
                          </tr>
                        ) : (
                          pageTx.map((tx, idx) => (
                            <tr key={tx.id} className="hover:bg-blue-50/30 transition-colors">
                              <td className="p-3.5 font-bold text-slate-400">
                                {(financePage - 1) * pageSize + idx + 1}
                              </td>

                              <td className="p-3.5">
                                <p className="font-mono font-black text-blue-600 text-xs">#{tx.id.substring(0, 8).toUpperCase()}</p>
                                <p className="text-[10px] font-bold text-slate-500 mt-0.5">{tx.hotelName}</p>
                              </td>

                              <td className="p-3.5">
                                <p className="font-bold text-slate-800">{tx.guestName}</p>
                                <p className="text-[10px] text-slate-400 font-semibold">{tx.guestPhone}</p>
                              </td>

                              <td className="p-3.5 text-right font-bold text-slate-900">
                                {formatNumberDots(tx.grossRevenue)} đ
                              </td>

                              <td className="p-3.5 text-right font-bold text-indigo-600">
                                -{formatNumberDots(tx.commissionAmount)} đ
                              </td>

                              <td className="p-3.5 text-right font-bold text-rose-500">
                                {tx.refundAmount > 0 ? `-${formatNumberDots(tx.refundAmount)} đ` : '0 đ'}
                              </td>

                              <td className="p-3.5 text-right font-black text-emerald-600">
                                {formatNumberDots(tx.ownerNetAmount)} đ
                              </td>

                              <td className="p-3.5 text-right font-black text-slate-900">
                                {tx.payoutStatus === 'PAID' ? `${formatNumberDots(tx.payoutAmount)} đ` : '—'}
                              </td>

                              <td className="p-3.5 text-center">
                                {tx.payoutStatus === 'PAID' && (
                                  <span className="bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-1 rounded-full text-[10px] font-black inline-block">
                                    Đã payout ({tx.payoutAt ? formatDateVN(tx.payoutAt) : 'OK'})
                                  </span>
                                )}
                                {['PENDING', 'ELIGIBLE', 'PROCESSING'].includes(tx.payoutStatus) && (
                                  <span className="bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-full text-[10px] font-black inline-block">
                                    Chờ thanh toán ({tx.payoutStatus})
                                  </span>
                                )}
                                {tx.payoutStatus === 'FAILED' && (
                                  <span className="bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-full text-[10px] font-black inline-block">
                                    Lỗi Payout
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs text-slate-400 font-bold">
                        Trang {financePage} / {totalPages} (Tổng {filteredTx.length} giao dịch)
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          disabled={financePage === 1}
                          onClick={() => setFinancePage(prev => Math.max(1, prev - 1))}
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 font-bold text-xs rounded-xl"
                        >
                          Trang trước
                        </button>
                        <button
                          disabled={financePage === totalPages}
                          onClick={() => setFinancePage(prev => Math.min(totalPages, prev + 1))}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold text-xs rounded-xl"
                        >
                          Trang sau
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })()}



        </main>
      </div>

      {/* BOOKING DETAIL MODAL (ROOT LEVEL) */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 sm:p-6">
          <div className="bg-white rounded-3xl shadow-2xl max-w-5xl lg:max-w-6xl w-full max-h-[92vh] overflow-hidden flex flex-col border border-slate-100 animate-in fade-in zoom-in-95 duration-200">

            {/* Modal Header */}
            <div className="bg-[#F8FAFC] border-b border-[#E2E8F0] px-8 py-5 flex justify-between items-center shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-black text-[#0F172A]">{language === 'vi' ? 'Chi Tiết Đơn Đặt Phòng' : 'Booking Details'}</h3>
                  <span className="bg-[#2563EB]/10 text-[#2563EB] font-black text-xs px-2.5 py-0.5 rounded-full uppercase">
                    #{selectedBooking.id.substring(0, 8).toUpperCase()}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 font-bold mt-0.5">{language === 'vi' ? 'Tạo lúc: ' : 'Created: '} {formatDateTimeVN(selectedBooking.createdAt)}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => handlePrintBooking(selectedBooking)} className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 whitespace-nowrap shadow-sm">
                  <FileText className="w-3.5 h-3.5" /> {language === 'vi' ? 'In Phiếu' : 'Print'}
                </button>
                <button onClick={() => setSelectedBooking(null)} className="bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 p-2 rounded-full transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Overdue Alert Banner if past check-in */}
            {(() => {
              const nowTime = new Date();
              const todayStart = new Date(nowTime.getFullYear(), nowTime.getMonth(), nowTime.getDate());
              const isNotArrived = ['CONFIRMED', 'PENDING', 'PAYMENT_PROCESSING'].includes(selectedBooking.status);
              const isOverdue = isNotArrived && new Date(selectedBooking.checkInDate) <= nowTime && new Date(selectedBooking.checkOutDate) > todayStart;
              if (!isOverdue) return null;
              return (
                <div className="bg-rose-50 border-b border-rose-200 px-8 py-3.5 flex flex-wrap justify-between items-center text-xs font-bold text-rose-800 gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping shrink-0"></span>
                    <span>CẢNH BÁO: Đơn đặt phòng đã quá giờ nhận phòng nhưng khách chưa làm thủ tục nhận phòng (Check-in)!</span>
                  </div>
                  <span className="text-xs bg-rose-200 text-rose-900 px-4 py-1 rounded-full font-black whitespace-nowrap">
                    QUÁ GIỜ NHẬN PHÒNG
                  </span>
                </div>
              );
            })()}

            {/* Modal Tabs */}
            <div className="flex border-b border-[#E2E8F0] bg-white px-8 font-bold text-xs shrink-0">
              <button
                onClick={() => setDetailModalTab('info')}
                className={`py-3.5 px-6 border-b-2 transition-all font-extrabold ${detailModalTab === 'info' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
              >
                {language === 'vi' ? '1. Khách hàng & Phòng' : '1. Guest & Room'}
              </button>
              <button
                onClick={() => setDetailModalTab('payment')}
                className={`py-3.5 px-6 border-b-2 transition-all font-extrabold ${detailModalTab === 'payment' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
              >
                {language === 'vi' ? '2. Thanh toán chi tiết' : '2. Payment breakdown'}
              </button>
              <button
                onClick={() => setDetailModalTab('notes')}
                className={`py-3.5 px-6 border-b-2 transition-all font-extrabold ${detailModalTab === 'notes' ? 'border-[#2563EB] text-[#2563EB]' : 'border-transparent text-slate-400 hover:text-slate-650'}`}
              >
                {language === 'vi' ? '3. Ghi chú & Lịch sử thao tác' : '3. Notes & Timeline'}
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">

              {/* TAB 1: Guest and Room Assignment */}
              {detailModalTab === 'info' && (
                <div className="space-y-6 text-xs font-semibold text-[#1E293B]">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Customer Information */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-[#E2E8F0] pb-1">{language === 'vi' ? 'Thông tin khách đặt' : 'Guest Information'}</h4>
                      <div className="space-y-2">
                        <p><span className="text-slate-400 font-bold block">{language === 'vi' ? 'Họ và tên:' : 'Full name:'}</span> {selectedBooking.guestName}</p>
                        <p><span className="text-slate-400 font-bold block">{language === 'vi' ? 'Email liên hệ:' : 'Email address:'}</span> {selectedBooking.guestEmail}</p>
                        <p><span className="text-slate-400 font-bold block">{language === 'vi' ? 'Số điện thoại:' : 'Phone number:'}</span> {selectedBooking.guestPhone}</p>
                        <p><span className="text-slate-400 font-bold block">{language === 'vi' ? 'Quốc tịch:' : 'Nationality:'}</span> Việt Nam</p>
                        {selectedBooking.notes && (
                          <div className="bg-amber-50 border border-amber-100 p-2.5 rounded-xl mt-2 text-amber-800">
                            <p className="font-black text-[9px] uppercase">{language === 'vi' ? 'Ghi chú / Yêu cầu của khách:' : 'Guest special request:'}</p>
                            <p className="mt-0.5 text-[11px] leading-relaxed font-semibold">{selectedBooking.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Booking info */}
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-[#E2E8F0] pb-1">{language === 'vi' ? 'Chi tiết phòng đặt' : 'Reservation Detail'}</h4>
                      <div className="space-y-2">
                        {selectedBooking.bookingItems.map(item => (
                          <div key={item.id} className="border-b border-[#EFF2F5] pb-2 last:border-b-0 last:pb-0">
                            <p className="font-extrabold text-[#0F172A]">{item.roomType.hotel.name}</p>
                            <p className="text-[11px] text-slate-500 font-bold">{item.roomType.name} x{item.quantity}</p>
                            <p className="text-[11px] text-slate-500 font-medium">{language === 'vi' ? 'Giá mỗi đêm: ' : 'Price per night: '}{formatNumberDots(item.price)} đ</p>
                          </div>
                        ))}
                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E2E8F0] text-[11px]">
                          <p><span className="text-slate-400 font-bold">{language === 'vi' ? 'Nhận phòng:' : 'Check-in:'}</span><br />{formatDateVN(selectedBooking.checkInDate)}</p>
                          <p><span className="text-slate-400 font-bold">{language === 'vi' ? 'Trả phòng:' : 'Check-out:'}</span><br />{formatDateVN(selectedBooking.checkOutDate)}</p>
                        </div>
                        <div className="pt-2 border-t border-[#E2E8F0] text-[11px]">
                          <p><span className="text-slate-400 font-bold">{language === 'vi' ? 'Số khách:' : 'Number of guests:'}</span> <span className="font-extrabold text-[#0F172A]">{getBookingGuests(selectedBooking)} {language === 'vi' ? 'khách' : 'guest(s)'}</span></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Room Assign / Change assignment */}
                  <div className="bg-[#EFF6FF] border border-[#DBEAFE] p-4 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black text-blue-500 uppercase tracking-wider border-b border-blue-150 pb-1">{language === 'vi' ? 'Gán & Sắp Xếp Số Phòng Thực Tế' : 'Room Number Assignment'}</h4>
                    <p className="text-[10px] text-blue-400 font-bold leading-normal">
                      {language === 'vi' ? 'Nhập số phòng thực tế sẽ giao cho khách hàng (Ví dụ: "101" hoặc "202, 203" nếu đặt nhiều phòng).' : 'Enter actual room numbers allocated to the guest.'}
                    </p>

                    <div className="space-y-3 pt-2">
                      {selectedBooking.bookingItems.map(item => (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-blue-100">
                          <div>
                            <p className="font-extrabold text-slate-800">{item.roomType.name}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{language === 'vi' ? 'Số lượng phòng đặt:' : 'Quantity booked:'} {item.quantity}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Ví dụ: 104, 105"
                              value={roomAssignmentsInput[item.id] || ''}
                              onChange={(e) => setRoomAssignmentsInput({
                                ...roomAssignmentsInput,
                                [item.id]: e.target.value
                              })}
                              className="bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl px-3 py-1.5 text-xs outline-none font-bold focus:border-[#2563EB] w-48 text-right"
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        onClick={handleUpdateRoomAssignments}
                        disabled={savingAssignments}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] disabled:bg-slate-200 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all whitespace-nowrap"
                      >
                        {savingAssignments ? 'Saving...' : (language === 'vi' ? 'Lưu số phòng đã gán' : 'Save Room Assignments')}
                      </button>
                    </div>
                  </div>

                  {/* Date Adjustment section (CONFIRMED / CHECKED_IN) */}
                  {['CONFIRMED', 'CHECKED_IN'].includes(selectedBooking.status) && (
                    <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1">
                        {selectedBooking.status === 'CHECKED_IN' ? (language === 'vi' ? 'Gia Hạn Lưu Trú / Sửa Ngày' : 'Extend check-out / edit dates') : (language === 'vi' ? 'Thay Đổi Ngày Nhận / Trả Phòng' : 'Change booking dates')}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Ngày nhận phòng (Check-in)' : 'Check-in Date'}</label>
                          <input
                            type="date"
                            value={checkInDateInput}
                            onChange={(e) => setCheckInDateInput(e.target.value)}
                            disabled={selectedBooking.status === 'CHECKED_IN'} // Cannot change check-in date if already checked-in
                            className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-850 font-bold focus:outline-none focus:border-[#2563EB] disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wide block">{language === 'vi' ? 'Ngày trả phòng (Check-out)' : 'Check-out Date'}</label>
                          <input
                            type="date"
                            value={checkOutDateInput}
                            onChange={(e) => setCheckOutDateInput(e.target.value)}
                            className="w-full px-3 py-1.5 bg-white border border-[#E2E8F0] rounded-xl text-slate-850 font-bold focus:outline-none focus:border-[#2563EB]"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end pt-2">
                        <button
                          onClick={handleChangeBookingDates}
                          disabled={savingDates}
                          className="bg-[#0F172A] hover:bg-slate-800 disabled:bg-slate-200 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all whitespace-nowrap shadow-sm"
                        >
                          {savingDates ? 'Saving...' : (language === 'vi' ? 'Cập nhật ngày lưu trú' : 'Update booking dates')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Payment Details */}
              {detailModalTab === 'payment' && (
                <div className="space-y-4 text-xs font-semibold text-[#1E293B]">
                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-200 pb-1">{language === 'vi' ? 'Hóa Đơn Thanh Toán Đơn Phòng' : 'Payment breakdown'}</h4>
                    <div className="space-y-2.5 pt-1 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold">{language === 'vi' ? 'Giá trị phòng gốc:' : 'Base Room Price:'}</span>
                        <span className="font-extrabold">{formatNumberDots(selectedBooking.totalPrice)} đ</span>
                      </div>
                      {selectedBooking.pointsUsed > 0 && (
                        <div className="flex justify-between text-[#2563EB]">
                          <span className="font-bold">{language === 'vi' ? 'Điểm tích lũy sử dụng:' : 'Loyalty points used:'} (-{selectedBooking.pointsUsed} điểm)</span>
                          <span className="font-extrabold">-{Number(selectedBooking.pointsDiscount).toLocaleString()} đ</span>
                        </div>
                      )}
                      {selectedBooking.discountAmount - Number(selectedBooking.pointsDiscount) > 0 && (
                        <div className="flex justify-between text-red-500">
                          <span className="font-bold">{language === 'vi' ? 'Chiết khấu Voucher/Khuyến mãi:' : 'Voucher/Promo discount:'}</span>
                          <span className="font-extrabold">-{Number(selectedBooking.discountAmount - Number(selectedBooking.pointsDiscount)).toLocaleString()} đ</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-[#E2E8F0] pt-2 text-sm text-[#0F172A]">
                        <span className="font-black">{language === 'vi' ? 'Tổng giá thanh toán:' : 'Total Final Price:'}</span>
                        <span className="font-black text-[#2563EB]">{Number(selectedBooking.finalPrice).toLocaleString()} đ</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-4 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-[#E2E8F0] pb-1">{language === 'vi' ? 'Thông Tin Giao Dịch & Trạng Thái' : 'Transaction Info'}</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-[11px]">
                      <p><span className="text-slate-400 font-bold block">{language === 'vi' ? 'Phương thức thanh toán:' : 'Payment method:'}</span> {selectedBooking.payment?.method || 'CASH'}</p>
                      <p><span className="text-slate-400 font-bold block">{language === 'vi' ? 'Trạng thái giao dịch:' : 'Transaction status:'}</span> <span className="font-black uppercase text-emerald-650">{selectedBooking.payment?.status || 'PENDING'}</span></p>
                      <p><span className="text-slate-400 font-bold block">{language === 'vi' ? 'Mã giao dịch:' : 'Transaction reference:'}</span> {selectedBooking.payment?.transactionId || 'N/A'}</p>
                      <p><span className="text-slate-400 font-bold block">{language === 'vi' ? 'Thời gian thanh toán:' : 'Paid at:'}</span> {selectedBooking.payment?.paidAt ? formatDateTimeVN(selectedBooking.payment.paidAt) : 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: Internal Notes & Activities (Timeline) */}
              {detailModalTab === 'notes' && (
                <div className="space-y-6 text-xs font-semibold text-[#1E293B]">
                  {/* Internal Notes */}
                  <div className="bg-[#FEF3C7]/40 border border-amber-200 p-4 rounded-2xl space-y-3">
                    <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-wider border-b border-amber-150 pb-1">{language === 'vi' ? 'Ghi Chú Nội Bộ (Chỉ Nhân Viên Xem)' : 'Internal Notes (Staff Only)'}</h4>
                    <textarea
                      value={internalNotesInput}
                      onChange={(e) => setInternalNotesInput(e.target.value)}
                      placeholder={language === 'vi' ? 'Nhập ghi chú nội bộ (Ví dụ: Khách hàng VIP, Ưu tiên tầng cao, Khách quen...)' : 'Enter internal notes for staff...'}
                      rows={2}
                      className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs outline-none font-bold focus:border-[#2563EB]"
                    />
                    <div className="flex justify-end">
                      <button
                        onClick={handleUpdateInternalNotes}
                        disabled={savingNotes}
                        className="bg-amber-600 hover:bg-amber-700 disabled:bg-slate-200 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all whitespace-nowrap"
                      >
                        {savingNotes ? 'Saving...' : (language === 'vi' ? 'Lưu ghi chú nội bộ' : 'Save Internal Note')}
                      </button>
                    </div>
                  </div>

                  {/* Booking Timeline */}
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-[#E2E8F0] pb-1">{language === 'vi' ? 'Nhật Ký Hoạt Động (Timeline)' : 'Activity Log (Timeline)'}</h4>
                    {timelineLoading ? (
                      <div className="space-y-2 py-4 animate-pulse">
                        <div className="h-4 bg-slate-100 rounded w-2/3"></div>
                        <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                      </div>
                    ) : timelineLogs.length === 0 ? (
                      <p className="text-slate-400 italic py-4 text-center">{language === 'vi' ? 'Chưa có nhật ký hoạt động nào.' : 'No activity logs found.'}</p>
                    ) : (
                      <div className="relative pl-6 border-l-2 border-[#E2E8F0] ml-3 space-y-5">
                        {timelineLogs.map((log) => (
                          <div key={log.id} className="relative">
                            {/* Indicator circle */}
                            <div className="absolute -left-[31px] top-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#2563EB]"></div>
                            <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3 rounded-2xl space-y-1.5 shadow-[0_2px_8px_rgba(15,23,42,0.02)]">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                                <span className="font-extrabold text-[#0F172A]">{log.action}</span>
                                <span className="text-[9px] text-slate-400 font-bold">{formatDateTimeVN(log.createdAt)}</span>
                              </div>
                              <p className="text-[9px] text-[#64748B] font-bold">Thực hiện bởi: {log.user.fullName} ({log.user.role})</p>

                              {/* Value changes details if present */}
                              {log.newValues && (
                                <div className="text-[9px] font-mono bg-white border border-[#E2E8F0] p-2 rounded-xl text-slate-600 mt-1 max-h-24 overflow-y-auto">
                                  {language === 'vi' ? 'Giá trị thay đổi:' : 'Changes:'} {JSON.stringify(log.newValues, null, 2)}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer (Contextual Actions) */}
            <div className="bg-[#F8FAFC] border-t border-[#E2E8F0] px-8 py-5 flex flex-wrap justify-between items-center gap-4 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 font-bold uppercase">{language === 'vi' ? 'Trạng thái hiện tại:' : 'Current Status:'}</span>
                <span className={`px-3 py-1 rounded-lg font-black text-xs uppercase tracking-wide ${selectedBooking.status === 'CONFIRMED' ? 'bg-[#EFF6FF] text-[#1E40AF]' :
                  selectedBooking.status === 'CHECKED_IN' ? 'bg-[#ECFDF5] text-[#065F46]' :
                    selectedBooking.status === 'PENDING' ? 'bg-[#FEF3C7] text-[#92400E]' :
                      selectedBooking.status === 'CANCELLED' ? 'bg-[#FEF2F2] text-[#991B1B]' :
                        selectedBooking.status === 'CHECKED_OUT' ? 'bg-[#F5F3FF] text-[#5B21B6]' :
                          selectedBooking.status === 'COMPLETED' ? 'bg-[#F3F4F6] text-[#374151]' : 'bg-[#FFF7ED] text-[#9A3412]'
                  }`}>
                  {selectedBooking.status}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                {selectedBooking.status === 'PENDING' && (
                  <>
                    <button
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'CONFIRMED')}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all whitespace-nowrap"
                    >
                      {language === 'vi' ? 'Xác nhận đơn' : 'Confirm reservation'}
                    </button>
                    <button
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'CANCELLED')}
                      className="bg-[#FEF2F2] hover:bg-[#FEE2E2] text-[#EF4444] font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all whitespace-nowrap border border-rose-200"
                    >
                      {language === 'vi' ? 'Từ chối đơn' : 'Reject booking'}
                    </button>
                  </>
                )}

                {selectedBooking.status === 'CONFIRMED' && (
                  <>
                    <button
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'CHECKED_IN')}
                      className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all whitespace-nowrap"
                    >
                      Check In & Bàn giao phòng
                    </button>
                    <button
                      onClick={async () => {
                        const note = await showPrompt('Nhập thời gian khách hẹn nhận phòng muộn (ví dụ: 22:00 hoặc Sáng mai 08:00):', '', '22:00', 'Báo đến muộn');
                        if (note && note.trim()) {
                          try {
                            const fullNote = `[NHẬN PHÒNG MUỘN] Khách hẹn đến lúc: ${note.trim()} | ${selectedBooking.internalNotes || ''}`;
                            await apiClient.put(`/bookings/${selectedBooking.id}/internal-notes`, { internalNotes: fullNote });
                            setSelectedBooking(prev => prev ? { ...prev, internalNotes: fullNote } : null);
                            triggerToast('Đã lưu ghi chú nhận phòng muộn thành công!');
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className="bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all border border-amber-300 flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                    >
                      ⚡ Báo Đến Muộn
                    </button>
                    <button
                      onClick={async () => {
                        const confirmed = await showConfirm(
                          'Xác nhận khách vắng mặt (No-Show)? Đơn đặt phòng sẽ bị HỦY và phòng sẽ được giải phóng lập tức.',
                          { title: 'Xác nhận No-Show', type: 'danger', confirmText: 'Xác nhận No-Show' }
                        );
                        if (confirmed) {
                          try {
                            const noShowNote = `[NO-SHOW] Khách vắng mặt quá giờ nhận phòng | ${selectedBooking.internalNotes || ''}`;
                            await apiClient.put(`/bookings/${selectedBooking.id}/internal-notes`, { internalNotes: noShowNote });
                            handleUpdateBookingStatus(selectedBooking.id, 'CANCELLED');
                            triggerToast('Đã xử lý No-Show & Giải phóng phòng thành công!');
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                      className="bg-rose-100 hover:bg-rose-200 text-rose-800 font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all border border-rose-300 flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                    >
                      🚫 Khách Vắng Mặt (No-Show)
                    </button>
                    <button
                      onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'CANCELLED')}
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all whitespace-nowrap shadow-sm"
                    >
                      {language === 'vi' ? 'Hủy phòng' : 'Cancel booking'}
                    </button>
                  </>
                )}

                {selectedBooking.status === 'CHECKED_IN' && (
                  <button
                    onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'CHECKED_OUT')}
                    className="bg-[#0F172A] hover:bg-slate-800 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all whitespace-nowrap"
                  >
                    Check Out & Lập hóa đơn
                  </button>
                )}

                {selectedBooking.status === 'CHECKED_OUT' && (
                  <button
                    onClick={() => handleUpdateBookingStatus(selectedBooking.id, 'COMPLETED')}
                    className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-sm transition-all whitespace-nowrap"
                  >
                    {language === 'vi' ? 'Hoàn thành đơn đặt' : 'Mark as Completed'}
                  </button>
                )}

                <a
                  href={`mailto:${selectedBooking.guestEmail}?subject=CloudBooking - Đơn đặt phòng #${selectedBooking.id.substring(0, 8).toUpperCase()}`}
                  className="bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-slate-700 font-extrabold text-xs px-6 py-2.5 rounded-xl transition-all flex items-center justify-center whitespace-nowrap shadow-sm"
                >
                  {language === 'vi' ? 'Gửi email liên hệ' : 'Email Guest'}
                </a>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* EDIT DAY PRICE MODAL */}
      {editDay && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm space-y-4 text-[#1E293B] border border-[#E2E8F0]">
            <div className="border-b border-[#E2E8F0] pb-2.5">
              <h3 className="font-bold text-[#0F172A] text-sm">Điều chỉnh giá ngày {editDay.date}</h3>
              <p className="text-[11px] text-[#64748B] font-medium mt-0.5">
                Giá hiện tại: <span className="font-bold text-[#2563EB]">{formatNumberDots(editDay.price)} đ</span>
              </p>
            </div>

            <div className="space-y-3 font-semibold text-xs">
              {/* Quick Increase / Decrease Buttons */}
              <div className="space-y-1.5 bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                <label className="text-[10px] font-extrabold text-[#64748B] uppercase block">Điều chỉnh nhanh Tăng / Giảm</label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setNewPrice(Math.round(editDay.price * 1.05).toString())}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition-all border border-emerald-200"
                  >
                    +5%
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPrice(Math.round(editDay.price * 1.10).toString())}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition-all border border-emerald-200"
                  >
                    +10%
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPrice(Math.round(editDay.price * 1.20).toString())}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition-all border border-emerald-200"
                  >
                    +20%
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPrice((editDay.price + 100000).toString())}
                    className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg transition-all border border-emerald-200"
                  >
                    +100k
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setNewPrice(Math.round(editDay.price * 0.95).toString())}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg transition-all border border-rose-200"
                  >
                    -5%
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPrice(Math.round(editDay.price * 0.90).toString())}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg transition-all border border-rose-200"
                  >
                    -10%
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPrice(Math.round(editDay.price * 0.80).toString())}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg transition-all border border-rose-200"
                  >
                    -20%
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewPrice(Math.max(0, editDay.price - 100000).toString())}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-bold rounded-lg transition-all border border-rose-200"
                  >
                    -100k
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#64748B] uppercase">Mức giá mới (VND)</label>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Nhập mức giá chính xác"
                  className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="text-xs font-bold text-[#1E293B]">Đóng phòng / Khóa phòng ngày này</label>
                <input
                  type="checkbox"
                  checked={newBlocked}
                  onChange={(e) => setNewBlocked(e.target.checked)}
                  className="w-4 h-4 text-[#2563EB] focus:ring-[#2563EB] rounded cursor-pointer"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-between pt-2 border-t border-[#E2E8F0] flex-wrap items-center">
              <button onClick={handleRestoreDay} className="px-3 py-2 bg-red-50 hover:bg-red-100 text-[#DC2626] rounded-xl text-[10px] font-extrabold transition-all shadow-sm">
                Khôi phục giá gốc
              </button>
              <div className="flex gap-1.5 justify-end">
                <button onClick={() => setEditDay(null)} className="px-3.5 py-2 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded-xl text-[10px] font-bold transition-all shadow-sm">Quay lại</button>
                <button onClick={handleSavePriceCalendar} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-3.5 py-2 rounded-xl text-[10px] font-bold transition-all shadow-sm">Lưu thay đổi</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD OWNER COUPON MODAL */}
      {showAddCoupon && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleCreateOwnerCoupon} className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-md space-y-4 text-[#1E293B] border border-[#E2E8F0] animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-base">Tạo Mã Giảm Giá Khách Sạn</h3>
                <p className="text-[10px] text-[#64748B] font-semibold mt-0.5">Cấu hình chi tiết mã khuyến mãi cho chỗ nghỉ của bạn</p>
              </div>
              <span className="text-xl">🏷️</span>
            </div>

            <div className="space-y-3.5 text-xs font-semibold max-h-[75vh] overflow-y-auto pr-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Mã giảm giá (In hoa) *</label>
                  <input
                    type="text"
                    required
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                    placeholder="VD: KHANG2026"
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-black tracking-wider outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Lượt dùng tối đa *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newCouponLimit}
                    onChange={(e) => setNewCouponLimit(e.target.value)}
                    placeholder="VD: 50"
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Mô tả chương trình ưu đãi *</label>
                <input
                  type="text"
                  required
                  value={newCouponDesc}
                  onChange={(e) => setNewCouponDesc(e.target.value)}
                  placeholder="VD: Ưu đãi giảm 15% cho khách đặt phòng trước 3 ngày"
                  className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Loại giảm giá *</label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as any)}
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] transition-all font-bold cursor-pointer"
                  >
                    <option value="PERCENTAGE">Phần trăm (%)</option>
                    <option value="FIXED">Số tiền cố định (đ)</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Giá trị giảm *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(e.target.value)}
                    placeholder={newCouponType === 'PERCENTAGE' ? 'VD: 15 (%)' : 'VD: 100000 (đ)'}
                    className="w-full bg-white border border-[#CBD5E1] text-[#2563EB] rounded-xl p-2.5 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-black outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Đơn tối thiểu (đ)</label>
                  <input
                    type="number"
                    min="0"
                    value={newCouponMinOrderValue}
                    onChange={(e) => setNewCouponMinOrderValue(e.target.value)}
                    placeholder="VD: 500000 (0 = Mọi đơn)"
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] transition-all font-semibold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Giảm tối đa (đ)</label>
                  <input
                    type="number"
                    min="0"
                    disabled={newCouponType !== 'PERCENTAGE'}
                    value={newCouponMaxDiscountAmount}
                    onChange={(e) => setNewCouponMaxDiscountAmount(e.target.value)}
                    placeholder={newCouponType === 'PERCENTAGE' ? 'VD: 200000' : 'Chỉ áp dụng với %'}
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] transition-all font-semibold disabled:bg-slate-100 disabled:text-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Đối tượng *</label>
                  <select
                    value={newCouponTargetUserType}
                    onChange={(e) => setNewCouponTargetUserType(e.target.value as any)}
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] transition-all font-bold cursor-pointer"
                  >
                    <option value="ALL">🌐 Tất cả</option>
                    <option value="NEW">🆕 Khách mới</option>
                    <option value="VIP">⭐ Khách VIP</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Tổng lượt dùng *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newCouponLimit}
                    onChange={(e) => setNewCouponLimit(e.target.value)}
                    placeholder="VD: 50"
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Giới hạn/Ngày</label>
                  <input
                    type="number"
                    min="1"
                    value={newCouponDailyLimit}
                    onChange={(e) => setNewCouponDailyLimit(e.target.value)}
                    placeholder="VD: 5 (Để trống = ∞)"
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] transition-all font-semibold outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Thời gian bắt đầu (Ngày & Giờ) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newCouponStart}
                    onChange={(e) => setNewCouponStart(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] transition-all font-semibold outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Thời gian kết thúc (Ngày & Giờ) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newCouponEnd}
                    onChange={(e) => setNewCouponEnd(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] transition-all font-semibold outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-[#E2E8F0]">
              <button type="button" onClick={() => setShowAddCoupon(false)} className="px-4 py-2.5 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded-xl text-xs font-bold transition-all shadow-sm">Hủy bỏ</button>
              <button type="submit" className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95">Tạo khuyến mãi</button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE COUPON CONFIRMATION MODAL */}
      {deleteConfirmId && activeMenu === 'promotions' && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-2xl w-full max-w-sm space-y-4 text-[#1E293B] text-center">
            <ShieldAlert className="w-12 h-12 text-[#DC2626] mx-auto animate-bounce" />
            <h3 className="font-bold text-sm text-[#0F172A]">Xác nhận xóa khuyến mãi này?</h3>
            <p className="text-xs text-[#64748B]">Hành động này sẽ xóa vĩnh viễn dữ liệu mã giảm giá này. Bạn có chắc chắn không?</p>
            <div className="flex gap-2 justify-center pt-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded-xl text-xs font-bold transition-all shadow-sm">Hủy bỏ</button>
              <button onClick={() => handleDeleteOwnerCoupon(deleteConfirmId)} className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold transition-all shadow-sm">Xác nhận xóa</button>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT ROOM TYPE MODAL */}
      {showAddRoom && (() => {
        const roomConfig = getPropertyTypeConfig(propertyType);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <form
              onSubmit={handleSaveRoomType}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl lg:max-w-5xl border border-slate-100 animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh] overflow-hidden"
            >
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50/80">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base uppercase tracking-wider">
                    {editingRoomType ? roomConfig.titleEdit : roomConfig.titleAdd}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold mt-0.5">
                    {roomConfig.subtitle}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowAddRoom(false); setEditingRoomType(null); }}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 pb-28 overflow-y-auto space-y-6 flex-1 text-xs font-semibold">

                {/* Tên hạng phòng / Villa / Căn hộ / Homestay */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#64748B] uppercase">{roomConfig.nameLabel}</label>
                  <input
                    type="text"
                    required
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder={roomConfig.namePlaceholder}
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-3 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none"
                  />
                </div>

                {/* Thông số cơ bản (Grid 2 cột) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] uppercase">Giá cơ bản 1 đêm (VNĐ) *</label>
                    <input
                      type="number"
                      required
                      value={newRoomPrice}
                      onChange={(e) => setNewRoomPrice(e.target.value)}
                      placeholder="1200000"
                      className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-3 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] uppercase">{roomConfig.sizeLabel}</label>
                    <input
                      type="number"
                      required
                      value={newRoomSize}
                      onChange={(e) => setNewRoomSize(e.target.value)}
                      placeholder={roomConfig.sizePlaceholder}
                      className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-3 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none"
                    />
                  </div>
                </div>

                {/* Phân cột các thông số chi tiết */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] uppercase">Sức chứa tối đa (Khách) *</label>
                    <input
                      type="number"
                      required
                      value={newRoomCapacity}
                      onChange={(e) => setNewRoomCapacity(e.target.value)}
                      placeholder="2"
                      min="1"
                      className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-3 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#64748B] uppercase">{roomConfig.countLabel}</label>
                    <input
                      type="number"
                      required
                      value={newRoomCount}
                      onChange={(e) => setNewRoomCount(e.target.value)}
                      placeholder={roomConfig.countPlaceholder}
                      min="1"
                      className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-3 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none"
                    />
                  </div>

                  {/* Hiện trường Số phòng ngủ nếu propertyType là Villa / Căn hộ / Homestay */}
                  {roomConfig.showBedrooms && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#2563EB] uppercase">{roomConfig.bedroomLabel}</label>
                      <input
                        type="number"
                        required
                        value={newRoomBedroomCount}
                        onChange={(e) => handleBedroomCountChange(e.target.value)}
                        placeholder="1"
                        min="1"
                        className="w-full bg-blue-50/50 border border-blue-200 text-[#1E293B] rounded-xl p-3 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-bold outline-none"
                      />
                    </div>
                  )}

                  {/* Hiện trường Số phòng tắm nếu propertyType là Villa / Căn hộ / Homestay */}
                  {roomConfig.showBathrooms && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#2563EB] uppercase">{roomConfig.bathroomLabel}</label>
                      <input
                        type="number"
                        required
                        value={newRoomBathroomCount}
                        onChange={(e) => setNewRoomBathroomCount(e.target.value)}
                        placeholder="1"
                        min="1"
                        className="w-full bg-blue-50/50 border border-blue-200 text-[#1E293B] rounded-xl p-3 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-bold outline-none"
                      />
                    </div>
                  )}
                </div>

                {/* Bedroom-by-Bedroom Bed Configuration Panel for Villa / Apartment / Homestay */}
                {roomConfig.showMultiBed ? (
                  <div className="bg-blue-50/40 border border-blue-200/80 p-5 rounded-2xl space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 border-b border-blue-100 pb-3">
                      <div>
                        <h4 className="font-black text-[#2563EB] text-xs uppercase tracking-wider flex items-center gap-1.5">
                          <span>🛏️</span> Cấu hình Giường theo từng Phòng ngủ ({roomConfig.nameLabel.replace(' *', '')})
                        </h4>
                        <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                          Chọn loại giường & số lượng giường cho từng phòng ngủ cụ thể (Phòng ngủ 1, Phòng ngủ 2...)
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleAddCommonArea}
                          className="bg-white border border-blue-300 text-[#2563EB] hover:bg-blue-50 px-3 py-1.5 rounded-xl text-[11px] font-extrabold shadow-2xs transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <span>＋ Thêm Phòng khách</span>
                        </button>
                        <div className="bg-[#2563EB] text-white px-3 py-1.5 rounded-xl text-[11px] font-black tracking-wide shadow-xs shrink-0">
                          TỔNG: {newRoomBedCount} GIƯỜNG
                        </div>
                      </div>
                    </div>

                    {/* Loop through each bedroom */}
                    <div className="space-y-3">
                      {bedroomList.map((rm, rIdx) => {
                        const roomTotal = Object.values(rm.beds).reduce((a, b) => a + b, 0);
                        const isCommon = rm.name.includes('Phòng khách');
                        return (
                          <div key={rm.id || rIdx} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-base">{isCommon ? '🛋️' : '🚪'}</span>
                                <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">{rm.name}</span>
                                <span className="bg-blue-50 text-[#2563EB] text-[10px] font-black px-2 py-0.5 rounded-md border border-blue-150">
                                  {roomTotal} giường
                                </span>
                              </div>

                              {isCommon && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveBedroom(rIdx)}
                                  className="text-rose-600 hover:text-rose-700 text-[10px] font-bold underline cursor-pointer"
                                >
                                  Xóa không gian này
                                </button>
                              )}
                            </div>

                            {/* Stepper buttons for beds in this room */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                              {PRESET_BED_TYPES.map((bed) => {
                                const count = rm.beds[bed.id] || 0;
                                const isActive = count > 0;
                                return (
                                  <div
                                    key={bed.id}
                                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${isActive ? 'bg-blue-50/50 border-[#2563EB] shadow-2xs' : 'bg-slate-50/50 border-slate-200'
                                      }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="text-sm shrink-0">{bed.icon}</span>
                                      <span className={`text-[11px] font-bold truncate ${isActive ? 'text-[#2563EB] font-extrabold' : 'text-slate-700'}`}>
                                        {bed.name.split(' (')[0]}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-1.5 shrink-0">
                                      <button
                                        type="button"
                                        disabled={count <= 0}
                                        onClick={() => handleUpdateBedroomBed(rIdx, bed.id, -1)}
                                        className="w-6 h-6 rounded-md border border-slate-300 text-slate-600 disabled:border-slate-200 disabled:text-slate-300 disabled:bg-slate-50 flex items-center justify-center font-black text-xs hover:bg-slate-100 active:scale-95 cursor-pointer"
                                      >
                                        -
                                      </button>
                                      <span className={`w-4 text-center font-black text-xs ${count > 0 ? 'text-[#2563EB] font-bold' : 'text-slate-400'}`}>
                                        {count}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateBedroomBed(rIdx, bed.id, 1)}
                                        className="w-6 h-6 rounded-md bg-[#2563EB] hover:bg-[#1D4ED8] text-white flex items-center justify-center font-black text-xs active:scale-95 shadow-2xs cursor-pointer"
                                      >
                                        +
                                      </button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Overall Bed Breakdown Summary */}
                    <div className="bg-white border border-blue-200 rounded-xl p-3 flex items-center gap-2.5 text-xs shadow-2xs">
                      <span className="text-base">✨</span>
                      <div className="flex-1">
                        <span className="font-black text-[#2563EB]">Tóm tắt toàn bộ giường: </span>
                        <span className="font-extrabold text-slate-800">
                          {newRoomBedType || 'Chưa cấu hình giường'} ({newRoomBedCount} giường)
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Standard Single Bed selector for Hotel / Resort / Guesthouse */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Số lượng giường *</label>
                      <input
                        type="number"
                        required
                        value={newRoomBedCount}
                        onChange={(e) => setNewRoomBedCount(e.target.value)}
                        placeholder="1"
                        min="1"
                        className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-3 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none"
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Loại giường"
                        required
                        value={newRoomBedType}
                        onChange={(val) => setNewRoomBedType(val)}
                        allowCustomInput={true}
                        customInputPlaceholder="Nhập loại giường..."
                        options={[
                          { value: 'Giường Đôi', label: 'Giường Đôi (Double)', icon: <BedTypeIcon type="double" className="w-4 h-4 text-blue-600" /> },
                          { value: 'Giường King', label: 'Giường King Size', icon: <BedTypeIcon type="king" className="w-4 h-4 text-blue-600" /> },
                          { value: 'Giường Queen', label: 'Giường Queen Size', icon: <BedTypeIcon type="queen" className="w-4 h-4 text-blue-600" /> },
                          { value: 'Giường Đơn', label: 'Giường Đơn (Single)', icon: <BedTypeIcon type="single" className="w-4 h-4 text-blue-600" /> },
                          { value: 'Giường Super King', label: 'Giường Super King', icon: <BedTypeIcon type="superking" className="w-4 h-4 text-blue-600" /> },
                          { value: 'Giường Tầng', label: 'Giường Tầng (Bunk)', icon: <BedTypeIcon type="bunk" className="w-4 h-4 text-blue-600" /> },
                          { value: 'Giường Sofa', label: 'Giường Sofa (Sofa bed)', icon: <BedTypeIcon type="sofa" className="w-4 h-4 text-blue-600" /> },
                          { value: '2 Giường Đơn', label: '2 Giường Đơn (Twin)', icon: <BedTypeIcon type="double" className="w-4 h-4 text-blue-600" /> },
                          { value: 'OTHER', label: 'Tự nhập loại giường khác...', icon: <Edit3 className="w-4 h-4 text-slate-500" /> },
                        ]}
                      />
                    </div>
                  </div>
                )}

                {/* Mô tả phòng / Căn */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-[#64748B] uppercase">Mô tả chi tiết</label>
                  <textarea
                    rows={3}
                    value={newRoomDesc}
                    onChange={(e) => setNewRoomDesc(e.target.value)}
                    placeholder="Mô tả các điểm đặc biệt, tầm nhìn view, không gian, tiện nghi nổi bật..."
                    className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-3 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none resize-none leading-relaxed"
                  />
                </div>

                {/* Danh sách ảnh hạng phòng (Nhiều ảnh) */}
                <div className="space-y-2 bg-slate-50/60 p-4 border border-slate-200/70 rounded-2xl">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                    <label className="text-[10px] font-bold text-[#64748B] uppercase block">
                      Danh sách hình ảnh ({newRoomImages.length} ảnh)
                    </label>
                    <span className="text-[10px] text-[#2563EB] font-extrabold">
                      Có thể chọn cùng lúc nhiều ảnh từ máy tính
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Nút chọn nhiều ảnh từ máy tính */}
                    <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-4 py-2.5 rounded-xl border border-blue-600 flex items-center justify-center gap-2 text-xs transition-all active:scale-95 shrink-0 shadow-md">
                      <Upload className="w-4 h-4 text-white" />
                      <span>
                        {uploadingRoomImage ? 'Đang tải ảnh...' : '📁 Thêm nhiều ảnh từ máy tính'}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleRoomTypeFileChange}
                        disabled={uploadingRoomImage}
                        className="hidden"
                      />
                    </label>

                    {/* Hoặc dán URL bổ sung */}
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        value={newRoomImageUrl}
                        onChange={(e) => setNewRoomImageUrl(e.target.value)}
                        placeholder="Hoặc dán URL ảnh tại đây..."
                        className="flex-1 bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (!newRoomImageUrl.trim()) return;
                          setNewRoomImages(prev => [...prev, { url: newRoomImageUrl.trim(), isPrimary: prev.length === 0 }]);
                          setNewRoomImageUrl('');
                          triggerToast('Đã thêm liên kết ảnh vào danh sách!');
                        }}
                        className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-sm active:scale-95 whitespace-nowrap"
                      >
                        Thêm
                      </button>
                    </div>
                  </div>

                  {/* Danh sách ảnh đã tải lên */}
                  {newRoomImages.length > 0 && (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-h-[200px] overflow-y-auto pr-1 pt-2">
                      {newRoomImages.map((img, idx) => (
                        <div key={idx} className="relative border border-slate-200 rounded-2xl overflow-hidden group shadow-sm bg-white flex flex-col items-center p-2 gap-1.5 hover:border-blue-300 transition-all">
                          <img src={img.url} alt="Room Preview" className="w-full h-20 rounded-xl object-cover bg-white border border-slate-100" />
                          <div className="w-full flex items-center justify-between gap-1 pt-0.5">
                            <button
                              type="button"
                              onClick={() => {
                                setNewRoomImages(prev => prev.map((item, i) => ({ ...item, isPrimary: i === idx })));
                              }}
                              className={`text-[9px] font-black px-2 py-1 rounded-lg w-full text-center transition-all ${img.isPrimary ? 'bg-amber-400 text-slate-900 shadow-sm' : 'bg-slate-100 text-slate-650 hover:bg-slate-200'}`}
                            >
                              {img.isPrimary ? '⭐ Ảnh chính' : 'Đặt chính'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setNewRoomImages(prev => prev.filter((_, i) => i !== idx));
                              }}
                              className="bg-rose-50 text-rose-600 rounded-lg p-1.5 hover:bg-rose-100 transition-all border border-rose-200 shrink-0"
                              title="Xóa ảnh này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Chính sách & Phụ thu */}
                <div className="bg-blue-50/50 p-5 border border-blue-100 rounded-2xl space-y-4">
                  <h4 className="font-extrabold text-[#2563EB] text-[10px] uppercase tracking-wider">Chính sách & Phụ thu</h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <CustomSelect
                        label="Chính sách hủy"
                        value={newRoomCancellationPolicy}
                        onChange={(val) => setNewRoomCancellationPolicy(val)}
                        options={[
                          { value: 'NONE', label: 'Không áp dụng chính sách hủy', icon: <X className="w-4 h-4 text-slate-400" /> },
                          { value: 'FREE_24H', label: 'Hủy miễn phí trước 24h', icon: <ShieldCheck className="w-4 h-4 text-emerald-600" /> },
                          { value: 'FREE_48H', label: 'Hủy miễn phí trước 48h', icon: <Clock className="w-4 h-4 text-blue-600" /> },
                          { value: 'NON_REFUNDABLE', label: 'Không hoàn tiền', icon: <Lock className="w-4 h-4 text-amber-600" /> },
                        ]}
                      />
                    </div>

                    <div>
                      <CustomSelect
                        label="Chính sách thanh toán"
                        value={newRoomPaymentPolicy}
                        onChange={(val) => setNewRoomPaymentPolicy(val)}
                        options={[
                          { value: 'NONE', label: 'Không quy định chính sách', icon: <FileText className="w-4 h-4 text-slate-400" /> },
                          { value: 'PAY_AT_HOTEL', label: 'Thanh toán tại chỗ lưu trú', icon: <Hotel className="w-4 h-4 text-blue-600" /> },
                          { value: 'PAY_ONLINE', label: 'Thanh toán online', icon: <CreditCard className="w-4 h-4 text-emerald-600" /> },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center pt-1">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-[#64748B] uppercase">Phụ thu khách phát sinh (đ/đêm)</label>
                      <input
                        type="number"
                        required
                        value={newRoomChildSurcharge}
                        onChange={(e) => setNewRoomChildSurcharge(e.target.value)}
                        placeholder="150000"
                        min="0"
                        className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl p-2.5 text-xs focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold outline-none"
                      />
                    </div>

                    {roomConfig.showBreakfast && (
                      <label className="flex items-center gap-2 pt-4 sm:pt-5 text-xs font-bold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={newRoomIncludeBreakfast}
                          onChange={(e) => setNewRoomIncludeBreakfast(e.target.checked)}
                          className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]/20 w-4 h-4 cursor-pointer"
                        />
                        <span>Bao gồm bữa sáng miễn phí</span>
                      </label>
                    )}
                  </div>
                </div>

                {/* Tiện ích đặc trưng theo loại hình lưu trú */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-[#64748B] uppercase block">{roomConfig.amenitiesTitle}</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-slate-50 border border-slate-200/70 rounded-2xl max-h-[160px] overflow-y-auto">
                    {roomConfig.presetAmenities.map((am) => {
                      const isChecked = newRoomAmenities.includes(am);
                      return (
                        <label key={am} className="flex items-center gap-2 text-[11px] font-bold text-slate-700 cursor-pointer select-none hover:text-blue-600">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setNewRoomAmenities(prev => [...prev, am]);
                              } else {
                                setNewRoomAmenities(prev => prev.filter(x => x !== am));
                              }
                            }}
                            className="rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB]/20 w-3.5 h-3.5 cursor-pointer"
                          />
                          <span>{am}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="px-6 py-4 border-t border-slate-150 flex justify-end gap-3 bg-slate-50">
                <button
                  type="button"
                  onClick={() => { setShowAddRoom(false); setEditingRoomType(null); }}
                  className="px-5 py-2.5 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white px-6 py-2.5 rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95"
                >
                  {editingRoomType ? 'Lưu thay đổi' : 'Tạo mới'}
                </button>
              </div>
            </form>
          </div>
        );
      })()}

      {/* AMENITIES CONFIGURATION MODAL */}
      {isAmenitiesModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-5xl lg:max-w-6xl shadow-2xl border border-slate-100 flex flex-col max-h-[92vh] overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-150 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm sm:text-base uppercase tracking-wider">
                  Thiết lập tiện ích khách sạn
                </h3>
                <p className="text-[10px] text-[#64748B] font-bold mt-0.5">
                  Chọn các tiện ích có sẵn hoặc tự định nghĩa thêm tiện ích mới cho khách sạn của bạn.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAmenitiesModalOpen(false)}
                className="p-2.5 rounded-xl hover:bg-slate-200 transition-colors text-slate-400 hover:text-slate-650"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">

              {/* Section 1: Thêm tiện ích mới */}
              <div className="bg-blue-50/40 border border-blue-100 p-5 rounded-2xl space-y-3">
                <h4 className="font-black text-[#2563EB] text-[10px] uppercase tracking-wider">
                  Tự thêm tiện ích mới vào hệ thống
                </h4>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    placeholder="Tên tiện ích... (VD: Sân golf, Lò nướng...)"
                    value={customAmenityName}
                    onChange={(e) => setCustomAmenityName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddCustomAmenity();
                      }
                    }}
                    className="flex-1 bg-white border border-[#CBD5E1] text-[#1E293B] px-3.5 py-2.5 rounded-xl outline-none focus:border-[#2563EB] text-[11px] font-semibold placeholder-[#94A3B8]"
                  />
                  <select
                    value={customAmenityCategory}
                    onChange={(e) => setCustomAmenityCategory(e.target.value)}
                    className="bg-white border border-[#CBD5E1] text-[#1E293B] px-3.5 py-2.5 rounded-xl outline-none focus:border-[#2563EB] text-[11px] font-semibold"
                  >
                    <option value="bathroom">Phòng tắm</option>
                    <option value="bedroom">Phòng ngủ</option>
                    <option value="outdoor">Ngoài trời</option>
                    <option value="kitchen">Nhà bếp</option>
                    <option value="room">Tiện ích trong phòng</option>
                    <option value="media">Truyền thông & Công nghệ</option>
                    <option value="internet">Internet</option>
                    <option value="parking">Chỗ đậu xe</option>
                    <option value="services">Dịch vụ & Giải trí</option>
                    <option value="security">An ninh</option>
                    <option value="general">Tổng quát</option>
                    <option value="languages">Ngôn ngữ sử dụng</option>
                  </select>
                  <button
                    type="button"
                    onClick={handleAddCustomAmenity}
                    className="bg-[#2563EB] text-white px-5 py-2.5 rounded-xl font-black text-[11px] hover:bg-[#1d4ed8] active:scale-95 transition-all whitespace-nowrap"
                  >
                    Thêm tiện ích
                  </button>
                </div>
              </div>

              {/* Section 2: Checklist phân loại */}
              <div className="space-y-4">
                <h4 className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider pb-2 border-b border-slate-100 flex justify-between items-center">
                  <span>Danh mục tiện nghi hiện có</span>
                  <span className="text-[10px] text-[#2563EB] font-black bg-blue-50 px-2.5 py-0.5 rounded-full">
                    Đã chọn: {selectedAmenities.length}
                  </span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {getGroupedSystemAmenities().map((group) => (
                    <div key={group.title} className="bg-slate-50/50 border border-slate-200/60 p-4 rounded-2xl flex flex-col gap-2.5">
                      <h5 className="font-black text-slate-700 text-[10px] uppercase border-b border-slate-200 pb-1.5 flex items-center justify-between">
                        <span>{group.title}</span>
                        <span className="text-[9px] text-[#2563EB] font-extrabold">({group.items.length})</span>
                      </h5>
                      <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                        {group.items.map((amenity) => {
                          const isChecked = selectedAmenities.includes(amenity.id);
                          return (
                            <label key={amenity.id} className="flex items-center gap-2 cursor-pointer py-0.5 text-[#334155] font-bold text-[10px] hover:text-[#2563EB] select-none">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedAmenities(prev => prev.filter(id => id !== amenity.id));
                                  } else {
                                    setSelectedAmenities(prev => [...prev, amenity.id]);
                                  }
                                }}
                                className="w-3.5 h-3.5 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]"
                              />
                              <span className="line-clamp-1" title={amenity.name}>{amenity.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex justify-end bg-slate-50 gap-2">
              <button
                type="button"
                onClick={() => setIsAmenitiesModalOpen(false)}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-5 py-2.5 rounded-xl font-bold text-[11px] transition-colors active:scale-95"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsAmenitiesModalOpen(false);
                  triggerToast('Cấu hình tiện ích hoàn tất!');
                }}
                className="bg-[#2563EB] hover:bg-[#1d4ed8] text-white px-5 py-2.5 rounded-xl font-black text-[11px] transition-colors active:scale-95 shadow-md"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RATE PLANS MANAGEMENT MODAL */}
      {selectedRoomTypeForRatePlans && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 rounded-3xl shadow-2xl w-full max-w-4xl lg:max-w-5xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
              <div>
                <h3 className="font-extrabold text-slate-800 text-base">
                  Quản lý Gói đặt phòng (Rate Plans) — {selectedRoomTypeForRatePlans.name}
                </h3>
                <p className="text-[11px] text-slate-400 font-semibold">Thiết lập các gói giá, chính sách thanh toán & hủy phòng linh hoạt</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomTypeForRatePlans(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-full hover:bg-slate-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-slate-700 uppercase">Danh sách Rate Plan hiện có</span>
                <button
                  type="button"
                  onClick={() => {
                    if (showAddRatePlanForm) {
                      setShowAddRatePlanForm(false);
                      setEditingRatePlan(null);
                    } else {
                      setEditingRatePlan(null);
                      setNewRatePlan({
                        name: '',
                        description: '',
                        priceModifierType: 'FIXED_PRICE',
                        priceModifierValue: 0,
                        paymentPolicy: 'PAY_AT_HOTEL',
                        cancellationPolicy: 'FREE_CANCEL',
                        freeCancelDaysBefore: 1,
                        freeCancelHoursBefore: 24,
                        cancellationFeeType: 'FIRST_NIGHT',
                        noShowPolicy: 'PERCENT_100'
                      });
                      setShowAddRatePlanForm(true);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4" /> {showAddRatePlanForm ? 'Đóng form' : 'Thêm Gói Mới'}
                </button>
              </div>

              {/* Form thêm / sửa Rate Plan */}
              {showAddRatePlanForm && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                      let res;
                      if (editingRatePlan) {
                        res = await apiClient.put(`/rate-plans/${editingRatePlan.id}`, newRatePlan);
                      } else {
                        res = await apiClient.post('/rate-plans', {
                          roomTypeId: selectedRoomTypeForRatePlans.id,
                          ...newRatePlan
                        });
                      }
                      if (res.data.success) {
                        triggerToast(editingRatePlan ? 'Cập nhật gói thành công!' : 'Tạo gói đặt phòng mới thành công!');
                        setShowAddRatePlanForm(false);
                        setEditingRatePlan(null);
                        const refresh = await apiClient.get(`/rate-plans/room-type/${selectedRoomTypeForRatePlans.id}`);
                        setRatePlansList(refresh.data.data);
                      }
                    } catch (err: any) {
                      await showAlert(err.response?.data?.message || 'Thao tác thất bại', { type: 'error' });
                    }
                  }}
                  className="bg-blue-50/50 border border-blue-100 p-4 rounded-2xl space-y-4 animate-in slide-in-from-top-2 duration-150"
                >
                  <h4 className="font-extrabold text-xs text-blue-900 uppercase">
                    {editingRatePlan ? `Chỉnh sửa gói: ${editingRatePlan.name}` : 'Tạo gói đặt phòng mới'}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-bold">
                    <div>
                      <label className="text-slate-600 block mb-1">Tên gói (Ví dụ: Early Bird / Flexible / Flash Sale)</label>
                      <input
                        type="text"
                        required
                        value={newRatePlan.name}
                        onChange={(e) => setNewRatePlan({ ...newRatePlan, name: e.target.value })}
                        placeholder="Tên gói..."
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-slate-600 block mb-1">Loại điều chỉnh giá</label>
                      <select
                        value={newRatePlan.priceModifierType}
                        onChange={(e) => setNewRatePlan({ ...newRatePlan, priceModifierType: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-800"
                      >
                        <option value="FIXED_PRICE">Giá cố định = BasePrice</option>
                        <option value="PERCENTAGE_DISCOUNT">Giảm theo % (%)</option>
                        <option value="AMOUNT_DISCOUNT">Giảm theo số tiền cụ thể (VNĐ)</option>
                      </select>
                    </div>

                    {newRatePlan.priceModifierType !== 'FIXED_PRICE' && (
                      <div>
                        <label className="text-slate-600 block mb-1">Mức giảm ({newRatePlan.priceModifierType === 'PERCENTAGE_DISCOUNT' ? '%' : 'VNĐ'})</label>
                        <input
                          type="number"
                          required
                          value={newRatePlan.priceModifierValue}
                          onChange={(e) => setNewRatePlan({ ...newRatePlan, priceModifierValue: Number(e.target.value) })}
                          className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-800"
                        />
                      </div>
                    )}

                    <div>
                      <label className="text-slate-600 block mb-1">Chính sách thanh toán</label>
                      <select
                        value={newRatePlan.paymentPolicy}
                        onChange={(e) => setNewRatePlan({ ...newRatePlan, paymentPolicy: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-800"
                      >
                        <option value="PAY_AT_HOTEL">Thanh toán tại khách sạn</option>
                        <option value="PAY_ONLINE">Thanh toán online 100% khi đặt</option>
                        <option value="DEPOSIT">Đặt cọc trước (ví dụ 30%)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-slate-600 block mb-1">Chính sách hủy phòng</label>
                      <select
                        value={newRatePlan.cancellationPolicy}
                        onChange={(e) => setNewRatePlan({ ...newRatePlan, cancellationPolicy: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-lg p-2 font-bold text-slate-800"
                      >
                        <option value="FREE_CANCEL">Miễn phí hủy trước thời hạn</option>
                        <option value="NON_REFUNDABLE">Không hoàn tiền nếu hủy (Non-refundable)</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    {editingRatePlan && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddRatePlanForm(false);
                          setEditingRatePlan(null);
                        }}
                        className="bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2 rounded-xl hover:bg-slate-300 transition-all"
                      >
                        Hủy
                      </button>
                    )}
                    <button
                      type="submit"
                      className="bg-blue-600 text-white font-black text-xs px-5 py-2 rounded-xl shadow-md hover:bg-blue-700 transition-all"
                    >
                      {editingRatePlan ? 'Lưu cập nhật gói' : 'Lưu Rate Plan Mới'}
                    </button>
                  </div>
                </form>
              )}

              {/* Danh sách Rate Plans */}
              {loadingRatePlans ? (
                <p className="text-center text-xs text-slate-400 font-bold py-6">Đang tải các gói đặt phòng...</p>
              ) : ratePlansList.length === 0 ? (
                <p className="text-center text-xs text-slate-400 font-bold py-6">Chưa có gói nào. Nhấn "Thêm Gói Mới" ở trên.</p>
              ) : (
                <div className="space-y-3">
                  {ratePlansList.map((plan) => (
                    <div key={plan.id} className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex items-center justify-between gap-4 hover:border-blue-300 transition-colors">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h5 className="font-extrabold text-sm text-slate-800">{plan.name}</h5>
                          <span className="text-[10px] font-black text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">
                            {plan.priceModifierType === 'PERCENTAGE_DISCOUNT' ? `Giảm ${plan.priceModifierValue}%` : plan.priceModifierType === 'AMOUNT_DISCOUNT' ? `Giảm ${formatNumberDots(plan.priceModifierValue)} đ` : 'Giá chuẩn'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 font-semibold">{plan.description || 'Chính sách tiêu chuẩn.'}</p>
                        <div className="flex items-center gap-4 text-[11px] font-bold text-slate-600 pt-1">
                          <span className="flex items-center gap-1"><CreditCard className="w-3.5 h-3.5 text-emerald-600" /> {plan.paymentPolicy === 'PAY_ONLINE' ? 'Thanh toán Online' : 'Trả tại khách sạn'}</span>
                          <span className="flex items-center gap-1"><ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> {plan.cancellationPolicy === 'NON_REFUNDABLE' ? 'Không hoàn tiền' : `Miễn phí hủy trước ${plan.freeCancelHoursBefore || 24}h`}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRatePlan(plan);
                            setNewRatePlan({
                              name: plan.name || '',
                              description: plan.description || '',
                              priceModifierType: plan.priceModifierType || 'FIXED_PRICE',
                              priceModifierValue: Number(plan.priceModifierValue || 0),
                              paymentPolicy: plan.paymentPolicy || 'PAY_AT_HOTEL',
                              cancellationPolicy: plan.cancellationPolicy || 'FREE_CANCEL',
                              freeCancelDaysBefore: plan.freeCancelDaysBefore || 1,
                              freeCancelHoursBefore: plan.freeCancelHoursBefore || 24,
                              cancellationFeeType: plan.cancellationFeeType || 'FIRST_NIGHT',
                              noShowPolicy: plan.noShowPolicy || 'PERCENT_100'
                            });
                            setShowAddRatePlanForm(true);
                          }}
                          className="text-[#0194f3] hover:text-blue-700 p-2 hover:bg-blue-50 rounded-xl transition-all"
                          title="Chỉnh sửa gói"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={async () => {
                            const confirmed = await showConfirm(`Bạn có chắc chắn muốn xóa gói "${plan.name}"?`, { title: 'Xác nhận xóa gói đặt phòng', type: 'danger' });
                            if (!confirmed) return;
                            try {
                              const res = await apiClient.delete(`/rate-plans/${plan.id}`);
                              if (res.data.success) {
                                triggerToast('Xóa gói đặt phòng thành công!');
                                const refresh = await apiClient.get(`/rate-plans/room-type/${selectedRoomTypeForRatePlans.id}`);
                                setRatePlansList(refresh.data.data);
                              }
                            } catch (err: any) {
                              await showAlert(err.response?.data?.message || 'Xóa gói thất bại', { type: 'error' });
                            }
                          }}
                          className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-xl transition-all"
                          title="Xóa gói"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal Quản lý Số phòng Thực tế (Room Numbers Management) */}
      {managingRoomTypeForNumbers && (
        <div className="fixed inset-0 z-55 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-base flex items-center gap-2">
                  <Hotel className="w-5 h-5 text-blue-600" /> Quản Lý Số Phòng Thực Tế
                </h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Hạng phòng: <strong className="text-blue-600">{managingRoomTypeForNumbers.name}</strong> ({inputRoomNumbersList.length} phòng)
                </p>
              </div>
              <button
                onClick={() => setManagingRoomTypeForNumbers(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5 text-xs">
              {/* Sinh tự động số phòng */}
              <div className="bg-blue-50/60 border border-blue-200 p-4 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-extrabold text-blue-900 text-xs flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-500" /> Sinh danh sách số phòng tự động</span>
                </div>

                {/* Chọn chế độ: Chỉ 1 tầng VS Nhiều tầng */}
                <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setAutoGenMode('SINGLE_FLOOR')}
                    className={`flex-1 py-1.5 px-2 font-extrabold text-[11px] rounded-lg transition-all ${autoGenMode === 'SINGLE_FLOOR'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    Chỉ Tầng {autoTargetFloor} ({autoTargetFloor}01, {autoTargetFloor}02...)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAutoGenMode('MULTI_FLOOR')}
                    className={`flex-1 py-1.5 px-2 font-extrabold text-[11px] rounded-lg transition-all ${autoGenMode === 'MULTI_FLOOR'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100'
                      }`}
                  >
                    Hàng loạt (Tầng 1 ➔ {autoTargetFloor})
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                      {autoGenMode === 'SINGLE_FLOOR' ? 'Chọn Tầng số' : 'Đến Tầng số'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={autoTargetFloor}
                      onChange={(e) => setAutoTargetFloor(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">Số phòng / tầng</label>
                    <input
                      type="number"
                      min={1}
                      max={50}
                      value={autoRoomsPerFloor}
                      onChange={(e) => setAutoRoomsPerFloor(Math.max(1, Number(e.target.value)))}
                      className="w-full bg-white border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const generated: string[] = [];
                    if (autoGenMode === 'SINGLE_FLOOR') {
                      for (let r = 1; r <= autoRoomsPerFloor; r++) {
                        generated.push(`${autoTargetFloor}${r.toString().padStart(2, '0')}`);
                      }
                    } else {
                      for (let f = 1; f <= autoTargetFloor; f++) {
                        for (let r = 1; r <= autoRoomsPerFloor; r++) {
                          generated.push(`${f}${r.toString().padStart(2, '0')}`);
                        }
                      }
                    }
                    const merged = Array.from(new Set([...inputRoomNumbersList, ...generated]));
                    setInputRoomNumbersList(merged);
                    triggerToast(
                      autoGenMode === 'SINGLE_FLOOR'
                        ? `Đã thêm ${generated.length} phòng của Tầng ${autoTargetFloor}!`
                        : `Đã thêm ${generated.length} phòng (Tầng 1 -> ${autoTargetFloor})!`
                    );
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold py-2 rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  <span>+ Sinh phòng & Thêm vào danh sách</span>
                </button>
              </div>

              {/* Thêm thủ công 1 số phòng */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-600 uppercase">Thêm số phòng thủ công</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="VD: 301, Villa 01, Bungalow A"
                    value={newSingleRoomInput}
                    onChange={(e) => setNewSingleRoomInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const trimmed = newSingleRoomInput.trim();
                        if (trimmed && !inputRoomNumbersList.includes(trimmed)) {
                          setInputRoomNumbersList((prev) => [...prev, trimmed]);
                          setNewSingleRoomInput('');
                        }
                      }
                    }}
                    className="flex-1 bg-white border border-slate-200 p-2.5 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const trimmed = newSingleRoomInput.trim();
                      if (trimmed && !inputRoomNumbersList.includes(trimmed)) {
                        setInputRoomNumbersList((prev) => [...prev, trimmed]);
                        setNewSingleRoomInput('');
                      }
                    }}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-extrabold px-4 py-2.5 rounded-xl text-xs transition-all"
                  >
                    + Thêm
                  </button>
                </div>
              </div>

              {/* Danh sách phòng dạng thẻ badge */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                  <span>Danh sách số phòng hiện tại ({inputRoomNumbersList.length}):</span>
                  {inputRoomNumbersList.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setInputRoomNumbersList([])}
                      className="text-rose-600 font-semibold hover:underline text-[11px]"
                    >
                      Xóa tất cả
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  {inputRoomNumbersList.length === 0 ? (
                    <p className="text-slate-400 font-semibold text-xs py-2 w-full text-center">Chưa có số phòng nào. Vui lòng sinh tự động hoặc thêm ở trên.</p>
                  ) : (
                    inputRoomNumbersList.map((num) => (
                      <span
                        key={num}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-slate-800 font-extrabold shadow-2xs group hover:border-rose-300"
                      >
                        P.{num}
                        <button
                          type="button"
                          onClick={() => setInputRoomNumbersList((prev) => prev.filter((n) => n !== num))}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded-full"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setManagingRoomTypeForNumbers(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={savingRoomNumbers}
                  onClick={async () => {
                    if (inputRoomNumbersList.length === 0) {
                      await showAlert('Vui lòng nhập ít nhất 1 số phòng.', { type: 'warning' });
                      return;
                    }
                    setSavingRoomNumbers(true);
                    try {
                      const res = await apiClient.put(`/hotels/room-types/${managingRoomTypeForNumbers.id}/rooms`, {
                        roomNumbers: inputRoomNumbersList,
                      });
                      if (res.data.success) {
                        triggerToast('Lưu danh sách số phòng thành công!');
                        setManagingRoomTypeForNumbers(null);
                        if (hotelId) handleSelectHotel(hotelId);
                      }
                    } catch (err: any) {
                      console.error(err);
                      await showAlert(err.response?.data?.message || 'Lỗi khi lưu danh sách số phòng', { type: 'error' });
                    } finally {
                      setSavingRoomNumbers(false);
                    }
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-6 py-2.5 rounded-xl shadow-md transition-all disabled:opacity-50"
                >
                  {savingRoomNumbers ? 'Đang lưu...' : 'Lưu Danh Sách Số Phòng'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default OwnerDashboard;
