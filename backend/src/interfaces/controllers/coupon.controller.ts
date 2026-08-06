import { Request, Response, NextFunction } from 'express';
import couponUseCase from '../../use-cases/coupon/coupon.use-case';
import { AuthenticatedRequest } from '../../infrastructure/middlewares/auth.middleware';

export class CouponController {
  public async create(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, role } = req.user!;
      const result = await couponUseCase.createCoupon(userId, role, req.body);
      res.status(201).json({
        success: true,
        message: 'Tạo mã giảm giá coupon thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async validate(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, hotelId, amount } = req.query;
      const userId = (req as AuthenticatedRequest).user?.userId;
      const result = await couponUseCase.validateCoupon(
        code as string,
        hotelId as string | undefined,
        amount ? Number(amount) : undefined,
        userId
      );
      res.status(200).json({
        success: true,
        message: 'Mã giảm giá hợp lệ',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async list(req: Request, res: Response, next: NextFunction) {
    try {
      const { hotelId, all } = req.query;
      const result = await couponUseCase.getCoupons(hotelId as string | undefined, all === 'true');
      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async delete(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, role } = req.user!;
      const { id } = req.params;
      const result = await couponUseCase.deleteCoupon(userId, role, id);
      res.status(200).json({
        success: true,
        message: 'Xóa mã giảm giá coupon thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async toggle(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { userId, role } = req.user!;
      const { id } = req.params;
      const result = await couponUseCase.toggleCouponStatus(userId, role, id);
      res.status(200).json({
        success: true,
        message: result.isActive ? 'Kích hoạt mã giảm giá thành công' : 'Khóa mã giảm giá thành công',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new CouponController();
