import prisma from '../../config/database';
import vectorSearchService from './vector-search.service';
import { HotelStatus } from '@prisma/client';

export class AsyncKnowledgeIndexerService {
  private indexedCache: Map<string, number[]> = new Map();
  private isIndexing: boolean = false;

  /**
   * Đánh chỉ mục Vector ngầm không gây nghẽn luồng người dùng (Asynchronous Task)
   */
  public async indexAllHotelsAsync(): Promise<void> {
    if (this.isIndexing) return;
    this.isIndexing = true;

    // Chạy ngầm trong background (setTimeout 0ms)
    setTimeout(async () => {
      try {
        console.log('[AsyncKnowledgeIndexer]: Bắt đầu đánh chỉ mục Vector ngầm cho tất cả khách sạn...');
        const hotels = await prisma.hotel.findMany({
          where: { status: HotelStatus.APPROVED },
          include: { category: true, province: true }
        });

        for (const hotel of hotels) {
          const content = `${hotel.name}. ${hotel.description}. ${hotel.category?.name}. ${hotel.province?.name}.`;
          const vec = await vectorSearchService.generateEmbedding(content);
          this.indexedCache.set(hotel.id, vec);
        }

        console.log(`[AsyncKnowledgeIndexer]: Đã hoàn tất đánh chỉ mục ngầm cho ${this.indexedCache.size} khách sạn.`);
      } catch (err) {
        console.error('[AsyncKnowledgeIndexer Error]: Lỗi đánh chỉ mục ngầm:', err);
      } finally {
        this.isIndexing = false;
      }
    }, 0);
  }

  public getCachedVector(hotelId: string): number[] | undefined {
    return this.indexedCache.get(hotelId);
  }
}

export default new AsyncKnowledgeIndexerService();
