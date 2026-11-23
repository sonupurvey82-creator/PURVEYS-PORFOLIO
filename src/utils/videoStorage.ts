import { GalleryVideo, StoredVideoRecord } from '../types/video';

const DB_NAME = 'tigris_reel_gallery_v1';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

const VIDEO_EXTENSIONS = /\.(mp4|mov|webm|m4v|mkv|avi|ogv|3gp)$/i;

export function isVideoFile(file: File): boolean {
  if (file.type && file.type.startsWith('video/')) {
    return true;
  }
  return VIDEO_EXTENSIONS.test(file.name);
}

export function computeRatioLabel(width: number, height: number): string {
  if (!width || !height) return '16:9';
  const ratio = width / height;

  const knownRatios: Array<[number, string]> = [
    [16 / 9, '16:9'],
    [9 / 16, '9:16'],
    [4 / 3, '4:3'],
    [3 / 4, '3:4'],
    [4 / 5, '4:5'],
    [5 / 4, '5:4'],
    [1, '1:1'],
    [21 / 9, '21:9'],
    [9 / 21, '9:21'],
    [16 / 10, '16:10'],
    [3 / 2, '3:2'],
    [2 / 3, '2:3'],
  ];

  for (const [target, label] of knownRatios) {
    if (Math.abs(ratio - target) < 0.035) {
      return label;
    }
  }

  const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));
  const divisor = gcd(Math.round(width), Math.round(height));
  const rw = Math.round(width / divisor);
  const rh = Math.round(height / divisor);

  if (rw <= 32 && rh <= 32) {
    return `${rw}:${rh}`;
  }
  return ratio >= 1 ? `${ratio.toFixed(2)}:1` : `1:${(1 / ratio).toFixed(2)}`;
}

export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00';
  const totalSec = Math.round(seconds);
  const mins = Math.floor(totalSec / 60);
  const secs = totalSec % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function extractVideoMetadata(
  file: File
): Promise<{ width: number; height: number; aspectRatio: number; ratioLabel: string; duration: number }> {
  return new Promise((resolve) => {
    const tempUrl = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;

    let settled = false;
    const finish = (width: number, height: number, duration: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(tempUrl);
      video.removeAttribute('src');
      video.load();

      const safeWidth = width > 0 ? width : 1920;
      const safeHeight = height > 0 ? height : 1080;
      const aspectRatio = safeWidth / safeHeight;

      resolve({
        width: safeWidth,
        height: safeHeight,
        aspectRatio,
        ratioLabel: computeRatioLabel(safeWidth, safeHeight),
        duration: Number.isFinite(duration) ? duration : 0,
      });
    };

    const timeout = window.setTimeout(() => {
      finish(1920, 1080, 0);
    }, 4500);

    video.onloadedmetadata = () => {
      window.clearTimeout(timeout);
      finish(video.videoWidth, video.videoHeight, video.duration);
    };

    video.onerror = () => {
      window.clearTimeout(timeout);
      finish(1920, 1080, 0);
    };

    video.src = tempUrl;
  });
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadGalleryVideos(): Promise<GalleryVideo[]> {
  try {
    const db = await openDatabase();
    const records: StoredVideoRecord[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredVideoRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();

    return records
      .sort((a, b) => a.order - b.order || a.createdAt - b.createdAt)
      .map((rec) => ({
        id: rec.id,
        section: rec.section ?? 'showreels',
        name: rec.name,
        size: rec.size,
        type: rec.type,
        width: rec.width,
        height: rec.height,
        aspectRatio: rec.aspectRatio,
        ratioLabel: rec.ratioLabel,
        duration: rec.duration,
        order: rec.order,
        createdAt: rec.createdAt,
        objectUrl: URL.createObjectURL(rec.blob),
      }));
  } catch {
    return [];
  }
}

export async function saveVideoRecord(record: StoredVideoRecord): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Graceful fallback if IndexedDB quota is exceeded; video remains active in session memory
  }
}

export async function deleteVideoRecord(id: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Ignore storage delete errors
  }
}

export async function updateVideoOrders(orderUpdates: Array<{ id: string; order: number }>): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      for (const item of orderUpdates) {
        const getReq = store.get(item.id);
        getReq.onsuccess = () => {
          const existing = getReq.result as StoredVideoRecord | undefined;
          if (existing) {
            store.put({ ...existing, order: item.order });
          }
        };
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore storage update errors
  }
}

export async function clearAllVideoRecords(): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Ignore storage clear errors
  }
}
