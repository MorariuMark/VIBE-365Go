'use client';

import React, { useState, useRef, useEffect } from 'react';
import { AppDataBackup, UserAccount } from '@/types';
import {
  exportDataAsJSON,
  importDataFromJSON,
  saveStoredData,
  resetAllDataToFresh,
  getSafetySnapshots,
  restoreSafetySnapshot,
  SafetySnapshotMeta,
} from '@/lib/storage';
import { getMockSampleBackup } from '@/lib/initialData';
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
  Trash2,
  ShieldCheck,
  History,
  ExternalLink,
  CloudUpload,
} from 'lucide-react';
import {
  CloudSyncStatus,
  syncCloudImmediate,
  loadCloudData,
  flushPendingOfflineSync,
} from '@/lib/cloudSync';
import {
  GOOGLE_DRIVE_BACKUP_URL,
  DailyBackupRecord,
  getDailyBackups,
  triggerInstantBackupDownload,
  openGoogleDriveBackupFolder,
  exportToGoogleDrive,
  getGoogleDriveToken,
} from '@/lib/dailyBackup';
import { GoogleDriveAuthModal } from './GoogleDriveAuthModal';

interface DataManagementModalProps {
  onClose: () => void;
  onDataLoaded: (newData: AppDataBackup) => void;
  currentData?: AppDataBackup;
  currentUser?: UserAccount | null;
  syncStatus?: CloudSyncStatus;
  lastSynced?: Date;
}

