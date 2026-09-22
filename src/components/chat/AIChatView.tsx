'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppDataBackup } from '@/types';
import {
  LLMProvider,
  ChatMessage,
  ContextOptions,
  ChatApiRequest,
  ChatApiResponse,
} from '@/lib/ai/types';
import {
  DEFAULT_MODEL_ID,
  DEFAULT_PROVIDER,
  PROVIDERS,
  MODEL_CATALOG,
} from '@/lib/ai/models';
import { buildAppContext } from '@/lib/ai/contextBuilder';
import { MarkdownRenderer } from './MarkdownRenderer';
import { ContextSelectorModal } from './ContextSelectorModal';
import { ModelSelectorModal } from './ModelSelectorModal';
import {
  Bot,
  Send,
  Sparkles,
  Layers,
  ChevronDown,
  ShieldCheck,
  RotateCcw,
  Download,
  Copy,
  Check,
  AlertTriangle,
  Flame,
  Dumbbell,
  Target,
  FileJson,
  Calendar,
  Zap,
  Terminal,
  Cpu,
} from 'lucide-react';

interface AIChatViewProps {
  appData: AppDataBackup;
  selectedDate: string;
}

const CHAT_STORAGE_KEY = 'vibe_ai_chat_messages_v2';
const KEYS_STORAGE_KEY = 'vibe_ai_custom_keys_v1';

