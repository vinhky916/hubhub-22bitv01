import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import type { RootState } from '../store';
import apiClient from '../core/api/client';
import { formatDateVN, formatDateTimeVN } from '../utils/date';
import { useModal } from '../components/common/ModalContext';
import { 
  Percent, Plus, Search, Bell, MessageSquare, 
  Sun, Moon, Globe, LogOut, Settings, User, Key, Menu, 
  Users, Hotel, Bed, CalendarRange, CreditCard, Star, FileText, BarChart3, 
  Database, ShieldAlert, CheckCircle, Trash2, ChevronDown, Sliders, RefreshCw,
  Download, Upload
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell 
} from 'recharts';
import { CustomSelect } from '../components/common/CustomSelect';

// --- Types ---
interface Hotel {
  id: string;
  name: string;
  address: string;
  starRating: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  rejectReason?: string | null;
  owner?: { fullName: string; email: string };
  category?: string;
  createdAt: string;
}

interface Coupon {
  id: string;
  code: string;
  description: string;
  discountType: 'PERCENTAGE' | 'FIXED';
  discountValue: number;
  usageLimit: number;
  usedCount: number;
  isActive: boolean;
  endDate: string;
}

interface AiLog {
  id: string;
  queryText: string;
  parsedQuery: any;
  isSuccess: boolean;
  executionMs: number;
  createdAt: string;
}

interface AuditLog {
  id: string;
  action: string;
  entityName: string;
  createdAt: string;
  user: { fullName: string; email: string };
}

