import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setSearchCriteria, getLocalDateString } from '../store/slices/searchSlice';
import type { RootState } from '../store';
import apiClient from '../core/api/client';
import { formatDateVN, formatFullDateVN } from '../utils/date';
import { useModal } from '../components/common/ModalContext';
import { socket } from '../core/socket/socket';
import { VIETNAM_PROVINCES, type ProvinceItem } from '../core/constants/provinces';
import {
  MapPin,
  Waves,
  Wifi,
  ParkingCircle,
  Dumbbell,
  Sparkles,
  Utensils,
  GlassWater,
  User,
  Users,
  Building2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar as CalendarIcon,
  Compass,
  MoreHorizontal,
  Bath,
  Bed,
  Trees,
  ShieldCheck,
  Tv,
  Globe,
  LogIn,
  LogOut,
  Info,
  Baby,
  Ban,
  Moon,
  Clock,
  Ruler,
  Flame,
  Footprints,
  Check,
  ThumbsUp
} from 'lucide-react';
import { formatPrice } from '../utils/price';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

const RoomDetailsModal = ({
  room,
  onClose,
  language,
  currency,
  onBook,
  translateAmenityName,
}: {
  room: RoomTypeDetail;
  onClose: () => void;
  language: string;
  currency: string;
  onBook: (roomTypeId: string) => void;
  translateAmenityName: (name: string) => string;
}) => {
  const [activeImgIdx, setActiveImgIdx] = useState(0);
  const images = room.images && room.images.length > 0
    ? room.images
    : [{ url: 'https://images.unsplash.com/photo-1611891405788-d880227f73b4' }];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIdx(prev => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveImgIdx(prev => (prev + 1) % images.length);
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-6 transition-all duration-300">
      {/* Backdrop click close */}
      <div className="absolute inset-0 z-0" onClick={onClose} />

      <div className="bg-white rounded-t-2xl md:rounded-3xl overflow-hidden shadow-2xl w-full max-w-[1150px] lg:max-w-[1250px] h-[100vh] md:h-[90vh] flex flex-col relative z-10 animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-650 hover:bg-slate-100 p-2 rounded-full transition-all z-20 shadow-sm"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center shrink-0 pr-16 bg-white">
          <h2 className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight leading-tight">{room.name}</h2>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto flex flex-col md:flex-row min-h-0 bg-slate-900 md:bg-white">
          {/* Left Column: Image Slider */}
          <div className="w-full md:w-[60%] bg-slate-950 flex flex-col p-4 justify-between gap-3 select-none min-h-[350px] md:h-full">
            {/* Main Image Slider */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden rounded-xl bg-slate-900 group">
              <img
                src={images[activeImgIdx]?.url}
                alt={`${room.name} view ${activeImgIdx + 1}`}
                className="w-full h-full object-cover transition-all duration-300 max-h-[400px] md:max-h-[500px]"
              />

              {/* Slider Prev/Next (Visible on Hover) */}
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={handlePrev}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 bg-white text-slate-800 hover:bg-slate-100 p-2 rounded-full shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-95 flex items-center justify-center"
                  >
                    <ChevronLeft className="w-4 h-4 text-slate-800" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNext}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 bg-white text-slate-800 hover:bg-slate-100 p-2 rounded-full shadow-lg z-10 opacity-0 group-hover:opacity-100 transition-all duration-200 active:scale-95 flex items-center justify-center"
                  >
                    <ChevronRight className="w-4 h-4 text-slate-800" />
                  </button>
                </>
              )}
            </div>

            {/* Photo description & Index indicator */}
            <div className="flex justify-between items-center text-slate-300 text-xs font-bold px-1 py-1 shrink-0">
              <span>{language === 'vi' ? 'Ảnh phòng' : 'Bedroom'}</span>
              <span>{activeImgIdx + 1}/{images.length}</span>
            </div>

            {/* Thumbnail Navigation */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto py-1 scrollbar-thin shrink-0 select-none">
                {images.map((img, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setActiveImgIdx(i)}
                    className={`h-[48px] w-[72px] rounded-md overflow-hidden shrink-0 transition-all border-2 ${i === activeImgIdx ? 'border-blue-500 scale-102 shadow-md' : 'border-transparent opacity-60 hover:opacity-100'
                      }`}
                  >
                    <img src={img.url} alt={`thumb ${i}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Room Specs and Pricing */}
          <div className="w-full md:w-[40%] bg-white p-6 overflow-y-auto flex flex-col justify-between gap-6 md:h-full">
            <div className="space-y-6">
              {/* Specs block */}
              <div className="space-y-3 pb-5 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-sm">{language === 'vi' ? 'Thông tin phòng' : 'Room info'}</h3>
                <div className="space-y-2 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Ruler className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{language === 'vi' ? 'Diện tích:' : 'Size:'} {room.size || 25} m²</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Bed className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{room.bedCount} {room.bedType || (language === 'vi' ? 'giường đôi' : 'large beds')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{room.capacity} {language === 'vi' ? 'khách' : 'guests'}</span>
                  </div>
                </div>
              </div>

              {/* Loved Features */}
              <div className="space-y-3 pb-5 border-b border-slate-100">
                <h3 className="font-extrabold text-slate-900 text-sm">{language === 'vi' ? 'Tính năng phòng bạn thích' : 'Features you like'}</h3>
                <div className="space-y-2 text-xs font-bold text-slate-700">
                  <div className="flex items-center gap-2">
                    <Bath className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{language === 'vi' ? 'Vòi tắm đứng' : 'Standing shower'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-slate-400 shrink-0" />
                    <span>{language === 'vi' ? 'Nước nóng' : 'Hot water'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Wifi className="w-4 h-4 text-[#006ce4]" />
                    <span>{language === 'vi' ? 'WiFi miễn phí' : 'Free WiFi'}</span>
                  </div>
                </div>
              </div>

              {/* Full Amenities list */}
              <div className="space-y-3">
                <h3 className="font-extrabold text-slate-900 text-sm">{language === 'vi' ? 'Tiện nghi phòng' : 'Room amenities'}</h3>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs font-bold text-slate-600 list-inside">
                  {room.amenities && room.amenities.map((a) => (
                    <li key={a} className="truncate">
                      • {translateAmenityName(a)}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Price tag & Call to action */}
            <div className="pt-5 border-t border-slate-100 flex flex-col gap-3 shrink-0">
              <div className="text-slate-500 font-bold text-xs">
                {language === 'vi' ? 'Khởi điểm từ:' : 'Starting from:'}
                <div className="flex items-baseline gap-1 mt-1 flex-wrap">
                  <span className="text-xl md:text-2xl font-black text-[#ff4d42]">
                    {formatPrice(room.calculatedPrice, currency)}
                  </span>
                  <span className="text-xs text-slate-400 font-bold">
                    / {language === 'vi' ? 'Phòng / đêm' : 'Room / night'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onBook(room.id);
                  onClose();
                }}
                disabled={room.isBlocked || room.availableRooms <= 0}
                className="w-full bg-[#006ce4] hover:bg-[#0056b3] disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-sm py-3 rounded-lg transition-all active:scale-[0.98] shadow-md text-center"
              >
                {language === 'vi' ? 'Thêm lựa chọn phòng' : 'Select room'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface RoomTypeDetail {
  id: string;
  name: string;
  description: string;
  basePrice: number;
  calculatedPrice: number;
  capacity: number;
  bedCount: number;
  bedType?: string | null;
  size: number | null;
  amenities: string[];
  images: { url: string }[];
  availableRooms: number;
  isBlocked: boolean;
  includeBreakfast?: boolean;
  childSurcharge?: number;
  paymentPolicy?: string;
  cancellationPolicy?: string;
  ratePlans?: any[];
}

interface ReviewDetail {
  id: string;
  ratingCleanliness: number;
  ratingLocation: number;
  ratingService: number;
  ratingFacilities: number;
  ratingValue: number;
  ratingOverall: number;
  comment: string;
  ownerReply?: string | null;
  ownerRepliedAt?: string | null;
  likesCount?: number;
  createdAt: string;
  user: { fullName: string; avatarUrl: string | null };
}

interface HotelDetailData {
  id: string;
  name: string;
  description: string;
  address: string;
  starRating: number;
  images: { url: string }[];
  category: { name: string };
  province: { name: string };
  district: { name: string };
  ward: { name: string };
  amenities: { amenity: { name: string; icon: string } }[];
  roomTypes: RoomTypeDetail[];
  reviews: ReviewDetail[];
  averageRating: number;
  latitude: number | null;
  longitude: number | null;
  nearbyLocations?: { name: string; distance: string; type: string }[];
  checkInTime?: string;
  checkOutTime?: string;
}

const detailTranslations = {
  vi: {
    loadingText: 'Đang tải thông tin...',
    notFound: 'Không tìm thấy thông tin khách sạn.',
    stars: 'Sao',
    about: 'Giới thiệu chỗ nghỉ',
    amenities: 'Tiện nghi có sẵn',
    selectDates: 'Chọn ngày đi & đặt phòng',
    checkInLabel: 'Ngày nhận phòng',
    checkOutLabel: 'Ngày trả phòng',
    updateBtn: 'Cập nhật giá và phòng trống',
    roomTypes: 'Các loại phòng khả dụng',
    colDesc: 'Mô tả phòng',
    colCapacity: 'Sức chứa',
    colPrice: 'Giá mỗi đêm (Trung bình)',
    colStatus: 'Tình trạng',
    guestsCount: 'Khách',
    bedsCount: 'giường',
    notSupported: 'Không hỗ trợ',
    roomClosed: 'Đã đóng phòng',
    roomsAvailable: (n: number) => `Còn ${n} phòng trống`,
    noRoomsAvailable: 'Hết phòng trống',
    bookNow: 'Đặt ngay',
    reviewsTitle: 'Đánh giá từ khách hàng',
    noReviews: 'Chưa có đánh giá nào cho khách sạn này.',
    avgScore: 'Điểm trung bình',
    reviewsCount: (n: number) => `Dựa trên ${n} đánh giá khách quan`,
    cleanliness: 'Sạch sẽ',
    location: 'Vị trí',
    service: 'Dịch vụ',
    facilities: 'Tiện nghi',
    valueRating: 'Giá trị',
    bedroomFallback: 'Hình ảnh phòng ngủ',
    contact: 'Liên hệ',
  },
  en: {
    loadingText: 'Loading details...',
    notFound: 'Hotel details not found.',
    stars: 'Stars',
    about: 'About the Property',
    amenities: 'Available Amenities',
    selectDates: 'Select dates & book room',
    checkInLabel: 'Check-in date',
    checkOutLabel: 'Check-out date',
    updateBtn: 'Update prices & availability',
    roomTypes: 'Available Room Types',
    colDesc: 'Room description',
    colCapacity: 'Capacity',
    colPrice: 'Price per night (Avg)',
    colStatus: 'Status',
    guestsCount: 'Guests',
    bedsCount: 'beds',
    notSupported: 'Not supported',
    roomClosed: 'Room closed',
    roomsAvailable: (n: number) => `${n} rooms available`,
    noRoomsAvailable: 'No rooms available',
    bookNow: 'Book Now',
    reviewsTitle: 'Customer Reviews',
    noReviews: 'No reviews yet for this hotel.',
    avgScore: 'Average score',
    reviewsCount: (n: number) => `Based on ${n} objective reviews`,
    cleanliness: 'Cleanliness',
    location: 'Location',
    service: 'Service',
    facilities: 'Facilities',
    valueRating: 'Value',
    bedroomFallback: 'Bedroom image',
    contact: 'Contact Us',
  }
};

const removeVietnameseTones = (str: string) => {
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, "a");
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, "e");
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, "i");
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, "o");
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, "u");
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, "y");
  str = str.replace(/đ/g, "d");
  str = str.replace(/À|Á|Ạ|Ả|Ã|Â|Ầ|Ấ|Ậ|Ẩ|Ẫ|Ă|Ằ|Ắ|Ặ|Ẳ|Ẵ/g, "A");
  str = str.replace(/È|É|Ẹ|Ẻ|Ẽ|Ê|Ề|Ế|Ệ|Ể|Ễ/g, "E");
  str = str.replace(/Ì|Í|Ị|Ỉ|Ĩ/g, "I");
  str = str.replace(/Ò|Ó|Ọ|Ỏ|Õ|Ô|Ồ|Ố|Ộ|Ổ|Ỗ|Ơ|Ờ|Ớ|Ợ|Ở|Ỡ/g, "O");
  str = str.replace(/Ù|Ú|Ụ|Ủ|Ũ|Ư|Ừ|Ứ|Ự|Ử|Ữ/g, "U");
  str = str.replace(/Ỳ|Ý|Ỵ|Ỷ|Ỹ/g, "Y");
  str = str.replace(/Đ/g, "D");
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, "");
  str = str.replace(/\u02C6|\u0306|\u031B/g, "");
  return str;
};



const translateAddress = (address: string, district: string, province: string, lang: string) => {
  if (lang === 'vi') {
    const parts = [address, district, province].filter(Boolean);
    return parts.join(', ');
  }

  const translateValue = (val: string) => {
    if (!val) return '';
    let res = val;

    res = res.replace(/^Quận\s+(\d+)/i, 'District $1');
    res = res.replace(/^Phường\s+(\d+)/i, 'Ward $1');

    res = res.replace(/^Quận\s+(.+)/i, (_, p1) => {
      if (/^\d+/.test(p1.trim())) return `District ${p1.trim()}`;
      return `${removeVietnameseTones(p1.trim())} District`;
    });

    res = res.replace(/^Phường\s+(.+)/i, (_, p1) => {
      if (/^\d+/.test(p1.trim())) return `Ward ${p1.trim()}`;
      return `${removeVietnameseTones(p1.trim())} Ward`;
    });

    res = res.replace(/^Đường\s+(.+)/i, (_, p1) => {
      return `${removeVietnameseTones(p1.trim())} Street`;
    });

    res = res.replace(/^Thị xã\s+(.+)/i, (_, p1) => `${removeVietnameseTones(p1.trim())} Town`);
    res = res.replace(/^Huyện\s+(.+)/i, (_, p1) => `${removeVietnameseTones(p1.trim())} District`);
    res = res.replace(/^Xã\s+(.+)/i, (_, p1) => `${removeVietnameseTones(p1.trim())} Commune`);

    const cleanProvince = res.replace(/^Thành phố\s+/i, '').replace(/^Tỉnh\s+/i, '').trim();
    if (cleanProvince.includes('Hồ Chí Minh') || cleanProvince.toLowerCase().includes('hcm') || cleanProvince.toLowerCase().includes('ho chi minh')) {
      return 'Ho Chi Minh City';
    }
    if (cleanProvince.includes('Đà Lạt') || cleanProvince.toLowerCase().includes('da lat')) {
      return 'Da Lat';
    }
    if (cleanProvince.includes('Đà Nẵng') || cleanProvince.toLowerCase().includes('da nang')) {
      return 'Da Nang';
    }
    if (cleanProvince.includes('Nha Trang') || cleanProvince.toLowerCase().includes('nha trang') || cleanProvince.includes('Khánh Hòa')) {
      return 'Nha Trang, Khanh Hoa';
    }
    if (cleanProvince.includes('Hà Nội') || cleanProvince.toLowerCase().includes('ha noi') || cleanProvince.toLowerCase().includes('hanoi')) {
      return 'Hanoi';
    }
    if (cleanProvince.includes('Vũng Tàu') || cleanProvince.toLowerCase().includes('vung tau') || cleanProvince.toLowerCase().includes('ba ria')) {
      return 'Vung Tau';
    }
    if (cleanProvince.includes('Lâm Đồng')) {
      return 'Lam Dong';
    }
    if (cleanProvince.includes('Kiên Giang') || cleanProvince.toLowerCase().includes('phu quoc')) {
      return 'Phu Quoc, Kien Giang';
    }

    return removeVietnameseTones(res);
  };

  const cleanAddr = translateValue(address);
  const cleanDist = translateValue(district);
  const cleanProv = translateValue(province);

  const parts = [cleanAddr, cleanDist, cleanProv].filter(Boolean);

  const uniqueParts: string[] = [];
  parts.forEach(p => {
    if (!uniqueParts.some(up => up.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(up.toLowerCase()))) {
      uniqueParts.push(p);
    } else {
      const index = uniqueParts.findIndex(up => up.toLowerCase().includes(p.toLowerCase()) || p.toLowerCase().includes(up.toLowerCase()));
      if (p.length > uniqueParts[index].length) {
        uniqueParts[index] = p;
      }
    }
  });

  return uniqueParts.join(', ');
};



const translateProvinceName = (name: string, lang: string) => {
  if (!name) return '';
  if (lang === 'vi') return name;
  const lower = name.toLowerCase().trim();
  if (lower.includes('hồ chí minh') || lower.includes('hcm') || lower.includes('sai gon')) return 'Ho Chi Minh City';
  if (lower.includes('đà nẵng') || lower.includes('da nang')) return 'Da Nang';
  if (lower.includes('nha trang')) return 'Nha Trang';
  if (lower.includes('đà lạt') || lower.includes('da lat')) return 'Da Lat';
  if (lower.includes('vũng tàu') || lower.includes('vung tau')) return 'Vung Tau';
  return removeVietnameseTones(name);
};

const normalizeRating = (rating: number) => {
  if (!rating) return 0;
  return rating <= 5 ? rating * 2 : rating;
};

const getRatingLabel = (score: number, lang: string) => {
  if (score >= 9.0) return lang === 'vi' ? 'Tuyệt hảo' : 'Exceptional';
  if (score >= 8.0) return lang === 'vi' ? 'Rất tốt' : 'Very Good';
  if (score >= 7.0) return lang === 'vi' ? 'Tốt' : 'Good';
  if (score >= 5.0) return lang === 'vi' ? 'Chấp nhận được' : 'Pleasant';
  return lang === 'vi' ? 'Điểm kém' : 'Disappointing';
};


interface LeafletMapProps {
  lat: number;
  lng: number;
  hotelName: string;
  queryPlace?: string;
  nearbyLocations?: { name: string; distance: string; type: string }[];
}

const LeafletMap: React.FC<LeafletMapProps> = ({ lat, lng, hotelName, queryPlace, nearbyLocations }) => {
  const mapContainerRef = React.useRef<HTMLDivElement>(null);
  const mapRef = React.useRef<L.Map | null>(null);
  const markerGroupRef = React.useRef<L.LayerGroup | null>(null);

  React.useEffect(() => {
    if (!mapContainerRef.current) return;

    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    });

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        scrollWheelZoom: true,
        zoomControl: true,
      }).setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(mapRef.current);

      markerGroupRef.current = L.layerGroup().addTo(mapRef.current);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerGroupRef.current = null;
      }
    };
  }, [lat, lng]);

  React.useEffect(() => {
    const map = mapRef.current;
    const markerGroup = markerGroupRef.current;
    if (!map || !markerGroup) return;

    markerGroup.clearLayers();

    const hotelIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });

    const hotelMarker = L.marker([lat, lng], { icon: hotelIcon })
      .bindPopup(`<b>${hotelName}</b><br/>Địa điểm khách sạn`)
      .addTo(markerGroup);

    if (queryPlace && queryPlace !== hotelName) {
      const matchedLoc = nearbyLocations?.find(
        (loc) => loc.name === queryPlace.split(' ')[0] || queryPlace.includes(loc.name)
      );

      const attractionIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      let angle = Math.random() * Math.PI * 2;
      let distanceMultiplier = 0.005;
      if (matchedLoc) {
        const distNum = parseFloat(matchedLoc.distance);
        if (matchedLoc.distance.includes('m')) {
          distanceMultiplier = (distNum / 1000) * 0.009;
        } else {
          distanceMultiplier = distNum * 0.009;
        }
      }

      const targetLat = lat + Math.sin(angle) * distanceMultiplier;
      const targetLng = lng + Math.cos(angle) * distanceMultiplier;

      const marker = L.marker([targetLat, targetLng], { icon: attractionIcon })
        .bindPopup(`<b>${queryPlace}</b><br/>Địa điểm lân cận`)
        .addTo(markerGroup);

      marker.openPopup();

      const group = L.featureGroup([hotelMarker, marker]);
      map.fitBounds(group.getBounds().pad(0.2));
    } else {
      hotelMarker.openPopup();
      map.setView([lat, lng], 15);
    }
  }, [lat, lng, queryPlace, hotelName, nearbyLocations]);

  return <div ref={mapContainerRef} className="w-full h-full z-0" />;
};

export const HotelDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const searchCriteria = useSelector((state: RootState) => state.search);
  const { language, currency } = useSelector((state: RootState) => state.settings);
  const t = detailTranslations[language];
  const { showAlert } = useModal();

  const [hotel, setHotel] = useState<HotelDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [priceShowOption, setPriceShowOption] = useState<string>('per_night_excl');
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
  const [activeImageIndices, setActiveImageIndices] = useState<Record<string, number>>({});
  const [selectedRoomForModal, setSelectedRoomForModal] = useState<RoomTypeDetail | null>(null);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);
  const [galleryActiveIndex, setGalleryActiveIndex] = useState(0);

  useEffect(() => {
    if (!isGalleryModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsGalleryModalOpen(false);
      if (e.key === 'ArrowLeft') {
        setGalleryActiveIndex(prev => (prev === 0 ? (hotel?.images.length || 1) - 1 : prev - 1));
      }
      if (e.key === 'ArrowRight') {
        setGalleryActiveIndex(prev => (prev + 1) % (hotel?.images.length || 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGalleryModalOpen, hotel]);

  const [activeTab, setActiveTab] = useState('overview-section');

  const tabs = [
    { id: 'overview-section', label: language === 'vi' ? 'Tổng quan' : 'Overview' },
    { id: 'rooms-section', label: language === 'vi' ? 'Phòng' : 'Rooms' },
    { id: 'location-section', label: language === 'vi' ? 'Vị trí' : 'Location' },
    { id: 'facilities-section', label: language === 'vi' ? 'Tiện ích' : 'Amenities' },
    { id: 'policies-section', label: language === 'vi' ? 'Chính sách' : 'Policies' },
    { id: 'reviews-section', label: language === 'vi' ? 'Đánh giá' : 'Reviews' },
  ];

  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (isScrollingRef.current) return;
      const scrollPosition = window.scrollY + 120; // offset

      for (const tab of tabs) {
        const el = document.getElementById(tab.id);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveTab(tab.id);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [language]);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      isScrollingRef.current = true;
      setActiveTab(id);

      if (scrollTimeoutRef.current) {
        window.clearTimeout(scrollTimeoutRef.current);
      }

      const yOffset = -70; // offset for the sticky sub-nav bar itself (which is 48px high)
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });

      // Re-enable scroll listener after smooth scroll finishes
      scrollTimeoutRef.current = window.setTimeout(() => {
        isScrollingRef.current = false;
      }, 800);
    }
  };

  const auth = useSelector((state: RootState) => state.auth);
  const isLoggedIn = !!auth.user;

  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [ratingCleanliness, setRatingCleanliness] = useState(10);
  const [ratingLocation, setRatingLocation] = useState(10);
  const [ratingService, setRatingService] = useState(10);
  const [ratingFacilities, setRatingFacilities] = useState(10);
  const [ratingValue, setRatingValue] = useState(10);
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewError, setReviewError] = useState('');

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewComment.trim()) {
      setReviewError(language === 'vi' ? 'Nhận xét không được để trống.' : 'Comment cannot be empty.');
      return;
    }

    setSubmittingReview(true);
    setReviewError('');

    try {
      const res = await apiClient.post(`/hotels/${id}/reviews`, {
        ratingCleanliness,
        ratingLocation,
        ratingService,
        ratingFacilities,
        ratingValue,
        comment: reviewComment,
      });

      if (res.data.success) {
        const newReview = res.data.data;
        setHotel((prev) => {
          if (!prev) return null;
          const updatedReviews = [newReview, ...prev.reviews];
          const sum = updatedReviews.reduce((acc, rev) => acc + rev.ratingOverall, 0);
          const avg = parseFloat((sum / updatedReviews.length).toFixed(1));
          return {
            ...prev,
            reviews: updatedReviews,
            averageRating: avg,
          };
        });

        setReviewComment('');
        setRatingCleanliness(10);
        setRatingLocation(10);
        setRatingService(10);
        setRatingFacilities(10);
        setRatingValue(10);
        setShowReviewForm(false);

        await showAlert(language === 'vi' ? 'Cảm ơn bạn đã gửi đánh giá!' : 'Thank you for your review!', { type: 'success', title: language === 'vi' ? 'Thành công' : 'Success' });
      }
    } catch (err: any) {
      console.error('[Submit Review Error]:', err);
      setReviewError(
        err.response?.data?.message ||
        (language === 'vi' ? 'Gửi đánh giá thất bại. Vui lòng thử lại.' : 'Failed to submit review. Please try again.')
      );
    } finally {
      setSubmittingReview(false);
    }
  };

  const [likedReviewIds, setLikedReviewIds] = useState<string[]>([]);

  const handleLikeReview = async (reviewId: string) => {
    if (likedReviewIds.includes(reviewId)) return;
    setLikedReviewIds((prev) => [...prev, reviewId]);
    setHotel((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        reviews: prev.reviews.map((r) =>
          r.id === reviewId ? { ...r, likesCount: (r.likesCount || 0) + 1 } : r
        ),
      };
    });
    try {
      await apiClient.post(`/hotels/reviews/${reviewId}/like`);
    } catch (err) {
      console.error(err);
    }
  };

  // States cho Bản đồ tương tác
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [activeMapQuery, setActiveMapQuery] = useState('');
  const [selectedMapCategory, setSelectedMapCategory] = useState<'ALL' | 'NEARBY' | 'TRANSPORT' | 'ENTERTAINMENT' | 'OTHER'>('ALL');

  // States đồng bộ cho ô tìm kiếm
  const [provinceId, setProvinceId] = useState(searchCriteria.provinceId || '');
  const [destInputText, setDestInputText] = useState('');
  const [destError, setDestError] = useState(false);
  const [checkIn, setCheckIn] = useState(searchCriteria.checkInDate || '');
  const [checkOut, setCheckOut] = useState(searchCriteria.checkOutDate || '');
  const [adults, setAdults] = useState(searchCriteria.guests > 2 ? searchCriteria.guests : 2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);

  const [showDestPopover, setShowDestPopover] = useState(false);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [showGuestPopover, setShowGuestPopover] = useState(false);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  const today = new Date();
  const [month1, setMonth1] = useState(today.getMonth());
  const [year1, setYear1] = useState(today.getFullYear());

  const month2 = month1 === 11 ? 0 : month1 + 1;
  const year2 = month1 === 11 ? year1 + 1 : year1;

  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [suggestedHotels, setSuggestedHotels] = useState<any[]>([]);

  const monthNames = [
    'tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
    'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'
  ];

  const [provincesList, setProvincesList] = useState<ProvinceItem[]>(VIETNAM_PROVINCES);
  const [hotelCoupons, setHotelCoupons] = useState<any[]>([]);
  const [copiedCouponCode, setCopiedCouponCode] = useState<string | null>(null);



  useEffect(() => {
    if (id) {
      apiClient.get('/coupons', { params: { hotelId: id } })
        .then(res => {
          if (res.data.success && Array.isArray(res.data.data)) {
            // Chỉ lấy mã giảm giá riêng của khách sạn này (c.hotelId === id)
            setHotelCoupons(res.data.data.filter((c: any) => c.hotelId === id));
          }
        })
        .catch(err => console.error('Failed to fetch hotel coupons:', err));
    }
  }, [id]);

  const handleCopyCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCouponCode(code);
    setTimeout(() => setCopiedCouponCode(null), 2500);
  };

  useEffect(() => {
    const fetchProvinces = async () => {
      try {
        const res = await apiClient.get('/hotels/meta/locations');
        if (res.data.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
          const cleanNameKey = (str: string) =>
            removeVietnameseTones(str.replace(/^(Thành phố|Tỉnh|TP\.|TP)\s+/i, '').trim().toLowerCase());

          const uniqueMap = new Map<string, ProvinceItem>();
          VIETNAM_PROVINCES.forEach((p) => {
            uniqueMap.set(cleanNameKey(p.name), p);
          });

          res.data.data.forEach((p: any) => {
            const cKey = cleanNameKey(p.name);
            const existing = uniqueMap.get(cKey);
            if (existing) {
              uniqueMap.set(cKey, { ...existing, id: p.id || existing.id });
            } else {
              const cleanNameDisplay = p.name.replace(/^(Thành phố|Tỉnh)\s+/i, '').trim();
              uniqueMap.set(cKey, {
                id: p.id || '',
                name: cleanNameDisplay,
                keywords: [removeVietnameseTones(cleanNameDisplay.toLowerCase())]
              });
            }
          });

          setProvincesList(Array.from(uniqueMap.values()));
        }
      } catch (err) {
        console.error('Failed to fetch provinces from backend:', err);
      }
    };
    fetchProvinces();
  }, []);

  // Khi load trang chi tiết khách sạn, đặt ô nhập địa điểm trong thanh tìm kiếm thành tên khách sạn
  useEffect(() => {
    if (hotel && hotel.name) {
      setDestInputText(hotel.name);
      const pId = (hotel as any).provinceId || (hotel.province as any)?.id || '';
      if (pId && !provinceId) {
        setProvinceId(pId);
      }
    }
  }, [hotel]);

  // Date list utilities cho Popover lịch
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    const startDayOfWeek = date.getDay();
    const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    for (let i = 0; i < adjustedStartDay; i++) {
      days.push(null);
    }

    const numDays = new Date(year, month + 1, 0).getDate();
    for (let d = 1; d <= numDays; d++) {
      days.push(new Date(year, month, d));
    }

    const totalCells = days.length;
    const remaining = 42 - totalCells;
    for (let i = 0; i < remaining; i++) {
      days.push(null);
    }

    return days;
  };

  const handlePrevMonths = () => {
    if (month1 === 0) {
      setMonth1(11);
      setYear1(year1 - 1);
    } else {
      setMonth1(month1 - 1);
    }
  };

  const handleNextMonths = () => {
    if (month1 === 11) {
      setMonth1(0);
      setYear1(year1 + 1);
    } else {
      setMonth1(month1 + 1);
    }
  };

  const handleDayClick = (dateStr: string) => {
    const todayStr = today.toISOString().split('T')[0];
    if (dateStr < todayStr) return;

    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(dateStr);
      setCheckOut('');
      setHoveredDate(null);
    } else if (checkIn && !checkOut) {
      if (dateStr >= checkIn) {
        setCheckOut(dateStr);
        setHoveredDate(null);
        setShowDatePopover(false);
      } else {
        setCheckIn(dateStr);
        setHoveredDate(null);
      }
    }
  };

  const handleDayMouseEnter = (dateStr: string) => {
    if (checkIn && !checkOut) {
      setHoveredDate(dateStr);
    }
  };

  const formatDateDisplay = () => {
    if (checkIn && checkOut) {
      const inDate = new Date(checkIn + 'T00:00:00');
      const outDate = new Date(checkOut + 'T00:00:00');
      const daysOfWeek = language === 'vi'
        ? ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7']
        : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

      const inStr = language === 'vi'
        ? `${daysOfWeek[inDate.getDay()]}, ${inDate.getDate()} tháng ${inDate.getMonth() + 1}`
        : `${daysOfWeek[inDate.getDay()]}, ${inDate.toLocaleString('en-US', { month: 'short' })} ${inDate.getDate()}`;
      const outStr = language === 'vi'
        ? `${daysOfWeek[outDate.getDay()]}, ${outDate.getDate()} tháng ${outDate.getMonth() + 1}`
        : `${daysOfWeek[outDate.getDay()]}, ${outDate.toLocaleString('en-US', { month: 'short' })} ${outDate.getDate()}`;
      return `${inStr} – ${outStr}`;
    }
    return language === 'vi' ? 'Nhận phòng — Trả phòng' : 'Check-in — Check-out';
  };

  const isSelected = (dateStr: string) => checkIn === dateStr || checkOut === dateStr;
  const isInRange = (dateStr: string) => checkIn && checkOut && dateStr > checkIn && dateStr < checkOut;

  const isInHoverRange = (dateStr: string) => {
    if (checkIn && !checkOut && hoveredDate && dateStr > checkIn && dateStr <= hoveredDate) {
      return true;
    }
    return false;
  };

  // Load recent searches
  useEffect(() => {
    if (showDestPopover) {
      const stored = localStorage.getItem('recent_searches');
      if (stored) {
        try {
          const list = JSON.parse(stored);
          if (Array.isArray(list)) {
            const seen = new Set();
            const cleaned = list.filter((item: any) => {
              const key = item.provinceId
                ? `prov-${item.provinceId}`
                : `query-${(item.searchQuery || '').toLowerCase()}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
            setRecentSearches(cleaned);
          }
        } catch (e) {
          console.error(e);
        }
      }
    }
  }, [showDestPopover]);

  // Dynamic autocomplete query
  useEffect(() => {
    if (!destInputText.trim()) {
      setSuggestedHotels([]);
      return;
    }
    const delayDebounce = setTimeout(async () => {
      const isProvince = provincesList.some(p => p.name.toLowerCase() === destInputText.trim().toLowerCase());
      if (isProvince) {
        setSuggestedHotels([]);
        return;
      }
      try {
        const res = await apiClient.get('/hotels', {
          params: { limit: 100 }
        });
        if (res.data.success) {
          const allHotels = res.data.data.hotels || [];
          const normInput = removeVietnameseTones(destInputText.toLowerCase()).trim();
          const filtered = allHotels.filter((hotel: any) => {
            const normName = removeVietnameseTones(hotel.name.toLowerCase());
            const normAddress = removeVietnameseTones(hotel.address.toLowerCase());
            const normProvince = removeVietnameseTones(hotel.province.toLowerCase());
            return normName.includes(normInput) || normAddress.includes(normInput) || normProvince.includes(normInput);
          });
          setSuggestedHotels(filtered.slice(0, 5));
        }
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [destInputText, provincesList]);

  const handleSelectRecentSearch = (searchItem: any) => {
    setProvinceId(searchItem.provinceId);
    setDestInputText(searchItem.provinceName);
    setCheckIn(searchItem.checkIn || '');
    setCheckOut(searchItem.checkOut || '');
    setAdults(searchItem.adults || 2);
    setChildren(searchItem.children || 0);
    setRooms(searchItem.rooms || 1);
    setShowDestPopover(false);
  };

  const formatSearchDatesHelper = (start: string, end: string) => {
    if (start && end) {
      const sDate = new Date(start);
      const eDate = new Date(end);
      return `${sDate.getDate()} thg ${sDate.getMonth() + 1} – ${eDate.getDate()} thg ${eDate.getMonth() + 1}`;
    }
    return 'Lịch linh hoạt';
  };

  const handleDestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDestInputText(val);
    setShowDestPopover(true);

    const matched = provincesList.find((p) => p.name.toLowerCase() === val.toLowerCase());
    if (matched) {
      setProvinceId(matched.id);
    } else {
      setProvinceId('');
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!destInputText.trim()) {
      setDestError(true);
      return;
    }

    const queryNorm = removeVietnameseTones(destInputText.trim().toLowerCase());
    const matchedProv = provincesList.find(
      (p) =>
        p.name.toLowerCase() === destInputText.trim().toLowerCase() ||
        removeVietnameseTones(p.name.toLowerCase()) === queryNorm ||
        p.keywords?.some((k) => removeVietnameseTones(k.toLowerCase()) === queryNorm || queryNorm.includes(removeVietnameseTones(k.toLowerCase())))
    );

    let finalProvinceId = provinceId;
    let finalSearchQuery = destInputText.trim();

    if (matchedProv) {
      finalProvinceId = matchedProv.id;
    }

    dispatch(setSearchCriteria({
      provinceId: finalProvinceId,
      searchQuery: finalSearchQuery,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guests: adults + children
    }));

    if (finalProvinceId || finalSearchQuery) {
      const newSearch = {
        provinceId: finalProvinceId,
        provinceName: destInputText.trim(),
        searchQuery: finalSearchQuery,
        checkIn,
        checkOut,
        adults,
        children,
        rooms
      };
      const stored = localStorage.getItem('recent_searches');
      let list = stored ? JSON.parse(stored) : [];
      list = list.filter((item: any) => {
        if (finalProvinceId && item.provinceId === finalProvinceId) return false;
        if (finalSearchQuery && item.searchQuery && item.searchQuery.toLowerCase() === finalSearchQuery.toLowerCase()) return false;
        return true;
      });
      list.unshift(newSearch);
      list = list.slice(0, 3);
      localStorage.setItem('recent_searches', JSON.stringify(list));
    }

    // Kiểm tra xem người dùng đang tìm kiếm trên cùng Tỉnh/Thành hoặc cùng Khách sạn hiện tại
    const isSameDestinationOrHotel = hotel && (
      destInputText.trim().toLowerCase() === hotel.name.toLowerCase() ||
      (hotel.province && removeVietnameseTones(destInputText.trim().toLowerCase()).includes(removeVietnameseTones(hotel.province.name.toLowerCase()))) ||
      ((hotel as any).provinceId && finalProvinceId === (hotel as any).provinceId) ||
      !finalProvinceId
    );

    if (isSameDestinationOrHotel) {
      fetchDetail();
      setShowDestPopover(false);
      setShowDatePopover(false);
      setShowGuestPopover(false);
      return;
    }

    navigate('/search');
  };

  const matchedProvinces = destInputText.trim()
    ? provincesList.filter((p) => {
      const normInput = removeVietnameseTones(destInputText.trim().toLowerCase());
      const normName = removeVietnameseTones(p.name.toLowerCase());
      if (normName.includes(normInput) || normInput.includes(normName)) return true;
      return p.keywords?.some((k) => {
        const normK = removeVietnameseTones(k.toLowerCase().trim());
        if (!normK) return false;
        if (normK === normInput) return true;
        if (normK.length >= 3 && normInput.includes(normK)) return true;
        if (normK.includes(normInput)) return true;
        return false;
      });
    })
    : [];

  const combinedSuggestions = [
    ...matchedProvinces.map((p) => ({ ...p, type: 'province' as const })),
    ...suggestedHotels.map((h) => ({ ...h, type: 'hotel' as const }))
  ];

  const getNightsCount = () => {
    if (!checkIn || !checkOut) return 1;
    const inDate = new Date(checkIn);
    const outDate = new Date(checkOut);
    const diffTime = outDate.getTime() - inDate.getTime();
    if (diffTime <= 0) return 1;
    return Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
  };

  const getDisplayPrice = (rt: RoomTypeDetail, customPrice?: number) => {
    const nights = getNightsCount();
    const priceToUse = customPrice !== undefined ? customPrice : rt.calculatedPrice;
    switch (priceShowOption) {
      case 'per_night_incl':
        return Math.round(priceToUse * 1.15);
      case 'total_excl':
        return priceToUse * nights;
      case 'total_incl':
        return Math.round(priceToUse * 1.15 * nights);
      case 'per_night_excl':
      default:
        return priceToUse;
    }
  };

  const getDisplayBasePrice = (rt: RoomTypeDetail, customBasePrice?: number) => {
    const nights = getNightsCount();
    const baseToUse = customBasePrice !== undefined ? customBasePrice : rt.basePrice;
    switch (priceShowOption) {
      case 'per_night_incl':
        return Math.round(baseToUse * 1.15);
      case 'total_excl':
        return baseToUse * nights;
      case 'total_incl':
        return Math.round(baseToUse * 1.15 * nights);
      case 'per_night_excl':
      default:
        return baseToUse;
    }
  };

  const getPriceSubtitle = () => {
    const nights = getNightsCount();
    switch (priceShowOption) {
      case 'per_night_incl':
        return language === 'vi' ? 'Mỗi phòng mỗi đêm (bao gồm thuế và phí)' : 'Room per night (incl. tax & fees)';
      case 'total_excl':
        return language === 'vi' ? `Tổng giá cho ${nights} đêm (chưa bao gồm thuế và phí)` : `Total price for ${nights} nights (excl. tax & fees)`;
      case 'total_incl':
        return language === 'vi' ? `Tổng giá cho ${nights} đêm (bao gồm thuế và phí)` : `Total price for ${nights} nights (incl. tax & fees)`;
      case 'per_night_excl':
      default:
        return language === 'vi' ? 'Mỗi phòng mỗi đêm (chưa bao gồm thuế và phí)' : 'Room per night (excl. tax & fees)';
    }
  };

  const matchTag = (rt: RoomTypeDetail, tag: string) => {
    const lowerName = rt.name.toLowerCase();
    const lowerDesc = rt.description.toLowerCase();
    switch (tag) {
      case 'Miễn phí hủy phòng':
        return true;
      case 'Extra Benefit':
        return rt.basePrice > 1500000 || lowerName.includes('suite') || lowerName.includes('deluxe') || lowerDesc.includes('hồ');
      case 'Giường lớn':
        return rt.bedCount >= 1 || lowerName.includes('double') || lowerName.includes('suite') || lowerName.includes('đôi') || lowerName.includes('giường lớn');
      case 'Miễn phí bữa sáng':
        return rt.basePrice > 1000000 || lowerName.includes('sáng') || lowerDesc.includes('sáng') || lowerName.includes('breakfast');
      default:
        return true;
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const groupRoomTypes = () => {
    if (!hotel || !hotel.roomTypes) return [];

    const groups: { baseName: string; roomTypes: RoomTypeDetail[] }[] = [];

    // Lọc theo tag được chọn
    const filteredRoomTypes = hotel.roomTypes.filter((rt) => {
      return selectedTags.every((tag) => matchTag(rt, tag));
    });

    filteredRoomTypes.forEach((rt) => {
      // Tách tên loại phòng dựa trên ký tự -, ( hoặc [ để lấy tên cơ sở (ví dụ: "Phòng Deluxe Double")
      const parts = rt.name.split(/[-([|]/);
      const baseName = parts[0].trim();

      const existing = groups.find(g => g.baseName.toLowerCase() === baseName.toLowerCase());
      if (existing) {
        existing.roomTypes.push(rt);
      } else {
        groups.push({
          baseName,
          roomTypes: [rt]
        });
      }
    });

    return groups;
  };

  const fetchDetail = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get(`/hotels/${id}`, {
        params: { checkIn, checkOut }
      });
      if (res.data.success) {
        setHotel(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch hotel details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  useEffect(() => {
    if (id) {
      socket.connect();
      socket.emit('joinHotel', id);

      const handleCalendarUpdate = (e: any) => {
        const data = e.detail;
        if (data.hotelId === id) {
          fetchDetail();
        }
      };

      window.addEventListener('calendar:updated', handleCalendarUpdate);

      return () => {
        window.removeEventListener('calendar:updated', handleCalendarUpdate);
      };
    }
  }, [id]);

  // Icon mapping
  const getAmenityIcon = (name: string, className: string = "w-5 h-5") => {
    const lower = name.toLowerCase();
    if (lower.includes('wifi') || lower.includes('internet')) return <Wifi className={className} />;
    if (lower.includes('hồ bơi') || lower.includes('bể bơi') || lower.includes('pool') || lower.includes('bể sục')) return <Waves className={className} />;
    if (lower.includes('đỗ xe') || lower.includes('đậu xe') || lower.includes('bãi xe') || lower.includes('parking')) return <ParkingCircle className={className} />;
    if (lower.includes('gym') || lower.includes('thể hình') || lower.includes('fitness') || lower.includes('tập thể dục')) return <Dumbbell className={className} />;
    if (lower.includes('điều hòa') || lower.includes('máy lạnh') || lower.includes('air') || lower.includes('lạnh')) return <Sparkles className={className} />;
    if (lower.includes('nhà hàng') || lower.includes('ăn uống') || lower.includes('dining')) return <Utensils className={className} />;
    if (lower.includes('bar') || lower.includes('lounge') || lower.includes('cocktail')) return <GlassWater className={className} />;
    if (lower.includes('spa') || lower.includes('massage') || lower.includes('xông hơi')) return <Sparkles className={className} />;
    if (lower.includes('tắm') || lower.includes('vòi sen') || lower.includes('toilet') || lower.includes('bath') || lower.includes('vệ sinh')) return <Bath className={className} />;
    if (lower.includes('giường') || lower.includes('phòng ngủ') || lower.includes('tủ') || lower.includes('ga') || lower.includes('pillow') || lower.includes('bed')) return <Bed className={className} />;
    if (lower.includes('ngoài trời') || lower.includes('sân') || lower.includes('vườn') || lower.includes('hiên') || lower.includes('ban công') || lower.includes('outdoor')) return <Trees className={className} />;
    if (lower.includes('an ninh') || lower.includes('bảo vệ') || lower.includes('cctv') || lower.includes('báo cháy') || lower.includes('báo động') || lower.includes('security')) return <ShieldCheck className={className} />;
    if (lower.includes('tv') || lower.includes('tivi') || lower.includes('truyền hình') || lower.includes('màn hình')) return <Tv className={className} />;
    if (lower.includes('tiếng') || lower.includes('ngôn ngữ') || lower.includes('language')) return <Globe className={className} />;
    return <Sparkles className={className} />;
  };

  const translateAmenityName = (name: string) => {
    if (!name) return '';
    const lower = name.toLowerCase().trim();
    if (language === 'vi') {
      if (lower.includes('wifi') || lower.includes('internet')) return 'Wifi miễn phí';
      if (lower === 'air conditioning' || lower === 'ac') return 'Điều hòa';
      if (lower === 'tv' || lower === 'television') return 'Tivi';
      if (lower === 'refrigerator' || lower === 'fridge') return 'Tủ lạnh';
      if (lower === 'bathtub') return 'Bồn tắm';
      if (lower === 'balcony') return 'Ban công';
      if (lower === 'electric kettle' || lower === 'kettle') return 'Ấm đun nước';
      if (lower === 'slippers') return 'Dép đi trong nhà';
      if (lower === 'safety box' || lower === 'safe') return 'Két an toàn';
      if (lower === 'hairdryer') return 'Máy sấy tóc';
      return name;
    } else {
      // Internet & Parking
      if (lower.includes('wifi') || lower.includes('internet')) return 'Free Wifi';
      if (lower.includes('bãi đỗ xe') || lower.includes('chỗ đỗ xe') || lower.includes('bãi đậu xe') || lower.includes('parking')) return 'Parking Space';

      // Leisure & Facilities
      if (lower === 'hồ bơi' || lower === 'swimming pool') return 'Swimming Pool';
      if (lower.includes('gym') || lower.includes('thể hình') || lower.includes('fitness')) return 'Fitness Center / Gym';
      if (lower.includes('spa') || lower.includes('massage')) return 'Spa & Massage';
      if (lower.includes('nhà hàng') || lower.includes('dining') || lower.includes('restaurant')) return 'Restaurant & Dining';
      if (lower.includes('quầy bar') || lower.includes('lounge') || lower.includes('bar')) return 'Bar & Lounge';
      if (lower.includes('dịch vụ phòng') || lower.includes('room service')) return 'Room Service';

      // Bathroom
      if (lower === 'giấy vệ sinh') return 'Toilet Paper';
      if (lower === 'khăn tắm') return 'Towels';
      if (lower.includes('bidet')) return 'Bidet';
      if (lower === 'dép lê' || lower === 'dép đi trong nhà' || lower === 'dép') return 'Slippers';
      if (lower === 'phòng tắm riêng') return 'Private Bathroom';
      if (lower === 'nhà vệ sinh' || lower === 'toilet') return 'Toilet';
      if (lower.includes('vệ sinh cá nhân')) return 'Free Toiletries';
      if (lower === 'máy sấy tóc') return 'Hairdryer';
      if (lower === 'vòi sen' || lower === 'vòi hoa sen') return 'Shower';
      if (lower === 'bồn tắm') return 'Bathtub';

      // Bedroom
      if (lower.includes('khăn trải giường') || lower.includes('ga trải giường')) return 'Bed Sheets / Linens';
      if (lower.includes('tủ quần áo') || lower.includes('phòng để quần áo')) return 'Wardrobe / Closet';

      // Outdoors
      if (lower.includes('bàn ghế ngoài trời')) return 'Outdoor Furniture';
      if (lower.includes('sân thượng') || lower.includes('hiên')) return 'Terrace / Patio';
      if (lower === 'sân vườn' || lower === 'vườn') return 'Garden';
      if (lower === 'ban công') return 'Balcony';

      // Kitchen
      if (lower.includes('bếp chung')) return 'Shared Kitchen';
      if (lower.includes('ấm đun nước')) return 'Electric Kettle';
      if (lower.includes('lò vi sóng')) return 'Microwave';
      if (lower === 'tủ lạnh' || lower === 'fridge' || lower === 'refrigerator') return 'Refrigerator';

      // Room details
      if (lower.includes('giá treo')) return 'Clothes Rack';
      if (lower.includes('két sắt') || lower.includes('két an toàn') || lower.includes('két sắt an toàn')) return 'Safety Deposit Box';
      if (lower === 'điều hòa' || lower === 'điều hòa nhiệt độ' || lower === 'máy lạnh') return 'Air Conditioning';
      if (lower === 'quạt máy' || lower === 'quạt') return 'Fan';
      if (lower === 'tivi' || lower === 'tv') return 'TV';
      if (lower.includes('tv màn hình phẳng') || lower.includes('tivi màn hình phẳng')) return 'Flat-screen TV';
      if (lower.includes('truyền hình cáp')) return 'Cable Channels';

      // Services
      if (lower.includes('dọn phòng hàng ngày')) return 'Daily Housekeeping';
      if (lower.includes('sảnh chung')) return 'Shared Lounge / TV Area';
      if (lower.includes('lễ tân 24 giờ') || lower.includes('lễ tân')) return '24-hour Front Desk';
      if (lower.includes('trông trẻ')) return 'Babysitting Services';
      if (lower.includes('nhận/trả phòng riêng')) return 'Private Check-in / Check-out';

      // Security
      if (lower.includes('bình chữa cháy')) return 'Fire Extinguisher';
      if (lower.includes('cctv bên ngoài')) return 'CCTV Outside Property';
      if (lower.includes('cctv trong khu vực chung')) return 'CCTV in Common Areas';
      if (lower.includes('báo cháy') || lower.includes('báo động')) return 'Smoke Alarms';
      if (lower.includes('bảo vệ 24/7')) return '24/7 Security';

      // General
      if (lower.includes('thang máy')) return 'Elevator';
      if (lower.includes('phòng gia đình')) return 'Family Rooms';
      if (lower.includes('không hút thuốc')) return 'Non-smoking Rooms';
      if (lower.includes('cấm hút thuốc')) return 'All-inclusive Non-smoking';

      // Languages
      if (lower.includes('tiếng anh')) return 'English';
      if (lower.includes('tiếng việt')) return 'Vietnamese';

      return name;
    }
  };

  const handleBookRoom = (roomTypeId: string, ratePlanId?: string) => {
    if (!isLoggedIn) {
      showAlert(
        language === 'vi'
          ? 'Vui lòng đăng nhập tài khoản để tiến hành đặt phòng.'
          : 'Please login to proceed with room booking.',
        { title: language === 'vi' ? 'Yêu cầu đăng nhập' : 'Login Required', type: 'info' }
      );
      navigate('/login', { state: { from: `/hotel/${id}` } });
      return;
    }

    const key = ratePlanId ? `${roomTypeId}_${ratePlanId}` : roomTypeId;
    navigate('/checkout', {
      state: {
        hotelId: hotel?.id,
        hotelName: hotel?.name,
        roomTypeId,
        ratePlanId: ratePlanId || null,
        quantity: selectedQuantities[key] || selectedQuantities[roomTypeId] || 1,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        numGuests: adults + children
      }
    });
  };

  if (loading) {
    return (
      <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8 py-12 animate-pulse space-y-8">
        <div className="h-8 bg-slate-200 rounded w-1/3"></div>
        <div className="h-96 bg-slate-200 rounded-premium"></div>
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 h-48 bg-slate-200 rounded-premium"></div>
          <div className="h-48 bg-slate-200 rounded-premium"></div>
        </div>
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500 font-semibold">{t.notFound}</p>
      </div>
    );
  }

  // Airbnb style photos layout
  const mainPhoto = hotel.images[0]?.url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945';

  // Tính điểm đánh giá theo tiêu chí mẫu nếu chưa lưu chi tiết
  const criteriaScores = hotel.reviews.length > 0 ? {
    cleanliness: parseFloat((hotel.reviews.reduce((s, r) => s + normalizeRating(r.ratingCleanliness), 0) / hotel.reviews.length).toFixed(1)),
    location: parseFloat((hotel.reviews.reduce((s, r) => s + normalizeRating(r.ratingLocation), 0) / hotel.reviews.length).toFixed(1)),
    service: parseFloat((hotel.reviews.reduce((s, r) => s + normalizeRating(r.ratingService), 0) / hotel.reviews.length).toFixed(1)),
    facilities: parseFloat((hotel.reviews.reduce((s, r) => s + normalizeRating(r.ratingFacilities), 0) / hotel.reviews.length).toFixed(1)),
    value: parseFloat((hotel.reviews.reduce((s, r) => s + normalizeRating(r.ratingValue), 0) / hotel.reviews.length).toFixed(1)),
  } : { cleanliness: 0, location: 0, service: 0, facilities: 0, value: 0 };

  const displayAverageRating = hotel.reviews.length > 0
    ? parseFloat((hotel.reviews.reduce((s, r) => s + normalizeRating(r.ratingOverall), 0) / hotel.reviews.length).toFixed(1))
    : 0;

  // Group amenities by category for detailed display
  const groupAmenities = () => {
    const grouped: Record<string, { titleVi: string; titleEn: string; icon: React.ReactNode; items: string[] }> = {
      bathroom: {
        titleVi: 'Phòng tắm',
        titleEn: 'Bathroom',
        icon: <Bath className="w-5 h-5 text-slate-800" />,
        items: []
      },
      bedroom: {
        titleVi: 'Phòng ngủ',
        titleEn: 'Bedroom',
        icon: <Bed className="w-5 h-5 text-slate-800" />,
        items: []
      },
      outdoor: {
        titleVi: 'Ngoài trời',
        titleEn: 'Outdoors',
        icon: <Trees className="w-5 h-5 text-slate-800" />,
        items: []
      },
      kitchen: {
        titleVi: 'Nhà bếp',
        titleEn: 'Kitchen',
        icon: <Utensils className="w-5 h-5 text-slate-800" />,
        items: []
      },
      room: {
        titleVi: 'Tiện ích trong phòng',
        titleEn: 'Room Amenities',
        icon: <Sparkles className="w-5 h-5 text-slate-800" />,
        items: []
      },
      media: {
        titleVi: 'Truyền thông & Công nghệ',
        titleEn: 'Media & Technology',
        icon: <Tv className="w-5 h-5 text-slate-800" />,
        items: []
      },
      internet: {
        titleVi: 'Internet',
        titleEn: 'Internet',
        icon: <Wifi className="w-5 h-5 text-slate-800" />,
        items: []
      },
      parking: {
        titleVi: 'Chỗ đậu xe',
        titleEn: 'Parking',
        icon: <ParkingCircle className="w-5 h-5 text-slate-800" />,
        items: []
      },
      services: {
        titleVi: 'Dịch vụ & Tiện ích giải trí',
        titleEn: 'Services & Leisure',
        icon: <User className="w-5 h-5 text-slate-800" />,
        items: []
      },
      security: {
        titleVi: 'An ninh',
        titleEn: 'Security',
        icon: <ShieldCheck className="w-5 h-5 text-slate-800" />,
        items: []
      },
      general: {
        titleVi: 'Tổng quát',
        titleEn: 'General',
        icon: <Building2 className="w-5 h-5 text-slate-800" />,
        items: []
      },
      languages: {
        titleVi: 'Ngôn ngữ được sử dụng',
        titleEn: 'Languages Spoken',
        icon: <Globe className="w-5 h-5 text-slate-800" />,
        items: []
      }
    };

    hotel.amenities.forEach(({ amenity }) => {
      const name = amenity.name;
      const iconKey = (amenity.icon || '').toLowerCase();
      if (grouped[iconKey]) {
        grouped[iconKey].items.push(name);
        return;
      }

      const lower = name.toLowerCase();

      if (lower.includes('wifi') || lower.includes('internet')) {
        grouped.internet.items.push(name);
      } else if (lower.includes('đỗ xe') || lower.includes('đậu xe') || lower.includes('bãi xe') || lower.includes('parking')) {
        grouped.parking.items.push(name);
      } else if (lower.includes('tắm') || lower.includes('sen') || lower.includes('toilet') || lower.includes('bồn') || lower.includes('khăn tắm') || lower.includes('vệ sinh')) {
        grouped.bathroom.items.push(name);
      } else if (lower.includes('giường') || lower.includes('mền') || lower.includes('gối') || lower.includes('chăn') || lower.includes('tủ quần áo') || lower.includes('bed')) {
        grouped.bedroom.items.push(name);
      } else if (lower.includes('ngoài trời') || lower.includes('sân') || lower.includes('vườn') || lower.includes('ban công') || lower.includes('hiên') || lower.includes('thượng')) {
        grouped.outdoor.items.push(name);
      } else if (lower.includes('bếp') || lower.includes('lò') || lower.includes('ấm đun') || lower.includes('nấu') || lower.includes('tủ lạnh')) {
        grouped.kitchen.items.push(name);
      } else if (lower.includes('tv') || lower.includes('tivi') || lower.includes('màn hình') || lower.includes('truyền hình')) {
        grouped.media.items.push(name);
      } else if (lower.includes('an ninh') || lower.includes('bảo vệ') || lower.includes('cctv') || lower.includes('báo cháy') || lower.includes('báo động') || lower.includes('chữa cháy')) {
        grouped.security.items.push(name);
      } else if (lower.includes('tiếng') || lower.includes('ngôn ngữ') || lower.includes('dịch thuật')) {
        grouped.languages.items.push(name);
      } else if (lower.includes('dọn phòng') || lower.includes('giặt') || lower.includes('đón tiễn') || lower.includes('lễ tân') || lower.includes('trông trẻ')) {
        grouped.services.items.push(name);
      } else if (lower.includes('điều hòa') || lower.includes('máy lạnh') || lower.includes('thang máy') || lower.includes('hút thuốc') || lower.includes('cách âm') || lower.includes('quạt')) {
        grouped.general.items.push(name);
      } else if (lower.includes('giá treo') || lower.includes('két sắt') || lower.includes('tiện ích phòng') || lower.includes('bàn làm việc')) {
        grouped.room.items.push(name);
      } else {
        if (lower.includes('dịch vụ') || lower.includes('spa') || lower.includes('massage') || lower.includes('bar') || lower.includes('hồ bơi') || lower.includes('bể bơi') || lower.includes('gym')) {
          grouped.services.items.push(name);
        } else {
          grouped.general.items.push(name);
        }
      }
    });

    return Object.values(grouped).filter(cat => cat.items.length > 0);
  };

  const getFeaturedAmenities = () => {
    const featuredKeywords = ['wifi', 'đỗ xe', 'đậu xe', 'bể bơi', 'hồ bơi', 'điều hòa', 'máy lạnh', 'lễ tân', 'nhà hàng', 'bữa sáng', 'gym', 'spa', 'thang máy'];
    const matches = hotel.amenities.filter(({ amenity }) =>
      featuredKeywords.some(kw => amenity.name.toLowerCase().includes(kw))
    );
    const nonMatches = hotel.amenities.filter(({ amenity }) =>
      !featuredKeywords.some(kw => amenity.name.toLowerCase().includes(kw))
    );
    const combined = [...matches, ...nonMatches];
    return combined.slice(0, 8);
  };

  const groupedAmenities = groupAmenities();

  return (
    <div>


      {/* Banner & Search bar section wrapper */}
      <div className="relative">
        {/* Hero Section */}
        <section
          style={{ backgroundImage: "url('/banner.webp')" }}
          className="relative bg-cover bg-center text-white pt-28 pb-16 px-4 sm:px-6 lg:px-8 shadow-2xl overflow-hidden min-h-[260px] flex items-center justify-center"
        >
          {/* Lớp phủ tối nhẹ sắc nét bảo vệ độ tương phản chữ */}
          <div className="absolute inset-0 bg-black/35 z-0"></div>

          <div className="absolute top-1/4 left-1/4 w-48 h-48 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

          <div className="max-w-4xl mx-auto w-full text-center space-y-1 relative z-10">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight leading-tight">
              {language === 'vi' ? 'Khám phá chi tiết phòng nghỉ lý tưởng' : 'Discover Your Perfect Room Details'}
            </h1>
            <p className="text-[10px] sm:text-xs text-slate-200 max-w-xl mx-auto font-light">
              {language === 'vi' ? 'Tìm phòng, so sánh giá cả và đặt phòng trống ngay tức thì.' : 'Find rooms, compare prices and book available rooms instantly.'}
            </p>
          </div>
        </section>

        {/* Booking.com Style Standard Search Bar */}
        <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8 relative z-30 -mt-8">
          <form
            onSubmit={handleSearchSubmit}
            className="bg-[#febb02] p-[4px] rounded-lg flex flex-col lg:flex-row gap-[4px] shadow-[0_10px_25px_rgba(0,0,0,0.1)] w-full items-stretch"
          >
            {/* Destination Panel - Interactive text input */}
            <div className={`flex-grow lg:flex-[3.0] bg-white px-4 h-[62px] flex items-center gap-3 rounded-t-md lg:rounded-l-md lg:rounded-tr-none relative border-2 ${destError ? 'border-red-500' : 'border-transparent'}`}>
              <Building2 className={`w-6 h-6 shrink-0 ${destError ? 'text-red-500 animate-bounce' : 'text-slate-400'}`} />
              <input
                type="text"
                value={destInputText}
                onChange={handleDestInputChange}
                onFocus={() => {
                  setShowDestPopover(true);
                  setShowDatePopover(false);
                  setShowGuestPopover(false);
                }}
                placeholder={destError ? (language === 'vi' ? 'Vui lòng nhập địa điểm!' : 'Please enter a destination!') : (language === 'vi' ? 'Bạn muốn đến đâu?' : 'Where are you going?')}
                className={`w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none border-none p-1 ${destError ? 'placeholder-red-500 text-red-500' : 'placeholder-slate-450 placeholder:font-bold placeholder:text-slate-800'}`}
              />
              {destInputText && (
                <button
                  type="button"
                  onClick={() => {
                    setDestInputText('');
                    setProvinceId('');
                  }}
                  className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-650 transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              )}

              {/* Popover Destination */}
              {showDestPopover && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowDestPopover(false)} />
                  <div className="absolute top-full left-0 mt-2 w-full sm:w-[400px] bg-white rounded-lg shadow-2xl border border-slate-100 p-4 z-40 text-slate-800 max-h-96 overflow-y-auto">
                    <div className="space-y-4 text-left">
                      {!destInputText.trim() ? (
                        <div>
                          {recentSearches.length > 0 && (
                            <div className="mb-4">
                              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-2">
                                {language === 'vi' ? 'Tìm kiếm gần đây' : 'Recent searches'}
                              </h4>
                              <div className="space-y-1">
                                {recentSearches.map((item, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => handleSelectRecentSearch(item)}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                                      <div>
                                        <p className="font-bold text-sm text-slate-900">
                                          {item.provinceName}
                                        </p>
                                        <p className="text-[10px] font-bold text-slate-500">
                                          {formatSearchDatesHelper(item.checkIn, item.checkOut)} · {item.adults + item.children} khách
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-2">
                            {language === 'vi' ? 'Điểm đến phổ biến' : 'Popular destinations'}
                          </h4>
                          <div className="space-y-1">
                            {provincesList.slice(0, 8).map((prov) => (
                              <div
                                key={prov.id}
                                onClick={() => {
                                  setProvinceId(prov.id);
                                  setDestInputText(translateProvinceName(prov.name, language));
                                  setShowDestPopover(false);
                                }}
                                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                              >
                                <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                                <div>
                                  <p className="font-bold text-sm text-slate-900">
                                    {translateProvinceName(prov.name, language)}
                                  </p>
                                  <p className="text-[10px] font-bold text-slate-550">
                                    {language === 'vi' ? 'Việt Nam' : 'Vietnam'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div>
                          {combinedSuggestions.length > 0 ? (
                            <div className="space-y-1">
                              {combinedSuggestions.map((item, idx) => (
                                <div
                                  key={idx}
                                  onClick={() => {
                                    if (item.type === 'province') {
                                      setProvinceId(item.id);
                                      setDestInputText(translateProvinceName(item.name, language));
                                    } else {
                                      setProvinceId('');
                                      setDestInputText(item.name);
                                    }
                                    setShowDestPopover(false);
                                  }}
                                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                >
                                  {item.type === 'province' ? (
                                    <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                                  ) : (
                                    <Building2 className="w-5 h-5 text-blue-500 shrink-0" />
                                  )}
                                  <div>
                                    <p className="font-bold text-sm text-slate-900">
                                      {item.type === 'province' ? translateProvinceName(item.name, language) : item.name}
                                    </p>
                                    <p className="text-[10px] font-bold text-slate-550">
                                      {item.type === 'province'
                                        ? (language === 'vi' ? 'Điểm đến · Việt Nam' : 'Destination · Vietnam')
                                        : `${item.province || ''} · Khách sạn`}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 py-2 text-center">
                              {language === 'vi' ? 'Không tìm thấy kết quả phù hợp' : 'No matching results found'}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dates Panel */}
            <div className="flex-grow lg:flex-[2.6] bg-white px-4 h-[62px] flex items-center gap-3 relative">
              <CalendarIcon className="w-6 h-6 text-slate-400 shrink-0" />
              <div
                onClick={() => {
                  setShowDatePopover(!showDatePopover);
                  setShowDestPopover(false);
                  setShowGuestPopover(false);
                }}
                className="flex-grow text-left cursor-pointer select-none"
              >
                <p className="text-sm font-bold text-slate-900">{formatDateDisplay()}</p>
              </div>

              {/* Popover Dates Calendar Grid */}
              {showDatePopover && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowDatePopover(false)} />
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 lg:translate-x-0 lg:left-0 mt-2 w-[90vw] sm:w-[760px] bg-white rounded-lg shadow-2xl border border-slate-150 p-5 z-40 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="space-y-4 text-left">
                      {/* Calendar Header */}
                      <div className="flex justify-between items-center px-1">
                        <button
                          type="button"
                          onClick={handlePrevMonths}
                          className="p-1 rounded-full hover:bg-slate-100 text-slate-650 shrink-0"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        <div className="flex-1 grid grid-cols-2 gap-12 text-center">
                          <h4 className="font-extrabold text-base text-slate-900 capitalize">
                            {monthNames[month1]} {year1}
                          </h4>
                          <h4 className="font-extrabold text-base text-slate-900 capitalize">
                            {monthNames[month2]} {year2}
                          </h4>
                        </div>

                        <button
                          type="button"
                          onClick={handleNextMonths}
                          className="p-1 rounded-full hover:bg-slate-100 text-slate-655 shrink-0"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Two months calendar layout side-by-side */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 pt-2">
                        {/* Month 1 */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-7 gap-1.5 text-center text-sm font-bold text-slate-900">
                            <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                          </div>
                          <div className="grid grid-cols-7 gap-1.5 text-center">
                            {getDaysInMonth(year1, month1).map((day, idx) => {
                              if (!day) return <div key={idx} className="h-10 w-10" />;
                              const dateStr = getLocalDateString(day);
                              const dayNum = day.getDate();
                              const active = isSelected(dateStr);
                              const range = isInRange(dateStr);
                              const hoverRange = isInHoverRange(dateStr);
                              const todayStr = getLocalDateString(new Date(), 0);
                              const isToday = dateStr === todayStr;
                              const isPast = dateStr < todayStr;
                              const isHoverEnd = checkIn && !checkOut && hoveredDate === dateStr;

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  disabled={isPast}
                                  onClick={() => handleDayClick(dateStr)}
                                  onMouseEnter={() => handleDayMouseEnter(dateStr)}
                                  onMouseLeave={() => setHoveredDate(null)}
                                  className={`h-10 w-10 text-base font-extrabold rounded-lg flex items-center justify-center transition-all relative ${active
                                    ? 'bg-blue-600 text-white font-bold'
                                    : range || hoverRange
                                      ? 'bg-blue-50 text-blue-700'
                                      : isHoverEnd
                                        ? 'bg-blue-100 border border-dashed border-blue-400 text-blue-800'
                                        : isToday
                                          ? 'bg-blue-50/80 text-blue-700 border-2 border-blue-600 font-black shadow-xs'
                                          : isPast
                                            ? 'bg-slate-100/90 text-slate-350 cursor-not-allowed opacity-60 select-none'
                                            : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                  {dayNum}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Month 2 */}
                        <div className="space-y-3">
                          <div className="grid grid-cols-7 gap-1.5 text-center text-sm font-bold text-slate-900">
                            <span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span>
                          </div>
                          <div className="grid grid-cols-7 gap-1.5 text-center">
                            {getDaysInMonth(year2, month2).map((day, idx) => {
                              if (!day) return <div key={idx} className="h-10 w-10" />;
                              const dateStr = getLocalDateString(day);
                              const dayNum = day.getDate();
                              const active = isSelected(dateStr);
                              const range = isInRange(dateStr);
                              const hoverRange = isInHoverRange(dateStr);
                              const todayStr = getLocalDateString(new Date(), 0);
                              const isToday = dateStr === todayStr;
                              const isPast = dateStr < todayStr;
                              const isHoverEnd = checkIn && !checkOut && hoveredDate === dateStr;

                              return (
                                <button
                                  key={idx}
                                  type="button"
                                  disabled={isPast}
                                  onClick={() => handleDayClick(dateStr)}
                                  onMouseEnter={() => handleDayMouseEnter(dateStr)}
                                  onMouseLeave={() => setHoveredDate(null)}
                                  className={`h-10 w-10 text-base font-extrabold rounded-lg flex items-center justify-center transition-all relative ${active
                                    ? 'bg-blue-600 text-white font-bold'
                                    : range || hoverRange
                                      ? 'bg-blue-50 text-blue-700'
                                      : isHoverEnd
                                        ? 'bg-blue-100 border border-dashed border-blue-400 text-blue-800'
                                        : isToday
                                          ? 'bg-blue-50/80 text-blue-700 border-2 border-blue-600 font-black shadow-xs'
                                          : isPast
                                            ? 'bg-slate-100/90 text-slate-350 cursor-not-allowed opacity-60 select-none'
                                            : 'text-slate-700 hover:bg-slate-100'
                                    }`}
                                >
                                  {dayNum}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>


                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Guests Panel */}
            <div className="flex-grow lg:flex-[2.2] bg-white px-4 h-[62px] flex items-center gap-3 relative">
              <Users className="w-6 h-6 text-slate-400 shrink-0" />
              <div
                onClick={() => {
                  setShowGuestPopover(!showGuestPopover);
                  setShowDestPopover(false);
                  setShowDatePopover(false);
                }}
                className="flex-grow flex items-center justify-between cursor-pointer select-none"
              >
                <p className="text-sm font-bold text-slate-900">
                  {adults} {language === 'vi' ? 'người lớn' : 'adults'} · {children} {language === 'vi' ? 'trẻ em' : 'children'} · {rooms} {language === 'vi' ? 'phòng' : 'rooms'}
                </p>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              </div>

              {/* Popover Guests */}
              {showGuestPopover && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowGuestPopover(false)} />
                  <div className="absolute top-full right-0 mt-2 w-full sm:w-[280px] bg-white rounded-lg shadow-2xl border border-slate-100 p-4 z-40 text-slate-800">
                    <div className="space-y-4">
                      {/* Adults */}
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-sm text-slate-900">{language === 'vi' ? 'Người lớn' : 'Adults'}</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={adults <= 1}
                            onClick={() => setAdults(adults - 1)}
                            className="w-8 h-8 rounded border border-blue-600 text-blue-600 disabled:border-slate-200 disabled:text-slate-300 flex items-center justify-center font-bold text-lg hover:bg-blue-50/50"
                          >
                            —
                          </button>
                          <span className="w-5 text-center font-bold text-sm text-slate-900">{adults}</span>
                          <button
                            type="button"
                            onClick={() => setAdults(adults + 1)}
                            className="w-8 h-8 rounded border border-blue-600 text-blue-600 flex items-center justify-center font-bold text-lg hover:bg-blue-50/50"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Children */}
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-sm text-slate-900">{language === 'vi' ? 'Trẻ em' : 'Children'}</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={children <= 0}
                            onClick={() => setChildren(children - 1)}
                            className="w-8 h-8 rounded border border-blue-600 text-blue-600 disabled:border-slate-200 disabled:text-slate-300 flex items-center justify-center font-bold text-lg hover:bg-blue-50/50"
                          >
                            —
                          </button>
                          <span className="w-5 text-center font-bold text-sm text-slate-900">{children}</span>
                          <button
                            type="button"
                            onClick={() => setChildren(children + 1)}
                            className="w-8 h-8 rounded border border-blue-600 text-blue-600 flex items-center justify-center font-bold text-lg hover:bg-blue-50/50"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Rooms */}
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-sm text-slate-900">{language === 'vi' ? 'Phòng' : 'Rooms'}</span>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            disabled={rooms <= 1}
                            onClick={() => setRooms(rooms - 1)}
                            className="w-8 h-8 rounded border border-blue-600 text-blue-600 disabled:border-slate-200 disabled:text-slate-300 flex items-center justify-center font-bold text-lg hover:bg-blue-50/50"
                          >
                            —
                          </button>
                          <span className="w-5 text-center font-bold text-sm text-slate-900">{rooms}</span>
                          <button
                            type="button"
                            onClick={() => setRooms(rooms + 1)}
                            className="w-8 h-8 rounded border border-blue-600 text-blue-600 flex items-center justify-center font-bold text-lg hover:bg-blue-50/50"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setShowGuestPopover(false)}
                        className="w-full bg-[#006ce4] hover:bg-[#0056b3] text-white font-bold text-xs py-2 rounded-lg transition-colors mt-2"
                      >
                        {language === 'vi' ? 'Xong' : 'Done'}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Search Button */}
            <button
              type="submit"
              className="bg-[#006ce4] hover:bg-[#0056b3] text-white font-bold text-base px-8 h-[62px] rounded-b-md lg:rounded-r-md lg:rounded-bl-none transition-colors shrink-0 flex items-center justify-center min-w-[120px]"
            >
              {language === 'vi' ? 'Tìm' : 'Search'}
            </button>
          </form>
        </div>
      </div>

      {/* Main Details Body Container - A single unified white box sheet */}
      <div className="max-w-[1350px] mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        <div id="overview-section" className="bg-white border border-slate-150 rounded-3xl p-6 sm:p-8 space-y-10 shadow-sm relative">

          {/* Sub Navigation Tabs */}
          <div className="sticky top-0 z-40 bg-white border-b border-slate-150 -mx-6 sm:-mx-8 px-6 sm:px-8 -mt-6 sm:-mt-8 rounded-t-3xl shadow-sm">
            <div className="flex overflow-x-auto overflow-y-hidden no-scrollbar justify-between items-center w-full">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => scrollToSection(tab.id)}
                  className={`py-3.5 px-2 text-xs sm:text-sm font-bold border-b-2 -mb-[1px] transition-all duration-200 whitespace-nowrap focus:outline-none flex-1 text-center flex items-center justify-center ${activeTab === tab.id
                      ? 'border-[#006ce4] text-[#006ce4]'
                      : 'border-transparent text-slate-500 hover:text-[#006ce4] hover:border-[#006ce4]'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Title Header */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-100">
            <div className="space-y-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-none">{hotel.name}</h1>
              <div className="flex items-center gap-2 flex-wrap">
                {(hotel as any).propertyType && (
                  <span className="inline-flex items-center text-xs font-extrabold bg-purple-50 text-purple-600 px-2.5 py-1 rounded">
                    {language === 'vi'
                      ? ({ HOTEL: 'Khách sạn', APARTMENT: 'Căn hộ', VILLA: 'Villa', RESORT: 'Resort', HOMESTAY: 'Homestay', GUESTHOUSE: 'Nhà nghỉ' } as Record<string, string>)[(hotel as any).propertyType] || (hotel as any).propertyType
                      : (hotel as any).propertyType.charAt(0) + (hotel as any).propertyType.slice(1).toLowerCase()
                    }
                  </span>
                )}
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: hotel.starRating || 0 }).map((_, i) => (
                    <StarIcon key={i} size={16} />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 shrink-0">
              <MapPin className="w-5 h-5 text-[#006ce4] shrink-0" />
              <span className="text-sm font-bold text-slate-700">
                {translateAddress(hotel.address, hotel.district.name, hotel.province.name, language)}
              </span>
            </div>
          </div>

          {/* Voucher & Promotion Banner */}
          {hotelCoupons.length > 0 && (
            <div className="bg-gradient-to-r from-red-50 via-amber-50 to-orange-50 border border-amber-200/80 rounded-2xl p-4 sm:p-5 space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-red-600 text-white flex items-center justify-center font-black text-sm shrink-0">
                    🎁
                  </div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm sm:text-base">
                      {language === 'vi' ? 'Mã giảm giá & Voucher ưu đãi của chỗ nghỉ' : 'Hotel Promotions & Special Vouchers'}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {language === 'vi' ? 'Sao chép mã voucher để áp dụng giảm giá khi đặt phòng' : 'Copy voucher code to apply discount at checkout'}
                    </p>
                  </div>
                </div>
                <span className="text-xs font-extrabold text-red-600 bg-red-100 px-2.5 py-1 rounded-full shrink-0">
                  {hotelCoupons.length} {language === 'vi' ? 'Mã giảm giá' : 'Vouchers'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {hotelCoupons.map((c: any) => {
                  const discountLabel = c.discountType === 'PERCENTAGE'
                    ? `Giảm ${c.discountValue}%`
                    : `Giảm ${formatPrice(c.discountValue, language)}`;
                  const maxText = c.maxDiscountAmount ? ` (Tối đa ${formatPrice(c.maxDiscountAmount, language)})` : '';
                  const minText = c.minOrderValue > 0 ? `Đơn từ ${formatPrice(c.minOrderValue, language)}` : 'Mọi đơn';
                  const isCopied = copiedCouponCode === c.code;

                  return (
                    <div key={c.id} className="bg-white border-2 border-dashed border-red-300 rounded-xl p-3 flex flex-col justify-between space-y-2 relative shadow-xs hover:border-red-500 transition-colors">
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-sm text-red-600 tracking-tight">{discountLabel}</span>
                          <span className="text-[10px] font-extrabold bg-red-50 text-red-700 px-2 py-0.5 rounded border border-red-200 uppercase">{c.code}</span>
                        </div>
                        <p className="text-[11px] font-bold text-slate-700 line-clamp-1">{c.description || minText}</p>
                        <p className="text-[10px] text-slate-400 font-medium">{minText}{maxText}</p>
                        <p className="text-[10px] text-slate-400 font-medium">HSD: {formatDateVN(c.endDate)}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyCoupon(c.code)}
                        className={`w-full py-1.5 px-3 rounded-lg font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 ${isCopied
                            ? 'bg-emerald-600 text-white'
                            : 'bg-red-600 hover:bg-red-700 text-white shadow-xs'
                          }`}
                      >
                        {isCopied ? (
                          <>✓ {language === 'vi' ? 'Đã sao chép!' : 'Copied!'}</>
                        ) : (
                          <>{language === 'vi' ? 'Sao chép mã' : 'Copy code'}</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Hotel Photo Grid Container (Fixed Height, no distortion) */}
          <div className="relative w-full h-[320px] sm:h-[380px] md:h-[440px] rounded-2xl overflow-hidden bg-slate-100 border border-slate-150 shadow-xs">
            {hotel.images.length <= 4 ? (
              /* If hotel has 4 or fewer images: Left main photo (60%) + Right 3 photos grid (40%) */
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 h-full w-full p-0">
                {/* Main Photo (Left 2 columns) */}
                <div
                  onClick={() => { setGalleryActiveIndex(0); setIsGalleryModalOpen(true); }}
                  className="md:col-span-2 h-full w-full min-h-0 overflow-hidden cursor-pointer relative group rounded-xl bg-slate-200"
                >
                  <img
                    src={mainPhoto}
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors" />
                </div>

                {/* Sub Photos Grid (Right 2 columns, 2 rows) */}
                <div className="hidden md:grid grid-cols-2 grid-rows-2 gap-2.5 col-span-2 h-full w-full min-h-0" style={{ gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}>
                  {hotel.images.slice(1, 4).map((img, i) => {
                    const isLast = i === Math.min(2, hotel.images.length - 2);
                    return (
                      <div
                        key={i}
                        onClick={() => { setGalleryActiveIndex(i + 1); setIsGalleryModalOpen(true); }}
                        className="w-full h-full min-h-0 overflow-hidden cursor-pointer relative group rounded-xl bg-slate-200"
                      >
                        <img
                          src={img.url}
                          alt={`${hotel.name} photo ${i + 2}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors" />
                        {isLast && (
                          <div className="absolute inset-0 bg-black/55 hover:bg-black/70 transition-colors flex flex-col items-center justify-center text-white gap-1 p-2 font-black text-xs text-center shadow-inner">
                            <Compass className="w-4 h-4 text-white animate-pulse" />
                            <span className="leading-tight">{language === 'vi' ? `Xem tất cả ${hotel.images.length} hình ảnh` : `View all ${hotel.images.length} photos`}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {/* Fill 4th slot if only 3 images total */}
                  {hotel.images.length === 3 && (
                    <div
                      onClick={() => { setGalleryActiveIndex(0); setIsGalleryModalOpen(true); }}
                      className="w-full h-full min-h-0 overflow-hidden cursor-pointer relative group rounded-xl bg-slate-900 flex flex-col items-center justify-center text-white p-2 text-center"
                    >
                      <Compass className="w-5 h-5 text-white animate-pulse" />
                      <span className="text-xs font-black mt-1 leading-tight">{language === 'vi' ? `Xem tất cả ${hotel.images.length} hình ảnh` : `View all ${hotel.images.length} photos`}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* If hotel has 5 or more images: Left main photo (col-span-2) + Right 6 photos (col-span-3, 3 cols x 2 rows) */
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5 h-full w-full p-0">
                {/* Main Photo (Left 2 Columns) */}
                <div
                  onClick={() => { setGalleryActiveIndex(0); setIsGalleryModalOpen(true); }}
                  className="md:col-span-2 h-full w-full min-h-0 overflow-hidden cursor-pointer relative group rounded-xl bg-slate-200"
                >
                  <img
                    src={mainPhoto}
                    alt={hotel.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors" />
                </div>

                {/* Sub Photos Grid (Right 3 Columns x 2 Rows = 6 Slots) */}
                <div className="hidden md:grid grid-cols-3 grid-rows-2 col-span-3 gap-2.5 h-full w-full min-h-0" style={{ gridTemplateRows: 'repeat(2, minmax(0, 1fr))' }}>
                  {Array.from({ length: 6 }).map((_, i) => {
                    const img = hotel.images[i + 1];
                    const isLastSlot = i === 5 || i === (hotel.images.length - 2);

                    if (!img) {
                      return (
                        <div
                          key={i}
                          onClick={() => { setGalleryActiveIndex(0); setIsGalleryModalOpen(true); }}
                          className="w-full h-full min-h-0 bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-200 rounded-xl cursor-pointer hover:bg-slate-200/60 transition-colors"
                        >
                          {t.bedroomFallback}
                        </div>
                      );
                    }

                    return (
                      <div
                        key={i}
                        onClick={() => { setGalleryActiveIndex(i + 1); setIsGalleryModalOpen(true); }}
                        className="w-full h-full min-h-0 overflow-hidden cursor-pointer relative group rounded-xl bg-slate-200"
                      >
                        <img
                          src={img.url}
                          alt={`${hotel.name} photo ${i + 2}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {!isLastSlot && (
                          <div className="absolute inset-0 bg-black/5 group-hover:bg-black/20 transition-colors" />
                        )}

                        {isLastSlot && (
                          <div className="absolute inset-0 bg-black/55 hover:bg-black/70 transition-colors flex flex-col items-center justify-center text-white gap-1.5 p-2 font-black text-xs sm:text-sm text-center shadow-inner">
                            <Compass className="w-5 h-5 text-white animate-pulse" />
                            <span className="tracking-tight leading-tight">
                              {language === 'vi'
                                ? `Xem tất cả ${hotel.images.length} hình ảnh`
                                : `View all ${hotel.images.length} photos`}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 3-Column Overview Section matching screenshot layout */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 pt-4">
            
            {/* Card 1: Ratings & Review Snippets */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all relative overflow-hidden h-[384px]">
              {/* SVG Background decoration - Full Width Top Header Wave */}
              <div
                className="absolute top-0 left-0 right-0 w-full h-[105px] bg-no-repeat bg-cover bg-top pointer-events-none opacity-90 z-0"
                style={{ backgroundImage: "url('/review.svg')" }}
              />
              <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-between">
                <div>
                  {/* Score & Review Count Header matching Image 1 */}
                  <div className="border-b border-slate-100/80 pb-3">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-black text-[#006ce4] tracking-tight">
                        {displayAverageRating.toString().replace('.', ',')}
                      </span>
                      <span className="text-xs font-bold text-slate-400">/10</span>
                      <div className="ml-2 flex flex-col justify-center">
                        <span className="font-extrabold text-slate-900 text-sm leading-tight">
                          {getRatingLabel(displayAverageRating, language)}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const el = document.getElementById('reviews-section');
                            if (el) el.scrollIntoView({ behavior: 'smooth' });
                          }}
                          className="text-xs font-black text-[#006ce4] hover:underline flex items-center gap-0.5 cursor-pointer leading-tight text-left mt-0.5"
                        >
                          {hotel.reviews.length} {language === 'vi' ? 'đánh giá' : 'reviews'} &rsaquo;
                        </button>
                      </div>
                    </div>
                  </div>

                  <h3 className="font-black text-slate-900 text-sm pt-2 mb-2">
                    {language === 'vi' ? 'Khách nói gì về kỳ nghỉ của họ' : 'What guests say about their stay'}
                  </h3>
                </div>

                {/* Review Snippets List */}
                <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
                  {hotel.reviews && hotel.reviews.length > 0 ? (
                    hotel.reviews.slice(0, 2).map((rev) => (
                      <div key={rev.id} className="bg-slate-50 border border-slate-100 p-3 rounded-xl space-y-1.5 text-xs shadow-2xs">
                        <div className="flex justify-between items-center">
                          <span className="font-extrabold text-slate-700">{rev.user?.fullName || 'Khách lưu trú'}</span>
                          <span className="text-[#006ce4] font-black text-[11px] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                            ★ {normalizeRating(rev.ratingOverall)} / 10
                          </span>
                        </div>
                        <p className="text-slate-600 font-medium line-clamp-3 italic leading-relaxed">
                          "{rev.comment}"
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 font-bold italic py-4 text-center bg-slate-50 rounded-xl border border-slate-100">
                      {language === 'vi' ? 'Chưa có đánh giá nào' : 'No reviews yet'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Card 2: Location & Nearby Landmarks */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all relative overflow-hidden h-[384px]">
              {/* SVG Background decoration for Map - Full Width Top Header */}
              <div
                className="absolute top-0 left-0 right-0 w-full h-[140px] bg-no-repeat bg-cover bg-top pointer-events-none opacity-30 z-0"
                style={{ backgroundImage: "url('/map.svg')" }}
              />
              <div className="space-y-3 relative z-10 flex-1 flex flex-col justify-between overflow-hidden">
                <div>
                  {/* Header with View Map Link */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <h3 className="font-black text-slate-900 text-sm leading-none">
                      {language === 'vi' ? 'Trong khu vực' : 'In the area'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveMapQuery(hotel.name + ' ' + (hotel.address || ''));
                        setIsMapModalOpen(true);
                      }}
                      className="text-xs font-black text-[#006ce4] hover:underline flex items-center gap-0.5 cursor-pointer leading-none"
                    >
                      {language === 'vi' ? 'Xem bản đồ' : 'View map'} &rsaquo;
                    </button>
                  </div>

                  {/* Hotel Address */}
                  <div className="flex items-start gap-2 text-xs font-semibold text-slate-800 pt-2">
                    <svg className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" clipRule="evenodd" d="M12 1C8.13401 1 5 4.13401 5 8C5 12.875 11.2 21.2 11.5 21.6C11.7 21.8 12.3 21.8 12.5 21.6C12.8 21.2 19 12.8 19 8C19 4.13401 15.866 1 12 1ZM12 11.5C10.067 11.5 8.5 9.933 8.5 8C8.5 6.067 10.067 4.5 12 4.5C13.933 4.5 15.5 6.067 15.5 8C15.5 9.933 13.933 11.5 12 11.5Z" />
                    </svg>
                    <span className="leading-snug">{translateAddress(hotel.address, hotel.district.name, hotel.province.name, language)}</span>
                  </div>

                  {/* Tag Badge */}
                  <div className="inline-flex items-center gap-1.5 bg-[#e8f5fd] text-[#0194f3] px-3 py-1 rounded-full text-xs font-bold my-2">
                    <span>🎯</span>
                    <span>{language === 'vi' ? 'Gần khu vui chơi giải trí' : 'Near entertainment area'}</span>
                  </div>
                </div>

                {/* Nearby Locations List */}
                <div className="space-y-2 text-xs pt-1 overflow-y-auto pr-1 flex-1">
                  {hotel.nearbyLocations && hotel.nearbyLocations.length > 0 ? (
                    hotel.nearbyLocations.slice(0, 7).map((loc: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center gap-2">
                        <span className="line-clamp-1 font-bold text-slate-800 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-slate-800 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                            <path fillRule="evenodd" clipRule="evenodd" d="M12 1C8.13401 1 5 4.13401 5 8C5 12.875 11.2 21.2 11.5 21.6C11.7 21.8 12.3 21.8 12.5 21.6C12.8 21.2 19 12.8 19 8C19 4.13401 15.866 1 12 1ZM12 11.5C10.067 11.5 8.5 9.933 8.5 8C8.5 6.067 10.067 4.5 12 4.5C13.933 4.5 15.5 6.067 15.5 8C15.5 9.933 13.933 11.5 12 11.5Z" />
                          </svg>
                          {loc.name}
                        </span>
                        <span className="text-slate-400 font-medium text-[11px] shrink-0">{loc.distance}</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 font-bold italic py-2">
                      {language === 'vi' ? 'Không có thông tin địa điểm lân cận' : 'No nearby location info'}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Card 3: Main Amenities */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-all relative overflow-hidden h-[384px]">
              <div className="space-y-3">
                {/* Header with See More Link */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 h-7">
                  <h3 className="font-black text-slate-800 text-sm leading-none">
                    {language === 'vi' ? 'Tiện ích chính' : 'Main amenities'}
                  </h3>
                  <button
                    type="button"
                    onClick={() => {
                      const el = document.getElementById('facilities-section');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-xs font-extrabold text-[#006ce4] hover:underline flex items-center gap-0.5 cursor-pointer leading-none"
                  >
                    {language === 'vi' ? 'Xem thêm' : 'See more'} &rsaquo;
                  </button>
                </div>

                {/* Main Amenities List */}
                <div className="space-y-3 pt-1">
                  {getFeaturedAmenities().slice(0, 5).map(({ amenity }) => (
                    <div key={amenity.name} className="flex items-center gap-3 p-2 rounded-xl bg-slate-50/70 border border-slate-100">
                      <div className="text-[#006ce4] shrink-0 p-1 bg-white rounded-lg border border-slate-100 shadow-2xs">
                        {getAmenityIcon(amenity.name)}
                      </div>
                      <span className="text-xs font-extrabold text-slate-700 leading-tight">
                        {translateAmenityName(amenity.name)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>

          {/* Giới thiệu chỗ nghỉ (Moved below 3-column overview grid) */}
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-2xs space-y-3">
            <h2 className="font-extrabold text-slate-900 text-base sm:text-lg flex items-center gap-2">
              <span className="w-1.5 h-5 bg-[#006ce4] rounded-full inline-block"></span>
              {language === 'vi' ? `Giới thiệu chỗ nghỉ ${hotel.name}` : `About ${hotel.name}`}
            </h2>
            <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line font-medium">
              {hotel.description}
            </p>
          </div>

          <hr className="border-slate-100" />
          <section id="rooms-section" className="space-y-6">
            {/* Header of Room Selection */}
            <div className="pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {language === 'vi' ? `Những phòng còn trống tại ${hotel.name}` : `Available rooms at ${hotel.name}`}
              </h2>

              {/* Selected Dates Badge */}
              <div className="flex items-center gap-2 bg-blue-50/90 border border-blue-200 text-blue-900 px-4 py-2 rounded-xl text-xs sm:text-sm font-extrabold shadow-2xs self-start sm:self-auto transition-all duration-300">
                <CalendarIcon className="w-4 h-4 text-blue-600 shrink-0" />
                <span>{formatDateDisplay()}</span>
                <span className="bg-blue-600 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full ml-1 shrink-0">
                  {getNightsCount()} {language === 'vi' ? 'đêm' : 'nights'}
                </span>
              </div>
            </div>

            {/* Quick Filters and Price Display Options */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
              <div className="flex-1 flex flex-col gap-3">
                <p className="text-slate-800 font-bold text-sm sm:text-base leading-tight">
                  {language === 'vi' ? 'Tìm kiếm nhanh hơn bằng cách chọn những tiện nghi bạn cần' : 'Find faster by selecting the amenities you need'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {['Miễn phí hủy phòng', 'Extra Benefit', 'Giường lớn ⓘ', 'Miễn phí bữa sáng'].map((tag) => {
                    const lookupTag = tag.replace(' ⓘ', '');
                    const isActive = selectedTags.includes(lookupTag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(lookupTag)}
                        className={`font-semibold text-xs px-4 py-2 rounded-full transition-colors active:scale-95 shadow-sm ${isActive
                          ? 'bg-[#006ce4] text-white hover:bg-[#0056b3]'
                          : 'bg-[#f0f4fa] text-[#006ce4] hover:bg-[#e2edf8]'
                          }`}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="border-l border-slate-200 pl-6 flex flex-col justify-center min-w-[260px] self-stretch md:self-auto">
                <span className="text-[10px] font-bold text-slate-500 mb-1">
                  {language === 'vi' ? 'Hiển thị giá' : 'Show price'}
                </span>
                <div className="relative">
                  <select
                    value={priceShowOption}
                    onChange={(e) => setPriceShowOption(e.target.value)}
                    className="appearance-none bg-white border border-slate-200 text-slate-700 font-bold text-xs pl-3 pr-8 py-2.5 rounded-lg focus:outline-none focus:border-blue-500 shadow-sm w-full cursor-pointer"
                  >
                    <option value="per_night_excl">
                      {language === 'vi' ? 'Mỗi phòng mỗi đêm (chưa bao gồm thuế và phí)' : 'Room per night (excl. tax & fees)'}
                    </option>
                    <option value="per_night_incl">
                      {language === 'vi' ? 'Mỗi phòng mỗi đêm (bao gồm thuế và phí)' : 'Room per night (incl. tax & fees)'}
                    </option>
                    <option value="total_excl">
                      {language === 'vi' ? `Tổng giá (chưa bao gồm thuế và phí)` : `Total price (excl. tax & fees)`}
                    </option>
                    <option value="total_incl">
                      {language === 'vi' ? `Tổng giá (bao gồm thuế và phí)` : `Total price (incl. tax & fees)`}
                    </option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-500">
                    <ChevronDown className="w-3.5 h-3.5" />
                  </div>
                </div>
              </div>
            </div>

            {/* List of Room Types Blocks */}
            <div className="space-y-6">
              {groupRoomTypes().map((group) => {
                const representative = group.roomTypes[0];
                return (
                  <div
                    key={group.baseName}
                    className="border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 relative overflow-hidden"
                    style={{
                      backgroundImage: "url('/room-background.svg')",
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                  >
                    {/* Lớp phủ trắng nhẹ giữ độ tương phản nội dung */}
                    <div className="absolute inset-0 bg-white/60 pointer-events-none z-0" />

                    {/* Room Type Header spanning full width at top */}
                    <h3 className="font-extrabold text-slate-900 text-xl pb-1 relative z-10">{group.baseName}</h3>

                    <div className="flex flex-col lg:flex-row gap-6 items-start relative z-10">
                      {/* Left Column: Room visual info (transparent background to reveal SVG pattern) */}
                      <div className="w-full lg:w-[350px] flex flex-col gap-4 shrink-0 bg-transparent">
                        <div className="relative rounded-xl overflow-hidden aspect-[4/3] w-full bg-slate-100 shadow-sm group">
                          {(() => {
                            const imgIdx = activeImageIndices[group.baseName] || 0;
                            const roomImages = representative.images && representative.images.length > 0
                              ? representative.images
                              : [{ url: 'https://images.unsplash.com/photo-1611891405788-d880227f73b4' }];
                            return (
                              <>
                                <img
                                  src={roomImages[imgIdx]?.url}
                                  alt={group.baseName}
                                  className="w-full h-full object-cover hover:scale-102 transition-transform duration-300"
                                />
                                {roomImages.length > 1 && (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => setActiveImageIndices(prev => ({
                                        ...prev,
                                        [group.baseName]: imgIdx === 0 ? roomImages.length - 1 : imgIdx - 1
                                      }))}
                                      className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-1.5 rounded-full shadow-md z-10 transition-all opacity-0 group-hover:opacity-100 active:scale-95 flex items-center justify-center"
                                    >
                                      <ChevronLeft className="w-4 h-4 text-slate-800" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setActiveImageIndices(prev => ({
                                        ...prev,
                                        [group.baseName]: (imgIdx + 1) % roomImages.length
                                      }))}
                                      className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 p-1.5 rounded-full shadow-md z-10 transition-all opacity-0 group-hover:opacity-100 active:scale-95 flex items-center justify-center"
                                    >
                                      <ChevronRight className="w-4 h-4 text-slate-800" />
                                    </button>
                                  </>
                                )}
                                {/* Carousel dots */}
                                <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1 z-10">
                                  {roomImages.map((_, i) => (
                                    <span
                                      key={i}
                                      className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIdx ? 'bg-[#006ce4]' : 'bg-white/70'
                                        }`}
                                    ></span>
                                  ))}
                                </div>
                              </>
                            );
                          })()}
                        </div>

                        {/* Specs: NO background, NO borders, larger text */}
                        <div className="space-y-3 text-sm text-slate-700 font-bold">
                          <div className="flex items-center gap-2">
                            <Ruler className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                            <span>{language === 'vi' ? 'Diện tích:' : 'Size:'} {representative.size || 25} m²</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Bed className="w-4.5 h-4.5 text-slate-400 shrink-0" />
                            <span>{representative.bedCount} {representative.bedType || (language === 'vi' ? 'Giường lớn' : 'Large beds')}</span>
                          </div>

                          <div className="flex items-center gap-2">
                            <Wifi className="w-4.5 h-4.5 text-[#006ce4] shrink-0" />
                            <span>{language === 'vi' ? 'WiFi miễn phí' : 'Free WiFi'}</span>
                          </div>

                          {/* Basic amenities list */}
                          <div className="space-y-1.5 pt-2.5 border-t border-slate-100 text-slate-500 font-semibold text-xs">
                            {representative.amenities && representative.amenities.slice(0, 4).map((a) => (
                              <div key={a} className="flex items-center gap-1.5">
                                <span className="text-slate-355">•</span>
                                <span>{translateAmenityName(a)}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Details button */}
                        <button
                          type="button"
                          onClick={() => setSelectedRoomForModal(representative)}
                          className="w-full bg-[#006ce4] hover:bg-[#0056b3] text-white font-extrabold text-xs py-2.5 px-4 rounded-full flex items-center justify-center gap-1 shadow transition-colors active:scale-95 mt-2"
                        >
                          {language === 'vi' ? 'Xem chi tiết phòng' : 'View room details'}
                          <span className="text-[10px]">▶</span>
                        </button>
                      </div>

                      {/* Right Column: Options Table wrapped in a border box, larger text */}
                      <div className="w-full lg:flex-1 overflow-x-auto">
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                          <table className="min-w-full divide-y divide-slate-200 text-sm table-fixed w-full">
                            <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                              <tr>
                                <th className="px-5 py-3.5 w-[32%] text-left border-r border-slate-200">{language === 'vi' ? 'Lựa chọn phòng' : 'Room options'}</th>
                                <th className="px-2 py-3.5 text-center w-[10%] border-r border-slate-200">{language === 'vi' ? 'Khách' : 'Guests'}</th>
                                <th className="px-4 py-3.5 w-[25%] text-right border-r border-slate-200">{language === 'vi' ? 'Giá/phòng/đêm' : 'Price/room/night'}</th>
                                <th className="px-2 py-3.5 text-center w-[15%] border-r border-slate-200">{language === 'vi' ? 'Phòng' : 'Rooms'}</th>
                                <th className="px-2 py-3.5 text-center w-[18%]"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-slate-700 font-medium bg-white text-xs sm:text-sm">
                              {group.roomTypes.flatMap((rt) => {
                                const plans = rt.ratePlans && rt.ratePlans.length > 0 ? rt.ratePlans : [null];
                                return plans.map((plan: any) => {
                                  const key = plan ? `${rt.id}_${plan.id}` : rt.id;
                                  let planPrice = rt.calculatedPrice;
                                  if (plan) {
                                    if (plan.priceModifierType === 'PERCENTAGE_DISCOUNT') {
                                      planPrice = rt.calculatedPrice * (1 - parseFloat(plan.priceModifierValue.toString()) / 100);
                                    } else if (plan.priceModifierType === 'AMOUNT_DISCOUNT') {
                                      planPrice = Math.max(0, rt.calculatedPrice - parseFloat(plan.priceModifierValue.toString()));
                                    } else if (plan.priceModifierType === 'FIXED_PRICE' && parseFloat(plan.priceModifierValue.toString()) > 0) {
                                      planPrice = parseFloat(plan.priceModifierValue.toString());
                                    }
                                  }

                                  const maxQty = rt.availableRooms;
                                  const qty = maxQty <= 0 ? 0 : Math.min(selectedQuantities[key] || 1, maxQty);
                                  const priceQty = Math.max(1, qty);

                                  return (
                                    <tr key={key} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100">
                                      {/* Option Name & Description from DB */}
                                      <td className="px-5 py-5 w-[32%] border-r border-slate-100 break-words">
                                        <div className="space-y-2">
                                          {/* Tên phòng / hạng phòng (fontsize 12px) */}
                                          <p className="font-medium text-slate-600 text-[12px] leading-snug">{rt.name}</p>

                                          {/* Trạng thái bữa sáng */}
                                          {rt.includeBreakfast ? (
                                            <p className="font-extrabold text-emerald-600 text-xs sm:text-sm">
                                              {language === 'vi' ? 'Bao gồm bữa sáng 🍳' : 'Breakfast included 🍳'}
                                            </p>
                                          ) : (
                                            <p className="font-extrabold text-slate-900 text-xs sm:text-sm">
                                              {language === 'vi' ? 'Không gồm bữa sáng' : 'Breakfast not included'}
                                            </p>
                                          )}

                                          {/* Thông tin Giường của phòng */}
                                          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
                                            <Bed className="w-4 h-4 text-slate-700 shrink-0" />
                                            <span>
                                              {rt.bedType ? rt.bedType : `${rt.bedCount || 1} ${language === 'vi' ? 'giường lớn' : 'large bed'}`}
                                            </span>
                                          </div>

                                          {/* Chính sách hủy phòng & Thanh toán (Check icon w-4 h-4, font-bold, căn thẳng hàng) */}
                                          <div className="space-y-1.5 pt-0.5 text-xs font-bold">
                                            {/* Chính sách hủy phòng */}
                                            {plan ? (
                                              <div className="flex items-center gap-2">
                                                {plan.cancellationPolicy === 'NON_REFUNDABLE' ? (
                                                  <>
                                                    <Check className="w-4 h-4 text-slate-700 shrink-0" />
                                                    <span className="text-slate-700 font-bold">
                                                      {language === 'vi' ? 'Không được hoàn tiền' : 'Non-refundable'}
                                                    </span>
                                                  </>
                                                ) : (
                                                  <>
                                                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                                                    <span className="text-emerald-600 font-bold">
                                                      {language === 'vi' ? `Miễn phí hủy trước ${plan.freeCancelHoursBefore || 24}h` : `Free cancellation up to ${plan.freeCancelHoursBefore || 24}h`}
                                                    </span>
                                                  </>
                                                )}
                                              </div>
                                            ) : (
                                              rt.cancellationPolicy && (
                                                <div className="flex items-center gap-2">
                                                  <Check className={`w-4 h-4 shrink-0 ${rt.cancellationPolicy === 'NON_REFUNDABLE' ? 'text-slate-700' : 'text-emerald-600'}`} />
                                                  <span className={`font-bold ${rt.cancellationPolicy === 'NON_REFUNDABLE' ? 'text-slate-700' : 'text-emerald-600'}`}>
                                                    {rt.cancellationPolicy === 'NON_REFUNDABLE'
                                                      ? (language === 'vi' ? 'Không được hoàn tiền' : 'Non-refundable')
                                                      : (language === 'vi' ? 'Áp dụng chính sách hủy phòng' : 'Cancellation policy applies')
                                                    }
                                                  </span>
                                                </div>
                                              )
                                            )}

                                            {/* Thanh toán / Phương thức (Icon check, bỏ 100%, text font-bold) */}
                                            {plan ? (
                                              <div className="flex items-center gap-2 text-[#006ce4]">
                                                <Check className="w-4 h-4 text-[#006ce4] shrink-0" />
                                                <span className="text-[#006ce4] font-bold">
                                                  {plan.paymentPolicy === 'PAY_ONLINE'
                                                    ? (language === 'vi' ? 'Thanh toán online' : 'Pay online')
                                                    : plan.paymentPolicy === 'DEPOSIT'
                                                      ? (language === 'vi' ? `Đặt cọc ${plan.depositType === 'PERCENTAGE' ? plan.depositValue + '%' : Number(plan.depositValue).toLocaleString('vi-VN') + 'đ'} trước` : `Deposit required`)
                                                      : (language === 'vi' ? 'Thanh toán tại chỗ nghỉ' : 'Pay at property')}
                                                </span>
                                              </div>
                                            ) : (
                                              rt.paymentPolicy && (
                                                <div className="flex items-center gap-1.5 text-[#006ce4] font-medium">
                                                  <span>✓</span>
                                                  <span>
                                                    {rt.paymentPolicy === 'PAY_ONLINE'
                                                      ? (language === 'vi' ? 'Thanh toán trực tuyến' : 'Pay online')
                                                      : (language === 'vi' ? 'Thanh toán tại chỗ nghỉ' : 'Pay at property')}
                                                  </span>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        </div>
                                      </td>

                                      {/* Capacity */}
                                      <td className="px-3 py-5 w-[10%] border-r border-slate-100 text-center">
                                        <div className="flex justify-center items-center gap-1">
                                          {rt.capacity < 4 ? (
                                            Array.from({ length: Math.max(1, rt.capacity || 1) }).map((_, i) => (
                                              <User key={i} className="w-4 h-4 text-slate-700 shrink-0 inline-block" />
                                            ))
                                          ) : (
                                            <div className="flex items-center gap-1 font-bold text-slate-800">
                                              <User className="w-4 h-4 text-slate-700 shrink-0 inline-block" />
                                              <span className="text-xs font-bold text-slate-800 leading-none">{rt.capacity}</span>
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* Price per night */}
                                      <td className="px-5 py-6 w-[25%] border-r border-slate-100 text-right">
                                        <div className="space-y-1">
                                          {planPrice < rt.basePrice && (
                                            <p className="text-xs text-slate-400 font-semibold line-through">
                                              {formatPrice(getDisplayBasePrice(rt) * priceQty, currency)}
                                            </p>
                                          )}
                                          <p className="font-black text-[#ff4d42] text-base sm:text-lg leading-none">
                                            {formatPrice(getDisplayPrice(rt, planPrice) * priceQty, currency)}
                                          </p>
                                          <p className="text-xs text-slate-500 font-normal leading-tight pt-0.5">
                                            {getPriceSubtitle()}
                                          </p>
                                        </div>
                                      </td>

                                      {/* Room Select Dropdown */}
                                      <td className="px-3 py-6 w-[15%] border-r border-slate-100 font-bold text-slate-800">
                                        <div className="flex justify-center items-center">
                                          <select
                                            value={qty}
                                            disabled={maxQty <= 0}
                                            onChange={(e) => setSelectedQuantities(prev => ({ ...prev, [key]: Number(e.target.value) }))}
                                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-sm w-16 disabled:bg-slate-50 disabled:text-slate-400"
                                          >
                                            {maxQty <= 0 ? (
                                              <option value={0}>x0</option>
                                            ) : (
                                              Array.from({ length: maxQty }).map((_, i) => (
                                                <option key={i + 1} value={i + 1}>x{i + 1}</option>
                                              ))
                                            )}
                                          </select>
                                        </div>
                                      </td>

                                      {/* Action Button */}
                                      <td className="px-3 py-6 w-[18%] text-center">
                                        <div className="space-y-2 flex flex-col items-center justify-center">
                                          <button
                                            type="button"
                                            onClick={() => handleBookRoom(rt.id, plan?.id)}
                                            disabled={rt.isBlocked || rt.availableRooms <= 0}
                                            className="bg-[#006ce4] hover:bg-[#0056b3] disabled:bg-slate-200 disabled:text-slate-400 text-white font-extrabold text-sm py-2.5 rounded-lg transition-all active:scale-[0.98] shadow-sm w-24 text-center"
                                          >
                                            {language === 'vi' ? 'Chọn' : 'Select'}
                                          </button>
                                          {rt.isBlocked ? (
                                            <p className="text-[10px] text-slate-400 font-black whitespace-nowrap">
                                              {t.roomClosed}
                                            </p>
                                          ) : rt.availableRooms <= 0 ? (
                                            <p className="text-[10px] text-red-500 font-black whitespace-nowrap">
                                              {t.noRoomsAvailable}
                                            </p>
                                          ) : rt.availableRooms <= 5 ? (
                                            <p className="text-[10px] text-red-500 font-black whitespace-nowrap">
                                              {language === 'vi' ? `Chỉ còn ${rt.availableRooms} phòng` : `Only ${rt.availableRooms} left`}
                                            </p>
                                          ) : null}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                });
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Nearby Locations Section */}
          <section id="location-section" className="space-y-6 pt-4">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="w-1.5 h-6 bg-[#006ce4] rounded-full inline-block"></span>
              {language === 'vi' ? `Xung quanh ${hotel.name} có gì` : `What's around ${hotel.name}`}
            </h2>
            {hotel.address && (
              <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5 -mt-3">
                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                {translateAddress(hotel.address, hotel.district.name, hotel.province.name, language)}
              </p>
            )}

            {/* Google Map Embed Iframe Container (Click to open Fullscreen Modal) */}
            <div
              onClick={() => {
                setActiveMapQuery(hotel.name + ' ' + (hotel.address || ''));
                setIsMapModalOpen(true);
              }}
              className="w-full h-[280px] rounded-premium overflow-hidden border border-slate-200 shadow-sm relative cursor-pointer group"
            >
              {/* Overlay blocking events and showing prompt on hover */}
              <div className="absolute inset-0 z-10 bg-transparent hover:bg-slate-900/5 transition-all flex items-center justify-center">
                <span className="bg-white/95 text-slate-800 font-extrabold text-xs py-2.5 px-4 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0 flex items-center gap-1.5 border border-slate-100">
                  <Compass className="w-3.5 h-3.5 animate-spin-slow text-[#006ce4]" />
                  {language === 'vi' ? 'Nhấn để mở bản đồ tương tác' : 'Click to open interactive map'}
                </span>
              </div>
              <LeafletMap
                lat={hotel.latitude || 11.94}
                lng={hotel.longitude || 108.44}
                hotelName={hotel.name}
              />
            </div>

            {/* 4 Column Nearby Grid */}
            {hotel.nearbyLocations && hotel.nearbyLocations.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 pt-2">
                {/* Column 1: Địa Điểm Lân Cận */}
                <div className="space-y-3.5">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <MapPin className="w-4.5 h-4.5 text-[#006ce4]" />
                    {language === 'vi' ? 'Địa Điểm Lân Cận' : 'Nearby Landmarks'}
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-655 font-bold">
                    {hotel.nearbyLocations
                      .filter((loc: any) => loc.type === 'NEARBY')
                      .map((loc: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center gap-2">
                          <span className="line-clamp-1 font-semibold text-slate-700">{loc.name}</span>
                          <span className="text-slate-450 font-normal shrink-0">{loc.distance}</span>
                        </div>
                      ))}
                    {hotel.nearbyLocations.filter((loc: any) => loc.type === 'NEARBY').length === 0 && (
                      <p className="text-slate-400 font-normal text-[11px] italic">{language === 'vi' ? 'Không có thông tin' : 'No information'}</p>
                    )}
                  </div>
                </div>

                {/* Column 2: Trung tâm Giao thông */}
                <div className="space-y-3.5">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Compass className="w-4.5 h-4.5 text-[#006ce4]" />
                    {language === 'vi' ? 'Trung tâm Giao thông' : 'Transportation'}
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-655 font-bold">
                    {hotel.nearbyLocations
                      .filter((loc: any) => loc.type === 'TRANSPORT')
                      .map((loc: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center gap-2">
                          <span className="line-clamp-1 font-semibold text-slate-700">{loc.name}</span>
                          <span className="text-slate-450 font-normal shrink-0">{loc.distance}</span>
                        </div>
                      ))}
                    {hotel.nearbyLocations.filter((loc: any) => loc.type === 'TRANSPORT').length === 0 && (
                      <p className="text-slate-400 font-normal text-[11px] italic">{language === 'vi' ? 'Không có thông tin' : 'No information'}</p>
                    )}
                  </div>
                </div>

                {/* Column 3: Trung tâm giải trí */}
                <div className="space-y-3.5">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <Sparkles className="w-4.5 h-4.5 text-[#006ce4]" />
                    {language === 'vi' ? 'Trung tâm giải trí' : 'Entertainment'}
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-655 font-bold">
                    {hotel.nearbyLocations
                      .filter((loc: any) => loc.type === 'ENTERTAINMENT')
                      .map((loc: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center gap-2">
                          <span className="line-clamp-1 font-semibold text-slate-700">{loc.name}</span>
                          <span className="text-slate-450 font-normal shrink-0">{loc.distance}</span>
                        </div>
                      ))}
                    {hotel.nearbyLocations.filter((loc: any) => loc.type === 'ENTERTAINMENT').length === 0 && (
                      <p className="text-slate-400 font-normal text-[11px] italic">{language === 'vi' ? 'Không có thông tin' : 'No information'}</p>
                    )}
                  </div>
                </div>

                {/* Column 4: Khác */}
                <div className="space-y-3.5">
                  <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                    <MoreHorizontal className="w-4.5 h-4.5 text-[#006ce4]" />
                    {language === 'vi' ? 'Khác' : 'Others'}
                  </h3>
                  <div className="space-y-2.5 text-xs text-slate-655 font-bold">
                    {hotel.nearbyLocations
                      .filter((loc: any) => loc.type === 'OTHER')
                      .map((loc: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center gap-2">
                          <span className="line-clamp-1 font-semibold text-slate-700">{loc.name}</span>
                          <span className="text-slate-450 font-normal shrink-0">{loc.distance}</span>
                        </div>
                      ))}
                    {hotel.nearbyLocations.filter((loc: any) => loc.type === 'OTHER').length === 0 && (
                      <p className="text-slate-400 font-normal text-[11px] italic">{language === 'vi' ? 'Không có thông tin' : 'No information'}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

          <hr className="border-slate-100" />

          {/* Detailed Grouped Amenities Section */}
          <section id="facilities-section" className="space-y-6 pt-2">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="w-1.5 h-6 bg-[#006ce4] rounded-full inline-block"></span>
              {language === 'vi' ? 'Các tiện nghi tại khách sạn' : 'Hotel Facilities & Amenities'}
            </h2>

            {/* Popular amenities bar (Horizontal) */}
            {(() => {
              const popularKeywords = ['wifi', 'hồ bơi', 'đỗ xe', 'đậu xe', 'phòng gym', 'thể hình', 'spa', 'massage', 'nhà hàng', 'quầy bar', 'dịch vụ phòng'];
              const popularItems = hotel.amenities.filter(({ amenity }) =>
                popularKeywords.some(kw => amenity.name.toLowerCase().includes(kw))
              );

              if (popularItems.length === 0) return null;
              return (
                <div className="bg-slate-50 border border-slate-200/60 p-5 rounded-2xl space-y-3.5">
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    {language === 'vi' ? 'Các tiện nghi được ưa chuộng nhất' : 'Most popular facilities'}
                  </h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-3 text-emerald-600 font-extrabold text-xs sm:text-sm">
                    {popularItems.map(({ amenity }) => (
                      <div key={amenity.name} className="flex items-center gap-2">
                        <span className="shrink-0 text-emerald-650">
                          {getAmenityIcon(amenity.name, "w-4 h-4 sm:w-4.5 sm:h-4.5")}
                        </span>
                        <span>{translateAmenityName(amenity.name)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Columns of Grouped Categories */}
            <div className="columns-1 md:columns-2 lg:columns-3 gap-8 [column-fill:balance] pt-2">
              {groupedAmenities.map((cat) => (
                <div key={cat.titleVi} className="break-inside-avoid-column mb-6 space-y-3">
                  <h3 className="font-extrabold text-slate-800 text-sm sm:text-base flex items-center gap-2 pb-1.5">
                    <span className="text-[#006ce4] shrink-0">{cat.icon}</span>
                    <span>{language === 'vi' ? cat.titleVi : cat.titleEn}</span>
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-655 font-bold pl-0.5">
                    {cat.items.map((item) => (
                      <li key={item} className="flex items-start gap-2.5">
                        <span className="text-emerald-500 font-black text-xs shrink-0 mt-0.5">✓</span>
                        <span className="text-slate-700 font-semibold leading-tight">{translateAmenityName(item)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Section: Policies and General Info */}
          <section id="policies-section" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Left Column: Title Box */}
              <div className="md:col-span-1 bg-[#ebf3ff]/50 p-6 rounded-2xl flex flex-col justify-between">
                <h3 className="font-extrabold text-slate-800 text-base sm:text-lg leading-snug">
                  {language === 'vi'
                    ? `Chính sách và những thông tin liên quan của ${hotel.name}`
                    : `Policies and related info of ${hotel.name}`
                  }
                </h3>
                <Info className="hidden md:block text-slate-400 w-8 h-8 stroke-[2.5] opacity-25 mt-4 align-bottom" />
              </div>

              {/* Right Column: Policies List */}
              <div className="md:col-span-2 space-y-6">
                <div className="border border-slate-200 bg-white rounded-2xl shadow-sm divide-y divide-slate-150 overflow-hidden text-xs sm:text-sm font-semibold text-slate-700">
                  {/* Row 1: Nhận phòng */}
                  <div className="grid grid-cols-1 md:grid-cols-10 p-5 gap-4">
                    <div className="md:col-span-3 flex items-start gap-2.5 font-extrabold text-slate-900">
                      <LogIn className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{language === 'vi' ? 'Nhận phòng' : 'Check-in'}</span>
                    </div>
                    <div className="md:col-span-7 text-slate-600 space-y-1.5">
                      <p className="font-extrabold text-slate-800">{language === 'vi' ? `Từ ${hotel.checkInTime || '15:00'}` : `From ${hotel.checkInTime || '15:00'}`}</p>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {language === 'vi'
                          ? 'Khách được yêu cầu xuất trình giấy tờ tùy thân có ảnh và thẻ tín dụng lúc nhận phòng.'
                          : 'Guests are required to show a photo ID and credit card upon check-in.'}
                      </p>
                      <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        {language === 'vi'
                          ? 'Trước đó bạn sẽ cần cho chỗ nghỉ biết giờ bạn sẽ đến nơi.'
                          : 'You\'ll need to let the property know in advance what time you\'ll arrive.'}
                      </p>
                    </div>
                  </div>

                  {/* Row 2: Trả phòng */}
                  <div className="grid grid-cols-1 md:grid-cols-10 p-5 gap-4">
                    <div className="md:col-span-3 flex items-start gap-2.5 font-extrabold text-slate-900">
                      <LogOut className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{language === 'vi' ? 'Trả phòng' : 'Check-out'}</span>
                    </div>
                    <div className="md:col-span-7 text-slate-600">
                      <p className="font-extrabold text-slate-800">{language === 'vi' ? `Đến ${hotel.checkOutTime || '11:00'}` : `Until ${hotel.checkOutTime || '11:00'}`}</p>
                    </div>
                  </div>

                  {/* Row 3: Hủy đặt phòng/ Trả trước */}
                  <div className="grid grid-cols-1 md:grid-cols-10 p-5 gap-4">
                    <div className="md:col-span-3 flex items-start gap-2.5 font-extrabold text-slate-900">
                      <Info className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{language === 'vi' ? 'Hủy đặt phòng/ Trả trước' : 'Cancellation/ Prepayment'}</span>
                    </div>
                    <div className="md:col-span-7 text-slate-500 font-medium leading-relaxed text-xs">
                      {language === 'vi'
                        ? 'Các chính sách hủy và thanh toán trước sẽ khác nhau tùy vào từng loại chỗ nghỉ. Vui lòng nhập ngày lưu trú và xem điều kiện áp dụng cho lựa chọn chỗ nghỉ của bạn.'
                        : 'Cancellation and prepayment policies vary according to accommodation type. Please check what conditions apply to your preferred room.'}
                    </div>
                  </div>

                  {/* Row 4: Trẻ em và giường */}
                  <div className="grid grid-cols-1 md:grid-cols-10 p-5 gap-4">
                    <div className="md:col-span-3 flex items-start gap-2.5 font-extrabold text-slate-900">
                      <Baby className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{language === 'vi' ? 'Trẻ em và giường' : 'Children & Beds'}</span>
                    </div>
                    <div className="md:col-span-7 space-y-4">
                      {/* Chính sách trẻ em */}
                      <div className="space-y-1">
                        <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm">{language === 'vi' ? 'Chính sách trẻ em' : 'Child policies'}</h5>
                        <p className="text-slate-650 text-xs sm:text-sm font-bold">{language === 'vi' ? 'Phù hợp cho tất cả trẻ em.' : 'Suitable for all children.'}</p>
                        <p className="text-slate-600 text-xs sm:text-sm font-medium">
                          {language === 'vi'
                            ? 'Trẻ em từ 3 tuổi trở lên sẽ được tính giá như người lớn tại chỗ nghỉ này.'
                            : 'Children aged 3 years and above are considered adults at this property.'}
                        </p>
                        <p className="text-xs text-slate-450 font-medium italic pt-1">
                          {language === 'vi'
                            ? 'Để xem thông tin giá và tình trạng phòng trống chính xác, vui lòng thêm số lượng và độ tuổi của trẻ em trong nhóm của bạn khi tìm kiếm.'
                            : 'To see correct prices and occupancy info, please add the number and ages of children in your group to your search.'}
                        </p>
                      </div>

                      {/* Chính sách nôi cũi & giường phụ */}
                      <div className="space-y-3 pt-3 border-t border-slate-100">
                        <h5 className="font-extrabold text-slate-800 text-xs sm:text-sm">{language === 'vi' ? 'Chính sách nôi (cũi) và giường phụ' : 'Crib and extra bed policies'}</h5>

                        {/* Crib details box */}
                        <div className="border border-slate-200 rounded-xl overflow-hidden text-xs max-w-md bg-slate-50/50 shadow-sm">
                          <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 font-extrabold text-slate-700">
                            0 - 2 {language === 'vi' ? 'tuổi' : 'years old'}
                          </div>
                          <div className="px-4 py-3 flex justify-between items-center font-bold text-slate-700">
                            <span className="flex items-center gap-1.5">
                              <Baby className="w-4 h-4 text-slate-500 shrink-0" />
                              <span>{language === 'vi' ? 'Có nôi/cũi nếu yêu cầu' : 'Crib upon request'}</span>
                            </span>
                            <span className="text-emerald-650 font-black">{language === 'vi' ? 'Miễn phí' : 'Free'}</span>
                          </div>
                        </div>

                        <ul className="list-disc pl-4 space-y-1.5 text-xs text-slate-500 font-medium">
                          <li>{language === 'vi' ? 'Số lượng nôi/cũi được phép tùy thuộc vào tùy chọn của bạn. Vui lòng kiểm tra tùy chọn mà bạn đã chọn để biết thêm thông tin.' : 'The number of cribs allowed depends on your selection. Please check your choice for more details.'}</li>
                          <li>{language === 'vi' ? 'Chỗ nghỉ này không có giường phụ.' : 'This property does not offer extra beds.'}</li>
                          <li>{language === 'vi' ? 'Tất cả nôi/cũi tùy thuộc vào tình trạng có sẵn.' : 'All cribs are subject to availability.'}</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Row 8: Hút thuốc */}
                  <div className="grid grid-cols-1 md:grid-cols-10 p-5 gap-4">
                    <div className="md:col-span-3 flex items-start gap-2.5 font-extrabold text-slate-900">
                      <Ban className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{language === 'vi' ? 'Hút thuốc' : 'Smoking'}</span>
                    </div>
                    <div className="md:col-span-7 text-slate-600 font-semibold">
                      {language === 'vi' ? 'Không cho phép hút thuốc.' : 'Smoking is not allowed.'}
                    </div>
                  </div>

                  {/* Row 9: Tiệc tùng */}
                  <div className="grid grid-cols-1 md:grid-cols-10 p-5 gap-4">
                    <div className="md:col-span-3 flex items-start gap-2.5 font-extrabold text-slate-900">
                      <GlassWater className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{language === 'vi' ? 'Tiệc tùng' : 'Parties'}</span>
                    </div>
                    <div className="md:col-span-7 text-slate-600 font-semibold">
                      {language === 'vi' ? 'Không cho phép tiệc tùng/sự kiện.' : 'Parties/events are not allowed.'}
                    </div>
                  </div>

                  {/* Row 10: Thời gian yên lặng */}
                  <div className="grid grid-cols-1 md:grid-cols-10 p-5 gap-4">
                    <div className="md:col-span-3 flex items-start gap-2.5 font-extrabold text-slate-900">
                      <Moon className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{language === 'vi' ? 'Thời gian yên lặng' : 'Quiet hours'}</span>
                    </div>
                    <div className="md:col-span-7 text-slate-600 font-semibold">
                      {language === 'vi' ? 'Khách cần giữ yên lặng từ 22:00 đến 07:00.' : 'Guests must keep quiet between 22:00 and 07:00.'}
                    </div>
                  </div>

                  {/* Row 11: Vật nuôi */}
                  <div className="grid grid-cols-1 md:grid-cols-10 p-5 gap-4">
                    <div className="md:col-span-3 flex items-start gap-2.5 font-extrabold text-slate-900">
                      <Footprints className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                      <span>{language === 'vi' ? 'Vật nuôi' : 'Pets'}</span>
                    </div>
                    <div className="md:col-span-7 text-slate-600 font-semibold">
                      {language === 'vi' ? 'Vật nuôi không được phép.' : 'Pets are not allowed.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <hr className="border-slate-100" />

          {/* Review and Ratings */}
          <section id="reviews-section" className="space-y-6">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2.5">
              <span className="w-1.5 h-6.5 bg-[#006ce4] rounded-full inline-block"></span>
              {t.reviewsTitle}
            </h2>

            {/* Top Part: Ratings Summary (Horizontal Layout) */}
            {hotel.reviews.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 border border-slate-200/50 p-6 rounded-2xl">
                {/* Column 1: Big Overall Rating Score */}
                <div className="flex flex-col justify-center items-center text-center p-4 border-b md:border-b-0 md:border-r border-slate-200">
                  <div className="flex items-baseline gap-1">
                    <span className="text-6xl font-black text-[#006ce4] tracking-tighter">
                      {displayAverageRating}
                    </span>
                    <span className="text-base font-bold text-slate-400">/ 10</span>
                  </div>
                  <div className="mt-3">
                    <p className="font-extrabold text-slate-800 text-lg">
                      {getRatingLabel(displayAverageRating, language)}
                    </p>
                    <p className="text-xs text-slate-455 font-bold mt-0.5">
                      {t.reviewsCount(hotel.reviews.length)}
                    </p>
                  </div>

                  {/* Write review button */}
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="mt-5 w-full bg-[#006ce4] hover:bg-[#0056b3] text-white font-extrabold text-sm py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      {showReviewForm
                        ? (language === 'vi' ? 'Đóng khung đánh giá' : 'Close review form')
                        : (language === 'vi' ? 'Viết đánh giá của bạn' : 'Write a review')
                      }
                    </button>
                  ) : (
                    <p className="text-xs text-slate-500 font-bold mt-5 text-center bg-slate-100/60 px-3 py-2.5 rounded-xl border border-slate-250/50 w-full">
                      {language === 'vi' ? 'Đăng nhập để gửi đánh giá' : 'Log in to submit a review'}
                    </p>
                  )}
                </div>

                {/* Column 2 & 3: 5 Criteria Progress Bars */}
                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 p-2 justify-center content-center text-sm font-bold text-slate-600">
                  {[
                    { name: t.cleanliness, score: criteriaScores.cleanliness },
                    { name: t.location, score: criteriaScores.location },
                    { name: t.service, score: criteriaScores.service },
                    { name: t.facilities, score: criteriaScores.facilities },
                    { name: t.valueRating, score: criteriaScores.value },
                  ].map((crit) => (
                    <div key={crit.name} className="space-y-1.5">
                      <div className="flex justify-between text-slate-700 text-sm">
                        <span>{crit.name}</span>
                        <span className="text-[#006ce4] font-extrabold">{crit.score} / 10</span>
                      </div>
                      <div className="w-full bg-slate-200/60 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-[#006ce4] h-full rounded-full" style={{ width: `${(crit.score / 10) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Part: Review Form & Comments List */}
            <div className="space-y-6">
              {/* If no reviews and logged in */}
              {hotel.reviews.length === 0 && (
                <div className="bg-slate-50 border border-slate-200/60 p-8 rounded-2xl text-center space-y-4">
                  <p className="text-slate-400 text-sm font-semibold">{t.noReviews}</p>
                  {isLoggedIn ? (
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(!showReviewForm)}
                      className="bg-[#006ce4] hover:bg-[#0056b3] text-white font-extrabold text-sm py-2.5 px-5 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-2 mx-auto"
                    >
                      <Sparkles className="w-4 h-4" />
                      {showReviewForm
                        ? (language === 'vi' ? 'Đóng khung đánh giá' : 'Close review form')
                        : (language === 'vi' ? 'Viết đánh giá đầu tiên' : 'Write the first review')
                      }
                    </button>
                  ) : (
                    <p className="text-xs text-slate-455 font-bold">
                      {language === 'vi' ? 'Vui lòng đăng nhập để gửi đánh giá.' : 'Please log in to submit a review.'}
                    </p>
                  )}
                </div>
              )}

              {/* Review Submission Form (full-width) */}
              {showReviewForm && (
                <form onSubmit={handleSubmitReview} className="bg-slate-50 border border-slate-200/60 p-6 rounded-2xl space-y-5 animate-in slide-in-from-top-3 duration-200">
                  <div className="border-b border-slate-200/80 pb-3">
                    <h3 className="font-black text-slate-800 text-base">
                      {language === 'vi' ? 'Gửi nhận xét & Đánh giá của bạn' : 'Submit your Rating & Review'}
                    </h3>
                    <p className="text-[11px] text-slate-455 font-bold uppercase tracking-wider mt-0.5">Thang điểm đánh giá từ 1 đến 10</p>
                  </div>

                  {reviewError && (
                    <div className="bg-red-50 text-red-700 text-sm font-semibold p-3 rounded-lg border-l-4 border-red-500">
                      {reviewError}
                    </div>
                  )}

                  {/* 10-Star Criteria selection grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-sm font-bold text-slate-600">
                    {[
                      { name: t.cleanliness, value: ratingCleanliness, setter: setRatingCleanliness },
                      { name: t.location, value: ratingLocation, setter: setRatingLocation },
                      { name: t.service, value: ratingService, setter: setRatingService },
                      { name: t.facilities, value: ratingFacilities, setter: setRatingFacilities },
                      { name: t.valueRating, value: ratingValue, setter: setRatingValue },
                    ].map((crit) => (
                      <div key={crit.name} className="flex justify-between items-center bg-white border border-slate-100 p-3.5 rounded-xl shadow-sm">
                        <span className="text-slate-700 font-extrabold">{crit.name}</span>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((star) => (
                              <button
                                type="button"
                                key={star}
                                onClick={() => crit.setter(star)}
                                className={`text-lg leading-none focus:outline-none transition-all ${star <= crit.value ? 'text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'
                                  }`}
                              >
                                ★
                              </button>
                            ))}
                          </div>
                          <span className="text-xs text-[#006ce4] font-black">{crit.value} / 10</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Text Comment */}
                  <div className="space-y-1.5 text-sm font-bold text-slate-600">
                    <label className="text-[11px] text-slate-400 uppercase">Nhận xét chi tiết</label>
                    <textarea
                      required
                      rows={4}
                      value={reviewComment}
                      onChange={(e) => setReviewComment(e.target.value)}
                      placeholder={language === 'vi' ? 'Hãy chia sẻ chi tiết trải nghiệm lưu trú của bạn tại đây...' : 'Share your detailed stay experience here...'}
                      className="w-full bg-white border border-slate-200 rounded-xl p-3.5 text-sm focus:outline-none focus:border-blue-600 text-slate-800 font-semibold placeholder-slate-400 transition-all shadow-sm"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowReviewForm(false)}
                      className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-xl text-sm font-bold transition-all"
                    >
                      {language === 'vi' ? 'Hủy bỏ' : 'Cancel'}
                    </button>
                    <button
                      type="submit"
                      disabled={submittingReview}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all shadow-md"
                    >
                      {submittingReview ? (language === 'vi' ? 'Đang gửi...' : 'Submitting...') : (language === 'vi' ? 'Gửi đánh giá' : 'Submit Review')}
                    </button>
                  </div>
                </form>
              )}

              {/* List of comments (Full-width card layout) */}
              {hotel.reviews.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-extrabold text-slate-800 text-lg border-b border-slate-100 pb-2">
                    {language === 'vi' ? 'Ý kiến chi tiết từ khách hàng' : 'Detailed Guest Reviews'}
                  </h3>
                  <div className="space-y-4 max-h-[600px] overflow-y-auto pr-3">
                    {hotel.reviews.map((rev) => (
                      <div key={rev.id} className="space-y-3 bg-white border border-slate-100 p-5 rounded-2xl shadow-sm hover:border-slate-200 transition-all">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200">
                              {rev.user.avatarUrl ? (
                                <img src={rev.user.avatarUrl} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <User className="w-5 h-5 text-slate-450" />
                              )}
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 text-sm">{rev.user.fullName}</h4>
                              <span className="text-[10px] text-[#006ce4] font-extrabold">{formatDateVN(rev.createdAt)}</span>
                            </div>
                          </div>
                          <span className="bg-[#ebf3ff] text-[#006ce4] px-3.5 py-1.5 rounded-full font-black text-sm border border-blue-100">
                            ★ {normalizeRating(rev.ratingOverall)} / 10
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 leading-relaxed font-semibold pl-1">
                          "{rev.comment}"
                        </p>
                        {rev.ownerReply && (
                          <div className="bg-blue-50/70 border border-blue-150 p-3.5 rounded-xl space-y-1 mt-3 text-xs">
                            <div className="flex justify-between items-center text-[#006ce4] font-black">
                              <span className="flex items-center gap-1.5">
                                <Building2 className="w-3.5 h-3.5 text-[#006ce4]" />
                                {language === 'vi' ? 'Phản hồi từ chủ chỗ nghỉ' : 'Response from property owner'}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold">
                                {rev.ownerRepliedAt ? formatDateVN(rev.ownerRepliedAt) : ''}
                              </span>
                            </div>
                            <p className="text-slate-700 font-medium leading-relaxed pl-1">
                              "{rev.ownerReply}"
                            </p>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100/60 mt-2">
                          <button
                            type="button"
                            onClick={() => handleLikeReview(rev.id)}
                            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all border cursor-pointer active:scale-95 ${likedReviewIds.includes(rev.id)
                              ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-2xs'
                              : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                          >
                            <ThumbsUp className={`w-3.5 h-3.5 ${likedReviewIds.includes(rev.id) ? 'fill-blue-600 text-blue-600' : ''}`} />
                            <span>{language === 'vi' ? 'Đánh giá hữu ích' : 'Helpful'} ({rev.likesCount || 0})</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>

        </div>
      </div>
      {selectedRoomForModal && (
        <RoomDetailsModal
          room={selectedRoomForModal}
          onClose={() => setSelectedRoomForModal(null)}
          language={language}
          currency={currency}
          onBook={handleBookRoom}
          translateAmenityName={translateAmenityName}
        />
      )}

      {/* Accommodation Policies Modal */}
      {isPolicyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl lg:max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <h3 className="font-black text-slate-900 text-base sm:text-lg">
                {language === 'vi' ? 'Chính Sách Lưu Trú' : 'Accommodation Policies'}
              </h3>
              <button
                type="button"
                onClick={() => setIsPolicyModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center font-bold text-xs"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 divide-y divide-slate-100 text-xs sm:text-sm font-semibold text-slate-700">
              {/* Early Check-in */}
              <div className="flex gap-4 items-start pt-4 first:pt-0 border-none">
                <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                    {language === 'vi' ? 'Nhận phòng sớm' : 'Early Check-in'}
                  </h4>
                  <p className="text-slate-600 font-normal leading-relaxed">
                    {language === 'vi'
                      ? 'Bạn có thể nhận phòng sớm hơn giờ quy định của cơ sở lưu trú và có áp dụng phụ phí. Vui lòng liên hệ với cơ sở lưu trú để xác nhận thông tin.'
                      : 'You may request early check-in subject to availability and extra fees. Please contact the property to confirm.'
                    }
                  </p>
                </div>
              </div>

              {/* Late Check-out */}
              <div className="flex gap-4 items-start pt-5">
                <Clock className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                    {language === 'vi' ? 'Trả phòng trễ' : 'Late Check-out'}
                  </h4>
                  <p className="text-slate-600 font-normal leading-relaxed">
                    {language === 'vi'
                      ? 'Bạn có thể yêu cầu trả phòng trễ hơn quy định của cơ sở lưu trú và có áp dụng phụ phí. Vui lòng liên hệ với cơ sở lưu trú khi có nhu cầu.'
                      : 'Late check-out can be requested subject to availability and extra fees. Please contact the front desk when needed.'
                    }
                  </p>
                </div>
              </div>

              {/* Smoking */}
              <div className="flex gap-4 items-start pt-5">
                <Ban className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                    {language === 'vi' ? 'Hút thuốc' : 'Smoking'}
                  </h4>
                  <p className="text-slate-600 font-normal leading-relaxed">
                    {language === 'vi'
                      ? 'Chỉ được phép hút thuốc trong khu vực chỉ định.'
                      : 'Smoking is strictly permitted only in designated outdoor smoking areas.'
                    }
                  </p>
                </div>
              </div>

              {/* Pets */}
              <div className="flex gap-4 items-start pt-5">
                <Footprints className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                    {language === 'vi' ? 'Thú cưng' : 'Pets'}
                  </h4>
                  <p className="text-slate-600 font-normal leading-relaxed">
                    {language === 'vi'
                      ? 'Không được mang theo thú cưng.'
                      : 'Pets are not allowed on the property premises.'
                    }
                  </p>
                </div>
              </div>

              {/* Child & Extra Bed Policies */}
              <div className="flex gap-4 items-start pt-5">
                <span className="text-xl shrink-0 mt-0.5">📝</span>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                    {language === 'vi' ? 'Chính sách Bổ Sung' : 'Extra Policies'}
                  </h4>
                  <div className="text-slate-600 font-normal leading-relaxed space-y-1 text-xs">
                    <p className="font-bold text-slate-800">{language === 'vi' ? 'Chính sách trẻ em:' : 'Child Policy:'}</p>
                    <p>- {language === 'vi' ? 'Trẻ em dưới 5 tuổi: Miễn phí' : 'Child under 5 years old: Stay free'}</p>
                    <p>- {language === 'vi' ? 'Trẻ em từ 6-12 tuổi: Phụ thu 100.000 VNĐ/trẻ' : 'Child from 6-11 years old: Extra charge 100,000 VND/child'}</p>
                    <p>- {language === 'vi' ? 'Khách trên 11 tuổi phụ thu như người lớn: 150.000 VNĐ/khách' : 'Over 11 years old: Extra charge 150,000 VND/guest'}</p>
                    <p>- {language === 'vi' ? 'Khách sẽ thanh toán các khoản phụ thu trực tiếp tại khách sạn.' : 'Guests will pay all surcharge fees directly at check-in.'}</p>
                  </div>
                </div>
              </div>

              {/* Airport Transfer */}
              <div className="flex gap-4 items-start pt-5">
                <span className="text-xl shrink-0 mt-0.5">🚙</span>
                <div className="space-y-1">
                  <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm uppercase tracking-wider">
                    {language === 'vi' ? 'Đưa đón sân bay' : 'Airport Transfer'}
                  </h4>
                  <p className="text-slate-600 font-normal leading-relaxed">
                    {language === 'vi'
                      ? 'Có dịch vụ đưa đón sân bay với mức phí 100,000 VNĐ/người.'
                      : 'Airport shuttle service is available at a rate of 100,000 VND/pax.'
                    }
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Interactive Map Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 z-[9999] bg-white flex flex-col h-screen overflow-hidden animate-in fade-in duration-150">
          {/* Modal Header */}
          <div className="h-16 border-b border-slate-200 px-6 flex items-center justify-between shrink-0 bg-white">
            <div className="space-y-0.5">
              <h3 className="font-black text-slate-900 text-sm sm:text-base flex items-center gap-2">
                <Compass className="w-5 h-5 text-[#006ce4]" />
                {language === 'vi' ? `Bản đồ vị trí xung quanh ${hotel.name}` : `Map around ${hotel.name}`}
              </h3>
              <p className="text-[10px] text-slate-455 font-bold uppercase tracking-wider">
                {language === 'vi' ? 'Chọn địa điểm để ghim trên bản đồ' : 'Select a location to pin on the map'}
              </p>
            </div>
            <button
              onClick={() => setIsMapModalOpen(false)}
              className="bg-slate-105 hover:bg-slate-200 text-slate-705 font-extrabold text-xs py-2 px-4 rounded-xl transition-all flex items-center gap-1.5 active:scale-95 shadow-sm"
            >
              <span>✕</span> {language === 'vi' ? 'Đóng / Quay lại' : 'Close / Go back'}
            </button>
          </div>

          {/* Modal Body (Flex layout: Map Left, Sidebar Right) */}
          <div className="flex-grow flex flex-col md:flex-row overflow-hidden">
            {/* Map (70% width on desktop) */}
            <div className="flex-grow h-[45vh] md:h-full relative bg-slate-50 border-r border-slate-100">
              <LeafletMap
                lat={hotel.latitude || 11.94}
                lng={hotel.longitude || 108.44}
                hotelName={hotel.name}
                queryPlace={activeMapQuery}
                nearbyLocations={hotel.nearbyLocations}
              />
              {/* Floating current location badge */}
              <div className="absolute top-4 left-4 bg-white/95 border border-slate-200 px-4 py-2.5 rounded-xl shadow-lg z-10 max-w-sm backdrop-blur-sm">
                <p className="text-[9px] text-slate-455 font-bold uppercase tracking-wider leading-none">VỊ TRÍ ĐANG XEM</p>
                <p className="text-xs font-black text-[#006ce4] mt-1 line-clamp-1">{activeMapQuery}</p>
              </div>
            </div>

            {/* Sidebar (30% width on desktop, scrollable) */}
            <div className="w-full md:w-[350px] shrink-0 h-[55vh] md:h-full flex flex-col bg-slate-50">
              {/* Category tabs filters */}
              <div className="bg-white border-b border-slate-200 p-3 flex gap-1.5 overflow-x-auto shrink-0">
                {[
                  { id: 'ALL', label: language === 'vi' ? 'Tất cả' : 'All' },
                  { id: 'NEARBY', label: language === 'vi' ? 'Lân cận' : 'Nearby' },
                  { id: 'TRANSPORT', label: language === 'vi' ? 'Giao thông' : 'Transit' },
                  { id: 'ENTERTAINMENT', label: language === 'vi' ? 'Giải trí' : 'Leisure' },
                  { id: 'OTHER', label: language === 'vi' ? 'Khác' : 'Other' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSelectedMapCategory(tab.id as any)}
                    className={`text-[10px] font-black px-3 py-1.5 rounded-full transition-all shrink-0 uppercase tracking-wider ${selectedMapCategory === tab.id
                      ? 'bg-[#006ce4] text-white shadow-sm shadow-blue-500/20'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-605'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Locations List */}
              <div className="flex-grow overflow-y-auto p-4 space-y-2">
                {/* Hotel default location card */}
                <div
                  onClick={() => setActiveMapQuery(hotel.name + ' ' + (hotel.address || ''))}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1 ${activeMapQuery === hotel.name + ' ' + (hotel.address || '')
                    ? 'bg-blue-50/50 border-blue-500 shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-800 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-[#006ce4]" />
                      {hotel.name}
                    </span>
                    <span className="bg-[#006ce4] text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase">HOTEL</span>
                  </div>
                  <p className="text-[10px] text-slate-455 font-medium line-clamp-1">{hotel.address}</p>
                </div>

                {/* Nearby list filter */}
                {hotel.nearbyLocations && hotel.nearbyLocations
                  .filter((loc: any) => selectedMapCategory === 'ALL' || loc.type === selectedMapCategory)
                  .map((loc: any, idx: number) => {
                    const getIcon = () => {
                      if (loc.type === 'NEARBY') return <MapPin className="w-3.5 h-3.5 text-[#006ce4]" />;
                      if (loc.type === 'TRANSPORT') return <Compass className="w-3.5 h-3.5 text-[#006ce4]" />;
                      if (loc.type === 'ENTERTAINMENT') return <Sparkles className="w-3.5 h-3.5 text-[#006ce4]" />;
                      return <MoreHorizontal className="w-3.5 h-3.5 text-[#006ce4]" />;
                    };
                    return (
                      <div
                        key={idx}
                        onClick={() => setActiveMapQuery(loc.name + ' ' + (hotel.address?.split(',').pop() || ''))}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center gap-3 ${activeMapQuery === loc.name + ' ' + (hotel.address?.split(',').pop() || '')
                          ? 'bg-blue-50/50 border-blue-500 shadow-sm'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                          }`}
                      >
                        <span className="text-xs font-extrabold text-slate-700 flex items-center gap-1.5 line-clamp-1">
                          {getIcon()}
                          {loc.name}
                        </span>
                        <span className="text-[10px] font-bold text-slate-455 shrink-0">{loc.distance}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FULLSCREEN HOTEL GALLERY LIGHTBOX MODAL */}
      {isGalleryModalOpen && hotel && hotel.images && hotel.images.length > 0 && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[999999] flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-200 select-none">
          {/* Top Bar */}
          <div className="flex justify-between items-center text-white z-10 px-4 pt-2">
            <div className="flex items-center gap-3">
              <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">{hotel.name}</span>
              <span className="text-xs font-bold text-slate-300 bg-white/10 px-3 py-1 rounded-full border border-white/10">
                {galleryActiveIndex + 1} / {hotel.images.length}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsGalleryModalOpen(false)}
              className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all active:scale-95 border border-white/10 shadow-lg cursor-pointer"
              title="Đóng xem ảnh (ESC)"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Photo Container */}
          <div className="relative flex-1 flex items-center justify-center my-4 overflow-hidden w-full">
            {/* Prev Button */}
            {hotel.images.length > 1 && (
              <button
                type="button"
                onClick={() => setGalleryActiveIndex(prev => (prev === 0 ? hotel.images.length - 1 : prev - 1))}
                className="absolute left-3 sm:left-8 z-30 bg-black/50 hover:bg-black/80 text-white p-3.5 sm:p-4 rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/20 shadow-2xl cursor-pointer"
              >
                <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}

            {/* Main Image */}
            <div className="w-full h-full max-w-6xl max-h-[75vh] flex items-center justify-center p-2">
              <img
                src={hotel.images[galleryActiveIndex]?.url}
                alt={`${hotel.name} photo ${galleryActiveIndex + 1}`}
                className="max-w-full max-h-[75vh] object-contain rounded-2xl shadow-2xl animate-in zoom-in-95 duration-200"
              />
            </div>

            {/* Next Button */}
            {hotel.images.length > 1 && (
              <button
                type="button"
                onClick={() => setGalleryActiveIndex(prev => (prev + 1) % hotel.images.length)}
                className="absolute right-3 sm:right-8 z-30 bg-black/50 hover:bg-black/80 text-white p-3.5 sm:p-4 rounded-full backdrop-blur-md transition-all active:scale-95 border border-white/20 shadow-2xl cursor-pointer"
              >
                <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnail Strip */}
          {hotel.images.length > 1 && (
            <div className="flex justify-center items-center gap-2.5 overflow-x-auto py-2 scrollbar-thin max-w-4xl mx-auto w-full px-4 shrink-0">
              {hotel.images.map((img, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setGalleryActiveIndex(idx)}
                  className={`h-14 sm:h-16 w-20 sm:w-24 rounded-xl overflow-hidden shrink-0 transition-all border-2 cursor-pointer ${idx === galleryActiveIndex
                      ? 'border-amber-400 scale-105 shadow-xl opacity-100 ring-2 ring-amber-400/50'
                      : 'border-transparent opacity-40 hover:opacity-100'
                    }`}
                >
                  <img src={img.url} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default HotelDetail;
