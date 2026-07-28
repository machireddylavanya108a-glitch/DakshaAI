const memoryCache = new Map();

function safeStorage() {
  try {
    if (typeof window === 'undefined') return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getCachedValue(key, ttl = 1000 * 60 * 10) {
  const memoryEntry = memoryCache.get(key);
  if (memoryEntry && Date.now() - memoryEntry.timestamp < ttl) {
    return memoryEntry.value;
  }

  const storage = safeStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    if (Date.now() - entry.timestamp < ttl) {
      memoryCache.set(key, entry);
      return entry.value;
    }
    storage.removeItem(key);
  } catch {
    return null;
  }

  return null;
}

export function setCachedValue(key, value, ttl = 1000 * 60 * 10) {
  const entry = { value, timestamp: Date.now(), ttl };
  memoryCache.set(key, entry);

  const storage = safeStorage();
  if (!storage) return;

  try {
    storage.setItem(key, JSON.stringify(entry));
  } catch {
    // ignore quota issues
  }
}

export function clearCachedValue(key) {
  memoryCache.delete(key);
  const storage = safeStorage();
  if (!storage) return;
  storage.removeItem(key);
}

export async function getIndexedDBItem(storeName, key) {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return null;

  return new Promise((resolve) => {
    const request = indexedDB.open('daksha-ai-cache', 1);

    request.onerror = () => resolve(null);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(null);
        return;
      }
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const getReq = store.get(key);
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    };
  });
}

export async function setIndexedDBItem(storeName, key, value) {
  if (typeof window === 'undefined' || !('indexedDB' in window)) return false;

  return new Promise((resolve) => {
    const request = indexedDB.open('daksha-ai-cache', 1);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onerror = () => resolve(false);
    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        resolve(false);
        return;
      }
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      store.put(value, key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => resolve(false);
    };
  });
}

export function compressImageDataUrl(dataUrl, quality = 0.82, maxWidth = 1400) {
  if (typeof window === 'undefined' || !dataUrl?.startsWith('data:image')) return dataUrl;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ratio = Math.min(1, maxWidth / img.width);
      canvas.width = Math.max(1, Math.floor(img.width * ratio));
      canvas.height = Math.max(1, Math.floor(img.height * ratio));
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      const output = canvas.toDataURL('image/jpeg', quality);
      resolve(output);
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}
