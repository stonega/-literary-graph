
import { GraphData, ProcessingStats, SavedGraph } from '../types';

const DB_NAME = 'GeminiGraphDB';
const DB_VERSION = 1;
const STORE_NAME = 'saved_graphs';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      reject((event.target as IDBOpenDBRequest).error);
    };
  });
};

export const saveGraph = async (title: string, data: GraphData, stats: ProcessingStats): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  const record: SavedGraph = {
    id: crypto.randomUUID(),
    title,
    timestamp: Date.now(),
    data,
    stats
  };

  return new Promise((resolve, reject) => {
    const request = store.add(record);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllGraphs = async (): Promise<SavedGraph[]> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readonly');
  const store = transaction.objectStore(STORE_NAME);
  const index = store.index('timestamp');

  return new Promise((resolve, reject) => {
    // Open cursor in direction 'prev' to get newest first
    const request = index.openCursor(null, 'prev');
    const results: SavedGraph[] = [];

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
    request.onerror = () => reject(request.error);
  });
};

export const getRecentGraphs = async (limit: number = 3): Promise<SavedGraph[]> => {
  const all = await getAllGraphs();
  return all.slice(0, limit);
};

export const deleteGraph = async (id: string): Promise<void> => {
  const db = await openDB();
  const transaction = db.transaction(STORE_NAME, 'readwrite');
  const store = transaction.objectStore(STORE_NAME);

  return new Promise((resolve, reject) => {
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};
