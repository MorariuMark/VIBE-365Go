'use client';

import React, { useState, useMemo } from 'react';
import { AppDataBackup } from '@/types';
import { ContextOptions, ContextSection, ContextTimeframe, ContextFormat } from '@/lib/ai/types';
import { buildAppContext } from '@/lib/ai/contextBuilder';
import {
  X,
  CheckCircle2,
  Dumbbell,
  ShieldAlert,
  Target,
  History,
  FileJson,
  FileText,
  Calendar,
  Sparkles,
  Copy,
  Check,
  Cpu,
  Layers,
  CheckSquare,
  Moon,
} from 'lucide-react';

interface ContextSelectorModalProps {
  appData: AppDataBackup;
  currentOptions: ContextOptions;
  isOpen: boolean;
  onClose: () => void;
  onApply: (options: ContextOptions) => void;
}

export const ContextSelectorModal: React.FC<ContextSelectorModalProps> = ({
  appData,
  currentOptions,
  isOpen,
  onClose,
  onApply,
}) => {
  const [sections, setSections] = useState<ContextSection[]>(currentOptions.sections);
  const [timeframe, setTimeframe] = useState<ContextTimeframe>(currentOptions.timeframe);
  const [startDate, setStartDate] = useState<string>(currentOptions.startDate || '');
  const [endDate, setEndDate] = useState<string>(currentOptions.endDate || '');
  const [format, setFormat] = useState<ContextFormat>(currentOptions.format);
  const [copied, setCopied] = useState(false);

  // Live computed context preview
  const preview = useMemo(() => {
    return buildAppContext(appData, {
      sections,
      timeframe,
      startDate,
      endDate,
      format,
      includeRawJsonDump: format === 'json',
    });
  }, [appData, sections, timeframe, startDate, endDate, format]);

  if (!isOpen) return null;

  const toggleSection = (s: ContextSection) => {
    if (sections.includes(s)) {
      if (sections.length > 1) {
        setSections(sections.filter((x) => x !== s));
      }
    } else {
      setSections([...sections, s]);
    }
  };

  const handleCopyPreview = () => {
    navigator.clipboard.writeText(preview.summaryText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onApply({
      sections,
      timeframe,
      startDate,
      endDate,
      format,
      includeRawJsonDump: format === 'json',
    });
    onClose();
  };

  // Presets
  const applyPreset = (type: 'json_dump' | 'today' | 'gym' | 'habits' | 'quarter' | 'routine') => {
    if (type === 'json_dump') {
      setSections(['habits', 'fitness', 'breakers', 'objectives', 'actions', 'tasks', 'sleep']);
      setTimeframe('all');
      setFormat('json');
    } else if (type === 'today') {
      setSections(['habits', 'fitness', 'tasks', 'sleep']);
      setTimeframe('today');
      setFormat('markdown');
    } else if (type === 'gym') {
      setSections(['fitness']);
      setTimeframe('month');
      setFormat('markdown');
    } else if (type === 'habits') {
      setSections(['habits', 'breakers']);
      setTimeframe('month');
      setFormat('markdown');
    } else if (type === 'routine') {
      setSections(['tasks', 'sleep', 'habits']);
      setTimeframe('week');
      setFormat('markdown');
    } else if (type === 'quarter') {
      setSections(['habits', 'fitness', 'breakers', 'objectives', 'tasks', 'sleep']);
      setTimeframe('quarter');
      setFormat('markdown');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-3xl max-h-[92vh] bg-[#0c0f17] border border-[#1f2638] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1b2234] bg-[#090b11]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                Context Data Stream Configurator
              </h3>
              <p className="text-xs text-slate-400">
                Choose what performance telemetry to inject into your AI Coach prompt.
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

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin scrollbar-thumb-[#1f2638]">
          {/* Quick Presets Bar */}
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Instant Presets</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPreset('json_dump')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                  format === 'json' && timeframe === 'all'
                    ? 'bg-purple-950/80 text-purple-300 border border-purple-700/60 shadow-sm'
                    : 'bg-[#121622] hover:bg-[#181e2e] text-slate-300 border border-[#21283d]'
                }`}
              >
                <FileJson className="w-3.5 h-3.5 text-purple-400" />
                <span>Dump Everything (JSON)</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('today')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#121622] hover:bg-[#181e2e] text-slate-300 border border-[#21283d] flex items-center gap-1.5 transition"
              >
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                <span>Today's Status</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('gym')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#121622] hover:bg-[#181e2e] text-slate-300 border border-[#21283d] flex items-center gap-1.5 transition"
              >
                <Dumbbell className="w-3.5 h-3.5 text-blue-400" />
                <span>Gym Overload (30d)</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('habits')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#121622] hover:bg-[#181e2e] text-slate-300 border border-[#21283d] flex items-center gap-1.5 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Habit Momentum (30d)</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('quarter')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#121622] hover:bg-[#181e2e] text-slate-300 border border-[#21283d] flex items-center gap-1.5 transition"
              >
                <Target className="w-3.5 h-3.5 text-amber-400" />
                <span>Quarterly Review (90d)</span>
              </button>

              <button
                type="button"
                onClick={() => applyPreset('routine')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#121622] hover:bg-[#181e2e] text-slate-300 border border-[#21283d] flex items-center gap-1.5 transition"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                <span>Routine & Rest (7d)</span>
              </button>
            </div>
          </div>

          {/* Section 1: Data Sections Selector */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 block">
              1. Target Telemetry Sections
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {/* Habits */}
              <button
                type="button"
                onClick={() => toggleSection('habits')}
                className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
                  sections.includes('habits')
                    ? 'bg-emerald-950/30 border-emerald-700/60 text-emerald-200'
                    : 'bg-[#10141e] border-[#1b2234] text-slate-400 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Habits & Streaks</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {appData.habits.length} habits configured
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    sections.includes('habits')
                      ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                      : 'border-slate-600'
                  }`}
                >
                  {sections.includes('habits') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* Fitness */}
              <button
                type="button"
                onClick={() => toggleSection('fitness')}
                className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
                  sections.includes('fitness')
                    ? 'bg-blue-950/30 border-blue-700/60 text-blue-200'
                    : 'bg-[#10141e] border-[#1b2234] text-slate-400 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Dumbbell className="w-4 h-4 text-blue-400" />
                    <span>Workouts & 1RM</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {Object.keys(appData.workoutLogs || {}).length} total sessions
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    sections.includes('fitness')
                      ? 'bg-blue-500 border-blue-400 text-slate-950'
                      : 'border-slate-600'
                  }`}
                >
                  {sections.includes('fitness') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* Habit Breakers */}
              <button
                type="button"
                onClick={() => toggleSection('breakers')}
                className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
                  sections.includes('breakers')
                    ? 'bg-rose-950/30 border-rose-700/60 text-rose-200'
                    : 'bg-[#10141e] border-[#1b2234] text-slate-400 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    <span>Habit Breakers</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {(appData.habitBreakers || []).length} active plans
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    sections.includes('breakers')
                      ? 'bg-rose-500 border-rose-400 text-slate-950'
                      : 'border-slate-600'
                  }`}
                >
                  {sections.includes('breakers') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* Objectives */}
              <button
                type="button"
                onClick={() => toggleSection('objectives')}
                className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
                  sections.includes('objectives')
                    ? 'bg-amber-950/30 border-amber-700/60 text-amber-200'
                    : 'bg-[#10141e] border-[#1b2234] text-slate-400 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Target className="w-4 h-4 text-amber-400" />
                    <span>Objectives</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {appData.objectives.length} targets set
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    sections.includes('objectives')
                      ? 'bg-amber-500 border-amber-400 text-slate-950'
                      : 'border-slate-600'
                  }`}
                >
                  {sections.includes('objectives') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* Action Audit Ledger */}
              <button
                type="button"
                onClick={() => toggleSection('actions')}
                className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
                  sections.includes('actions')
                    ? 'bg-purple-950/30 border-purple-700/60 text-purple-200'
                    : 'bg-[#10141e] border-[#1b2234] text-slate-400 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <History className="w-4 h-4 text-purple-400" />
                    <span>Audit Ledger</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {(appData.actionLogs || []).length} mutations
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    sections.includes('actions')
                      ? 'bg-purple-500 border-purple-400 text-slate-950'
                      : 'border-slate-600'
                  }`}
                >
                  {sections.includes('actions') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* Tasks & Deadlines */}
              <button
                type="button"
                onClick={() => toggleSection('tasks')}
                className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
                  sections.includes('tasks')
                    ? 'bg-sky-950/30 border-sky-700/60 text-sky-200'
                    : 'bg-[#10141e] border-[#1b2234] text-slate-400 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <CheckSquare className="w-4 h-4 text-sky-400" />
                    <span>Tasks & Deadlines</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {(appData.tasks || []).length} active, {(appData.completedTasks || []).length} completed
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    sections.includes('tasks')
                      ? 'bg-sky-500 border-sky-400 text-slate-950'
                      : 'border-slate-600'
                  }`}
                >
                  {sections.includes('tasks') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>

              {/* Sleep & Recovery */}
              <button
                type="button"
                onClick={() => toggleSection('sleep')}
                className={`p-3 rounded-xl border text-left flex items-start justify-between transition ${
                  sections.includes('sleep')
                    ? 'bg-indigo-950/30 border-indigo-700/60 text-indigo-200'
                    : 'bg-[#10141e] border-[#1b2234] text-slate-400 opacity-60'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-xs">
                    <Moon className="w-4 h-4 text-indigo-400" />
                    <span>Sleep & Recovery</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400">
                    {Object.keys(appData.sleepLogs || {}).length} nights logged
                  </div>
                </div>
                <div
                  className={`w-4 h-4 rounded border flex items-center justify-center ${
                    sections.includes('sleep')
                      ? 'bg-indigo-500 border-indigo-400 text-slate-950'
                      : 'border-slate-600'
                  }`}
                >
                  {sections.includes('sleep') && <Check className="w-3 h-3 stroke-[3]" />}
                </div>
              </button>
            </div>
          </div>

          {/* Section 2: Timeframe Selection */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 block">
              2. Observation Timeframe
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {[
                { id: 'today', label: 'Today' },
                { id: 'week', label: 'Past 7 Days' },
                { id: 'month', label: 'Past 30 Days' },
                { id: 'quarter', label: 'Past Quarter' },
                { id: 'custom', label: 'Custom Range' },
                { id: 'all', label: 'All History' },
              ].map((tf) => (
                <button
                  key={tf.id}
                  type="button"
                  onClick={() => setTimeframe(tf.id as ContextTimeframe)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-semibold border transition text-center ${
                    timeframe === tf.id
                      ? 'bg-[#1c2438] text-white border-emerald-500/70 shadow-sm'
                      : 'bg-[#0f121b] border-[#1d2334] text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>

            {timeframe === 'custom' && (
              <div className="mt-3 flex items-center gap-3 bg-[#10141e] p-3 rounded-xl border border-[#1e2538]">
                <div className="flex-1">
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-[#090b10] border border-[#20283c] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-mono text-slate-400 block mb-1">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-[#090b10] border border-[#20283c] rounded-lg px-2.5 py-1.5 text-xs text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Format Mode Selection */}
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 mb-2 block">
              3. Context Representation Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormat('markdown')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                  format === 'markdown'
                    ? 'bg-[#151c2c] border-emerald-500 text-white'
                    : 'bg-[#0f121b] border-[#1d2334] text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Structured Athletic Markdown</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Synthesized metrics, streak calculations, volume sums, and percentage milestones.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setFormat('json')}
                className={`p-3 rounded-xl border text-left flex items-start gap-3 transition ${
                  format === 'json'
                    ? 'bg-[#151c2c] border-purple-500 text-white'
                    : 'bg-[#0f121b] border-[#1d2334] text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileJson className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-xs">Full Raw JSON Dump</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">
                    Sends complete raw JSON records for exhaustive deep machine reasoning.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Section 4: Live Context Inspector & Token Gauge */}
          <div className="border border-[#1f2639] bg-[#07090e] rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-[#0e121c] border-b border-[#1c2234] flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="text-slate-300 font-bold">Live Context Stream Preview</span>
                <span className="text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40 text-[10px]">
                  ~{preview.estimatedTokens.toLocaleString()} tokens
                </span>
                <span className="text-slate-500 text-[10px]">
                  {preview.characterCount.toLocaleString()} chars
                </span>
              </div>

              <button
                onClick={handleCopyPreview}
                className="flex items-center gap-1 text-slate-400 hover:text-white transition text-xs"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
            </div>

            <pre className="p-4 text-[11px] font-mono text-slate-300 max-h-48 overflow-y-auto leading-relaxed scrollbar-thin scrollbar-thumb-[#1f2638]">
              <code>{preview.summaryText}</code>
            </pre>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-4 border-t border-[#1b2234] bg-[#090b11] flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Cpu className="w-4 h-4 text-emerald-400" />
            <span>
              Configured: <strong>{sections.length}</strong> sections • {preview.timeframeLabel}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#121622] hover:bg-[#181e2e] text-slate-300 border border-[#21283d] transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition shadow-sm active-press flex items-center gap-2"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>Apply Context Filter</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
