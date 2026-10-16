import { AppDataBackup, UserAccount } from '@/types';
import { supabase } from './supabaseClient';
import { getStoredData, saveStoredData, normalizeAppData, mergeAppData } from './storage';

export type CloudSyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error';

type SyncListener = (status: CloudSyncStatus, lastSyncedAt?: Date, errorMsg?: string) => void;

const listeners: Set<SyncListener> = new Set();
let currentStatus: CloudSyncStatus = 'idle';
let lastSyncedTime: Date | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// Concurrency queue tracking
let isUpsertRunning = false;
let queuedPayload: AppDataBackup | null = null;
let queuedUser: UserAccount | null | undefined = null;
let activeUpsertPromise: Promise<boolean> | null = null;

export const PENDING_OFFLINE_SYNC_KEY = 'vibe_pending_offline_sync';

export interface PendingOfflineSyncRecord {
  payload: AppDataBackup;
  userId?: string;
  username?: string;
  stateId: string;
  timestamp: string;
}

export function subscribeSyncStatus(listener: SyncListener): () => void {
  listeners.add(listener);
  listener(currentStatus, lastSyncedTime);
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncStatus(): { status: CloudSyncStatus; lastSynced?: Date } {
  return { status: currentStatus, lastSynced: lastSyncedTime };
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

export function getPendingOfflineSync(): PendingOfflineSyncRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PENDING_OFFLINE_SYNC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingOfflineSyncRecord;
  } catch (err) {
    console.warn('[CloudSync] Failed to read pending offline sync:', err);
    return null;
  }
}

export function markPendingOfflineSync(data: AppDataBackup, user?: UserAccount | null): void {
  if (typeof window === 'undefined') return;
  try {
    const record: PendingOfflineSyncRecord = {
      payload: data,
      userId: user?.id,
      username: user?.username,
      stateId: getCloudStateId(user),
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(PENDING_OFFLINE_SYNC_KEY, JSON.stringify(record));
  } catch (err) {
    console.warn('[CloudSync] Failed to write offline sync queue:', err);
  }
}

export function clearPendingOfflineSync(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PENDING_OFFLINE_SYNC_KEY);
  } catch (_) {}
}

export function hasPendingOfflineSync(): boolean {
  return getPendingOfflineSync() !== null;
}

/**
 * Core upsert execution to Supabase with workout guard and dual-write for Mark
 */
async function executeSupabaseUpsert(
  data: AppDataBackup,
  user?: UserAccount | null
): Promise<boolean> {
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
}

/**
 * Immediate, zero-delay cloud synchronization to Supabase.
 * Uses concurrency queue so rapid inputs (e.g. fast checkbox clicks or set additions)
 * never race and always ensure the freshest state reaches the database.
 */
export async function syncCloudImmediate(
  data: AppDataBackup,
  user?: UserAccount | null
): Promise<boolean> {
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  queuedPayload = data;
  queuedUser = user;

  if (activeUpsertPromise) {
    return activeUpsertPromise;
  }

  activeUpsertPromise = (async () => {
    notifyListeners('syncing');
    let overallSuccess = true;

    try {
      while (queuedPayload !== null) {
        const payloadToSave = queuedPayload;
        const userToSave = queuedUser;
        queuedPayload = null;
        queuedUser = null;

        const success = await executeSupabaseUpsert(payloadToSave, userToSave);
        if (!success) {
          overallSuccess = false;
          markPendingOfflineSync(payloadToSave, userToSave);
        } else {
          clearPendingOfflineSync();
        }
      }
    } catch (err: any) {
      console.warn('[CloudSync] Network error during immediate sync:', err);
      overallSuccess = false;
      if (queuedPayload) {
        markPendingOfflineSync(queuedPayload, queuedUser);
      } else {
        markPendingOfflineSync(data, user);
      }
      notifyListeners('offline', err?.message);
    } finally {
      activeUpsertPromise = null;
    }

    return overallSuccess;
  })();

  return activeUpsertPromise;
}

// Backward-compatible alias
export const saveCloudDataImmediate = syncCloudImmediate;

/**
 * Background save with optional delay (defaults to 0 for immediate zero-delay persistence).
 */
export function queueCloudSync(
  data: AppDataBackup,
  user?: UserAccount | null,
  delayMs: number = 0
): void {
  if (delayMs <= 0) {
    syncCloudImmediate(data, user);
    return;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  notifyListeners('syncing');
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    syncCloudImmediate(data, user);
  }, delayMs);
}

/**
 * Flushes any pending offline sync queue to Supabase
 */