export const AdminDashboard: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const { showAlert, showConfirm } = useModal();
  
  // Layout states
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [activeMenu, setActiveMenu] = useState<
    'dashboard' | 'users' | 'hotels' | 'rooms' | 'bookings' | 'payment' | 'promotions' | 'reviews' | 'cms' | 'reports' | 'logs' | 'settings'
  >('dashboard');
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');

  // Dropdown states
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [messagesOpen, setMessagesOpen] = useState(false);

  // Refs for click outside handling
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const notificationsMenuRef = useRef<HTMLDivElement>(null);
  const messagesMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (notificationsMenuRef.current && !notificationsMenuRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
      if (messagesMenuRef.current && !messagesMenuRef.current.contains(event.target as Node)) {
        setMessagesOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Common UI states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [successToast, setSuccessToast] = useState('');

  // Modals
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // --- Admin Stats states ---
  const [stats, setStats] = useState<any>({ 
    totalHotels: 0, totalRooms: 0, totalOwners: 0, totalCustomers: 0, 
    todayBookings: 0, monthlyBookings: 0, revenueToday: 0, revenueMonth: 0 
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [pieData, setPieData] = useState<any[]>([]);
  const [recentBookings, setRecentBookings] = useState<any[]>([]);

  // --- Real Backend Data ---
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelsLoading, setHotelsLoading] = useState(false);
  const [rejectingHotelId, setRejectingHotelId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [couponsLoading, setCouponsLoading] = useState(false);
  const [showAddCoupon, setShowAddCoupon] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'PERCENTAGE' | 'FIXED'>('PERCENTAGE');
  const [newValue, setNewValue] = useState('');
  const [newMinOrderValue, setNewMinOrderValue] = useState('');
  const [newMaxDiscountAmount, setNewMaxDiscountAmount] = useState('');
  const [newLimit, setNewLimit] = useState('');
  const [newDailyLimit, setNewDailyLimit] = useState('');
  const [newTargetUserType, setNewTargetUserType] = useState<'ALL' | 'NEW' | 'VIP'>('ALL');
  const [newStart, setNewStart] = useState(`${new Date().toISOString().split('T')[0]}T08:00`);
  const [newEnd, setNewEnd] = useState('');

  const [aiLogs, setAiLogs] = useState<AiLog[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // --- New Admin Datasets States ---
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersFilterRole, setUsersFilterRole] = useState('ALL');

  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [allBookingsLoading, setAllBookingsLoading] = useState(false);
  const [allBookingsFilterStatus, setAllBookingsFilterStatus] = useState('ALL');

  const [allPayments, setAllPayments] = useState<any[]>([]);
  const [allPaymentsLoading, setAllPaymentsLoading] = useState(false);
  const [paymentsFilterMethod, setPaymentsFilterMethod] = useState('ALL');

  const [allReviews, setAllReviews] = useState<any[]>([]);
  const [allReviewsLoading, setAllReviewsLoading] = useState(false);

  // --- API Fetch Functions ---
  const fetchHotels = async () => {
    setHotelsLoading(true);
    try {
      const res = await apiClient.get('/hotels?status=ALL');
      setHotels(res.data.data.hotels);
    } catch (err) {
      console.error(err);
    } finally {
      setHotelsLoading(false);
    }
  };

  const fetchCoupons = async () => {
    setCouponsLoading(true);
    try {
      const res = await apiClient.get('/coupons?all=true');
      setCoupons(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setCouponsLoading(false);
    }
  };

  const fetchAiLogs = async () => {
    setAiLoading(true);
    try {
      const res = await apiClient.get('/ai/logs');
      setAiLogs(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const res = await apiClient.get('/ai/audit-logs');
      setAuditLogs(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setAuditLoading(false);
    }
  };

  const fetchUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await apiClient.get('/auth/admin/users', {
        params: {
          role: usersFilterRole === 'ALL' ? undefined : usersFilterRole,
          search: searchTerm || undefined
        }
      });
      setUsers(res.data.data.users || []);
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchAllBookings = async () => {
    setAllBookingsLoading(true);
    try {
      const res = await apiClient.get('/auth/admin/bookings', {
        params: {
          status: allBookingsFilterStatus === 'ALL' ? undefined : allBookingsFilterStatus,
          search: searchTerm || undefined
        }
      });
      setAllBookings(res.data.data.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAllBookingsLoading(false);
    }
  };

  const fetchPayments = async () => {
    setAllPaymentsLoading(true);
    try {
      const res = await apiClient.get('/auth/admin/payments', {
        params: {
          method: paymentsFilterMethod === 'ALL' ? undefined : paymentsFilterMethod
        }
      });
      setAllPayments(res.data.data.payments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAllPaymentsLoading(false);
    }
  };

  const fetchReviews = async () => {
    setAllReviewsLoading(true);
    try {
      const res = await apiClient.get('/auth/admin/reviews', {
        params: {
          search: searchTerm || undefined
        }
      });
      setAllReviews(res.data.data.reviews || []);
    } catch (err) {
      console.error(err);
    } finally {
      setAllReviewsLoading(false);
    }
  };

  const fetchAdminStats = async () => {
    try {
      const res = await apiClient.get('/bookings/admin-stats');
      setStats(res.data.data.stats);
      setChartData(res.data.data.chartData);
      setPieData(res.data.data.pieData);
      setRecentBookings(res.data.data.recentBookings || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Real-time listener for Admin Dashboard auto refresh
  useEffect(() => {
    const handleBookingUpdated = () => {
      fetchAllBookings();
      fetchAdminStats();
    };

    const handleHotelUpdated = () => {
      fetchHotels();
      fetchAdminStats();
    };

    window.addEventListener('booking:statusUpdated', handleBookingUpdated);
    window.addEventListener('hotel:statusUpdated', handleHotelUpdated);

    return () => {
      window.removeEventListener('booking:statusUpdated', handleBookingUpdated);
      window.removeEventListener('hotel:statusUpdated', handleHotelUpdated);
    };
  }, []);

  // Sync state on tab change
  useEffect(() => {
    if (activeMenu === 'dashboard') {
      fetchAdminStats();
      fetchHotels();
      fetchCoupons();
    }
    if (activeMenu === 'hotels') fetchHotels();
    if (activeMenu === 'promotions') fetchCoupons();
    if (activeMenu === 'users') fetchUsers();
    if (activeMenu === 'bookings') fetchAllBookings();
    if (activeMenu === 'payment') fetchPayments();
    if (activeMenu === 'reviews') fetchReviews();
    if (activeMenu === 'logs') {
      fetchAiLogs();
      fetchAuditLogs();
    }
  }, [activeMenu]);

  // Refetch when filters or search change
  useEffect(() => {
    if (activeMenu === 'users') fetchUsers();
  }, [usersFilterRole]);

  useEffect(() => {
    if (activeMenu === 'bookings') fetchAllBookings();
  }, [allBookingsFilterStatus]);

  useEffect(() => {
    if (activeMenu === 'payment') fetchPayments();
  }, [paymentsFilterMethod]);

  // Debounced search fetch
  useEffect(() => {
    const delay = setTimeout(() => {
      if (activeMenu === 'users') fetchUsers();
      if (activeMenu === 'bookings') fetchAllBookings();
      if (activeMenu === 'reviews') fetchReviews();
      if (activeMenu === 'hotels') fetchHotels();
    }, 400);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  // Handle Toast helper
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  // Lock body scroll when any modal is open
  const isAnyAdminModalOpen = Boolean(rejectingHotelId || showAddCoupon || deleteConfirmId);

  useEffect(() => {
    if (isAnyAdminModalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isAnyAdminModalOpen]);

  // Status updates
  const handleApprove = async (id: string, status: 'APPROVED' | 'REJECTED') => {
    try {
      await apiClient.put(`/hotels/${id}/approve`, { status, rejectReason: status === 'REJECTED' ? rejectReason : null });
      triggerToast(`Đã ${status === 'APPROVED' ? 'duyệt' : 'từ chối'} khách sạn thành công!`);
      setRejectingHotelId(null);
      setRejectReason('');
      fetchHotels();
    } catch (err) {
      console.error(err);
      await showAlert('Không thể thực hiện phê duyệt.', { type: 'error' });
    }
  };

  const handleToggleApproveUser = async (userId: string) => {
    try {
      const res = await apiClient.put(`/auth/admin/users/${userId}/toggle-approve`);
      if (res.data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, isApproved: res.data.data.isApproved } : u));
        triggerToast('Cập nhật phê duyệt thành công!');
      }
    } catch (err) {
      console.error(err);
      await showAlert('Không thể cập nhật phê duyệt.', { type: 'error' });
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const confirmed = await showConfirm(
      'Bạn có chắc chắn muốn xóa người dùng này khỏi hệ thống? Tất cả khách sạn và dữ liệu liên quan sẽ bị xóa vĩnh viễn.',
      { title: 'Xác nhận xóa người dùng', type: 'danger', confirmText: 'Xóa vĩnh viễn' }
    );
    if (!confirmed) return;
    try {
      const res = await apiClient.delete(`/auth/admin/users/${userId}`);
      if (res.data.success) {
        setUsers(prev => prev.filter(u => u.id !== userId));
        triggerToast('Xóa người dùng thành công!');
      }
    } catch (err: any) {
      console.error(err);
      await showAlert(err.response?.data?.message || 'Không thể xóa người dùng.', { type: 'error' });
    }
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        code: newCode.toUpperCase(),
        description: newDesc,
        discountType: newType,
        discountValue: Number(newValue),
        minOrderValue: newMinOrderValue ? Number(newMinOrderValue) : 0,
        maxDiscountAmount: newMaxDiscountAmount ? Number(newMaxDiscountAmount) : null,
        startDate: new Date(newStart).toISOString(),
        endDate: new Date(newEnd).toISOString(),
        usageLimit: Number(newLimit),
        dailyUsageLimit: newDailyLimit ? Number(newDailyLimit) : null,
        targetUserType: newTargetUserType
      };

      await apiClient.post('/coupons', payload);
      triggerToast('Tạo mã giảm giá thành công!');
      setShowAddCoupon(false);
      setNewCode('');
      setNewDesc('');
      setNewValue('');
      setNewMinOrderValue('');
      setNewMaxDiscountAmount('');
      setNewLimit('');
      setNewDailyLimit('');
      setNewTargetUserType('ALL');
      setNewStart(`${new Date().toISOString().split('T')[0]}T08:00`);
      setNewEnd('');
      fetchCoupons();
    } catch (err: any) {
      console.error(err);
      await showAlert(err.response?.data?.message || 'Không thể tạo coupon.', { type: 'error' });
    }
  };

  const handleDeleteCoupon = async (id: string) => {
    try {
      await apiClient.delete(`/coupons/${id}`);
      setDeleteConfirmId(null);
      triggerToast('Xóa mã giảm giá thành công!');
      fetchCoupons();
    } catch (err: any) {
      console.error(err);
      await showAlert(err.response?.data?.message || 'Không thể xóa coupon này (có thể đã phát sinh lịch sử sử dụng).', { type: 'error' });
    }
  };

  const handleToggleCouponStatus = async (id: string) => {
    try {
      const res = await apiClient.patch(`/coupons/${id}/toggle`);
      if (res.data.success) {
        triggerToast(res.data.message || 'Cập nhật trạng thái mã thành công!');
        fetchCoupons();
      }
    } catch (err: any) {
      console.error(err);
      await showAlert(err.response?.data?.message || 'Không thể thay đổi trạng thái coupon.', { type: 'error' });
    }
  };

  // Mock list handlers for pagination and operations
  const toggleSelectAll = (list: any[]) => {
    if (selectedIds.length === list.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(list.map(item => item.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Real logout with redirect
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
      
      {/* SUCCESS TOAST */}
      {successToast && (
        <div className="fixed bottom-6 right-6 bg-emerald-500 text-white font-extrabold px-6 py-4 rounded-xl shadow-2xl z-55 flex items-center gap-3 animate-bounce">
          <CheckCircle className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}

      {/* HEADER (Height 70px) */}
      <header className="h-[70px] border-b border-[#E2E8F0] px-6 flex justify-between items-center z-40 sticky top-0 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.02)]">
        {/* Left header */}
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              setSidebarCollapsed(!sidebarCollapsed);
              setMobileSidebarOpen(!mobileSidebarOpen);
            }}
            className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-[#64748B]"
          >
            <Menu className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-black text-sm">
              CB
            </div>
            <span className="font-black tracking-wide text-md text-[#0F172A] hidden sm:inline-block">
              {language === 'vi' ? 'QUẢN TRỊ VIÊN' : 'ADMIN PANEL'}
            </span>
          </div>
        </div>

        {/* Middle Header (Global Search) */}
        <div className="hidden md:flex items-center w-96 bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-[#2563EB]/25 focus-within:border-[#2563EB] focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-[#94A3B8] mr-2" />
          <input 
            type="text" 
            placeholder={language === 'vi' ? 'Tìm kiếm nhanh hệ thống...' : 'Quick search...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-transparent border-none outline-none text-xs w-full text-[#1E293B] font-semibold placeholder-[#94A3B8]"
          />
        </div>

        {/* Right header options */}
        <div className="flex items-center gap-3.5">
          {/* Language Switch */}
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

          {/* Bell Notification */}
          <div ref={notificationsMenuRef} className="relative">
            <button 
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="p-2.5 rounded-xl hover:bg-slate-100 relative transition-colors text-[#64748B] hover:text-[#2563EB]"
            >
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-white"></span>
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-[#E2E8F0] p-4 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                  <h4 className="font-extrabold text-xs text-[#1E293B]">{language === 'vi' ? 'Thông báo mới nhất' : 'Recent Notifications'}</h4>
                  <span className="text-[9px] bg-rose-50 text-rose-500 px-1.5 py-0.5 rounded font-black">3 NEW</span>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  <div className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] space-y-1 text-[#1E293B]">
                    <p className="font-bold">Khách sạn Rex Hotel Sài Gòn đã được đăng ký</p>
                    <p className="text-[#64748B]">Đang chờ bạn phê duyệt và mở bán.</p>
                  </div>
                  <div className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] space-y-1 text-[#1E293B]">
                    <p className="font-bold">Mã giảm giá FLASH20 đã đạt giới hạn sử dụng</p>
                    <p className="text-[#64748B]">100/100 lượt áp dụng hoàn tất.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Messages */}
          <div ref={messagesMenuRef} className="relative">
            <button 
              onClick={() => setMessagesOpen(!messagesOpen)}
              className="p-2.5 rounded-xl hover:bg-slate-100 relative transition-colors text-[#64748B] hover:text-[#2563EB]"
            >
              <MessageSquare className="w-4.5 h-4.5" />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-[#2563EB] rounded-full ring-2 ring-white"></span>
            </button>

            {messagesOpen && (
              <div className="absolute right-0 mt-3 w-80 rounded-2xl border border-[#E2E8F0] p-4 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-3">
                  <h4 className="font-extrabold text-xs text-[#1E293B]">{language === 'vi' ? 'Hộp thoại phản hồi' : 'User Messages'}</h4>
                </div>
                <div className="space-y-3">
                  <div className="p-2 hover:bg-slate-50 rounded-lg cursor-pointer text-[10px] text-[#1E293B]">
                    <p className="font-bold">Nguyễn Văn A (Khách hàng)</p>
                    <p className="text-[#64748B] truncate mt-0.5">Tôi không nhận được email mã vé QR sau khi thanh toán...</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Avatar Dropdown */}
          <div ref={profileMenuRef} className="relative">
            <button 
              onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
              className="flex items-center gap-2 focus:outline-none"
            >
              <div className="w-9 h-9 rounded-xl bg-slate-55 text-[#1E293B] flex items-center justify-center font-black text-sm border border-[#CBD5E1]">
                {user?.fullName?.charAt(0) || 'A'}
              </div>
              <ChevronDown className="w-4 h-4 text-[#94A3B8]" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-3 w-48 rounded-2xl border border-[#E2E8F0] p-2 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.08)] z-55 animate-in fade-in slide-in-from-top-3 duration-200">
                <div className="px-3.5 py-2 border-b border-slate-100 mb-1">
                  <p className="text-[11px] font-black text-[#1E293B]">{user?.fullName || 'Administrator'}</p>
                  <p className="text-[9px] text-[#64748B] mt-0.5">{user?.email || 'admin@cloudbooking.com'}</p>
                </div>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold text-left text-[#334155] hover:bg-[#F8FAFC]">
                  <User className="w-3.5 h-3.5 text-[#64748B]" /> {language === 'vi' ? 'Hồ sơ của tôi' : 'My Profile'}
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold text-left text-[#334155] hover:bg-[#F8FAFC]">
                  <Key className="w-3.5 h-3.5 text-[#64748B]" /> {language === 'vi' ? 'Đổi mật khẩu' : 'Change Password'}
                </button>
                <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-bold text-left text-[#334155] hover:bg-[#F8FAFC]">
                  <Sliders className="w-3.5 h-3.5 text-[#64748B]" /> {language === 'vi' ? 'Thiết lập' : 'Settings'}
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-extrabold text-left text-rose-500 hover:bg-rose-50"
                >
                  <LogOut className="w-3.5 h-3.5" /> {language === 'vi' ? 'Đăng xuất' : 'Logout'}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* DASHBOARD LAYOUT */}
      <div className="flex-1 flex flex-col lg:flex-row relative">
        
        {/* COLLAPSIBLE SIDEBAR */}
        <aside className={`shrink-0 z-35 transition-all duration-300 lg:sticky lg:top-[70px] lg:h-[calc(100vh-70px)] ${sidebarCollapsed ? 'w-0 lg:w-20' : 'w-full lg:w-72'} bg-[#0F172A] border-r border-[#1E293B]`}>
          <div className="p-5 flex flex-col gap-1.5 h-full overflow-y-auto">
            
            {/* Category Groups */}
            <div className="space-y-6">
              
              {/* CORE */}
              <div>
                <span className={`text-[9px] font-black uppercase tracking-wider block mb-2 text-slate-400 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
                  {!sidebarCollapsed ? (language === 'vi' ? 'Hệ thống chính' : 'Core') : '••'}
                </span>
                
                <button 
                  onClick={() => setActiveMenu('dashboard')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeMenu === 'dashboard' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <BarChart3 className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Dashboard</span>}
                </button>
              </div>

              {/* PARTNERS */}
              <div>
                <span className={`text-[9px] font-black uppercase tracking-wider block mb-2 text-slate-400 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
                  {!sidebarCollapsed ? (language === 'vi' ? 'Quản lý đối tác' : 'Partnership') : '••'}
                </span>
                
                <button 
                  onClick={() => setActiveMenu('users')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeMenu === 'users' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Người dùng & Quyền' : 'Users & Roles'}</span>}
                </button>

                <button 
                  onClick={() => setActiveMenu('hotels')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${
                    activeMenu === 'hotels' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Hotel className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Khách sạn' : 'Hotels'}</span>}
                </button>

                <button 
                  onClick={() => setActiveMenu('rooms')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${
                    activeMenu === 'rooms' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Bed className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Phòng & Trạng thái' : 'Rooms & Availability'}</span>}
                </button>
              </div>

              {/* RETAIL */}
              <div>
                <span className={`text-[9px] font-black uppercase tracking-wider block mb-2 text-slate-400 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
                  {!sidebarCollapsed ? (language === 'vi' ? 'Vận hành thương mại' : 'Operations') : '••'}
                </span>

                <button 
                  onClick={() => setActiveMenu('bookings')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeMenu === 'bookings' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <CalendarRange className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Đơn đặt phòng' : 'Bookings'}</span>}
                </button>

                <button 
                  onClick={() => setActiveMenu('payment')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${
                    activeMenu === 'payment' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Giao dịch thanh toán' : 'Payments'}</span>}
                </button>

                <button 
                  onClick={() => setActiveMenu('promotions')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${
                    activeMenu === 'promotions' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Percent className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>Coupons & Khuyến mãi</span>}
                </button>
              </div>

              {/* REVIEWS & CONTENT */}
              <div>
                <span className={`text-[9px] font-black uppercase tracking-wider block mb-2 text-slate-400 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
                  {!sidebarCollapsed ? (language === 'vi' ? 'Nội dung & Phản hồi' : 'CMS & Reviews') : '••'}
                </span>

                <button 
                  onClick={() => setActiveMenu('reviews')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeMenu === 'reviews' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Star className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Đánh giá phản hồi' : 'Reviews'}</span>}
                </button>

                <button 
                  onClick={() => setActiveMenu('cms')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${
                    activeMenu === 'cms' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <FileText className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>CMS Banner & Blog</span>}
                </button>
              </div>

              {/* LOGS & SECURITY */}
              <div>
                <span className={`text-[9px] font-black uppercase tracking-wider block mb-2 text-slate-400 ${sidebarCollapsed ? 'lg:text-center' : ''}`}>
                  {!sidebarCollapsed ? (language === 'vi' ? 'Nhật ký & Hệ thống' : 'Security & Logs') : '••'}
                </span>

                <button 
                  onClick={() => setActiveMenu('logs')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    activeMenu === 'logs' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Nhật ký Audit & AI' : 'System Logs'}</span>}
                </button>

                <button 
                  onClick={() => setActiveMenu('settings')}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all mt-1 ${
                    activeMenu === 'settings' ? 'bg-[#2563EB] text-white' : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  {!sidebarCollapsed && <span>{language === 'vi' ? 'Cấu hình hệ thống' : 'System Settings'}</span>}
                </button>
              </div>
            </div>

          </div>
        </aside>

        {/* MAIN PANEL CONTENT */}
        <main className="flex-1 p-6 sm:p-8 bg-[#F8FAFC]">
          
          {/* Breadcrumbs */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-[32px] font-bold text-[#0F172A] tracking-tight uppercase">
                {activeMenu}
              </h2>
              <p className="text-[10px] text-[#64748B] font-extrabold uppercase mt-1">
                Admin Extranet &gt; {activeMenu}
              </p>
            </div>
            
            {/* Quick action bar */}
            <div className="flex items-center gap-2">
              <button className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#334155] rounded-xl shadow-sm transition-all">
                <RefreshCw className="w-4 h-4 animate-spin-hover" />
              </button>
              <button className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#334155] rounded-xl shadow-sm transition-all">
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* DYNAMIC TAB COMPONENT SWITCH */}
          {activeMenu === 'dashboard' && (
            <div className="space-y-6">
              
              {/* 8 STATISTIC CARDS */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* CARD 1: Total Hotels */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Tổng khách sạn</span>
                    <p className="text-2xl font-bold text-[#0F172A]">{stats.totalHotels}</p>
                  </div>
                  <div className="p-3 bg-[#EFF6FF] text-[#2563EB] rounded-xl"><Hotel className="w-5 h-5" /></div>
                </div>

                {/* CARD 2: Total Rooms */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Tổng số phòng</span>
                    <p className="text-2xl font-bold text-[#0F172A]">{stats.totalRooms}</p>
                  </div>
                  <div className="p-3 bg-[#E8F5E9] text-[#2E7D32] rounded-xl"><Bed className="w-5 h-5" /></div>
                </div>

                {/* CARD 3: Total Owners */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Chủ khách sạn</span>
                    <p className="text-2xl font-bold text-[#0F172A]">{stats.totalOwners}</p>
                  </div>
                  <div className="p-3 bg-[#FFF8E1] text-[#F57F17] rounded-xl"><Users className="w-5 h-5" /></div>
                </div>

                {/* CARD 4: Total Customers */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Khách hàng du lịch</span>
                    <p className="text-2xl font-bold text-[#0F172A]">{stats.totalCustomers}</p>
                  </div>
                  <div className="p-3 bg-[#F3E5F5] text-[#7B1FA2] rounded-xl"><Users className="w-5 h-5" /></div>
                </div>

                {/* CARD 5: Today's Bookings */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Đơn đặt hôm nay</span>
                    <p className="text-2xl font-bold text-[#0F172A]">{stats.todayBookings}</p>
                  </div>
                  <div className="p-3 bg-[#FFEBEE] text-[#C62828] rounded-xl"><CalendarRange className="w-5 h-5" /></div>
                </div>

                {/* CARD 6: Monthly Bookings */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Đơn đặt trong tháng</span>
                    <p className="text-2xl font-bold text-[#0F172A]">{stats.monthlyBookings}</p>
                  </div>
                  <div className="p-3 bg-[#E0F7FA] text-[#00838F] rounded-xl"><CalendarRange className="w-5 h-5" /></div>
                </div>

                {/* CARD 7: Revenue Today */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Doanh thu hôm nay</span>
                    <p className="text-xl font-black text-[#166534]">{stats.revenueToday.toLocaleString('vi-VN')} đ</p>
                  </div>
                  <div className="p-3 bg-[#E8F5E9] text-[#2E7D32] rounded-xl"><CreditCard className="w-5 h-5" /></div>
                </div>

                {/* CARD 8: Revenue Month */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl flex items-center justify-between">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-[#64748B] uppercase tracking-wide">Doanh thu tháng này</span>
                    <p className="text-xl font-black text-[#1D4ED8]">{stats.revenueMonth.toLocaleString('vi-VN')} đ</p>
                  </div>
                  <div className="p-3 bg-[#E8EAF6] text-[#1A237E] rounded-xl"><CreditCard className="w-5 h-5" /></div>
                </div>

              </div>

              {/* CHARTS CONTAINER */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* 1. Main Revenue Area Chart */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl lg:col-span-2">
                  <h3 className="font-bold text-xs text-[#1E293B] mb-4 uppercase tracking-wide">
                    {language === 'vi' ? 'Biểu đồ doanh thu & đặt phòng tuần qua' : 'Weekly Revenue & Bookings'}
                  </h3>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                        <XAxis dataKey="name" fontSize={10} stroke="#94a3b8" />
                        <YAxis fontSize={10} stroke="#94a3b8" />
                        <Tooltip />
                        <Area type="monotone" dataKey="Doanh thu" stroke="#2563EB" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* 2. Payment Methods Pie Chart */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl">
                  <h3 className="font-bold text-xs text-[#1E293B] mb-4 uppercase tracking-wide">
                    {language === 'vi' ? 'Phương thức thanh toán' : 'Payment Methods Distribution'}
                  </h3>
                  <div className="h-60 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {pieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Legend tags */}
                  <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] font-bold text-[#64748B]">
                    {pieData.map((entry, index) => (
                      <div key={index} className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                        <span>{entry.name} ({entry.value}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* SUMMARY TABLES GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Table 1: Pending Hotel Approvals */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xs text-[#1E293B] uppercase">
                      {language === 'vi' ? 'Yêu cầu duyệt đối tác mới' : 'Pending Hotel Approvals'}
                    </h3>
                    <button onClick={() => setActiveMenu('hotels')} className="text-[10px] font-black text-[#2563EB] hover:underline uppercase">View All</button>
                  </div>
                  
                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table className="min-w-full text-xs font-semibold text-[#64748B] text-left">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-[#475569]">
                        <tr>
                          <th className="px-3 py-2">Khách sạn</th>
                          <th className="px-3 py-2">Chủ sở hữu</th>
                          <th className="px-3 py-2">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                        {hotels.filter(h => h.status === 'PENDING').slice(0, 3).map((hotel, idx) => (
                          <tr key={hotel.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                            <td className="px-3 py-3">
                              <p className="font-bold text-[#1E293B]">{hotel.name}</p>
                              <p className="text-[9px] text-[#64748B]">{hotel.address}</p>
                            </td>
                            <td className="px-3 py-3 text-[#64748B]">{hotel.owner?.fullName || 'N/A'}</td>
                            <td className="px-3 py-3">
                              <div className="flex gap-1.5">
                                <button onClick={() => handleApprove(hotel.id, 'APPROVED')} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[9px] px-2.5 py-1.5 rounded-xl shadow-sm">Duyệt</button>
                                <button onClick={() => setRejectingHotelId(hotel.id)} className="bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] font-bold text-[9px] px-2.5 py-1.5 rounded-xl transition-all">Từ chối</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {hotels.filter(h => h.status === 'PENDING').length === 0 && (
                          <tr>
                            <td colSpan={3} className="text-center py-6 text-[#64748B] font-bold bg-white">Không có yêu cầu duyệt nào</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 2: Latest Bookings */}
                <div className="p-5 bg-white border border-[#E2E8F0] shadow-[0_4px_12px_rgba(15,23,42,0.04)] rounded-2xl">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-xs text-[#1E293B] uppercase">
                      {language === 'vi' ? 'Đơn đặt phòng gần đây' : 'Latest Bookings'}
                    </h3>
                    <button onClick={() => setActiveMenu('bookings')} className="text-[10px] font-black text-[#2563EB] hover:underline uppercase">View All</button>
                  </div>

                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table className="min-w-full text-xs font-semibold text-[#64748B] text-left">
                      <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-[10px] uppercase font-bold text-[#475569]">
                        <tr>
                          <th className="px-3 py-2">Khách hàng</th>
                          <th className="px-3 py-2">Giá trị</th>
                          <th className="px-3 py-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                        {recentBookings.length > 0 ? recentBookings.map((rb: any, idx: number) => {
                          const statusColors: Record<string, string> = {
                            PENDING: 'bg-[#FEF3C7] text-[#92400E]',
                            PAYMENT_PROCESSING: 'bg-[#DBEAFE] text-[#1D4ED8]',
                            CONFIRMED: 'bg-[#DCFCE7] text-[#166534]',
                            CHECKED_IN: 'bg-[#DBEAFE] text-[#1D4ED8]',
                            CHECKED_OUT: 'bg-[#EDE9FE] text-[#6D28D9]',
                            COMPLETED: 'bg-[#DCFCE7] text-[#166534]',
                            CANCELLED: 'bg-[#FEE2E2] text-[#DC2626]',
                          };
                          return (
                            <tr key={rb.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                              <td className="px-3 py-3">
                                <p className="font-bold text-[#1E293B]">{rb.guestName}</p>
                                <p className="text-[9px] text-[#64748B]">{rb.hotelName} ({rb.checkInDate})</p>
                              </td>
                              <td className="px-3 py-3 font-bold text-[#0F172A]">{rb.finalPrice.toLocaleString('vi-VN')} đ</td>
                              <td className="px-3 py-3">
                                <span className={`${statusColors[rb.status] || 'bg-slate-100 text-slate-600'} text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase`}>{rb.status}</span>
                              </td>
                            </tr>
                          );
                        }) : (
                          <tr>
                            <td colSpan={3} className="text-center py-6 text-[#64748B] font-bold bg-white">Chưa có đơn đặt phòng nào</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* HOTEL MANAGEMENT TAB */}
          {activeMenu === 'hotels' && (
            <div className="space-y-4">
              
              {/* Toolbar */}
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3.5">
                <div className="flex gap-2">
                  <button className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> {language === 'vi' ? 'Thêm khách sạn' : 'Add Hotel'}
                  </button>
                  <button className="bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm">
                    <Upload className="w-4 h-4" /> Import
                  </button>
                  <button className="bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm">
                    <Download className="w-4 h-4" /> Export
                  </button>
                </div>
                <button onClick={fetchHotels} className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#334155] rounded-xl shadow-sm transition-all"><RefreshCw className="w-4 h-4" /></button>
              </div>

              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input 
                  type="text" 
                  placeholder={language === 'vi' ? 'Tìm theo tên, địa chỉ...' : 'Search by name, address...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl px-4 py-2 text-xs font-semibold outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                />
                
                <div>
                  <CustomSelect
                    value={statusFilter}
                    onChange={(val) => setStatusFilter(val)}
                    options={[
                      { value: 'ALL', label: 'Tất cả trạng thái' },
                      { value: 'PENDING', label: 'PENDING (Chờ duyệt)', icon: '⏳' },
                      { value: 'APPROVED', label: 'APPROVED (Đã duyệt)', icon: '✅' },
                      { value: 'REJECTED', label: 'REJECTED (Từ chối)', icon: '❌' },
                    ]}
                  />
                </div>
              </div>

              {/* Hotel list table */}
              {hotelsLoading ? (
                <div className="h-64 bg-[#F8FAFC] rounded-2xl animate-pulse"></div>
              ) : (
                <div className="overflow-x-auto border border-[#E2E8F0] rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-semibold text-[#64748B] text-left">
                    <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-[#475569]">
                      <tr>
                        <th className="px-4 py-3"><input type="checkbox" onChange={() => toggleSelectAll(hotels)} checked={selectedIds.length === hotels.length} /></th>
                        <th className="px-4 py-3">Khách sạn</th>
                        <th className="px-4 py-3">Chủ sở hữu</th>
                        <th className="px-4 py-3">Sao</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                      {hotels.filter(h => {
                        const matchSearch = h.name.toLowerCase().includes(searchTerm.toLowerCase()) || h.address.toLowerCase().includes(searchTerm.toLowerCase());
                        const matchStatus = statusFilter === 'ALL' || h.status === statusFilter;
                        return matchSearch && matchStatus;
                      }).map((hotel, idx) => (
                        <tr key={hotel.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                          <td className="px-4 py-4"><input type="checkbox" checked={selectedIds.includes(hotel.id)} onChange={() => toggleSelect(hotel.id)} /></td>
                          <td className="px-4 py-4">
                            <p className="font-bold text-[#1E293B]">{hotel.name}</p>
                            <p className="text-[10px] text-[#64748B]">{hotel.address}</p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold text-[#1E293B]">{hotel.owner?.fullName || 'Chưa gán'}</p>
                            <p className="text-[10px] text-[#64748B]">{hotel.owner?.email}</p>
                          </td>
                          <td className="px-4 py-4 text-amber-500 font-extrabold">{'★'.repeat(hotel.starRating)}</td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                              hotel.status === 'APPROVED' ? 'bg-[#DCFCE7] text-[#166534]' :
                              hotel.status === 'PENDING' ? 'bg-[#FEF3C7] text-[#92400E]' : 'bg-[#FEE2E2] text-[#DC2626]'
                            }`}>
                              {hotel.status}
                            </span>
                          </td>
                          <td className="px-4 py-4 flex gap-1.5 flex-wrap">
                            {hotel.status !== 'APPROVED' && (
                              <button onClick={() => handleApprove(hotel.id, 'APPROVED')} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-[9px] px-2.5 py-1.5 rounded-xl shadow-sm">Duyệt bán</button>
                            )}
                            {hotel.status !== 'REJECTED' && (
                              <button onClick={() => setRejectingHotelId(hotel.id)} className="bg-[#FEE2E2] hover:bg-[#FECACA] text-[#DC2626] font-bold text-[9px] px-2.5 py-1.5 rounded-xl transition-all">Từ chối</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* PROMOTIONS (COUPONS) TAB */}
          {activeMenu === 'promotions' && (
            <div className="space-y-4">
              
              {/* Toolbar */}
              <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3.5">
                <div className="flex gap-2">
                  <button onClick={() => setShowAddCoupon(true)} className="bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
                    <Plus className="w-4 h-4" /> {language === 'vi' ? 'Tạo Coupon mới' : 'Add Coupon'}
                  </button>
                  <button className="bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] font-bold text-xs px-3.5 py-2.5 rounded-xl transition-all flex items-center gap-1.5 shadow-sm">
                    <Download className="w-4 h-4" /> Export
                  </button>
                </div>
                <button onClick={fetchCoupons} className="p-2.5 bg-white border border-[#CBD5E1] hover:bg-[#F8FAFC] text-[#334155] rounded-xl shadow-sm transition-all"><RefreshCw className="w-4 h-4" /></button>
              </div>

              {/* Filters */}
              <div className="w-72">
                <input 
                  type="text" 
                  placeholder={language === 'vi' ? 'Nhập mã coupon cần tìm...' : 'Search coupon code...'}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl px-4 py-2 text-xs font-semibold outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all"
                />
              </div>

              {/* Coupons list table */}
              {couponsLoading ? (
                <div className="h-64 bg-[#F8FAFC] rounded-2xl animate-pulse"></div>
              ) : (
                <div className="overflow-x-auto border border-[#E2E8F0] rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-semibold text-[#64748B] text-left">
                    <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-[#475569]">
                      <tr>
                        <th className="px-4 py-3">Mã giảm giá</th>
                        <th className="px-4 py-3">Mô tả</th>
                        <th className="px-4 py-3">Loại giảm</th>
                        <th className="px-4 py-3">Giá trị</th>
                        <th className="px-4 py-3">Lượt dùng</th>
                        <th className="px-4 py-3">Hạn dùng</th>
                        <th className="px-4 py-3">Trạng thái</th>
                        <th className="px-4 py-3">Hành động</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                      {coupons.filter(c => c.code.toLowerCase().includes(searchTerm.toLowerCase())).map((coupon, idx) => (
                        <tr key={coupon.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                          <td className="px-4 py-4 font-black text-[#1E293B]">{coupon.code}</td>
                          <td className="px-4 py-4 text-[#64748B]">{coupon.description}</td>
                          <td className="px-4 py-4">{coupon.discountType === 'PERCENTAGE' ? 'Phần trăm (%)' : 'Giá trị cố định (đ)'}</td>
                          <td className="px-4 py-4 font-extrabold text-[#0F172A]">{coupon.discountValue.toLocaleString()}</td>
                          <td className="px-4 py-4 text-[#64748B]">{coupon.usedCount} / {coupon.usageLimit}</td>
                          <td className="px-4 py-4 text-[#64748B]">{formatDateVN(coupon.endDate)}</td>
                          <td className="px-4 py-4">
                            <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                              coupon.isActive ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-slate-100 text-slate-500'
                            }`}>
                              {coupon.isActive ? 'Hoạt động' : 'Tạm khóa'}
                            </span>
                          </td>
                          <td className="px-4 py-4 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleCouponStatus(coupon.id)}
                              className={`text-[9px] font-extrabold px-2.5 py-1.5 rounded-xl transition-all shadow-sm ${
                                coupon.isActive
                                  ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                                  : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                              }`}
                            >
                              {coupon.isActive ? 'Khóa mã' : 'Mở khóa'}
                            </button>
                            <button onClick={() => setDeleteConfirmId(coupon.id)} className="text-[#DC2626] bg-[#FEE2E2] hover:bg-[#FECACA] p-2 rounded-xl transition-all shadow-sm"><Trash2 className="w-4 h-4" /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>
          )}

          {/* LOGS MANAGEMENT TAB */}
          {activeMenu === 'logs' && (
            <div className="space-y-6">
              
              {/* AI Query Logs */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-[#1E293B] uppercase">Nhật ký truy vấn AI Chatbox</h3>
                {aiLoading ? (
                  <div className="h-40 bg-[#F8FAFC] rounded-2xl animate-pulse"></div>
                ) : (
                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                    <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-semibold text-[#64748B] text-left">
                      <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-[#475569]">
                        <tr>
                          <th className="px-4 py-3">Câu truy vấn gốc</th>
                          <th className="px-4 py-3">Kết quả JSON</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3">Thời gian xử lý</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                        {aiLogs.map((log, idx) => (
                          <tr key={log.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                            <td className="px-4 py-4 font-bold text-[#1E293B]">"{log.queryText}"</td>
                            <td className="px-4 py-4 font-mono text-[9px] max-w-xs truncate text-[#64748B]">{JSON.stringify(log.parsedQuery)}</td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${log.isSuccess ? 'bg-[#DCFCE7] text-[#166534]' : 'bg-[#FEE2E2] text-[#DC2626]'}`}>
                                {log.isSuccess ? 'SUCCESS' : 'NO_MATCH'}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-bold text-[#2563EB]">{log.executionMs} ms</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Audit Logs */}
              <div className="space-y-4">
                <h3 className="font-bold text-sm text-[#1E293B] uppercase">Nhật ký Audit Logs tác động</h3>
                {auditLoading ? (
                  <div className="h-40 bg-[#F8FAFC] rounded-2xl animate-pulse"></div>
                ) : (
                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                    <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-semibold text-[#64748B] text-left">
                      <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-[#475569]">
                        <tr>
                          <th className="px-4 py-3">Hành động</th>
                          <th className="px-4 py-3">Bảng tác động</th>
                          <th className="px-4 py-3">Thời gian</th>
                          <th className="px-4 py-3">Người thực hiện</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                        {auditLogs.map((log, idx) => (
                          <tr key={log.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                            <td className="px-4 py-4">
                              <span className="bg-[#DBEAFE] text-[#1D4ED8] px-2 py-0.5 rounded font-black text-[8px] uppercase">{log.action}</span>
                            </td>
                            <td className="px-4 py-4 text-[#64748B]">{log.entityName}</td>
                            <td className="px-4 py-4 text-[#64748B]">{formatDateTimeVN(log.createdAt)}</td>
                            <td className="px-4 py-4">
                              <p className="font-bold text-[#1E293B]">{log.user?.fullName}</p>
                              <p className="text-[9px] text-[#64748B]">{log.user?.email}</p>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

            </div>
          )}

            {/* 6. USERS MANAGEMENT */}
            {activeMenu === 'users' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#E2E8F0]">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm text-[#1E293B] uppercase">Quản lý người dùng ({users.length})</h3>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto min-w-[200px]">
                    <CustomSelect
                      value={usersFilterRole}
                      onChange={(val) => setUsersFilterRole(val)}
                      options={[
                        { value: 'ALL', label: 'Tất cả vai trò' },
                        { value: 'CUSTOMER', label: 'Khách hàng', icon: '👤' },
                        { value: 'HOTEL_OWNER', label: 'Chủ khách sạn', icon: '🏨' },
                        { value: 'ADMIN', label: 'Quản trị viên', icon: '🛡️' },
                      ]}
                    />
                  </div>
                </div>

                {usersLoading ? (
                  <div className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
                ) : (
                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                    <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-semibold text-[#64748B] text-left">
                      <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-[#475569]">
                        <tr>
                          <th className="px-4 py-3">Người dùng</th>
                          <th className="px-4 py-3">Vai trò</th>
                          <th className="px-4 py-3">Xác thực</th>
                          <th className="px-4 py-3">Xét duyệt</th>
                          <th className="px-4 py-3">Số lượng sở hữu</th>
                          <th className="px-4 py-3">Ngày đăng ký</th>
                          <th className="px-4 py-3 text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                        {users.map((item, idx) => (
                          <tr key={item.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                            <td className="px-4 py-4 flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-600 text-xs">
                                {item.avatarUrl ? (
                                  <img src={item.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                  item.fullName.charAt(0).toUpperCase()
                                )}
                              </div>
                              <div>
                                <p className="font-extrabold text-[#1E293B]">{item.fullName}</p>
                                <p className="text-[10px] text-[#64748B]">{item.email}</p>
                                {item.phoneNumber && <p className="text-[10px] text-[#64748B]">{item.phoneNumber}</p>}
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                                item.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                                item.role === 'HOTEL_OWNER' ? 'bg-emerald-100 text-emerald-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {item.role}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                                item.isVerified ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {item.isVerified ? 'Đã xác thực' : 'Chưa xác thực'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              {item.role === 'HOTEL_OWNER' ? (
                                <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                                  item.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-850 animate-pulse'
                                }`}>
                                  {item.isApproved ? 'Đã phê duyệt' : 'Chờ phê duyệt'}
                                </span>
                              ) : item.role === 'CUSTOMER' ? (
                                <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                                  item.isApproved ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-850'
                                }`}>
                                  {item.isApproved ? 'Hoạt động' : 'Tạm dừng'}
                                </span>
                              ) : (
                                <span className="text-slate-400 text-[10px]">-</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-[#64748B]">
                              {item.role === 'HOTEL_OWNER' ? (
                                <span>{item._count?.hotels || 0} Khách sạn</span>
                              ) : (
                                <span>{item._count?.bookings || 0} Đơn đặt</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-[#64748B]">
                              {formatDateVN(item.createdAt)}
                            </td>
                            <td className="px-4 py-4 text-center">
                              {item.role !== 'ADMIN' ? (
                                <div className="flex justify-center items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleApproveUser(item.id)}
                                    className={`text-[9px] font-black px-2 py-1 rounded-lg transition-all shadow-sm active:scale-95 border min-w-[70px] ${
                                      item.isApproved 
                                        ? 'bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-100'
                                        : 'bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-100'
                                    }`}
                                  >
                                    {item.isApproved ? 'Tạm dừng' : 'Kích hoạt'}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteUser(item.id)}
                                    className="text-[9px] font-black px-2 py-1 rounded-lg transition-all shadow-sm active:scale-95 bg-rose-50 text-[#DC2626] border border-rose-200 hover:bg-rose-100"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              ) : (
                                <span className="text-slate-400 text-[10px]">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 7. BOOKINGS SYSTEM */}
            {activeMenu === 'bookings' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#E2E8F0]">
                  <h3 className="font-bold text-sm text-[#1E293B] uppercase">Tất cả đơn đặt phòng hệ thống ({allBookings.length})</h3>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select
                      value={allBookingsFilterStatus}
                      onChange={(e) => setAllBookingsFilterStatus(e.target.value)}
                      className="bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl px-4 py-2 text-xs outline-none font-semibold focus:border-[#2563EB] transition-all"
                    >
                      <option value="ALL">Tất cả trạng thái</option>
                      <option value="PENDING">PENDING (Chờ)</option>
                      <option value="CONFIRMED">CONFIRMED (Xác nhận)</option>
                      <option value="CHECKED_IN">CHECKED_IN (Đang ở)</option>
                      <option value="CHECKED_OUT">CHECKED_OUT (Đã đi)</option>
                      <option value="CANCELLED">CANCELLED (Đã hủy)</option>
                    </select>
                  </div>
                </div>

                {allBookingsLoading ? (
                  <div className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
                ) : (
                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                    <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-semibold text-[#64748B] text-left">
                      <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-[#475569]">
                        <tr>
                          <th className="px-4 py-3">Khách hàng</th>
                          <th className="px-4 py-3">Khách sạn / Loại phòng</th>
                          <th className="px-4 py-3">Thời gian lưu trú</th>
                          <th className="px-4 py-3">Thanh toán</th>
                          <th className="px-4 py-3">Giá tiền</th>
                          <th className="px-4 py-3">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                        {allBookings.map((b, idx) => (
                          <tr key={b.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                            <td className="px-4 py-4">
                              <p className="font-extrabold text-[#1E293B]">{b.guestName}</p>
                              <p className="text-[10px] text-[#64748B]">{b.guestEmail}</p>
                              <p className="text-[10px] text-[#64748B]">{b.guestPhone}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-bold text-[#2563EB]">{b.hotelName}</p>
                              <p className="text-[10px] text-[#64748B]">{b.roomTypeName}</p>
                            </td>
                            <td className="px-4 py-4 text-[#64748B]">
                              <p>{b.checkInDate} / {b.checkOutDate}</p>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-bold text-[#1E293B]">{b.paymentMethod}</p>
                              <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                                b.paymentStatus === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {b.paymentStatus}
                              </span>
                            </td>
                            <td className="px-4 py-4 font-black text-[#0F172A]">
                              {b.finalPrice.toLocaleString()} đ
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                                b.status === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-800' :
                                b.status === 'CHECKED_IN' ? 'bg-blue-100 text-blue-800' :
                                b.status === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                                b.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                                'bg-slate-100 text-slate-800'
                              }`}>
                                {b.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 8. PAYMENTS TRANSACTIONS */}
            {activeMenu === 'payment' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-[#E2E8F0]">
                  <h3 className="font-bold text-sm text-[#1E293B] uppercase">Lịch sử thanh toán hệ thống ({allPayments.length})</h3>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <select
                      value={paymentsFilterMethod}
                      onChange={(e) => setPaymentsFilterMethod(e.target.value)}
                      className="bg-white border border-[#CBD5E1] text-[#1E293B] rounded-xl px-4 py-2 text-xs outline-none font-semibold focus:border-[#2563EB] transition-all"
                    >
                      <option value="ALL">Tất cả phương thức</option>
                      <option value="VNPAY">VNPAY</option>
                      <option value="CASH">Tiền mặt (Trực tiếp)</option>
                    </select>
                  </div>
                </div>

                {allPaymentsLoading ? (
                  <div className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
                ) : (
                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-2xl bg-white shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                    <table className="min-w-full divide-y divide-[#E2E8F0] text-xs font-semibold text-[#64748B] text-left">
                      <thead className="bg-[#F8FAFC] text-[10px] uppercase font-bold text-[#475569]">
                        <tr>
                          <th className="px-4 py-3">Mã GD / Tham chiếu</th>
                          <th className="px-4 py-3">Khách hàng</th>
                          <th className="px-4 py-3">Khách sạn</th>
                          <th className="px-4 py-3">Số tiền</th>
                          <th className="px-4 py-3">Phương thức</th>
                          <th className="px-4 py-3">Trạng thái</th>
                          <th className="px-4 py-3">Thời gian GD</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0] bg-white text-[#1E293B]">
                        {allPayments.map((p, idx) => (
                          <tr key={p.id} className={`${idx % 2 === 1 ? 'bg-[#FAFAFA]' : 'bg-white'} hover:bg-[#EFF6FF] transition-colors`}>
                            <td className="px-4 py-4">
                              <span className="font-mono text-[#0F172A] font-extrabold text-[10px]">{p.transactionId}</span>
                            </td>
                            <td className="px-4 py-4">
                              <p className="font-extrabold text-[#1E293B]">{p.guestName}</p>
                              <p className="text-[10px] text-[#64748B]">{p.guestEmail}</p>
                            </td>
                            <td className="px-4 py-4 text-[#64748B] font-bold">
                              {p.hotelName}
                            </td>
                            <td className="px-4 py-4 font-black text-[#0F172A]">
                              {p.amount.toLocaleString()} đ
                            </td>
                            <td className="px-4 py-4 text-[#64748B]">
                              {p.method}
                            </td>
                            <td className="px-4 py-4">
                              <span className={`px-2 py-0.5 rounded font-black text-[9px] uppercase ${
                                p.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-[#64748B]">
                              {formatDateTimeVN(p.createdAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* 9. REVIEWS MANAGEMENT */}
            {activeMenu === 'reviews' && (
              <div className="space-y-4">
                <div className="flex justify-between items-center pb-3 border-b border-[#E2E8F0]">
                  <h3 className="font-bold text-sm text-[#1E293B] uppercase">Phản hồi & Đánh giá của khách hàng ({allReviews.length})</h3>
                </div>

                {allReviewsLoading ? (
                  <div className="h-64 bg-slate-100 animate-pulse rounded-2xl"></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {allReviews.map((r) => (
                      <div key={r.id} className="p-4 bg-white border border-[#E2E8F0] shadow-sm rounded-2xl space-y-3">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center font-bold text-slate-605 text-xs">
                              {r.avatarUrl ? (
                                <img src={r.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                              ) : (
                                r.guestName.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <p className="font-extrabold text-[#1E293B] text-xs">{r.guestName}</p>
                              <p className="text-[10px] text-[#64748B]">{r.guestEmail}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-lg border border-amber-200 text-xs font-black">
                            <Star className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />
                            <span>{(r.ratingOverall <= 5 ? r.ratingOverall * 2 : r.ratingOverall).toFixed(1)} / 10</span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-50">
                          <span className="text-[9px] uppercase font-black text-[#2563EB]">{r.hotelName}</span>
                          <p className="text-xs text-[#475569] font-medium leading-relaxed mt-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                            "{r.comment}"
                          </p>
                          <p className="text-[8px] text-[#94A3B8] font-bold mt-2">Gửi ngày: {formatDateTimeVN(r.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* OTHER MOCKED TABS FOR COMPLETE WORKFLOW PREVIEW */}
            {['rooms', 'cms', 'reports', 'settings'].includes(activeMenu) && (
            <div className="p-8 border border-dashed border-[#CBD5E1] rounded-2xl text-center space-y-3 bg-white shadow-sm">
              <Sliders className="w-12 h-12 text-[#2563EB] mx-auto animate-pulse" />
              <h3 className="text-sm font-bold uppercase text-[#1E293B]">
                Giao diện quản lý {activeMenu} đang được thiết lập kết nối
              </h3>
              <p className="text-xs text-[#64748B] max-w-sm mx-auto leading-relaxed">
                Bản nâng cấp full-width UI của tab này đã sẵn sàng. Giao diện CRUD chuẩn và các trường dữ liệu hiển thị đã sẵn sàng liên kết với các thực thể trong Prisma.
              </p>
            </div>
          )}

        </main>
      </div>

      {/* FOOTER */}
      <footer className="h-12 border-t border-[#E2E8F0] px-6 flex justify-between items-center text-[10px] font-bold text-[#64748B] bg-white">
        <span>© 2026 CloudBooking Admin Extranet. All rights reserved.</span>
        <div className="flex gap-4">
          <span>Version: 2.1.0</span>
          <span>Env: <span className="text-emerald-600">Production</span></span>
          <span>Server status: <span className="text-emerald-600">● Online</span></span>
        </div>
      </footer>

      {/* REJECT MODAL */}
      {rejectingHotelId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-2xl w-full max-w-sm space-y-4 text-[#1E293B]">
            <h3 className="font-bold text-[#0F172A] text-sm">Lý do từ chối khách sạn</h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Nhập lý do chi tiết..."
              rows={3}
              className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold text-[#1E293B] placeholder-[#94A3B8]"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setRejectingHotelId(null);
                  setRejectReason('');
                }}
                className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Hủy bỏ
              </button>
              <button
                onClick={() => handleApprove(rejectingHotelId, 'REJECTED')}
                disabled={!rejectReason.trim()}
                className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-slate-200 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Từ chối duyệt
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddCoupon && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <form onSubmit={handleCreateCoupon} className="bg-white border border-[#E2E8F0] p-6 rounded-3xl shadow-2xl w-full max-w-2xl lg:max-w-3xl space-y-4 text-[#1E293B] animate-in fade-in zoom-in-95 duration-150 max-h-[88vh] flex flex-col">
            <div className="flex justify-between items-center border-b border-[#E2E8F0] pb-3 shrink-0">
              <div>
                <h3 className="font-extrabold text-[#0F172A] text-base">Tạo Mã Giảm Giá Toàn Sàn</h3>
                <p className="text-[10px] text-[#64748B] font-semibold mt-0.5">Điền đầy đủ thông tin để phát hành Voucher trên hệ thống</p>
              </div>
              <span className="text-xl">🏷️</span>
            </div>
            
            <div className="space-y-4 text-xs font-semibold overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Mã giảm giá (In hoa) *</label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    placeholder="VD: BANMAI2026"
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-black text-[#1E293B] tracking-wider placeholder-[#94A3B8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Lượt dùng tối đa *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    placeholder="VD: 100"
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold text-[#1E293B] placeholder-[#94A3B8]"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Mô tả chương trình ưu đãi *</label>
                <input
                  type="text"
                  required
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="VD: Giảm 20% tối đa 200k cho mọi đơn đặt phòng"
                  className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold text-[#1E293B] placeholder-[#94A3B8]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Loại chiết khấu *</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value as any)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none text-[#1E293B] font-bold cursor-pointer"
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
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder={newType === 'PERCENTAGE' ? 'VD: 20 (%)' : 'VD: 100000 (đ)'}
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-black text-[#2563EB] placeholder-[#94A3B8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Đơn tối thiểu (đ)</label>
                  <input
                    type="number"
                    min="0"
                    value={newMinOrderValue}
                    onChange={(e) => setNewMinOrderValue(e.target.value)}
                    placeholder="VD: 300000 (0 = Mọi đơn)"
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#2563EB] transition-all font-semibold text-[#1E293B] placeholder-[#94A3B8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Giảm tối đa (đ)</label>
                  <input
                    type="number"
                    min="0"
                    disabled={newType !== 'PERCENTAGE'}
                    value={newMaxDiscountAmount}
                    onChange={(e) => setNewMaxDiscountAmount(e.target.value)}
                    placeholder={newType === 'PERCENTAGE' ? 'VD: 200000' : 'Chỉ áp dụng với %'}
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#2563EB] transition-all font-semibold text-[#1E293B] disabled:bg-slate-100 disabled:text-slate-400 placeholder-[#94A3B8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Đối tượng *</label>
                  <select
                    value={newTargetUserType}
                    onChange={(e) => setNewTargetUserType(e.target.value as any)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none text-[#1E293B] font-bold cursor-pointer"
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
                    value={newLimit}
                    onChange={(e) => setNewLimit(e.target.value)}
                    placeholder="VD: 100"
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20 transition-all font-semibold text-[#1E293B] placeholder-[#94A3B8]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Giới hạn/Ngày</label>
                  <input
                    type="number"
                    min="1"
                    value={newDailyLimit}
                    onChange={(e) => setNewDailyLimit(e.target.value)}
                    placeholder="VD: 10 (Để trống = ∞)"
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none focus:border-[#2563EB] transition-all font-semibold text-[#1E293B] placeholder-[#94A3B8]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Thời gian bắt đầu (Ngày & Giờ) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newStart}
                    onChange={(e) => setNewStart(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none text-[#1E293B] font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-[#64748B] uppercase">Thời gian kết thúc (Ngày & Giờ) *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newEnd}
                    onChange={(e) => setNewEnd(e.target.value)}
                    className="w-full bg-white border border-[#CBD5E1] rounded-xl p-2.5 text-xs focus:outline-none text-[#1E293B] font-semibold"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-3 border-t border-[#E2E8F0]">
              <button
                type="button"
                onClick={() => setShowAddCoupon(false)}
                className="px-4 py-2.5 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 bg-[#2563EB] hover:bg-[#1D4ED8] text-white rounded-xl text-xs font-extrabold transition-all shadow-md active:scale-95"
              >
                Phát hành Mã
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DELETE CONFIRM MODAL */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-2xl w-full max-w-sm space-y-4 text-[#1E293B] text-center">
            <ShieldAlert className="w-12 h-12 text-[#DC2626] mx-auto animate-bounce" />
            <h3 className="font-bold text-sm text-[#0F172A]">Xác nhận xóa bản ghi?</h3>
            <p className="text-xs text-[#64748B]">Hành động này sẽ xóa vĩnh viễn dữ liệu coupon này. Bạn có chắc chắn không?</p>
            <div className="flex gap-2 justify-center pt-2">
              <button onClick={() => setDeleteConfirmId(null)} className="px-4 py-2 bg-white border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] rounded-xl text-xs font-bold transition-all shadow-sm">Hủy bỏ</button>
              <button onClick={() => handleDeleteCoupon(deleteConfirmId)} className="px-4 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-xl text-xs font-bold transition-all shadow-sm">Xác nhận xóa</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminDashboard;