export const DataManagementModal: React.FC<DataManagementModalProps> = ({
  onClose,
  onDataLoaded,
  currentData,
  currentUser,
  syncStatus = 'idle',
  lastSynced,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isCloudBusy, setIsCloudBusy] = useState(false);
  const [snapshots, setSnapshots] = useState<SafetySnapshotMeta[]>([]);
  const [dailyBackups, setDailyBackups] = useState<DailyBackupRecord[]>([]);
  const [isExportingGdrive, setIsExportingGdrive] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingRecord, setPendingRecord] = useState<DailyBackupRecord | null>(null);

  // Load local safety snapshots and daily backups on modal open
  useEffect(() => {
    const list = getSafetySnapshots(currentUser?.id);
    setSnapshots(list);
    const backups = getDailyBackups(currentUser?.id);
    setDailyBackups(backups);
  }, [currentUser?.id]);

  const handleWipeAndStartFresh = async () => {
    if (
      window.confirm(
        'Erase all data and start completely fresh? This will wipe all habits, workouts, objectives, breakers, tasks, and sleep logs for this account.'
      )
    ) {
      const fresh = resetAllDataToFresh(currentUser?.id);
      onDataLoaded(fresh);
      await syncCloudImmediate(fresh, currentUser);
      setSuccessMessage('Successfully erased data for this account and started completely fresh.');
      setErrorMessage(null);
    }
  };

  const handleSyncNow = async () => {
    if (!currentData) return;
    setIsCloudBusy(true);
    setErrorMessage(null);
    try {
      await flushPendingOfflineSync();
      const ok = await syncCloudImmediate(currentData, currentUser);
      if (ok) {
        setSuccessMessage('Successfully synced latest data to Supabase cloud database.');
      } else {
        setErrorMessage('Cloud sync failed. Check your network connection.');
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
      const cloudData = await loadCloudData(currentUser);
      if (cloudData) {
        onDataLoaded(cloudData);
        setSuccessMessage('Successfully restored account state from Supabase cloud.');
      } else {
        setErrorMessage('No cloud record found yet for this account or table not ready.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Cloud pull error');
    } finally {
      setIsCloudBusy(false);
    }
  };

  const handleExportToGoogleDrive = async () => {
    if (!currentData) return;
    setIsExportingGdrive(true);
    setErrorMessage(null);
    try {
      const res = await exportToGoogleDrive(currentData, currentUser);
      if (res.success) {
        setDailyBackups(getDailyBackups(currentUser?.id));
        setSuccessMessage(`✓ Exported to Google Drive successfully! (${res.filename})`);
      } else if (res.needToken) {
        setPendingRecord(res.record || null);
        setIsAuthModalOpen(true);
      } else {
        setErrorMessage(res.error || 'Failed to export to Google Drive');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Export error');
    } finally {
      setIsExportingGdrive(false);
    }
  };

  const handleInstantDailyExport = () => {
    if (!currentData) return;
    try {
      const rec = triggerInstantBackupDownload(currentData, currentUser);
      setDailyBackups(getDailyBackups(currentUser?.id));
      setSuccessMessage(`Exported daily structured JSON backup: ${rec.filename}`);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(`Failed to export daily backup: ${err.message || ''}`);
    }
  };

  const handleDownloadSingleBackup = (record: DailyBackupRecord) => {
    try {
      const jsonContent = JSON.stringify(record.payload, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', url);
      downloadAnchor.setAttribute('download', record.filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setErrorMessage(`Download error: ${err.message || ''}`);
    }
  };

  const handleRestoreDailyBackup = async (record: DailyBackupRecord) => {
    if (
      !window.confirm(
        `Restore from backup "${record.filename}" (${record.dateISO} ${record.timeStr})? This will replace your active session with this snapshot and sync to cloud.`
      )
    ) {
      return;
    }

    try {
      saveStoredData(record.payload, currentUser?.id);
      onDataLoaded(record.payload);
      await syncCloudImmediate(record.payload, currentUser);
      setSuccessMessage(`Successfully restored backup from ${record.dateISO} ${record.timeStr} and synced to cloud!`);
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(`Restoration error: ${err.message || ''}`);
    }
  };

  const handleRestoreSnapshot = async (dateISO: string) => {
    if (
      !window.confirm(
        `Restore data from local safety snapshot of ${dateISO}? This will restore all habits, workouts, and logs from that snapshot and sync to cloud.`
      )
    ) {
      return;
    }

    try {
      const restored = restoreSafetySnapshot(dateISO, currentUser?.id);
      if (restored) {
        onDataLoaded(restored);
        await syncCloudImmediate(restored, currentUser);
        setSuccessMessage(`Successfully restored safety snapshot from ${dateISO} and synced to cloud!`);
        setErrorMessage(null);
      } else {
        setErrorMessage(`Could not read safety snapshot for ${dateISO}.`);
      }
    } catch (err: any) {
      setErrorMessage(`Snapshot restoration error: ${err.message || ''}`);
    }
  };

  const handleExport = () => {
    try {
      exportDataAsJSON(currentUser?.id);
      setSuccessMessage('Account backup successfully exported.');
      setErrorMessage(null);
    } catch (err: any) {
      setErrorMessage(err.message || 'Export failed.');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const imported = importDataFromJSON(text, currentUser?.id);
        onDataLoaded(imported);
        await syncCloudImmediate(imported, currentUser);
        setSuccessMessage('Account data successfully restored and synced to cloud.');
        setErrorMessage(null);
      } catch (err: any) {
        setErrorMessage('Invalid backup format: ' + (err.message || ''));
      }
    };
    reader.readAsText(file);
  };

  const handleResetToDemo = async () => {
    if (
      window.confirm(
        'CAUTION: Load demo template data? Only use this if you want to replace this account with mock demo workouts and habits.'
      )
    ) {
      const demo = getMockSampleBackup();
      saveStoredData(demo, currentUser?.id);
      onDataLoaded(demo);
      await syncCloudImmediate(demo, currentUser);
      setSuccessMessage('Loaded demo sample data for this account and synced to cloud.');
      setErrorMessage(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-surface-1 border border-surface-border w-full max-w-lg rounded-2xl shadow-2xl p-5 sm:p-6 relative my-auto max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/5 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-2">
          <Database className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-white">Data Sync &amp; Safety Vault</h3>
        </div>

        <p className="text-xs text-slate-400 mb-4">
          Real-time zero-delay Supabase sync, Google Drive structured daily backups, and local rolling snapshots.
        </p>

        {successMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-center gap-2 text-xs text-emerald-300">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mb-3 p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/40 flex items-center gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Supabase Cloud Section */}
        <div className="mb-4 p-3.5 rounded-xl bg-[#090d16] border border-[#1e2638]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400">
                <Cloud className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-bold text-white">Supabase Cloud Sync</span>
                <span className="block text-[10px] font-mono text-slate-400">
                  {lastSynced ? `Last Synced: ${lastSynced.toLocaleTimeString()}` : 'Live zero-delay auto sync'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  syncStatus === 'synced'
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : syncStatus === 'syncing'
                    ? 'bg-amber-400 animate-ping'
                    : syncStatus === 'offline'
                    ? 'bg-amber-400'
                    : 'bg-rose-400'
                }`}
              />
              <span className="text-[10px] font-mono text-slate-200 capitalize font-medium">{syncStatus}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            Every workout set, habit, and sleep log is immediately synced to Supabase database the moment it is inputted. If offline, changes are queued and automatically pushed upon reconnect.
          </p>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isCloudBusy}
              onClick={handleSyncNow}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition disabled:opacity-50 active-press cursor-pointer"
            >
              {isCloudBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              <span>Sync Cloud Now</span>
            </button>
            <button
              type="button"
              disabled={isCloudBusy}
              onClick={handleCloudPull}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 border border-blue-500/30 text-blue-300 text-xs font-semibold transition disabled:opacity-50 active-press cursor-pointer"
            >
              {isCloudBusy ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              <span>Pull from Cloud</span>
            </button>
          </div>
        </div>

        {/* Google Drive Cloud Vault & Daily Structured Backups */}
        <div className="mb-4 p-3.5 rounded-xl bg-[#090d16] border border-[#1e2638]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-white">Google Drive Backup Vault</span>
            </div>
            <span className="text-[10px] font-mono text-blue-400/90 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              {dailyBackups.length} Archived
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            Automatic and manual daily JSON exports structured with exact timestamps. If multiple backups happen in one day, all are archived and the latest is designated as primary reference.
          </p>

          <div className="grid grid-cols-2 gap-2 mb-3">
            <button
              type="button"
              onClick={handleExportToGoogleDrive}
              disabled={isExportingGdrive}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white text-xs font-semibold transition active-press cursor-pointer shadow-sm"
              title="Export structured JSON directly to Google Drive folder"
            >
              {isExportingGdrive ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Exporting to Drive...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-3.5 h-3.5 text-blue-200" />
                  <span>Export to Google Drive</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={handleInstantDailyExport}
              className="flex items-center justify-center gap-1.5 py-2 px-2.5 rounded-lg bg-[#141a29] hover:bg-[#1c2438] border border-[#232e47] text-slate-300 text-xs font-semibold transition active-press cursor-pointer"
              title="Download structured daily JSON file directly to device"
            >
              <Download className="w-3.5 h-3.5 text-indigo-400" />
              <span>Download JSON</span>
            </button>
          </div>

          {/* List of Archived Daily Backups */}
          {dailyBackups.length > 0 && (
            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
              {dailyBackups.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-2/60 border border-surface-border text-xs"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <History className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-white text-[11px] font-semibold">{b.dateISO}</span>
                        <span className="text-[9px] font-mono text-slate-400">{b.timeStr}</span>
                        {b.isLatestForDay ? (
                          <span className="text-[8px] font-mono uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-700/50 px-1 rounded font-bold">
                            Latest Reference
                          </span>
                        ) : (
                          <span className="text-[8px] font-mono text-slate-500 bg-slate-900 px-1 rounded">
                            Earlier
                          </span>
                        )}
                      </div>
                      <span className="block text-[10px] text-slate-400 truncate">
                        {b.summary.workoutsCount} workouts • {b.summary.habitsCount} habits • {b.summary.sleepCount} sleep
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDownloadSingleBackup(b)}
                      className="px-2 py-0.8 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono transition cursor-pointer"
                      title="Download this JSON"
                    >
                      Download
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRestoreDailyBackup(b)}
                      className="px-2 py-0.8 rounded bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold transition cursor-pointer"
                      title="Restore from this backup"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Local Rolling Safety Snapshots Section */}
        <div className="mb-4 p-3.5 rounded-xl bg-[#090d16] border border-[#1e2638]">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">Device Safety Snapshots (Rolling Backups)</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400/90 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              {snapshots.length} Available
            </span>
          </div>

          <p className="text-[11px] text-slate-400 mb-3">
            Independent daily snapshots stored locally on this device. Protected against browser refreshes, cache clearing, or account switches.
          </p>

          {snapshots.length === 0 ? (
            <div className="text-[11px] text-slate-500 italic py-2">
              Your first daily safety snapshot will be recorded automatically when you save changes today.
            </div>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {snapshots.map((snap) => (
                <div
                  key={snap.key}
                  className="flex items-center justify-between p-2 rounded-lg bg-surface-2/60 border border-surface-border text-xs"
                >
                  <div className="flex items-center gap-2">
                    <History className="w-3.5 h-3.5 text-slate-400" />
                    <div>
                      <span className="font-mono text-white text-[11px] font-semibold">{snap.dateISO}</span>
                      <span className="block text-[10px] text-slate-400">
                        {snap.workoutsCount} workouts • {snap.habitsCount} habits • {snap.sleepLogsCount} sleep logs
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRestoreSnapshot(snap.dateISO)}
                    className="px-2.5 py-1 rounded-md bg-emerald-500/15 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold transition active-press cursor-pointer"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* JSON Manual Export & Import */}
        <div className="space-y-2 mb-4">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
            Manual File Backup
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-surface-border text-white text-xs font-semibold transition active-press cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Export JSON</span>
            </button>

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
                className="w-full flex items-center justify-center gap-2 p-2.5 rounded-xl bg-surface-2 hover:bg-surface-3 border border-surface-border text-white text-xs font-semibold transition active-press cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-emerald-400" />
                <span>Import JSON</span>
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone: Erase / Demo */}
        <div className="space-y-2 pt-2 border-t border-surface-border">
          <div className="text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
            Maintenance
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* Force Reload / Clear Cache */}
            <button
              type="button"
              onClick={async () => {
                try {
                  if ('serviceWorker' in navigator) {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (const r of regs) await r.unregister();
                  }
                  if ('caches' in window) {
                    const keys = await caches.keys();
                    for (const k of keys) await caches.delete(k);
                  }
                } catch (_) {}
                window.location.href = window.location.origin + window.location.pathname + '?v=' + Date.now();
              }}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-purple-950/25 hover:bg-purple-900/40 border border-purple-800/40 text-purple-300 text-xs font-semibold transition active-press cursor-pointer"
              title="Clear cached PWA service worker and reload"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              <span>Reload PWA</span>
            </button>

            {/* Wipe & Fresh */}
            <button
              type="button"
              onClick={handleWipeAndStartFresh}
              className="flex items-center justify-center gap-1.5 p-2 rounded-xl bg-rose-950/25 hover:bg-rose-900/40 border border-rose-800/40 text-rose-300 text-xs font-semibold transition active-press cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Erase &amp; Clean</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleResetToDemo}
            className="w-full text-center py-1.5 text-[10px] text-slate-500 hover:text-slate-400 font-mono transition cursor-pointer"
          >
            Load Sample Template Data (Demo Only)
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-surface-border flex items-center justify-between">
          <span className="text-[10px] font-mono text-slate-500">
            Build: 2026.10.16 (Apple Health &amp; Drive Vault)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg bg-surface-2 text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Direct Google Drive Auth & Export Dialog */}
      {currentData && (
        <GoogleDriveAuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          appData={currentData}
          currentUser={currentUser}
          pendingRecord={pendingRecord}
          onExportSuccess={(filename) => {
            setDailyBackups(getDailyBackups(currentUser?.id));
            setSuccessMessage(`✓ Exported to Google Drive successfully! (${filename})`);
            setIsAuthModalOpen(false);
          }}
        />
      )}
    </div>
  );
};
