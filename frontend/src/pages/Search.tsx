import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setSearchCriteria, getLocalDateString } from '../store/slices/searchSlice';
import type { RootState } from '../store';
import apiClient from '../core/api/client';
import { VIETNAM_PROVINCES, type ProvinceItem } from '../core/constants/provinces';
import {
  MapPin,
  SlidersHorizontal,
  Bookmark,
  Building2,
  Calendar as CalendarIcon,
  Users,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  FileText,
  CreditCard
} from 'lucide-react';
import { formatPrice } from '../utils/price';
import { useModal } from '../components/common/ModalContext';

const StarIcon = ({ size = 14 }: { size?: number }) => (
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

const searchTranslations = {
  vi: {
    placeholderName: 'Tìm theo tên khách sạn...',
    resetBtn: 'Nhập lại',
    applyBtn: 'Áp dụng',
    filterTitle: 'Bộ lọc chỗ nghỉ',
    destinationLabel: 'Điểm đến',
    allDestinations: 'Tất cả điểm đến',
    budgetLabel: 'Ngân sách / đêm',
    minPrice: 'Tối thiểu',
    maxPrice: 'Tối đa',
    starLabel: 'Hạng sao',
    allStars: 'Tất cả hạng sao',
    starsCount: 'sao',
    typeLabel: 'Loại hình',
    allTypes: 'Tất cả loại hình',
    amenitiesLabel: 'Tiện nghi phổ biến',
    foundLabel: 'Tìm thấy',
    matchingHotels: 'chỗ nghỉ phù hợp',
    noHotelsTitle: 'Không tìm thấy kết quả phù hợp',
    noHotelsDesc: 'Vui lòng xóa bớt bộ lọc hoặc thay đổi từ khóa tìm kiếm để tiếp tục khám phá.',
    noReviews: 'Chưa có đánh giá',
    excellent: 'Tuyệt hảo',
    priceFrom: 'Giá mỗi đêm từ',
    contact: 'Liên hệ',
    starRatingSuffix: 'sao',
    reviewsCount: 'đánh giá',
    loginAlert: 'Vui lòng đăng nhập để lưu khách sạn yêu thích!',
    whereTo: 'Bạn muốn đến đâu?',
    recentSearches: 'Tìm kiếm gần đây của bạn',
    trendingDestsLabel: 'Điểm đến phổ biến',
    adults: 'người lớn',
    children: 'trẻ em',
    rooms: 'phòng',
    adultsLabel: 'Người lớn',
    childrenLabel: 'Trẻ em',
    roomsLabel: 'Phòng',
    done: 'Xong',
    searchBtn: 'Tìm',
    bannerTitle: 'Tìm kiếm điểm dừng chân lý tưởng cùng',
    bannerSubtitle: 'Hàng ngàn ưu đãi hấp dẫn đang chờ đón bạn.',
  },
  en: {
    placeholderName: 'Search by hotel name...',
    resetBtn: 'Reset',
    applyBtn: 'Apply',
    filterTitle: 'Filter Properties',
    destinationLabel: 'Location',
    allDestinations: 'All Locations',
    budgetLabel: 'Budget / night',
    minPrice: 'Min',
    maxPrice: 'Max',
    starLabel: 'Star Rating',
    allStars: 'All Stars',
    starsCount: 'stars',
    typeLabel: 'Property Type',
    allTypes: 'All Types',
    amenitiesLabel: 'Popular Amenities',
    foundLabel: 'Found',
    matchingHotels: 'matching properties',
    noHotelsTitle: 'No matching results found',
    noHotelsDesc: 'Please clear some filters or modify your keywords to continue exploring.',
    noReviews: 'No reviews yet',
    excellent: 'Excellent',
    priceFrom: 'From',
    contact: 'Contact Us',
    starRatingSuffix: 'star',
    reviewsCount: 'reviews',
    loginAlert: 'Please log in to save your favorite hotels!',
    whereTo: 'Where are you going?',
    recentSearches: 'Your recent searches',
    trendingDestsLabel: 'Popular destinations',
    adults: 'adults',
    children: 'children',
    rooms: 'rooms',
    adultsLabel: 'Adults',
    childrenLabel: 'Children',
    roomsLabel: 'Rooms',
    done: 'Done',
    searchBtn: 'Search',
    bannerTitle: 'Search your ideal properties with',
    bannerSubtitle: 'Thousands of attractive deals are waiting for you.',
  }
};

const filterLabels = {
  vi: {
    exploreMap: 'Xem trên bản đồ',
    price: 'Khoảng giá',
    perNight: '1 phòng, 1 đêm',
    reset: 'Đặt lại',
    popularFilters: 'Lọc phổ biến',
    dealsDiscounts: 'Khuyến mãi & Giảm giá',
    starRating: 'Đánh giá sao',
    guestRating: 'Đánh giá từ khách',
    propertyType: 'Loại hình lưu trú',
    popularAmenities: 'Tiện nghi phổ biến',
    flexibility: 'Linh hoạt hơn',
    uniqueAmenities: 'Tiện nghi độc đáo',
    roomAmenities: 'Tiện nghi phòng',
    showAll: 'Xem Tất cả',
    loc1: 'Vị trí thuận tiện',
    loc2: 'Phù hợp cho gia đình',
    loc3: 'View núi',
    deal1: 'Khuyến mãi dành cho bạn',
    deal2: 'Được yêu thích nhất',
    deal3: 'Có bữa sáng',
    rating1: 'Thuận tiện',
    rating2: 'Ấn tượng',
    rating3: 'Tuyệt hảo',
    flex1: 'Miễn phí hủy phòng',
    flex2: 'Thanh toán tại khách sạn',
    unique1: 'Khu vực mua sắm',
    unique2: 'Bar & Pub',
    unique3: 'Khu vực giải trí',
    unique4: 'Chơi golf',
    unique5: 'Thể thao trong nhà',
    room1: 'Máy sấy tóc',
    room2: 'Phòng cấm hút thuốc',
    room3: 'Phòng gia đình',
    room4: 'Tủ lạnh',
    room5: 'Bồn tắm',
  },
  en: {
    exploreMap: 'Explore on Map',
    price: 'Price Range',
    perNight: '1 room, 1 night',
    reset: 'Reset',
    popularFilters: 'Popular filters',
    dealsDiscounts: 'Deals & Discounts',
    starRating: 'Star rating',
    guestRating: 'Guest rating',
    propertyType: 'Property type',
    popularAmenities: 'Popular amenities',
    flexibility: 'More flexibility',
    uniqueAmenities: 'Unique amenities',
    roomAmenities: 'Room amenities',
    showAll: 'Show All',
    loc1: 'Convenient location',
    loc2: 'Family friendly',
    loc3: 'Mountain view',
    deal1: 'Deals for you',
    deal2: 'Most loved',
    deal3: 'Breakfast included',
    rating1: '7+ Convenient',
    rating2: '8+ Impressive',
    rating3: '9+ Excellent',
    flex1: 'Free cancellation',
    flex2: 'Pay at property',
    unique1: 'Shopping area',
    unique2: 'Bar & Pub',
    unique3: 'Entertainment area',
    unique4: 'Golfing',
    unique5: 'Indoor sports',
    room1: 'Hair dryer',
    room2: 'Non-smoking room',
    room3: 'Family room',
    room4: 'Refrigerator',
    room5: 'Bathtub',
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
    if (cleanName.includes('Khánh Hòa') || cleanName.toLowerCase().includes('khanh hoa')) return 'Khanh Hoa (Nha Trang)';
    if (cleanName.includes('Lâm Đồng') || cleanName.toLowerCase().includes('lam dong')) return 'Lam Dong (Da Lat)';
    if (cleanName.includes('Kiên Giang') || cleanName.toLowerCase().includes('kien giang')) return 'Kien Giang (Phu Quoc)';
    return removeVietnameseTones(cleanName);
  }
};





const getShortAddress = (district: string, province: string, lang: string) => {
  if (!district || !province) return '';
  const cleanDistrict = district
    .replace(/^(Quận|Huyện|Thành phố|Thị xã)\s+/i, '')
    .trim();
  const cleanProvince = province
    .replace(/^(Tỉnh|Thành phố)\s+/i, '')
    .trim();
  if (lang === 'vi') {
    return `${cleanDistrict}, ${cleanProvince}`;
  } else {
    return `${translateProvinceName(cleanDistrict, 'en')}, ${translateProvinceName(cleanProvince, 'en')}`;
  }
};

interface HotelResult {
  id: string;
  name: string;
  description: string;
  address: string;
  province: string;
  district: string;
  ward: string;
  starRating: number;
  priceFrom: number;
  originalPriceFrom?: number;
  averageRating: number;
  reviewCount: number;
  category: string;
  propertyType?: string;
  images: { url: string }[];
  isFavorite: boolean;
  amenities?: { id: string; name: string }[];
}

export const Search: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const criteria = useSelector((state: RootState) => state.search);
  const { language, currency } = useSelector((state: RootState) => state.settings);
  const t = searchTranslations[language];
  const { showAlert } = useModal();

  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);

  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const handleToggleFavorite = async (e: React.MouseEvent, hotelId: string) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      await showAlert(t.loginAlert, { type: 'warning' });
      navigate('/login');
      return;
    }

    try {
      const res = await apiClient.post(`/hotels/${hotelId}/favorite`);
      if (res.data.success) {
        setHotels((prev) =>
          prev.map((h) => (h.id === hotelId ? { ...h, isFavorite: !h.isFavorite } : h))
        );
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  // --- Các bộ lọc local để chỉnh sửa trước khi Dispatch ---
  const [provinceId, setProvinceId] = useState(criteria.provinceId);
  const [priceMin, setPriceMin] = useState<number | ''>(criteria.priceMin || '');
  const [priceMax, setPriceMax] = useState<number | ''>(criteria.priceMax || '');
  const [starRating, setStarRating] = useState<number | ''>(criteria.starRating || '');
  const [_categoryId, setCategoryId] = useState(criteria.categoryId);
  const [selectedPropertyType, setSelectedPropertyType] = useState<string>(() => {
    // Lấy propertyType từ URL query params nếu có
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('propertyType') || '';
  });
  const [amenityIds, setAmenityIds] = useState<string[]>(criteria.amenityIds);

  // States đồng bộ từ Home Search Bar
  const [destInputText, setDestInputText] = useState('');
  const [destError, setDestError] = useState(false);
  const [selectedHotelId, setSelectedHotelId] = useState<string | null>(null);
  const [checkIn, setCheckIn] = useState(criteria.checkInDate || '');
  const [checkOut, setCheckOut] = useState(criteria.checkOutDate || '');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);

  const [showDestPopover, setShowDestPopover] = useState(false);
  const [showDatePopover, setShowDatePopover] = useState(false);
  const [showGuestPopover, setShowGuestPopover] = useState(false);
  const [_dateTab, _setDateTab] = useState<'calendar' | 'flexible'>('calendar');

  const [recentSearches, setRecentSearches] = useState<any[]>([]);
  const [suggestedHotels, setSuggestedHotels] = useState<any[]>([]);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [cmsBanners, setCmsBanners] = useState<any[]>([]);

  useEffect(() => {
    apiClient.get('/cms/banners', { params: { activeOnly: 'true' } })
      .then(res => {
        if (res.data.success && Array.isArray(res.data.data)) {
          setCmsBanners(res.data.data);
        }
      })
      .catch(err => console.error('Failed to fetch CMS banners in search:', err));
  }, []);

  const searchBanner = cmsBanners.find(b => b.position === 'SEARCH_BANNER');
  const searchHeroBgUrl = searchBanner?.imageUrl || '/banner.webp';

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    popular: true,
    deals: true,
    stars: true,
    rating: true,
    types: true,
    amenities: true,
    flex: true,
    unique: true,
    room: true,
  });

  const toggleSection = (section: string) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const [selectedPopular, setSelectedPopular] = useState<string[]>([]);
  const [selectedDeals, setSelectedDeals] = useState<string[]>([]);
  const [selectedRatings, setSelectedRatings] = useState<string[]>([]);
  const [selectedFlex, setSelectedFlex] = useState<string[]>([]);
  const [selectedUnique, setSelectedUnique] = useState<string[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string[]>([]);

  const [showAllStates, setShowAllStates] = useState<Record<string, boolean>>({
    popular: false,
    deals: false,
    types: false,
    amenities: false,
    unique: false,
    room: false,
  });

  const toggleShowAll = (section: string) => {
    setShowAllStates((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const today = new Date();
  const [month1, setMonth1] = useState(today.getMonth());
  const [year1, setYear1] = useState(today.getFullYear());

  const month2 = month1 === 11 ? 0 : month1 + 1;
  const year2 = month1 === 11 ? year1 + 1 : year1;



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



  // Danh sách tiện ích mặc định
  const [dbAmenities, setDbAmenities] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    // Fetch danh sách tiện ích từ backend
    const fetchAmenities = async () => {
      try {
        setDbAmenities([
          { id: 'wifi-mock-id', name: 'Wifi miễn phí' },
          { id: 'pool-mock-id', name: 'Hồ bơi' },
          { id: 'parking-mock-id', name: 'Bãi đỗ xe' },
          { id: 'gym-mock-id', name: 'Phòng Gym / Thể hình' }
        ]);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAmenities();
  }, []);

  // Fetch dữ liệu khách sạn mỗi khi criteria trong Redux thay đổi
  useEffect(() => {
    const fetchHotels = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if (criteria.categoryId) params.categoryId = criteria.categoryId;
        if (selectedPropertyType && selectedPropertyType !== 'ALL') params.propertyType = selectedPropertyType;
        if (criteria.starRating) params.starRating = criteria.starRating;
        if (criteria.priceMin) params.priceMin = criteria.priceMin;
        if (criteria.priceMax) params.priceMax = criteria.priceMax;
        if (criteria.checkInDate) params.checkIn = criteria.checkInDate;
        if (criteria.checkOutDate) params.checkOut = criteria.checkOutDate;

        if (criteria.searchQuery && criteria.searchQuery.trim()) {
          const qTrim = criteria.searchQuery.trim();
          const queryNorm = removeVietnameseTones(qTrim.toLowerCase());
          const matchedProv = provincesList.find(p =>
            p.name.toLowerCase() === qTrim.toLowerCase() ||
            removeVietnameseTones(p.name.toLowerCase()) === queryNorm ||
            p.keywords?.some(k => removeVietnameseTones(k.toLowerCase()) === queryNorm || queryNorm.includes(removeVietnameseTones(k.toLowerCase())))
          );

          if (matchedProv) {
            params.provinceId = matchedProv.id;
          } else {
            params.searchQuery = qTrim;
          }
        } else if (criteria.provinceId) {
          params.provinceId = criteria.provinceId;
        }

        // Gửi mảng tiện ích
        if (criteria.amenityIds && criteria.amenityIds.length > 0) {
          params.amenityIds = criteria.amenityIds;
        }

        const res = await apiClient.get('/hotels', { params });
        if (res.data.success) {
          setHotels(res.data.data.hotels);
          setTotalResults(res.data.data.pagination.total);
        }
      } catch (err) {
        console.error('Failed to fetch filtered hotels:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHotels();
  }, [criteria, selectedPropertyType, provincesList]);

  const getProvinceName = (id: string) => {
    if (!id) return '';
    const prov = provincesList.find((p) => p.id === id);
    if (prov) return prov.name;
    const staticProv = VIETNAM_PROVINCES.find((p) => p.id === id);
    return staticProv ? staticProv.name : '';
  };

  // Đồng bộ hóa các bộ lọc cục bộ khi criteria từ Redux thay đổi
  useEffect(() => {
    setProvinceId(criteria.provinceId || '');
    setPriceMin(criteria.priceMin || '');
    setPriceMax(criteria.priceMax || '');
    setStarRating(criteria.starRating || '');
    setCategoryId(criteria.categoryId || '');
    setAmenityIds(criteria.amenityIds || []);
    setCheckIn(criteria.checkInDate || '');
    setCheckOut(criteria.checkOutDate || '');

    if (criteria.searchQuery) {
      setDestInputText(criteria.searchQuery);
    } else if (criteria.provinceId) {
      const pName = getProvinceName(criteria.provinceId);
      if (pName) {
        setDestInputText(translateProvinceName(pName, language));
      }
    } else {
      setDestInputText('');
    }
  }, [criteria, language, provincesList]);

  // Clear destination error when input has value
  useEffect(() => {
    if (destInputText.trim()) {
      setDestError(false);
    }
  }, [destInputText]);

  // Synchronize destination input text on provinceId change or initial load
  useEffect(() => {
    if (provinceId && !selectedHotelId) {
      const pName = getProvinceName(provinceId);
      if (pName) {
        setDestInputText(translateProvinceName(pName, language));
      }
    }
  }, [provinceId, language, provincesList, selectedHotelId]);

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
  }, [destInputText]);

  // Date list utilities
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

  const isInHoverRange = (dateStr: string) => {
    if (checkIn && !checkOut && hoveredDate && dateStr > checkIn && dateStr <= hoveredDate) {
      return true;
    }
    return false;
  };



  const monthNames = [
    'tháng 1', 'tháng 2', 'tháng 3', 'tháng 4', 'tháng 5', 'tháng 6',
    'tháng 7', 'tháng 8', 'tháng 9', 'tháng 10', 'tháng 11', 'tháng 12'
  ];

  const formatSearchDatesHelper = (start: string, end: string) => {
    if (start && end) {
      const sDate = new Date(start.includes('T') ? start : start + 'T00:00:00');
      const eDate = new Date(end.includes('T') ? end : end + 'T00:00:00');
      const daysOfWeek = ['Chủ Nhật', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
      return `${daysOfWeek[sDate.getDay()]}, ${sDate.getDate()} tháng ${sDate.getMonth() + 1} – ${daysOfWeek[eDate.getDay()]}, ${eDate.getDate()} tháng ${eDate.getMonth() + 1}`;
    }
    return 'Lịch linh hoạt';
  };

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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!destInputText.trim()) {
      setDestError(true);
      return;
    }

    if (selectedHotelId) {
      dispatch(setSearchCriteria({
        provinceId: provinceId,
        searchQuery: destInputText.trim(),
        checkInDate: checkIn,
        checkOutDate: checkOut,
        guests: adults + children
      }));
      navigate(`/hotel/${selectedHotelId}`);
      return;
    }

    const matchedProv = provincesList.find(
      (p) => p.name.toLowerCase() === destInputText.trim().toLowerCase()
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
  };





  const toggleAmenity = (name: string) => {
    const updated = amenityIds.includes(name)
      ? amenityIds.filter(item => item !== name)
      : [...amenityIds, name];
    setAmenityIds(updated);
    dispatch(setSearchCriteria({
      ...criteria,
      amenityIds: updated
    }));
  };

  const handleStarCheck = (rating: number) => {
    const updated = starRating === rating ? '' : rating;
    setStarRating(updated);
    dispatch(setSearchCriteria({
      ...criteria,
      starRating: updated === '' ? null : updated
    }));
  };



  const matchedProvinces = destInputText
    ? provincesList.filter((p) => {
      const normInput = removeVietnameseTones(destInputText.toLowerCase()).trim();
      const normName = removeVietnameseTones(p.name.toLowerCase());
      const matchesName = normName.includes(normInput);
      const matchesKeywords = p.keywords?.some(
        (k) => k.includes(normInput) || normInput.includes(k)
      ) || false;
      return matchesName || matchesKeywords;
    })
    : [];

  const combinedSuggestions = [
    ...matchedProvinces.map((p) => ({ ...p, type: 'province' as const })),
    ...suggestedHotels.map((h) => ({ ...h, type: 'hotel' as const }))
  ];

  // 1. Popular items list
  const popularItems = [
    { id: 'loc1', label: filterLabels[language].loc1 },
    { id: 'loc2', label: filterLabels[language].loc2 },
    { id: 'loc3', label: filterLabels[language].loc3 },
    { id: 'loc4', label: language === 'vi' ? 'Giáp biển' : 'Beachfront' },
    { id: 'loc5', label: language === 'vi' ? 'Gần trung tâm' : 'Near city center' },
    { id: 'loc6', label: language === 'vi' ? 'Có hồ bơi riêng' : 'Private pool' },
  ];
  const displayedPopular = showAllStates.popular ? popularItems : popularItems.slice(0, 3);

  // 2. Deals items list
  const dealsItems = [
    { id: 'deal1', label: filterLabels[language].deal1 },
    { id: 'deal2', label: filterLabels[language].deal2 },
    { id: 'deal3', label: filterLabels[language].deal3 },
    { id: 'deal4', label: language === 'vi' ? 'Ưu đãi mùa hè' : 'Summer deals' },
    { id: 'deal5', label: language === 'vi' ? 'Giảm giá giờ chót' : 'Last minute deals' },
    { id: 'deal6', label: language === 'vi' ? 'Ưu đãi thành viên' : 'Genius member deals' },
  ];
  const displayedDeals = showAllStates.deals ? dealsItems : dealsItems.slice(0, 3);

  // 3. PropertyType filter items — dùng enum thực tế
  const PROPERTY_TYPES = [
    { id: 'HOTEL', name: language === 'vi' ? 'Khách sạn' : 'Hotel' },
    { id: 'APARTMENT', name: language === 'vi' ? 'Căn hộ' : 'Apartment' },
    { id: 'VILLA', name: language === 'vi' ? 'Villa' : 'Villa' },
    { id: 'RESORT', name: language === 'vi' ? 'Resort' : 'Resort' },
    { id: 'HOMESTAY', name: language === 'vi' ? 'Homestay' : 'Homestay' },
    { id: 'GUESTHOUSE', name: language === 'vi' ? 'Nhà nghỉ' : 'Guesthouse' },
  ];
  const displayedTypes = showAllStates.types ? PROPERTY_TYPES : PROPERTY_TYPES.slice(0, 4);

  // 4. Amenities list
  const amenityItemsList = [
    ...dbAmenities,
    { id: 'restaurant', name: language === 'vi' ? 'Nhà hàng' : 'Restaurant' },
    { id: 'bar', name: language === 'vi' ? 'Quầy bar' : 'Bar' },
    { id: 'spa', name: language === 'vi' ? 'Spa & Massage' : 'Spa & Massage' },
    { id: 'desk24', name: language === 'vi' ? 'Lễ tân 24 giờ' : '24-hour front desk' },
    { id: 'room_service', name: language === 'vi' ? 'Dịch vụ phòng' : 'Room service' },
  ];
  const displayedAmenities = showAllStates.amenities ? amenityItemsList : amenityItemsList.slice(0, 4);

  // 5. Unique amenities list
  const uniqueItems = [
    { id: 'unique1', label: filterLabels[language].unique1 },
    { id: 'unique2', label: filterLabels[language].unique2 },
    { id: 'unique3', label: filterLabels[language].unique3 },
    { id: 'unique4', label: filterLabels[language].unique4 },
    { id: 'unique5', label: filterLabels[language].unique5 },
    { id: 'unique6', label: language === 'vi' ? 'Bida / Billiards' : 'Billiards' },
    { id: 'unique7', label: language === 'vi' ? 'Karaoke' : 'Karaoke' },
    { id: 'unique8', label: language === 'vi' ? 'Lặn biển' : 'Diving' },
    { id: 'unique9', label: language === 'vi' ? 'Chèo thuyền Kayak' : 'Kayak' },
  ];
  const displayedUnique = showAllStates.unique ? uniqueItems : uniqueItems.slice(0, 5);

  // 6. Room amenities list
  const roomItems = [
    { id: 'room1', label: filterLabels[language].room1 },
    { id: 'room2', label: filterLabels[language].room2 },
    { id: 'room3', label: filterLabels[language].room3 },
    { id: 'room4', label: filterLabels[language].room4 },
    { id: 'room5', label: filterLabels[language].room5 },
    { id: 'room6', label: language === 'vi' ? 'Điều hòa nhiệt độ' : 'Air conditioning' },
    { id: 'room7', label: language === 'vi' ? 'Ban công hướng vườn' : 'Garden balcony' },
    { id: 'room8', label: language === 'vi' ? 'Két sắt an toàn' : 'Safety deposit box' },
    { id: 'room9', label: language === 'vi' ? 'Lò vi sóng' : 'Microwave' },
  ];
  const displayedRoom = showAllStates.room ? roomItems : roomItems.slice(0, 5);


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

  const translateAmenityName = (name: string, lang: string) => {
    if (!name) return '';
    const lower = name.toLowerCase().trim();
    if (lang === 'vi') {
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



  const getHotelImages = (hotel: HotelResult) => {
    const list = [...(hotel.images || [])].map(img => img.url);
    const cat = hotel.category.toLowerCase();
    let fallbacks = [
      'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500',
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=300',
      'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=300',
      'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=300',
    ];
    if (cat.includes('resort') || cat.includes('nghỉ dưỡng')) {
      fallbacks = [
        'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=500',
        'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=300',
        'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=300',
        'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=300',
      ];
    } else if (cat.includes('homestay') || cat.includes('apartment')) {
      fallbacks = [
        'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=500',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=300',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=300',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=300',
      ];
    }

    while (list.length < 4) {
      list.push(fallbacks[list.length] || fallbacks[0]);
    }

    return list;
  };

  return (
    <div>
      {/* Banner & Search bar section wrapper */}
      <div className="relative">
        {/* Hero Section */}
        <section
          style={{ backgroundImage: `url('${searchHeroBgUrl}')` }}
          className="relative bg-cover bg-center text-white pt-24 pb-16 px-4 sm:px-6 lg:px-8 shadow-2xl overflow-hidden min-h-[220px] flex items-center justify-center transition-all duration-700"
        >
          {/* Lớp phủ tối nhẹ sắc nét bảo vệ độ tương phản chữ */}
          <div className="absolute inset-0 bg-black/35 z-0"></div>

          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-secondary/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>

          <div className="max-w-4xl mx-auto w-full text-center space-y-2 relative z-10 pb-4">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              {t.bannerTitle} <span className="bg-gradient-to-r from-amber-300 to-yellow-500 bg-clip-text text-transparent">Cloud Booking</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-200 max-w-xl mx-auto font-light">
              {t.bannerSubtitle}
            </p>
          </div>
        </section>

        {/* Booking.com Style Standard Search Bar */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-30 -mt-8">
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
                placeholder={destError ? (language === 'vi' ? 'Vui lòng nhập địa điểm!' : 'Please enter a destination!') : t.whereTo}
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
                                    <p className="text-[10px] font-bold text-slate-550">{language === 'vi' ? 'Việt Nam' : 'Vietnam'}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      ) : (
                        /* Case 2: Search input has text -> Show combined results (Destinations + Hotels mixed) */
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
                                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-550 cursor-pointer transition-colors"
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
                                        navigate(`/hotel/${item.id}`);
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Filter Panel - Booking.com Modular Cards */}
          <aside className="w-full lg:w-72 space-y-4 shrink-0">
            {/* Map card */}
            <div className="relative overflow-hidden border border-slate-100 shadow-[0_2px_8px_rgba(0,0,0,0.04)] rounded-xl h-32 bg-sky-50 flex flex-col items-center justify-center gap-2.5 p-4">
              <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#006ce4_1px,transparent_1px)] [background-size:16px_16px]"></div>
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md border border-primary/10 z-10 animate-bounce">
                <MapPin className="w-5 h-5 text-primary" />
              </div>
              <button type="button" className="z-10 bg-[#006ce4] hover:bg-[#0056b3] text-white font-extrabold text-xs px-4 py-2 rounded-full shadow-md transition-all active:scale-95">
                {filterLabels[language].exploreMap}
              </button>
            </div>

            {/* Price range filter card */}
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-extrabold text-slate-800 text-sm">{filterLabels[language].price}</h4>
                  <p className="text-[10px] text-slate-400 font-bold">{filterLabels[language].perNight}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setPriceMin('');
                    setPriceMax('');
                    dispatch(setSearchCriteria({ ...criteria, priceMin: null, priceMax: null }));
                  }}
                  className="text-xs font-extrabold text-blue-600 hover:text-blue-800"
                >
                  {filterLabels[language].reset}
                </button>
              </div>

              {/* Functional Dual Range Slider */}
              <div className="h-5 relative flex items-center mt-2 mb-2">
                {/* Slider Track Background */}
                <div className="h-1 bg-slate-100 rounded-full w-full"></div>

                {/* Slider Track Active Highlight */}
                <div
                  className="absolute h-1 bg-primary rounded-full top-1/2 transform -translate-y-1/2"
                  style={{
                    left: `${(Number(priceMin || 0) / 24000000) * 100}%`,
                    right: `${100 - (Number(priceMax === '' ? 24000000 : priceMax) / 24000000) * 100}%`
                  }}
                ></div>

                {/* Range Min Slider Input */}
                <input
                  type="range"
                  min="0"
                  max="24000000"
                  step="100000"
                  value={priceMin || 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (priceMax === '' || val <= Number(priceMax)) {
                      setPriceMin(val);
                    }
                  }}
                  onMouseUp={() => dispatch(setSearchCriteria({ ...criteria, priceMin: priceMin === '' ? null : Number(priceMin) }))}
                  onTouchEnd={() => dispatch(setSearchCriteria({ ...criteria, priceMin: priceMin === '' ? null : Number(priceMin) }))}
                  className="absolute w-full h-full left-0 top-0 pointer-events-none appearance-none bg-transparent focus:outline-none z-10
                           [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#006ce4] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110
                           [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#006ce4] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer"
                />

                {/* Range Max Slider Input */}
                <input
                  type="range"
                  min="0"
                  max="24000000"
                  step="100000"
                  value={priceMax === '' ? 24000000 : priceMax}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (priceMin === '' || val >= Number(priceMin)) {
                      setPriceMax(val);
                    }
                  }}
                  onMouseUp={() => dispatch(setSearchCriteria({ ...criteria, priceMax: priceMax === '' ? null : Number(priceMax) }))}
                  onTouchEnd={() => dispatch(setSearchCriteria({ ...criteria, priceMax: priceMax === '' ? null : Number(priceMax) }))}
                  className="absolute w-full h-full left-0 top-0 pointer-events-none appearance-none bg-transparent focus:outline-none z-10
                           [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#006ce4] [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:active:scale-110
                           [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[#006ce4] [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:shadow-lg [&::-moz-range-thumb]:cursor-pointer"
                />
              </div>

              <div className="flex gap-2 justify-between items-center text-xs">
                <div className="flex items-center justify-between gap-1 border border-slate-200 rounded-lg pl-2 pr-1.5 py-1.5 bg-slate-50 flex-1">
                  <input
                    type="text"
                    value={priceMin === '' ? '' : new Intl.NumberFormat('vi-VN').format(priceMin)}
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, '');
                      setPriceMin(num === '' ? '' : Number(num));
                    }}
                    onBlur={() => dispatch(setSearchCriteria({ ...criteria, priceMin: priceMin === '' ? null : Number(priceMin) }))}
                    onKeyDown={(e) => e.key === 'Enter' && dispatch(setSearchCriteria({ ...criteria, priceMin: priceMin === '' ? null : Number(priceMin) }))}
                    placeholder="0"
                    className="w-full bg-transparent font-extrabold text-slate-800 text-left focus:outline-none placeholder-slate-400 text-[11px]"
                  />
                  <span className="text-slate-400 font-extrabold text-[10px] shrink-0 select-none">VND</span>
                </div>
                <div className="flex items-center justify-between gap-1 border border-slate-200 rounded-lg pl-2 pr-1.5 py-1.5 bg-slate-50 flex-1">
                  <input
                    type="text"
                    value={priceMax === '' ? '' : new Intl.NumberFormat('vi-VN').format(priceMax)}
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, '');
                      setPriceMax(num === '' ? '' : Number(num));
                    }}
                    onBlur={() => dispatch(setSearchCriteria({ ...criteria, priceMax: priceMax === '' ? null : Number(priceMax) }))}
                    onKeyDown={(e) => e.key === 'Enter' && dispatch(setSearchCriteria({ ...criteria, priceMax: priceMax === '' ? null : Number(priceMax) }))}
                    placeholder="24.000.000"
                    className="w-full bg-transparent font-extrabold text-slate-800 text-left focus:outline-none placeholder-slate-400 text-[11px]"
                  />
                  <span className="text-slate-400 font-extrabold text-[10px] shrink-0 select-none">VND</span>
                </div>
              </div>
            </div>

            {/* Popular filters card */}
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <div
                onClick={() => toggleSection('popular')}
                className="flex justify-between items-center cursor-pointer select-none"
              >
                <span className="font-extrabold text-slate-800 text-sm">{filterLabels[language].popularFilters}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.popular ? 'rotate-180' : ''}`} />
              </div>
              {openSections.popular && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                  {displayedPopular.map((item) => (
                    <label key={item.id} className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedPopular.includes(item.id)}
                        onChange={() => {
                          const updated = selectedPopular.includes(item.id)
                            ? selectedPopular.filter(x => x !== item.id)
                            : [...selectedPopular, item.id];
                          setSelectedPopular(updated);
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleShowAll('popular')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 block pt-1 text-left"
                  >
                    {showAllStates.popular ? (language === 'vi' ? 'Rút gọn' : 'Show Less') : filterLabels[language].showAll}
                  </button>
                </div>
              )}
            </div>

            {/* Deals & Discounts card */}
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <div
                onClick={() => toggleSection('deals')}
                className="flex justify-between items-center cursor-pointer select-none"
              >
                <span className="font-extrabold text-slate-800 text-sm">{filterLabels[language].dealsDiscounts}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.deals ? 'rotate-180' : ''}`} />
              </div>
              {openSections.deals && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                  {displayedDeals.map((item) => (
                    <label key={item.id} className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedDeals.includes(item.id)}
                        onChange={() => {
                          const updated = selectedDeals.includes(item.id)
                            ? selectedDeals.filter(x => x !== item.id)
                            : [...selectedDeals, item.id];
                          setSelectedDeals(updated);
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleShowAll('deals')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 block pt-1 text-left"
                  >
                    {showAllStates.deals ? (language === 'vi' ? 'Rút gọn' : 'Show Less') : filterLabels[language].showAll}
                  </button>
                </div>
              )}
            </div>

            {/* Star Rating card */}
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <div
                onClick={() => toggleSection('stars')}
                className="flex justify-between items-center cursor-pointer select-none"
              >
                <span className="font-extrabold text-slate-800 text-sm">{filterLabels[language].starRating}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.stars ? 'rotate-180' : ''}`} />
              </div>
              {openSections.stars && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <label key={s} className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={Number(starRating) === s}
                        onChange={() => handleStarCheck(s)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="flex items-center gap-1 font-bold text-slate-800">
                        {s} <StarIcon size={14} />
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Guest Rating card */}
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <div
                onClick={() => toggleSection('rating')}
                className="flex justify-between items-center cursor-pointer select-none"
              >
                <span className="font-extrabold text-slate-800 text-sm">{filterLabels[language].guestRating}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.rating ? 'rotate-180' : ''}`} />
              </div>
              {openSections.rating && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                  {[
                    { id: 'rating1', label: filterLabels[language].rating1, val: '7+' },
                    { id: 'rating2', label: filterLabels[language].rating2, val: '8+' },
                    { id: 'rating3', label: filterLabels[language].rating3, val: '9+' }
                  ].map((item) => (
                    <label key={item.id} className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedRatings.includes(item.id)}
                        onChange={() => {
                          const updated = selectedRatings.includes(item.id)
                            ? selectedRatings.filter(x => x !== item.id)
                            : [...selectedRatings, item.id];
                          setSelectedRatings(updated);
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="flex items-center gap-1">
                        <span className="text-blue-500 font-extrabold">✈ {item.val}</span> {item.label}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Property Type card */}
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <div
                onClick={() => toggleSection('types')}
                className="flex justify-between items-center cursor-pointer select-none"
              >
                <span className="font-extrabold text-slate-800 text-sm">{filterLabels[language].propertyType}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.types ? 'rotate-180' : ''}`} />
              </div>
              {openSections.types && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                  {displayedTypes.map((pt) => (
                    <label key={pt.id} className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedPropertyType === pt.id}
                        onChange={() => {
                          const updated = selectedPropertyType === pt.id ? '' : pt.id;
                          setSelectedPropertyType(updated);
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span>{pt.name}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleShowAll('types')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 block pt-1 text-left"
                  >
                    {showAllStates.types ? (language === 'vi' ? 'Rút gọn' : 'Show Less') : filterLabels[language].showAll}
                  </button>
                </div>
              )}
            </div>

            {/* Popular amenities card */}
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <div
                onClick={() => toggleSection('amenities')}
                className="flex justify-between items-center cursor-pointer select-none"
              >
                <span className="font-extrabold text-slate-800 text-sm">{filterLabels[language].popularAmenities}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.amenities ? 'rotate-180' : ''}`} />
              </div>
              {openSections.amenities && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                  {displayedAmenities.map((am) => (
                    <label key={am.id} className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={amenityIds.includes(am.name)}
                        onChange={() => toggleAmenity(am.name)}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span>{am.name}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleShowAll('amenities')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 block pt-1 text-left"
                  >
                    {showAllStates.amenities ? (language === 'vi' ? 'Rút gọn' : 'Show Less') : filterLabels[language].showAll}
                  </button>
                </div>
              )}
            </div>

            {/* Flexibility card */}
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <div
                onClick={() => toggleSection('flex')}
                className="flex justify-between items-center cursor-pointer select-none"
              >
                <span className="font-extrabold text-slate-800 text-sm">{filterLabels[language].flexibility}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.flex ? 'rotate-180' : ''}`} />
              </div>
              {openSections.flex && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                  {[
                    { id: 'flex1', label: filterLabels[language].flex1, icon: <FileText className="w-4 h-4 text-blue-600 shrink-0" /> },
                    { id: 'flex2', label: filterLabels[language].flex2, icon: <CreditCard className="w-4 h-4 text-emerald-600 shrink-0" /> }
                  ].map((item) => (
                    <label key={item.id} className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedFlex.includes(item.id)}
                        onChange={() => {
                          const updated = selectedFlex.includes(item.id)
                            ? selectedFlex.filter(x => x !== item.id)
                            : [...selectedFlex, item.id];
                          setSelectedFlex(updated);
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="flex items-center gap-1">
                        {item.label} {item.icon}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Unique amenities card */}
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <div
                onClick={() => toggleSection('unique')}
                className="flex justify-between items-center cursor-pointer select-none"
              >
                <span className="font-extrabold text-slate-800 text-sm">{filterLabels[language].uniqueAmenities}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.unique ? 'rotate-180' : ''}`} />
              </div>
              {openSections.unique && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                  {displayedUnique.map((item) => (
                    <label key={item.id} className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedUnique.includes(item.id)}
                        onChange={() => {
                          const updated = selectedUnique.includes(item.id)
                            ? selectedUnique.filter(x => x !== item.id)
                            : [...selectedUnique, item.id];
                          setSelectedUnique(updated);
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleShowAll('unique')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 block pt-1 text-left"
                  >
                    {showAllStates.unique ? (language === 'vi' ? 'Rút gọn' : 'Show Less') : filterLabels[language].showAll}
                  </button>
                </div>
              )}
            </div>

            {/* Room amenities card */}
            <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)] space-y-4">
              <div
                onClick={() => toggleSection('room')}
                className="flex justify-between items-center cursor-pointer select-none"
              >
                <span className="font-extrabold text-slate-800 text-sm">{filterLabels[language].roomAmenities}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${openSections.room ? 'rotate-180' : ''}`} />
              </div>
              {openSections.room && (
                <div className="space-y-2.5 pt-1 animate-in fade-in duration-200">
                  {displayedRoom.map((item) => (
                    <label key={item.id} className="flex items-center gap-3 text-xs font-semibold text-slate-700 cursor-pointer hover:text-slate-900 transition-colors">
                      <input
                        type="checkbox"
                        checked={selectedRoom.includes(item.id)}
                        onChange={() => {
                          const updated = selectedRoom.includes(item.id)
                            ? selectedRoom.filter(x => x !== item.id)
                            : [...selectedRoom, item.id];
                          setSelectedRoom(updated);
                        }}
                        className="rounded border-slate-300 text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                  <button
                    type="button"
                    onClick={() => toggleShowAll('room')}
                    className="text-xs font-bold text-blue-600 hover:text-blue-800 block pt-1 text-left"
                  >
                    {showAllStates.room ? (language === 'vi' ? 'Rút gọn' : 'Show Less') : filterLabels[language].showAll}
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Right Results Section */}
          <section className="flex-1 space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-xs font-bold text-slate-400 uppercase">
                {t.foundLabel} <span className="text-primary">{totalResults}</span> {t.matchingHotels}
              </p>
            </div>

            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="bg-white border border-slate-100 rounded-premium h-44 animate-pulse"></div>
                ))}
              </div>
            ) : hotels.length === 0 ? (
              <div className="bg-white border border-slate-100 p-12 text-center rounded-premium space-y-3 shadow-sm">
                <SlidersHorizontal className="w-12 h-12 text-slate-300 mx-auto" />
                <h3 className="font-bold text-slate-700">{t.noHotelsTitle}</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {t.noHotelsDesc}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {hotels.map((hotel) => {
                  const hotelImages = getHotelImages(hotel);
                  const displayAmenities = hotel.amenities || [];

                  return (
                    <div
                      key={hotel.id}
                      onClick={() => navigate(`/hotel/${hotel.id}`)}
                      className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:border-[#006ce4]/30 hover:shadow-md transition-all duration-300 flex flex-col md:flex-row md:min-h-[220px] cursor-pointer"
                    >
                      {/* Left Column: Image Grid (1 large, 3 small) */}
                      <div className="w-full md:w-64 shrink-0 flex flex-col gap-1 p-2 bg-white">
                        {/* Large Image */}
                        <div className="relative aspect-[4/3] w-full rounded-lg overflow-hidden group">
                          <img
                            src={hotelImages[0]}
                            alt={hotel.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {/* Bookmark Button */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleFavorite(e, hotel.id)}
                            className="absolute top-2 right-2 p-1 bg-black/25 text-white rounded border border-white/20 hover:bg-black/40 transition-colors z-10"
                          >
                            <Bookmark className={`w-3.5 h-3.5 ${hotel.isFavorite ? 'fill-white text-white' : 'text-white'}`} />
                          </button>
                        </div>

                        {/* Bottom 3 Images Grid */}
                        <div className="grid grid-cols-3 gap-1">
                          <div className="h-[44px] rounded-md overflow-hidden">
                            <img
                              src={hotelImages[1]}
                              alt={`${hotel.name} room`}
                              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            />
                          </div>
                          <div className="h-[44px] rounded-md overflow-hidden">
                            <img
                              src={hotelImages[2]}
                              alt={`${hotel.name} detail`}
                              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            />
                          </div>
                          <div className="h-[44px] rounded-md overflow-hidden relative group">
                            <img
                              src={hotelImages[3]}
                              alt={`${hotel.name} view`}
                              className="w-full h-full object-cover hover:opacity-90 transition-opacity"
                            />
                            <div className="absolute inset-0 bg-black/50 flex items-center justify-center cursor-pointer group-hover:bg-black/40 transition-colors">
                              <span className="text-[9px] text-white font-extrabold tracking-wide uppercase whitespace-nowrap">
                                {language === 'vi' ? 'Xem ảnh' : 'Photos'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Middle Column: Hotel Details */}
                      <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                        <div className="space-y-3">
                          <h3 className="font-extrabold text-slate-900 text-lg leading-tight hover:text-[#006ce4] transition-colors line-clamp-1">
                            {hotel.name}
                          </h3>

                          {/* Category & PropertyType badge + Stars */}
                          <div className="flex items-center gap-2 flex-wrap !mt-5">
                            {hotel.propertyType && (
                              <span className="inline-flex items-center text-xs font-extrabold bg-purple-50 text-purple-600 px-2 py-0.5 rounded">
                                {language === 'vi'
                                  ? { HOTEL: 'Khách sạn', APARTMENT: 'Căn hộ', VILLA: 'Villa', RESORT: 'Resort', HOMESTAY: 'Homestay', GUESTHOUSE: 'Nhà nghỉ' }[hotel.propertyType] || hotel.propertyType
                                  : hotel.propertyType.charAt(0) + hotel.propertyType.slice(1).toLowerCase()
                                }
                              </span>
                            )}
                            <div className="flex items-center gap-0.5">
                              {Array.from({ length: hotel.starRating || 0 }).map((_, i) => (
                                <StarIcon key={i} size={12} />
                              ))}
                            </div>
                          </div>

                          {/* Location */}
                          <div className="flex items-center gap-1 text-sm text-slate-800 font-extrabold">
                            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                            <span>{getShortAddress(hotel.district, hotel.province, language)}</span>
                          </div>

                          {/* Amenities row */}
                          {displayAmenities.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {displayAmenities.slice(0, 3).map((am: any) => (
                                <span key={am.id} className="text-xs font-semibold text-slate-600 bg-slate-100/90 px-2.5 py-1.5 rounded">
                                  {translateAmenityName(am.name, language)}
                                </span>
                              ))}
                              {displayAmenities.length > 3 && (
                                <span className="text-xs font-semibold text-slate-400 bg-slate-50 px-1.5 py-1.5 rounded border border-slate-100">
                                  +{displayAmenities.length - 3}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        {/* Extra Benefit Badge */}
                      </div>

                      {/* Right Column: Ratings & Price Section */}
                      <div className="w-full md:w-52 p-4 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-100 shrink-0 text-right">
                        {/* Rating details */}
                        <div className="flex items-center justify-end gap-2 text-right">
                          {hotel.reviewCount > 0 ? (
                            <>
                              <div className="text-right">
                                <p className="font-extrabold text-slate-900 text-[13px] leading-tight">
                                  {getRatingText(hotel.averageRating, language)}
                                </p>
                                <p className="text-[11px] text-slate-500 font-bold mt-0.5">
                                  {hotel.reviewCount} {language === 'vi' ? 'đánh giá' : 'reviews'}
                                </p>
                              </div>
                              <div className="bg-[#003b95] text-white font-black text-sm sm:text-base px-2.5 py-1.5 rounded-t-lg rounded-br-lg rounded-bl-none shadow-sm shrink-0 flex items-center justify-center min-w-[38px] h-[38px]">
                                {normalizeRating(hotel.averageRating).toFixed(1).replace('.', language === 'vi' ? ',' : '.')}
                              </div>
                            </>
                          ) : (
                            <p className="text-xs font-bold text-slate-400">
                              {t.noReviews}
                            </p>
                          )}
                        </div>

                        {/* View & Price tag */}
                        <div className="flex flex-col items-end gap-1 flex-grow justify-end mt-2">


                          <div className="text-right">
                            {hotel.priceFrom > 0 ? (
                              <>
                                {hotel.originalPriceFrom && hotel.originalPriceFrom > hotel.priceFrom && (
                                  <span className="block text-xs text-slate-400 line-through leading-none mb-1 font-semibold">
                                    {formatPrice(hotel.originalPriceFrom, currency)}
                                  </span>
                                )}
                                <span className="block font-black text-2xl text-[#ff4d42] leading-none">
                                  {formatPrice(hotel.priceFrom, currency)}
                                </span>
                                <span className="block text-xs text-slate-500 font-bold mt-1">
                                  {language === 'vi'
                                    ? `Tổng ${formatPrice(Math.round(hotel.priceFrom * 1.08), currency)} VND`
                                    : `Total ${formatPrice(Math.round(hotel.priceFrom * 1.08), currency)} VND`}
                                </span>
                                <span className="block text-xs text-slate-400 font-medium">
                                  {language === 'vi' ? 'cho 1 phòng' : 'for 1 room'}
                                </span>
                                <span className="block text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                                  {language === 'vi' ? 'Bao gồm thuế và phí' : 'Includes taxes & fees'}
                                </span>
                              </>
                            ) : (
                              <span className="block font-extrabold text-slate-500 text-sm">
                                {t.contact}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* CTA Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/hotel/${hotel.id}`);
                          }}
                          className="w-full mt-2.5 py-2 px-4 bg-[#006ce4] hover:bg-[#0056b3] text-white font-extrabold text-xs rounded-lg shadow-sm transition-all active:scale-[0.98]"
                        >
                          {language === 'vi' ? 'Chọn phòng' : 'Select room'}
                        </button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
};

export default Search;
