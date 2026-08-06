import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store from './store';
import { setAuth, clearAuth } from './store/slices/authSlice';
import apiClient, { getAccessToken } from './core/api/client';
import Layout from './components/common/Layout';
import { ModalProvider } from './components/common/ModalContext';
import { socket } from './core/socket/socket';
import Home from './pages/Home';
import Search from './pages/Search';
import HotelDetail from './pages/HotelDetail';
import Login from './pages/Login';
import Register from './pages/Register';
import RegisterOwner from './pages/RegisterOwner';
import Checkout from './pages/Checkout';
import Payment from './pages/Payment';
import MyBookings from './pages/MyBookings';
import OwnerDashboard from './pages/OwnerDashboard';
import AdminDashboard from './pages/AdminDashboard';
import StaffDashboard from './pages/StaffDashboard';
import Wishlist from './pages/Wishlist';
import BecomePartner from './pages/BecomePartner';
import LoginSuccess from './pages/LoginSuccess';
import Profile from './pages/Profile';

// --- Component tự động kiểm tra Session (Auto Login) khi load trang ---
const AuthInitializer: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const dispatch = useDispatch();
  const user = useSelector((state: any) => state.auth.user);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = getAccessToken();
        if (!token) {
          const res = await apiClient.post('/auth/refresh-token');
          const newAccessToken = res.data.data.accessToken;
          
          const profileRes = await apiClient.get('/auth/me', {
            headers: { Authorization: `Bearer ${newAccessToken}` }
          });
          
          if (profileRes.data.success) {
            dispatch(setAuth({
              user: profileRes.data.data,
              accessToken: newAccessToken
            }));
          }
        }
      } catch (err) {
        dispatch(clearAuth());
      }
    };

    initializeAuth();

    const handleLogoutEvent = () => {
      dispatch(clearAuth());
    };
    window.addEventListener('auth:logout', handleLogoutEvent);
    
    return () => {
      window.removeEventListener('auth:logout', handleLogoutEvent);
    };
  }, [dispatch]);

  // Quản lý kết nối Socket.io Real-time
  useEffect(() => {
    socket.connect();

    if (user?.id) {
      socket.emit('joinUser', user.id);
    }

    const handleBookingStatus = (data: any) => {
      window.dispatchEvent(new CustomEvent('booking:statusUpdated', { detail: data }));
    };

    const handleHotelStatus = (data: any) => {
      window.dispatchEvent(new CustomEvent('hotel:statusUpdated', { detail: data }));
    };

    const handleCalendar = (data: any) => {
      window.dispatchEvent(new CustomEvent('calendar:updated', { detail: data }));
    };

    socket.on('bookingStatusUpdated', handleBookingStatus);
    socket.on('hotelStatusUpdated', handleHotelStatus);
    socket.on('calendarUpdated', handleCalendar);

    return () => {
      socket.off('bookingStatusUpdated', handleBookingStatus);
      socket.off('hotelStatusUpdated', handleHotelStatus);
      socket.off('calendarUpdated', handleCalendar);
    };
  }, [user]);

  return <>{children}</>;
};

const ScrollToTop: React.FC = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
};

const AppContent: React.FC = () => {
  return (
    <Router>
      <ModalProvider>
        <ScrollToTop />
        <AuthInitializer>
          <Layout>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/hotel/:id" element={<HotelDetail />} />
              <Route path="/login" element={<Login />} />
              <Route path="/login-success" element={<LoginSuccess />} />
              <Route path="/register" element={<Register />} />
              <Route path="/register/owner" element={<RegisterOwner />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/my-bookings" element={<MyBookings />} />
              <Route path="/wishlist" element={<Wishlist />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/payment" element={<Payment />} />
              <Route path="/become-partner" element={<BecomePartner />} />
              <Route path="/owner-dashboard" element={<OwnerDashboard />} />
              <Route path="/admin-dashboard" element={<AdminDashboard />} />
              <Route path="/staff-dashboard" element={<StaffDashboard />} />
              <Route path="*" element={<div className="text-center py-20 font-bold text-slate-500">404 - Không tìm thấy trang</div>} />
            </Routes>
          </Layout>
        </AuthInitializer>
      </ModalProvider>
    </Router>
  );
};

export const App: React.FC = () => {
  return (
    <Provider store={store}>
      <AppContent />
    </Provider>
  );
};

export default App;
