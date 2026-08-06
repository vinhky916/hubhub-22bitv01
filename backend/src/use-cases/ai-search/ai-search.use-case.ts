import prisma from '../../config/database';
import langGraphWorkflowEngine from '../../infrastructure/services/langgraph-workflow.engine';
import asyncKnowledgeIndexerService from '../../infrastructure/services/async-knowledge-indexer.service';
import { AiSearchQueryOptions, PaginatedSearchResult } from '../../interfaces/types/ai-search.types';

export class AiSearchUseCase {
  public async search(options: AiSearchQueryOptions): Promise<PaginatedSearchResult> {
    const startTime = Date.now();

    // 1. Chạy ngầm Async Knowledge Indexer tự động đánh chỉ mục Vector cho dữ liệu khách sạn
    asyncKnowledgeIndexerService.indexAllHotelsAsync();

    // 2. Chạy luồng State Machine LangGraph qua 5 Node (StateInit -> NlpSlot -> VectorEmbedding -> ToolRouting -> ResponseSynthesis)
    const result = await langGraphWorkflowEngine.executeWorkflow(options, startTime);

    // 3. Ghi log thống kê Analytics cho Admin AI Dashboard
    try {
      await prisma.aiSearchAnalytics.create({
        data: {
          queryText: options.queryText,
          parsedQuery: JSON.parse(JSON.stringify(result.aiAnalysis)),
          isSuccess: result.hotels.length > 0 || result.aiAnalysis.intent === 'FAQ' || result.aiAnalysis.intent === 'GENERAL' || result.aiAnalysis.intent === 'BOOKING_STATUS',
          executionMs: result.executionMs,
        },
      });
    } catch (logError) {
      console.error('[AiSearchUseCase Log Error]: Không ghi được log analytics:', logError);
    }

    return result;
  }
}

export default new AiSearchUseCase();
