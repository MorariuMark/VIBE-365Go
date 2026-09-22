import { LLMProvider, ModelDefinition } from './types';

export interface ProviderMeta {
  id: LLMProvider;
  name: string;
  badge: string;
  color: string; // Tailwind class
  accentHex: string;
  description: string;
  freeTierInfo: string;
}

export const PROVIDERS: Record<LLMProvider, ProviderMeta> = {
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    badge: 'LPU Speed',
    color: 'text-orange-400 bg-orange-950/60 border-orange-800/50',
    accentHex: '#f97316',
    description: 'Hardware-accelerated LPUs with sub-second token generation.',
    freeTierInfo: 'Generous free daily rate limits with ultra-low latency.',
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    badge: 'Flagship 3.8',
    color: 'text-sky-400 bg-sky-950/60 border-sky-800/50',
    accentHex: '#38bdf8',
    description: 'Next-generation Gemini 3.8/3.6 Flash reasoning & intelligence.',
    freeTierInfo: 'Free tier via Google AI Studio developer API keys.',
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Free Router',
    color: 'text-purple-400 bg-purple-950/60 border-purple-800/50',
    accentHex: '#c084fc',
    description: 'Aggregator with auto-routing to 20+ free open-weight models.',
    freeTierInfo: 'Dedicated free models router with zero per-token cost.',
  },
  nvidia: {
    id: 'nvidia',
    name: 'NVIDIA NIM',
    badge: 'Enterprise NIM',
    color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800/50',
    accentHex: '#10b981',
    description: 'NVIDIA-hosted inference microservices (Nemotron, Llama 3.2 Vision).',
    freeTierInfo: 'Free API credits provided with developer account keys.',
  },
  ollama: {
    id: 'ollama',
    name: 'Local Ollama',
    badge: '100% Local',
    color: 'text-amber-400 bg-amber-950/60 border-amber-800/50',
    accentHex: '#fbbf24',
    description: 'Run completely offline on your local GPU/CPU with no API limits.',
    freeTierInfo: '100% free, private, and runs entirely on your local machine.',
  },
};

