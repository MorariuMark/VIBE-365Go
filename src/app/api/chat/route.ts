import { NextResponse } from 'next/server';
import { LLMProvider, ChatApiRequest, ChatApiResponse } from '@/lib/ai/types';
import { getFallbackChain } from '@/lib/ai/models';

const DEFAULT_SYSTEM_PROMPT = `You are VIBE AI, an elite athletic performance, habit optimization, and disciplined consistency coach built into the VIBE 365 Performance OS.
Your core mission is to empower the user to achieve peak physical fitness, unbreakable daily momentum, progressive overload in the gym, and ruthless elimination of bad habits.
When the user provides context data from the app (such as habit streaks, workout logs, habit breaker quotas, or objectives), analyze the numbers specifically and reference exact trends, streaks, and weights.
Maintain a motivational, precise, athletic, and direct tone. Keep advice structured with bullet points and clear action steps.`;

interface ProviderCallResult {
  success: boolean;
  content?: string;
  error?: string;
  statusCode?: number;
}

// 1. Groq Cloud API Caller
async function callGroq(
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<ProviderCallResult> {
  const url = 'https://api.groq.com/openai/v1/chat/completions';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        error: data.error?.message || `Groq API returned HTTP ${res.status}`,
      };
    }

    const content = data.choices?.[0]?.message?.content || '';
    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err.message || 'Groq connection failed' };
  }
}

// 2. OpenRouter API Caller
async function callOpenRouter(
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<ProviderCallResult> {
  const url = 'https://openrouter.ai/api/v1/chat/completions';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://vibe365.app',
        'X-Title': 'VIBE 365 Performance OS',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        error: data.error?.message || `OpenRouter returned HTTP ${res.status}`,
      };
    }

    const content = data.choices?.[0]?.message?.content || '';
    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err.message || 'OpenRouter connection failed' };
  }
}

// 3. Google Gemini Native API Caller (Modern v1beta)
async function callGemini(
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string,
  systemPrompt?: string
): Promise<ProviderCallResult> {
  // Strip 'models/' prefix if present
  const cleanModel = modelId.replace(/^models\//, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${cleanModel}:generateContent?key=${apiKey}`;

  // Convert messages to Gemini format
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

  const payload: any = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048,
    },
  };

  if (systemPrompt) {
    payload.systemInstruction = {
      parts: [{ text: systemPrompt }],
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        error: data.error?.message || `Gemini API returned HTTP ${res.status}`,
      };
    }

    const content =
      data.candidates?.[0]?.content?.parts?.[0]?.text ||
      data.candidates?.[0]?.output ||
      '';
    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err.message || 'Gemini connection failed' };
  }
}

// 4. NVIDIA NIM API Caller
async function callNvidia(
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  apiKey: string
): Promise<ProviderCallResult> {
  const url = 'https://integrate.api.nvidia.com/v1/chat/completions';
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        error: data.error?.message || `NVIDIA NIM returned HTTP ${res.status}`,
      };
    }

    const content = data.choices?.[0]?.message?.content || '';
    return { success: true, content };
  } catch (err: any) {
    return { success: false, error: err.message || 'NVIDIA connection failed' };
  }
}

// 5. Local Ollama API Caller
async function callOllama(
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  baseUrl = 'http://localhost:11434'
): Promise<ProviderCallResult> {
  const cleanUrl = baseUrl.replace(/\/$/, '');
  const url = `${cleanUrl}/api/chat`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelId,
        messages,
        stream: false,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        statusCode: res.status,
        error: data.error || `Ollama returned HTTP ${res.status}`,
      };
    }

    const content = data.message?.content || '';
    return { success: true, content };
  } catch (err: any) {
    return {
      success: false,
      error: `Ollama offline or unreachable at ${baseUrl} (${err.message})`,
    };
  }
}

