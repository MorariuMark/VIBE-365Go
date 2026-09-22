import { AppDataBackup } from '@/types';
import { supabase } from './supabaseClient';
import { getStoredData, saveStoredData } from './storage';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

type SyncListener = (status: CloudSyncStatus, lastSyncedAt?: Date, errorMsg?: string) => void;

const listeners: Set<SyncListener> = new Set();
let currentStatus: CloudSyncStatus = 'idle';
let lastSyncedTime: Date | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(currentStatus, lastSyncedTime);
  return () => {
    listeners.delete(listener);
  };
}

function notifyListeners(status: CloudSyncStatus, errorMsg?: string) {
  currentStatus = status;
  if (status === 'synced') {
    lastSyncedTime = new Date();
  }
  listeners.forEach((fn) => fn(currentStatus, lastSyncedTime, errorMsg));
}

/**
 * Loads the application state from Supabase cloud database.
 * If cloud has data, it updates local storage and returns it.
 * If offline or table not found, falls back gracefully to local storage.
 */
export async function loadCloudData(): Promise<AppDataBackup | null> {
  if (typeof window === 'undefined') return null;

  try {
    notifyListeners('syncing');

    const { data, error } = await supabase
      .from('vibe_app_state')
      .select('payload, updated_at')
      .eq('id', 'primary_user_state')
      .maybeSingle();

    if (error) {
      // Table doesn't exist yet or permission error
      console.warn('[CloudSync] Could not fetch cloud state:', error.message);
      notifyListeners('offline', error.message);
      return null;
    }

    if (data && data.payload) {
      const cloudPayload = data.payload as AppDataBackup;
      // Basic sanity validation
      if (cloudPayload.habits && cloudPayload.workoutLogs) {
        saveStoredData(cloudPayload);
        notifyListeners('synced');
        return cloudPayload;
      }
    }

    // No row in cloud yet; if we have local data, initialize the cloud with local data
    const local = getStoredData();
    if (local && local.habits) {
      await saveCloudDataImmediate(local);
    }
    notifyListeners('synced');
    return null;
  } catch (err: any) {
    console.warn('[CloudSync] Network error fetching cloud data:', err);
    notifyListeners('offline', err?.message);
    return null;
  }
}

/**
 * Immediate save of state to Supabase cloud
 */
export async function saveCloudDataImmediate(data: AppDataBackup): Promise<boolean> {
  try {
    notifyListeners('syncing');

    const { error } = await supabase
      .from('vibe_app_state')
      .upsert({
        id: 'primary_user_state',
        payload: data,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) {
      console.warn('[CloudSync] Upsert failed:', error.message);
      notifyListeners('error', error.message);
      return false;
    }

    notifyListeners('synced');
    return true;
  } catch (err: any) {
    console.warn('[CloudSync] Network error during save:', err);
    notifyListeners('offline', err?.message);
    return false;
  }
}

/**
 * Debounced background save to Supabase cloud.
 * Used whenever a user makes a change in the app (e.g. toggling habits, logging workouts).
 */
export function queueCloudSync(data: AppDataBackup, delayMs: number = 800): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  notifyListeners('syncing');
  debounceTimer = setTimeout(() => {
    saveCloudDataImmediate(data);
  }, delayMs);
}
