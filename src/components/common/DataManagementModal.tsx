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
  FileJson,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

interface DataManagementModalProps {
  onClose: () => void;
  onDataLoaded: (newData: AppDataBackup) => void;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  onClose,
  onDataLoaded,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = () => {
    try {
      exportDataAsJSON();
      setSuccessMessage('Data successfully exported as JSON file!');
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to export data');
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
        setSuccessMessage('Backup successfully restored from JSON!');
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage(
          'Invalid JSON file or missing required schema: ' + (err.message || '')
        );
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
      setSuccessMessage('Reset to rich demo data completed!');
      setErrorMessage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-cyan-400" />
          <h3 className="text-lg font-bold text-white">Data & Backup Center</h3>
        </div>

        <p className="text-xs text-slate-400 mb-5">
          All your habits, subtasks, split configurations, sticky exercises, drop-sets,
          and weight logs are stored locally and ready for database sync or JSON backup.
        </p>

        {successMessage && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/50 flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 flex items-center gap-2 text-xs text-rose-400">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="space-y-3">
          {/* Export Button */}
          <button
            type="button"
            onClick={handleExport}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white text-xs font-bold transition group"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                <Download className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div>Export Backup (JSON)</div>
                <div className="text-[10px] text-slate-400 font-normal">
                  Save all habits & gym records to local machine
                </div>
              </div>
            </div>
            <FileJson className="w-4 h-4 text-slate-400 group-hover:text-cyan-400 transition" />
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
              className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 border border-slate-700 text-white text-xs font-bold transition group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div>Import Backup (JSON)</div>
                  <div className="text-[10px] text-slate-400 font-normal">
                    Restore previously exported JSON backup
                  </div>
                </div>
              </div>
              <FileJson className="w-4 h-4 text-slate-400 group-hover:text-emerald-400 transition" />
            </button>
          </div>

          {/* Reset Demo Data */}
          <button
            type="button"
            onClick={handleResetToDemo}
            className="w-full flex items-center justify-between p-3.5 rounded-xl bg-slate-950 hover:bg-slate-800/80 border border-slate-800 text-slate-300 text-xs font-bold transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-slate-800 text-slate-400">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div className="text-left">
                <div>Load Sample Demo Data</div>
                <div className="text-[10px] text-slate-500 font-normal">
                  Restore rich 30-day logs & progressive overload PRs
                </div>
              </div>
            </div>
          </button>
        </div>

        <div className="mt-5 pt-4 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
