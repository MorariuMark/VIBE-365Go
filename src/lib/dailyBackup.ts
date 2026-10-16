import { AppDataBackup, UserAccount } from '@/types';
import { normalizeAppData } from './storage';

export const GOOGLE_DRIVE_BACKUP_URL =
  'https://drive.google.com/drive/folders/1cU8Oz6IifBX_r3h0adHynWqCpt9u0C12?dmr=1&ec=wgc-drive-%5Bmodule%5D-goto&q=sharedwith:public%20parent:1cU8Oz6IifBX_r3h0adHynWqCpt9u0C12';

export interface DailyBackupRecord {
  id: string; // e.g. "backup_2026-10-16_13-50-22"
  dateISO: string; // "YYYY-MM-DD"
  timestamp: string; // ISO datetime string
  timeStr: string; // "13:50:22"
  isLatestForDay: boolean;
  username: string;
  filename: string;
  summary: {
    habitsCount: number;
    workoutsCount: number;
    sleepCount: number;
    tasksCount: number;
    breakersCount: number;
    objectivesCount: number;
  };
  payload: AppDataBackup;
}

function getDailyVaultStorageKey(userId?: string): string {
  const isMark = !userId || userId === 'user_mark' || userId === 'mark';
  const u = isMark ? 'mark' : userId;
  return `vibe_daily_vault_backups_${u}`;
}

function getTodayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function getTimestampFormatted(d: Date): string {
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const day = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${y}-${m}-${day}_${hh}-${mm}-${ss}`;
}

/**
 * Retrieves all stored daily backup snapshots from device vault
 */
export function getDailyBackups(userId?: string): DailyBackupRecord[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = getDailyVaultStorageKey(userId);
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as DailyBackupRecord[];
  } catch (err) {
    console.warn('[DailyBackup] Failed to read backups vault:', err);
    return [];
  }
}

/**
 * Records a daily backup snapshot in local vault.
 * If two or more backups happen in one day, ALL of them are preserved,
 * and the latest one is marked with isLatestForDay = true for primary reference.
 */
export function recordDailyBackup(
  data: AppDataBackup,
  user?: UserAccount | null
): DailyBackupRecord {
  const now = new Date();
  const today = getTodayISO();
  const timestampStr = getTimestampFormatted(now);
  const username = user?.username ? user.username.toUpperCase() : 'MARK';
  const filename = `VIBE365_BACKUP_${username}_${timestampStr}.json`;

  const normalized = normalizeAppData(data);
  normalized.exportedAt = now.toISOString();

  const record: DailyBackupRecord = {
    id: `backup_${timestampStr}`,
    dateISO: today,
    timestamp: now.toISOString(),
    timeStr: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    isLatestForDay: true,
    username,
    filename,
    summary: {
      habitsCount: data.habits?.length || 0,
      workoutsCount: Object.keys(data.workoutLogs || {}).length,
      sleepCount: Object.keys(data.sleepLogs || {}).length,
      tasksCount: (data.tasks?.length || 0) + (data.completedTasks?.length || 0),
      breakersCount: data.habitBreakers?.length || 0,
      objectivesCount: data.objectives?.length || 0,
    },
    payload: normalized,
  };

  if (typeof window !== 'undefined') {
    try {
      const key = getDailyVaultStorageKey(user?.id);
      let list = getDailyBackups(user?.id);

      // Update previous records for today so isLatestForDay = false
      list = list.map((b) => {
        if (b.dateISO === today) {
          return { ...b, isLatestForDay: false };
        }
        return b;
      });

      // Add new record at top
      list.unshift(record);

      // Keep up to 30 historical backup snapshots
      if (list.length > 30) {
        list = list.slice(0, 30);
      }

      localStorage.setItem(key, JSON.stringify(list));
      localStorage.setItem(`vibe_last_daily_backup_date_${user?.id || 'mark'}`, today);
    } catch (err) {
      console.warn('[DailyBackup] Could not store backup record to localStorage:', err);
    }
  }

  return record;
}

/**
 * Triggers instant download of the structured daily JSON backup file,
 * formatted cleanly with date, time, and user metadata.
 */
export function triggerInstantBackupDownload(
  data: AppDataBackup,
  user?: UserAccount | null
): DailyBackupRecord {
  const record = recordDailyBackup(data, user);

  if (typeof window !== 'undefined') {
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
    } catch (err) {
      console.error('[DailyBackup] Failed to trigger file download:', err);
    }
  }

  return record;
}

/**
 * Checks if a backup has occurred today and returns status for reminders
 */
export function checkDailyBackupStatus(userId?: string): {
  backedUpToday: boolean;
  lastBackupDate?: string;
  latestBackup?: DailyBackupRecord;
} {
  if (typeof window === 'undefined') {
    return { backedUpToday: true };
  }

  const today = getTodayISO();
  const list = getDailyBackups(userId);
  const latest = list.length > 0 ? list[0] : undefined;

  const lastDateKey = `vibe_last_daily_backup_date_${userId || 'mark'}`;
  const recordedLastDate = localStorage.getItem(lastDateKey);

  const backedUpToday = Boolean(
    recordedLastDate === today || (latest && latest.dateISO === today)
  );

  return {
    backedUpToday,
    lastBackupDate: recordedLastDate || latest?.dateISO,
    latestBackup: latest,
  };
}

/**
 * Opens the target Google Drive backup folder in a new browser tab / Google Drive app
 */
export function openGoogleDriveBackupFolder(): void {
  if (typeof window !== 'undefined') {
    window.open(GOOGLE_DRIVE_BACKUP_URL, '_blank', 'noopener,noreferrer');
  }
}
