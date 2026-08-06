import axios from 'axios';
import aiConfig from '../../config/ai.config';
import { FormattedHotelCard } from '../../interfaces/types/ai-search.types';

export class VectorSearchService {
  /**
   * Tạo Vector Embedding cho một đoạn văn bản bằng Gemini Embeddings API (với TF-IDF Fallback)
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    if (!aiConfig.geminiApiKey) {
      return this.generateFallbackEmbedding(text);
    }

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${aiConfig.geminiApiKey}`;
      const response = await axios.post(url, {
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text }]
        }
      });

      if (response.data?.embedding?.values) {
        return response.data.embedding.values as number[];
      }
      return this.generateFallbackEmbedding(text);
    } catch (err) {
      console.warn('[VectorSearchService]: Embedding API fallback used:', err);
      return this.generateFallbackEmbedding(text);
    }
  }

  /**
   * Thuật toán tính độ tương đồng Cosine giữa 2 Vector (Cosine Similarity)
   */
  public cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (!vecA || !vecB || vecA.length === 0 || vecB.length === 0) return 0;

    const minLen = Math.min(vecA.length, vecB.length);
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < minLen; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Tìm kiếm Ngữ nghĩa Lai (Hybrid RAG Search): Xếp hạng danh sách khách sạn theo độ tương đồng Vector
   */
  public async rankHotelsSemantically(queryText: string, hotels: FormattedHotelCard[]): Promise<FormattedHotelCard[]> {
    if (!hotels || hotels.length <= 1) return hotels;

    try {
      const queryVec = await this.generateEmbedding(queryText);

      const scoredHotels = await Promise.all(
        hotels.map(async (hotel) => {
          const hotelContent = `${hotel.name}. ${hotel.description}. Loại chỗ ở: ${hotel.category}. Địa chỉ: ${hotel.address}, ${hotel.district}, ${hotel.province}.`;
          const hotelVec = await this.generateEmbedding(hotelContent);
          const score = this.cosineSimilarity(queryVec, hotelVec);
          return { hotel, score };
        })
      );

      // Sắp xếp theo điểm tương đồng Vector giảm dần
      scoredHotels.sort((a, b) => b.score - a.score);
      return scoredHotels.map(item => item.hotel);
    } catch (err) {
      console.error('[VectorSearchService] Hybrid ranking error:', err);
      return hotels;
    }
  }

  // Fallback Term-Frequency Vector Generator khi không có API Key
  private generateFallbackEmbedding(text: string): number[] {
    const clean = text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const vocab = ['dalat', 'danang', 'nhatrang', 'phuquoc', 'saigon', 'hanoi', 'resort', 'villa', 'homestay', 'hotel', 'bien', 'ho boi', 'view', 'gia re', 'dep', 'sang trong', 'yen tinh'];
    return vocab.map(word => (clean.includes(word) ? 1 : 0));
  }
}

export default new VectorSearchService();
