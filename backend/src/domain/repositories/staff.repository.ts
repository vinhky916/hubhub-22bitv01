// Repository Interface: IStaffRepository
// Hợp đồng dữ liệu cho Staff use-cases

export interface IStaffRepository {
  // User (Staff) management
  findUserById(id: string, include?: any): Promise<any | null>;
  findUserByEmail(email: string): Promise<any | null>;
  findUserByPhone(phone: string): Promise<any | null>;
  createStaffUser(data: any): Promise<any>;
  updateUser(id: string, data: any): Promise<any>;
  deleteUser(id: string): Promise<void>;
  findStaffList(hotelIds: string[]): Promise<any[]>;

  // Hotel (for ownership checks)
  findHotelById(id: string): Promise<any | null>;
  findHotelsByOwner(ownerId: string): Promise<any[]>;
  findFirstHotel(): Promise<any | null>;

  // Booking (Staff workspace)
  findBookings(filter: any, include?: any, skip?: number, take?: number): Promise<any[]>;
  countBookings(filter: any): Promise<number>;
  updateBooking(id: string, data: any): Promise<any>;
  findBookingById(id: string, include?: any): Promise<any | null>;
  updateBookingItem(id: string, data: any): Promise<any>;
  findBookingItemById(id: string, include?: any): Promise<any | null>;

  // Rooms (Housekeeping)
  findRoomTypes(filter: any, include?: any): Promise<any[]>;
  findRoomById(id: string, include?: any): Promise<any | null>;
  updateRoom(id: string, data: any): Promise<any>;
  updateManyRooms(ids: string[], data: any): Promise<void>;
  findRooms(filter: any, select?: any): Promise<any[]>;
}