export const MODEL_CATALOG: ModelDefinition[] = [
  // --- GROQ (Verified Live) ---
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B (Groq)',
    provider: 'groq',
    contextWindow: 131072,
    isFree: true,
    speed: 'ultra-fast',
    description: 'Blazing fast open model accelerated on Groq LPU chips. Optimal for real-time coach feedback.',
    badge: 'Recommended',
    recommended: true,
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B (Groq)',
    provider: 'groq',
    contextWindow: 131072,
    isFree: true,
    speed: 'fast',
    description: 'Flagship 120B parameter model on Groq. Deep reasoning and comprehensive athletic planning.',
    badge: 'High IQ',
  },
  {
    id: 'groq/compound',
    name: 'Groq Compound System',
    provider: 'groq',
    contextWindow: 65536,
    isFree: true,
    speed: 'fast',
    description: 'Groq multi-agent compound reasoning engine for synthesizing multi-variable context.',
    badge: 'Compound',
  },
  {
    id: 'groq/compound-mini',
    name: 'Groq Compound Mini',
    provider: 'groq',
    contextWindow: 32768,
    isFree: true,
    speed: 'ultra-fast',
    description: 'Lightweight compound reasoning for quick habit momentum calculations.',
  },
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Qwen 3.8 27B (Groq)',
    provider: 'groq',
    contextWindow: 131072,
    isFree: true,
    speed: 'fast',
    description: 'Alibaba Qwen 3.8 architecture with exceptional analytical ability and data breakdown.',
  },
  {
    id: 'allam-2-7b',
    name: 'ALLaM 2 7B (Groq)',
    provider: 'groq',
    contextWindow: 32768,
    isFree: true,
    speed: 'ultra-fast',
    description: 'Compact, instant latency model for rapid conversational checks.',
  },

  // --- GOOGLE GEMINI (Verified Live - Modern 3.8/3.6/3.5) ---
  {
    id: 'gemini-3.8-flash',
    name: 'Gemini 3.8 Flash',
    provider: 'gemini',
    contextWindow: 1048576,
    isFree: true,
    speed: 'ultra-fast',
    description: 'Google’s latest 2026 flagship Flash model. 1M token window, deep reasoning, and high speed.',
    badge: 'Flagship Flash',
    recommended: true,
  },
  {
    id: 'gemini-3.7-flash',
    name: 'Gemini 3.7 Flash',
    provider: 'gemini',
    contextWindow: 1048576,
    isFree: true,
    speed: 'ultra-fast',
    description: 'Gemini 3.7 high-throughput flash engine for detailed workout volume analysis.',
  },
  {
    id: 'gemini-3.6-flash',
    name: 'Gemini 3.6 Flash',
    provider: 'gemini',
    contextWindow: 1048576,
    isFree: true,
    speed: 'fast',
    description: 'Stable high-capacity reasoning model with multi-month data digestion.',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    provider: 'gemini',
    contextWindow: 1048576,
    isFree: true,
    speed: 'fast',
    description: 'High-speed balanced model with generous free quotas on Google AI Studio.',
  },
  {
    id: 'gemini-flash-latest',
    name: 'Gemini Flash (Latest Auto)',
    provider: 'gemini',
    contextWindow: 1048576,
    isFree: true,
    speed: 'ultra-fast',
    description: 'Dynamic pointer that automatically tracks the latest production Gemini Flash release.',
    badge: 'Auto-Updated',
  },
  {
    id: 'gemma-4-31b-it',
    name: 'Google Gemma 4 31B IT',
    provider: 'gemini',
    contextWindow: 65536,
    isFree: true,
    speed: 'fast',
    description: 'Google’s state-of-the-art open weight Gemma 4 model with high precision instruction following.',
  },

  // --- OPENROUTER (Verified Live :free Models) ---
  {
    id: 'openrouter/free',
    name: 'OpenRouter Free Auto-Router',
    provider: 'openrouter',
    contextWindow: 131072,
    isFree: true,
    speed: 'fast',
    description: 'Intelligently directs requests to the best currently available free endpoint with zero rate downtime.',
    badge: 'Auto Free',
    recommended: true,
  },
  {
    id: 'qwen/qwen3.8-27b:free',
    name: 'Qwen 3.8 27B (Free)',
    provider: 'openrouter',
    contextWindow: 131072,
    isFree: true,
    speed: 'fast',
    description: 'High capability open model hosted without inference charges.',
    badge: '100% Free',
  },
  {
    id: 'google/gemma-4-31b-it:free',
    name: 'Gemma 4 31B IT (Free)',
    provider: 'openrouter',
    contextWindow: 65536,
    isFree: true,
    speed: 'fast',
    description: 'Google Gemma 4 open architecture accessible via OpenRouter free tier.',
    badge: '100% Free',
  },
  {
    id: 'nvidia/nemotron-3.5-lightning:free',
    name: 'Nemotron 3.5 Lightning (Free)',
    provider: 'openrouter',
    contextWindow: 65536,
    isFree: true,
    speed: 'ultra-fast',
    description: 'NVIDIA Nemotron 3.5 optimized for fast low-overhead inference.',
    badge: '100% Free',
  },
  {
    id: 'cohere/north-mini-code:free',
    name: 'Cohere North Mini Code (Free)',
    provider: 'openrouter',
    contextWindow: 32768,
    isFree: true,
    speed: 'ultra-fast',
    description: 'High-precision structured data reasoning model.',
    badge: '100% Free',
  },
  {
    id: 'z-ai/glm-5.2:free',
    name: 'Z-AI GLM 5.2 (Free)',
    provider: 'openrouter',
    contextWindow: 65536,
    isFree: true,
    speed: 'medium',
    description: 'Bilingual general-purpose LLM with strong mathematical and progression analysis.',
  },

  // --- NVIDIA NIM (Verified Live Hosted Microservices) ---
  {
    id: 'meta/llama-3.2-11b-vision-instruct',
    name: 'Llama 3.2 11B Vision (NIM)',
    provider: 'nvidia',
    contextWindow: 131072,
    isFree: true,
    speed: 'fast',
    description: 'Meta multimodal instruction model hosted on NVIDIA Hopper/Blackwell acceleration.',
    badge: 'NIM Vision',
    recommended: true,
  },
  {
    id: 'nvidia/nemotron-4-340b-instruct',
    name: 'Nemotron 4 340B Instruct (NIM)',
    provider: 'nvidia',
    contextWindow: 131072,
    isFree: true,
    speed: 'medium',
    description: 'NVIDIA’s massive 340B parameter powerhouse for exhaustive fitness & habit analysis.',
    badge: '340B Monster',
  },
  {
    id: 'nvidia/nemotron-3.5-lightning-30b-a3b',
    name: 'Nemotron 3.5 Lightning 30B (NIM)',
    provider: 'nvidia',
    contextWindow: 65536,
    isFree: true,
    speed: 'ultra-fast',
    description: 'Lightning-fast architecture for instant workout suggestions and streak insights.',
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct',
    name: 'Llama 3.1 Nemotron 70B (NIM)',
    provider: 'nvidia',
    contextWindow: 131072,
    isFree: true,
    speed: 'fast',
    description: 'High-benchmark 70B parameter model tuned by NVIDIA for deep reasoning.',
  },
  {
    id: 'mistralai/mistral-large-2-instruct',
    name: 'Mistral Large 2 (NIM)',
    provider: 'nvidia',
    contextWindow: 131072,
    isFree: true,
    speed: 'medium',
    description: 'Mistral flagship model with 128k context and fluent multilingual communication.',
  },

  // --- LOCAL OLLAMA (100% Free / Local Private) ---
  {
    id: 'qwen3.8:27b',
    name: 'Qwen 3.8 27B (Local Ollama)',
    provider: 'ollama',
    contextWindow: 32768,
    isFree: true,
    speed: 'medium',
    description: 'Runs directly on your local GPU/CPU. Zero data leaves your machine.',
    badge: 'Local Offline',
  },
  {
    id: 'gemma4:31b',
    name: 'Gemma 4 31B (Local Ollama)',
    provider: 'ollama',
    contextWindow: 32768,
    isFree: true,
    speed: 'medium',
    description: 'Local Google Gemma 4 model with high precision and offline capability.',
    badge: 'Local Offline',
  },
  {
    id: 'llama3.3:latest',
    name: 'Llama 3.3 (Local Ollama)',
    provider: 'ollama',
    contextWindow: 32768,
    isFree: true,
    speed: 'medium',
    description: 'Local Meta Llama 3.3 running via http://localhost:11434.',
    badge: 'Local Offline',
  },
];

