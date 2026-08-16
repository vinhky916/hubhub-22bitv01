import { Request, Response, NextFunction } from 'express';
import { cmsUseCase } from '../../config/container';
import { AuthenticatedRequest } from '../../infrastructure/middlewares/auth.middleware';

export class CmsController {
  // --- Banners ---
  public async getBanners(req: Request, res: Response, next: NextFunction) {
    try {
      const { position, activeOnly } = req.query;
      const banners = await cmsUseCase.getBanners(position as string, activeOnly === 'true');
      res.status(200).json({ success: true, data: banners });
    } catch (error) {
      next(error);
    }
  }

  public async createBanner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await cmsUseCase.createBanner(req.body);
      res.status(201).json({ success: true, message: 'Tạo Banner thành công', data: result });
    } catch (error) {
      next(error);
    }
  }

  public async updateBanner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await cmsUseCase.updateBanner(id, req.body);
      res.status(200).json({ success: true, message: 'Cập nhật Banner thành công', data: result });
    } catch (error) {
      next(error);
    }
  }

  public async deleteBanner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await cmsUseCase.deleteBanner(id);
      res.status(200).json({ success: true, message: 'Xóa Banner thành công', data: result });
    } catch (error) {
      next(error);
    }
  }

  public async toggleBanner(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await cmsUseCase.toggleBannerStatus(id);
      res.status(200).json({
        success: true,
        message: result.isActive ? 'Kích hoạt Banner thành công' : 'Đã ẩn Banner',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  // --- Categories ---
  public async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await cmsUseCase.getCategories();
      res.status(200).json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  public async createCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await cmsUseCase.createCategory(req.body);
      res.status(201).json({ success: true, message: 'Tạo danh mục thành công', data: result });
    } catch (error) {
      next(error);
    }
  }

  public async updateCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await cmsUseCase.updateCategory(id, req.body);
      res.status(200).json({ success: true, message: 'Cập nhật danh mục thành công', data: result });
    } catch (error) {
      next(error);
    }
  }

  public async deleteCategory(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await cmsUseCase.deleteCategory(id);
      res.status(200).json({ success: true, message: 'Xóa danh mục thành công', data: result });
    } catch (error) {
      next(error);
    }
  }

  // --- Amenities ---
  public async getAmenities(req: Request, res: Response, next: NextFunction) {
    try {
      const amenities = await cmsUseCase.getAmenities();
      res.status(200).json({ success: true, data: amenities });
    } catch (error) {
      next(error);
    }
  }

  public async createAmenity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = await cmsUseCase.createAmenity(req.body);
      res.status(201).json({ success: true, message: 'Tạo tiện ích thành công', data: result });
    } catch (error) {
      next(error);
    }
  }

  public async deleteAmenity(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const result = await cmsUseCase.deleteAmenity(id);
      res.status(200).json({ success: true, message: 'Xóa tiện ích thành công', data: result });
    } catch (error) {
      next(error);
    }
  }

  // --- Room Overview ---
  public async getRoomOverview(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await cmsUseCase.getRoomInventoryOverview();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // --- Reports ---
  public async getReports(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const data = await cmsUseCase.getFinancialReports();
      res.status(200).json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  // --- Settings ---
  public async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      const settings = cmsUseCase.getSettings();
      res.status(200).json({ success: true, data: settings });
    } catch (error) {
      next(error);
    }
  }

  public async updateSettings(req: AuthenticatedRequest, res: Response, next: NextFunction) {
    try {
      const result = cmsUseCase.updateSettings(req.body);
      res.status(200).json({ success: true, message: 'Cập nhật cài đặt hệ thống thành công', data: result });
    } catch (error) {
      next(error);
    }
  }
}

export default new CmsController();
