import { collection, deleteDoc, doc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig.js';
import { getIndexedDBItem, setIndexedDBItem } from '../utils/cache.js';
import { buildDefaultKnowledgeItem, normalizeKnowledgeItem } from '../utils/knowledgeLibraryUtils.js';

const LOCAL_STORAGE_KEY = 'daksha:knowledge-library:v2';
const CACHE_STORE = 'knowledge-library';

function readLocalItems() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeKnowledgeItem).filter((item) => item.id);
  } catch {
    return [];
  }
}

function writeLocalItems(items = []) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota issues
  }
}

function byLatest(a, b) {
  const aDate = Date.parse(a.updatedAt || a.createdAt || 0) || 0;
  const bDate = Date.parse(b.updatedAt || b.createdAt || 0) || 0;
  return bDate - aDate;
}

function mergeItems(items = []) {
  const map = new Map();
  for (const candidate of items) {
    const item = normalizeKnowledgeItem(candidate);
    if (!item.id) continue;
    if (!map.has(item.id)) {
      map.set(item.id, item);
      continue;
    }

    const existing = map.get(item.id);
    map.set(item.id, byLatest(item, existing) <= 0 ? existing : item);
  }

  return Array.from(map.values()).sort(byLatest);
}

async function persistCache(cacheKey, items) {
  writeLocalItems(items);
  await setIndexedDBItem(CACHE_STORE, cacheKey, items);
}

export async function loadKnowledgeLibrary(userId = '') {
  const cacheKey = userId || 'guest';
  const localItems = readLocalItems();
  const indexedItems = (await getIndexedDBItem(CACHE_STORE, cacheKey)) || [];
  const offlineItems = mergeItems([...localItems, ...indexedItems]);

  if (!userId) {
    if (!offlineItems.length) {
      const seeded = [buildDefaultKnowledgeItem()];
      await persistCache(cacheKey, seeded);
      return { items: seeded, offline: false };
    }
    return { items: offlineItems, offline: false };
  }

  try {
    const snapshot = await getDocs(query(collection(db, 'knowledgeLibrary'), where('userId', '==', userId)));
    const remoteItems = snapshot.docs.map((entry) => normalizeKnowledgeItem({ id: entry.id, ...entry.data() }));
    const merged = mergeItems([...offlineItems, ...remoteItems]);
    const finalItems = merged.length ? merged : [buildDefaultKnowledgeItem()];
    await persistCache(cacheKey, finalItems);
    return { items: finalItems, offline: false };
  } catch (error) {
    const fallback = offlineItems.length ? offlineItems : [buildDefaultKnowledgeItem()];
    await persistCache(cacheKey, fallback);
    return { items: fallback, offline: true, error };
  }
}

export async function upsertKnowledgeItem(userId = '', itemInput = {}) {
  const cacheKey = userId || 'guest';
  const item = normalizeKnowledgeItem(itemInput);
  if (!item.id) {
    throw new Error('Knowledge item id is required.');
  }

  const current = mergeItems([...(await getIndexedDBItem(CACHE_STORE, cacheKey) || []), ...readLocalItems()]);
  const next = mergeItems([item, ...current.filter((entry) => entry.id !== item.id)]);
  await persistCache(cacheKey, next);

  if (!userId) {
    return { item, synced: false, items: next };
  }

  try {
    await setDoc(doc(db, 'knowledgeLibrary', item.id), {
      ...item,
      userId,
      sourceType: item.sourceType,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      lastOpenedAt: item.lastOpenedAt
    }, { merge: true });
    return { item, synced: true, items: next };
  } catch (error) {
    return { item, synced: false, items: next, error };
  }
}

export async function deleteKnowledgeItem(userId = '', itemId = '') {
  if (!itemId) return { ok: false, reason: 'missing-id' };

  const cacheKey = userId || 'guest';
  const current = mergeItems([...(await getIndexedDBItem(CACHE_STORE, cacheKey) || []), ...readLocalItems()]);
  const next = current.filter((item) => item.id !== itemId);
  await persistCache(cacheKey, next);

  if (!userId) {
    return { ok: true, synced: false, items: next };
  }

  try {
    await deleteDoc(doc(db, 'knowledgeLibrary', itemId));
    return { ok: true, synced: true, items: next };
  } catch (error) {
    return { ok: true, synced: false, items: next, error };
  }
}
