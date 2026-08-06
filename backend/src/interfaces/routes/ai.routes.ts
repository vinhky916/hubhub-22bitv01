import { Router } from 'express';
import aiController from '../controllers/ai.controller';
import { requireAuth, optionalAuth, requireRole } from '../../infrastructure/middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Route tìm kiếm AI hỗ trợ cả khách vãng lai và người dùng đã đăng nhập (optionalAuth)
router.post('/search', optionalAuth, aiController.search);

// Các route quản trị AI Analytics và Audit Logs dành riêng cho Admin
router.get('/logs', requireAuth, requireRole([Role.ADMIN]), aiController.getLogs);
router.get('/audit-logs', requireAuth, requireRole([Role.ADMIN]), aiController.getAuditLogs);

export default router;
