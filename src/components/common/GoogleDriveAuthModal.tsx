import React, { useState, useEffect } from 'react';
import {
  X,
  CloudUpload,
  Key,
  ExternalLink,
  Download,
  Share2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FolderLock,
} from 'lucide-react';
import {
  GOOGLE_DRIVE_BACKUP_URL,
  DailyBackupRecord,
  getGoogleDriveToken,
  setGoogleDriveToken,
  clearGoogleDriveToken,
  exportToGoogleDrive,
  shareBackupNative,
  triggerInstantBackupDownload,
} from '@/lib/dailyBackup';
import { AppDataBackup, UserAccount } from '@/types';

interface GoogleDriveAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  appData: AppDataBackup;
  currentUser?: UserAccount | null;
  pendingRecord?: DailyBackupRecord | null;
  onExportSuccess: (filename: string, fileId?: string) => void;
}

export const GoogleDriveAuthModal: React.FC<GoogleDriveAuthModalProps> = ({
  isOpen,
  onClose,
  appData,
  currentUser,
  pendingRecord,
  onExportSuccess,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [hasExistingToken, setHasExistingToken] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = getGoogleDriveToken(currentUser, appData);
      if (existing) {
        setTokenInput(existing);
        setHasExistingToken(true);
      } else {
        setTokenInput('');
        setHasExistingToken(false);
      }
      setStatusMessage(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleSaveAndExport = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      setStatusMessage({
        type: 'error',
        text: 'Please paste your Google Drive access token.',
      });
      return;
    }

    setIsExporting(true);
    setStatusMessage({ type: 'info', text: 'Exporting directly to Google Drive...' });

    try {
      const res = await exportToGoogleDrive(appData, currentUser, cleanToken);
      if (res.success) {
        setHasExistingToken(true);
        setStatusMessage({
          type: 'success',
          text: `Exported to Google Drive successfully! (${res.filename})`,
        });
        setTimeout(() => {
          onExportSuccess(res.filename || 'backup.json', res.fileId);
          onClose();
        }, 1200);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Failed to export to Google Drive. Check token validity.',
        });
      }
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err?.message || 'Unexpected connection error.',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDisconnect = () => {
    clearGoogleDriveToken();
    setTokenInput('');
    setHasExistingToken(false);
    setStatusMessage({ type: 'info', text: 'Google Drive token removed.' });
  };

  const handleDeviceShare = async () => {
    const record = pendingRecord || triggerInstantBackupDownload(appData, currentUser);
    const shared = await shareBackupNative(record);
    if (shared) {
      onExportSuccess(record.filename);
      onClose();
    } else {
      setStatusMessage({
        type: 'info',
        text: 'Downloaded backup file. Choose Google Drive in your system files or share dialog.',
      });
    }
  };

  const handleDirectDownload = () => {
    const record = triggerInstantBackupDownload(appData, currentUser);
    setStatusMessage({
      type: 'success',
      text: `Downloaded ${record.filename} to your device.`,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#0b0f19] border border-[#1e293b] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#1e293b] flex items-center justify-between bg-gradient-to-r from-blue-950/40 to-[#0b0f19]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-500/15 text-blue-400 border border-blue-500/20">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base tracking-tight flex items-center gap-2">
                Export to Google Drive
              </h3>
              <p className="text-xs text-slate-400">
                Direct in-app cloud export without switching apps
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-surface-2 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Target Folder Banner */}
          <div className="p-3 rounded-xl bg-blue-950/25 border border-blue-800/40 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-blue-300 min-w-0">
              <FolderLock className="w-4 h-4 text-blue-400 flex-shrink-0" />
              <div className="truncate">
                <span className="text-slate-400">Target Folder: </span>
                <span className="font-mono text-white">1cU8Oz6IifBX_r3h0adHynWqCpt9u0C12</span>
              </div>
            </div>
            <a
              href={GOOGLE_DRIVE_BACKUP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-semibold flex-shrink-0 ml-2"
              title="Open folder in Google Drive web"
            >
              <span>View</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-700/50 text-emerald-300'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-950/40 border-rose-700/50 text-rose-300'
                  : 'bg-blue-950/40 border-blue-700/50 text-blue-300'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              ) : (
                <RefreshCw className="w-4 h-4 flex-shrink-0 animate-spin text-blue-400" />
              )}
              <span className="leading-snug">{statusMessage.text}</span>
            </div>
          )}

          {/* Direct Upload Token Form */}
          <form onSubmit={handleSaveAndExport} className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-blue-400" />
                  <span>Google Drive Access Token</span>
                </label>
                {hasExistingToken && (
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Connected
                  </span>
                )}
              </div>
              <input
                type="password"
                value={tokenInput}
                onChange={(e) => setTokenInput(e.target.value)}
                placeholder="ya29.a0AfH6..."
                className="w-full px-3 py-2 rounded-xl bg-surface-2 border border-surface-border text-white text-xs font-mono placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 leading-normal">
                Google requires an OAuth token for web apps to upload directly to your Drive folder. Enter your token once to enable instant automatic background uploads.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="submit"
                disabled={isExporting || !tokenInput.trim()}
                className="flex-1 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center justify-center gap-2 transition active-press shadow-md cursor-pointer"
              >
                {isExporting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Exporting to Drive...</span>
                  </>
                ) : (
                  <>
                    <CloudUpload className="w-3.5 h-3.5" />
                    <span>Save &amp; Export to Google Drive</span>
                  </>
                )}
              </button>

              {hasExistingToken && (
                <button
                  type="button"
                  onClick={handleDisconnect}
                  className="py-2 px-3 rounded-xl bg-surface-2 hover:bg-rose-500/20 text-slate-400 hover:text-rose-300 border border-surface-border text-xs font-medium transition cursor-pointer"
                  title="Remove saved token"
                >
                  Disconnect
                </button>
              )}
            </div>
          </form>

          {/* Quick iOS / Mobile Alternative */}
          <div className="pt-2 border-t border-[#1e293b]">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
              Instant Alternatives (No Token Required)
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDeviceShare}
                className="py-2 px-3 rounded-xl bg-[#141a29] hover:bg-[#1c2438] border border-[#232e47] text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition active-press cursor-pointer"
                title="Send directly to Google Drive via iOS / device share sheet"
              >
                <Share2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>iOS / Device Share</span>
              </button>

              <button
                type="button"
                onClick={handleDirectDownload}
                className="py-2 px-3 rounded-xl bg-[#141a29] hover:bg-[#1c2438] border border-[#232e47] text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition active-press cursor-pointer"
                title="Download backup file to phone"
              >
                <Download className="w-3.5 h-3.5 text-emerald-400" />
                <span>Download JSON File</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
