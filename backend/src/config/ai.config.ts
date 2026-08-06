import dotenv from 'dotenv';

dotenv.config();

const rawGeminiKey = process.env.GEMINI_API_KEY || '';
const rawOpenaiKey = process.env.OPENAI_API_KEY || '';

const isValidGeminiKey = rawGeminiKey.trim().length > 0 && !rawGeminiKey.includes('your_gemini_api_key');
const isValidOpenaiKey = rawOpenaiKey.trim().length > 0 && !rawOpenaiKey.includes('your_openai_api_key');

export const aiConfig = {
  geminiApiKey: isValidGeminiKey ? rawGeminiKey : '',
  openaiApiKey: isValidOpenaiKey ? rawOpenaiKey : '',
  preferProvider: isValidGeminiKey ? 'gemini' : (isValidOpenaiKey ? 'openai' : 'mock'),
};

export default aiConfig;
