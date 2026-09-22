'use client';

import React, { useState } from 'react';
import { AppDataBackup, UserSettings } from '@/types';
import { getStoredData, saveStoredData } from '@/lib/storage';
import { clearPhotoVault } from '@/lib/photoStorage';
import { MODEL_CATALOGUE, getModelsForProvider } from '@/lib/ai/models';
import { ModelDefinition } from '@/lib/ai/types';
import {
  Settings,
  User,
  Moon,
  Clock,
  CheckSquare,
  Bot,
  Key,
  Database,
  Camera,
  Trash2,
  Download,
  Upload,
  Save,
  Check,
  Shield,
  Sparkles,
  Zap,
  Sliders,
  Palette,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface SettingsViewProps {
  appData: AppDataBackup;
  onUpdateSettings: (patch: Partial<UserSettings>) => void;
  onExportBackup: () => void;
  onImportBackup: (importedData: AppDataBackup) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  appData,
  onUpdateSettings,
  onExportBackup,
  onImportBackup,
}) => {
  const currentSettings: UserSettings = appData.settings || {
    userName: 'Athlete',
    theme: 'cyber-dark',
    sleepTargetHours: 8.0,
    targetBedtime: '23:00',
    targetWakeTime: '07:00',
    autoArchiveTasksAfterDays: 30,
    defaultLLMProvider: 'groq',
    defaultModelId: 'llama-3.3-70b-versatile',
    autoFallbackEnabled: true,
  };

  // Local form state
  const [userName, setUserName] = useState(currentSettings.userName);
  const [theme, setTheme] = useState(currentSettings.theme);
  const [sleepTargetHours, setSleepTargetHours] = useState(currentSettings.sleepTargetHours);
  const [targetBedtime, setTargetBedtime] = useState(currentSettings.targetBedtime);
  const [targetWakeTime, setTargetWakeTime] = useState(currentSettings.targetWakeTime);
  const [autoArchiveDays, setAutoArchiveDays] = useState(
    currentSettings.autoArchiveTasksAfterDays || 30
  );
  const [defaultProvider, setDefaultProvider] = useState(
    currentSettings.defaultLLMProvider || 'groq'
  );
  const [defaultModelId, setDefaultModelId] = useState(
    currentSettings.defaultModelId || 'llama-3.3-70b-versatile'
  );
  const [autoFallback, setAutoFallback] = useState(
    currentSettings.autoFallbackEnabled !== undefined ? currentSettings.autoFallbackEnabled : true
  );

  // Custom API keys
  const [groqKey, setGroqKey] = useState(currentSettings.customApiKeys?.groq || '');
  const [openRouterKey, setOpenRouterKey] = useState(
    currentSettings.customApiKeys?.openrouter || ''
  );
  const [geminiKey, setGeminiKey] = useState(currentSettings.customApiKeys?.gemini || '');
  const [nvidiaKey, setNvidiaKey] = useState(currentSettings.customApiKeys?.nvidia || '');
  const [ollamaUrl, setOllamaUrl] = useState(
    currentSettings.customApiKeys?.ollamaUrl || 'http://localhost:11434'
  );

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [vaultClearing, setVaultClearing] = useState(false);
  const [vaultClearedSuccess, setVaultClearedSuccess] = useState(false);

  // Calculate vault storage statistics
  const totalFitnessPhotos = Object.values(appData.fitnessPhotos || {}).reduce(
    (acc, list) => acc + (Array.isArray(list) ? list.length : 0),
    0
  );
  const totalSleepPhotos = Object.values(appData.sleepLogs || {}).reduce(
    (acc, log) => acc + (log.photoIds ? log.photoIds.length : 0),
    0
  );
  const totalPhotosCount = totalFitnessPhotos + totalSleepPhotos;

  const totalOrigKB = Object.values(appData.fitnessPhotos || {}).reduce(
    (acc, list) =>
      acc + (Array.isArray(list) ? list.reduce((sub, p) => sub + p.originalSizeKB, 0) : 0),
    0
  );
  const totalCompKB = Object.values(appData.fitnessPhotos || {}).reduce(
    (acc, list) =>
      acc + (Array.isArray(list) ? list.reduce((sub, p) => sub + p.compressedSizeKB, 0) : 0),
    0
  );
  const totalSavedMB = Math.max(0, (totalOrigKB - totalCompKB) / 1024).toFixed(1);
  const compressionRatio =
    totalOrigKB > 0 ? Math.round(((totalOrigKB - totalCompKB) / totalOrigKB) * 100) : 0;

  // Save changes
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    const patch: Partial<UserSettings> = {
      userName: userName.trim() || 'Athlete',
      theme,
      sleepTargetHours: Number(sleepTargetHours) || 8.0,
      targetBedtime,
      targetWakeTime,
      autoArchiveTasksAfterDays: Number(autoArchiveDays) || 30,
      defaultLLMProvider: defaultProvider,
      defaultModelId,
      autoFallbackEnabled: autoFallback,
      customApiKeys: {
        groq: groqKey.trim() || undefined,
        openrouter: openRouterKey.trim() || undefined,
        gemini: geminiKey.trim() || undefined,
        nvidia: nvidiaKey.trim() || undefined,
        ollamaUrl: ollamaUrl.trim() || undefined,
      },
    };

    onUpdateSettings(patch);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  // Clear photo vault
  const handleClearVault = async () => {
    const ok = window.confirm(
      'Are you sure you want to clear all binary images from IndexedDB? (Metadata logs will remain).'
    );
    if (!ok) return;

    setVaultClearing(true);
    try {
      await clearPhotoVault();
      setVaultClearedSuccess(true);
      setTimeout(() => setVaultClearedSuccess(false), 3000);
    } catch (err) {
      console.error('Error clearing photo vault:', err);
    } finally {
      setVaultClearing(false);
    }
  };

  // File input for JSON import
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && typeof parsed === 'object') {
          onImportBackup(parsed);
          alert('Backup successfully imported!');
        } else {
          alert('Invalid backup file format');
        }
      } catch (err) {
        alert('Failed to parse JSON file');
      }
    };
    reader.readAsText(file);
  };

  const availableModels = getModelsForProvider(defaultProvider);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="athletic-card rounded-2xl p-5 border border-[#1b2233] bg-gradient-to-br from-[#0c101a] via-[#090c14] to-[#0e1424]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <span>System Settings &amp; Preferences</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-purple-950 text-purple-400 border border-purple-800/40">
                  VIBE OS
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure athlete profile, sleep goals, LLM API keys, photo compression, and data storage.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg active-press self-start sm:self-auto"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Saved Changes!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4 stroke-[2.5]" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* SECTION 1: ATHLETE PROFILE & THEME */}
        <div className="athletic-card rounded-2xl p-5 border border-[#1b2233] bg-[#0c101a] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#161c2c] pb-3">
            <User className="w-4 h-4 text-emerald-400" />
            <span>Athlete Profile &amp; Appearance</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Athlete Call-Sign / Name
              </label>
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="e.g. Morariu / Elite Athlete"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-purple-400" />
                <span>Interface Theme</span>
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white focus:outline-none focus:border-purple-500 font-medium"
              >
                <option value="cyber-dark">Cyber Dark (Emerald &amp; Blue Accents)</option>
                <option value="midnight">Midnight Sapphire (Deep Blue)</option>
                <option value="stealth">Stealth Carbon (Monochrome Pro)</option>
              </select>
            </div>
          </div>
        </div>

        {/* SECTION 2: SLEEP & RECOVERY TARGETS */}
        <div className="athletic-card rounded-2xl p-5 border border-[#1b2233] bg-[#0c101a] space-y-4">
          <div className="flex items-center justify-between border-b border-[#161c2c] pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Moon className="w-4 h-4 text-indigo-400" />
              <span>Sleep &amp; Recovery Baseline</span>
            </div>
            <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/40">
              Target: {sleepTargetHours} hrs / night
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Nightly Duration Goal (Hours)
              </label>
              <input
                type="number"
                step="0.25"
                min="4"
                max="12"
                value={sleepTargetHours}
                onChange={(e) => setSleepTargetHours(parseFloat(e.target.value) || 8.0)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-400" />
                <span>Target Bedtime (24h)</span>
              </label>
              <input
                type="time"
                value={targetBedtime}
                onChange={(e) => setTargetBedtime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Target Wake Time (24h)</span>
              </label>
              <input
                type="time"
                value={targetWakeTime}
                onChange={(e) => setTargetWakeTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* SECTION 3: TASKS & PRODUCTIVITY CONFIGURATION */}
        <div className="athletic-card rounded-2xl p-5 border border-[#1b2233] bg-[#0c101a] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#161c2c] pb-3">
            <CheckSquare className="w-4 h-4 text-emerald-400" />
            <span>Tasks &amp; Auto-Archive Retention</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Retain Completed Tasks History (Days)
              </label>
              <input
                type="number"
                min="7"
                max="365"
                value={autoArchiveDays}
                onChange={(e) => setAutoArchiveDays(parseInt(e.target.value) || 30)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Completed tasks stay in lightweight history ledger without cluttering active view.
              </span>
            </div>

            <div className="bg-[#101422] border border-[#1d2538] rounded-xl p-3.5 flex flex-col justify-between">
              <span className="text-xs font-semibold text-white">Active Queue Status</span>
              <div className="flex items-center justify-between mt-2">
                <span className="text-xs text-slate-400 font-mono">
                  Pending: {(appData.tasks || []).length} tasks
                </span>
                <span className="text-xs text-emerald-400 font-mono">
                  Completed: {(appData.completedTasks || []).length} archived
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 4: LLM AI COACH & PROVIDER KEYS */}
        <div className="athletic-card rounded-2xl p-5 border border-[#1b2233] bg-[#0c101a] space-y-5">
          <div className="flex items-center justify-between border-b border-[#161c2c] pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Bot className="w-4 h-4 text-emerald-400" />
              <span>LLM Engine, Providers &amp; Failover Fallback</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
              <Sparkles className="w-3 h-3" />
              <span>Multi-Provider Active</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Default LLM Provider
              </label>
              <select
                value={defaultProvider}
                onChange={(e) => {
                  const prov = e.target.value as any;
                  setDefaultProvider(prov);
                  const provModels = getModelsForProvider(prov);
                  if (provModels.length > 0) {
                    setDefaultModelId(provModels[0].id);
                  }
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white focus:outline-none focus:border-emerald-500 font-semibold"
              >
                <option value="groq">Groq (Ultra-Fast Inference, Free Llama 3.3 / Qwen)</option>
                <option value="openrouter">OpenRouter (Free Catalog: DeepSeek R1, Llama 3.3)</option>
                <option value="gemini">Google Gemini (Gemini 2.5 Flash / 2.0 Flash)</option>
                <option value="nvidia">NVIDIA NIM (Nemotron 70B, Llama 3.1 405B)</option>
                <option value="ollama">Ollama (Local Offline Engine)</option>
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                Default Primary Model
              </label>
              <select
                value={defaultModelId}
                onChange={(e) => setDefaultModelId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white focus:outline-none focus:border-emerald-500 font-mono"
              >
                {availableModels.map((m: ModelDefinition) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.contextWindow ? `${(m.contextWindow / 1000).toFixed(0)}k` : 'auto'})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Automatic Fallback System Toggle */}
          <div className="bg-[#101422] border border-[#1e263c] rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white">
                  Intelligent Auto-Fallback Routing
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                If the selected model encounters rate limits or errors, automatically failover to the next fastest free model in the chain without interrupting conversation.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                type="checkbox"
                checked={autoFallback}
                onChange={(e) => setAutoFallback(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          {/* Custom API Key Overrides */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>Custom API Key Overrides (Optional - defaults to .env.local)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Groq API Key (gsk_...)
                </label>
                <input
                  type="password"
                  value={groqKey}
                  onChange={(e) => setGroqKey(e.target.value)}
                  placeholder="Override GROQ_API_KEY"
                  className="w-full px-3 py-2 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  OpenRouter API Key (sk-or-...)
                </label>
                <input
                  type="password"
                  value={openRouterKey}
                  onChange={(e) => setOpenRouterKey(e.target.value)}
                  placeholder="Override OPENROUTER_API_KEY"
                  className="w-full px-3 py-2 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Gemini API Key (AIzaSy...)
                </label>
                <input
                  type="password"
                  value={geminiKey}
                  onChange={(e) => setGeminiKey(e.target.value)}
                  placeholder="Override GEMINI_API_KEY"
                  className="w-full px-3 py-2 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  NVIDIA NIM API Key (nvapi-...)
                </label>
                <input
                  type="password"
                  value={nvidiaKey}
                  onChange={(e) => setNvidiaKey(e.target.value)}
                  placeholder="Override NVIDIA_API_KEY"
                  className="w-full px-3 py-2 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-[11px] font-mono text-slate-400 block mb-1">
                  Ollama Base URL (Local inference)
                </label>
                <input
                  type="text"
                  value={ollamaUrl}
                  onChange={(e) => setOllamaUrl(e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full px-3 py-2 rounded-xl bg-[#121624] border border-[#20283d] text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 5: PHOTO VAULT & COMPRESSION ENGINE STATS */}
        <div className="athletic-card rounded-2xl p-5 border border-[#1b2233] bg-[#0c101a] space-y-4">
          <div className="flex items-center justify-between border-b border-[#161c2c] pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Camera className="w-4 h-4 text-blue-400" />
              <span>iPhone 12 Compression Engine &amp; Photo Vault</span>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-400 border border-blue-800/40">
              IndexedDB Storage
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#101422] border border-[#1d2538] p-3 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Total Photos
              </span>
              <span className="text-base font-bold text-white font-numeric mt-1 block">
                {totalPhotosCount}
              </span>
            </div>

            <div className="bg-[#101422] border border-[#1d2538] p-3 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Data Saved
              </span>
              <span className="text-base font-bold text-emerald-400 font-numeric mt-1 block">
                {totalSavedMB} MB
              </span>
            </div>

            <div className="bg-[#101422] border border-[#1d2538] p-3 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Reduction Ratio
              </span>
              <span className="text-base font-bold text-blue-400 font-numeric mt-1 block">
                {compressionRatio}%
              </span>
            </div>

            <div className="bg-[#101422] border border-[#1d2538] p-3 rounded-xl">
              <span className="text-[10px] font-mono text-slate-400 uppercase block">
                Target Per Photo
              </span>
              <span className="text-base font-bold text-slate-300 font-mono mt-1 block">
                &lt; 950 KB
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-slate-400 max-w-lg">
              High-res photos are downscaled to 1600px max edge and compressed to ensure low footprint, stored in the browser's IndexedDB picture vault.
            </p>

            <button
              type="button"
              disabled={vaultClearing || totalPhotosCount === 0}
              onClick={handleClearVault}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-semibold transition disabled:opacity-40 whitespace-nowrap"
            >
              {vaultClearedSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Vault Cleared</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Clear Photo Vault</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SECTION 6: DATA BACKUP & RESTORE */}
        <div className="athletic-card rounded-2xl p-5 border border-[#1b2233] bg-[#0c101a] space-y-4">
          <div className="flex items-center gap-2 text-sm font-bold text-white border-b border-[#161c2c] pb-3">
            <Database className="w-4 h-4 text-emerald-400" />
            <span>Database Backup &amp; Disaster Recovery</span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white">Full JSON Application Snapshot</h4>
              <p className="text-[11px] text-slate-400">
                Exports all habits, workout logs, breaker records, action audit trail, tasks, sleep logs, and settings.
              </p>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={onExportBackup}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#141926] hover:bg-[#1b2234] text-slate-200 border border-[#252f47] text-xs font-semibold transition"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Export JSON</span>
              </button>

              <label className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#141926] hover:bg-[#1b2234] text-slate-200 border border-[#252f47] text-xs font-semibold transition cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-blue-400" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {savedSuccess && (
            <span className="text-xs text-emerald-400 font-mono flex items-center gap-1">
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>All settings and preferences saved!</span>
            </span>
          )}
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition shadow-lg active-press"
          >
            <Save className="w-4 h-4 stroke-[2.5]" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
