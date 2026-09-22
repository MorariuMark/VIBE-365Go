'use client';

import React, { useState } from 'react';
import { LLMProvider, ModelDefinition } from '@/lib/ai/types';
import { MODEL_CATALOG, PROVIDERS, getFallbackChain } from '@/lib/ai/models';
import {
  X,
  Search,
  Check,
  ShieldCheck,
  Zap,
  Sparkles,
  Settings,
  Key,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ModelSelectorModalProps {
  selectedModelId: string;
  selectedProvider: LLMProvider;
  enableFallback: boolean;
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (modelId: string, provider: LLMProvider) => void;
  onToggleFallback: (enabled: boolean) => void;
  customKeys: {
    groq?: string;
    openrouter?: string;
    gemini?: string;
    nvidia?: string;
    ollamaUrl?: string;
  };
  onSaveCustomKeys: (keys: {
    groq?: string;
    openrouter?: string;
    gemini?: string;
    nvidia?: string;
    ollamaUrl?: string;
  }) => void;
}

export const ModelSelectorModal: React.FC<ModelSelectorModalProps> = ({
  selectedModelId,
  selectedProvider,
  enableFallback,
  isOpen,
  onClose,
  onSelectModel,
  onToggleFallback,
  customKeys,
  onSaveCustomKeys,
}) => {
  const [activeTab, setActiveTab] = useState<'models' | 'fallback' | 'keys'>('models');
  const [providerFilter, setProviderFilter] = useState<LLMProvider | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Local key edit state
  const [keysState, setKeysState] = useState(customKeys);

  if (!isOpen) return null;

  const filteredModels = MODEL_CATALOG.filter((m) => {
    if (providerFilter !== 'all' && m.provider !== providerFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.id.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const currentFallbackSequence = getFallbackChain(selectedModelId, selectedProvider);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0c0f17] border border-[#1f2638] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b2234] bg-[#090b11]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-950/60 border border-orange-800/50 flex items-center justify-center text-orange-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                LLM Provider & Model Control Hub
              </h3>
              <p className="text-xs text-slate-400">
                Switch free models, configure automatic fallback routing, or manage provider keys.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-[#182030] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center px-5 border-b border-[#1a2030] bg-[#0b0e16] gap-4">
          <button
            onClick={() => setActiveTab('models')}
            className={`py-3 text-xs font-semibold border-b-2 transition ${
              activeTab === 'models'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Catalog & Models ({MODEL_CATALOG.length})
          </button>

          <button
            onClick={() => setActiveTab('fallback')}
            className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'fallback'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Fallback Cascade</span>
            <span
              className={`text-[9px] font-mono px-1.5 py-0.2 rounded ${
                enableFallback
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/60'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {enableFallback ? 'ACTIVE' : 'OFF'}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('keys')}
            className={`py-3 text-xs font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'keys'
                ? 'border-emerald-400 text-white'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span>API Keys & Endpoints</span>
          </button>
        </div>

        {/* Content Viewport */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-thin scrollbar-thumb-[#1f2638]">
          {/* TAB 1: MODEL CATALOG */}
          {activeTab === 'models' && (
            <div className="space-y-4">
              {/* Search & Provider Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by model name, architecture, or speed..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#10141e] border border-[#1f2638] rounded-xl pl-9 pr-3.5 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/70"
                  />
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                  <button
                    onClick={() => setProviderFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                      providerFilter === 'all'
                        ? 'bg-[#1b2234] text-white border border-[#2e3752]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Providers
                  </button>
                  {Object.keys(PROVIDERS).map((pKey) => {
                    const p = PROVIDERS[pKey as LLMProvider];
                    return (
                      <button
                        key={p.id}
                        onClick={() => setProviderFilter(p.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                          providerFilter === p.id
                            ? 'bg-[#1b2234] text-white border border-[#2e3752]'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {p.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Models List Grid */}
              <div className="space-y-2.5">
                {filteredModels.map((model) => {
                  const isSelected =
                    selectedModelId === model.id && selectedProvider === model.provider;
                  const providerInfo = PROVIDERS[model.provider];

                  return (
                    <div
                      key={`${model.provider}-${model.id}`}
                      onClick={() => onSelectModel(model.id, model.provider)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                        isSelected
                          ? 'bg-[#141b2b] border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                          : 'bg-[#0f131d] border-[#1c2234] hover:bg-[#151a26] hover:border-[#273048]'
                      }`}
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs text-white tracking-wide">
                            {model.name}
                          </span>
                          <span
                            className={`text-[9px] font-mono font-medium px-2 py-0.5 rounded-full border ${providerInfo.color}`}
                          >
                            {providerInfo.name}
                          </span>
                          {model.badge && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
                              {model.badge}
                            </span>
                          )}
                          <span className="text-[9px] font-mono text-slate-500">
                            {(model.contextWindow / 1024).toFixed(0)}k ctx
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-2">
                          {model.description}
                        </p>
                      </div>

                      <div className="flex items-center gap-2.5 self-end sm:self-center flex-shrink-0">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            model.speed === 'ultra-fast'
                              ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {model.speed}
                        </span>

                        <div
                          className={`w-6 h-6 rounded-lg border flex items-center justify-center transition ${
                            isSelected
                              ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                              : 'border-slate-700 bg-black/30 text-transparent'
                          }`}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: FALLBACK CASCADE */}
          {activeTab === 'fallback' && (
            <div className="space-y-5">
              <div className="bg-[#10141e] border border-[#1d2436] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-bold text-white">
                      Automatic Error & Rate-Limit Fallback System
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    When active, if your primary model experiences a rate limit (HTTP 429), outage, or timeout,
                    VIBE AI seamlessly routes through the fallback chain below without interrupting your chat.
                  </p>
                </div>
                <button
                  onClick={() => onToggleFallback(!enableFallback)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                    enableFallback
                      ? 'bg-emerald-500 text-slate-950 hover:bg-emerald-400'
                      : 'bg-[#1b2234] text-slate-400 hover:text-white border border-[#27324c]'
                  }`}
                >
                  {enableFallback ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-3">
                  Live Fallback Chain For Current Selection:
                </h4>
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-600/50 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono bg-emerald-500 text-slate-950 font-bold px-1.5 py-0.5 rounded">
                        1. PRIMARY
                      </span>
                      <span className="text-xs font-bold text-white">{selectedModelId}</span>
                      <span className="text-[10px] font-mono text-emerald-400 uppercase">
                        ({selectedProvider})
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">First Attempt</span>
                  </div>

                  {currentFallbackSequence.map((fb, index) => {
                    return (
                      <div
                        key={`${fb.provider}-${fb.modelId}`}
                        className="p-3 rounded-xl bg-[#0f131d] border border-[#1b2234] flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                            {index + 2}. FALLBACK
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
                          <span className="text-slate-200 font-medium">{fb.modelId}</span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            ({PROVIDERS[fb.provider]?.name || fb.provider})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-emerald-400/80">Auto-Routes</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: API KEYS OVERRIDE */}
          {activeTab === 'keys' && (
            <div className="space-y-4">
              <div className="bg-[#10141e] border border-[#1e2538] rounded-xl p-3.5 text-xs text-slate-300">
                Default API keys are securely loaded from your local <code className="text-emerald-400 font-mono">.env.local</code> file.
                You can override them below for browser-specific testing or enter custom Ollama URLs.
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Groq Cloud API Key
                  </label>
                  <input
                    type="password"
                    placeholder="gsk_..."
                    value={keysState.groq || ''}
                    onChange={(e) => setKeysState({ ...keysState, groq: e.target.value })}
                    className="w-full bg-[#090b10] border border-[#20283c] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    OpenRouter API Key
                  </label>
                  <input
                    type="password"
                    placeholder="sk-or-..."
                    value={keysState.openrouter || ''}
                    onChange={(e) => setKeysState({ ...keysState, openrouter: e.target.value })}
                    className="w-full bg-[#090b10] border border-[#20283c] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Google Gemini API Key
                  </label>
                  <input
                    type="password"
                    placeholder="AQ..."
                    value={keysState.gemini || ''}
                    onChange={(e) => setKeysState({ ...keysState, gemini: e.target.value })}
                    className="w-full bg-[#090b10] border border-[#20283c] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    NVIDIA NIM API Key
                  </label>
                  <input
                    type="password"
                    placeholder="nvapi-..."
                    value={keysState.nvidia || ''}
                    onChange={(e) => setKeysState({ ...keysState, nvidia: e.target.value })}
                    className="w-full bg-[#090b10] border border-[#20283c] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">
                    Ollama Base URL
                  </label>
                  <input
                    type="text"
                    placeholder="http://localhost:11434"
                    value={keysState.ollamaUrl || ''}
                    onChange={(e) => setKeysState({ ...keysState, ollamaUrl: e.target.value })}
                    className="w-full bg-[#090b10] border border-[#20283c] rounded-lg px-3 py-2 text-xs text-white font-mono"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      onSaveCustomKeys(keysState);
                      setActiveTab('models');
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
                  >
                    Save Custom Overrides
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#1b2234] bg-[#090b11] flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Active: <strong className="text-white font-mono">{selectedModelId}</strong> (
            {PROVIDERS[selectedProvider]?.name || selectedProvider})
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
