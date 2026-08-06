import apiClient from './client';

export interface StaffAccountData {
  fullName: string;
  email: string;
  password?: string;
  phoneNumber?: string;
  hotelId: string;
  isApproved?: boolean;
}

export const staffService = {
  // OWNER APIs
  createStaff: async (data: StaffAccountData) => {
    const res = await apiClient.post('/staff/manage', data);
    return res.data;
  },

  getStaffList: async (hotelId?: string) => {
    const res = await apiClient.get('/staff/manage', { params: { hotelId } });
    return res.data;
  },

  updateStaff: async (id: string, data: Partial<StaffAccountData>) => {
    const res = await apiClient.put(`/staff/manage/${id}`, data);
    return res.data;
  },

  deleteStaff: async (id: string) => {
    const res = await apiClient.delete(`/staff/manage/${id}`);
    return res.data;
  },

  // STAFF WORKSPACE APIs
  getDashboardOverview: async (hotelId?: string) => {
    const res = await apiClient.get('/staff/workspace/overview', { params: { hotelId } });
    return res.data;
  },

  getBookings: async (params?: { filterType?: string; query?: string; page?: number; limit?: number; requestedHotelId?: string }) => {
    const res = await apiClient.get('/staff/workspace/bookings', { params });
    return res.data;
  },

  updateBookingStatus: async (id: string, data: { status: string; internalNotes?: string }) => {
    const res = await apiClient.patch(`/staff/workspace/bookings/${id}/status`, data);
    return res.data;
  },

  assignRoomNumbers: async (itemId: string, roomNumbers: string) => {
    const res = await apiClient.patch(`/staff/workspace/booking-items/${itemId}/assign-room`, { roomNumbers });
    return res.data;
  },

  getRooms: async (hotelId?: string) => {
    const res = await apiClient.get('/staff/workspace/rooms', { params: { hotelId } });
    return res.data;
  },

  updateRoomHousekeepingStatus: async (id: string, housekeepingStatus: string) => {
    const res = await apiClient.patch(`/staff/workspace/rooms/${id}/housekeeping`, { housekeepingStatus });
    return res.data;
  },
};

export default staffService;