export const AIChatView: React.FC<AIChatViewProps> = ({ appData, selectedDate }) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Model & Provider State
  const [selectedModelId, setSelectedModelId] = useState<string>(DEFAULT_MODEL_ID);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>(DEFAULT_PROVIDER);
  const [enableFallback, setEnableFallback] = useState<boolean>(true);

  // App Data Context Options
  const [attachContext, setAttachContext] = useState<boolean>(true);
  const [contextOptions, setContextOptions] = useState<ContextOptions>({
    sections: ['habits', 'fitness', 'breakers', 'objectives'],
    timeframe: 'week',
    format: 'markdown',
    includeRawJsonDump: false,
  });

  // Modal visibility
  const [isContextModalOpen, setIsContextModalOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);

  // Custom API keys overrides
  const [customKeys, setCustomKeys] = useState<{
    groq?: string;
    openrouter?: string;
    gemini?: string;
    nvidia?: string;
    ollamaUrl?: string;
  }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load chat history and custom keys from localStorage
  useEffect(() => {
    try {
      const savedMessages = localStorage.getItem(CHAT_STORAGE_KEY);
      if (savedMessages) {
        setMessages(JSON.parse(savedMessages));
      }
      const savedKeys = localStorage.getItem(KEYS_STORAGE_KEY);
      if (savedKeys) {
        setCustomKeys(JSON.parse(savedKeys));
      }
    } catch (e) {
      console.error('Failed to load chat history from localStorage', e);
    }
  }, []);

  // Save chat history on update
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    } catch (e) {
      console.error('Failed to save chat history to localStorage', e);
    }
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Handle custom key save
  const handleSaveCustomKeys = (keys: typeof customKeys) => {
    setCustomKeys(keys);
    try {
      localStorage.setItem(KEYS_STORAGE_KEY, JSON.stringify(keys));
    } catch (e) {
      console.error('Failed to save custom keys', e);
    }
  };

  // Compute live active context preview summary
  const currentContextPayload = buildAppContext(appData, contextOptions);

  // Quick preset pills
  const handleQuickPreset = (preset: 'today' | 'week' | 'gym' | 'json') => {
    if (preset === 'today') {
      setContextOptions({
        sections: ['habits', 'fitness'],
        timeframe: 'today',
        format: 'markdown',
        includeRawJsonDump: false,
      });
      setAttachContext(true);
    } else if (preset === 'week') {
      setContextOptions({
        sections: ['habits', 'fitness', 'breakers', 'objectives'],
        timeframe: 'week',
        format: 'markdown',
        includeRawJsonDump: false,
      });
      setAttachContext(true);
    } else if (preset === 'gym') {
      setContextOptions({
        sections: ['fitness'],
        timeframe: 'month',
        format: 'markdown',
        includeRawJsonDump: false,
      });
      setAttachContext(true);
    } else if (preset === 'json') {
      setContextOptions({
        sections: ['habits', 'fitness', 'breakers', 'objectives', 'actions'],
        timeframe: 'month',
        format: 'json',
        includeRawJsonDump: true,
      });
      setAttachContext(true);
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const content = (textToSend || inputValue).trim();
    if (!content || isLoading) return;

    const promptTokens = Math.ceil(content.length / 3.8);
    const contextTokens = attachContext ? currentContextPayload.estimatedTokens : 0;
    const totalInputTokens = promptTokens + contextTokens;
    const activeFormat = contextOptions.format;

    const userMessage: ChatMessage = {
      id: `msg_${Date.now()}_user`,
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
      inputTokens: totalInputTokens,
      contextTokens,
      promptTokens,
      contextFormat: activeFormat,
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInputValue('');
    setIsLoading(true);

    // Prepare context text if enabled
    let contextText: string | undefined = undefined;
    if (attachContext) {
      contextText = currentContextPayload.summaryText;
    }

    try {
      const mergedKeys = {
        ...(appData.settings?.customApiKeys || {}),
        ...customKeys,
      };

      const payload: ChatApiRequest = {
        messages: newHistory.map((m) => ({ role: m.role, content: m.content })),
        provider: selectedProvider,
        modelId: selectedModelId,
        contextText,
        enableFallback,
        customKeys: mergedKeys,
      };


      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: ChatApiResponse = await res.json();

      if (data.success && data.message) {
        const assistantMessage: ChatMessage = {
          id: `msg_${Date.now()}_ai`,
          role: 'assistant',
          content: data.message,
          timestamp: new Date().toISOString(),
          modelUsed: data.modelUsed,
          providerUsed: data.providerUsed,
          fallbackTriggered: data.fallbackTriggered,
          fallbackReason: data.fallbackReason,
          originalModel: data.originalModel,
          inputTokens: totalInputTokens,
          contextTokens,
          promptTokens,
          contextFormat: activeFormat,
          latencyMs: data.latencyMs,
        };
        setMessages([...newHistory, assistantMessage]);
      } else {
        const errorMessage: ChatMessage = {
          id: `msg_${Date.now()}_err`,
          role: 'assistant',
          content: `⚠️ **Request Failed**: ${data.error || 'Unknown error occurred while contacting AI.'}`,
          timestamp: new Date().toISOString(),
          modelUsed: selectedModelId,
          providerUsed: selectedProvider,
        };
        setMessages([...newHistory, errorMessage]);
      }
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `msg_${Date.now()}_err`,
        role: 'assistant',
        content: `⚠️ **Connection Error**: Unable to reach local server API route. (${err.message})`,
        timestamp: new Date().toISOString(),
        modelUsed: selectedModelId,
        providerUsed: selectedProvider,
      };
      setMessages([...newHistory, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Quick prompt starter click
  const handleStarterClick = (prompt: string) => {
    handleSendMessage(prompt);
  };

  // Clear conversation
  const handleClearChat = () => {
    if (confirm('Clear the entire conversation history?')) {
      setMessages([]);
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  };

  // Export conversation as markdown
  const handleExportChat = () => {
    if (messages.length === 0) return;
    const lines = [
      '# VIBE 365 AI Coach Conversation Transcript',
      `Exported: ${new Date().toLocaleString()}`,
      `Model: ${selectedModelId} (${selectedProvider})\n`,
    ];
    messages.forEach((m) => {
      lines.push(`### ${m.role === 'user' ? 'USER' : 'VIBE AI'} [${m.timestamp}]`);
      lines.push(m.content);
      lines.push('');
    });

    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibe-ai-chat-${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy assistant response
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const activeProviderMeta = PROVIDERS[selectedProvider];
  const activeModelMeta = MODEL_CATALOG.find(
    (m) => m.id === selectedModelId && m.provider === selectedProvider
  );

  // Live real-time cyber token telemetry
  const livePromptTokens = Math.ceil(inputValue.length / 3.8);
  const liveContextTokens = attachContext ? currentContextPayload.estimatedTokens : 0;
  const liveTotalInputTokens = livePromptTokens + liveContextTokens;
  const activeModelCap = activeModelMeta?.contextWindow || 131072;

  return (
    <div className="flex flex-col h-[calc(100dvh-185px)] md:h-[calc(100vh-140px)] min-h-[460px] md:min-h-[580px] bg-[#07090e] border border-[#171d2b] rounded-2xl overflow-hidden shadow-2xl">
      {/* Top Header Control Strip */}
      <div className="flex-shrink-0 px-4 py-3 bg-[#0a0d14] border-b border-[#171c2b] flex flex-wrap items-center justify-between gap-3">
        {/* Left: Model & Provider Selector Pill */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsModelModalOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111622] hover:bg-[#181e2e] border border-[#232b40] text-xs font-semibold transition group shadow-sm"
          >
            <div
              className={`w-2 h-2 rounded-full`}
              style={{ backgroundColor: activeProviderMeta?.accentHex || '#10b981' }}
            />
            <span className="font-bold text-white tracking-wide">
              {activeModelMeta?.name || selectedModelId}
            </span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${activeProviderMeta?.color || 'text-slate-400'}`}
            >
              {activeProviderMeta?.name || selectedProvider}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition" />
          </button>

          {/* Fallback Badge */}
          <button
            type="button"
            onClick={() => setIsModelModalOpen(true)}
            className={`hidden sm:flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded-lg border transition ${
              enableFallback
                ? 'bg-emerald-950/50 text-emerald-400 border-emerald-800/40 hover:bg-emerald-900/50'
                : 'bg-slate-900 text-slate-500 border-slate-800'
            }`}
            title="Automatic error & rate-limit fallback routing"
          >
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            <span>{enableFallback ? 'Auto-Fallback: ON' : 'Fallback: OFF'}</span>
          </button>
        </div>

        {/* Right: Actions (Context Badge, Clear, Export) */}
        <div className="flex items-center gap-2">
          {/* Context Configuration Pill */}
          <button
            type="button"
            onClick={() => setIsContextModalOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
              attachContext
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-700/50 hover:bg-emerald-900/40 shadow-sm'
                : 'bg-[#10141e] text-slate-400 border-[#1e2538] hover:text-slate-200'
            }`}
          >
            <Layers className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {contextOptions.format === 'json' ? 'JSON Dump' : 'Context'}:{' '}
              <strong className="text-white font-mono">{currentContextPayload.timeframeLabel}</strong>
            </span>
            <span className="text-[10px] font-mono bg-black/40 px-1.5 py-0.2 rounded text-slate-400">
              ~{currentContextPayload.estimatedTokens} tk
            </span>
          </button>

          {/* Clear Chat */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleClearChat}
              className="p-1.5 rounded-lg bg-[#111622] hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 border border-[#20273a] transition"
              title="Clear chat"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Export Chat */}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={handleExportChat}
              className="p-1.5 rounded-lg bg-[#111622] hover:bg-[#181e2e] text-slate-400 hover:text-slate-200 border border-[#20273a] transition"
              title="Export chat transcript"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Quick Context Chips Strip */}
      <div className="flex-shrink-0 px-4 py-2 bg-[#080b12] border-b border-[#141824] flex items-center gap-2 overflow-x-auto scrollbar-none text-[11px]">
        <span className="text-slate-500 font-mono flex items-center gap-1 flex-shrink-0">
          <Sparkles className="w-3 h-3 text-emerald-400" />
          <span>Inject:</span>
        </span>

        <button
          onClick={() => handleQuickPreset('json')}
          className={`px-2.5 py-1 rounded-lg font-mono font-medium flex items-center gap-1.5 flex-shrink-0 transition border ${
            contextOptions.format === 'json'
              ? 'bg-purple-950/80 text-purple-300 border-purple-700/60'
              : 'bg-[#0f131d] text-slate-400 border-[#1a2133] hover:text-slate-200'
          }`}
        >
          <FileJson className="w-3 h-3 text-purple-400" />
          <span>⚡ Full JSON Dump</span>
        </button>

        <button
          onClick={() => handleQuickPreset('today')}
          className={`px-2.5 py-1 rounded-lg font-mono font-medium flex items-center gap-1.5 flex-shrink-0 transition border ${
            contextOptions.timeframe === 'today' && contextOptions.format === 'markdown'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
              : 'bg-[#0f131d] text-slate-400 border-[#1a2133] hover:text-slate-200'
          }`}
        >
          <Calendar className="w-3 h-3 text-emerald-400" />
          <span>📅 Today's Telemetry</span>
        </button>

        <button
          onClick={() => handleQuickPreset('week')}
          className={`px-2.5 py-1 rounded-lg font-mono font-medium flex items-center gap-1.5 flex-shrink-0 transition border ${
            contextOptions.timeframe === 'week' && contextOptions.format === 'markdown'
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
              : 'bg-[#0f131d] text-slate-400 border-[#1a2133] hover:text-slate-200'
          }`}
        >
          <Flame className="w-3 h-3 text-amber-400" />
          <span>📊 Past 7 Days</span>
        </button>

        <button
          onClick={() => handleQuickPreset('gym')}
          className={`px-2.5 py-1 rounded-lg font-mono font-medium flex items-center gap-1.5 flex-shrink-0 transition border ${
            contextOptions.sections.length === 1 && contextOptions.sections[0] === 'fitness'
              ? 'bg-blue-950/80 text-blue-300 border-blue-700/60'
              : 'bg-[#0f131d] text-slate-400 border-[#1a2133] hover:text-slate-200'
          }`}
        >
          <Dumbbell className="w-3 h-3 text-blue-400" />
          <span>🏋️ Gym Overload (30d)</span>
        </button>

        <button
          onClick={() => setIsContextModalOpen(true)}
          className="px-2.5 py-1 rounded-lg font-mono text-slate-400 hover:text-white bg-[#0f131d] border border-[#1a2133] flex-shrink-0 transition"
        >
          ⚙️ Custom Range...
        </button>
      </div>

      {/* Main Messages Viewport */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin scrollbar-thumb-[#171e2c]">
        {/* Empty State */}
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-xl mx-auto py-8 space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-emerald-950/50 border border-emerald-700/40 flex items-center justify-center text-emerald-400 shadow-xl">
              <Bot className="w-8 h-8 stroke-[2]" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-extrabold text-white tracking-tight">
                VIBE <span className="text-emerald-400">AI</span> Performance Intelligence
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Connect your habits momentum, gym progressive overload, habit breakers, and quarterly
                milestones to high-speed AI inference. Select prompt starters below or type your inquiry.
              </p>
            </div>

            {/* Starter Prompt Cards */}
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
              {[
                {
                  icon: Dumbbell,
                  title: 'Audit Progressive Overload',
                  desc: 'Analyze workout volume, top weights, and split consistency.',
                  prompt:
                    'Audit my fitness and workout progress over the past month. Am I hitting progressive overload, and what muscle groups or exercises need more volume?',
                },
                {
                  icon: Flame,
                  title: 'Evaluate Habit Momentum',
                  desc: 'Spot unbroken streaks and pinpoint vulnerable habits.',
                  prompt:
                    'Review my current habit streaks. Which habits have the highest momentum and which ones are currently at risk or have been missed recently?',
                },
                {
                  icon: Target,
                  title: 'Quarterly Objectives Review',
                  desc: 'Check if daily actions are compounding toward quarterly targets.',
                  prompt:
                    'Review my quarterly objectives against my daily habits and workout logs. Am I on pace to hit my target metrics by their due dates?',
                },
                {
                  icon: FileJson,
                  title: 'Raw JSON Deep Synthesis',
                  desc: 'Examine complete telemetry dump for blind spots.',
                  prompt:
                    'I have attached my raw JSON performance data. Provide an exhaustive diagnostic breakdown: strengths, weaknesses, and a 7-day action protocol.',
                },
              ].map((card, idx) => {
                const Icon = card.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleStarterClick(card.prompt)}
                    className="p-3.5 rounded-xl bg-[#0e121b] border border-[#1b2234] hover:bg-[#141a26] hover:border-emerald-500/50 transition text-left group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-bold text-white">{card.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-snug">{card.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Message Thread */}
        {messages.map((message) => {
          const isUser = message.role === 'user';

          return (
            <div
              key={message.id}
              className={`flex gap-3 max-w-3xl ${isUser ? 'ml-auto justify-end' : 'mr-auto justify-start'}`}
            >
              {!isUser && (
                <div className="w-8 h-8 rounded-lg bg-[#101522] border border-[#212a3f] flex items-center justify-center text-emerald-400 flex-shrink-0 mt-1 shadow-sm">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`rounded-2xl p-4 sm:p-5 text-sm max-w-2xl transition-all ${
                  isUser
                    ? 'bg-emerald-600/15 border border-emerald-500/30 text-emerald-50'
                    : 'bg-[#0d1017] border border-[#1a2030] text-slate-200 shadow-lg'
                }`}
              >
                {/* Assistant Message Header Metadata */}
                {!isUser && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-3 border-b border-[#182030] text-[10px] font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-emerald-400 font-bold">VIBE AI</span>
                      {message.modelUsed && (
                        <span className="text-slate-400 bg-black/40 px-2 py-0.5 rounded border border-[#222a3d]">
                          {message.modelUsed}
                        </span>
                      )}
                      {message.inputTokens !== undefined && (
                        <span className="text-cyan-400/90 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40 text-[9px] font-mono tracking-wider">
                          IN: {message.inputTokens.toLocaleString()} TK ({message.contextFormat?.toUpperCase() || 'MD'})
                        </span>
                      )}
                      {message.latencyMs && (
                        <span className="text-slate-500">{message.latencyMs}ms</span>
                      )}
                    </div>

                    <button
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      className="flex items-center gap-1 text-slate-400 hover:text-white transition"
                    >
                      {copiedId === message.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Notice if Automatic Fallback was Triggered */}
                {!isUser && message.fallbackTriggered && (
                  <div className="mb-3 p-2.5 rounded-lg bg-amber-950/40 border border-amber-800/50 flex items-start gap-2 text-xs text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <div className="font-bold">Seamless Fallback Activated</div>
                      <div className="text-[11px] text-amber-400/80 mt-0.5">
                        {message.fallbackReason ||
                          `Primary model encountered an error; automatically routed to ${message.modelUsed}.`}
                      </div>
                    </div>
                  </div>
                )}

                {/* Message Body */}
                {isUser ? (
                  <div>
                    <div className="whitespace-pre-wrap leading-relaxed text-sm">{message.content}</div>
                    {message.inputTokens !== undefined && (
                      <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono tracking-wider text-emerald-400/90 uppercase select-none">
                        <span className="flex items-center gap-1.5">
                          <Terminal className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-500 font-bold">TELEMETRY_IN //</span>
                          <span className="text-white font-bold">{message.inputTokens.toLocaleString()} TK</span>
                        </span>
                        <span className="text-slate-400 text-[9px]">
                          [CTX: <span className="text-emerald-300 font-bold">{message.contextTokens?.toLocaleString() || 0}</span> TK ({message.contextFormat?.toUpperCase() || 'MD'}) + PROMPT: <span className="text-cyan-300 font-bold">{message.promptTokens?.toLocaleString() || 0}</span> TK]
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <MarkdownRenderer content={message.content} />
                )}
              </div>
            </div>
          );
        })}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-2xl mr-auto">
            <div className="w-8 h-8 rounded-lg bg-[#101522] border border-[#212a3f] flex items-center justify-center text-emerald-400 flex-shrink-0 shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="rounded-2xl p-4 bg-[#0d1017] border border-[#1a2030] text-sm flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-mono text-slate-400">
                Reasoning with {selectedModelId} via {activeProviderMeta?.name || selectedProvider}...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Bottom Input Console */}
      <div className="flex-shrink-0 p-3 sm:p-4 bg-[#0a0d14] border-t border-[#171c2b] space-y-2.5">
        {/* Cyber Live Telemetry Token Gauge */}
        <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#05070d] border border-[#162035] rounded-xl shadow-inner font-mono text-[10px] tracking-wider uppercase select-none">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 text-emerald-400 flex-shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              <span className="font-bold tracking-widest text-[9px] text-emerald-400">TELEMETRY_STREAM //</span>
            </div>

            <span className="text-slate-400 truncate">
              CTX [{contextOptions.format === 'json' ? (
                <span className="text-purple-400 font-bold">JSON DUMP</span>
              ) : (
                <span className="text-emerald-400 font-bold">MARKDOWN</span>
              )}]:{' '}
              <strong className="text-emerald-300 font-bold">
                {liveContextTokens.toLocaleString()}
              </strong>{' '}
              TK
            </span>

            <span className="text-slate-700 hidden sm:inline">|</span>

            <span className="text-slate-400 hidden sm:inline">
              PROMPT:{' '}
              <strong className="text-cyan-300 font-bold">
                {livePromptTokens.toLocaleString()}
              </strong>{' '}
              TK
            </span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-slate-400">
              PAYLOAD:{' '}
              <strong className="text-amber-300 font-bold">
                {liveTotalInputTokens.toLocaleString()}
              </strong>{' '}
              TK
            </span>

            <span className="text-slate-600 font-mono text-[9px]">
              / {Math.round(activeModelCap / 1024)}K LIMIT
            </span>

            <div className="w-16 bg-[#0f1422] h-1.5 rounded-full overflow-hidden border border-[#21293e] hidden md:block">
              <div
                className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-emerald-400 via-cyan-400 to-amber-400"
                style={{
                  width: `${Math.max(4, Math.min(100, (liveTotalInputTokens / activeModelCap) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Context Attachment Bar */}
        <div className="flex items-center justify-between px-1">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-400 hover:text-slate-200 transition select-none">
            <input
              type="checkbox"
              checked={attachContext}
              onChange={(e) => setAttachContext(e.target.checked)}
              className="w-3.5 h-3.5 rounded bg-[#10141e] border-slate-600 text-emerald-500 focus:ring-0"
            />
            <span>
              Attach live telemetry (<strong>{currentContextPayload.timeframeLabel}</strong> •{' '}
              {contextOptions.format === 'json' ? 'JSON' : 'Markdown'})
            </span>
          </label>

          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            Press Enter to send, Shift+Enter for new line
          </span>
        </div>

        {/* Input Bar */}
        <div className="flex items-end gap-2 bg-[#0e121b] border border-[#20273c] rounded-xl p-2 focus-within:border-emerald-500/70 focus-within:ring-1 focus-within:ring-emerald-500/20 transition">
          <textarea
            ref={textareaRef}
            rows={1}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Ask your AI Performance Coach about workouts, streaks, or bad habit elimination..."
            className="flex-1 bg-transparent border-0 resize-none text-xs sm:text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none max-h-36 min-h-[36px] py-1 px-2 scrollbar-none"
          />

          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="font-mono text-[9px] tracking-wider text-emerald-400/90 bg-[#060a12] px-2 py-0.5 rounded border border-emerald-900/60 shadow-[0_0_8px_rgba(16,185,129,0.15)] flex items-center gap-1 select-none">
              <Zap className="w-2.5 h-2.5 text-emerald-400" />
              <span>{liveTotalInputTokens.toLocaleString()} TK ({contextOptions.format === 'json' ? 'JSON' : 'MD'})</span>
            </span>
            <button
              type="button"
              disabled={!inputValue.trim() || isLoading}
              onClick={() => handleSendMessage()}
              className="px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-slate-950 font-bold transition flex items-center justify-center active-press"
            >
              <Send className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      </div>

      {/* Context Selector Modal */}
      <ContextSelectorModal
        appData={appData}
        currentOptions={contextOptions}
        isOpen={isContextModalOpen}
        onClose={() => setIsContextModalOpen(false)}
        onApply={(newOptions) => {
          setContextOptions(newOptions);
          setAttachContext(true);
        }}
      />

      {/* Model & Provider Hub Modal */}
      <ModelSelectorModal
        selectedModelId={selectedModelId}
        selectedProvider={selectedProvider}
        enableFallback={enableFallback}
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        onSelectModel={(modelId, provider) => {
          setSelectedModelId(modelId);
          setSelectedProvider(provider);
          setIsModelModalOpen(false);
        }}
        onToggleFallback={(enabled) => setEnableFallback(enabled)}
        customKeys={customKeys}
        onSaveCustomKeys={handleSaveCustomKeys}
      />
    </div>
  );
};
