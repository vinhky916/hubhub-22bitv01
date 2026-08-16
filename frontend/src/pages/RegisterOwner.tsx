import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import apiClient from '../core/api/client';
import { Mail, Lock, User, Phone, CheckCircle, ShieldCheck, Home } from 'lucide-react';
import { useModal } from '../components/common/ModalContext';

export const RegisterOwner: React.FC = () => {
  const navigate = useNavigate();
  const { showAlert } = useModal();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');
  const [otpChecking, setOtpChecking] = useState(false);
  const [otpValid, setOtpValid] = useState<boolean | null>(null);

  const handleOtpInputChange = async (val: string) => {
    const cleanVal = val.toUpperCase().replace(/\s/g, '');
    setOtp(cleanVal);
    setOtpError('');
    setOtpValid(null);

    if (cleanVal.length === 6) {
      setOtpChecking(true);
      try {
        const res = await apiClient.post('/auth/check-otp', { email, otpCode: cleanVal });
        if (res.data.success && res.data.data?.valid) {
          setOtpValid(true);
        } else {
          setOtpValid(false);
          setOtpError(res.data.data?.message || 'Mã OTP không chính xác');
        }
      } catch {
        setOtpValid(false);
      } finally {
        setOtpChecking(false);
      }
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await apiClient.post('/auth/register', {
        email,
        password,
        fullName,
        phoneNumber,
        role: 'HOTEL_OWNER'
      });

      if (res.data.success) {
        setShowOtpModal(true);
      } else {
        setError(res.data.message || 'Đăng ký thất bại');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Có lỗi xảy ra. Vui lòng kiểm tra lại thông tin.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError('');
    setResendMessage('');
    setResendLoading(true);
    try {
      const res = await apiClient.post('/auth/resend-otp', { email });
      if (res.data.success) {
        setResendMessage('Mã OTP mới đã được gửi tới email của bạn.');
      } else {
        setOtpError(res.data.message || 'Không thể gửi lại mã OTP');
      }
    } catch (err: any) {
      console.error(err);
      setOtpError(err.response?.data?.message || 'Không thể gửi lại mã OTP. Vui lòng thử lại sau.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setResendMessage('');
    setOtpLoading(true);

    try {
      const res = await apiClient.post('/auth/verify-email', {
        email,
        otpCode: otp
      });

      if (res.data.success) {
        await showAlert('Xác thực email thành công! Tài khoản Đối tác của bạn sẽ cần Admin phê duyệt trước khi đăng nhập.', { type: 'success', title: 'Xác thực thành công' });
        setShowOtpModal(false);
        navigate('/login');
      } else {
        setOtpError(res.data.message || 'Mã OTP không hợp lệ');
      }
    } catch (err: any) {
      console.error(err);
      setOtpError(err.response?.data?.message || 'OTP không đúng hoặc đã hết hạn.');
    } finally {
      setOtpLoading(false);
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
          <ShieldCheck className="w-3.5 h-3.5 animate-pulse" /> Đăng ký Đối tác Chủ chỗ nghỉ
        </span>
        <h1 className="text-3xl lg:text-4xl xl:text-5xl font-black leading-tight tracking-tight">
          Gia tăng doanh thu phòng cùng CloudBooking
        </h1>
        <p className="text-slate-200 text-xs lg:text-sm leading-relaxed font-semibold max-w-md">
          Đăng ký tài khoản Đối tác để bắt đầu đăng tải khách sạn, homestay, biệt thự của bạn. Quản lý giá phòng, phòng trống linh hoạt qua lịch giá động và tiếp cận tệp khách hàng tiềm năng khổng lồ mỗi ngày.
        </p>
        <div className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase pt-4">
          © {new Date().getFullYear()} CloudBooking Corporation. All rights reserved.
        </div>
      </div>

      {/* Right Side: Centered Register Owner Card */}
      <div className="w-full md:w-1/2 min-h-screen relative z-10 flex items-center justify-center p-6 sm:p-12 md:p-16 overflow-y-auto">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-md border border-white/10 p-8 rounded-premium shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-6 h-6 animate-pulse" />
            </div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Đăng ký Đối tác</h2>
            <p className="text-xs text-slate-400 font-bold">Đăng ký tài khoản Chủ chỗ nghỉ của bạn</p>
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleRegisterSubmit} className="space-y-4">
            {/* Họ tên */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Họ và tên chủ sở hữu</label>
              <div className="relative">
                <User className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-700"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Địa chỉ Email doanh nghiệp</label>
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

            {/* Số điện thoại */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Số điện thoại liên hệ</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="0912345678"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-700"
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Mật khẩu</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3.5 text-slate-400 w-4 h-4" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 6 ký tự"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-primary focus:bg-white transition-all font-semibold text-slate-700"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-600 disabled:bg-slate-250 text-slate-900 font-black text-sm py-3.5 rounded-xl transition-all shadow-md shadow-amber-500/10 mt-2 active:scale-95"
            >
              {loading ? 'Đang gửi thông tin đăng ký...' : 'Đăng ký tài khoản Đối tác'}
            </button>
          </form>

          <div className="text-center pt-4 border-t border-slate-50 text-xs font-semibold text-slate-400">
            Đã có tài khoản?{' '}
            <Link to="/login" className="text-primary font-bold hover:underline">
              Đăng nhập
            </Link>
          </div>
        </div>
      </div>

      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-100 p-6 rounded-premium shadow-2xl w-full max-w-sm text-center space-y-5 animate-in zoom-in-95 duration-200">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base">Xác thực tài khoản</h3>
              <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                Mã xác thực OTP gồm 6 ký tự đã được gửi tới email <strong>{email}</strong>. Vui lòng kiểm tra và nhập mã bên dưới.
              </p>
            </div>

            {otpError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs font-semibold text-left flex items-start gap-2">
                <span className="text-red-500 font-bold">⚠️</span>
                <div>
                  <div className="font-bold">{otpError}</div>
                  <div className="text-[10px] text-red-500 font-medium mt-0.5">Vui lòng kiểm tra lại Hộp thư đến/Spam hoặc nhấn Gửi lại OTP.</div>
                </div>
              </div>
            )}

            {resendMessage && (
              <div className="bg-green-50 text-green-700 p-2 rounded text-[11px] font-semibold">
                {resendMessage}
              </div>
            )}

            <form onSubmit={handleOtpVerify} className="space-y-4">
              <div>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => handleOtpInputChange(e.target.value)}
                    placeholder="Nhập 6 ký tự OTP"
                    className={`w-full border rounded-xl py-3 text-center text-xl font-bold letter-spacing-4 font-mono focus:outline-none transition-all ${
                      otpValid === true 
                        ? 'border-green-500 bg-green-50/50 text-green-900 ring-2 ring-green-400/20' 
                        : otpValid === false 
                        ? 'border-red-500 bg-red-50/50 text-red-900 ring-2 ring-red-400/20' 
                        : 'bg-slate-50 border-slate-200 focus:border-primary focus:bg-white text-slate-700'
                    }`}
                  />
                  {otpValid === true && (
                    <div className="absolute right-3.5 top-3.5 text-green-600 animate-in zoom-in">
                      <CheckCircle className="w-5 h-5" />
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center text-[11px] font-medium pt-1.5 px-1">
                  <span className="text-slate-400">Đã nhập: {otp.length}/6 ký tự</span>
                  {otpChecking && (
                    <span className="text-primary font-bold animate-pulse">⏳ Đang đối chiếu với Server...</span>
                  )}
                  {!otpChecking && otpValid === true && (
                    <span className="text-green-600 font-bold flex items-center gap-1">
                      <CheckCircle className="w-3.5 h-3.5" /> Mã OTP khớp chính xác
                    </span>
                  )}
                  {!otpChecking && otpValid === false && (
                    <span className="text-red-600 font-bold">❌ Mã OTP không khớp</span>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={otpLoading || otp.length < 6}
                className="w-full bg-primary hover:bg-primary-dark disabled:bg-slate-250 text-white font-bold text-xs py-3 rounded-premium transition-colors"
              >
                {otpLoading ? 'Đang kiểm tra mã OTP...' : 'Xác thực OTP'}
              </button>
            </form>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={resendLoading}
                className="text-xs text-primary font-bold hover:underline disabled:text-slate-300"
              >
                {resendLoading ? 'Đang gửi lại OTP...' : 'Chưa nhận được mã? Gửi lại OTP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterOwner;
