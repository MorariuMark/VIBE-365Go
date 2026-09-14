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
