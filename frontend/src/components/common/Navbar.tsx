import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '../../store';
import { clearAuth } from '../../store/slices/authSlice';
import { setLanguage, setCurrency } from '../../store/slices/settingsSlice';
import type { CurrencyType } from '../../store/slices/settingsSlice';
import apiClient from '../../core/api/client';
import { User, LogOut, Calendar, Shield, LayoutDashboard, Sparkles, Menu, X, ChevronDown, Heart } from 'lucide-react';

const navTranslations = {
  vi: {
    listProperty: 'Đặt chỗ nghỉ của quý vị',
    login: 'Đăng nhập',
    register: 'Đăng ký',
    profile: 'Trang cá nhân',
    history: 'Lịch sử đặt phòng',
    wishlist: 'Danh sách yêu thích',
    ownerDash: 'Bảng điều khiển Owner',
    adminDash: 'Trang quản trị Admin',
    logout: 'Đăng xuất',
    settings: 'Cài đặt',
    lang: 'Ngôn ngữ',
    curr: 'Tiền tệ',
    customer: 'Khách hàng',
    owner: 'Chủ khách sạn',
    admin: 'Quản trị viên',
    loginAs: 'Đăng nhập với vai trò'
  },
  en: {
    listProperty: 'List your property',
    login: 'Sign in',
    register: 'Register',
    profile: 'Profile',
    history: 'Booking history',
    wishlist: 'Wishlist',
    ownerDash: 'Owner Dashboard',
    adminDash: 'Admin Dashboard',
    logout: 'Sign out',
    settings: 'Settings',
    lang: 'Language',
    curr: 'Currency',
    customer: 'Customer',
    owner: 'Hotel Owner',
    admin: 'Administrator',
    loginAs: 'Logged in as'
  }
};

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const [currDropdownOpen, setCurrDropdownOpen] = useState(false);
  const { language, currency } = useSelector((state: RootState) => state.settings);

  // Refs for click outside handling
  const userMenuRef = useRef<HTMLDivElement>(null);
  const langMenuRef = useRef<HTMLDivElement>(null);
  const currMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
      if (langMenuRef.current && !langMenuRef.current.contains(event.target as Node)) {
        setLangDropdownOpen(false);
      }
      if (currMenuRef.current && !currMenuRef.current.contains(event.target as Node)) {
        setCurrDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const currencies: { id: CurrencyType; label: string }[] = [
    { id: 'VND', label: 'VND (đ)' },
    { id: 'USD', label: 'USD ($)' },
    { id: 'EUR', label: 'EUR (€)' },
    { id: 'JPY', label: 'JPY (¥)' },
    { id: 'KRW', label: 'KRW (₩)' },
    { id: 'SGD', label: 'SGD (S$)' }
  ];

  const isHomePage = location.pathname === '/';
  const isSearchPage = location.pathname === '/search';
  const isHotelDetailPage = location.pathname.startsWith('/hotel/');
  const hasBanner = isHomePage || isSearchPage || isHotelDetailPage;
  const t = navTranslations[language];

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch(clearAuth());
      setDropdownOpen(false);
      navigate('/');
    }
  };

  return (
    <nav
      className={
        hasBanner
          ? 'absolute top-0 left-0 right-0 z-50 bg-transparent text-white'
          : 'sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm text-slate-800'
      }
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link
              to="/"
              className={`flex items-center gap-2 font-bold text-2xl ${
                hasBanner ? 'text-white' : 'text-primary'
              }`}
            >
              <Sparkles className={`w-6 h-6 animate-pulse ${hasBanner ? 'text-amber-300' : 'text-primary'}`} />
              <span>
                CloudBooking
                <span className={hasBanner ? 'text-amber-300' : 'text-secondary'}>.AI</span>
              </span>
            </Link>
          </div>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              to="/become-partner"
              className={`font-bold text-sm transition-colors ${
                hasBanner ? 'text-white/95 hover:text-white' : 'text-slate-700 hover:text-primary'
              }`}
            >
              {t.listProperty}
            </Link>

            {/* Currency Switcher (No borders/box outlines) */}
            <div ref={currMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setCurrDropdownOpen(!currDropdownOpen);
                  setLangDropdownOpen(false);
                }}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-extrabold transition-all ${
                  hasBanner ? 'text-white hover:bg-white/10' : 'text-slate-750 hover:bg-slate-50'
                }`}
              >
                <span>{currency}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>
              {currDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-premium bg-white border border-slate-100 shadow-lg py-1 z-50 text-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
                  {currencies.map((curr) => (
                    <button
                      key={curr.id}
                      type="button"
                      onClick={() => {
                        dispatch(setCurrency(curr.id));
                        setCurrDropdownOpen(false);
                      }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 flex items-center justify-between ${currency === curr.id ? 'text-primary' : 'text-slate-650'}`}
                    >
                      <span>{curr.label}</span>
                      {currency === curr.id && <span>✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Language Switcher (No borders/box outlines) */}
            <div ref={langMenuRef} className="relative">
              <button
                type="button"
                onClick={() => {
                  setLangDropdownOpen(!langDropdownOpen);
                  setCurrDropdownOpen(false);
                }}
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-sm font-extrabold transition-all ${
                  hasBanner ? 'text-white hover:bg-white/10' : 'text-slate-750 hover:bg-slate-50'
                }`}
              >
                {language === 'vi' ? (
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-red-600 rounded-full text-yellow-300 font-black text-[9px] shadow-sm select-none border border-white/20 shrink-0">★</span>
                ) : (
                  <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-800 rounded-full text-white font-black text-[8px] shadow-sm select-none border border-white/20 shrink-0">EN</span>
                )}
                <span>{language.toUpperCase()}</span>
                <ChevronDown className="w-3.5 h-3.5 opacity-70" />
              </button>
              {langDropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 rounded-premium bg-white border border-slate-100 shadow-lg py-1 z-50 text-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(setLanguage('vi'));
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 flex items-center gap-2 ${language === 'vi' ? 'text-primary' : 'text-slate-650'}`}
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-red-600 rounded-full text-yellow-300 font-black text-[9px] shadow-sm select-none border border-white/20 shrink-0">★</span>
                    <span>Tiếng Việt</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      dispatch(setLanguage('en'));
                      setLangDropdownOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-slate-50 flex items-center gap-2 ${language === 'en' ? 'text-primary' : 'text-slate-650'}`}
                  >
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-800 rounded-full text-white font-black text-[8px] shadow-sm select-none border border-white/20 shrink-0">EN</span>
                    <span>English</span>
                  </button>
                </div>
              )}
            </div>
            
            {isAuthenticated ? (
              <div ref={userMenuRef} className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className={`flex items-center gap-2 p-1.5 rounded-full transition-colors focus:outline-none ${
                    hasBanner ? 'hover:bg-white/10' : 'hover:bg-slate-50'
                  }`}
                >
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="w-8 h-8 rounded-full object-cover border border-primary/20"
                    />
                  ) : (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      hasBanner ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                    }`}>
                      {user?.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="font-medium text-sm hidden lg:inline">{user?.fullName}</span>
                  <ChevronDown className={`w-4 h-4 ${hasBanner ? 'text-white/70' : 'text-slate-400'}`} />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 rounded-premium bg-white border border-slate-100 shadow-xl py-1 z-50 text-slate-700 animate-in fade-in slide-in-from-top-2 duration-150">
                      <div className="px-4 py-2 border-b border-slate-50">
                        <p className="text-xs text-slate-400 font-medium">{t.loginAs}</p>
                        <p className="text-sm font-semibold text-slate-700">
                          {user?.role === 'CUSTOMER'
                            ? t.customer
                            : user?.role === 'HOTEL_OWNER'
                            ? t.owner
                            : t.admin}
                        </p>
                      </div>
                      
                      <Link
                        to="/profile"
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <User className="w-4 h-4 text-slate-400" />
                        {t.profile}
                      </Link>

                      {user?.role === 'CUSTOMER' && (
                        <>
                          <Link
                            to="/my-bookings"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <Calendar className="w-4 h-4 text-slate-400" />
                            {t.history}
                          </Link>
                          <Link
                            to="/wishlist"
                            onClick={() => setDropdownOpen(false)}
                            className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                          >
                            <Heart className="w-4 h-4 text-slate-400" />
                            {t.wishlist}
                          </Link>
                        </>
                      )}

                      {user?.role === 'HOTEL_OWNER' && (
                        <Link
                          to="/owner-dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <LayoutDashboard className="w-4 h-4 text-slate-400" />
                          {t.ownerDash}
                        </Link>
                      )}

                      {(user?.role === 'STAFF' || user?.role === 'HOTEL_OWNER' || user?.role === 'ADMIN') && (
                        <Link
                          to="/staff-dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Sparkles className="w-4 h-4 text-purple-500" />
                          Bàn Làm Việc Staff
                        </Link>
                      )}

                      {user?.role === 'ADMIN' && (
                        <Link
                          to="/admin-dashboard"
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 transition-colors"
                        >
                          <Shield className="w-4 h-4 text-slate-400" />
                          {t.adminDash}
                        </Link>
                      )}

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors text-left border-t border-slate-50"
                      >
                        <LogOut className="w-4 h-4" />
                        {t.logout}
                      </button>
                    </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className={`font-medium text-sm px-3 py-1.5 rounded-lg transition-colors ${
                    hasBanner ? 'text-white/90 hover:text-white' : 'text-slate-600 hover:text-primary'
                  }`}
                >
                  {t.login}
                </Link>
                <Link
                  to="/register"
                  className={`font-medium text-sm px-4 py-2 rounded-premium transition-all shadow-md ${
                    hasBanner
                      ? 'bg-amber-400 hover:bg-amber-500 text-slate-900 shadow-amber-400/10'
                      : 'bg-primary hover:bg-primary-dark text-white shadow-primary/20'
                  }`}
                >
                  {t.register}
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="flex items-center mobile-nav-btn md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-md transition-colors focus:outline-none ${
                hasBanner
                  ? 'text-white hover:bg-white/10'
                  : 'text-slate-400 hover:text-slate-500 hover:bg-slate-100'
              }`}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-2 pt-2 pb-4 space-y-1 text-slate-700">
          <Link
            to="/become-partner"
            onClick={() => setMobileMenuOpen(false)}
            className="block px-3 py-2 rounded-md text-base font-extrabold text-slate-800 hover:bg-slate-50 hover:text-primary"
          >
            {t.listProperty}
          </Link>
          
          <div className="border-t border-slate-100 my-2 pt-2 px-3 space-y-3">
            <p className="text-xs text-slate-400 font-extrabold uppercase tracking-wider">{t.settings}</p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={() => dispatch(setLanguage(language === 'vi' ? 'en' : 'vi'))}
                className="flex items-center justify-between text-sm font-bold text-slate-700 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg text-left"
              >
                <span className="flex items-center gap-2">
                  {language === 'vi' ? (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-red-600 rounded-full text-yellow-300 font-black text-[9px] shadow-sm select-none border border-white/20 shrink-0">★</span>
                  ) : (
                    <span className="inline-flex items-center justify-center w-5 h-5 bg-blue-800 rounded-full text-white font-black text-[8px] shadow-sm select-none border border-white/20 shrink-0">EN</span>
                  )}
                  <span>{t.lang}</span>
                </span>
                <span className="text-xs text-slate-400 font-bold">{language === 'vi' ? 'Tiếng Việt' : 'English'}</span>
              </button>

              <div className="flex flex-col gap-1">
                <span className="text-xs text-slate-400 font-extrabold px-1 py-1">{t.curr}</span>
                <div className="grid grid-cols-3 gap-1">
                  {currencies.map((curr) => (
                    <button
                      key={curr.id}
                      type="button"
                      onClick={() => dispatch(setCurrency(curr.id))}
                      className={`px-2 py-1.5 text-center text-xs font-bold rounded-lg border transition-all ${
                        currency === curr.id
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {curr.id}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {isAuthenticated ? (
            <div className="pt-4 border-t border-slate-100 mt-2">
              <div className="px-3 py-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  {user?.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-800">{user?.fullName}</p>
                  <p className="text-xs text-slate-400">{user?.email}</p>
                </div>
              </div>
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50"
              >
                {t.profile}
              </Link>
              {user?.role === 'CUSTOMER' && (
                <>
                  <Link
                    to="/my-bookings"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {t.history}
                  </Link>
                  <Link
                    to="/wishlist"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {t.wishlist}
                  </Link>
                </>
              )}
              {user?.role === 'HOTEL_OWNER' && (
                <Link
                  to="/owner-dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50"
                >
                  {t.ownerDash}
                </Link>
              )}
              {user?.role === 'ADMIN' && (
                <Link
                  to="/admin-dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-md text-base font-medium text-slate-600 hover:bg-slate-50"
                >
                  {t.adminDash}
                </Link>
              )}
              <button
                onClick={handleLogout}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 mt-2"
              >
                {t.logout}
              </button>
            </div>
          ) : (
            <div className="pt-4 border-t border-slate-100 flex flex-col gap-2 px-3">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 rounded-lg text-slate-700 font-medium hover:bg-slate-50"
              >
                {t.login}
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2 rounded-premium bg-primary text-white font-medium hover:bg-primary-dark shadow-md"
              >
                {t.register}
              </Link>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navbar;
