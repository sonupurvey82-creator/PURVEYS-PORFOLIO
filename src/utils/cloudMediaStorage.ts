import {
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';

const CACHE_DB_NAME = 'purvey_cloud_blob_cache_v1';
const CACHE_STORE_NAME = 'blobs';
const CACHE_DB_VERSION = 1;

// 420 KB binary per chunk -> ~560 KB base64 string (well under 750 KB rule & 1 MB Firestore limit)
const CHUNK_BYTE_SIZE = 420 * 1024;
export const MAX_CLOUD_CHUNKS = 125;
export const MAX_CLOUD_FILE_BYTES = CHUNK_BYTE_SIZE * MAX_CLOUD_CHUNKS; // ~52.5 MB

interface CachedBlobRecord {
  mediaId: string;
  mimeType: string;
  blob: Blob;
  cachedAt: number;
}

function openCacheDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
    req.onupgradeneeded = () => {
      const idb = req.result;
      if (!idb.objectStoreNames.contains(CACHE_STORE_NAME)) {
        idb.createObjectStore(CACHE_STORE_NAME, { keyPath: 'mediaId' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getCachedCloudBlob(mediaId: string): Promise<Blob | null> {
  try {
    const idb = await openCacheDb();
    const record = await new Promise<CachedBlobRecord | null>((resolve, reject) => {
      const tx = idb.transaction(CACHE_STORE_NAME, 'readonly');
      const store = tx.objectStore(CACHE_STORE_NAME);
      const req = store.get(mediaId);
      req.onsuccess = () => resolve((req.result as CachedBlobRecord) ?? null);
      req.onerror = () => reject(req.error);
    });
    idb.close();
    return record?.blob ?? null;
  } catch {
    return null;
  }
}

export async function setCachedCloudBlob(
  mediaId: string,
  blob: Blob,
  mimeType: string
): Promise<void> {
  try {
    const idb = await openCacheDb();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CACHE_STORE_NAME);
      const req = store.put({
        mediaId,
        mimeType,
        blob,
        cachedAt: Date.now(),
      } satisfies CachedBlobRecord);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    idb.close();
  } catch {
    // Cache is best-effort only
  }
}

async function deleteCachedCloudBlob(mediaId: string): Promise<void> {
  try {
    const idb = await openCacheDb();
    await new Promise<void>((resolve, reject) => {
      const tx = idb.transaction(CACHE_STORE_NAME, 'readwrite');
      const store = tx.objectStore(CACHE_STORE_NAME);
      const req = store.delete(mediaId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    idb.close();
  } catch {
    // Ignore cache delete failure
  }
}

function uint8ToBase64(bytes: Uint8Array): string {
  const sliceSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += sliceSize) {
    const sub = bytes.subarray(i, i + sliceSize);
    parts.push(String.fromCharCode(...sub));
  }
  return btoa(parts.join(''));
}

function base64ToUint8(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const len = binary.length;
  const buffer = new ArrayBuffer(len);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function uploadBlobToCloud(
  mediaId: string,
  blob: Blob,
  ownerUid: string
): Promise<{ mediaId: string; chunkCount: number }> {
  if (blob.size > MAX_CLOUD_FILE_BYTES) {
    throw new Error(
      `File exceeds the ${Math.round(MAX_CLOUD_FILE_BYTES / (1024 * 1024))} MB cloud upload limit. Please compress or trim it before uploading.`
    );
  }

  const buffer = await blob.arrayBuffer();
  const totalBytes = new Uint8Array(buffer);
  const chunkCount = Math.max(1, Math.ceil(totalBytes.length / CHUNK_BYTE_SIZE));

  // Upload chunks in bounded parallel batches of 4
  for (let start = 0; start < chunkCount; start += 4) {
    const batch: Promise<void>[] = [];
    const end = Math.min(chunkCount, start + 4);
    for (let i = start; i < end; i++) {
      const slice = totalBytes.subarray(i * CHUNK_BYTE_SIZE, (i + 1) * CHUNK_BYTE_SIZE);
      const encoded = slice.length > 0 ? uint8ToBase64(slice) : 'AA==';
      const chunkDocId = `${mediaId}_${i}`;
      const path = `media_chunks/${chunkDocId}`;
      batch.push(
        setDoc(doc(db, 'media_chunks', chunkDocId), {
          mediaId,
          chunkIndex: i,
          data: encoded,
          isPublic: true,
          ownerUid,
          createdAt: serverTimestamp(),
        }).catch((err) => handleFirestoreError(err, OperationType.CREATE, path))
      );
    }
    await Promise.all(batch);
  }

  await setCachedCloudBlob(mediaId, blob, blob.type || 'application/octet-stream');
  return { mediaId, chunkCount };
}

// Persistent in-memory objectUrl map to avoid tearing down active video/image tags on sibling updates
const activeMediaUrls = new Map<string, string>();
const inFlightFetches = new Map<string, Promise<string>>();

export function getExistingMediaObjectUrl(mediaId: string): string | undefined {
  return activeMediaUrls.get(mediaId);
}

export async function fetchBlobUrlFromCloud(
  mediaId: string,
  chunkCount: number,
  mimeType: string
): Promise<string> {
  if (!mediaId || chunkCount <= 0) return '';

  const existing = activeMediaUrls.get(mediaId);
  if (existing) return existing;

  const inflight = inFlightFetches.get(mediaId);
  if (inflight) return inflight;

  const promise = (async () => {
    const cached = await getCachedCloudBlob(mediaId);
    if (cached) {
      const url = URL.createObjectURL(cached);
      activeMediaUrls.set(mediaId, url);
      return url;
    }

    const parts: Uint8Array<ArrayBuffer>[] = new Array(chunkCount);

    for (let start = 0; start < chunkCount; start += 6) {
      const batch: Promise<void>[] = [];
      const end = Math.min(chunkCount, start + 6);
      for (let i = start; i < end; i++) {
        const chunkDocId = `${mediaId}_${i}`;
        const path = `media_chunks/${chunkDocId}`;
        batch.push(
          getDoc(doc(db, 'media_chunks', chunkDocId))
            .then((snap) => {
              if (!snap.exists()) {
                throw new Error(`Missing media chunk ${chunkDocId}`);
              }
              const data = snap.data() as { data?: string };
              parts[i] = data.data ? base64ToUint8(data.data) : new Uint8Array(0);
            })
            .catch((err) => handleFirestoreError(err, OperationType.GET, path))
        );
      }
      await Promise.all(batch);
    }

    const blob = new Blob(parts, { type: mimeType || 'application/octet-stream' });
    await setCachedCloudBlob(mediaId, blob, mimeType);
    const url = URL.createObjectURL(blob);
    activeMediaUrls.set(mediaId, url);
    return url;
  })();

  inFlightFetches.set(mediaId, promise);
  try {
    return await promise;
  } finally {
    inFlightFetches.delete(mediaId);
  }
}

export async function deleteCloudMedia(mediaId: string, chunkCount: number): Promise<void> {
  if (!mediaId || chunkCount <= 0) return;

  const cachedUrl = activeMediaUrls.get(mediaId);
  if (cachedUrl) {
    URL.revokeObjectURL(cachedUrl);
    activeMediaUrls.delete(mediaId);
  }
  await deleteCachedCloudBlob(mediaId);

  for (let start = 0; start < chunkCount; start += 6) {
    const batch: Promise<void>[] = [];
    const end = Math.min(chunkCount, start + 6);
    for (let i = start; i < end; i++) {
      const chunkDocId = `${mediaId}_${i}`;
      const path = `media_chunks/${chunkDocId}`;
      batch.push(
        deleteDoc(doc(db, 'media_chunks', chunkDocId)).catch((err) =>
          handleFirestoreError(err, OperationType.DELETE, path)
        )
      );
    }
    await Promise.all(batch);
  }
}
