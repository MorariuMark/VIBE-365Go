import { AppUserAccount, StoredUserRecord, AuthSession, UsersRegistry, AppDataBackup } from '@/types';
import { supabase } from './supabaseClient';
import { getFullDefaultBackup, INITIAL_SETTINGS } from './initialData';
import { saveStoredData } from './storage';

export const LOCAL_SESSION_KEY = 'vibe_auth_session';
export const SESSION_STORAGE_KEY = 'vibe_auth_session';
export const REGISTRY_CACHE_KEY = 'vibe_users_registry_cache';
export const REGISTRY_SUPABASE_ID = 'vibe_users_registry';

/**
 * Pre-configured primary account for Mark with password: John1234
 */
export const DEFAULT_MARK_USER: StoredUserRecord = {
  id: 'user_mark',
  username: 'Mark',
  displayName: 'Mark',
  passwordHash: '8cf1b9b71be2f61d26060bc778c91e8adf5048ef4d86e0c5445e4363917a164c',
  salt: 'mark_vibe_salt_2026',
  stateId: 'user_state_mark',
  createdAt: '2026-09-01T00:00:00.000Z',
};

/**
 * Hash password using Web Crypto SHA-256 with user-specific salt and system pepper
 */
export async function hashPassword(password: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const data = enc.encode(`${salt}:${password}:vibe_secret_pepper`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates a cryptographically random salt string
 */
export function generateSalt(): string {
  if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
    const arr = new Uint8Array(16);
    window.crypto.getRandomValues(arr);
    return Array.from(arr).map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Ensures Mark's default user is present in the registry list
 */
function ensureMarkInRegistry(users: StoredUserRecord[]): StoredUserRecord[] {
  const hasMark = users.some(
    (u) => u.username.toLowerCase() === 'mark' || u.id === 'user_mark'
  );
  if (!hasMark) {
    return [DEFAULT_MARK_USER, ...users];
  }
  return users;
}

/**
 * Loads the user registry from Supabase cloud (with local cache fallback)
 */
export async function getRegistry(): Promise<UsersRegistry> {
  let cached: UsersRegistry | null = null;
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(REGISTRY_CACHE_KEY);
      if (raw) {
        cached = JSON.parse(raw);
      }
    } catch (e) {
      console.warn('[Auth] Failed to parse local registry cache', e);
    }
  }

  try {
    const { data, error } = await supabase
      .from('vibe_app_state')
      .select('payload')
      .eq('id', REGISTRY_SUPABASE_ID)
      .maybeSingle();

    if (!error && data && data.payload && Array.isArray(data.payload.users)) {
      const cloudRegistry: UsersRegistry = {
        version: data.payload.version || '1.0.0',
        users: ensureMarkInRegistry(data.payload.users),
        updatedAt: data.payload.updatedAt || new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify(cloudRegistry));
      }
      return cloudRegistry;
    }

    // Cloud registry doesn't exist yet: initialize with Mark
    const initialRegistry: UsersRegistry = {
      version: '1.0.0',
      users: [DEFAULT_MARK_USER],
      updatedAt: new Date().toISOString(),
    };

    await saveRegistryToCloud(initialRegistry);
    if (typeof window !== 'undefined') {
      localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify(initialRegistry));
    }
    return initialRegistry;
  } catch (err) {
    console.warn('[Auth] Error fetching cloud registry, using local cache/default', err);
    if (cached) {
      return {
        ...cached,
        users: ensureMarkInRegistry(cached.users || []),
      };
    }
    return {
      version: '1.0.0',
      users: [DEFAULT_MARK_USER],
      updatedAt: new Date().toISOString(),
    };
  }
}

/**
 * Persists the registry to Supabase cloud and local storage
 */
