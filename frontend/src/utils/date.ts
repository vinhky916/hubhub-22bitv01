/**
 * Tiện ích chuẩn hóa ngày giờ định dạng Việt Nam (DD/MM/YYYY, HH:mm DD/MM/YYYY, Thứ X...)
 */

const DAYS_OF_WEEK_VN = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/**
 * Chuyển đổi bất kỳ kiểu Date/String/Number thành đối tượng Date an toàn
 */
const safeParseDate = (input: string | Date | number | null | undefined): Date | null => {
  if (!input) return null;
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
  
  // Nếu là dạng chuỗi ngày thuần 'YYYY-MM-DD'
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input.trim())) {
    const [y, m, d] = input.trim().split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  const d = new Date(input);
  return isNaN(d.getTime()) ? null : d;
};

/**
 * Định dạng Ngày theo chuẩn Việt Nam: DD/MM/YYYY (Ví dụ: 06/08/2026)
 */
export const formatDateVN = (input: string | Date | number | null | undefined, fallback: string = 'N/A'): string => {
  const d = safeParseDate(input);
  if (!d) return fallback;

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
};

/**
 * Định dạng Giờ & Ngày theo chuẩn Việt Nam: HH:mm DD/MM/YYYY (Ví dụ: 14:30 06/08/2026)
 */
export const formatDateTimeVN = (input: string | Date | number | null | undefined, fallback: string = 'N/A'): string => {
  const d = safeParseDate(input);
  if (!d) return fallback;

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${hours}:${minutes} ${day}/${month}/${year}`;
};

/**
 * Định dạng Thứ và Ngày: Thứ X, DD/MM/YYYY (Ví dụ: Thứ Năm, 06/08/2026)
 */
export const formatFullDateVN = (input: string | Date | number | null | undefined, fallback: string = 'N/A'): string => {
  const d = safeParseDate(input);
  if (!d) return fallback;

  const dayOfWeek = DAYS_OF_WEEK_VN[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${dayOfWeek}, ${day}/${month}/${year}`;
};

/**
 * Định dạng Giờ: HH:mm (Ví dụ: 14:30)
 */
export const formatTimeVN = (input: string | Date | number | null | undefined, fallback: string = 'N/A'): string => {
  const d = safeParseDate(input);
  if (!d) return fallback;

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${hours}:${minutes}`;
};

/**
 * Định dạng Tháng / Năm: Tháng MM/YYYY (Ví dụ: Tháng 08/2026)
 */
export const formatMonthYearVN = (input: string | Date | number | null | undefined, fallback: string = 'N/A'): string => {
  const d = safeParseDate(input);
  if (!d) return fallback;

  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `Tháng ${month}/${year}`;
};
