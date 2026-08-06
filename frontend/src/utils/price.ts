export const formatNumberDots = (amount: number | string): string => {
  const num = Math.round(Number(amount) || 0);
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

export const formatPrice = (priceVnd: number, currency: string = 'VND') => {
  if (!currency || currency === 'VND' || currency === 'vi' || currency === 'vi-VN') {
    return `${formatNumberDots(priceVnd)} đ`;
  }
  const rates: Record<string, number> = {
    USD: 25000,
    EUR: 27000,
    JPY: 160,
    KRW: 18,
    SGD: 18500
  };
  const symbols: Record<string, string> = {
    USD: '$',
    EUR: '€',
    JPY: '¥',
    KRW: '₩',
    SGD: 'S$'
  };
  const rate = rates[currency] || 1;
  const symbol = symbols[currency] || currency;
  const converted = Math.round(priceVnd / rate);
  return `${symbol} ${formatNumberDots(converted)}`;
};
