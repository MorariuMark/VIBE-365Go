export type LLMProvider = 'groq' | 'openrouter' | 'gemini' | 'nvidia' | 'ollama';

export interface ModelDefinition {
  id: string;
  name: string;
  provider: LLMProvider;
  contextWindow: number; // in tokens
  isFree: boolean;
  speed: 'ultra-fast' | 'fast' | 'medium';
  description: string;
  badge?: string;
  recommended?: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
  providerUsed?: LLMProvider;
  fallbackTriggered?: boolean;
  fallbackReason?: string;
  originalModel?: string;
  tokens?: number;
  inputTokens?: number;
  contextTokens?: number;
  promptTokens?: number;
  contextFormat?: ContextFormat;
  latencyMs?: number;
}

export type ContextSection = 'habits' | 'fitness' | 'breakers' | 'objectives' | 'actions' | 'tasks' | 'sleep';
export type ContextTimeframe = 'today' | 'week' | 'month' | 'quarter' | 'custom' | 'all';
export type ContextFormat = 'markdown' | 'json';

export interface ContextOptions {
  sections: ContextSection[];
  timeframe: ContextTimeframe;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  format: ContextFormat;
  includeRawJsonDump: boolean;
}

export interface ContextPayload {
  summaryText: string;
  estimatedTokens: number;
  characterCount: number;
  sectionsIncluded: ContextSection[];
  timeframeLabel: string;
  itemCounts: {
    habits: number;
    workouts: number;
    breakers: number;
    objectives: number;
    actions: number;
    tasks: number;
    sleep: number;
  };
}

export interface ChatApiRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  provider: LLMProvider;
  modelId: string;
  systemPrompt?: string;
  contextText?: string;
  enableFallback?: boolean;
  customKeys?: {
    groq?: string;
    openrouter?: string;
    gemini?: string;
    nvidia?: string;
    ollamaUrl?: string;
  };
}

export interface ChatApiResponse {
  success: boolean;
  message?: string;
  modelUsed: string;
  providerUsed: LLMProvider;
  fallbackTriggered: boolean;
  fallbackReason?: string;
  originalModel?: string;
  latencyMs: number;
  error?: string;
  debugTrace?: Array<{
    provider: LLMProvider;
    model: string;
    status: 'failed' | 'success';
    error?: string;
  }>;
}
