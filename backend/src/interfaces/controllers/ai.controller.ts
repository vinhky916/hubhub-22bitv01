import { Request, Response, NextFunction } from 'express';
import aiSearchUseCase from '../../use-cases/ai-search/ai-search.use-case';
import { AppError } from '../../infrastructure/middlewares/error.middleware';
import { AuthenticatedRequest } from '../../infrastructure/middlewares/auth.middleware';
import prisma from '../../config/database';

export class AiController {
  public async search(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { message, history, page, limit, sessionId } = req.body;
      if (!message || typeof message !== 'string' || message.trim().length === 0) {
        throw new AppError('Nội dung tin nhắn tìm kiếm không được để trống', 400);
      }

      const historyList = Array.isArray(history) ? history : [];
      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 10;
      const userId = req.user?.userId;
      const activeSessionId = sessionId || `session_${userId || 'guest'}`;

      const result = await aiSearchUseCase.search({
        sessionId: activeSessionId,
        queryText: message,
        history: historyList,
        page: pageNum,
        limit: limitNum,
        userId
      });

      res.status(200).json({
        success: true,
        message: 'Tìm kiếm AI hoàn tất',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await prisma.aiSearchAnalytics.findMany({
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }

  public async getAuditLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await prisma.auditLog.findMany({
        include: {
          user: {
            select: {
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      });
      res.status(200).json({
        success: true,
        data: logs,
      });
    } catch (error) {
      next(error);
    }
  }
}

export default new AiController();
