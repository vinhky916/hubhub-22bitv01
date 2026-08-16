import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setSearchCriteria, getLocalDateString } from '../store/slices/searchSlice';
import type { RootState } from '../store';
import apiClient from '../core/api/client';
import { MapPin, Building2, Heart, Calendar, Users, ChevronDown, Clock, ChevronLeft, ChevronRight, X, Star } from 'lucide-react';
import { formatPrice } from '../utils/price';
import { formatDateVN } from '../utils/date';
import { VIETNAM_PROVINCES, type ProvinceItem } from '../core/constants/provinces';
import { useModal } from '../components/common/ModalContext';

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

const formatProvinceName = (name: string) => {
  if (!name) return '';
  if (name.includes('Hồ Chí Minh')) return name;
  return name.replace(/^Thành phố\s+/i, '').replace(/^Tỉnh\s+/i, '');
};

const translateProvinceName = (name: string, lang: string) => {
  if (!name) return '';
  if (lang === 'vi') {
    if (name.includes('Hồ Chí Minh') || name.toLowerCase().includes('hcm')) return 'TP. Hồ Chí Minh';
    return name.replace(/^Thành phố\s+/i, '').replace(/^Tỉnh\s+/i, '');
  } else {
    const cleanName = name.replace(/^Thành phố\s+/i, '').replace(/^Tỉnh\s+/i, '');
    if (cleanName.includes('Hồ Chí Minh') || cleanName.toLowerCase().includes('hcm') || cleanName.toLowerCase().includes('ho chi minh')) return 'Ho Chi Minh City';
    if (cleanName.includes('Đà Lạt') || cleanName.toLowerCase().includes('da lat')) return 'Da Lat';
    if (cleanName.includes('Đà Nẵng') || cleanName.toLowerCase().includes('da nang')) return 'Da Nang';
    if (cleanName.includes('Nha Trang') || cleanName.toLowerCase().includes('nha trang')) return 'Nha Trang';
    if (cleanName.includes('Hà Nội') || cleanName.toLowerCase().includes('ha noi') || cleanName.toLowerCase().includes('hanoi')) return 'Hanoi';
    if (cleanName.includes('Vũng Tàu') || cleanName.toLowerCase().includes('vung tau')) return 'Vung Tau';
    return removeVietnameseTones(cleanName);
  }
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

interface FeaturedHotel {
  id: string;
  name: string;
  description: string;
  address: string;
  province: string;
  starRating: number;
  priceFrom: number;
  originalPriceFrom?: number;
  averageRating: number;
  category: string;
  propertyType?: string;
  images: { url: string }[];
  isFavorite: boolean;
}

const homeTranslations = {
  vi: {
    heroTitle: 'Khám phá chỗ nghỉ tiếp theo cùng',
    heroSubtitle: 'Tìm kiếm phòng nhanh chóng và dễ dàng cho hành trình tiếp theo của bạn.',
    whereTo: 'Bạn muốn đến đâu?',
    checkIn: 'Nhận phòng',
    checkOut: 'Trả phòng',
    adults: 'người lớn',
    children: 'trẻ em',
    rooms: 'phòng',
    searchBtn: 'Tìm',
    catTitle: 'Tìm Kiếm Theo Loại Hình Chỗ Nghỉ',
    catSubtitle: 'Lựa chọn phong cách nghỉ dưỡng phù hợp với gu du lịch của bạn',
    dealsTitle: 'Ưu đãi độc quyền',
    dealsSubtitle: 'Khuyến mãi, giảm giá đặc biệt và các gói kỳ nghỉ hấp dẫn dành riêng cho bạn',
    dealsCard1Title: 'Ưu đãi Đầu Năm 2026',
    dealsCard1Desc: 'Tiết kiệm từ 15% trở lên khi đặt phòng khách sạn và lưu trú trước ngày 31/03/2026.',
    dealsCard1Btn: 'Tìm Ưu đãi',
    dealsCard2Title: 'Kỳ nghỉ trọn vẹn tại Resort',
    dealsCard2Desc: 'Giảm đến 20% khi chọn các khu nghỉ dưỡng cao cấp ven biển Nha Trang, Vũng Tàu.',
    dealsCard2Btn: 'Khám phá ngay',
    trendingTitle: 'Điểm đến đang thịnh hành',
    trendingSubtitle: 'Du khách tìm kiếm về Việt Nam cũng đặt chỗ ở những nơi này',
    featuredTitle: 'Chỗ Nghỉ Nổi Bật Được Đề Xuất',
    featuredSubtitle: 'Danh sách các khách sạn uy tín được nhiều du khách lựa chọn đánh giá cao',
    guestFavoritesTitle: 'Nhà của khách yêu thích',
    guestFavoritesSubtitle: 'Những chỗ nghỉ được đánh giá cao nhất với số sao và điểm đánh giá vượt trội từ khách hàng',
    stars: 'Sao',
    noReviews: 'Chưa có đánh giá',
    excellent: 'Tuyệt hảo',
    priceFrom: 'Giá từ',
    contact: 'Liên hệ',
    noHotels: 'Không tìm thấy chỗ nghỉ nổi bật nào ở địa điểm này',
    noHotelsRated: 'Không tìm thấy chỗ nghỉ nổi bật nào',
    recentSearches: 'Tìm kiếm gần đây của bạn',
    trendingDestsLabel: 'Các điểm đến thịnh hành',
    done: 'Xong',
    howLong: 'Bạn muốn ở bao lâu?',
    durations: ["Cuối tuần", "1 tuần", "Một tháng", "Khác"],
    adultsLabel: 'Người lớn',
    childrenLabel: 'Trẻ em',
    roomsLabel: 'Số phòng',
    whyChooseTitle: 'Vì sao lại chọn Cloud Booking?',
    whyItem1Title: 'Đáp ứng mọi nhu cầu của bạn',
    whyItem1Desc: 'Khám phá nhiều loại hình lưu trú với mức giá hợp lý, vị trí thuận tiện và dịch vụ chất lượng, giúp mỗi chuyến đi trở nên dễ dàng hơn.',
    whyItem2Title: 'Tùy chọn đặt chỗ linh hoạt',
    whyItem2Desc: 'Kế hoạch thay đổi bất ngờ? Đừng lo! Đổi lịch hoặc Hoàn tiền dễ dàng.',
    whyItem3Title: 'Thanh toán an toàn và thuận tiện',
    whyItem3Desc: 'Tận hưởng nhiều cách thanh toán an toàn, bằng loại tiền thuận tiện nhất cho bạn.',
    whyItem4Title: 'Dịch vụ khách hàng đáng tin cậy, hoạt động 24/7',
    whyItem4Desc: 'Chúng tôi luôn sẵn sàng giúp đỡ bạn'
  },
  en: {
    heroTitle: 'Discover your next stay with',
    heroSubtitle: 'Search rooms quickly and easily for your next journey.',
    whereTo: 'Where are you going?',
    checkIn: 'Check-in',
    checkOut: 'Check-out',
    adults: 'adults',
    children: 'children',
    rooms: 'rooms',
    searchBtn: 'Search',
    catTitle: 'Browse by Property Type',
    catSubtitle: 'Choose the perfect lodging style for your travel taste',
    dealsTitle: 'Exclusive Deals',
    dealsSubtitle: 'Promotions, special discounts, and attractive holiday packages just for you',
    dealsCard1Title: 'Early 2026 Deals',
    dealsCard1Desc: 'Save 15% or more when booking and staying before March 31, 2026.',
    dealsCard1Btn: 'Find Deals',
    dealsCard2Title: 'Unforgettable Resort Getaways',
    dealsCard2Desc: 'Save up to 20% on luxury beachfront resorts in Nha Trang, Vung Tau.',
    dealsCard2Btn: 'Explore Now',
    trendingTitle: 'Trending Destinations',
    trendingSubtitle: 'Travelers searching for Vietnam also booked these destinations',
    featuredTitle: 'Recommended Featured Properties',
    featuredSubtitle: 'List of highly reputable hotels chosen and highly rated by travelers',
    guestFavoritesTitle: 'Guests\' Favorite Homes',
    guestFavoritesSubtitle: 'Highest rated properties with exceptional star and review ratings',
    stars: 'Stars',
    noReviews: 'No reviews yet',
    excellent: 'Excellent',
    priceFrom: 'From',
    contact: 'Contact Us',
    noHotels: 'No featured properties found in this destination',
    noHotelsRated: 'No featured properties found',
    recentSearches: 'Your recent searches',
    trendingDestsLabel: 'Popular destinations',
    done: 'Done',
    howLong: 'How long do you want to stay?',
    durations: ["Weekend", "1 week", "One month", "Other"],
    adultsLabel: 'Adults',
    childrenLabel: 'Children',
    roomsLabel: 'Rooms',
    whyChooseTitle: 'Why Choose Cloud Booking?',
    whyItem1Title: 'Fulfill All Your Travel Needs',
    whyItem1Desc: 'Explore a variety of accommodations with great prices, convenient locations, and quality services for every journey.',
    whyItem2Title: 'Flexible Booking Options',
    whyItem2Desc: 'Plans change unexpectedly? No worries! Reschedule or Refund easily.',
    whyItem3Title: 'Safe & Convenient Payment',
    whyItem3Desc: 'Enjoy multiple secure payment methods in the currency most convenient for you.',
    whyItem4Title: 'Reliable 24/7 Customer Service',
    whyItem4Desc: 'We are always ready to help you'
  }
};

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const searchCriteria = useSelector((state: RootState) => state.search);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { language, currency } = useSelector((state: RootState) => state.settings);
  const t = homeTranslations[language];
  const { showAlert } = useModal();

  const [provinceId, setProvinceId] = useState(searchCriteria.provinceId);
  const [destInputText, setDestInputText] = useState('');
  const [destError, setDestError] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState(searchCriteria.checkInDate || '');
  const [checkOut, setCheckOut] = useState(searchCriteria.checkOutDate || '');

  // Custom Popover States
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);

  const normalizeRating = (rating: number) => {
    if (!rating) return 0;
    return rating <= 5 ? rating * 2 : rating;
  };

  const getRatingText = (rating: number, lang: string) => {
    const score = normalizeRating(rating);
    if (score >= 9.5) return lang === 'vi' ? 'Xuất sắc' : 'Exceptional';
    if (score >= 9.0) return lang === 'vi' ? 'Tuyệt hảo' : 'Superb';
    if (score >= 8.5) return lang === 'vi' ? 'Rất tốt' : 'Very Good';
    if (score >= 8.0) return lang === 'vi' ? 'Tốt' : 'Good';
    if (score >= 5.0) return lang === 'vi' ? 'Chấp nhận được' : 'Pleasant';
    return lang === 'vi' ? 'Khá tốt' : 'Pleasant';
  };

  const [showDestPopover, setShowDestPopover] = useState(false);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [showGuestPopover, setShowGuestPopover] = useState(false);
  const [_dateTab, _setDateTab] = useState<'calendar' | 'flexible'>('calendar');

  // Dynamic Recent Searches state
  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  // Autocomplete hotel suggestions state
  const [suggestedHotels, setSuggestedHotels] = useState<any[]>([]);

  // Hover date state for range preview
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Month navigation state for standard calendar
  const today = new Date();
  const [month1, setMonth1] = useState(today.getMonth());
  const [year1, setYear1] = useState(today.getFullYear());

  const month2 = month1 === 11 ? 0 : month1 + 1;
  const year2 = month1 === 11 ? year1 + 1 : year1;

  const [catStartIndex, setCatStartIndex] = useState(0);
  const [activeFeaturedTab, setActiveFeaturedTab] = useState('all');
  const [featuredStartIndex, setFeaturedStartIndex] = useState(0);


  const [featuredHotels, setFeaturedHotels] = useState<FeaturedHotel[]>([]);
  const [loading, setLoading] = useState(true);
  const [topRatedHotels, setTopRatedHotels] = useState<FeaturedHotel[]>([]);
  const [topRatedLoading, setTopRatedLoading] = useState(true);

  const [provincesList, setProvincesList] = useState<ProvinceItem[]>(VIETNAM_PROVINCES);

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

  const [adminCoupons, setAdminCoupons] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [cmsBanners, setCmsBanners] = useState<any[]>([]);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);

  useEffect(() => {
    apiClient.get('/coupons')
      .then(res => {
        if (res.data.success && Array.isArray(res.data.data)) {
          setAdminCoupons(res.data.data.filter((c: any) => !c.hotelId));
        }
      })
      .catch(err => console.error('Failed to fetch admin coupons:', err));

    apiClient.get('/cms/banners', { params: { activeOnly: 'true' } })
      .then(res => {
        if (res.data.success && Array.isArray(res.data.data)) {
          setCmsBanners(res.data.data);
        }
      })
      .catch(err => console.error('Failed to fetch CMS banners:', err));
  }, []);

  // Tự động xoay vòng banner sau mỗi 5 giây
  useEffect(() => {
    if (cmsBanners.length <= 1) return;
    const interval = setInterval(() => {
      setActiveBannerIndex((prev) => (prev + 1) % cmsBanners.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [cmsBanners]);

  // Chỉ banner có vị trí HOME_HERO mới được thay đổi ảnh nền Hero của trang chủ
  const heroBanners = cmsBanners.filter(b => b.position === 'HOME_HERO');
  const currentHeroBanner = heroBanners.length > 0
    ? heroBanners[activeBannerIndex % heroBanners.length]
    : null;
  const heroBgUrl = currentHeroBanner?.imageUrl || '/banner.webp';

  const handleCopyAdminCoupon = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2500);
  };

  const CATEGORIES = [
    { id: 'HOTEL', name: 'Khách sạn', slug: 'HOTEL', image: '/hotel.jpg' },
    { id: 'RESORT', name: 'Resort', slug: 'RESORT', image: '/resort.jpg' },
    { id: 'VILLA', name: 'Villa', slug: 'VILLA', image: '/villa.jpg' },
    { id: 'APARTMENT', name: 'Căn hộ', slug: 'APARTMENT', image: '/apartment.jpg' },
    { id: 'HOMESTAY', name: 'Homestay', slug: 'HOMESTAY', image: '/homestay.webp' },
    { id: 'GUESTHOUSE', name: 'Nhà nghỉ', slug: 'GUESTHOUSE', image: '/nhanghi.jpg' },
  ];

  const TRENDING_DESTINATIONS = [
    {
      name: 'TP. Hồ Chí Minh',
      provinceId: '01',
      query: '',
      image: '/TPHCM.jpg',
      size: 'large'
    },
    {
      name: 'Đà Lạt',
      provinceId: '68',
      query: '',
      image: '/dalat.jpg',
      size: 'large'
    },
    {
      name: 'Đà Nẵng',
      provinceId: '48',
      query: '',
      image: '/danang.jpg',
      size: 'small'
    },
    {
      name: 'Nha Trang',
      provinceId: '56',
      query: '',
      image: '/nhatrang.jpg',
      size: 'small'
    },
    {
      name: 'Hà Nội',
      provinceId: '',
      query: 'Hà Nội',
      image: '/hanoi.jpg',
      size: 'small'
    }
  ];

  const getProvinceName = (id: string) => {
    if (!id) return '';
    const prov = provincesList.find((p) => p.id === id);
    if (prov) return prov.name;
    const staticProv = VIETNAM_PROVINCES.find((p) => p.id === id);
    return staticProv ? staticProv.name : '';
  };

  // Synchronize destination input text on provinceId change or initial load
  useEffect(() => {
    if (provinceId && !selectedHotelId) {
      const pName = getProvinceName(provinceId);
      if (pName) {
        setDestInputText(translateProvinceName(pName, language));
      }
    }
  }, [provinceId, language, provincesList, selectedHotelId]);

  // Clear destination error when input has value
  useEffect(() => {
    if (destInputText.trim()) {
      setDestError(false);
    }
  }, [destInputText]);

  // Load recent searches from localStorage and auto de-duplicate old entries
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
            if (cleaned.length !== list.length) {
              localStorage.setItem('recent_searches', JSON.stringify(cleaned));
            }
            setRecentSearches(cleaned);
          }
        } catch (e) {
          console.error('Failed to parse and clean recent searches:', e);
        }
      }
    }
  }, [showDestPopover]);

  // Dynamic autocomplete query for hotels with fuzzy accent-insensitive filtering
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
        // Fetch up to 100 hotels and perform Vietnamese diacritics-insensitive match in client side
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
        console.error('Failed to fetch autocomplete suggestions:', err);
      }
    }, 300);
    return () => clearTimeout(delayDebounce);
  }, [destInputText]);

  const FEATURED_TABS = [
    { id: 'all', name: 'Tất cả' },
    { id: '01', name: 'TP. Hồ Chí Minh' },
    { id: '68', name: 'Đà Lạt' },
    { id: '48', name: 'Đà Nẵng' },
    { id: '56', name: 'Nha Trang' },
    { id: '91', name: 'Vũng Tàu' }
  ];

  const fetchFeatured = async (provId: string) => {
    setLoading(true);
    try {
      const params: any = { limit: 15 };
      if (provId && provId !== 'all') {
        params.provinceId = provId;
      }
      if (checkIn) params.checkIn = checkIn;
      if (checkOut) params.checkOut = checkOut;
      const res = await apiClient.get('/hotels', { params });
      if (res.data.success) {
        setFeaturedHotels(res.data.data.hotels || []);
      }
    } catch (err) {
      console.error('Failed to fetch featured hotels:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setFeaturedStartIndex(0);
    fetchFeatured(activeFeaturedTab);
  }, [activeFeaturedTab, checkIn, checkOut]);

  const fetchTopRated = async () => {
    setTopRatedLoading(true);
    try {
      const params: any = { limit: 100 };
      if (checkIn) params.checkIn = checkIn;
      if (checkOut) params.checkOut = checkOut;
      const res = await apiClient.get('/hotels', { params });
      if (res.data.success) {
        const hotelsList: FeaturedHotel[] = res.data.data.hotels || [];
        const sorted = [...hotelsList]
          .sort((a, b) => (b.averageRating || 0) - (a.averageRating || 0))
          .slice(0, 4);
        setTopRatedHotels(sorted);
      }
    } catch (err) {
      console.error('Failed to fetch top rated hotels:', err);
    } finally {
      setTopRatedLoading(false);
    }
  };

  useEffect(() => {
    fetchTopRated();
  }, [checkIn, checkOut]);

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

    // Save search details to recent searches history in localStorage
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
      // Remove existing same search item to avoid duplicates
      list = list.filter((item: any) => {
        if (finalProvinceId && item.provinceId === finalProvinceId) return false;
        if (finalSearchQuery && item.searchQuery && item.searchQuery.toLowerCase() === finalSearchQuery.toLowerCase()) return false;
        if (formatProvinceName(item.provinceName).toLowerCase() === formatProvinceName(destInputText.trim()).toLowerCase()) return false;
        return true;
      });
      list.unshift(newSearch);
      // Keep only top 3 searches
      list = list.slice(0, 3);
      localStorage.setItem('recent_searches', JSON.stringify(list));
    }

    if (selectedHotelId) {
      navigate(`/hotel/${selectedHotelId}`);
      return;
    }

    navigate('/search');
  };



  const handleCategoryClick = (propertyTypeSlug: string) => {
    navigate(`/search?propertyType=${propertyTypeSlug}`);
  };

  const handleTrendingClick = (dest: typeof TRENDING_DESTINATIONS[0]) => {
    dispatch(setSearchCriteria({
      provinceId: dest.provinceId,
      searchQuery: dest.query,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      guests: adults + children
    }));
    navigate('/search');
  };

  const handleToggleFavorite = async (e: React.MouseEvent, hotelId: string) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      await showAlert('Vui lòng đăng nhập để lưu khách sạn yêu thích!', { type: 'warning', title: 'Yêu cầu đăng nhập' });
      navigate('/login');
      return;
    }

    try {
      const res = await apiClient.post(`/hotels/${hotelId}/favorite`);
      if (res.data.success) {
        setFeaturedHotels((prev) =>
          prev.map((h) => (h.id === hotelId ? { ...h, isFavorite: !h.isFavorite } : h))
        );
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // Handlers for destination text input typing
  const handleDestInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setDestInputText(val);
    setSelectedHotelId(null);
    setShowDestPopover(true);

    const matched = provincesList.find((p) => p.name.toLowerCase() === val.toLowerCase());
    if (matched) {
      setProvinceId(matched.id);
    } else {
      setProvinceId('');
    }
  };

  const handleSelectRecentSearch = (searchItem: any) => {
    setSelectedHotelId(null);
    setProvinceId(searchItem.provinceId);
    setDestInputText(searchItem.provinceName);
    setCheckIn(searchItem.checkIn || '');
    setCheckOut(searchItem.checkOut || '');
    setAdults(searchItem.adults || 2);
    setChildren(searchItem.children || 0);
    setRooms(searchItem.rooms || 1);
    setShowDestPopover(false);
  };



  // Dynamic Date List Generator - Padded to exactly 42 items to keep calendar height fixed
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

    // Pad list to exactly 42 elements (6 rows of 7 days)
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

  const todayStr = getLocalDateString(new Date(), 0);

  const handleDayClick = (dateStr: string) => {
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

  // Hover range check helper
  const isInHoverRange = (dateStr: string) => {
    if (checkIn && !checkOut && hoveredDate && dateStr > checkIn && dateStr <= hoveredDate) {
      return true;
    }
    return false;
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

  const monthNames = [
    'tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
    'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'
  ];

  const formatSearchDatesHelper = (start: string, end: string) => {
    if (start && end) {
      const sDate = new Date(start);
      const eDate = new Date(end);
      return `${sDate.getDate()} thg ${sDate.getMonth() + 1} – ${eDate.getDate()} thg ${eDate.getMonth() + 1}`;
    }
    return 'Lịch linh hoạt';
  };



  const combinedSuggestions = [
    ...matchedProvinces.map((p) => ({ ...p, type: 'province' as const })),
    ...suggestedHotels.map((h) => ({ ...h, type: 'hotel' as const }))
  ];

  return (
    <div>
      {/* Banner & Search bar section wrapper */}
      <div className="relative">
        {/* Hero Section - Nền chuyển đổi động theo Banner từ Admin */}
        <section
          style={{ backgroundImage: `url('${heroBgUrl}')` }}
          className="relative bg-cover bg-center text-white pt-40 pb-28 px-4 sm:px-6 lg:px-8 shadow-2xl overflow-hidden min-h-[450px] flex items-center justify-center transition-all duration-700"
        >
          {/* Lớp phủ tối nhẹ sắc nét bảo vệ độ tương phản chữ */}
          <div className="absolute inset-0 bg-black/35 z-0"></div>

          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

          <div className="max-w-4xl mx-auto w-full text-center space-y-4 relative z-10 pb-4">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight">
              {t.heroTitle} <span className="bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">Cloud Booking</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-200 max-w-xl mx-auto font-light">
              {t.heroSubtitle}
            </p>
          </div>
        </section>

        {/* Booking.com Style Standard Search Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-10">
          <form
            onSubmit={handleSearchSubmit}
            className="bg-[#febb02] p-[4px] rounded-lg flex flex-col lg:flex-row gap-[4px] shadow-[0_15px_30px_rgba(0,0,0,0.15)] w-full items-stretch"
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
                placeholder={destError ? (language === 'vi' ? 'Vui lòng nhập địa điểm!' : 'Please enter a destination!') : t.whereTo}
                className={`w-full bg-transparent text-sm font-bold text-slate-900 focus:outline-none border-none p-1 ${destError ? 'placeholder-red-500 text-red-500' : 'placeholder-slate-400 placeholder:font-bold placeholder:text-slate-800'}`}
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
                  <div className="absolute top-full left-0 mt-2 w-full sm:w-[400px] bg-white rounded-lg shadow-2xl border border-slate-100 p-4 z-40 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150 max-h-80 overflow-y-auto">
                    <div className="space-y-4 text-left">

                      {/* Case 1: Search input is empty -> Show Recent searches and Popular destinations */}
                      {!destInputText.trim() ? (
                        <>
                          {recentSearches.length > 0 && (
                            <div>
                              <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-2">{t.recentSearches}</h4>
                              <div className="space-y-2">
                                {recentSearches.map((item, idx) => (
                                  <div
                                    key={idx}
                                    onClick={() => handleSelectRecentSearch(item)}
                                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                  >
                                    <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                                    <div>
                                      <p className="font-bold text-sm text-slate-900">{translateProvinceName(item.provinceName, language)}</p>
                                      <p className="text-[10px] font-bold text-slate-550">
                                        {formatSearchDatesHelper(item.checkIn, item.checkOut)}, {item.adults || 2} {t.adults}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <hr className="border-slate-100 mt-2" />
                            </div>
                          )}

                          <div>
                            <h4 className="font-extrabold text-xs text-slate-900 uppercase tracking-wider mb-2">{t.trendingDestsLabel}</h4>
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
                                    <p className="font-bold text-sm text-slate-900">{translateProvinceName(prov.name, language)}</p>
                                    <p className="text-[10px] font-bold text-slate-500">{language === 'vi' ? 'Việt Nam' : 'Vietnam'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Case 2: Search input has text -> Show combined results (Destinations + Hotels mixed) without separation headers */
                        <div>
                          {combinedSuggestions.length > 0 ? (
                            <div className="space-y-1">
                              {combinedSuggestions.map((item: any) => {
                                if (item.type === 'province') {
                                  return (
                                    <div
                                      key={`prov-${item.id}`}
                                      onClick={() => {
                                        setProvinceId(item.id);
                                        setDestInputText(translateProvinceName(item.name, language));
                                        setShowDestPopover(false);
                                      }}
                                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                      <MapPin className="w-5 h-5 text-slate-400 shrink-0" />
                                      <div>
                                        <p className="font-bold text-sm text-slate-900">{translateProvinceName(item.name, language)}</p>
                                        <p className="text-[10px] font-bold text-slate-550">{language === 'vi' ? 'Điểm đến · Việt Nam' : 'Destination · Vietnam'}</p>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div
                                      key={`hotel-${item.id}`}
                                      onClick={() => {
                                        setSelectedHotelId(item.id);
                                        setDestInputText(item.name);
                                        if (item.provinceId) setProvinceId(item.provinceId);
                                        setShowDestPopover(false);
                                      }}
                                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                                    >
                                      <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
                                      <div>
                                        <p className="font-bold text-sm text-slate-900">{item.name}</p>
                                        <p className="text-[10px] font-bold text-slate-550">{item.address}, {translateProvinceName(item.province, language)}</p>
                                      </div>
                                    </div>
                                  );
                                }
                              })}
                            </div>
                          ) : (
                            <p className="text-xs font-bold text-slate-400 py-2 text-center">{language === 'vi' ? 'Không tìm thấy kết quả phù hợp' : 'No matching results found'}</p>
                          )}
                        </div>
                      )}

                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Dates Panel & Custom popover calendar grid */}
            <div className={`flex-grow lg:flex-[2.6] bg-white px-4 h-[62px] flex items-center gap-3 relative`}>
              <Calendar className="w-6 h-6 text-slate-400 shrink-0" />
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
                      {/* Calendar Header with navigation arrows and Month names aligned on the same row */}
                      <div className="flex justify-between items-center px-1">
                        <button
                          type="button"
                          onClick={handlePrevMonths}
                          className="p-1 rounded-full hover:bg-slate-100 text-slate-650 shrink-0"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>

                        {/* Shifted months headers up here */}
                        <div className="flex-1 grid grid-cols-2 gap-12 text-center">
                          <h4 className="font-extrabold text-base text-slate-900 capitalize">
                            {monthNames[month1]} năm {year1}
                          </h4>
                          <h4 className="font-extrabold text-base text-slate-900 capitalize">
                            {monthNames[month2]} năm {year2}
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
                                            ? 'bg-slate-100 text-slate-350 cursor-not-allowed opacity-60 select-none'
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
                                            ? 'bg-slate-100 text-slate-350 cursor-not-allowed opacity-60 select-none'
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
                  {adults} {t.adults} · {children} {t.children} · {rooms} {t.rooms}
                </p>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
              </div>

              {/* Popover Guests */}
              {showGuestPopover && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowGuestPopover(false)} />
                  <div className="absolute top-full right-0 mt-2 w-full sm:w-[280px] bg-white rounded-lg shadow-2xl border border-slate-100 p-4 z-40 text-slate-800 animate-in fade-in slide-in-from-top-2 duration-150">
                    <div className="space-y-4">
                      {/* Adults */}
                      <div className="flex justify-between items-center">
                        <span className="font-extrabold text-sm text-slate-900">{t.adultsLabel}</span>
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
                        <span className="font-extrabold text-sm text-slate-900">{t.childrenLabel}</span>
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
                        <span className="font-extrabold text-sm text-slate-900">{t.roomsLabel}</span>
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
                        {t.done}
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
              {t.searchBtn}
            </button>
          </form>
        </div>
      </div>

      {/* Main body content sections with spacing */}
      <div className="space-y-12 mt-12">
        {/* 1. Khối Banner Quảng Cáo CMS dạng Slider Traveloka (Nằm ngay trên Mã Giảm Giá) */}
        {cmsBanners.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative group/banner rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-slate-200/80 bg-slate-900">
              {/* Banner Active Slide */}
              <div
                onClick={() => {
                  const currentBanner = cmsBanners[activeBannerIndex % cmsBanners.length];
                  if (currentBanner?.linkUrl) {
                    if (currentBanner.linkUrl.startsWith('http')) {
                      window.open(currentBanner.linkUrl, '_blank');
                    } else {
                      navigate(currentBanner.linkUrl);
                    }
                  } else {
                    navigate('/search');
                  }
                }}
                className="relative w-full h-44 sm:h-60 md:h-64 lg:h-72 cursor-pointer overflow-hidden"
              >
                <img
                  key={cmsBanners[activeBannerIndex % cmsBanners.length]?.id || activeBannerIndex}
                  src={cmsBanners[activeBannerIndex % cmsBanners.length]?.imageUrl}
                  alt={cmsBanners[activeBannerIndex % cmsBanners.length]?.title || 'Banner'}
                  className="w-full h-full object-cover transition-transform duration-700 hover:scale-105 animate-in fade-in duration-300"
                />

                {/* Banner Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-5 sm:p-8 text-left">
                  {cmsBanners[activeBannerIndex % cmsBanners.length]?.title && (
                    <div className="space-y-2 max-w-2xl">
                      <span className="text-[10px] font-black uppercase tracking-wider px-3 py-1 bg-amber-500/90 backdrop-blur-md text-white rounded-full inline-block shadow-sm">
                        {cmsBanners[activeBannerIndex % cmsBanners.length]?.position === 'HOME_HERO' ? 'HERO BANNER' : 'ƯU ĐÃI ĐẶC BIỆT'}
                      </span>
                      <h3 className="text-lg sm:text-2xl lg:text-3xl font-black text-white leading-tight drop-shadow-md">
                        {cmsBanners[activeBannerIndex % cmsBanners.length]?.title}
                      </h3>
                    </div>
                  )}
                </div>
              </div>

              {/* Prev Button Arrow */}
              {cmsBanners.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveBannerIndex((prev) => (prev - 1 + cmsBanners.length) % cmsBanners.length);
                  }}
                  className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-slate-100"
                >
                  <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" />
                </button>
              )}

              {/* Next Button Arrow */}
              {cmsBanners.length > 1 && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveBannerIndex((prev) => (prev + 1) % cmsBanners.length);
                  }}
                  className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-20 w-9 h-9 sm:w-11 sm:h-11 rounded-full bg-white/90 hover:bg-white text-slate-800 shadow-xl flex items-center justify-center transition-all hover:scale-110 active:scale-95 border border-slate-100"
                >
                  <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-slate-800" />
                </button>
              )}

              {/* Dot indicators */}
              {cmsBanners.length > 1 && (
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10">
                  {cmsBanners.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveBannerIndex(idx);
                      }}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        activeBannerIndex % cmsBanners.length === idx
                          ? 'w-6 bg-white'
                          : 'w-2 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* 2. Admin Global Coupons & Promotions Section */}
        {adminCoupons.length > 0 && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
              {/* Decorative background glow elements */}
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4 relative z-10">
                <div className="space-y-1 text-left">
                  <div className="inline-flex items-center gap-1.5 text-xs font-black text-amber-300 bg-amber-400/10 px-3 py-1 rounded-full border border-amber-300/20 uppercase tracking-wider">
                    🔥 {language === 'vi' ? 'Ưu đãi đặc quyền toàn sàn' : 'Exclusive System Offers'}
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {language === 'vi' ? 'Voucher & Mã giảm giá CloudBooking' : 'CloudBooking Vouchers & Promo Codes'}
                  </h2>
                  <p className="text-xs text-blue-200 font-medium">
                    {language === 'vi' ? 'Sao chép mã giảm giá của hệ thống để áp dụng cho mọi khách sạn trên toàn quốc' : 'Copy system voucher code to apply for all hotels nationwide'}
                  </p>
                </div>

                <span className="text-xs font-extrabold text-white bg-blue-600/60 border border-blue-400/30 px-3.5 py-1.5 rounded-full shrink-0 self-start md:self-auto">
                  {adminCoupons.length} {language === 'vi' ? 'Voucher hot' : 'Hot Vouchers'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
                {adminCoupons.map((c: any) => {
                  const discountLabel = c.discountType === 'PERCENTAGE'
                    ? `Giảm ${c.discountValue}%`
                    : `Giảm ${formatPrice(c.discountValue, language)}`;
                  const maxText = c.maxDiscountAmount ? ` (Tối đa ${formatPrice(c.maxDiscountAmount, language)})` : '';
                  const minText = c.minOrderValue > 0 ? `Đơn từ ${formatPrice(c.minOrderValue, language)}` : 'Mọi đơn đặt phòng';
                  const isCopied = copiedCode === c.code;

                  return (
                    <div key={c.id} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex flex-col justify-between space-y-3 hover:bg-white/15 transition-all shadow-md">
                      <div className="space-y-1.5 text-left">
                        <div className="flex justify-between items-center">
                          <span className="font-black text-base text-amber-300 tracking-tight">{discountLabel}</span>
                          <span className="text-[11px] font-black bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-md uppercase tracking-wider shadow-xs">{c.code}</span>
                        </div>
                        <p className="text-xs font-bold text-white line-clamp-1">{c.description || minText}</p>
                        <div className="space-y-0.5 text-[10px] text-blue-200 font-medium">
                          <p>{minText}{maxText}</p>
                          <p>Hạn sử dụng: {formatDateVN(c.endDate)}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCopyAdminCoupon(c.code)}
                        className={`w-full py-2 px-4 rounded-xl font-extrabold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm ${isCopied
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-400 hover:bg-amber-300 text-slate-950 hover:shadow-md'
                          }`}
                      >
                        {isCopied ? (
                          <>✓ {language === 'vi' ? 'Đã sao chép mã!' : 'Code copied!'}</>
                        ) : (
                          <>{language === 'vi' ? 'Sao chép mã ngay' : 'Copy code now'}</>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {/* Categories Grid */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-left space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">{t.catTitle}</h2>
            <p className="text-sm text-slate-400 font-medium">{t.catSubtitle}</p>
          </div>

          <div className="relative group/carousel">
            {/* Nút Prev */}
            {catStartIndex > 0 && (
              <button
                type="button"
                onClick={() => setCatStartIndex(catStartIndex - 1)}
                className="absolute left-[-18px] top-[80px] sm:top-[96px] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Nút Next */}
            {catStartIndex < CATEGORIES.length - 4 && (
              <button
                type="button"
                onClick={() => setCatStartIndex(catStartIndex + 1)}
                className="absolute right-[-18px] top-[80px] sm:top-[96px] -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Danh sách 4 Card */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 transition-all duration-300">
              {CATEGORIES.slice(catStartIndex, catStartIndex + 4).map((cat) => {
                return (
                  <div
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat.slug)}
                    className="flex flex-col cursor-pointer group"
                  >
                    <div className="w-full h-40 sm:h-48 rounded-lg overflow-hidden relative shadow-sm border border-slate-100 mb-3">
                      <img
                        src={cat.image}
                        alt={cat.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80'; }}
                      />
                    </div>
                    <div className="text-left">
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-primary transition-colors">{cat.name}</h3>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Ưu đãi độc quyền */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-left space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">{t.dealsTitle}</h2>
            <p className="text-sm text-slate-400 font-medium font-bold">{t.dealsSubtitle}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1 */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-premium overflow-hidden shadow-sm flex flex-col sm:flex-row justify-between text-white relative min-h-[160px] group border border-slate-100/10">
              <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-25 group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: "url('/uudai1.jpg')" }}></div>
              <div className="p-6 flex flex-col justify-between relative z-10 space-y-4 max-w-[65%] text-left">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg sm:text-xl text-amber-300">{t.dealsCard1Title}</h3>
                  <p className="text-xs sm:text-sm font-medium text-slate-200">{t.dealsCard1Desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/search')}
                  className="bg-[#006ce4] hover:bg-[#0056b3] text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-colors w-fit shadow-md hover:scale-105 active:scale-95"
                >
                  {t.dealsCard1Btn}
                </button>
              </div>
              <div className="hidden sm:block w-[35%] h-full min-h-[160px] relative">
                <img
                  src="/uudai1.jpg"
                  alt="Ưu đãi đầu năm"
                  className="w-full h-full object-cover rounded-l-premium"
                />
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-amber-950 rounded-premium overflow-hidden shadow-sm flex flex-col sm:flex-row justify-between text-white relative min-h-[160px] group border border-slate-100/10">
              <div className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-25 group-hover:scale-105 transition-transform duration-500" style={{ backgroundImage: "url('/uudai2.jpg')" }}></div>
              <div className="p-6 flex flex-col justify-between relative z-10 space-y-4 max-w-[65%] text-left">
                <div className="space-y-1">
                  <h3 className="font-extrabold text-lg sm:text-xl text-yellow-400">{t.dealsCard2Title}</h3>
                  <p className="text-xs sm:text-sm font-medium text-slate-200">{t.dealsCard2Desc}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/search?categoryId=resort')}
                  className="bg-[#006ce4] hover:bg-[#0056b3] text-white font-extrabold text-xs px-4 py-2 rounded-lg transition-colors w-fit shadow-md hover:scale-105 active:scale-95"
                >
                  {t.dealsCard2Btn}
                </button>
              </div>
              <div className="hidden sm:block w-[35%] h-full min-h-[160px] relative">
                <img
                  src="/uudai2.jpg"
                  alt="Kỳ nghỉ resort"
                  className="w-full h-full object-cover rounded-l-premium"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Điểm đến đang thịnh hành */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-left space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">{t.trendingTitle}</h2>
            <p className="text-sm text-slate-400 font-medium">{t.trendingSubtitle}</p>
          </div>

          <div className="space-y-4">
            {/* Hàng 1: 2 ảnh lớn */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {TRENDING_DESTINATIONS.filter(d => d.size === 'large').map((dest) => (
                <div
                  key={dest.name}
                  onClick={() => handleTrendingClick(dest)}
                  className="relative h-64 sm:h-72 rounded-lg overflow-hidden cursor-pointer group shadow-sm"
                >
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/40 z-10"></div>

                  <div className="absolute top-5 left-5 z-20 flex items-center">
                    <span className="font-extrabold text-white text-xl sm:text-2xl drop-shadow-md">
                      {translateProvinceName(dest.name, language)}
                    </span>
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-red-600 rounded text-yellow-300 font-black text-xs shadow-sm ml-2 select-none">
                      ★
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Hàng 2: 3 ảnh nhỏ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {TRENDING_DESTINATIONS.filter(d => d.size === 'small').map((dest) => (
                <div
                  key={dest.name}
                  onClick={() => handleTrendingClick(dest)}
                  className="relative h-52 sm:h-56 rounded-lg overflow-hidden cursor-pointer group shadow-sm"
                >
                  <img
                    src={dest.image}
                    alt={dest.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/10 to-black/40 z-10"></div>

                  <div className="absolute top-4 left-4 z-20 flex items-center">
                    <span className="font-extrabold text-white text-lg sm:text-xl drop-shadow-md">
                      {translateProvinceName(dest.name, language)}
                    </span>
                    <span className="inline-flex items-center justify-center w-4 h-4 bg-red-600 rounded text-yellow-300 font-black text-[10px] shadow-sm ml-1.5 select-none">
                      ★
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Featured Hotels */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-left space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">{t.featuredTitle}</h2>
            <p className="text-sm text-slate-400 font-medium">{t.featuredSubtitle}</p>
          </div>

          {/* Tab lọc theo thành phố */}
          <div className="flex flex-wrap gap-2 pb-2">
            {FEATURED_TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFeaturedTab(tab.id)}
                className={`px-4 py-2 text-xs font-extrabold rounded-full transition-all border ${activeFeaturedTab === tab.id
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
              >
                {tab.id === 'all' ? (language === 'vi' ? 'Tất cả' : 'All') : translateProvinceName(tab.name, language)}
              </button>
            ))}
          </div>

          <div className="relative group/carousel">
            {/* Nút Prev */}
            {featuredStartIndex > 0 && (
              <button
                type="button"
                onClick={() => setFeaturedStartIndex(featuredStartIndex - 1)}
                className="absolute left-[-18px] top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {/* Nút Next */}
            {featuredStartIndex < featuredHotels.length - 4 && (
              <button
                type="button"
                onClick={() => setFeaturedStartIndex(featuredStartIndex + 1)}
                className="absolute right-[-18px] top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-white border border-slate-200 shadow-md flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 shrink-0"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="bg-white border border-slate-100 rounded-premium h-80 animate-pulse"></div>
                ))}
              </div>
            ) : featuredHotels.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 transition-all duration-300">
                {featuredHotels.slice(featuredStartIndex, featuredStartIndex + 4).map((hotel) => (
                  <div
                    key={hotel.id}
                    onClick={() => navigate(`/hotel/${hotel.id}`)}
                    className="bg-white border border-slate-100 rounded-premium overflow-hidden shadow-sm hover-lift cursor-pointer flex flex-col justify-between group relative"
                  >
                    <div className="relative overflow-hidden">
                      <img
                        src={hotel.images[0]?.url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'}
                        alt={hotel.name}
                        className="w-full h-48 object-cover group-hover:scale-105 transition-all duration-300"
                      />

                      {/* Nút yêu thích Heart */}
                      <button
                        onClick={(e) => handleToggleFavorite(e, hotel.id)}
                        className="absolute top-3 right-3 p-1.5 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors shadow-md text-red-500 hover:scale-110 active:scale-90"
                      >
                        <Heart className={`w-4 h-4 ${hotel.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                      </button>
                    </div>

                    <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-primary transition-colors">{hotel.name}</h3>

                        {/* Biểu tượng số sao dưới tên khách sạn */}
                        <div className="flex items-center gap-0.5 pt-0.5">
                          {Array.from({ length: hotel.starRating || 5 }).map((_, i) => (
                            <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                          ))}
                        </div>

                        <div className="flex items-center gap-1 text-xs text-slate-400 font-medium pt-1">
                          <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                          <span className="line-clamp-1">{translateAddress(hotel.address, '', hotel.province, language)}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 border-t border-slate-50">
                        <div className="flex justify-between items-center text-xs">
                          {hotel.averageRating > 0 ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="bg-[#003b95] text-white text-[11px] px-1.5 py-0.5 rounded-t rounded-br rounded-bl-none font-black min-w-[24px] text-center">
                                {normalizeRating(hotel.averageRating).toFixed(1).replace('.', language === 'vi' ? ',' : '.')}
                              </span>
                              <span className="text-slate-700 font-extrabold text-[11px]">
                                {getRatingText(hotel.averageRating, language)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-semibold text-[11px]">{t.noReviews}</span>
                          )}
                          <span className="text-[10px] text-slate-400 font-bold">
                            {hotel.propertyType ? ({ HOTEL: 'Khách sạn', APARTMENT: 'Căn hộ', VILLA: 'Villa', RESORT: 'Resort', HOMESTAY: 'Homestay', GUESTHOUSE: 'Nhà nghỉ' } as Record<string, string>)[hotel.propertyType] || hotel.propertyType : ''}
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 font-medium">{t.priceFrom}</span>
                          {hotel.originalPriceFrom && hotel.originalPriceFrom > hotel.priceFrom && (
                            <span className="block text-[11px] text-slate-400 line-through leading-none mb-0.5">
                              {formatPrice(hotel.originalPriceFrom, currency)}
                            </span>
                          )}
                          <p className="font-extrabold text-sm text-red-500">
                            {hotel.priceFrom ? formatPrice(hotel.priceFrom, currency) : t.contact}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 bg-slate-50 rounded-premium border border-dashed border-slate-200 w-full col-span-full">
                <p className="text-sm font-bold text-slate-400">{t.noHotels}</p>
              </div>
            )}
          </div>
        </section>

        {/* Chỗ nghỉ yêu thích dựa trên điểm đánh giá */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="text-left space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">{t.guestFavoritesTitle}</h2>
            <p className="text-sm text-slate-400 font-medium">{t.guestFavoritesSubtitle}</p>
          </div>

          {topRatedLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((n) => (
                <div key={n} className="bg-white border border-slate-100 rounded-premium h-80 animate-pulse"></div>
              ))}
            </div>
          ) : topRatedHotels.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {topRatedHotels.map((hotel) => (
                <div
                  key={hotel.id}
                  onClick={() => navigate(`/hotel/${hotel.id}`)}
                  className="bg-white border border-slate-100 rounded-premium overflow-hidden shadow-sm hover-lift cursor-pointer flex flex-col justify-between group relative"
                >
                  <div className="relative overflow-hidden">
                    <img
                      src={hotel.images[0]?.url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'}
                      alt={hotel.name}
                      className="w-full h-48 object-cover group-hover:scale-105 transition-all duration-300"
                    />

                    {/* Nút yêu thích Heart */}
                    <button
                      onClick={(e) => handleToggleFavorite(e, hotel.id)}
                      className="absolute top-3 right-3 p-1.5 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors shadow-md text-red-500 hover:scale-110 active:scale-90"
                    >
                      <Heart className={`w-4 h-4 ${hotel.isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
                    </button>
                  </div>

                  <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-left">
                    <div className="space-y-1">
                      <h3 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-primary transition-colors">{hotel.name}</h3>

                      {/* Biểu tượng số sao dưới tên khách sạn */}
                      <div className="flex items-center gap-0.5 pt-0.5">
                        {Array.from({ length: hotel.starRating || 5 }).map((_, i) => (
                          <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        ))}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-400 font-medium pt-1">
                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                        <span className="line-clamp-1">{translateAddress(hotel.address, '', hotel.province, language)}</span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-50">
                      <div className="flex justify-between items-center text-xs">
                        {hotel.averageRating > 0 ? (
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className="bg-[#003b95] text-white text-[11px] px-1.5 py-0.5 rounded-t rounded-br rounded-bl-none font-black min-w-[24px] text-center">
                              {normalizeRating(hotel.averageRating).toFixed(1).replace('.', language === 'vi' ? ',' : '.')}
                            </span>
                            <span className="text-slate-700 font-extrabold text-[11px]">
                              {getRatingText(hotel.averageRating, language)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold text-[11px]">{t.noReviews}</span>
                        )}
                        <span className="text-[10px] text-slate-400 font-bold">
                          {hotel.propertyType ? ({ HOTEL: 'Khách sạn', APARTMENT: 'Căn hộ', VILLA: 'Villa', RESORT: 'Resort', HOMESTAY: 'Homestay', GUESTHOUSE: 'Nhà nghỉ' } as Record<string, string>)[hotel.propertyType] || hotel.propertyType : ''}
                        </span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-medium">{t.priceFrom}</span>
                        {hotel.originalPriceFrom && hotel.originalPriceFrom > hotel.priceFrom && (
                          <span className="block text-[11px] text-slate-400 line-through leading-none mb-0.5">
                            {formatPrice(hotel.originalPriceFrom, currency)}
                          </span>
                        )}
                        <p className="font-extrabold text-sm text-red-500">
                          {hotel.priceFrom ? formatPrice(hotel.priceFrom, currency) : t.contact}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 bg-slate-50 rounded-premium border border-dashed border-slate-200 w-full col-span-full">
              <p className="text-sm font-bold text-slate-400">{t.noHotelsRated}</p>
            </div>
          )}
        </section>

        {/* Vì sao lại chọn Cloud Booking */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pt-4">
          <div className="text-left space-y-1">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">{t.whyChooseTitle}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
            {/* Card 1: Đáp ứng mọi nhu cầu */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between text-left shadow-xs hover:shadow-md transition-all">
              <div className="space-y-3">
                {/* Luggage & Travel Illustration */}
                <div className="shrink-0">
                  <img
                    src="/lido1.png"
                    alt="Travel"
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                  {t.whyItem1Title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {language === 'vi' ? (
                    <>Khám phá nhiều loại hình lưu trú với mức giá hợp lý, vị trí thuận tiện và dịch vụ chất lượng, giúp mỗi chuyến đi trở nên dễ dàng hơn.</>
                  ) : (
                    t.whyItem1Desc
                  )}
                </p>
              </div>
            </div>

            {/* Card 2: Tùy chọn đặt chỗ linh hoạt */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between text-left shadow-xs hover:shadow-md transition-all">
              <div className="space-y-3">
                {/* Clipboard & Smile Illustration */}
                <div className="shrink-0">
                  <img
                    src="/lido2.png"
                    alt="Booking"
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                  {t.whyItem2Title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {language === 'vi' ? (
                    <>Kế hoạch thay đổi bất ngờ? Đừng lo! <strong className="font-bold text-slate-900">Đổi lịch</strong> hoặc <strong className="font-bold text-slate-900">Hoàn tiền</strong> dễ dàng.</>
                  ) : (
                    t.whyItem2Desc
                  )}
                </p>
              </div>
            </div>

            {/* Card 3: Thanh toán an toàn */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between text-left shadow-xs hover:shadow-md transition-all">
              <div className="space-y-3">
                {/* Shield & Security Illustration */}
                <div className="shrink-0">
                  <img
                    src="/lido3.png"
                    alt="Security"
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                  {t.whyItem3Title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {t.whyItem3Desc}
                </p>
              </div>
            </div>

            {/* Card 4: Dịch vụ khách hàng đáng tin cậy, hoạt động 24/7 */}
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 flex flex-col justify-between text-left shadow-xs hover:shadow-md transition-all">
              <div className="space-y-3">
                {/* Support 24/7 Illustration */}
                <div className="shrink-0">
                  <img
                    src="/lido4.png"
                    alt="CustomerSupport"
                    className="w-24 h-24 object-contain"
                  />
                </div>
                <h3 className="font-extrabold text-slate-900 text-base leading-snug">
                  {t.whyItem4Title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed">
                  {t.whyItem4Desc}
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;
