import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../infrastructure/middlewares/auth.middleware';
import { loyaltyUseCase } from '../../config/container';

export class LoyaltyController {
  public async getSummary(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const summary = await loyaltyUseCase.getLoyaltySummary(userId);
      res.status(200).json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }

  public async getHistory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const history = await loyaltyUseCase.getLoyaltyHistory(userId);
      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new LoyaltyController();
