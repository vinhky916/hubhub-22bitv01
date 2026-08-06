import { FormattedHotelCard } from '../../../interfaces/types/ai-search.types';

export class HotelFormatterService {
  public formatHotels(rawHotels: any[]): FormattedHotelCard[] {
    return rawHotels.map((hotel) => {
      let averageRating = 0;
      if (hotel.reviews && hotel.reviews.length > 0) {
        const sum = hotel.reviews.reduce((acc: number, rev: any) => acc + rev.ratingOverall, 0);
        averageRating = parseFloat((sum / hotel.reviews.length).toFixed(1));
      }

      const roomPrices = hotel.roomTypes && hotel.roomTypes.length > 0
        ? hotel.roomTypes.map((rt: any) => parseFloat(rt.basePrice.toString()))
        : [0];

      const priceFrom = Math.min(...roomPrices);

      return {
        id: hotel.id,
        name: hotel.name,
        description: hotel.description,
        address: hotel.address,
        province: hotel.province?.name || '',
        district: hotel.district?.name || '',
        ward: hotel.ward?.name || '',
        starRating: hotel.starRating,
        images: hotel.images || [],
        category: hotel.category?.name || 'Khách sạn',
        priceFrom,
        originalPriceFrom: priceFrom,
        averageRating,
        reviewCount: hotel.reviews ? hotel.reviews.length : 0,
      };
    });
  }
}

export default new HotelFormatterService();