export async function saveRegistryToCloud(registry: UsersRegistry): Promise<boolean> {
  const safeRegistry: UsersRegistry = {
    ...registry,
    users: ensureMarkInRegistry(registry.users),
    updatedAt: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify(safeRegistry));
    } catch (e) {
      console.warn('[Auth] Failed to cache registry locally', e);
    }
  }

  try {
    const { error } = await supabase
      .from('vibe_app_state')
      .upsert(
        {
          id: REGISTRY_SUPABASE_ID,
          payload: safeRegistry,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (error) {
      console.warn('[Auth] Failed to save registry to Supabase:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('[Auth] Network error saving registry to Supabase:', err);
    return false;
  }
}

/**
 * Creates fresh dataset for a brand new user
 */
export function createFreshUserData(username: string): AppDataBackup {
  const fresh = getFullDefaultBackup();
  fresh.settings = {
    ...fresh.settings,
    ...INITIAL_SETTINGS,
    userName: username,
  };
  return fresh;
}

/**
 * Authenticates an existing user
 */
export async function login(
  usernameInput: string,
  passwordInput: string,
  keepMeLoggedIn: boolean
): Promise<{ success: boolean; session?: AuthSession; error?: string }> {
  const cleanUsername = usernameInput.trim();
  if (!cleanUsername) {
    return { success: false, error: 'Please enter your username.' };
  }
  if (!passwordInput) {
    return { success: false, error: 'Please enter your password.' };
  }

  const registry = await getRegistry();
  const lowerUser = cleanUsername.toLowerCase();
  const user = registry.users.find((u) => u.username.toLowerCase() === lowerUser);

  if (!user) {
    return { success: false, error: 'No account found with this username.' };
  }

  const hash = await hashPassword(passwordInput, user.salt);
  if (hash !== user.passwordHash) {
    return { success: false, error: 'Incorrect password. Please try again.' };
  }

  // Update user's last login timestamp
  user.lastLoginAt = new Date().toISOString();
  saveRegistryToCloud(registry).catch((e) => console.warn('[Auth] Async registry update note', e));

  const session: AuthSession = {
    user: {
      id: user.id,
      username: user.username,
      displayName: user.displayName || user.username,
      stateId: user.stateId,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    },
    token: `vibe_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (keepMeLoggedIn ? 90 : 1) * 24 * 60 * 60 * 1000).toISOString(),
    keepMeLoggedIn,
  };

  saveSession(session, keepMeLoggedIn);

  return { success: true, session };
}

/**
 * Registers a brand new user with fresh isolated data
 */
export async function signup(
  usernameInput: string,
  passwordInput: string,
  keepMeLoggedIn: boolean
): Promise<{ success: boolean; session?: AuthSession; freshData?: AppDataBackup; error?: string }> {
  const cleanUsername = usernameInput.trim();
  if (!cleanUsername) {
    return { success: false, error: 'Username is required.' };
  }
  if (cleanUsername.length < 2) {
    return { success: false, error: 'Username must be at least 2 characters.' };
  }
  if (cleanUsername.length > 25) {
    return { success: false, error: 'Username cannot exceed 25 characters.' };
  }
  if (!/^[a-zA-Z0-9_\- ]+$/.test(cleanUsername)) {
    return {
      success: false,
      error: 'Username can only contain letters, numbers, spaces, underscores, and dashes.',
    };
  }
  if (!passwordInput || passwordInput.length < 4) {
    return { success: false, error: 'Password must be at least 4 characters.' };
  }

  const registry = await getRegistry();
  const lowerUser = cleanUsername.toLowerCase();
  const exists = registry.users.some((u) => u.username.toLowerCase() === lowerUser);
  if (exists) {
    return {
      success: false,
      error: `Username "${cleanUsername}" is already taken. Please choose another username.`,
    };
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(passwordInput, salt);
  const normalizedSlug = cleanUsername.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const uniqueSuffix = Math.random().toString(36).substring(2, 7) + Date.now().toString(36).slice(-4);
  const newUserId = `user_${normalizedSlug}_${uniqueSuffix}`;
  const newStateId = `user_state_${newUserId}`;

  const newUserRecord: StoredUserRecord = {
    id: newUserId,
    username: cleanUsername,
    displayName: cleanUsername,
    passwordHash,
    salt,
    stateId: newStateId,
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString(),
  };

  // Add to registry and persist
  registry.users.push(newUserRecord);
  await saveRegistryToCloud(registry);

  // Initialize fresh, isolated state for this new user
  const freshData = createFreshUserData(cleanUsername);

  // 1. Save locally for this user
  saveStoredData(freshData, newUserId);

  // 2. Save in cloud under user's unique state ID
  try {
    await supabase.from('vibe_app_state').upsert(
      {
        id: newStateId,
        payload: freshData,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );
  } catch (err) {
    console.warn('[Auth] Failed to initialize cloud state for new user:', err);
  }

  const session: AuthSession = {
    user: {
      id: newUserRecord.id,
      username: newUserRecord.username,
      displayName: newUserRecord.displayName,
      stateId: newUserRecord.stateId,
      createdAt: newUserRecord.createdAt,
      lastLoginAt: newUserRecord.lastLoginAt,
    },
    token: `vibe_sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + (keepMeLoggedIn ? 90 : 1) * 24 * 60 * 60 * 1000).toISOString(),
    keepMeLoggedIn,
  };

  saveSession(session, keepMeLoggedIn);

  return { success: true, session, freshData };
}

/**
 * Persists the active session to localStorage (if keepMeLoggedIn) or sessionStorage
 */
export function saveSession(session: AuthSession, keepMeLoggedIn: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const serialized = JSON.stringify(session);
    if (keepMeLoggedIn) {
      localStorage.setItem(LOCAL_SESSION_KEY, serialized);
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      sessionStorage.setItem(SESSION_STORAGE_KEY, serialized);
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  } catch (e) {
    console.error('[Auth] Failed to store session:', e);
  }
}

/**
 * Retrieves the current valid session, checking sessionStorage then localStorage
 */
export function getCurrentSession(): AuthSession | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Check active session storage first (for "keep me logged in" = false)
    const sessionRaw = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (sessionRaw) {
      const parsed = JSON.parse(sessionRaw) as AuthSession;
      if (parsed && parsed.user && new Date(parsed.expiresAt).getTime() > Date.now()) {
        return parsed;
      }
      sessionStorage.removeItem(SESSION_STORAGE_KEY);
    }

    // 2. Check persistent localStorage (for "keep me logged in" = true)
    const localRaw = localStorage.getItem(LOCAL_SESSION_KEY);
    if (localRaw) {
      const parsed = JSON.parse(localRaw) as AuthSession;
      if (parsed && parsed.user && new Date(parsed.expiresAt).getTime() > Date.now()) {
        return parsed;
      }
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
  } catch (e) {
    console.error('[Auth] Failed to parse current session', e);
  }

  return null;
}

/**
 * Logs out the active user and clears stored sessions
 */
export function logout(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {
    console.error('[Auth] Error clearing session during logout', e);
  }
}
