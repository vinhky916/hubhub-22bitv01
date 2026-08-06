import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middlewares/auth.middleware';
import staffUseCase from '../../use-cases/staff/staff.use-case';

export class StaffController {
  // OWNER: Tạo tài khoản nhân viên
  public createStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const ownerId = req.user!.userId;
      const ownerRole = req.user!.role;
      const staffUser = await staffUseCase.createStaffAccount(ownerId, ownerRole, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo tài khoản nhân viên thành công',
        data: staffUser,
      });
    } catch (error) {
      next(error);
    }
  };

  // OWNER: Lấy danh sách nhân viên
  public getStaffList = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const ownerId = req.user!.userId;
      const ownerRole = req.user!.role;
      const { hotelId } = req.query;
      const staffList = await staffUseCase.getHotelStaffList(ownerId, ownerRole, hotelId as string);
      res.status(200).json({
        success: true,
        data: staffList,
      });
    } catch (error) {
      next(error);
    }
  };

  // OWNER: Cập nhật tài khoản nhân viên
  public updateStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const ownerId = req.user!.userId;
      const ownerRole = req.user!.role;
      const { id } = req.params;
      const updated = await staffUseCase.updateStaffAccount(ownerId, ownerRole, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật thông tin nhân viên thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  // OWNER: Xóa nhân viên
  public deleteStaff = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const ownerId = req.user!.userId;
      const ownerRole = req.user!.role;
      const { id } = req.params;
      const result = await staffUseCase.deleteStaffAccount(ownerId, ownerRole, id);
      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  };

  // STAFF WORKSPACE: Tổng quan chỉ số vận hành
  public getDashboardOverview = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { hotelId } = req.query;
      const overview = await staffUseCase.getStaffDashboardOverview(userId, role, hotelId as string);
      res.status(200).json({
        success: true,
        data: overview,
      });
    } catch (error) {
      next(error);
    }
  };

  // STAFF WORKSPACE: Lấy danh sách Bookings
  public getBookings = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const result = await staffUseCase.getStaffBookings(userId, role, req.query);
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  };

  // STAFF WORKSPACE: Đổi trạng thái Booking (Check-in/out...)
  public updateBookingStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { id } = req.params;
      const updated = await staffUseCase.updateBookingStatusByStaff(userId, role, id, req.body);
      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái đặt phòng thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  // STAFF WORKSPACE: Gán số phòng cho Booking Item
  public assignRoomNumbers = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { itemId } = req.params;
      const { roomNumbers } = req.body;
      const updated = await staffUseCase.assignRoomNumbers(userId, role, itemId, roomNumbers);
      res.status(200).json({
        success: true,
        message: 'Đã gán số phòng thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };

  // STAFF WORKSPACE: Danh sách sơ đồ phòng
  public getRooms = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { hotelId } = req.query;
      const rooms = await staffUseCase.getStaffRooms(userId, role, hotelId as string);
      res.status(200).json({
        success: true,
        data: rooms,
      });
    } catch (error) {
      next(error);
    }
  };

  // STAFF WORKSPACE: Đổi trạng thái Buồng phòng
  public updateRoomStatus = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const { id } = req.params;
      const { housekeepingStatus } = req.body;
      const updated = await staffUseCase.updateRoomHousekeepingStatus(userId, role, id, housekeepingStatus);
      res.status(200).json({
        success: true,
        message: 'Cập nhật trạng thái phòng thành công',
        data: updated,
      });
    } catch (error) {
      next(error);
    }
  };
}

export default new StaffController();
