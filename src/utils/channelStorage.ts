import { StoredChannelRecord, YouTubeChannel } from '../types/channel';

const DB_NAME = 'purvey_youtube_channels_v1';
const STORE_NAME = 'channels';
const DB_VERSION = 1;

function openChannelsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is unavailable in this environment.'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Failed to open channels DB.'));
  });
}

export async function loadYouTubeChannels(): Promise<YouTubeChannel[]> {
  try {
    const db = await openChannelsDb();
    const records = await new Promise<StoredChannelRecord[]>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredChannelRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();

    return records
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((rec) => ({
        id: rec.id,
        name: rec.name,
        url: rec.url,
        createdAt: rec.createdAt,
        logoObjectUrl: rec.logoBlob ? URL.createObjectURL(rec.logoBlob) : undefined,
      }));
  } catch {
    return [];
  }
}

export async function saveYouTubeChannelRecord(record: StoredChannelRecord): Promise<void> {
  const db = await openChannelsDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(record);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

export async function getYouTubeChannelRecord(id: string): Promise<StoredChannelRecord | null> {
  try {
    const db = await openChannelsDb();
    const record = await new Promise<StoredChannelRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as StoredChannelRecord) ?? null);
      req.onerror = () => reject(req.error);
    });
    db.close();
    return record;
  } catch {
    return null;
  }
}

export async function deleteYouTubeChannelRecord(id: string): Promise<void> {
  const db = await openChannelsDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  db.close();
}

export function normalizeYouTubeUrl(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  let candidate = trimmed;
  if (candidate.startsWith('@')) {
    candidate = `https://youtube.com/${candidate}`;
  } else if (!/^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(candidate)) {
    candidate = `https://${candidate}`;
  }

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function formatChannelDisplayUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const path = parsed.pathname === '/' ? '' : parsed.pathname;
    return `${host}${path}`;
  } catch {
    return url;
  }
}
