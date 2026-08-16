import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import apiClient from '../core/api/client';
import { KeyRound, Mail, ArrowLeft, Home, CheckCircle2, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { useModal } from '../components/common/ModalContext';

export const ForgotPassword: React.FC = () => {
  const navigate = useNavigate();
  const { showAlert } = useModal();

  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [otpChecking, setOtpChecking] = useState(false);
  const [otpValid, setOtpValid] = useState<boolean | null>(null);

  const handleOtpInputChange = async (val: string) => {
    const cleanVal = val.toUpperCase().replace(/\s/g, '');
    setOtpCode(cleanVal);
    setError('');
    setOtpValid(null);

    if (cleanVal.length === 6) {
      setOtpChecking(true);
      try {
        const res = await apiClient.post('/auth/check-otp', { email, otpCode: cleanVal });
        if (res.data.success && res.data.data?.valid) {
          setOtpValid(true);
        } else {
          setOtpValid(false);
          setError(res.data.data?.message || 'Mã OTP không chính xác');
        }
      } catch {
        setOtpValid(false);
      } finally {
        setOtpChecking(false);
      }
    }
  };

  // Bước 1: Gửi mã OTP tới Email
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setSuccessMsg(`Mã OTP 6 chữ số đã được gửi tới email ${email}. Vui lòng kiểm tra hộp thư.`);
        setStep(2);
      } else {
        setError(res.data.message || 'Không thể gửi mã OTP khôi phục');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng kiểm tra lại địa chỉ email.');
    } finally {
      setLoading(false);
    }
  };

  // Gửi lại mã OTP
  const handleResendOtp = async () => {
    setError('');
    setSuccessMsg('');
    setResendLoading(true);
    try {
      const res = await apiClient.post('/auth/forgot-password', { email });
      if (res.data.success) {
        setSuccessMsg('Mã OTP mới đã được gửi tới email của bạn. Vui lòng kiểm tra hộp thư.');
      } else {
        setError(res.data.message || 'Không thể gửi lại mã OTP');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setResendLoading(false);
    }
  };

  // Bước 2: Xác nhận OTP và đặt lại mật khẩu mới
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!otpCode || otpCode.trim().length !== 6) {
      setError('Mã OTP phải gồm 6 chữ số.');
      return;
    }

    if (password.length < 6) {
      setError('Mật khẩu mới phải tối thiểu 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    setLoading(true);

    try {
      const res = await apiClient.post('/auth/reset-password', {
        email,
        otpCode: otpCode.trim(),
        password,
      });

      if (res.data.success) {
        await showAlert('Đổi mật khẩu thành công! Bạn có thể dùng mật khẩu mới để đăng nhập.', {
          type: 'success',
          title: 'Đổi mật khẩu thành công',
        });
        navigate('/login');
      } else {
        setError(res.data.message || 'Đặt lại mật khẩu thất bại.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Mã OTP không đúng hoặc đã hết hạn.');
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
        <span className="self-start inline-flex items-center gap-1 bg-amber-400/20 text-amber-300 font-extrabold text-[10px] px-3 py-1 rounded-full uppercase tracking-wider border border-amber-400/10">
          <ShieldCheck className="w-3.5 h-3.5 animate-pulse" /> Khôi phục mật khẩu qua Email OTP
        </span>
        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black leading-tight tracking-tight">
          Khôi phục quyền truy cập tài khoản
        </h1>
        <p className="text-slate-200 text-xs lg:text-sm leading-relaxed font-semibold max-w-md">
          Nhập địa chỉ email đăng ký của bạn để nhận mã OTP 6 chữ số qua hộp thư. Xác nhận mã OTP và tạo mật khẩu mới an toàn chỉ trong vài thao tác.
        </p>
        <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase pt-4">
          © {new Date().getFullYear()} CloudBooking Corporation. All rights reserved.
        </div>
      </div>

      {/* Right Side */}
      <div className="w-full md:w-1/2 min-h-screen relative z-10 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/10 p-8 rounded-premium shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
              <KeyRound className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">
              {step === 1 ? 'Quên mật khẩu?' : 'Nhập mã OTP & Đổi mật khẩu'}
            </h2>
            <p className="text-xs text-slate-400 font-bold">
              {step === 1 
                ? 'Nhập email để nhận mã OTP khôi phục 6 chữ số' 
                : 'Nhập mã OTP vừa gửi về email và mật khẩu mới'
              }
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-xs font-semibold">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="bg-green-50 border-l-4 border-green-500 text-green-800 p-3.5 rounded-xl text-xs font-medium space-y-2">
              <div className="flex items-center gap-2 font-bold text-green-900">
                <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                <span>Thành công</span>
              </div>
              <p>{successMsg}</p>
            </div>
          )}

          {/* BƯỚC 1: NHẬP EMAIL */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email đăng ký</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nguyenvana@gmail.com"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-700"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark disabled:bg-slate-250 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-md shadow-primary/10 mt-2 active:scale-95"
              >
                {loading ? 'Đang gửi mã OTP...' : 'Gửi mã OTP về Email'}
              </button>
            </form>
          )}

          {/* BƯỚC 2: NHẬP OTP & ĐẶT MẬT KHẨU MỚI */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-4">
              {/* Email hiển thị */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email tài khoản</label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                  <input
                    type="email"
                    disabled
                    value={email}
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-slate-600 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Mã OTP 6 chữ số */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mã OTP (6 chữ số từ email)</label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    required
                    value={otpCode}
                    onChange={(e) => handleOtpInputChange(e.target.value)}
                    placeholder="123456"
                    className={`w-full border rounded-xl py-3 text-center text-xl font-bold tracking-widest font-mono focus:outline-none transition-all ${
                      otpValid === true 
                        ? 'border-green-500 bg-green-50/50 text-green-900 ring-2 ring-green-400/20' 
                        : otpValid === false 
                        ? 'border-red-500 bg-red-50/50 text-red-900 ring-2 ring-red-400/20' 
                        : 'bg-slate-50 border-slate-200 focus:border-primary focus:bg-white text-slate-700'
                    }`}
                  />
                  {otpValid === true && (
                    <div className="absolute right-3.5 top-3.5 text-green-600 animate-in zoom-in">
                      <CheckCircle2 className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center text-[11px] font-medium pt-1 px-1">
                  <span className="text-slate-400">Đã nhập: {otpCode.length}/6 ký tự</span>
                  {otpChecking && (
                    <span className="text-primary font-bold animate-pulse">⏳ Đang đối chiếu với Server...</span>
                  )}
                  {!otpChecking && otpValid === true && (
                    <span className="text-green-600 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Mã OTP khớp chính xác
                    </span>
                  )}
                  {!otpChecking && otpValid === false && (
                    <span className="text-red-600 font-bold">❌ Mã OTP không khớp</span>
                  )}
                </div>
              </div>

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

              <button
                type="submit"
                disabled={loading || otpCode.length < 6}
                className="w-full bg-primary hover:bg-primary-dark disabled:bg-slate-250 text-white font-extrabold text-xs py-3.5 rounded-xl transition-all shadow-md shadow-primary/10 mt-2 active:scale-95"
              >
                {loading ? 'Đang cập nhật mật khẩu...' : 'Xác nhận Đặt lại mật khẩu'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendLoading}
                  className="text-xs text-primary font-bold hover:underline disabled:text-slate-300"
                >
                  {resendLoading ? 'Đang gửi lại OTP...' : 'Chưa nhận được mã? Gửi lại OTP qua Email'}
                </button>
              </div>
            </form>
          )}

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

export default ForgotPassword;
