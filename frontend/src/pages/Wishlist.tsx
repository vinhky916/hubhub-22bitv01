import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../core/api/client';
import { Heart, MapPin, Star } from 'lucide-react';

interface FavoriteHotel {
  id: string;
  name: string;
  description: string;
  address: string;
  province: string;
  starRating: number;
  priceFrom: number;
  originalPriceFrom?: number;
  averageRating: number;
  category: string;
  images: { url: string }[];
  isFavorite: boolean;
}

export const Wishlist: React.FC = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<FavoriteHotel[]>([]);
  const [loading, setLoading] = useState(true);

  const normalizeRating = (rating: number) => {
    if (!rating) return 0;
    return rating <= 5 ? rating * 2 : rating;
  };

  const getRatingText = (rating: number) => {
    const score = normalizeRating(rating);
    if (score >= 9.5) return 'Xuất sắc';
    if (score >= 9.0) return 'Tuyệt hảo';
    if (score >= 8.5) return 'Rất tốt';
    if (score >= 8.0) return 'Tốt';
    if (score >= 5.0) return 'Chấp nhận được';
    return 'Khá tốt';
  };

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get('/hotels/favorites/my');
      if (res.data.success) {
        setHotels(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleToggleFavorite = async (e: React.MouseEvent, hotelId: string) => {
    e.stopPropagation(); // Ngăn chặn sự kiện click thẻ card chuyển trang
    try {
      const res = await apiClient.post(`/hotels/${hotelId}/favorite`);
      if (res.data.success) {
        // Xóa ngay khách sạn khỏi state để cập nhật giao diện lập tức
        setHotels((prev) => prev.filter((h) => h.id !== hotelId));
      }
    } catch (err) {
      console.error('Failed to toggle favorite:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 flex items-center gap-2">
          <Heart className="w-8 h-8 text-red-500 fill-red-500" /> Danh sách yêu thích của tôi
        </h1>
        <p className="text-sm text-slate-400 font-medium">Lưu trữ các chỗ nghỉ mơ ước cho kế hoạch du lịch sắp tới</p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="bg-white border border-slate-100 rounded-premium h-80 animate-pulse"></div>
          ))}
        </div>
      ) : hotels.length === 0 ? (
        <div className="bg-white border border-slate-100 p-12 text-center rounded-premium space-y-3 shadow-sm max-w-md mx-auto mt-12">
          <Heart className="w-12 h-12 text-slate-350 mx-auto animate-pulse" />
          <h3 className="font-bold text-slate-700">Chưa lưu khách sạn nào</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Nhấn biểu tượng trái tim khi xem thông tin khách sạn để lưu lại vào đây và dễ dàng so sánh lựa chọn.
          </p>
          <button
            onClick={() => navigate('/search')}
            className="bg-primary hover:bg-primary-dark text-white font-bold text-xs px-4 py-2 rounded-premium transition-all shadow-md shadow-primary/20"
          >
            Khám phá khách sạn ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {hotels.map((hotel) => (
            <div
              key={hotel.id}
              onClick={() => navigate(`/hotel/${hotel.id}`)}
              className="bg-white border border-slate-100 rounded-premium overflow-hidden shadow-sm hover-lift cursor-pointer flex flex-col justify-between group relative"
            >
              <div className="relative overflow-hidden">
                <img
                  src={hotel.images[0]?.url || 'https://images.unsplash.com/photo-1566073771259-6a8506099945'}
                  alt={hotel.name}
                  className="w-full h-48 object-cover group-hover:scale-105 transition-all duration-300"
                />
                
                {/* Nút Heart để hủy yêu thích */}
                <button
                  onClick={(e) => handleToggleFavorite(e, hotel.id)}
                  className="absolute top-3 right-3 p-1.5 bg-white/80 backdrop-blur rounded-full hover:bg-white transition-colors shadow-md text-red-500 hover:scale-115 active:scale-95"
                >
                  <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                </button>

                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-0.5 rounded text-[10px] font-extrabold text-primary flex items-center gap-0.5">
                  <Star className="w-3 h-3 text-amber-500 fill-amber-500" /> {hotel.starRating} Sao
                </div>
              </div>

              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-800 text-sm line-clamp-1">{hotel.name}</h3>
                  <div className="flex items-center gap-1 text-xs text-slate-400 font-medium">
                    <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                    <span className="line-clamp-1">{hotel.address}, {hotel.province}</span>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-slate-50">
                  <div className="flex justify-between items-center text-xs">
                    {hotel.averageRating > 0 ? (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="bg-[#003b95] text-white text-[11px] px-1.5 py-0.5 rounded-t rounded-br rounded-bl-none font-black min-w-[24px] text-center">
                          {normalizeRating(hotel.averageRating).toFixed(1).replace('.', ',')}
                        </span>
                        <span className="text-slate-700 font-extrabold text-[11px]">
                          {getRatingText(hotel.averageRating)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 font-semibold text-[11px]">Chưa có đánh giá</span>
                    )}
                    <span className="text-[10px] text-slate-400 font-bold">{hotel.category}</span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-medium">Giá từ</span>
                    {hotel.originalPriceFrom && hotel.originalPriceFrom > hotel.priceFrom && (
                      <span className="block text-[11px] text-slate-400 line-through leading-none mb-0.5 font-semibold">
                        {hotel.originalPriceFrom.toLocaleString('vi-VN')} đ
                      </span>
                    )}
                    <p className="font-extrabold text-sm text-red-500">
                      {hotel.priceFrom ? `${hotel.priceFrom.toLocaleString('vi-VN')} đ` : 'Liên hệ'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default Wishlist;
