import { PhotoMetadata } from '@/types';
import { supabase } from './supabaseClient';

const DB_NAME = 'VibePhotoVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'photos';

interface StoredPhotoRecord {
  id: string;
  dataUrl: string;
  metadata: PhotoMetadata;
  savedAt: string;
}

// In-memory fallback if IndexedDB is unavailable
const memoryFallback = new Map<string, string>();

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not available in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

/**
 * Persists a compressed photo data URL into IndexedDB AND uploads it to Supabase Storage.
 * Modifies metadata in-place to populate publicUrl and storagePath.
 */
export async function savePhotoToVault(
  id: string,
  dataUrl: string,
  metadata: PhotoMetadata
): Promise<void> {
  // 1. Save to local IndexedDB for immediate offline access
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const record: StoredPhotoRecord = {
        id,
        dataUrl,
        metadata,
        savedAt: new Date().toISOString(),
      };
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Falling back to in-memory storage for photo', err);
    memoryFallback.set(id, dataUrl);
  }

  // 2. Upload to Supabase Storage bucket 'photos'
  try {
    const blob = dataUrlToBlob(dataUrl);
    const extension = metadata.mimeType ? metadata.mimeType.split('/')[1] || 'jpg' : 'jpg';
    const filePath = `${metadata.dateISO}/${id}.${extension}`;

    const { data: uploadData, error: uploadErr } = await supabase.storage
      .from('photos')
      .upload(filePath, blob, {
        contentType: metadata.mimeType || 'image/jpeg',
        upsert: true,
      });

    if (!uploadErr && uploadData) {
      const { data: urlData } = supabase.storage
        .from('photos')
        .getPublicUrl(filePath);

      metadata.publicUrl = urlData.publicUrl;
      metadata.storagePath = filePath;
    } else if (uploadErr) {
      console.warn('[PhotoVault] Supabase storage upload note:', uploadErr.message);
    }
  } catch (cloudErr) {
    console.warn('[PhotoVault] Failed to upload photo to Supabase storage:', cloudErr);
  }
}

/**
 * Retrieves a compressed photo URL.
 * Checks direct cloud publicUrl first, then IndexedDB cache, then Supabase bucket path.
 */
export async function getPhotoFromVault(id: string, metadata?: PhotoMetadata): Promise<string | null> {
  if (metadata?.publicUrl) {
    return metadata.publicUrl;
  }

  if (memoryFallback.has(id)) {
    return memoryFallback.get(id) || null;
  }

  try {
    const db = await openDatabase();
    const localUrl = await new Promise<string | null>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const res = req.result as StoredPhotoRecord | undefined;
        resolve(res ? res.dataUrl : null);
      };
      req.onerror = () => reject(req.error);
    });
    if (localUrl) return localUrl;
  } catch (err) {
    console.warn('Failed to retrieve photo from IndexedDB', err);
  }

  if (metadata?.storagePath) {
    const { data } = supabase.storage.from('photos').getPublicUrl(metadata.storagePath);
    if (data?.publicUrl) return data.publicUrl;
  }

  return null;
}

/**
 * Retrieves both the photo data URL and its full metadata by ID.
 */
export async function getPhotoRecordFromVault(
  id: string
): Promise<{ dataUrl: string; metadata: PhotoMetadata } | null> {
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => {
        const res = req.result as StoredPhotoRecord | undefined;
        if (res && res.dataUrl) {
          resolve({ dataUrl: res.dataUrl, metadata: res.metadata });
        } else {
          resolve(null);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to retrieve photo record from IndexedDB', err);
    return null;
  }
}

/**
 * Deletes a photo from IndexedDB and Supabase storage.
 */
export async function deletePhotoFromVault(id: string, storagePath?: string): Promise<void> {
  memoryFallback.delete(id);
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to delete photo from IndexedDB', err);
  }

  if (storagePath) {
    try {
      await supabase.storage.from('photos').remove([storagePath]);
    } catch (cloudErr) {
      console.warn('Failed to delete photo from Supabase storage', cloudErr);
    }
  }
}

/**
 * Clears all photos stored in the vault.
 */
export async function clearPhotoVault(): Promise<void> {
  memoryFallback.clear();
  try {
    const db = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Failed to clear photo vault', err);
  }
}
