import nlpProcessorService from './nlp-processor.service';
import aiToolDispatcherService from './ai-tool-dispatcher.service';
import vectorSearchService from './vector-search.service';
import { AiSearchQueryOptions, PaginatedSearchResult } from '../../interfaces/types/ai-search.types';

export interface WorkflowGraphState {
  currentNode: 'StateInit' | 'NlpSlotExtraction' | 'VectorEmbedding' | 'HybridSearchRouting' | 'ResponseSynthesis';
  options: AiSearchQueryOptions;
  nlpResult?: any;
  queryEmbedding?: number[];
  searchResult?: PaginatedSearchResult;
  logs: string[];
}

export class LangGraphWorkflowEngine {
  /**
   * Chạy luồng State Machine LangGraph qua 5 Node cố định
   */
  public async executeWorkflow(options: AiSearchQueryOptions, startTime: number): Promise<PaginatedSearchResult> {
    const state: WorkflowGraphState = {
      currentNode: 'StateInit',
      options,
      logs: [`[Node: StateInit] Session started at ${new Date().toISOString()}`]
    };

    // Node 1: StateInit -> NlpSlotExtraction
    state.currentNode = 'NlpSlotExtraction';
    state.logs.push('[Node: NlpSlotExtraction] Executing NLP Processor...');
    state.nlpResult = await nlpProcessorService.processNlp(options.queryText, options.history);

    // Node 2: NlpSlotExtraction -> VectorEmbedding
    state.currentNode = 'VectorEmbedding';
    state.logs.push('[Node: VectorEmbedding] Generating Text Embedding...');
    state.queryEmbedding = await vectorSearchService.generateEmbedding(options.queryText);

    // Node 3: VectorEmbedding -> HybridSearchRouting
    state.currentNode = 'HybridSearchRouting';
    state.logs.push('[Node: HybridSearchRouting] Routing query to Agent Tools...');
    state.searchResult = await aiToolDispatcherService.dispatch(state.nlpResult, options, startTime);

    // Node 4: RAG Hybrid Re-Ranking (Xếp hạng lai bằng Vector nếu có danh sách khách sạn)
    if (state.searchResult.hotels && state.searchResult.hotels.length > 1) {
      state.logs.push('[Node: HybridSearchRouting] Re-ranking hotels using Cosine Similarity Vector Search...');
      state.searchResult.hotels = await vectorSearchService.rankHotelsSemantically(
        options.queryText,
        state.searchResult.hotels
      );
    }

    // Node 5: HybridSearchRouting -> ResponseSynthesis
    state.currentNode = 'ResponseSynthesis';
    state.logs.push(`[Node: ResponseSynthesis] Workflow finished in ${Date.now() - startTime}ms.`);

    console.log('[LangGraphWorkflowEngine State Transitions]:\n' + state.logs.join('\n'));

    return state.searchResult;
  }
}

export default new LangGraphWorkflowEngine();
