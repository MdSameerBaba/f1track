const DB_NAME = "F1TrackCache";
const DB_VERSION = 1;
const STORE_NAME = "responses";

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "key" });
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });

  return dbPromise;
}

export interface CacheEntry {
  key: string;
  value: any;
  expiresAt: number | null; // null means permanent
}

/** Get a value from the persistent IndexedDB cache */
export async function get<T>(key: string): Promise<T | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const entry = request.result as CacheEntry | undefined;
        if (!entry) {
          resolve(null);
          return;
        }

        if (entry.expiresAt && Date.now() > entry.expiresAt) {
          // Stale entry: delete it in the background
          del(key);
          resolve(null);
        } else {
          resolve(entry.value as T);
        }
      };

      request.onerror = () => {
        resolve(null);
      };
    });
  } catch (e) {
    console.warn("IndexedDB cache get failed:", e);
    return null;
  }
}

/** Set a value in the persistent IndexedDB cache */
export async function set<T>(key: string, value: T, ttlMs?: number): Promise<void> {
  try {
    const db = await getDB();
    const expiresAt = ttlMs ? Date.now() + ttlMs : null;
    const entry: CacheEntry = { key, value, expiresAt };

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("IndexedDB cache set failed:", e);
  }
}

/** Delete a specific key from the cache */
export async function del(key: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise<void>((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch (e) {
    console.warn("IndexedDB cache delete failed:", e);
  }
}

/** Clear all cached values */
export async function clear(): Promise<void> {
  try {
    const db = await getDB();
    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (e) {
    console.warn("IndexedDB cache clear failed:", e);
  }
}

/** Get list of all cached keys */
export async function getAllKeys(): Promise<string[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result as string[]);
      request.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
}