export async function flushPendingOfflineSync(): Promise<boolean> {
  const pending = getPendingOfflineSync();
  if (!pending || !pending.payload) return false;

  console.log('[CloudSync] Flushing pending offline sync queued at:', pending.timestamp);
  const mockUser: UserAccount | undefined = pending.userId
    ? ({ id: pending.userId, username: pending.username || 'user' } as UserAccount)
    : undefined;

  const success = await syncCloudImmediate(normalizeAppData(pending.payload), mockUser);
  if (success) {
    clearPendingOfflineSync();
    console.log('[CloudSync] Offline queue successfully flushed to Supabase');
  }
  return success;
}

/**
 * Loads the application state from Supabase cloud database for the specific user.
 * Merges cloud data with any local device data and offline queues so no workouts,
 * habits, or sleep logs are ever lost.
 */
export async function loadCloudData(user?: UserAccount | null): Promise<AppDataBackup | null> {
  if (typeof window === 'undefined') return null;

  try {
    notifyListeners('syncing');

    const stateId = getCloudStateId(user);
    const isMark = !user || user.id === 'user_mark' || user.username.toLowerCase() === 'mark';

    let cloudPayload: AppDataBackup | null = null;

    if (isMark) {
      // Prioritize user_state_mark which is the primary dedicated account record
      const { data: markRes, error: markErr } = await supabase
        .from('vibe_app_state')
        .select('payload, updated_at')
        .eq('id', 'user_state_mark')
        .maybeSingle();

      if (!markErr && markRes?.payload) {
        cloudPayload = normalizeAppData(markRes.payload);
      } else {
        const { data: primaryRes } = await supabase
          .from('vibe_app_state')
          .select('payload, updated_at')
          .eq('id', 'primary_user_state')
          .maybeSingle();
        if (primaryRes?.payload) {
          cloudPayload = normalizeAppData(primaryRes.payload);
        }
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

    const local = getStoredData(user?.id);
    const pendingOffline = getPendingOfflineSync();

    let finalPayload: AppDataBackup;

    if (cloudPayload) {
      if (pendingOffline?.payload) {
        // If this device explicitly accumulated offline mutations while disconnected,
        // merge them on top of the fresh cloud state and sync back
        finalPayload = mergeAppData(cloudPayload, normalizeAppData(pendingOffline.payload));
        await syncCloudImmediate(finalPayload, user);
        clearPendingOfflineSync();
      } else {
        // NO un-synced offline edits waiting on this device:
        // Cloud state from Supabase IS the single source of truth!
        // This ensures changes made on phone immediately and seamlessly reflect on PC!
        finalPayload = cloudPayload;
      }
    } else {
      finalPayload = local;
    }

    // Update this device's local storage with the authoritative state
    saveStoredData(finalPayload, user?.id);
    notifyListeners('synced');
    return finalPayload;
  } catch (err: any) {
    console.warn('[CloudSync] Network error fetching cloud data:', err);
    notifyListeners('offline', err?.message);
    return null;
  }
}

/**
 * Real-time cloud subscription using Supabase Postgres Changes.
 * When changes are made on another device (e.g. phone), Supabase broadcasts
 * the change live. The PC receives it in <100ms and updates the screen seamlessly!
 */
export function subscribeToCloudChanges(
  user: UserAccount | null | undefined,
  onRemoteChange: (newData: AppDataBackup) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  const stateId = getCloudStateId(user);
  const channelName = `realtime_${stateId}_${Date.now()}`;

  const channel = supabase
    .channel(channelName)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'vibe_app_state',
        filter: `id=eq.${stateId}`,
      },
      (change) => {
        if (change.new && (change.new as any).payload) {
          console.log('[CloudSync Realtime] Live cloud update received for', stateId);
          const freshData = normalizeAppData((change.new as any).payload);
          saveStoredData(freshData, user?.id);
          notifyListeners('synced');
          onRemoteChange(freshData);
        }
      }
    )
    .subscribe((status) => {
      console.log(`[CloudSync Realtime] Subscribed to ${stateId} with status:`, status);
    });

  return () => {
    supabase.removeChannel(channel);
  };
}

// Mobile and browser lifecycle automatic flush listeners
if (typeof window !== 'undefined') {
  // Reconnect online
  window.addEventListener('online', () => {
    flushPendingOfflineSync();
  });

  // App/tab regained focus
  window.addEventListener('focus', () => {
    flushPendingOfflineSync();
  });

  // iOS WebKit suspension & backgrounding guard:
  // When user locks phone or switches apps, visibilitychange fires immediately.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }
      if (queuedPayload) {
        syncCloudImmediate(queuedPayload, queuedUser);
      }
      flushPendingOfflineSync();
    }
  });

  // Page hide / unload guard
  window.addEventListener('pagehide', () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    if (queuedPayload) {
      syncCloudImmediate(queuedPayload, queuedUser);
    }
    flushPendingOfflineSync();
  });
}
