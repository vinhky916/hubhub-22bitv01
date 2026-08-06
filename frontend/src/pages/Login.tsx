import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { setAuth } from '../store/slices/authSlice';
import type { RootState } from '../store';
import apiClient from '../core/api/client';
import { Sparkles, Mail, Lock, Eye, EyeOff, Home } from 'lucide-react';

export const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Lấy trang chuyển hướng sau khi login thành công
  const from = (location.state as any)?.from || '/';

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'ADMIN') {
        navigate('/admin-dashboard', { replace: true });
      } else if (user.role === 'HOTEL_OWNER') {
        navigate('/owner-dashboard', { replace: true });
      } else if (user.role === 'STAFF') {
        navigate('/staff-dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
    }
  }, [searchParams]);

  const handleGoogleLogin = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiBaseUrl}/auth/google`;
  };

  const handleFacebookLogin = () => {
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    window.location.href = `${apiBaseUrl}/auth/facebook`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/login', { email, password });
      const { success, message, data } = res.data;

      if (success) {
        dispatch(setAuth({
          user: data.user,
          accessToken: data.accessToken
        }));

        let targetPath = from;
        if (data.user?.role === 'ADMIN') {
          targetPath = '/admin-dashboard';
        } else if (data.user?.role === 'HOTEL_OWNER') {
          targetPath = '/owner-dashboard';
        } else if (data.user?.role === 'STAFF') {
          targetPath = '/staff-dashboard';
        }

        navigate(targetPath, { replace: true });
      } else {
        setError(message || 'Đăng nhập thất bại');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Lỗi kết nối hệ thống. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen relative flex flex-col md:flex-row overflow-hidden font-sans">
      {/* Full-screen Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center transition-transform duration-10000 hover:scale-105"
        style={{ backgroundImage: "url('/background.jpg')" }}
      ></div>
      {/* Dark Overlay with Blur */}
      <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[2px] z-0"></div>

      {/* Floating Back to Home Button */}
      <div className="absolute top-6 left-6 z-20">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-xs font-black tracking-wider uppercase bg-white/10 hover:bg-white/20 backdrop-blur-md px-4 py-2 rounded-full border border-white/15 text-white transition-all"
        >
          <Home className="w-3.5 h-3.5" />
          Về Trang Chủ
        </Link>
      </div>

      {/* Left Side: Welcoming text (Visible only on md screens and above) */}
      <div className="hidden md:flex md:w-1/2 relative z-10 flex-col justify-center p-12 lg:p-16 text-white space-y-6">
        <span className="self-start inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider border border-amber-400/10">
          <Sparkles className="w-3 h-3 animate-pulse" /> Trải nghiệm du lịch thông minh
        </span>
        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black leading-tight tracking-tight">
          Khám phá Việt Nam cùng CloudBooking
        </h1>
        <p className="text-slate-200 text-xs lg:text-sm leading-relaxed font-semibold max-w-md">
          Tìm kiếm khách sạn thông minh với trợ lý ảo AI, đặt phòng nhanh chóng, bảo mật thanh toán tuyệt đối và nhận nhiều ưu đãi giảm giá độc quyền lên tới 30% mỗi tuần.
        </p>
        <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase pt-4">
          © {new Date().getFullYear()} CloudBooking Corporation. All rights reserved.
        </div>
      </div>

      {/* Right Side: Centered Login Card */}
      <div className="w-full md:w-1/2 min-h-screen relative z-10 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/10 p-8 rounded-premium shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Mừng bạn quay lại!</h2>
            <p className="text-xs text-slate-400 font-bold">Đăng nhập tài khoản CloudBooking của bạn</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email đăng nhập</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ten@vidu.com"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-700"
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mật khẩu</label>
                <Link to="#" className="text-[10px] text-primary font-bold hover:underline">Quên mật khẩu?</Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs focus:outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-700"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark disabled:bg-slate-250 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-md shadow-primary/10 mt-2 active:scale-95"
            >
              {loading ? 'Đang xác minh...' : 'Đăng nhập'}
            </button>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-100"></div>
            <span className="flex-shrink mx-4 text-slate-400 text-[10px] font-bold uppercase tracking-wider">Hoặc đăng nhập bằng</span>
            <div className="flex-grow border-t border-slate-100"></div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex items-center justify-center gap-2 h-11 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs border border-slate-200 rounded-xl transition-all shadow-sm active:scale-95"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={handleFacebookLogin}
              className="flex items-center justify-center gap-2 h-11 bg-[#1877F2] hover:bg-[#166FE5] text-white font-bold text-xs rounded-xl transition-all shadow-sm active:scale-95"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
              Facebook
            </button>
          </div>

          <div className="text-center pt-4 border-t border-slate-50 text-xs font-semibold text-slate-400">
            Chưa có tài khoản?{' '}
            <Link to="/register" className="text-primary font-bold hover:underline">
              Đăng ký ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
