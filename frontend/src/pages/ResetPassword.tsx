import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import apiClient from '../core/api/client';
import { Lock, Eye, EyeOff, KeyRound, Home, ArrowLeft } from 'lucide-react';
import { useModal } from '../components/common/ModalContext';

export const ResetPassword: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { showAlert } = useModal();

  const tokenParam = searchParams.get('token') || '';
  const [token, setToken] = useState(tokenParam);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tokenParam) {
      setToken(tokenParam);
    }
  }, [tokenParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!token || token.trim() === '') {
      setError('Mã xác thực (token) không được để trống.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiClient.post('/auth/reset-password', {
        token: token.trim(),
        otpCode: token.trim(),
        password,
      });

      if (res.data.success) {
        await showAlert('Đổi mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập.', {
          type: 'success',
          title: 'Thành công',
        });
        navigate('/login');
      } else {
        setError(res.data.message || 'Đặt lại mật khẩu thất bại.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Mã khôi phục không hợp lệ hoặc đã hết hạn.');
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

      {/* Left Side */}
      <div className="hidden md:flex md:w-1/2 relative z-10 flex-col justify-center p-12 lg:p-16 text-white space-y-6">
        <span className="self-start inline-flex items-center gap-1 bg-primary/20 text-blue-300 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider border border-blue-400/10">
          <KeyRound className="w-3.5 h-3.5 animate-pulse" /> Đặt lại mật khẩu an toàn
        </span>
        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black leading-tight tracking-tight">
          Thiết lập mật khẩu mới cho tài khoản
        </h1>
        <p className="text-slate-200 text-xs lg:text-sm leading-relaxed font-semibold max-w-md">
          Vui lòng nhập mật khẩu mới bảo mật cao (tối thiểu 6 ký tự). Sau khi cập nhật thành công, bạn có thể đăng nhập ngay bằng mật khẩu mới này.
        </p>
        <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase pt-4">
          © {new Date().getFullYear()} CloudBooking Corporation. All rights reserved.
        </div>
      </div>

      {/* Right Side */}
      <div className="w-full md:w-1/2 min-h-screen relative z-10 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/10 p-8 rounded-premium shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Đặt lại mật khẩu</h2>
            <p className="text-xs text-slate-400 font-bold">Nhập mật khẩu mới của bạn bên dưới</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Token field (Hidden or shown if empty) */}
            {!tokenParam && (
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mã Token khôi phục</label>
                <input
                  type="text"
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="Nhập mã token khôi phục"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs focus:outline-none focus:border-primary focus:bg-white transition-all font-mono font-semibold text-slate-700"
                />
              </div>
            )}

            {/* Mật khẩu mới */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mật khẩu mới</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
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

            {/* Xác nhận mật khẩu mới */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Xác nhận mật khẩu mới</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-xs focus:outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-700"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary hover:bg-primary-dark disabled:bg-slate-250 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-md shadow-primary/10 mt-2 active:scale-95"
            >
              {loading ? 'Đang cập nhật mật khẩu...' : 'Xác nhận Đặt lại mật khẩu'}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-slate-50 text-xs font-semibold text-slate-400 flex items-center justify-center">
            <Link to="/login" className="inline-flex items-center gap-1.5 text-primary font-bold hover:underline">
              <ArrowLeft className="w-3.5 h-3.5" /> Quay lại trang Đăng nhập
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
