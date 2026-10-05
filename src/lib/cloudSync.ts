import { AppDataBackup, UserAccount } from '@/types';
import { supabase } from './supabaseClient';
import { getStoredData, saveStoredData, normalizeAppData } from './storage';

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
 * Resolves the Supabase record ID for a given user account
 */
export function getCloudStateId(user?: UserAccount | null): string {
  if (!user) return 'primary_user_state';
  const isMark = user.id === 'user_mark' || user.username.toLowerCase() === 'mark';
  if (isMark) return 'user_state_mark';
  return user.stateId || `user_state_${user.id}`;
}

/**
 * Loads the application state from Supabase cloud database for the specific user.
 * If Mark, ensures existing primary state data is preserved and loaded.
 * For new users, retrieves their isolated state.
 */
export async function loadCloudData(user?: UserAccount | null): Promise<AppDataBackup | null> {
  if (typeof window === 'undefined') return null;

  try {
    notifyListeners('syncing');

    const stateId = getCloudStateId(user);
    const isMark = !user || user.id === 'user_mark' || user.username.toLowerCase() === 'mark';

    // 1. Fetch user-specific cloud state
    const { data, error } = await supabase
      .from('vibe_app_state')
      .select('payload, updated_at')
      .eq('id', stateId)
      .maybeSingle();

    if (error) {
      console.warn('[CloudSync] Could not fetch cloud state:', error.message);
      notifyListeners('offline', error.message);
      return null;
    }

    if (data && data.payload) {
      const cloudPayload = normalizeAppData(data.payload);
      saveStoredData(cloudPayload, user?.id);
      notifyListeners('synced');
      return cloudPayload;
    }

    // 2. If Mark and no user_state_mark exists yet, load from legacy primary_user_state
    if (isMark) {
      const { data: legacyData } = await supabase
        .from('vibe_app_state')
        .select('payload, updated_at')
        .eq('id', 'primary_user_state')
        .maybeSingle();

      if (legacyData && legacyData.payload) {
        const cloudPayload = normalizeAppData(legacyData.payload);
        // Save to Mark's isolated cloud slot and local storage
        saveStoredData(cloudPayload, user?.id);
        await saveCloudDataImmediate(cloudPayload, user);
        notifyListeners('synced');
        return cloudPayload;
      }
    }

    // 3. No cloud row yet; initialize cloud with user's local data
    const local = getStoredData(user?.id);
    if (local) {
      await saveCloudDataImmediate(local, user);
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
 * Immediate save of state to Supabase cloud for the active user
 */
export async function saveCloudDataImmediate(
  data: AppDataBackup,
  user?: UserAccount | null
): Promise<boolean> {
  try {
    notifyListeners('syncing');

    const stateId = getCloudStateId(user);
    const isMark = !user || user.id === 'user_mark' || user.username.toLowerCase() === 'mark';

    const { error } = await supabase.from('vibe_app_state').upsert(
      {
        id: stateId,
        payload: data,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (error) {
      console.warn('[CloudSync] Upsert failed:', error.message);
      notifyListeners('error', error.message);
      return false;
    }

    // If Mark, also keep legacy primary_user_state updated as redundant backup
    if (isMark) {
      try {
        await supabase.from('vibe_app_state').upsert(
          {
            id: 'primary_user_state',
            payload: data,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );
      } catch (legacyErr) {
        console.warn('[CloudSync] Legacy sync note', legacyErr);
      }
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
 */
export function queueCloudSync(
  data: AppDataBackup,
  user?: UserAccount | null,
  delayMs: number = 800
): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  notifyListeners('syncing');
  debounceTimer = setTimeout(() => {
    saveCloudDataImmediate(data, user);
  }, delayMs);
}
