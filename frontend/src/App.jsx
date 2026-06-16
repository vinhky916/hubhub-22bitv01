import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, Calendar, Users, DollarSign, Sparkles, Filter, 
  MapPin, ShieldAlert, CheckCircle2, ShoppingBag, Plus, 
  Building, RefreshCw, BarChart, ClipboardList, Trash2, Edit2, 
  UserCheck, Shield, FileText, Check, X, AlertCircle
} from 'lucide-react';
import Navbar from './components/Navbar';
import AIChatbot from './components/AIChatbot';
import QRCodeModal from './components/QRCodeModal';
import OwnerCharts from './components/OwnerCharts';

// Default mock guest user for immediate testing without registration
const DEFAULT_TRAVELER = {
  id: 4, // guest ID in seed data
  username: "traveler",
  full_name: "Nguyễn Du Khách",
  role: "traveler"
};

const DEFAULT_OWNER = {
  id: 2, // Trần Thị B in seed data
  username: "owner2",
  full_name: "Trần Thị B (Chủ Mountain Villa)",
  role: "owner"
};

const DEFAULT_ADMIN = {
  id: 1, // admin in seed data
  username: "admin",
  full_name: "Hệ thống Admin",
  role: "admin"
};

const DESTINATIONS = ["Vũng Tàu", "Đà Nẵng", "Nha Trang", "Đà Lạt"];

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const activeRole = currentUser ? currentUser.role : 'traveler';
  
  // Auth state
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [authForm, setAuthForm] = useState({ username: '', password: '', fullName: '', role: 'traveler' });
  const [authError, setAuthError] = useState('');

  // Traveler View State
  const [rooms, setRooms] = useState([]);
  const [searchFilters, setSearchFilters] = useState({
    city: '',
    checkIn: '2026-06-12',
    checkOut: '2026-06-14',
    priceMax: 4000000,
    capacity: 1,
    type: '',
    amenities: []
  });
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [activeBooking, setActiveBooking] = useState(null);
  const [travelerBookings, setTravelerBookings] = useState([]);
  const [storefrontTab, setStorefrontTab] = useState('explore'); // explore, my-bookings
  const [bookingSuccessMsg, setBookingSuccessMsg] = useState('');

  // AI Search States
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchExplanation, setAiSearchExplanation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const skipFetchRef = React.useRef(false);

  // Search Results Layout & Suggestions States
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [destSuggestions, setDestSuggestions] = useState({ cities: [], hotels: [] });
  const [showDestSuggestions, setShowDestSuggestions] = useState(false);
  const [view, setView] = useState('storefront'); // 'storefront' or 'portal'
  const [portalAuthForm, setPortalAuthForm] = useState({ 
    username: '', 
    password: '', 
    fullName: '', 
    isRegister: false, 
    error: '' 
  });
  
  // Custom Calendar States
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarFocus, setCalendarFocus] = useState('checkIn'); // 'checkIn' or 'checkOut'
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const fetchLocationSuggestions = async (qValue) => {
    try {
      const response = await fetch(`http://localhost:8000/api/locations/suggest?q=${encodeURIComponent(qValue || '')}`);
      if (response.ok) {
        const data = await response.json();
        setDestSuggestions(data);
      }
    } catch (error) {
      console.error("Failed to fetch location suggestions:", error);
    }
  };

  const handlePortalAuthSubmit = async (e) => {
    e.preventDefault();
    setPortalAuthForm(prev => ({ ...prev, error: '' }));
    const endpoint = portalAuthForm.isRegister ? 'register' : 'login';
    const payload = portalAuthForm.isRegister ? {
      username: portalAuthForm.username,
      password: portalAuthForm.password,
      full_name: portalAuthForm.fullName,
      role: 'owner'
    } : {
      username: portalAuthForm.username,
      password: portalAuthForm.password
    };

    try {
      const response = await fetch(`http://localhost:8000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Thao tác thất bại.');
      }

      const data = await response.json();
      if (portalAuthForm.isRegister) {
        alert(data.message);
        setPortalAuthForm(prev => ({ ...prev, isRegister: false, error: '' }));
      } else {
        if (data.role !== 'owner' && data.role !== 'admin') {
          throw new Error('Tài khoản khách du lịch không có quyền truy cập trang quản trị.');
        }
        setCurrentUser(data);
        setPortalAuthForm({ username: '', password: '', fullName: '', isRegister: false, error: '' });
        if (data.role === 'owner') {
          setOwnerTab('overview');
        } else if (data.role === 'admin') {
          setAdminTab('approve');
        }
      }
    } catch (error) {
      setPortalAuthForm(prev => ({ ...prev, error: error.message }));
    }
  };

  const handleTraditionalSearchSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setSearchSubmitted(true);
    fetchRooms();
  };

  const handleSelectDestination = (city) => {
    setAiSearchQuery(city);
    setShowSuggestions(false);
    setSearchFilters(prev => ({
      ...prev,
      city: city
    }));
    setSearchSubmitted(true);
  };

  const filteredDestinations = DESTINATIONS.filter(city => 
    city.toLowerCase().includes(aiSearchQuery.toLowerCase())
  );

  // Owner View State
  const [ownerTab, setOwnerTab] = useState('overview'); // overview, manage, bookings
  const [ownerHotel, setOwnerHotel] = useState(null);
  const [ownerRooms, setOwnerRooms] = useState([]);
  const [ownerBookings, setOwnerBookings] = useState([]);
  const [ownerStats, setOwnerStats] = useState(null);
  const [showAddRoomModal, setShowAddRoomModal] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const [roomForm, setRoomForm] = useState({
    name: '', type: 'Double', price_per_night: 1000000, capacity: 2, description: '', amenities: 'wifi, ban công', total_inventory: 5
  });

  // Admin View State
  const [adminTab, setAdminTab] = useState('approve'); // approve, users, logs
  const [pendingOwners, setPendingOwners] = useState([]);
  const [systemUsers, setSystemUsers] = useState([]);
  const [systemLogs, setSystemLogs] = useState([]);
  const [adminStats, setAdminStats] = useState(null);

  // Global loading states
  const [loading, setLoading] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);



  const handleLogout = () => {
    setCurrentUser(null);
    setAiSearchExplanation('');
    setAiSearchQuery('');
  };

  const formatAiText = (text) => {
    if (!text) return '';
    return text.split('\n').map((line, idx) => {
      let formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formattedLine = formattedLine.replace(/\*(.*?)\*/g, '<em>$1</em>');
      return <span key={idx} dangerouslySetInnerHTML={{ __html: formattedLine }} />;
    });
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const dayName = days[d.getDay()];
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      return `${dayName}, ${day}/${month}/${year}`;
    } catch (e) {
      return dateStr;
    }
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const handleDayClick = (dayStr) => {
    if (calendarFocus === 'checkIn') {
      setSearchFilters(prev => {
        let checkOutVal = prev.checkOut;
        if (new Date(dayStr) >= new Date(prev.checkOut)) {
          const nextDate = new Date(dayStr);
          nextDate.setDate(nextDate.getDate() + 2);
          checkOutVal = nextDate.toISOString().split('T')[0];
        }
        return { ...prev, checkIn: dayStr, checkOut: checkOutVal };
      });
      setCalendarFocus('checkOut');
    } else {
      if (new Date(dayStr) <= new Date(searchFilters.checkIn)) {
        alert("Ngày trả phòng phải sau ngày nhận phòng!");
        return;
      }
      setSearchFilters(prev => ({ ...prev, checkOut: dayStr }));
      setShowCalendar(false);
    }
  };

  const renderCalendar = () => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const monthNames = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
    const daysInMonth = getDaysInMonth(year, month);
    const firstDayIndex = getFirstDayOfMonth(year, month);
    const dayNames = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];
    
    const daysArray = [];
    for (let i = 0; i < firstDayIndex; i++) {
      daysArray.push(null);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      daysArray.push(dateStr);
    }
    
    const changeMonth = (offset) => {
      const nextMonth = new Date(calendarMonth);
      nextMonth.setMonth(nextMonth.getMonth() + offset);
      setCalendarMonth(nextMonth);
    };

    return (
      <div className="custom-calendar-container">
        <div className="calendar-month-header">
          <button type="button" className="cal-nav-btn" onClick={() => changeMonth(-1)}>❮</button>
          <span className="cal-month-title">{monthNames[month]} {year}</span>
          <button type="button" className="cal-nav-btn" onClick={() => changeMonth(1)}>❯</button>
        </div>
        <div className="calendar-week-grid">
          {dayNames.map(day => (
            <div key={day} className="calendar-week-day">{day}</div>
          ))}
        </div>
        <div className="calendar-days-grid">
          {daysArray.map((dateStr, idx) => {
            if (!dateStr) return <div key={`empty-${idx}`} className="calendar-day empty"></div>;
            const dateObj = new Date(dateStr);
            const dateNum = dateObj.getDate();
            const isCheckIn = dateStr === searchFilters.checkIn;
            const isCheckOut = dateStr === searchFilters.checkOut;
            const isInRange = dateObj > new Date(searchFilters.checkIn) && dateObj < new Date(searchFilters.checkOut);
            const isToday = new Date().toDateString() === dateObj.toDateString();
            const isPast = dateObj < new Date(new Date().setHours(0,0,0,0));
            
            let dayClass = "calendar-day";
            if (isCheckIn) dayClass += " active-checkin";
            if (isCheckOut) dayClass += " active-checkout";
            if (isInRange) dayClass += " range-selected";
            if (isToday) dayClass += " today";
            if (isPast) dayClass += " past";
            
            return (
              <button 
                key={dateStr}
                type="button"
                className={dayClass}
                disabled={isPast}
                onClick={() => handleDayClick(dateStr)}
              >
                <span>{dateNum}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const handleAISearchSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setShowSuggestions(false);
    
    if (!aiSearchQuery.trim()) {
      setAiSearchExplanation('');
      setSearchFilters(prev => ({
        ...prev,
        city: '',
        priceMax: 4000000,
        capacity: 1,
        type: '',
        amenities: []
      }));
      skipFetchRef.current = false;
      setSearchSubmitted(false);
      return;
    }

    setSearchSubmitted(true);
    setAiLoading(true);
    setAiSearchExplanation('');

    try {
      const response = await fetch('http://localhost:8000/api/chat/assistant', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser ? String(currentUser.id) : ''
        },
        body: JSON.stringify({ query: aiSearchQuery })
      });

      if (!response.ok) {
        throw new Error('Không thể kết nối đến máy chủ tìm kiếm.');
      }

      const data = await response.json();
      
      // Update room listings grid with recommended rooms
      setRooms(data.rooms || []);
      
      // Set explanation callout (will not be displayed in UI anymore)
      setAiSearchExplanation(data.explanation || '');

      // SYNC: Automatically synchronize traditional filters with extracted AI entities
      const entities = data.parsed_entities;
      if (entities) {
        skipFetchRef.current = true; // Skip redundant API fetch
        setSearchFilters(prev => {
          const updated = { ...prev };
          if (entities.city) updated.city = entities.city;
          if (entities.max_price) updated.priceMax = entities.max_price;
          if (entities.check_in) updated.checkIn = entities.check_in;
          if (entities.check_out) updated.checkOut = entities.check_out;
          if (entities.capacity) updated.capacity = entities.capacity;
          if (entities.room_type) updated.type = entities.room_type;
          
          if (entities.amenities && entities.amenities.length > 0) {
            updated.amenities = entities.amenities;
          }
          return updated;
        });
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setAiLoading(false);
    }
  };

  // --- API Calls: Traveler ---

  const fetchRooms = useCallback(async () => {
    if (skipFetchRef.current) {
      skipFetchRef.current = false;
      return;
    }
    setLoading(true);
    try {
      const { city, priceMax, capacity, type, amenities } = searchFilters;
      let url = `http://localhost:8000/api/rooms/search?`;
      if (city) url += `city=${encodeURIComponent(city)}&`;
      if (priceMax) url += `price_max=${priceMax}&`;
      if (capacity) url += `capacity=${capacity}&`;
      if (type) url += `room_type=${type}&`;
      if (amenities.length > 0) url += `amenities=${encodeURIComponent(amenities.join(','))}&`;

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setRooms(data);
      }
    } catch (error) {
      console.error("Failed to fetch rooms:", error);
    } finally {
      setLoading(false);
    }
  }, [searchFilters]);

  const fetchTravelerBookings = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'traveler') return;
    try {
      const response = await fetch(`http://localhost:8000/api/bookings/my-bookings/${currentUser.id}`);
      if (response.ok) {
        const data = await response.json();
        setTravelerBookings(data);
      }
    } catch (error) {
      console.error("Failed to fetch bookings:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeRole === 'traveler') {
      fetchRooms();
      fetchTravelerBookings();
    }
  }, [fetchRooms, fetchTravelerBookings, activeRole, refreshTrigger]);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.date-field-box') && !e.target.closest('.custom-calendar-dropdown')) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleBookRoom = async (room) => {
    if (!currentUser) {
      setShowAuthModal(true);
      return;
    }
    
    // Create reservation payload
    const bookingPayload = {
      traveler_id: currentUser.id,
      room_id: room.id,
      check_in_date: searchFilters.checkIn,
      check_out_date: searchFilters.checkOut
    };

    try {
      const response = await fetch('http://localhost:8000/api/bookings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingPayload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Không thể đặt phòng.');
      }

      const booking = await response.json();
      setActiveBooking(booking);
      setSelectedRoom(null); // Close detail modal
    } catch (error) {
      alert(error.message);
    }
  };

  // --- API Calls: Owner ---

  const fetchOwnerData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'owner') return;
    try {
      // Fetch Hotel
      const resHotel = await fetch(`http://localhost:8000/api/owner/hotels?owner_id=${currentUser.id}`);
      if (resHotel.ok) {
        const hotel = await resHotel.json();
        setOwnerHotel(hotel);
      }
      
      // Fetch Rooms
      const resRooms = await fetch(`http://localhost:8000/api/owner/rooms?owner_id=${currentUser.id}`);
      if (resRooms.ok) {
        const roomsData = await resRooms.json();
        setOwnerRooms(roomsData);
      }

      // Fetch Bookings
      const resBookings = await fetch(`http://localhost:8000/api/owner/bookings?owner_id=${currentUser.id}`);
      if (resBookings.ok) {
        const bookingsData = await resBookings.json();
        setOwnerBookings(bookingsData);
      }

      // Fetch Stats
      const resStats = await fetch(`http://localhost:8000/api/owner/stats?owner_id=${currentUser.id}`);
      if (resStats.ok) {
        const statsData = await resStats.json();
        setOwnerStats(statsData);
      }
    } catch (error) {
      console.error("Failed to fetch owner details:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeRole === 'owner') {
      fetchOwnerData();
    }
  }, [fetchOwnerData, activeRole, refreshTrigger]);

  const handleCreateOrUpdateRoom = async (e) => {
    e.preventDefault();
    if (!ownerHotel) return;

    const payload = {
      ...roomForm,
      hotel_id: ownerHotel.id
    };

    try {
      let url = `http://localhost:8000/api/owner/rooms?owner_id=${currentUser.id}`;
      let method = 'POST';

      if (editingRoom) {
        url = `http://localhost:8000/api/owner/rooms/${editingRoom.id}?owner_id=${currentUser.id}`;
        method = 'PUT';
      }

      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setShowAddRoomModal(false);
        setEditingRoom(null);
        setRefreshTrigger(prev => prev + 1);
        setRoomForm({ name: '', type: 'Double', price_per_night: 1000000, capacity: 2, description: '', amenities: 'wifi', total_inventory: 5 });
      }
    } catch (error) {
      alert("Lỗi khi thêm/sửa phòng: " + error.message);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa phòng này?")) return;
    try {
      const response = await fetch(`http://localhost:8000/api/owner/rooms/${roomId}?owner_id=${currentUser.id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleUpdateBookingStatus = async (bookingId, newStatus) => {
    try {
      const response = await fetch(`http://localhost:8000/api/owner/bookings/${bookingId}/status?owner_id=${currentUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error(error);
    }
  };

  // --- API Calls: Admin ---

  const fetchAdminData = useCallback(async () => {
    if (!currentUser || currentUser.role !== 'admin') return;
    try {
      // Pending Owners
      const resPending = await fetch('http://localhost:8000/api/admin/owners/pending');
      if (resPending.ok) {
        setPendingOwners(await resPending.json());
      }
      // System Users
      const resUsers = await fetch('http://localhost:8000/api/admin/users');
      if (resUsers.ok) {
        setSystemUsers(await resUsers.json());
      }
      // System Logs
      const resLogs = await fetch('http://localhost:8000/api/admin/logs');
      if (resLogs.ok) {
        setSystemLogs(await resLogs.json());
      }
      // System Stats
      const resStats = await fetch('http://localhost:8000/api/admin/stats');
      if (resStats.ok) {
        setAdminStats(await resStats.json());
      }
    } catch (error) {
      console.error("Failed to fetch admin dashboard:", error);
    }
  }, [currentUser]);

  useEffect(() => {
    if (activeRole === 'admin') {
      fetchAdminData();
    }
  }, [fetchAdminData, activeRole, refreshTrigger]);

  const handleApproveOwner = async (ownerId, status) => {
    try {
      const response = await fetch(`http://localhost:8000/api/admin/owners/${ownerId}/approve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: status })
      });
      if (response.ok) {
        setRefreshTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error(error);
    }
  };


  // --- Auth submit handler ---
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    const endpoint = isRegister ? 'register' : 'login';
    const payload = isRegister ? {
      username: authForm.username,
      password: authForm.password,
      full_name: authForm.fullName,
      role: authForm.role
    } : {
      username: authForm.username,
      password: authForm.password
    };

    try {
      const response = await fetch(`http://localhost:8000/api/auth/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Thao tác thất bại.');
      }

      const data = await response.json();
      if (isRegister) {
        alert(data.message);
        setIsRegister(false);
      } else {
        setCurrentUser(data);
        setShowAuthModal(false);
        setAuthForm({ username: '', password: '', fullName: '', role: 'traveler' });
      }
    } catch (error) {
      setAuthError(error.message);
    }
  };

  const handleSelectRoomFromChat = (room) => {
    setSelectedRoom(room);
  };

  const renderRoomsGrid = () => (
    <>
      {loading ? (
        <div className="loading-state">
          <RefreshCw className="animate-spin text-blue" size={32} />
          <p>Đang tìm phòng phù hợp...</p>
        </div>
      ) : rooms.length === 0 ? (
        <div className="empty-state glass-card">
          <AlertCircle className="text-blue" size={48} />
          <h3>Không tìm thấy phòng phù hợp</h3>
          <p>Bạn hãy thử thay đổi bộ lọc hoặc trợ lý AI ở góc phải màn hình để nhận các gợi ý thông minh hơn.</p>
        </div>
      ) : (
        <div className="rooms-grid">
          {rooms.map((room) => {
            // Generate mock ratings and reviews based on room.id
            const mockRating = (8.5 + (room.id % 15) / 10).toFixed(1);
            const mockReviewsCount = 10 + (room.id * 12) % 450;
            const ratingDesc = parseFloat(mockRating) >= 9.5 ? "Ngoại hạng" :
                               parseFloat(mockRating) >= 9.0 ? "Tuyệt vời" :
                               parseFloat(mockRating) >= 8.5 ? "Rất tốt" : "Tốt";

            // Generate mock discount
            const discountPct = 10 + (room.id % 4) * 5;
            const originalPrice = Math.round((room.price_per_night / (1 - discountPct / 100)) / 1000) * 1000;

            return (
              <div key={room.id} className="room-card-storefront glass-card animate-fade-in">
                <div className="room-card-img-wrapper">
                  <img src={room.image_url} alt={room.name} />
                  <div className="city-tag">{room.hotel_city}</div>
                </div>
                
                <div className="room-card-body">
                  <span className="hotel-subtitle">{room.hotel_name}</span>
                  <h3 className="room-title">{room.name}</h3>

                  <div className="rating-container">
                    <div className="rating-badge">{mockRating}</div>
                    <div className="rating-text-wrap">
                      <span className="rating-desc">{ratingDesc}</span>
                      <span className="rating-count">{mockReviewsCount} nhận xét</span>
                    </div>
                  </div>

                  <div className="room-features">
                    <span className="feat"><Users size={12} /> Tối đa {room.capacity} khách</span>
                    <span className="feat"><Sparkles size={12} /> {room.type}</span>
                  </div>

                  <p className="room-desc-short">{room.description}</p>
                  
                  <div className="amenity-pills">
                    {(room.amenities || '').split(',').map((tag) => (
                      <span key={tag} className="pill-tag">{tag.trim()}</span>
                    ))}
                  </div>

                  <div className="discount-tag">Khuyến mãi hôm nay: Giảm {discountPct}%</div>

                  <div className="card-footer-price">
                    <div className="price-info">
                      <div className="original-price">{originalPrice.toLocaleString('vi-VN')} đ</div>
                      <div>
                        <span className="price-num" style={{ color: '#f43f5e' }}>{room.price_per_night.toLocaleString('vi-VN')} VNĐ</span>
                        <span className="price-unit">/ đêm</span>
                      </div>
                    </div>
                    <button className="book-btn" onClick={() => setSelectedRoom(room)}>
                      Xem phòng
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );

  return (
    <div className="app-container">
      {/* 1. STOREFRONT VIEW */}
      {view === 'storefront' && (
        <>
          {/* Premium Glass Header */}
          <Navbar 
            currentUser={currentUser} 
            activeRole={activeRole}
            onGoToPortal={() => {
              setView('portal');
              // Clear current user when entering portal to enforce real login
              setCurrentUser(null);
            }}
            onLogout={handleLogout} 
            onOpenAuthModal={() => setShowAuthModal(true)}
            onLogoClick={() => {
              setStorefrontTab('explore');
              setSearchSubmitted(false);
              setAiSearchQuery('');
              setSearchFilters(prev => ({
                ...prev,
                city: '',
                priceMax: 4000000,
                capacity: 1,
                type: '',
                amenities: []
              }));
              skipFetchRef.current = false;
            }}
          />

          <main className="content-area">
            {/* TRAVELER VIEW */}
            <div className="traveler-view-layout">
            
            {/* Storefront Tabs */}
            <div className="storefront-tabs-bar">
              <button 
                className={`tab-item ${storefrontTab === 'explore' ? 'active' : ''}`}
                onClick={() => setStorefrontTab('explore')}
              >
                Khám phá Phòng
              </button>
              {currentUser && (
                <button 
                  className={`tab-item ${storefrontTab === 'my-bookings' ? 'active' : ''}`}
                  onClick={() => setStorefrontTab('my-bookings')}
                >
                  Lịch sử Đặt phòng
                </button>
              )}
            </div>

            {storefrontTab === 'explore' ? (
              <>
                {/* Landing View (Hero + Big Search Bar with Suggestions) */}
                {!searchSubmitted ? (
                  <>
                    <header className="storefront-hero">
                      <div className="hero-content">
                        <span className="hero-subtitle text-blue font-bold">
                          <Search size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                          Tìm phòng nhanh chóng &amp; dễ dàng
                        </span>
                        <h1>Kỳ nghỉ mơ ước, tìm kiếm dễ dàng</h1>
                      </div>
                    </header>

                    <section className="main-search-bar-container glass-card" style={{ padding: '24px', overflow: 'visible', marginTop: '-48px' }}>
                      <form onSubmit={handleTraditionalSearchSubmit} className="main-search-form">
                          {/* Row 1: Destination input box (full-width) */}
                          <div className="search-row-1">
                            <div className="search-field-box" style={{ position: 'relative', width: '100%' }}>
                              <MapPin className="field-icon text-blue" size={24} />
                              <div className="field-content">
                                <label>Địa điểm</label>
                                <input 
                                  type="text"
                                  placeholder="Nhập điểm du lịch hoặc tên khách sạn..."
                                  value={searchFilters.city}
                                  onChange={(e) => {
                                    setSearchFilters(prev => ({ ...prev, city: e.target.value }));
                                    fetchLocationSuggestions(e.target.value);
                                    setShowDestSuggestions(true);
                                  }}
                                  onFocus={() => {
                                    fetchLocationSuggestions(searchFilters.city);
                                    setShowDestSuggestions(true);
                                  }}
                                  onBlur={() => setTimeout(() => setShowDestSuggestions(false), 200)}
                                  autoComplete="off"
                                  style={{ width: '100%' }}
                                />
                              </div>
                              
                              {/* Autocomplete Suggestions */}
                              {showDestSuggestions && (destSuggestions.cities?.length > 0 || destSuggestions.hotels?.length > 0) && (
                                <div className="search-suggestions-dropdown glass-card-heavy" style={{ top: '100%', left: 0, width: '100%', maxWidth: '540px', marginTop: '8px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '18px', zIndex: 120 }}>
                                  
                                  {/* Hotels Section */}
                                  {destSuggestions.hotels && destSuggestions.hotels.length > 0 && (
                                    <div className="suggestions-hotels-section">
                                      <div className="dropdown-header" style={{ border: 'none', padding: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left' }}>
                                        Cơ sở lưu trú nổi bật
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                        {destSuggestions.hotels.map(hotel => (
                                          <div 
                                            key={hotel.id} 
                                            className="suggestion-hotel-card"
                                            style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', background: '#f8fafc', transition: 'all 0.2s', textAlign: 'left' }}
                                            onMouseDown={() => {
                                              setSearchFilters(prev => ({ ...prev, city: hotel.city }));
                                              setShowDestSuggestions(false);
                                            }}
                                            onMouseEnter={(e) => {
                                              e.currentTarget.style.background = '#f1f5f9';
                                              e.currentTarget.style.borderColor = '#cbd5e1';
                                            }}
                                            onMouseLeave={(e) => {
                                              e.currentTarget.style.background = '#f8fafc';
                                              e.currentTarget.style.borderColor = '#e2e8f0';
                                            }}
                                          >
                                            <img src={hotel.image_url} alt={hotel.name} style={{ width: '36px', height: '36px', borderRadius: '4px', objectFit: 'cover' }} />
                                            <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                                              <span style={{ fontSize: '13px', fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{hotel.name}</span>
                                              <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{hotel.city}</span>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Cities Section */}
                                  {destSuggestions.cities && destSuggestions.cities.length > 0 && (
                                    <div className="suggestions-cities-section">
                                      <div className="dropdown-header" style={{ border: 'none', padding: '0 0 10px 0', fontSize: '12px', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', textAlign: 'left' }}>
                                        Các điểm đến ở Việt Nam
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                        {destSuggestions.cities.map(city => (
                                          <div 
                                            key={city.name} 
                                            className="suggestion-city-card"
                                            style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', borderRadius: '10px', transition: 'all 0.2s', textAlign: 'left', background: '#f8fafc', border: '1px solid #e2e8f0' }}
                                          >
                                            <div 
                                              className="suggestion-city-item-main"
                                              style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}
                                              onMouseDown={() => {
                                                setSearchFilters(prev => ({ ...prev, city: city.name }));
                                                setShowDestSuggestions(false);
                                              }}
                                            >
                                              <img src={city.image} alt={city.name} style={{ width: '44px', height: '44px', borderRadius: '8px', objectFit: 'cover' }} />
                                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <span style={{ fontSize: '13.5px', fontWeight: 700 }}>
                                                  {city.name} <span style={{ fontSize: '11px', color: 'var(--color-blue)', fontWeight: 600 }}>({city.count})</span>
                                                </span>
                                                <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>{city.tags}</span>
                                              </div>
                                            </div>

                                            {/* Tourist Spots list */}
                                            {city.spots && city.spots.length > 0 && (
                                              <div className="city-spots-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                                                {city.spots.map(spot => (
                                                  <span 
                                                    key={spot}
                                                    className="spot-chip"
                                                    style={{ 
                                                      fontSize: '10.5px', 
                                                      background: '#ffffff', 
                                                      border: '1px solid #cbd5e1', 
                                                      padding: '3px 8px', 
                                                      borderRadius: '12px', 
                                                      cursor: 'pointer',
                                                      color: '#475569',
                                                      transition: 'all 0.2s',
                                                      fontWeight: 500
                                                    }}
                                                    onMouseDown={(e) => {
                                                      e.stopPropagation(); // prevent parent click
                                                      setSearchFilters(prev => ({ ...prev, city: `${city.name} - ${spot}` }));
                                                      setShowDestSuggestions(false);
                                                    }}
                                                    onMouseEnter={(e) => {
                                                      e.currentTarget.style.borderColor = 'var(--color-blue)';
                                                      e.currentTarget.style.color = 'var(--color-blue)';
                                                      e.currentTarget.style.background = '#eff6ff';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                      e.currentTarget.style.borderColor = '#cbd5e1';
                                                      e.currentTarget.style.color = '#475569';
                                                      e.currentTarget.style.background = '#ffffff';
                                                    }}
                                                  >
                                                    📍 {spot}
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Row 2: Check-in, Check-out, Guests, Search button */}
                          <div className="search-row-2">
                            {/* Check-in Date */}
                            <div 
                              className={`search-field-box date-field-box ${calendarFocus === 'checkIn' && showCalendar ? 'active-field' : ''}`}
                              onClick={() => {
                                setCalendarFocus('checkIn');
                                setShowCalendar(true);
                              }}
                            >
                              <Calendar className="field-icon text-blue" size={24} />
                              <div className="field-content">
                                <label>Nhận phòng</label>
                                <div style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}>
                                  {formatDateDisplay(searchFilters.checkIn) || 'Chọn ngày'}
                                </div>
                              </div>
                            </div>

                            {/* Check-out Date */}
                            <div 
                              className={`search-field-box date-field-box ${calendarFocus === 'checkOut' && showCalendar ? 'active-field' : ''}`}
                              onClick={() => {
                                setCalendarFocus('checkOut');
                                setShowCalendar(true);
                              }}
                            >
                              <Calendar className="field-icon text-blue" size={24} />
                              <div className="field-content">
                                <label>Trả phòng</label>
                                <div style={{ fontSize: '15.5px', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}>
                                  {formatDateDisplay(searchFilters.checkOut) || 'Chọn ngày'}
                                </div>
                              </div>
                            </div>

                            {/* Guests */}
                            <div className="search-field-box">
                              <Users className="field-icon text-blue" size={24} />
                              <div className="field-content">
                                <label>Số khách</label>
                                <select 
                                  value={searchFilters.capacity}
                                  onChange={(e) => setSearchFilters(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                                >
                                  <option value="1">1 khách</option>
                                  <option value="2">2 khách</option>
                                  <option value="4">4 khách+</option>
                                </select>
                              </div>
                            </div>

                            {/* Search Button */}
                            <button type="submit" className="main-search-btn">
                              <Search size={22} />
                              <span>Tìm kiếm</span>
                            </button>

                            {/* Custom Calendar Dropdown Panel */}
                            {showCalendar && (
                              <div className="custom-calendar-dropdown glass-card-heavy" style={{ gridColumn: 'span 4' }}>
                                <div className="calendar-panel-header">
                                  <div className="calendar-focus-tabs">
                                    <button 
                                      type="button" 
                                      className={`focus-tab ${calendarFocus === 'checkIn' ? 'active' : ''}`}
                                      onClick={() => setCalendarFocus('checkIn')}
                                    >
                                      <span>Nhận phòng</span>
                                      <strong>{formatDateDisplay(searchFilters.checkIn)}</strong>
                                    </button>
                                    <button 
                                      type="button" 
                                      className={`focus-tab ${calendarFocus === 'checkOut' ? 'active' : ''}`}
                                      onClick={() => setCalendarFocus('checkOut')}
                                    >
                                      <span>Trả phòng</span>
                                      <strong>{formatDateDisplay(searchFilters.checkOut)}</strong>
                                    </button>
                                  </div>
                                  <button type="button" className="cal-close-btn" onClick={() => setShowCalendar(false)}>Đóng</button>
                                </div>
                                <div className="calendar-months-wrapper">
                                  {renderCalendar()}
                                </div>
                              </div>
                            )}
                          </div>
                        </form>
                    </section>

                    {/* Popular Destinations Section */}
                    <section className="popular-destinations-section">
                      <h2>Điểm đến phổ biến tại Việt Nam</h2>
                      <p>Khám phá các thành phố du lịch hàng đầu cùng HubHub</p>
                      <div className="destinations-grid">
                        {[
                          { name: 'Vũng Tàu', count: '120+ chỗ ở', img: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=600&q=80' },
                          { name: 'Đà Nẵng', count: '180+ chỗ ở', img: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=600&q=80' },
                          { name: 'Nha Trang', count: '140+ chỗ ở', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80' },
                          { name: 'Đà Lạt', count: '90+ chỗ ở', img: 'https://images.unsplash.com/photo-1508962914676-134849a727f0?auto=format&fit=crop&w=600&q=80' }
                        ].map(dest => (
                          <div 
                            key={dest.name} 
                            className="destination-card"
                            onClick={() => {
                              setSearchFilters(prev => ({ ...prev, city: dest.name }));
                              setSearchSubmitted(true);
                            }}
                          >
                            <img src={dest.img} alt={dest.name} />
                            <div className="destination-overlay">
                              <div className="destination-name">{dest.name}</div>
                              <div className="destination-count">{dest.count}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>

                    {/* Featured/All Listings on landing */}
                    <section className="rooms-listings-section landing-listings">
                      <h2>Danh sách phòng trống dành cho bạn ({rooms.length})</h2>
                      {renderRoomsGrid()}
                    </section>
                  </>
                ) : (
                  <>
                    {/* Search Results View (Compact Top Search Bar + Column Split Layout) */}
                    <div className="compact-search-bar-container glass-card">
                      <form onSubmit={handleAISearchSubmit} className="main-search-form compact">
                        <div className="main-search-input-wrapper compact">
                          <Search className="search-icon text-blue" size={18} />
                          <input 
                            type="text" 
                            placeholder="Nhập điểm đến hoặc yêu cầu tìm phòng..."
                            value={aiSearchQuery}
                            onChange={(e) => {
                              setAiSearchQuery(e.target.value);
                              setShowSuggestions(true);
                            }}
                            onFocus={() => setShowSuggestions(true)}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            disabled={aiLoading}
                          />
                          {showSuggestions && (
                            <div className="search-suggestions-dropdown glass-card-heavy compact-dropdown">
                              <div className="dropdown-header">Đề xuất địa điểm</div>
                              {filteredDestinations.length === 0 ? (
                                <div className="no-suggestions">Không tìm thấy địa điểm phù hợp</div>
                              ) : (
                                filteredDestinations.map(city => (
                                  <div 
                                    key={city} 
                                    className="suggestion-item"
                                    onClick={() => handleSelectDestination(city)}
                                  >
                                    <MapPin size={12} className="text-blue" />
                                    <span>{city}</span>
                                  </div>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                        <button type="submit" className="main-search-btn compact-btn" disabled={aiLoading}>
                          {aiLoading ? <RefreshCw className="animate-spin" size={14} /> : <Search size={14} />}
                          <span>Tìm kiếm</span>
                        </button>
                        <button 
                          type="button" 
                          className="back-to-home-btn"
                          onClick={() => {
                            setSearchSubmitted(false);
                            setAiSearchQuery('');
                            setSearchFilters(prev => ({
                              ...prev,
                              city: '',
                              priceMax: 4000000,
                              capacity: 1,
                              type: '',
                              amenities: []
                            }));
                            skipFetchRef.current = false;
                          }}
                        >
                          Quay lại trang chủ
                        </button>
                      </form>
                    </div>

                    <div className="results-split-layout">
                      {/* Left Sidebar Filter Section */}
                      <aside className="search-filters-sidebar glass-card">
                        <div className="sidebar-filter-header">
                          <h3>Bộ lọc tìm kiếm</h3>
                        </div>
                        <div className="sidebar-filter-content">
                          <div className="filter-input-group vertical">
                            <label><MapPin size={14} className="text-blue" /> Địa điểm</label>
                            <select 
                              value={searchFilters.city}
                              onChange={(e) => setSearchFilters(prev => ({ ...prev, city: e.target.value }))}
                            >
                              <option value="">Tất cả địa điểm</option>
                              <option value="Vũng Tàu">Vũng Tàu</option>
                              <option value="Đà Nẵng">Đà Nẵng</option>
                              <option value="Nha Trang">Nha Trang</option>
                              <option value="Đà Lạt">Đà Lạt</option>
                            </select>
                          </div>

                          <div className="filter-input-group vertical">
                            <label><Calendar size={14} className="text-blue" /> Nhận phòng</label>
                            <input 
                              type="date" 
                              value={searchFilters.checkIn}
                              onChange={(e) => setSearchFilters(prev => ({ ...prev, checkIn: e.target.value }))}
                            />
                          </div>

                          <div className="filter-input-group vertical">
                            <label><Calendar size={14} className="text-blue" /> Trả phòng</label>
                            <input 
                              type="date" 
                              value={searchFilters.checkOut}
                              onChange={(e) => setSearchFilters(prev => ({ ...prev, checkOut: e.target.value }))}
                            />
                          </div>

                          <div className="filter-input-group vertical">
                            <label><Users size={14} className="text-blue" /> Số khách</label>
                            <select 
                              value={searchFilters.capacity}
                              onChange={(e) => setSearchFilters(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                            >
                              <option value="1">1 khách</option>
                              <option value="2">2 khách</option>
                              <option value="4">4 khách+</option>
                            </select>
                          </div>

                          <div className="filter-input-group vertical">
                            <label><DollarSign size={14} className="text-blue" /> Giá tối đa/đêm</label>
                            <div className="slider-wrapper">
                              <input 
                                type="range" 
                                min="500000" 
                                max="5000000" 
                                step="100000"
                                value={searchFilters.priceMax}
                                onChange={(e) => setSearchFilters(prev => ({ ...prev, priceMax: parseFloat(e.target.value) }))}
                              />
                              <span className="slider-value">{searchFilters.priceMax.toLocaleString('vi-VN')} đ</span>
                            </div>
                          </div>

                          <div className="filter-input-group vertical amenities-filter-group">
                            <label><Filter size={14} className="text-blue" /> Tiện ích phòng</label>
                            <div className="sidebar-amenities-list">
                              {['sát biển', 'hồ bơi', 'lò sưởi', 'ban công', 'bếp nấu'].map((tag) => {
                                const isChecked = searchFilters.amenities.includes(tag);
                                return (
                                  <label key={tag} className="sidebar-amenity-checkbox">
                                    <input 
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setSearchFilters(prev => {
                                          const newTags = isChecked 
                                            ? prev.amenities.filter(t => t !== tag)
                                            : [...prev.amenities, tag];
                                          return { ...prev, amenities: newTags };
                                        });
                                      }}
                                    />
                                    <span>{tag}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </aside>

                      {/* Right Room Listings Main Section */}
                      <section className="search-results-main">
                        <div className="results-info-bar">
                          <h2>Kết quả tìm phòng ({rooms.length})</h2>
                          {aiSearchQuery && (
                            <div className="search-query-badge">
                              <span>Từ khóa: "{aiSearchQuery}"</span>
                            </div>
                          )}
                        </div>
                        
                        {renderRoomsGrid()}
                      </section>
                    </div>
                  </>
                )}
              </>
            ) : (
              /* Traveler Booking History */
              <section className="booking-history-section glass-card">
                <h2>Lịch sử đặt phòng của bạn</h2>
                {travelerBookings.length === 0 ? (
                  <div className="empty-state">
                    <ClipboardList className="text-blue" size={48} />
                    <p>Bạn chưa thực hiện đơn đặt phòng nào.</p>
                  </div>
                ) : (
                  <div className="bookings-list">
                    {travelerBookings.map((b) => (
                      <div key={b.id} className="booking-history-item glass-card-heavy">
                        <img src={b.room_image} alt={b.room_name} className="booking-item-img" />
                        <div className="booking-item-body">
                          <div className="item-header">
                            <div>
                              <h4>{b.hotel_name}</h4>
                              <p className="room-sub">{b.room_name} ({b.hotel_city})</p>
                            </div>
                            <span className={`status-badge ${b.status}`}>
                              {b.status === 'pending_payment' && 'Chờ thanh toán'}
                              {b.status === 'paid' && 'Đã thanh toán'}
                              {b.status === 'completed' && 'Hoàn tất'}
                              {b.status === 'cancelled' && 'Đã hủy'}
                            </span>
                          </div>

                          <div className="booking-dates-row">
                            <div>
                              <span>Nhận phòng:</span>
                              <strong>{b.check_in_date}</strong>
                            </div>
                            <div>
                              <span>Trả phòng:</span>
                              <strong>{b.check_out_date}</strong>
                            </div>
                            <div>
                              <span>Tổng chi phí:</span>
                              <strong className="text-blue">{b.total_price.toLocaleString('vi-VN')} đ</strong>
                            </div>
                          </div>

                          {/* Action for pending payment */}
                          {b.status === 'pending_payment' && (
                            <button 
                              className="pay-now-action-btn"
                              onClick={() => setActiveBooking(b)}
                            >
                              Thanh toán ngay qua QR
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* AI Assistant Chatbot */}
            <AIChatbot onSelectRoom={handleSelectRoomFromChat} currentUser={currentUser} />
          </div>
        </main>
      </>
    )}

    {/* 2. PORTAL VIEW */}
    {view === 'portal' && (
      <>
        {/* Portal Header */}
        <header className="portal-header" style={{
          background: '#1e293b',
          color: '#ffffff',
          padding: '16px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
          zIndex: 1000
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }} onClick={() => setView('storefront')}>
            <Compass className="logo-icon" size={26} style={{ color: '#38bdf8' }} />
            <span style={{ fontSize: '18px', fontWeight: 700, letterSpacing: '0.5px' }}>
              HubHub <span style={{ color: '#38bdf8' }}>Partner Portal</span>
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <button 
              onClick={() => setView('storefront')}
              style={{
                background: 'transparent',
                border: '1px solid #64748b',
                color: '#cbd5e1',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '13px',
                transition: 'all 0.2s'
              }}
            >
              Quay lại Trang chủ
            </button>
            {currentUser && (currentUser.role === 'owner' || currentUser.role === 'admin') && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderLeft: '1px solid #475569', paddingLeft: '16px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 600 }}>{currentUser.full_name} ({currentUser.role === 'admin' ? 'Admin' : 'Chủ khách sạn'})</span>
                <button 
                  onClick={handleLogout}
                  style={{
                    background: '#ef4444',
                    border: 'none',
                    color: '#ffffff',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: 600
                  }}
                >
                  Đăng xuất
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="content-area" style={{ padding: 0 }}>
          {/* Portal Login Screen */}
          {(!currentUser || (currentUser.role !== 'owner' && currentUser.role !== 'admin')) && (
            <div className="portal-login-container" style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              minHeight: 'calc(100vh - 70px)',
              background: '#0f172a',
              padding: '24px',
              width: '100%'
            }}>
              <div className="portal-login-card" style={{
                width: '100%',
                maxWidth: '440px',
                padding: '40px',
                borderRadius: '16px',
                background: '#1e293b',
                border: '1px solid #334155',
                boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)',
                color: '#ffffff'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                  <Compass className="text-blue" size={48} style={{ color: '#38bdf8', marginBottom: '12px' }} />
                  <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '6px' }}>Kênh Đối tác &amp; Quản trị</h2>
                  <p style={{ fontSize: '13.5px', color: '#94a3b8' }}>Đăng nhập để quản lý khách sạn của bạn</p>
                </div>

                {portalAuthForm.error && (
                  <div className="error-message" style={{
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid #ef4444',
                    color: '#f87171',
                    padding: '12px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <AlertCircle size={16} />
                    <span>{portalAuthForm.error}</span>
                  </div>
                )}

                <form onSubmit={handlePortalAuthSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  {portalAuthForm.isRegister && (
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', textAlign: 'left' }}>Họ và Tên đối tác</label>
                      <input 
                        type="text" 
                        required 
                        placeholder="Nguyễn Văn A"
                        value={portalAuthForm.fullName}
                        onChange={(e) => setPortalAuthForm(prev => ({ ...prev, fullName: e.target.value }))}
                        style={{
                          padding: '12px 16px',
                          borderRadius: '8px',
                          border: '1px solid #475569',
                          background: '#0f172a',
                          color: '#ffffff',
                          fontSize: '14.5px'
                        }}
                      />
                    </div>
                  )}

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', textAlign: 'left' }}>Tên tài khoản (username)</label>
                    <input 
                      type="text" 
                      required 
                      placeholder="nhapusername"
                      value={portalAuthForm.username}
                      onChange={(e) => setPortalAuthForm(prev => ({ ...prev, username: e.target.value }))}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #475569',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '14.5px'
                      }}
                    />
                  </div>

                  <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '13px', fontWeight: 600, color: '#cbd5e1', textAlign: 'left' }}>Mật khẩu</label>
                    <input 
                      type="password" 
                      required 
                      placeholder="••••••"
                      value={portalAuthForm.password}
                      onChange={(e) => setPortalAuthForm(prev => ({ ...prev, password: e.target.value }))}
                      style={{
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '1px solid #475569',
                        background: '#0f172a',
                        color: '#ffffff',
                        fontSize: '14.5px'
                      }}
                    />
                  </div>

                  <button type="submit" style={{
                    padding: '14px',
                    background: '#38bdf8',
                    color: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '15px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'background 0.2s',
                    marginTop: '10px'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#0ea5e9'}
                  onMouseLeave={(e) => e.currentTarget.style.background = '#38bdf8'}
                  >
                    {portalAuthForm.isRegister ? 'Đăng ký Tài khoản Đối tác' : 'Đăng nhập trang Quản trị'}
                  </button>

                  <div style={{ textAlign: 'center', fontSize: '13px', marginTop: '10px' }}>
                    {portalAuthForm.isRegister ? (
                      <span>Đã có tài khoản đối tác? <button type="button" onClick={() => setPortalAuthForm(prev => ({ ...prev, isRegister: false, error: '' }))} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}>Đăng nhập</button></span>
                    ) : (
                      <span>Chưa có tài khoản đối tác? <button type="button" onClick={() => setPortalAuthForm(prev => ({ ...prev, isRegister: true, error: '' }))} style={{ background: 'none', border: 'none', color: '#38bdf8', cursor: 'pointer', textDecoration: 'underline' }}>Đăng ký ngay</button></span>
                    )}
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* HOTEL OWNER VIEW */}
          {currentUser && currentUser.role === 'owner' && (
            <div className="dashboard-layout">
            <aside className="sidebar-nav glass-card-heavy">
              <div className="sidebar-header">
                <Building className="text-blue" size={24} />
                <span>Chủ khách sạn</span>
              </div>
              <ul className="sidebar-menu">
                <li 
                  className={ownerTab === 'overview' ? 'active' : ''} 
                  onClick={() => setOwnerTab('overview')}
                >
                  <BarChart size={18} />
                  <span>Tổng quan</span>
                </li>
                <li 
                  className={ownerTab === 'manage' ? 'active' : ''} 
                  onClick={() => setOwnerTab('manage')}
                >
                  <Building size={18} />
                  <span>Khách sạn & Phòng</span>
                </li>
                <li 
                  className={ownerTab === 'bookings' ? 'active' : ''} 
                  onClick={() => setOwnerTab('bookings')}
                >
                  <ClipboardList size={18} />
                  <span>Đơn đặt phòng</span>
                </li>
              </ul>
            </aside>

            <section className="dashboard-content">
              {ownerHotel ? (
                <>
                  <div className="hotel-header-banner glass-card">
                    <h2>{ownerHotel.name}</h2>
                    <p><MapPin size={12} className="inline mr-1" /> {ownerHotel.address}, {ownerHotel.city}</p>
                  </div>

                  {ownerTab === 'overview' && ownerStats && (
                    <OwnerCharts stats={ownerStats} />
                  )}

                  {ownerTab === 'manage' && (
                    <div className="owner-rooms-manager">
                      <div className="manager-title-row">
                        <h3>Danh sách các loại phòng</h3>
                        <button className="add-room-btn" onClick={() => { setEditingRoom(null); setShowAddRoomModal(true); }}>
                          <Plus size={16} /> Thêm phòng mới
                        </button>
                      </div>

                      <div className="owner-rooms-table-card glass-card">
                        <table className="dashboard-table">
                          <thead>
                            <tr>
                              <th>Ảnh</th>
                              <th>Tên phòng</th>
                              <th>Loại</th>
                              <th>Giá/Đêm</th>
                              <th>Sức chứa</th>
                              <th>Tổng số phòng</th>
                              <th>Thao tác</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ownerRooms.map((r) => (
                              <tr key={r.id}>
                                <td><img src={r.image_url} alt={r.name} className="table-thumbnail" /></td>
                                <td><strong>{r.name}</strong></td>
                                <td>{r.type}</td>
                                <td className="text-blue">{r.price_per_night.toLocaleString('vi-VN')} đ</td>
                                <td>{r.capacity} khách</td>
                                <td>{r.total_inventory} phòng</td>
                                <td>
                                  <div className="action-row-buttons">
                                    <button 
                                      className="icon-btn edit" 
                                      onClick={() => {
                                        setEditingRoom(r);
                                        setRoomForm({
                                          name: r.name,
                                          type: r.type,
                                          price_per_night: r.price_per_night,
                                          capacity: r.capacity,
                                          description: r.description,
                                          amenities: r.amenities,
                                          total_inventory: r.total_inventory
                                        });
                                        setShowAddRoomModal(true);
                                      }}
                                    >
                                      <Edit2 size={14} />
                                    </button>
                                    <button className="icon-btn delete" onClick={() => handleDeleteRoom(r.id)}>
                                      <Trash2 size={14} />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {ownerTab === 'bookings' && (
                    <div className="owner-bookings-manager">
                      <h3>Quản lý yêu cầu đặt phòng</h3>
                      <div className="bookings-table-card glass-card">
                        <table className="dashboard-table">
                          <thead>
                            <tr>
                              <th>Mã booking</th>
                              <th>Khách hàng</th>
                              <th>Tên phòng</th>
                              <th>Nhận phòng</th>
                              <th>Trả phòng</th>
                              <th>Giá trị</th>
                              <th>Trạng thái</th>
                              <th>Hành động</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ownerBookings.map((b) => (
                              <tr key={b.id}>
                                <td className="font-mono">#HubHubBK{b.id}</td>
                                <td><strong>{b.traveler_name}</strong> <span className="text-muted">({b.traveler_username})</span></td>
                                <td>{b.room_name}</td>
                                <td>{b.check_in_date}</td>
                                <td>{b.check_out_date}</td>
                                <td className="text-blue">{b.total_price.toLocaleString('vi-VN')} đ</td>
                                <td>
                                  <span className={`status-badge ${b.status}`}>
                                    {b.status === 'pending_payment' && 'Chờ thanh toán'}
                                    {b.status === 'paid' && 'Đã thanh toán'}
                                    {b.status === 'completed' && 'Hoàn tất'}
                                    {b.status === 'cancelled' && 'Đã hủy'}
                                  </span>
                                </td>
                                <td>
                                  <div className="action-row-buttons">
                                    {b.status === 'paid' && (
                                      <button 
                                        className="btn-status-update complete"
                                        onClick={() => handleUpdateBookingStatus(b.id, 'completed')}
                                        title="Hoàn tất check-in & hoàn thành đơn đặt phòng"
                                      >
                                        Hoàn thành
                                      </button>
                                    )}
                                    {b.status !== 'completed' && b.status !== 'cancelled' && (
                                      <button 
                                        className="btn-status-update cancel"
                                        onClick={() => handleUpdateBookingStatus(b.id, 'cancelled')}
                                        title="Hủy đơn đặt phòng và trả lại phòng trống"
                                      >
                                        Hủy đơn
                                      </button>
                                    )}
                                    {b.status === 'completed' && <span className="text-emerald font-bold">Thành công</span>}
                                    {b.status === 'cancelled' && <span className="text-red font-bold">Đã hủy</span>}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="loading-state">
                  <RefreshCw className="animate-spin text-blue" size={32} />
                  <p>Đang tải thông tin quản trị khách sạn...</p>
                </div>
              )}
            </section>
          </div>
        )}

        {/* ADMIN SYSTEM VIEW */}
        {currentUser && currentUser.role === 'admin' && (
          <div className="dashboard-layout">
            <aside className="sidebar-nav glass-card-heavy">
              <div className="sidebar-header">
                <Shield className="text-blue" size={24} />
                <span>Admin Console</span>
              </div>
              <ul className="sidebar-menu">
                <li 
                  className={adminTab === 'approve' ? 'active' : ''} 
                  onClick={() => setAdminTab('approve')}
                >
                  <UserCheck size={18} />
                  <span>Duyệt Đối tác ({pendingOwners.length})</span>
                </li>
                <li 
                  className={adminTab === 'users' ? 'active' : ''} 
                  onClick={() => setAdminTab('users')}
                >
                  <Users size={18} />
                  <span>Người dùng hệ thống</span>
                </li>
                <li 
                  className={adminTab === 'logs' ? 'active' : ''} 
                  onClick={() => setAdminTab('logs')}
                >
                  <FileText size={18} />
                  <span>Giám sát Logs</span>
                </li>
              </ul>
            </aside>

            <section className="dashboard-content">
              {adminStats && (
                <div className="admin-stats-summary-grid">
                  <div className="admin-stat-card glass-card">
                    <span className="label">Tổng Thành viên</span>
                    <h2>{adminStats.total_users}</h2>
                  </div>
                  <div className="admin-stat-card glass-card">
                    <span className="label">Khách sạn đang chạy</span>
                    <h2>{adminStats.total_hotels}</h2>
                  </div>
                  <div className="admin-stat-card glass-card">
                    <span className="label">Tổng hóa đơn đặt</span>
                    <h2>{adminStats.total_bookings}</h2>
                  </div>
                  <div className="admin-stat-card glass-card">
                    <span className="label">Tổng số cuộc gọi API</span>
                    <h2>{adminStats.total_traffic} reqs</h2>
                  </div>
                </div>
              )}

              {adminTab === 'approve' && (
                <div className="admin-approval-panel">
                  <h3>Phê duyệt đối tác khách sạn mới</h3>
                  <div className="admin-table-card glass-card">
                    {pendingOwners.length === 0 ? (
                      <div className="empty-state">
                        <CheckCircle2 className="text-emerald" size={48} />
                        <p>Không có yêu cầu chờ duyệt mới.</p>
                      </div>
                    ) : (
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>Tên tài khoản</th>
                            <th>Họ và Tên</th>
                            <th>Vai trò mong muốn</th>
                            <th>Trạng thái hiện tại</th>
                            <th>Phê duyệt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingOwners.map((owner) => (
                            <tr key={owner.id}>
                              <td>{owner.username}</td>
                              <td><strong>{owner.full_name}</strong></td>
                              <td>Chủ khách sạn (Owner)</td>
                              <td><span className="status-badge pending">Chờ duyệt</span></td>
                              <td>
                                <div className="action-row-buttons">
                                  <button 
                                    className="btn-status-update complete"
                                    onClick={() => handleApproveOwner(owner.id, 'approved')}
                                  >
                                    Đồng ý duyệt
                                  </button>
                                  <button 
                                    className="btn-status-update cancel"
                                    onClick={() => handleApproveOwner(owner.id, 'rejected')}
                                  >
                                    Từ chối
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}

              {adminTab === 'users' && (
                <div className="admin-users-panel">
                  <h3>Tài khoản hệ thống</h3>
                  <div className="admin-table-card glass-card">
                    <table className="dashboard-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Tên tài khoản</th>
                          <th>Họ và tên</th>
                          <th>Vai trò</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {systemUsers.map((u) => (
                          <tr key={u.id}>
                            <td>{u.id}</td>
                            <td>{u.username}</td>
                            <td><strong>{u.full_name}</strong></td>
                            <td>
                              <span className={`role-pill ${u.role}`}>
                                {u.role === 'admin' ? 'Admin' : u.role === 'owner' ? 'Chủ khách sạn' : 'Khách hàng'}
                              </span>
                            </td>
                            <td>
                              <span className={`status-badge ${u.status === 'approved' || u.status === 'active' ? 'paid' : u.status}`}>
                                {u.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {adminTab === 'logs' && (
                <div className="admin-logs-panel">
                  <h3>Nhật ký hoạt động hệ thống (System Audit Logs)</h3>
                  <div className="admin-table-card glass-card">
                    <table className="dashboard-table logs-table">
                      <thead>
                        <tr>
                          <th>Thời gian</th>
                          <th>Địa chỉ IP</th>
                          <th>API Endpoint</th>
                          <th>Mã Code</th>
                          <th>Tài khoản truy vấn</th>
                        </tr>
                      </thead>
                      <tbody>
                        {systemLogs.map((log) => (
                          <tr key={log.id}>
                            <td className="font-mono text-muted">{log.timestamp}</td>
                            <td className="font-mono">{log.ip_address}</td>
                            <td className="font-mono text-blue">{log.path}</td>
                            <td>
                              <span className={`http-code ${log.status_code >= 400 ? 'bad' : 'good'}`}>
                                {log.status_code}
                              </span>
                            </td>
                            <td>{log.username || 'Khách vãng lai (Guest)'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
        </main>
      </>
    )}

      {/* ========================================================================= */}
      {/* MODALS */}
      {/* ========================================================================= */}

      {/* 1. Traditional Auth Modal */}
      {showAuthModal && (
        <div className="modal-backdrop">
          <div className="modal-content auth-modal glass-card-heavy animate-fade-in">
            <div className="modal-header">
              <h3>{isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập hệ thống'}</h3>
              <button className="modal-close-btn" onClick={() => setShowAuthModal(false)}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleAuthSubmit} className="auth-form-body">
              {authError && <div className="error-message"><AlertCircle size={14} /> {authError}</div>}
              
              {isRegister && (
                <div className="form-group">
                  <label>Họ và Tên</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="Nguyễn Văn A"
                    value={authForm.fullName}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, fullName: e.target.value }))}
                  />
                </div>
              )}

              <div className="form-group">
                <label>Tên tài khoản (username)</label>
                <input 
                  type="text" 
                  required 
                  placeholder="nhapusername"
                  value={authForm.username}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, username: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Mật khẩu</label>
                <input 
                  type="password" 
                  required 
                  placeholder="••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm(prev => ({ ...prev, password: e.target.value }))}
                />
              </div>

              {isRegister && (
                <div className="form-group">
                  <label>Bạn đăng ký làm:</label>
                  <select 
                    value={authForm.role}
                    onChange={(e) => setAuthForm(prev => ({ ...prev, role: e.target.value }))}
                  >
                    <option value="traveler">Khách du lịch (Tìm và đặt phòng)</option>
                    <option value="owner">Chủ khách sạn đối tác (Đăng ký khách sạn & phòng)</option>
                  </select>
                </div>
              )}

              <button type="submit" className="auth-submit-btn">
                {isRegister ? 'Đăng ký ngay' : 'Đăng nhập'}
              </button>

              <div className="auth-toggle-note">
                {isRegister ? (
                  <span>Đã có tài khoản? <button type="button" onClick={() => setIsRegister(false)}>Đăng nhập</button></span>
                ) : (
                  <span>Chưa có tài khoản? <button type="button" onClick={() => setIsRegister(true)}>Đăng ký đối tác/khách hàng</button></span>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Room Detail Modal (Traveler) */}
      {selectedRoom && (
        <div className="modal-backdrop">
          <div className="modal-content detail-modal glass-card-heavy animate-fade-in">
            <div className="modal-header">
              <h3>{selectedRoom.name}</h3>
              <button className="modal-close-btn" onClick={() => setSelectedRoom(null)}><X size={20} /></button>
            </div>
            
            <div className="detail-modal-body">
              <img src={selectedRoom.image_url} alt={selectedRoom.name} className="detail-hero-img" />
              <div className="detail-info-grid">
                <div>
                  <span className="hotel-title-text">{selectedRoom.hotel_name}</span>
                  <div className="location-line"><MapPin size={12} /> {selectedRoom.hotel_address}, {selectedRoom.hotel_city}</div>
                  <p className="detail-description">{selectedRoom.description}</p>
                  
                  <h4>Tiện nghi phòng và dịch vụ kèm theo</h4>
                  <div className="detail-amenity-list">
                    {(selectedRoom.amenities || '').split(',').map(tag => (
                      <span key={tag} className="detail-pill-tag"><Check size={12} className="text-blue" /> {tag.trim()}</span>
                    ))}
                  </div>
                </div>

                <div className="detail-booking-card-overlay glass-card">
                  <div className="price-tag-big">
                    <span className="num">{selectedRoom.price_per_night.toLocaleString('vi-VN')} đ</span>
                    <span className="unit">/ đêm</span>
                  </div>
                  
                  <hr className="divider" />

                  <div className="detail-dates-info">
                    <div className="info-row">
                      <span>Nhận phòng:</span>
                      <strong>{searchFilters.checkIn}</strong>
                    </div>
                    <div className="info-row">
                      <span>Trả phòng:</span>
                      <strong>{searchFilters.checkOut}</strong>
                    </div>
                    <div className="info-row">
                      <span>Sức chứa tối đa:</span>
                      <strong>{selectedRoom.capacity} khách</strong>
                    </div>
                  </div>

                  <button 
                    className="book-now-overlay-btn"
                    onClick={() => handleBookRoom(selectedRoom)}
                  >
                    Xác nhận đặt phòng & nhận VietQR
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. VietQR Payment Modal */}
      {activeBooking && (
        <QRCodeModal 
          booking={activeBooking} 
          onClose={() => setActiveBooking(null)} 
          onPaymentSuccess={() => {
            setBookingSuccessMsg("Đặt phòng thành công! Hóa đơn đã được lưu vào Lịch sử.");
            setRefreshTrigger(prev => prev + 1);
            setStorefrontTab('my-bookings');
            setTimeout(() => setBookingSuccessMsg(''), 5000);
          }}
        />
      )}

      {/* 4. Add/Edit Room Modal (Owner) */}
      {showAddRoomModal && (
        <div className="modal-backdrop">
          <div className="modal-content room-crud-modal glass-card-heavy animate-fade-in">
            <div className="modal-header">
              <h3>{editingRoom ? 'Cập nhật phòng: ' + editingRoom.name : 'Thêm phòng mới'}</h3>
              <button className="modal-close-btn" onClick={() => { setShowAddRoomModal(false); setEditingRoom(null); }}><X size={20} /></button>
            </div>

            <form onSubmit={handleCreateOrUpdateRoom} className="room-form-grid">
              <div className="form-group full-width">
                <label>Tên phòng</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Deluxe Double River View"
                  value={roomForm.name}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label>Loại phòng</label>
                <select 
                  value={roomForm.type}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, type: e.target.value }))}
                >
                  <option value="Single">Phòng Đơn (Single)</option>
                  <option value="Double">Phòng Đôi (Double)</option>
                  <option value="Suite">Gia đình (Suite)</option>
                  <option value="Presidential">Thượng hạng VIP (Presidential)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Giá một đêm (VNĐ)</label>
                <input 
                  type="number" 
                  required 
                  min="10000"
                  step="50000"
                  value={roomForm.price_per_night}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, price_per_night: parseFloat(e.target.value) }))}
                />
              </div>

              <div className="form-group">
                <label>Sức chứa tối đa (Khách)</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  value={roomForm.capacity}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, capacity: parseInt(e.target.value) }))}
                />
              </div>

              <div className="form-group">
                <label>Tổng số lượng phòng có sẵn</label>
                <input 
                  type="number" 
                  required 
                  min="1"
                  value={roomForm.total_inventory}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, total_inventory: parseInt(e.target.value) }))}
                />
              </div>

              <div className="form-group full-width">
                <label>Tiện ích phòng (ngăn cách bằng dấu phẩy)</label>
                <input 
                  type="text" 
                  placeholder="wifi, tivi, bồn tắm, lò sưởi"
                  value={roomForm.amenities}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, amenities: e.target.value }))}
                />
              </div>

              <div className="form-group full-width">
                <label>Mô tả chi tiết phòng</label>
                <textarea 
                  rows="3"
                  placeholder="Phòng có thiết kế tinh tế..."
                  value={roomForm.description}
                  onChange={(e) => setRoomForm(prev => ({ ...prev, description: e.target.value }))}
                ></textarea>
              </div>

              <div className="modal-footer full-width">
                <button type="button" className="btn-cancel" onClick={() => { setShowAddRoomModal(false); setEditingRoom(null); }}>Hủy bỏ</button>
                <button type="submit" className="btn-submit">{editingRoom ? 'Lưu thay đổi' : 'Thêm phòng'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast notification for booking success */}
      {bookingSuccessMsg && (
        <div className="toast-notification success animate-bounce">
          <CheckCircle2 size={18} />
          <span>{bookingSuccessMsg}</span>
        </div>
      )}
    </div>
  );
}

export default App;
