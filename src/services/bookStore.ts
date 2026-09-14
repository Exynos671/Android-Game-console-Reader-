/**
 * Tiny IndexedDB wrapper that persists the original imported file bytes per
 * book. Object URLs (covers, comic pages, chapter images) do not survive an
 * app restart, so we keep the source file and re-parse it on startup to
 * rebuild those URLs.
 */
const DB_NAME = 'handheld_reader_files';
const STORE = 'files';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('indexedDB unavailable'));
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function saveBookFile(id: string, blob: Blob): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put({ id, blob });
  await txDone(tx);
  db.close();
}

export async function getBookFile(id: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).get(id);
    req.onsuccess = () => {
      const rec = req.result as { blob?: Blob } | undefined;
      db.close();
      resolve(rec?.blob || null);
    };
    req.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}

export async function deleteBookFile(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
  db.close();
}
