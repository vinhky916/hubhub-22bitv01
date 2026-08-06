import React from 'react';
import { Link } from 'react-router-dom';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { Sparkles } from 'lucide-react';

const footerTranslations = {
  vi: {
    tagline: 'Nền tảng đặt phòng khách sạn hiện đại tích hợp trợ lý AI thông minh tìm kiếm phòng bằng ngôn ngữ tự nhiên.',
    categoryHeader: 'Danh mục',
    catResort: 'Resorts cao cấp',
    catHotel: 'Khách sạn trung tâm',
    catHomestay: 'Homestay bình yên',
    catVilla: 'Villa biệt thự',
    supportHeader: 'Hỗ trợ',
    supportHelpCenter: 'Trung tâm trợ giúp',
    supportCancelPolicy: 'Chính sách hủy phòng',
    supportPrivacyPolicy: 'Chính sách bảo mật',
    supportTerms: 'Điều khoản dịch vụ',
    partnerHeader: 'Liên hệ đối tác',
    partnerText: 'Đăng ký khách sạn của bạn và tiếp cận hàng triệu khách hàng toàn quốc.',
    partnerBtn: 'Đăng ký chủ khách sạn',
    copyright: '© 2026 CloudBooking.AI. Bảo lưu mọi quyền.',
  },
  en: {
    tagline: 'Modern hotel booking platform integrated with a smart AI assistant searching rooms using natural language.',
    categoryHeader: 'Categories',
    catResort: 'Premium Resorts',
    catHotel: 'Central Hotels',
    catHomestay: 'Peaceful Homestays',
    catVilla: 'Luxury Villas',
    supportHeader: 'Support',
    supportHelpCenter: 'Help Center',
    supportCancelPolicy: 'Cancellation Policy',
    supportPrivacyPolicy: 'Privacy Policy',
    supportTerms: 'Terms of Service',
    partnerHeader: 'Partner Cooperation',
    partnerText: 'Register your properties and reach millions of guests nationwide.',
    partnerBtn: 'Register as Hotel Owner',
    copyright: '© 2026 CloudBooking.AI. All rights reserved.',
  }
};

export const Footer: React.FC = () => {
  const { language } = useSelector((state: RootState) => state.settings);
  const t = footerTranslations[language];

  return (
    <footer className="bg-slate-900 text-slate-300 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 font-bold text-2xl text-white">
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
              <span>CloudBooking<span className="text-secondary">.AI</span></span>
            </Link>
            <p className="text-sm text-slate-400">
              {t.tagline}
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">{t.categoryHeader}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/search?category=Resort" className="hover:text-white transition-colors">{t.catResort}</Link></li>
              <li><Link to="/search?category=Hotel" className="hover:text-white transition-colors">{t.catHotel}</Link></li>
              <li><Link to="/search?category=Homestay" className="hover:text-white transition-colors">{t.catHomestay}</Link></li>
              <li><Link to="/search?category=Villa" className="hover:text-white transition-colors">{t.catVilla}</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">{t.supportHeader}</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">{t.supportHelpCenter}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t.supportCancelPolicy}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t.supportPrivacyPolicy}</a></li>
              <li><a href="#" className="hover:text-white transition-colors">{t.supportTerms}</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold text-sm uppercase tracking-wider mb-4">{t.partnerHeader}</h3>
            <p className="text-sm text-slate-400 mb-4">
              {t.partnerText}
            </p>
            <Link to="/register?role=HOTEL_OWNER" className="inline-block bg-primary hover:bg-primary-dark text-white font-medium text-sm px-4 py-2 rounded-premium transition-all shadow-md">
              {t.partnerBtn}
            </Link>
          </div>
        </div>
        <hr className="border-slate-800 my-8" />
        <div className="flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>{t.copyright}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
