import { PresetCategory, PresetItem, StoredPresetRecord } from '../types/preset';

const DB_NAME = 'purvey_presets_v1';
const DB_VERSION = 1;
const STORE_NAME = 'presets';

export const PRESET_CATEGORIES: PresetCategory[] = [
  'Premiere Pro',
  'After Effects',
  'DaVinci Resolve',
  'Lightroom',
  'Color LUT',
  'Audio / SFX',
  'Other',
];

export function extractFileExtension(fileName: string): string {
  const clean = fileName.trim();
  const lastDot = clean.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === clean.length - 1) return 'FILE';
  return clean.slice(lastDot + 1).toUpperCase().slice(0, 8);
}

export function inferPresetCategory(fileName: string): PresetCategory {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.prfpset') || lower.endsWith('.mogrt') || lower.endsWith('.prproj')) {
    return 'Premiere Pro';
  }
  if (lower.endsWith('.ffx') || lower.endsWith('.aep')) {
    return 'After Effects';
  }
  if (lower.endsWith('.drx') || lower.endsWith('.setting') || lower.endsWith('.drp')) {
    return 'DaVinci Resolve';
  }
  if (lower.endsWith('.xmp') || lower.endsWith('.dng') || lower.endsWith('.lrtemplate')) {
    return 'Lightroom';
  }
  if (lower.endsWith('.cube') || lower.endsWith('.3dl') || lower.endsWith('.look')) {
    return 'Color LUT';
  }
  if (
    lower.endsWith('.wav') ||
    lower.endsWith('.mp3') ||
    lower.endsWith('.aiff') ||
    lower.endsWith('.flac') ||
    lower.endsWith('.ogg')
  ) {
    return 'Audio / SFX';
  }
  return 'Other';
}

export function formatPresetSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadPresets(): Promise<PresetItem[]> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as StoredPresetRecord[]) || [];
        records.sort((a, b) => b.createdAt - a.createdAt);
        const mapped: PresetItem[] = records.map((rec) => ({
          id: rec.id,
          title: rec.title,
          category: rec.category,
          description: rec.description,
          fileName: rec.fileName,
          fileSize: rec.fileSize,
          fileType: rec.fileType,
          fileExt: rec.fileExt || extractFileExtension(rec.fileName),
          fileObjectUrl: URL.createObjectURL(rec.fileBlob),
          previewKind: rec.previewKind,
          previewObjectUrl: rec.previewBlob ? URL.createObjectURL(rec.previewBlob) : undefined,
          downloads: rec.downloads ?? 0,
          createdAt: rec.createdAt,
        }));
        resolve(mapped);
      };

      request.onerror = () => reject(request.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return [];
  }
}

export async function getPresetRecord(id: string): Promise<StoredPresetRecord | null> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as StoredPresetRecord) ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function savePresetRecord(record: StoredPresetRecord): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(record);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function incrementPresetDownload(id: string): Promise<number> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(id);
    let nextCount = 1;

    req.onsuccess = () => {
      const record = req.result as StoredPresetRecord | undefined;
      if (record) {
        nextCount = (record.downloads ?? 0) + 1;
        store.put({ ...record, downloads: nextCount });
      }
    };

    tx.oncomplete = () => {
      db.close();
      resolve(nextCount);
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}

export async function deletePresetRecord(id: string): Promise<void> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(id);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => {
      db.close();
      reject(tx.error);
    };
  });
}
