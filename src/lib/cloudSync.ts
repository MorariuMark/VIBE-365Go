import { AppDataBackup, UserAccount } from '@/types';
import { supabase } from './supabaseClient';
import { getStoredData, saveStoredData, normalizeAppData, mergeAppData } from './storage';

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
 * If Mark, ensures both legacy primary state and mark state are merged seamlessly,
 * and merged with any local device data so no workouts, habits, or sleep logs are ever lost.
 */
export async function loadCloudData(user?: UserAccount | null): Promise<AppDataBackup | null> {
  if (typeof window === 'undefined') return null;

  try {
    notifyListeners('syncing');

    const stateId = getCloudStateId(user);
    const isMark = !user || user.id === 'user_mark' || user.username.toLowerCase() === 'mark';

    let cloudPayload: AppDataBackup | null = null;

    if (isMark) {
      // 1. For Mark, query BOTH user_state_mark and primary_user_state to guarantee all past workouts are included
      const [markRes, primaryRes] = await Promise.all([
        supabase.from('vibe_app_state').select('payload, updated_at').eq('id', 'user_state_mark').maybeSingle(),
        supabase.from('vibe_app_state').select('payload, updated_at').eq('id', 'primary_user_state').maybeSingle(),
      ]);

      const markData = markRes.data?.payload ? normalizeAppData(markRes.data.payload) : null;
      const primaryData = primaryRes.data?.payload ? normalizeAppData(primaryRes.data.payload) : null;

      if (markData && primaryData) {
        cloudPayload = mergeAppData(primaryData, markData);
      } else {
        cloudPayload = markData || primaryData;
      }
    } else {
      // For other accounts, retrieve their isolated cloud slot
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
        cloudPayload = normalizeAppData(data.payload);
      }
    }

    // 2. Merge cloud data with device local storage so offline/local workouts are retained
    const local = getStoredData(user?.id);
    let finalPayload: AppDataBackup;

    if (cloudPayload && local) {
      finalPayload = mergeAppData(local, cloudPayload);
    } else if (cloudPayload) {
      finalPayload = cloudPayload;
    } else {
      finalPayload = local;
    }

    // Save final merged state to local storage
    saveStoredData(finalPayload, user?.id);

    // Sync merged state back to cloud so both slots are up-to-date
    await saveCloudDataImmediate(finalPayload, user);

    notifyListeners('synced');
    return finalPayload;
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

    let payloadToSave = data;

    // Safety guard: if attempting to save with 0 workouts for Mark, ensure we don't wipe out valid cloud workouts
    if (isMark && Object.keys(data.workoutLogs || {}).length === 0) {
      try {
        const { data: cloudCurrent } = await supabase
          .from('vibe_app_state')
          .select('payload')
          .eq('id', 'user_state_mark')
          .maybeSingle();

        if (cloudCurrent?.payload?.workoutLogs && Object.keys(cloudCurrent.payload.workoutLogs).length > 0) {
          console.warn('[CloudSync] Protected workoutLogs from accidental empty overwrite');
          payloadToSave = mergeAppData(normalizeAppData(cloudCurrent.payload), data);
        }
      } catch (checkErr) {
        console.warn('[CloudSync] Workout guard check failed', checkErr);
      }
    }

    const { error } = await supabase.from('vibe_app_state').upsert(
      {
        id: stateId,
        payload: payloadToSave,
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
            payload: payloadToSave,
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
