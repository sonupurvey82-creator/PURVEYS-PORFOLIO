import { GalleryImage, StoredImageRecord } from '../types/image';

const DB_NAME = 'tigris_reel_images_v1';
const STORE_NAME = 'images';
const DB_VERSION = 1;

const IMAGE_EXTENSIONS = /\.(jpg|jpeg|png|webp|gif|avif|bmp|svg|heic|heif)$/i;

export function isImageFile(file: File): boolean {
  if (file.type && file.type.startsWith('image/')) {
    return true;
  }
  return IMAGE_EXTENSIONS.test(file.name);
}

export function extractImageMetadata(
  file: File
): Promise<{ width: number; height: number; aspectRatio: number }> {
  return new Promise((resolve) => {
    const tempUrl = URL.createObjectURL(file);
    const img = new Image();

    let settled = false;
    const finish = (width: number, height: number) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(tempUrl);
      const safeW = width > 0 ? width : 1200;
      const safeH = height > 0 ? height : 900;
      resolve({
        width: safeW,
        height: safeH,
        aspectRatio: safeW / safeH,
      });
    };

    const timeout = window.setTimeout(() => finish(1200, 900), 4000);

    img.onload = () => {
      window.clearTimeout(timeout);
      finish(img.naturalWidth, img.naturalHeight);
    };

    img.onerror = () => {
      window.clearTimeout(timeout);
      finish(1200, 900);
    };

    img.src = tempUrl;
  });
}

function openImageDB(): Promise<IDBDatabase> {
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

export async function loadGalleryImages(): Promise<GalleryImage[]> {
  try {
    const db = await openImageDB();
    const records: StoredImageRecord[] = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as StoredImageRecord[]) || []);
      req.onerror = () => reject(req.error);
    });
    db.close();

    return records
      .sort((a, b) => a.createdAt - b.createdAt)
      .map((rec) => ({
        id: rec.id,
        name: rec.name,
        title: rec.title ?? rec.name,
        description: rec.description ?? '',
        size: rec.size,
        type: rec.type,
        width: rec.width,
        height: rec.height,
        aspectRatio: rec.aspectRatio,
        createdAt: rec.createdAt,
        objectUrl: URL.createObjectURL(rec.blob),
      }));
  } catch {
    return [];
  }
}

export async function saveImageRecord(record: StoredImageRecord): Promise<void> {
  try {
    const db = await openImageDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(record);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
    db.close();
  } catch {
    // Graceful fallback if IndexedDB quota is exceeded
  }
}

export async function updateImageRecordInfo(
  id: string,
  updates: { title: string; description: string }
): Promise<void> {
  try {
    const db = await openImageDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const existing = getReq.result as StoredImageRecord | undefined;
        if (existing) {
          store.put({
            ...existing,
            title: updates.title,
            description: updates.description,
          });
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // Ignore storage update errors
  }
}

export async function deleteImageRecord(id: string): Promise<void> {
  try {
    const db = await openImageDB();
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
