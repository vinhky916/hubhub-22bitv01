import { Router } from 'express';
import cmsController from '../controllers/cms.controller';
import { requireAuth, requireRole } from '../../infrastructure/middlewares/auth.middleware';
import { Role } from '@prisma/client';

const router = Router();

// Public / read endpoints
router.get('/banners', cmsController.getBanners);
router.get('/categories', cmsController.getCategories);
router.get('/amenities', cmsController.getAmenities);
router.get('/settings', cmsController.getSettings);

// Admin-only management endpoints
router.post('/banners', requireAuth, requireRole([Role.ADMIN]), cmsController.createBanner);
router.put('/banners/:id', requireAuth, requireRole([Role.ADMIN]), cmsController.updateBanner);
router.delete('/banners/:id', requireAuth, requireRole([Role.ADMIN]), cmsController.deleteBanner);
router.patch('/banners/:id/toggle', requireAuth, requireRole([Role.ADMIN]), cmsController.toggleBanner);

router.post('/categories', requireAuth, requireRole([Role.ADMIN]), cmsController.createCategory);
router.put('/categories/:id', requireAuth, requireRole([Role.ADMIN]), cmsController.updateCategory);
router.delete('/categories/:id', requireAuth, requireRole([Role.ADMIN]), cmsController.deleteCategory);

router.post('/amenities', requireAuth, requireRole([Role.ADMIN]), cmsController.createAmenity);
router.delete('/amenities/:id', requireAuth, requireRole([Role.ADMIN]), cmsController.deleteAmenity);

router.get('/rooms-overview', requireAuth, requireRole([Role.ADMIN]), cmsController.getRoomOverview);
router.get('/reports', requireAuth, requireRole([Role.ADMIN]), cmsController.getReports);
router.put('/settings', requireAuth, requireRole([Role.ADMIN]), cmsController.updateSettings);

export default router;
