// Domain Entity: Staff workspace entities (for CMS, Banner, Category, Amenity)
// Lớp thuần TypeScript — không phụ thuộc vào Prisma hay bất kỳ framework nào

export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string | null;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AmenityEntity {
  id: string;
  name: string;
  icon?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface BannerEntity {
  id: string;
  title?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  position: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SystemSettings {
  commissionRate: number;
  supportEmail: string;
  supportPhone: string;
  maintenanceMode: boolean;
  announcementText: string;
  updatedAt: string;
}

export interface AuditLogEntity {
  id: string;
  userId: string;
  action: string;
  entityName: string;
  entityId?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  createdAt: Date;
}
