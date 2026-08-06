import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { clearAuth } from '../store/slices/authSlice';
import {
  Building2,
  Calendar,
  Clock,
  CheckCircle2,
  LogOut,
  LogIn,
  Search,
  RefreshCw,
  Sparkles,
  Bed,
  Check,
  AlertCircle,
  UserCheck,
  Shield,
  Layers,
  Phone,
  Mail,
  Edit3,
  AlertTriangle,
  X,
} from 'lucide-react';
import staffService from '../core/api/staffService';
import { formatDateVN } from '../utils/date';

export const StaffDashboard: React.FC = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: any) => state.auth.user);

  const [activeTab, setActiveTab] = useState<'reception' | 'housekeeping'>('reception');
  const [overview, setOverview] = useState<any>(null);
  const [_loadingOverview, setLoadingOverview] = useState<boolean>(true);

  // Reception State
  const [bookings, setBookings] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState<boolean>(false);
  const [filterType, setFilterType] = useState<string>('ARRIVALS');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Assign Room Modal State
  const [assigningItem, setAssigningItem] = useState<any>(null);
  const [assigningBookingId, setAssigningBookingId] = useState<string | null>(null);
  const [selectedRoomNumbers, setSelectedRoomNumbers] = useState<string[]>([]);
  const [autoCheckInAfterAssign, setAutoCheckInAfterAssign] = useState<boolean>(false);
  const [submittingAssign, setSubmittingAssign] = useState<boolean>(false);

  // Housekeeping State
  const [roomTypes, setRoomTypes] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState<boolean>(false);
  const [housekeepingFilter, setHousekeepingFilter] = useState<string>('ALL');

  const fetchOverview = async () => {
    setLoadingOverview(true);
    try {
      const res = await staffService.getDashboardOverview();
      if (res.success) {
        setOverview(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải tổng quan:', err);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await staffService.getBookings({
        filterType,
        query: searchQuery,
      });
      if (res.success) {
        setBookings(res.data.bookings);
      }
    } catch (err) {
      console.error('Lỗi khi tải bookings:', err);
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchRooms = async () => {
    setLoadingRooms(true);
    try {
      const res = await staffService.getRooms();
      if (res.success) {
        setRoomTypes(res.data);
      }
    } catch (err) {
      console.error('Lỗi khi tải sơ đồ phòng:', err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchOverview();
    fetchRooms();
  }, []);

  useEffect(() => {
    if (activeTab === 'reception') {
      fetchBookings();
    } else if (activeTab === 'housekeeping') {
      fetchRooms();
    }
  }, [activeTab, filterType, searchQuery]);

  const handleOpenAssignModal = (item: any, booking: any, checkInAfter = false) => {
    setAssigningItem(item);
    setAssigningBookingId(booking.id);
    setAutoCheckInAfterAssign(checkInAfter);

    const initialNumbers = item.roomNumbers
      ? item.roomNumbers.split(',').map((n: string) => n.trim()).filter(Boolean)
      : [];
    setSelectedRoomNumbers(initialNumbers);

    // Refresh room status list to ensure clean data
    fetchRooms();
  };

  const toggleRoomSelection = (roomNumber: string) => {
    setSelectedRoomNumbers((prev) =>
      prev.includes(roomNumber)
        ? prev.filter((r) => r !== roomNumber)
        : [...prev, roomNumber]
    );
  };

  const handleSaveAssignedRooms = async () => {
    if (!assigningItem) return;

    if (selectedRoomNumbers.length === 0) {
      alert('Vui lòng chọn ít nhất 1 phòng trống cho khách.');
      return;
    }

    setSubmittingAssign(true);
    const roomNumbersString = selectedRoomNumbers.join(', ');

    try {
      await staffService.assignRoomNumbers(assigningItem.id, roomNumbersString);

      if (autoCheckInAfterAssign && assigningBookingId) {
        await staffService.updateBookingStatus(assigningBookingId, { status: 'CHECKED_IN' });
      }

      setAssigningItem(null);
      setAssigningBookingId(null);
      setSelectedRoomNumbers([]);
      setAutoCheckInAfterAssign(false);

      fetchBookings();
      fetchOverview();
      fetchRooms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi gán phòng');
    } finally {
      setSubmittingAssign(false);
    }
  };

  const handleCheckInClick = async (booking: any) => {
    // Check if any booking item is missing room assignment
    const unassignedItem = booking.bookingItems.find((item: any) => !item.roomNumbers || item.roomNumbers.trim() === '');

    if (unassignedItem) {
      // Prompt modal to pick rooms first
      handleOpenAssignModal(unassignedItem, booking, true);
    } else {
      // Proceed directly to check in
      try {
        await staffService.updateBookingStatus(booking.id, { status: 'CHECKED_IN' });
        fetchBookings();
        fetchOverview();
        fetchRooms();
      } catch (err: any) {
        alert(err.response?.data?.message || 'Lỗi khi Check-in');
      }
    }
  };

  const handleUpdateBookingStatus = async (bookingId: string, newStatus: string) => {
    try {
      await staffService.updateBookingStatus(bookingId, { status: newStatus });
      fetchBookings();
      fetchOverview();
      fetchRooms();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái đơn đặt phòng');
    }
  };

  const handleUpdateRoomHousekeeping = async (roomId: string, newStatus: string) => {
    try {
      await staffService.updateRoomHousekeepingStatus(roomId, newStatus);
      fetchRooms();
      fetchOverview();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái buồng phòng');
    }
  };

  // Find target roomType object for assigningItem modal
  const targetRoomType = assigningItem
    ? roomTypes.find((rt) => rt.id === assigningItem.roomTypeId)
    : null;

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16">
      {/* Top Banner & Hotel Identity */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white pt-8 pb-16 px-4 md:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-blue-500/20 backdrop-blur-md border border-blue-400/30 text-blue-300 text-xs font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" /> Staff Workspace
              </span>
              <span className="text-xs text-slate-300">
                Xin chào, <strong className="text-white font-semibold">{user?.fullName}</strong>
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center gap-3">
              <Building2 className="w-7 h-7 text-blue-400" />
              {overview?.hotelInfo?.name || 'Bàn Vận Hành Khách Sạn'}
            </h1>
            <p className="text-sm text-slate-300 flex items-center gap-2">
              <span>{overview?.hotelInfo?.address}</span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                fetchOverview();
                fetchRooms();
                if (activeTab === 'reception') fetchBookings();
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium transition-all backdrop-blur-md"
            >
              <RefreshCw className="w-4 h-4" /> Làm mới
            </button>
            <button
              onClick={() => {
                dispatch(clearAuth());
                navigate('/login');
              }}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-400/30 rounded-xl text-sm font-semibold transition-all backdrop-blur-md"
            >
              <LogOut className="w-4 h-4" /> Đăng xuất
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 md:px-8 -mt-8">
        {/* Overview Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <LogIn className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Arrivals Hôm Nay</div>
              <div className="text-2xl font-black text-slate-800">{overview?.stats?.arrivalsToday ?? 0}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <LogOut className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Departures Hôm Nay</div>
              <div className="text-2xl font-black text-slate-800">{overview?.stats?.departuresToday ?? 0}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Khách Đang Ở</div>
              <div className="text-2xl font-black text-slate-800">{overview?.stats?.inHouse ?? 0}</div>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Phòng Cần Dọn</div>
              <div className="text-2xl font-black text-slate-800">{overview?.stats?.roomStats?.dirty ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 mb-6 bg-white p-1.5 rounded-2xl shadow-sm border">
          <button
            onClick={() => setActiveTab('reception')}
            className={`flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'reception'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            Bàn Lễ Tân (Front Desk)
          </button>
          <button
            onClick={() => setActiveTab('housekeeping')}
            className={`flex-1 py-3 px-6 font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 ${
              activeTab === 'housekeeping'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
            }`}
          >
            <Bed className="w-4 h-4" />
            Sơ Đồ & Buồng Phòng (Housekeeping)
          </button>
        </div>

        {/* TAB 1: RECEPTION (FRONT DESK) */}
        {activeTab === 'reception' && (
          <div className="space-y-6">
            {/* Filter & Search Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                {[
                  { id: 'ARRIVALS', label: 'Arrivals Hôm Nay' },
                  { id: 'DEPARTURES', label: 'Departures Hôm Nay' },
                  { id: 'IN_HOUSE', label: 'Đang Ở (In-House)' },
                  { id: 'ALL', label: 'Tất Cả Bookings' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterType(tab.id)}
                    className={`px-4 py-2 text-xs font-bold rounded-xl whitespace-nowrap transition-all ${
                      filterType === tab.id
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <div className="relative w-full md:w-72">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Tìm theo Tên, SĐT, Mã đơn..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Bookings List */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              {loadingBookings ? (
                <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                  <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                  <span>Đang tải danh sách đặt phòng...</span>
                </div>
              ) : bookings.length === 0 ? (
                <div className="p-12 text-center text-slate-400">
                  <CheckCircle2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-semibold text-slate-600">Không có đơn đặt phòng nào phù hợp</p>
                  <p className="text-xs text-slate-400 mt-1">Thử thay đổi bộ lọc hoặc tìm kiếm tên khách hàng.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {bookings.map((booking) => (
                    <div key={booking.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                        {/* Guest & Booking Info */}
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-200">
                              #{booking.id.slice(0, 8).toUpperCase()}
                            </span>
                            <span
                              className={`px-2.5 py-1 text-xs font-extrabold rounded-md uppercase ${
                                booking.status === 'CHECKED_IN'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : booking.status === 'CHECKED_OUT' || booking.status === 'COMPLETED'
                                  ? 'bg-slate-100 text-slate-700'
                                  : booking.status === 'CONFIRMED'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {booking.status}
                            </span>
                          </div>

                          <div className="flex items-center gap-3">
                            <h3 className="text-base font-bold text-slate-800">{booking.guestName}</h3>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {booking.guestPhone}</span>
                              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {booking.guestEmail}</span>
                            </div>
                          </div>

                          {/* Room types & assigned numbers */}
                          <div className="flex flex-wrap items-center gap-2 pt-1">
                            {booking.bookingItems.map((item: any) => (
                              <div
                                key={item.id}
                                className="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs flex items-center gap-2"
                              >
                                <span className="font-semibold text-slate-700">{item.roomType?.name} (x{item.quantity})</span>
                                {item.roomNumbers ? (
                                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                    Phòng: {item.roomNumbers}
                                    <button
                                      onClick={() => handleOpenAssignModal(item, booking)}
                                      className="text-slate-400 hover:text-blue-600 ml-1"
                                      title="Đổi phòng"
                                    >
                                      <Edit3 className="w-3 h-3" />
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => handleOpenAssignModal(item, booking)}
                                    className="text-blue-600 font-semibold underline hover:text-blue-800 flex items-center gap-1"
                                  >
                                    <Bed className="w-3.5 h-3.5" /> + Chọn phòng trống
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Dates & Payment */}
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 lg:border-l lg:pl-6 border-slate-100">
                          <div className="space-y-1 text-xs">
                            <div className="text-slate-500 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-blue-500" />
                              <span>
                                Nhận: <strong className="text-slate-800">{formatDateVN(booking.checkInDate)}</strong>
                              </span>
                            </div>
                            <div className="text-slate-500 flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-rose-500" />
                              <span>
                                Trả: <strong className="text-slate-800">{formatDateVN(booking.checkOutDate)}</strong>
                              </span>
                            </div>
                            <div className="text-slate-400 font-medium">
                              Tổng tiền: <span className="text-slate-900 font-bold text-sm">{Number(booking.finalPrice).toLocaleString('vi-VN')} đ</span>
                            </div>
                          </div>

                          {/* Quick Action buttons */}
                          <div className="flex flex-wrap items-center gap-2">
                            {booking.status !== 'CHECKED_IN' && booking.status !== 'CHECKED_OUT' && (
                              <button
                                onClick={() => handleCheckInClick(booking)}
                                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                              >
                                <LogIn className="w-3.5 h-3.5" /> Check-In
                              </button>
                            )}

                            {booking.status === 'CHECKED_IN' && (
                              <button
                                onClick={() => handleUpdateBookingStatus(booking.id, 'CHECKED_OUT')}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-sm transition-all flex items-center gap-1.5"
                              >
                                <LogOut className="w-3.5 h-3.5" /> Check-Out
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: HOUSEKEEPING & ROOM GRID */}
        {activeTab === 'housekeeping' && (
          <div className="space-y-6">
            {/* Housekeeping Filters */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex items-center gap-2">
                {[
                  { id: 'ALL', label: 'Tất cả trạng thái' },
                  { id: 'CLEAN', label: 'Đã dọn sạch (Clean)' },
                  { id: 'DIRTY', label: 'Cần dọn dẹp (Dirty)' },
                  { id: 'IN_USE', label: 'Đang có khách (In Use)' },
                  { id: 'MAINTENANCE', label: 'Đang bảo trì' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setHousekeepingFilter(f.id)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                      housekeepingFilter === f.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Types Grid */}
            {loadingRooms ? (
              <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
                <span>Đang tải sơ đồ phòng...</span>
              </div>
            ) : roomTypes.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl shadow-sm border border-slate-100 text-slate-400">
                <Bed className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-600">Khách sạn chưa cấu hình phòng thực tế</p>
                <p className="text-xs text-slate-400 mt-1">Chủ khách sạn có thể thêm số phòng (Room Numbers) trong quản lý loại phòng.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {roomTypes.map((rt: any) => {
                  const filteredRooms = rt.rooms.filter((r: any) =>
                    housekeepingFilter === 'ALL' ? true : r.housekeepingStatus === housekeepingFilter
                  );

                  if (filteredRooms.length === 0 && housekeepingFilter !== 'ALL') return null;

                  return (
                    <div key={rt.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                      <h3 className="text-base font-extrabold text-slate-800 mb-4 flex items-center gap-2">
                        <Layers className="w-5 h-5 text-blue-600" />
                        {rt.name} <span className="text-xs font-normal text-slate-400">({rt.rooms.length} phòng)</span>
                      </h3>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {filteredRooms.map((room: any) => {
                          const status = room.housekeepingStatus || 'CLEAN';
                          return (
                            <div
                              key={room.id}
                              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between h-32 ${
                                status === 'CLEAN'
                                  ? 'bg-emerald-50/50 border-emerald-200'
                                  : status === 'DIRTY'
                                  ? 'bg-amber-50/50 border-amber-200'
                                  : status === 'IN_USE'
                                  ? 'bg-rose-50/50 border-rose-200'
                                  : 'bg-slate-100 border-slate-300'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="text-lg font-black text-slate-900">P.{room.roomNumber}</span>
                                <span
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    status === 'CLEAN'
                                      ? 'bg-emerald-500'
                                      : status === 'DIRTY'
                                      ? 'bg-amber-500'
                                      : status === 'IN_USE'
                                      ? 'bg-rose-500'
                                      : 'bg-slate-500'
                                  }`}
                                ></span>
                              </div>

                              <div className="text-xs font-bold uppercase tracking-wider">
                                {status === 'CLEAN' && <span className="text-emerald-700">SẠCH SẴN SÀNG</span>}
                                {status === 'DIRTY' && <span className="text-amber-700">CẦN DỌN DẸP</span>}
                                {status === 'IN_USE' && <span className="text-rose-700">ĐANG CÓ KHÁCH</span>}
                                {status === 'MAINTENANCE' && <span className="text-slate-600">BẢO TRÌ</span>}
                              </div>

                              {/* Action to change status */}
                              <select
                                value={status}
                                onChange={(e) => handleUpdateRoomHousekeeping(room.id, e.target.value)}
                                className="w-full text-xs font-semibold py-1 px-1.5 bg-white/80 border border-slate-200 rounded-lg focus:outline-none"
                              >
                                <option value="CLEAN">Sạch (Clean)</option>
                                <option value="DIRTY">Cần dọn (Dirty)</option>
                                <option value="IN_USE">Có khách (In Use)</option>
                                <option value="MAINTENANCE">Bảo trì (Maintenance)</option>
                              </select>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Chọn Phòng Trống Trực Quan */}
      {assigningItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2 text-base">
                  <Bed className="w-5 h-5 text-blue-600" />
                  Chọn Phòng Cho Khách
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Hạng phòng: <strong className="text-slate-700">{assigningItem.roomType?.name}</strong> (Cần chọn {assigningItem.quantity} phòng)
                </p>
              </div>
              <button
                onClick={() => {
                  setAssigningItem(null);
                  setAutoCheckInAfterAssign(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200/60"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-5">
              {autoCheckInAfterAssign && (
                <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-xl flex items-center gap-2 font-medium">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>Khách chuẩn bị Check-In. Vui lòng chọn phòng trống bên dưới để hoàn tất!</span>
                </div>
              )}

              {/* Grid danh sách phòng thực tế */}
              {!targetRoomType || !targetRoomType.rooms || targetRoomType.rooms.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                  <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Chưa cấu hình phòng thực tế cho loại phòng này</p>
                  <p className="text-[11px] text-slate-400 mt-1">Vui lòng nhập thủ công số phòng bên dưới.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
                    <span>Chọn phòng từ sơ đồ buồng phòng:</span>
                    <span className="text-blue-600 font-bold">Đã chọn ({selectedRoomNumbers.length}/{assigningItem.quantity})</span>
                  </div>

                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 max-h-56 overflow-y-auto p-1">
                    {targetRoomType.rooms.map((room: any) => {
                      const isSelected = selectedRoomNumbers.includes(room.roomNumber);
                      const isClean = room.housekeepingStatus === 'CLEAN';
                      const isInUse = room.housekeepingStatus === 'IN_USE';
                      const isDirty = room.housekeepingStatus === 'DIRTY';

                      return (
                        <button
                          key={room.id}
                          type="button"
                          disabled={isInUse}
                          onClick={() => toggleRoomSelection(room.roomNumber)}
                          className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 shadow-md ring-2 ring-blue-300'
                              : isClean
                              ? 'bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900'
                              : isDirty
                              ? 'bg-amber-50 hover:bg-amber-100/80 border-amber-200 text-amber-900'
                              : 'bg-slate-100 text-slate-400 border-slate-200 opacity-60 cursor-not-allowed'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm">P.{room.roomNumber}</span>
                            {isSelected ? (
                              <CheckCircle2 className="w-4 h-4 text-white" />
                            ) : (
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  isClean ? 'bg-emerald-500' : isDirty ? 'bg-amber-500' : 'bg-slate-400'
                                }`}
                              ></span>
                            )}
                          </div>

                          <div className="text-[10px] font-bold uppercase tracking-wider mt-1">
                            {isSelected
                              ? 'Đã chọn'
                              : isClean
                              ? 'Sạch'
                              : isDirty
                              ? 'Cần dọn'
                              : isInUse
                              ? 'Đang có khách'
                              : 'Bảo trì'}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Ô nhập chỉnh sửa thủ công */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số phòng đã chọn (Tách nhau bằng dấu phẩy)
                </label>
                <input
                  type="text"
                  placeholder="VD: 101, 102"
                  value={selectedRoomNumbers.join(', ')}
                  onChange={(e) =>
                    setSelectedRoomNumbers(
                      e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean)
                    )
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setAssigningItem(null);
                    setAutoCheckInAfterAssign(false);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleSaveAssignedRooms}
                  disabled={submittingAssign}
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md disabled:opacity-50 flex items-center gap-1.5"
                >
                  {submittingAssign ? (
                    'Đang xử lý...'
                  ) : autoCheckInAfterAssign ? (
                    <>
                      <LogIn className="w-3.5 h-3.5" /> Xác Nhận Gán Phòng & Check-In
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" /> Lưu Số Phòng
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
