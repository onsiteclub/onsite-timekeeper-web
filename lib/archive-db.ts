// lib/archive-db.ts

const DB_NAME = 'onsite_timekeeper_archives';
const DB_VERSION = 1;
const STORE_NAME = 'archived_entries';
const EXPIRY_DAYS = 60;

interface ArchivedEntry {
  entryId: string;
  workerId: string;
  archivedAt: number;
}

function openArchiveDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'entryId' });
        store.createIndex('workerId', 'workerId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function getArchivedEntryIds(workerId: string): Promise<Set<string>> {
  const db = await openArchiveDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('workerId');
    const request = index.getAll(workerId);

    request.onsuccess = () => {
      const entries = request.result as ArchivedEntry[];
      resolve(new Set(entries.map((e) => e.entryId)));
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
  });
}

export async function archiveEntries(workerId: string, entryIds: string[]): Promise<void> {
  const db = await openArchiveDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const now = Date.now();

    for (const entryId of entryIds) {
      store.put({ entryId, workerId, archivedAt: now } as ArchivedEntry);
    }

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

export async function cleanupExpired(): Promise<void> {
  const db = await openArchiveDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const cutoff = Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000;

    const request = store.openCursor();
    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const entry = cursor.value as ArchivedEntry;
        if (entry.archivedAt < cutoff) {
          cursor.delete();
        }
        cursor.continue();
      }
    };

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
