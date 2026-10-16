'use client';

import React, { useState, useRef } from 'react';
import { SleepLog } from '@/types';
import { parseAppleHealthSleepJSON } from '@/lib/appleHealth/sleepParser';
import {
  X,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Clock,
  Sparkles,
  ArrowRight,
  Clipboard,
  Calendar,
} from 'lucide-react';
import { formatDatePretty, formatSleepDisplay } from '@/lib/utils';

interface SleepImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (importedLogs: Record<string, SleepLog>) => void;
  targetSleepHours?: number;
}

export const SleepImportModal: React.FC<SleepImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
  targetSleepHours = 8.0,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pasteText, setPasteText] = useState<string>('');
  const [isPasting, setIsPasting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedLogs, setParsedLogs] = useState<Record<string, SleepLog> | null>(null);

  if (!isOpen) return null;

  const handleProcessJSON = (jsonText: string) => {
    setErrorMessage(null);
    try {
      const logs = parseAppleHealthSleepJSON(jsonText, targetSleepHours);
      const dates = Object.keys(logs);
      if (dates.length === 0) {
        setErrorMessage(
          'No sleep records found in the provided JSON. Make sure it contains an Apple Health "sleep_analysis" export or VIBE-365 sleepLogs.'
        );
        setParsedLogs(null);
        return;
      }
      setParsedLogs(logs);
    } catch (err: any) {
      setErrorMessage(`Failed to parse JSON: ${err.message || 'Invalid format'}`);
      setParsedLogs(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessJSON(content);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read the selected file.');
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = () => {
    if (!parsedLogs) return;
    onImport(parsedLogs);
    onClose();
  };

  const sortedDates = parsedLogs ? Object.keys(parsedLogs).sort() : [];
  const earliestDate = sortedDates.length > 0 ? sortedDates[0] : '';
  const latestDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : '';

  const totalHours = parsedLogs
    ? Object.values(parsedLogs).reduce((acc, log) => acc + log.durationHours, 0)
    : 0;
  const avgHours = sortedDates.length > 0 ? (totalHours / sortedDates.length).toFixed(1) : '0';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md overflow-y-auto">
      <div className="bg-[#0b0e17] border border-[#1d2538] w-full max-w-xl rounded-2xl shadow-2xl p-5 sm:p-6 relative my-auto max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div className="p-2 rounded-xl bg-indigo-950/80 border border-indigo-700/50 text-indigo-400">
            <FileJson className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-sans">
              Import Apple Health Sleep Data
            </h3>
            <span className="text-[10px] font-mono text-indigo-400/90 uppercase tracking-wider">
              Apple Watch • AutoSleep • Health App JSON
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Select or paste your Apple Health export. Sleep stages (Core, Deep, REM, Awake) will be automatically parsed and merged into your account.
        </p>

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Input Methods: File Upload or Paste */}
        {!parsedLogs && (
          <div className="space-y-3 mb-4">
            {/* Upload File Zone */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full p-6 rounded-2xl bg-[#0e1320] hover:bg-[#131b2e] border-2 border-dashed border-[#242f47] hover:border-indigo-500/60 transition flex flex-col items-center justify-center gap-2 text-center group cursor-pointer"
            >
              <div className="p-3 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition">
                <Upload className="w-6 h-6" />
              </div>
              <span className="text-sm font-semibold text-white">Choose Apple Health JSON File</span>
              <span className="text-[11px] text-slate-500">
                Supports iPhone Health, Apple Watch export, or AutoSleep JSON
              </span>
            </button>

            {/* Paste Button Toggle */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase">Or Paste Directly</span>
              <button
                type="button"
                onClick={() => setIsPasting(!isPasting)}
                className="text-xs font-mono text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition"
              >
                <Clipboard className="w-3.5 h-3.5" />
                <span>{isPasting ? 'Hide Paste Area' : 'Paste Raw JSON Text'}</span>
              </button>
            </div>

            {isPasting && (
              <div className="space-y-2 pt-1">
                <textarea
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  placeholder="Paste Apple Health JSON here: { data: { metrics: [...] } }"
                  rows={6}
                  className="w-full p-3 rounded-xl bg-[#070910] border border-[#1f283d] text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  disabled={!pasteText.trim()}
                  onClick={() => handleProcessJSON(pasteText)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold transition disabled:opacity-50 active-press"
                >
                  Analyze &amp; Preview Sleep Data
                </button>
              </div>
            )}
          </div>
        )}

        {/* Parsed Preview Section */}
        {parsedLogs && (
          <div className="space-y-4 mb-4">
            {/* Summary Banner */}
            <div className="p-3.5 rounded-xl bg-indigo-950/30 border border-indigo-700/40 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-sm font-bold text-white block">
                    {sortedDates.length} Nights Successfully Detected
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {earliestDate} to {latestDate} • Avg: {avgHours}h/night
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setParsedLogs(null)}
                className="text-[11px] font-mono text-slate-400 hover:text-white underline"
              >
                Reset
              </button>
            </div>

            {/* Sample Table Preview */}
            <div className="border border-[#1b2234] rounded-xl overflow-hidden bg-[#080b12]">
              <div className="px-3 py-2 bg-[#0e1320] border-b border-[#1b2234] text-[10px] font-mono text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Date &amp; Schedule</span>
                <span>Duration • Score</span>
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-[#151c2c] text-xs">
                {sortedDates.map((date) => {
                  const log = parsedLogs[date];
                  return (
                    <div key={date} className="px-3 py-2 flex items-center justify-between">
                      <div>
                        <div className="font-mono text-slate-200 font-bold">{date}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          {log.bedtime} → {log.wakeTime}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-emerald-400 font-bold">
                          {log.durationTime} ({log.durationHours}h)
                        </div>
                        <div className="text-[10px] text-indigo-400/90 font-mono">
                          Score: {log.qualityScore}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
              <Sparkles className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <span>
                Importing will automatically fill in missing days and enhance your existing sleep logs without erasing custom notes or photos.
              </span>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => setParsedLogs(null)}
                className="py-2.5 px-3 rounded-xl bg-surface-2 hover:bg-surface-3 border border-surface-border text-xs font-semibold text-slate-300 transition"
              >
                Back / Change File
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 active-press shadow-lg shadow-emerald-950/50"
              >
                <span>Import {sortedDates.length} Nights</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-surface-border flex items-center justify-between text-[10px] font-mono text-slate-500">
          <span>Format: Apple Health Sleep Metrics</span>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
