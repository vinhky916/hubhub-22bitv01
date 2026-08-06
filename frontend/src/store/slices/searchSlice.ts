import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface SearchState {
  searchQuery: string;
  provinceId: string;
  districtId: string;
  wardId: string;
  categoryId: string;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  priceMin: number | null;
  priceMax: number | null;
  starRating: number | null;
  amenityIds: string[];
}

export const getLocalDateString = (d: Date = new Date(), offsetDays = 0): string => {
  const date = new Date(d);
  date.setDate(date.getDate() + offsetDays);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const defaultState: SearchState = {
  searchQuery: '',
  provinceId: '',
  districtId: '',
  wardId: '',
  categoryId: '',
  checkInDate: getLocalDateString(new Date(), 0), // Ngày hiện tại local
  checkOutDate: getLocalDateString(new Date(), 1), // Ngày mai local
  guests: 2,
  priceMin: null,
  priceMax: null,
  starRating: null,
  amenityIds: [],
};

const loadSearchState = (): SearchState => {
  try {
    const saved = localStorage.getItem('search_criteria');
    if (saved) {
      const parsed = JSON.parse(saved);
      const todayStr = getLocalDateString(new Date(), 0);
      
      let checkIn = parsed.checkInDate;
      let checkOut = parsed.checkOutDate;
      
      // Nếu ngày nhận phòng đã lưu cũ hơn ngày hôm nay, reset về hôm nay và ngày mai
      if (!checkIn || checkIn < todayStr) {
        checkIn = defaultState.checkInDate;
        checkOut = defaultState.checkOutDate;
      }
      
      return {
        ...defaultState,
        ...parsed,
        checkInDate: checkIn,
        checkOutDate: checkOut,
      };
    }
  } catch (e) {
    console.error('Error loading search state:', e);
  }
  return defaultState;
};

const searchSlice = createSlice({
  name: 'search',
  initialState: loadSearchState(),
  reducers: {
    setSearchCriteria: (state, action: PayloadAction<Partial<SearchState>>) => {
      const newState = { ...state, ...action.payload };
      try {
        localStorage.setItem('search_criteria', JSON.stringify(newState));
      } catch (e) {
        console.error('Error saving search state:', e);
      }
      return newState;
    },
    resetSearchCriteria: () => {
      try {
        localStorage.removeItem('search_criteria');
      } catch (e) {
        console.error('Error resetting search state:', e);
      }
      return defaultState;
    },
  },
});

export const { setSearchCriteria, resetSearchCriteria } = searchSlice.actions;
export default searchSlice.reducer;
