import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { 
  Sparkles, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  ShieldCheck, 
  Facebook, 
  Instagram, 
  Linkedin, 
  Youtube, 
  ArrowRight,
  PhoneCall,
  Info,
  X
} from 'lucide-react';

const footerTranslations = {
  vi: {
    tagline: 'Nền tảng đặt phòng khách sạn thông minh tích hợp trợ lý AI đa ngôn ngữ. Tìm kiếm phòng nghỉ hoàn hảo chỉ trong vài thao tác đơn giản.',
    badgeAi: 'Trợ lý AI 2.0',
    badgeSecurity: 'Bảo mật SSL 256-bit',

    // Contact section
    contactHeader: 'Thông tin liên hệ',
    addressLabel: 'Địa chỉ trụ sở',
    addressValue: 'Tòa nhà CloudBooking Tower, 123 Đường Nguyễn Huệ, P. Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    hotlineLabel: 'Tổng đài CSKH 24/7',
    hotlinePrimary: '1900 6868',
    hotlineSecondary: '028 7300 8888',
    emailLabel: 'Email hỗ trợ',
    emailValue: 'cskh@cloudbooking.ai',
    hoursLabel: 'Giờ làm việc',
    hoursValue: '08:00 - 22:00 (Thứ 2 - Chủ Nhật)',

    // Categories section
    categoryHeader: 'Danh mục lưu trú',
    catResort: 'Resorts cao cấp',
    catHotel: 'Khách sạn trung tâm',
    catHomestay: 'Homestay bình yên',
    catVilla: 'Villa biệt thự nghỉ dưỡng',
    catApartment: 'Căn hộ dịch vụ',

    // Support section
    supportHeader: 'Hỗ trợ & Chính sách',
    supportHelpCenter: 'Trung tâm trợ giúp CSKH',
    supportCancelPolicy: 'Chính sách hủy phòng',
    supportPrivacyPolicy: 'Chính sách bảo mật thông tin',
    supportTerms: 'Điều khoản dịch vụ',
    supportOperatingRules: 'Quy chế hoạt động sàn',

    // Partner section
    partnerHeader: 'Hợp tác đối tác',
    partnerText: 'Đăng ký cơ sở lưu trú của bạn để tiếp cận hàng triệu khách du lịch toàn quốc.',
    partnerBtn: 'Đăng ký chủ khách sạn',
    partnerBecome: 'Trở thành đối tác',

    // Trust & Payment
    paymentMethods: 'Chấp nhận thanh toán',
    socialMedia: 'Kết nối mạng xã hội',
    govCertified: 'Đã đăng ký Bộ Công Thương',

    copyright: '© 2026 CloudBooking.AI. Tất cả quyền được bảo lưu.',
    
    // Modal Policy titles
    policyTitle: 'Thông tin chính sách & Hỗ trợ',
    policyClose: 'Đóng cửa sổ'
  },
  en: {
    tagline: 'Smart hotel booking platform integrated with multi-lingual AI assistant. Find and book your ideal stay in seconds.',
    badgeAi: 'AI Assistant 2.0',
    badgeSecurity: '256-bit SSL Secured',

    // Contact section
    contactHeader: 'Contact Information',
    addressLabel: 'Headquarters',
    addressValue: 'CloudBooking Tower, 123 Nguyen Hue Street, Ben Nghe Ward, District 1, Ho Chi Minh City',
    hotlineLabel: 'Support Hotline 24/7',
    hotlinePrimary: '1900 6868',
    hotlineSecondary: '028 7300 8888',
    emailLabel: 'Support Email',
    emailValue: 'support@cloudbooking.ai',
    hoursLabel: 'Working Hours',
    hoursValue: '08:00 - 22:00 (Mon - Sun)',

    // Categories section
    categoryHeader: 'Accommodation',
    catResort: 'Premium Resorts',
    catHotel: 'Central Hotels',
    catHomestay: 'Peaceful Homestays',
    catVilla: 'Luxury Villas',
    catApartment: 'Serviced Apartments',

    // Support section
    supportHeader: 'Support & Policies',
    supportHelpCenter: 'Help Center',
    supportCancelPolicy: 'Cancellation Policy',
    supportPrivacyPolicy: 'Privacy Policy',
    supportTerms: 'Terms of Service',
    supportOperatingRules: 'Platform Rules',

    // Partner section
    partnerHeader: 'Partner Cooperation',
    partnerText: 'Register your property to reach millions of travelers nationwide.',
    partnerBtn: 'Register as Hotel Owner',
    partnerBecome: 'Become a Partner',

    // Trust & Payment
    paymentMethods: 'Accepted Payments',
    socialMedia: 'Social Connect',
    govCertified: 'Registered with Ministry of Industry and Trade',

    copyright: '© 2026 CloudBooking.AI. All rights reserved.',
    
    // Modal Policy titles
    policyTitle: 'Policy Information & Support',
    policyClose: 'Close window'
  }
};