export const DEFAULT_MODEL_ID = 'openai/gpt-oss-20b';
export const DEFAULT_PROVIDER: LLMProvider = 'groq';

/**
 * Build a resilient fallback chain when the requested model encounters an error.
 * Cascades across different providers so an outage or rate limit on one service
 * seamlessly falls back to another without user disruption.
 */
export function getFallbackChain(requestedModelId: string, requestedProvider: LLMProvider): Array<{ provider: LLMProvider; modelId: string }> {
  // Ordered cross-provider fallback sequence
  const candidates: Array<{ provider: LLMProvider; modelId: string }> = [
    { provider: 'groq', modelId: 'openai/gpt-oss-20b' },
    { provider: 'gemini', modelId: 'gemini-3.8-flash' },
    { provider: 'openrouter', modelId: 'openrouter/free' },
    { provider: 'nvidia', modelId: 'meta/llama-3.2-11b-vision-instruct' },
    { provider: 'gemini', modelId: 'gemini-3.6-flash' },
    { provider: 'groq', modelId: 'qwen/qwen3.8-27b' },
    { provider: 'openrouter', modelId: 'qwen/qwen3.8-27b:free' },
    { provider: 'nvidia', modelId: 'nvidia/nemotron-3.5-lightning-30b-a3b' },
  ];

  // Exclude the currently attempted model so we don't retry the exact same failing model
  return candidates.filter(
    (c) => !(c.provider === requestedProvider && c.modelId === requestedModelId)
  );
}

export const MODEL_CATALOGUE = MODEL_CATALOG;

export function getModelsForProvider(provider: LLMProvider): ModelDefinition[] {
  return MODEL_CATALOG.filter((m) => m.provider === provider);
}

