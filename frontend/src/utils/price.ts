export const formatNumberDots = (amount: number | string): string => {
  const num = Math.round(Number(amount) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

// Tỷ giá quy đổi 1 đơn vị ngoại tệ ra bao nhiêu VND (mặc định tham chiếu ban đầu)
let dynamicRates: Record<string, number> = {
  USD: 25350,
  EUR: 27600,
  JPY: 165,
  KRW: 18.5,
  SGD: 18800,
  GBP: 32000,
  AUD: 16500,
  CAD: 18500,
  CNY: 3500,
  THB: 720,
};

let lastFetchTime = 0;
const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 phút cache

// Tải tỷ giá đã lưu gần nhất từ localStorage khi ứng dụng khởi chạy
try {
  const savedRates = localStorage.getItem('cloudbooking_live_exchange_rates');
  const savedTime = localStorage.getItem('cloudbooking_live_exchange_time');
  if (savedRates && savedTime) {
    const parsedTime = Number(savedTime);
    if (Date.now() - parsedTime < CACHE_DURATION_MS * 4) {
      dynamicRates = { ...dynamicRates, ...JSON.parse(savedRates) };
      lastFetchTime = parsedTime;
    }
  }
} catch (e) {
  // Bỏ qua nếu có lỗi localStorage
}

// Tải tỷ giá trực tuyến theo giá thị trường thời gian thực (Real-time Market Exchange Rates)
export const fetchLiveExchangeRates = async (): Promise<Record<string, number>> => {
  if (Date.now() - lastFetchTime < CACHE_DURATION_MS) {
    return dynamicRates;
  }

  try {
    const response = await fetch('https://open.er-api.com/v6/latest/VND');
    if (response.ok) {
      const data = await response.json();
      if (data && data.rates) {
        // data.rates trả về 1 VND = X ngoại tệ (VD: 1 VND = 0.0000394 USD)
        // Quy đổi về 1 ngoại tệ = 1 / X VND (VD: 1 USD = ~25,380 VND)
        const newRates: Record<string, number> = {};
        Object.keys(data.rates).forEach((curr) => {
          const rateToVnd = data.rates[curr];
          if (rateToVnd > 0) {
            newRates[curr] = 1 / rateToVnd;
          }
        });

        dynamicRates = { ...dynamicRates, ...newRates };
        lastFetchTime = Date.now();
        localStorage.setItem('cloudbooking_live_exchange_rates', JSON.stringify(dynamicRates));
        localStorage.setItem('cloudbooking_live_exchange_time', String(lastFetchTime));
      }
    }
  } catch (err) {
    console.warn('Không thể tải tỷ giá trực tuyến, đang dùng tỷ giá thị trường cập nhật gần nhất:', err);
  }

  return dynamicRates;
};

// Gọi ngay khi module được nạp để đồng bộ tỷ giá thị trường mới nhất
fetchLiveExchangeRates();

const symbols: Record<string, string> = {
  USD: '$',
  EUR: '€',
  JPY: '¥',
  KRW: '₩',
  SGD: 'S$',
  GBP: '£',
  AUD: 'A$',
  CAD: 'C$',
  CNY: '¥',
  THB: '฿',
};

export const formatPrice = (priceVnd: number, currency: string = 'VND') => {
  if (!currency || currency === 'VND' || currency === 'vi' || currency === 'vi-VN') {
    return `${formatNumberDots(priceVnd)} đ`;
  }

  const rate = dynamicRates[currency] || 1;
  const symbol = symbols[currency] || currency;

  if (currency === 'USD' || currency === 'EUR' || currency === 'GBP' || currency === 'AUD' || currency === 'CAD' || currency === 'SGD') {
    const converted = (priceVnd / rate).toFixed(2);
    const [intPart, decimalPart] = converted.split('.');
    return `${symbol}${formatNumberDots(intPart)}.${decimalPart}`;
  }

  const converted = Math.round(priceVnd / rate);
  return `${symbol} ${formatNumberDots(converted)}`;
};