// Dispatch to the proper provider
async function dispatchProviderCall(
  provider: LLMProvider,
  modelId: string,
  messages: Array<{ role: string; content: string }>,
  systemPrompt: string,
  customKeys?: ChatApiRequest['customKeys']
): Promise<ProviderCallResult> {
  const groqKey = customKeys?.groq || process.env.GROQ_API_KEY || '';
  const orKey = customKeys?.openrouter || process.env.OPENROUTER_API_KEY || '';
  const geminiKey = customKeys?.gemini || process.env.GEMINI_API_KEY || '';
  const nvKey = customKeys?.nvidia || process.env.NVIDIA_NIM_API_KEY || '';
  const ollamaUrl = customKeys?.ollamaUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';

  switch (provider) {
    case 'groq':
      if (!groqKey) return { success: false, error: 'GROQ_API_KEY is not configured.' };
      return callGroq(modelId, messages, groqKey);

    case 'openrouter':
      if (!orKey) return { success: false, error: 'OPENROUTER_API_KEY is not configured.' };
      return callOpenRouter(modelId, messages, orKey);

    case 'gemini':
      if (!geminiKey) return { success: false, error: 'GEMINI_API_KEY is not configured.' };
      return callGemini(modelId, messages, geminiKey, systemPrompt);

    case 'nvidia':
      if (!nvKey) return { success: false, error: 'NVIDIA_NIM_API_KEY is not configured.' };
      return callNvidia(modelId, messages, nvKey);

    case 'ollama':
      return callOllama(modelId, messages, ollamaUrl);

    default:
      return { success: false, error: `Unknown provider: ${provider}` };
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as ChatApiRequest;
    const {
      messages = [],
      provider = 'groq',
      modelId = 'openai/gpt-oss-20b',
      systemPrompt = DEFAULT_SYSTEM_PROMPT,
      contextText,
      enableFallback = true,
      customKeys,
    } = body;

    // Prepare full conversation with system prompt & app context
    let enrichedSystemPrompt = systemPrompt;
    if (contextText && contextText.trim()) {
      enrichedSystemPrompt += `\n\n--- APP DATA CONTEXT ---\n${contextText}\n--- END OF APP CONTEXT ---`;
    }

    const fullMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: enrichedSystemPrompt },
      ...messages,
    ];

    const debugTrace: ChatApiResponse['debugTrace'] = [];

    // Step 1: Attempt the user's primary selected model
    const primaryResult = await dispatchProviderCall(
      provider,
      modelId,
      fullMessages,
      enrichedSystemPrompt,
      customKeys
    );

    if (primaryResult.success && primaryResult.content) {
      const latencyMs = Date.now() - startTime;
      debugTrace.push({ provider, model: modelId, status: 'success' });

      return NextResponse.json<ChatApiResponse>({
        success: true,
        message: primaryResult.content,
        modelUsed: modelId,
        providerUsed: provider,
        fallbackTriggered: false,
        latencyMs,
        debugTrace,
      });
    }

    // Record the primary failure
    const primaryError = primaryResult.error || 'Unknown error';
    debugTrace.push({
      provider,
      model: modelId,
      status: 'failed',
      error: primaryError,
    });

    // Step 2: Fallback Engine Execution
    if (enableFallback) {
      const fallbackChain = getFallbackChain(modelId, provider);

      for (const fallback of fallbackChain) {
        const fallbackResult = await dispatchProviderCall(
          fallback.provider,
          fallback.modelId,
          fullMessages,
          enrichedSystemPrompt,
          customKeys
        );

        if (fallbackResult.success && fallbackResult.content) {
          const latencyMs = Date.now() - startTime;
          debugTrace.push({
            provider: fallback.provider,
            model: fallback.modelId,
            status: 'success',
          });

          return NextResponse.json<ChatApiResponse>({
            success: true,
            message: fallbackResult.content,
            modelUsed: fallback.modelId,
            providerUsed: fallback.provider,
            fallbackTriggered: true,
            fallbackReason: `Primary model (${modelId} on ${provider}) failed: ${primaryError}`,
            originalModel: modelId,
            latencyMs,
            debugTrace,
          });
        }

        debugTrace.push({
          provider: fallback.provider,
          model: fallback.modelId,
          status: 'failed',
          error: fallbackResult.error || 'Request failed',
        });
      }
    }

    // If all attempts fail:
    const latencyMs = Date.now() - startTime;
    return NextResponse.json<ChatApiResponse>(
      {
        success: false,
        error: `All providers failed. Primary error: ${primaryError}`,
        modelUsed: modelId,
        providerUsed: provider,
        fallbackTriggered: false,
        latencyMs,
        debugTrace,
      },
      { status: 502 }
    );
  } catch (error: any) {
    const latencyMs = Date.now() - startTime;
    return NextResponse.json<ChatApiResponse>(
      {
        success: false,
        error: error.message || 'Internal server error in AI Chat Route',
        modelUsed: 'unknown',
        providerUsed: 'groq',
        fallbackTriggered: false,
        latencyMs,
      },
      { status: 500 }
    );
  }
}
