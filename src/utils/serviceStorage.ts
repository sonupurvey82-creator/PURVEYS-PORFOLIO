import { ExtraService, StoredServiceRecord } from '../types/service';

const DB_NAME = 'purvey_extra_services_v1';
const DB_VERSION = 1;
const STORE_NAME = 'services';

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

export async function loadExtraServices(): Promise<ExtraService[]> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const records = (request.result as StoredServiceRecord[]) || [];
        records.sort((a, b) => a.createdAt - b.createdAt);
        const mapped: ExtraService[] = records.map((rec) => ({
          id: rec.id,
          title: rec.title,
          workDetails: rec.workDetails,
          mediaKind: rec.mediaKind,
          mediaObjectUrl: rec.mediaBlob ? URL.createObjectURL(rec.mediaBlob) : undefined,
          mediaAspectRatio: rec.mediaAspectRatio,
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

export async function getExtraServiceRecord(id: string): Promise<StoredServiceRecord | null> {
  try {
    const db = await openDatabase();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as StoredServiceRecord) ?? null);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => db.close();
    });
  } catch {
    return null;
  }
}

export async function saveExtraServiceRecord(record: StoredServiceRecord): Promise<void> {
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

export async function deleteExtraServiceRecord(id: string): Promise<void> {
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
