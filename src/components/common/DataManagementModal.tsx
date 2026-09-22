'use client';

import React, { useState, useRef } from 'react';
import { AppDataBackup } from '@/types';
import { exportDataAsJSON, importDataFromJSON, saveStoredData } from '@/lib/storage';
import { getFullDefaultBackup } from '@/lib/initialData';
import {
  Download,
  Upload,
  RotateCcw,
  X,
  Database,
  CheckCircle2,
  AlertTriangle,
  Cloud,
  CloudOff,
  RefreshCw,
} from 'lucide-react';
import { CloudSyncStatus, saveCloudDataImmediate, loadCloudData } from '@/lib/cloudSync';

interface DataManagementModalProps {
  onClose: () => void;
  onDataLoaded: (newData: AppDataBackup) => void;
  currentData?: AppDataBackup;
  syncStatus?: CloudSyncStatus;
  lastSynced?: Date;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  onClose,
  onDataLoaded,
  currentData,
  syncStatus = 'idle',
  lastSynced,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCloudBusy, setIsCloudBusy] = useState(false);

  const handleCloudPush = async () => {
    if (!currentData) return;
    setIsCloudBusy(true);
    setErrorMessage(null);
    try {
      const ok = await saveCloudDataImmediate(currentData);
      if (ok) {
        setSuccessMessage('Successfully pushed latest data to Supabase cloud.');
      } else {
        setErrorMessage('Cloud push failed. Make sure you ran supabase_setup.sql in Supabase.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Cloud sync error');
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleCloudPull = async () => {
    setIsCloudBusy(true);
    setErrorMessage(null);
    try {
      const cloudData = await loadCloudData();
      if (cloudData) {
        onDataLoaded(cloudData);
        setSuccessMessage('Successfully restored state from Supabase cloud.');
      } else {
        setErrorMessage('No cloud record found yet or table not ready. Run supabase_setup.sql in Supabase.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Cloud pull error');
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleExport = () => {
    try {
      exportDataAsJSON();
      setSuccessMessage('Backup successfully exported.');
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Export failed.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importDataFromJSON(text);
        onDataLoaded(imported);
        setSuccessMessage('Data successfully restored.');
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage('Invalid backup format: ' + (err.message || ''));
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDemo = () => {
    if (
      window.confirm(
        'Reset to sample template data? This will load rich demo habits, objectives, and progressive overload gym logs.'
      )
    ) {
      const demo = getFullDefaultBackup();
      saveStoredData(demo);
      onDataLoaded(demo);
      setSuccessMessage('Loaded demo sample data.');
      setErrorMessage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-1 border border-surface-border w-full max-w-md rounded-2xl shadow-xl p-5 sm:p-6 relative my-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <Database className="w-4 h-4 text-blue-400" />
          <h3 className="text-base font-semibold text-white">Data & Backup</h3>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          All records are stored locally and ready for JSON backup or database synchronization.
        </p>

        {successMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Supabase Cloud Section */}
        <div className="mb-4 p-3 rounded-xl bg-[#090d16] border border-[#1e2638]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-semibold text-white">Supabase Cloud Sync</span>
                <span className="block text-[10px] font-mono text-slate-400">
                  Project: vzdiltjsswuqrcvzyrfn
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : syncStatus === 'syncing'
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-slate-500'
                }`}
              />
              <span className="text-[10px] font-mono text-slate-300 capitalize">{syncStatus}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            Automatic real-time sync connects your mobile phone and desktop seamlessly with zero manual export/import needed.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isCloudBusy}
              onClick={handleCloudPush}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition disabled:opacity-50"
            >
              {isCloudBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Push to Cloud</span>
            </button>
            <button
              type="button"
              disabled={isCloudBusy}
              onClick={handleCloudPull}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-300 text-xs font-semibold transition disabled:opacity-50"
            >
              {isCloudBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Pull from Cloud</span>
            </button>
          </div>
        </div>

        <div className="space-y-2">

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-2 hover:bg-surface-3 border border-surface-border text-white text-xs font-semibold transition active-press"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                <Download className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div>Export Backup (JSON)</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  Save all habits, splits, and workout logs
                </div>
              </div>
            </div>
          </button>

          {/* Import Button */}
          <div>
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
              className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-2 hover:bg-surface-3 border border-surface-border text-white text-xs font-semibold transition active-press"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div>Import Backup (JSON)</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Restore previously exported JSON data
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Reset Demo Data */}
          <button
            type="button"
            onClick={handleResetToDemo}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-surface-1 hover:bg-surface-2 border border-surface-border text-slate-300 text-xs font-semibold transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-surface-2 text-slate-400">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div>Load Sample Dataset</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  Re-seed 30 days of workouts and progressive overload
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-surface-border flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-surface-2 text-xs text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
