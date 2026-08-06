import nlpProcessorService from './nlp-processor.service';
import { NlpParseResult, ChatHistoryItem } from '../../interfaces/types/ai-search.types';

export class AiSearchService {
  public async parseQuery(queryText: string, history: ChatHistoryItem[] = []): Promise<NlpParseResult> {
    return await nlpProcessorService.processNlp(queryText, history);
  }
}

export default new AiSearchService();