export const Footer: React.FC = () => {
  const { language } = useSelector((state: RootState) => state.settings);
  const t = footerTranslations[language as keyof typeof footerTranslations] || footerTranslations.vi;
  const [activeModalPolicy, setActiveModalPolicy] = useState<{ title: string; content: string } | null>(null);

  const handleOpenPolicy = (title: string, content: string) => {
    setActiveModalPolicy({ title, content });
  };

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800 relative">
      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-8">
          
          {/* Col 1: Brand & Badges (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <Link to="/" className="inline-flex items-center gap-2 font-black text-2xl text-white tracking-tight">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              <span>CloudBooking<span className="text-secondary">.AI</span></span>
            </Link>
            
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.tagline}
            </p>

            <div className="flex flex-wrap gap-2 pt-1">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/30 text-[10px] font-bold text-primary">
                <Sparkles className="w-3 h-3" />
                {t.badgeAi}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-bold text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                {t.badgeSecurity}
              </span>
            </div>
          </div>

          {/* Col 2: Contact Info Section (4 cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 mb-4">
              <PhoneCall className="w-4 h-4 text-primary" />
              <span>{t.contactHeader}</span>
            </h3>
            
            <ul className="space-y-3 text-xs">
              {/* Address */}
              <li className="flex items-start gap-2.5 text-slate-300 group">
                <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">{t.addressLabel}:</span>
                  <span className="font-medium text-slate-200">{t.addressValue}</span>
                </div>
              </li>

              {/* Hotline */}
              <li className="flex items-start gap-2.5 text-slate-300 group">
                <Phone className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">{t.hotlineLabel}:</span>
                  <div className="flex items-center gap-2 font-bold text-emerald-400 mt-0.5">
                    <a href="tel:19006868" className="hover:underline hover:text-emerald-300">{t.hotlinePrimary}</a>
                    <span className="text-slate-600">•</span>
                    <a href="tel:02873008888" className="hover:underline hover:text-emerald-300">{t.hotlineSecondary}</a>
                  </div>
                </div>
              </li>

              {/* Email */}
              <li className="flex items-start gap-2.5 text-slate-300 group">
                <Mail className="w-4 h-4 text-blue-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">{t.emailLabel}:</span>
                  <a href={`mailto:${t.emailValue}`} className="font-semibold text-blue-400 hover:underline hover:text-blue-300 mt-0.5 inline-block">
                    {t.emailValue}
                  </a>
                </div>
              </li>

              {/* Hours */}
              <li className="flex items-start gap-2.5 text-slate-300 group">
                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5 group-hover:scale-110 transition-transform" />
                <div>
                  <span className="text-slate-400 font-medium block text-[11px]">{t.hoursLabel}:</span>
                  <span className="font-medium text-slate-300">{t.hoursValue}</span>
                </div>
              </li>
            </ul>
          </div>

          {/* Col 3: Categories & Support (2 cols) */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-4">{t.categoryHeader}</h3>
            <ul className="space-y-2.5 text-xs text-slate-400">
              <li><Link to="/search?category=Resort" className="hover:text-white transition-colors flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-slate-600" />{t.catResort}</Link></li>
              <li><Link to="/search?category=Hotel" className="hover:text-white transition-colors flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-slate-600" />{t.catHotel}</Link></li>
              <li><Link to="/search?category=Homestay" className="hover:text-white transition-colors flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-slate-600" />{t.catHomestay}</Link></li>
              <li><Link to="/search?category=Villa" className="hover:text-white transition-colors flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-slate-600" />{t.catVilla}</Link></li>
              <li><Link to="/search?category=Apartment" className="hover:text-white transition-colors flex items-center gap-1.5"><ArrowRight className="w-3 h-3 text-slate-600" />{t.catApartment}</Link></li>
            </ul>
          </div>

          {/* Col 4: Partner Section (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <h3 className="text-white font-bold text-xs uppercase tracking-wider mb-4">{t.partnerHeader}</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {t.partnerText}
            </p>
            
            <Link 
              to="/become-partner" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-primary to-blue-600 hover:from-primary-dark hover:to-blue-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl transition-all shadow-md hover:shadow-primary/20 group w-full justify-center"
            >
              <span>{t.partnerBtn}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

        </div>

        {/* Support links row & Social / Payment */}
        <div className="mt-10 pt-6 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-center">
          
          {/* Policy Links */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-400 font-medium">
            <button 
              onClick={() => handleOpenPolicy(t.supportHelpCenter, language === 'vi' ? 'Trung tâm trợ giúp CSKH CloudBooking.AI hoạt động 24/7 qua Hotline 1900 6868 hoặc Email cskh@cloudbooking.ai. Bạn có thể gửi yêu cầu trợ giúp đặt phòng, thay đổi thông tin hoặc khiếu nại.' : 'CloudBooking.AI Customer Support operates 24/7 via Hotline 1900 6868 or Email support@cloudbooking.ai.')}
              className="hover:text-white transition-colors"
            >
              {t.supportHelpCenter}
            </button>
            <span>•</span>
            <button 
              onClick={() => handleOpenPolicy(t.supportCancelPolicy, language === 'vi' ? 'Chính sách hủy phòng áp dụng theo điều khoản riêng của từng khách sạn. Thông thường hủy trước 48h được hoàn tiền 100% qua ví hoặc tài khoản ngân hàng.' : 'Cancellation policy follows individual hotel terms. Usually full refund is granted if cancelled 48h prior.')}
              className="hover:text-white transition-colors"
            >
              {t.supportCancelPolicy}
            </button>
            <span>•</span>
            <button 
              onClick={() => handleOpenPolicy(t.supportPrivacyPolicy, language === 'vi' ? 'CloudBooking.AI cam kết bảo mật tuyệt đối thông tin cá nhân và thẻ thanh toán của khách hàng chuẩn mã hóa SSL 256-bit.' : 'CloudBooking.AI commits to strict privacy of personal data and 256-bit SSL encryption.')}
              className="hover:text-white transition-colors"
            >
              {t.supportPrivacyPolicy}
            </button>
            <span>•</span>
            <button 
              onClick={() => handleOpenPolicy(t.supportTerms, language === 'vi' ? 'Điều khoản dịch vụ quy định rõ quyền và trách nhiệm của khách hàng và chủ cơ sở lưu trú khi thực hiện giao dịch trên hệ thống.' : 'Terms of service define user rights and hotel owner responsibilities on the platform.')}
              className="hover:text-white transition-colors"
            >
              {t.supportTerms}
            </button>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3 lg:justify-center">
            <span className="text-xs text-slate-400 font-semibold">{t.socialMedia}:</span>
            <div className="flex gap-2">
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-primary text-slate-300 hover:text-white flex items-center justify-center transition-colors" title="Facebook">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors" title="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-blue-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors" title="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://youtube.com" target="_blank" rel="noreferrer" className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white flex items-center justify-center transition-colors" title="YouTube">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Payment Methods (Images from public folder, excluding MoMo) */}
          <div className="flex items-center gap-2 lg:justify-end">
            <span className="text-xs text-slate-400 font-semibold">{t.paymentMethods}:</span>
            <div className="flex items-center gap-2 flex-wrap">
              <img 
                src="/visa.webp" 
                alt="Visa" 
                className="h-6 w-auto object-contain rounded bg-white p-1 border border-slate-700/60 shadow-sm hover:scale-105 transition-transform" 
                title="Visa"
              />
              <img 
                src="/Mastercard.webp" 
                alt="Mastercard" 
                className="h-6 w-auto object-contain rounded bg-white p-1 border border-slate-700/60 shadow-sm hover:scale-105 transition-transform" 
                title="Mastercard"
              />
              <img 
                src="/jcb.png" 
                alt="JCB" 
                className="h-6 w-auto object-contain rounded bg-white p-1 border border-slate-700/60 shadow-sm hover:scale-105 transition-transform" 
                title="JCB"
              />
              <img 
                src="/paypal.jpg" 
                alt="PayPal" 
                className="h-6 w-auto object-contain rounded bg-white p-1 border border-slate-700/60 shadow-sm hover:scale-105 transition-transform" 
                title="PayPal"
              />
              <img 
                src="/vnpay.jpg" 
                alt="VNPay" 
                className="h-6 w-auto object-contain rounded bg-white p-1 border border-slate-700/60 shadow-sm hover:scale-105 transition-transform" 
                title="VNPay"
              />
              <img 
                src="/zalopay.jpg" 
                alt="ZaloPay" 
                className="h-6 w-auto object-contain rounded bg-white p-1 border border-slate-700/60 shadow-sm hover:scale-105 transition-transform" 
                title="ZaloPay"
              />
            </div>
          </div>

        </div>

        <hr className="border-slate-800/80 my-8" />

        {/* Bottom copyright line */}
        <div className="flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>{t.copyright}</p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>{t.govCertified}</span>
          </div>
        </div>

      </div>

      {/* Policy Detail Modal */}
      {activeModalPolicy && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-lg w-full shadow-2xl text-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-white text-base flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                {activeModalPolicy.title}
              </h3>
              <button 
                onClick={() => setActiveModalPolicy(null)}
                className="p-1 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed py-2">
              {activeModalPolicy.content}
            </p>

            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setActiveModalPolicy(null)}
                className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                {t.policyClose}
              </button>
            </div>
          </div>
        </div>
      )}

    </footer>
  );
};

export default Footer;


