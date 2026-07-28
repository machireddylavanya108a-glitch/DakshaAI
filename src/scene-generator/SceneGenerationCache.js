import { getCachedValue, setCachedValue, clearCachedValue } from '../utils/cache.js';
import { processSceneJsonPipeline } from './SceneVersionManager.js';

const memoryCache = new Map();
const DEFAULT_TTL_MS = 1000 * 60 * 30;
const CACHE_PREFIX = 'daksha:scene-generation:';

function now() {
  return Date.now();
}

function normalizeKey(key = '') {
  return `${CACHE_PREFIX}${String(key || '').trim()}`;
}

function safeParse(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(String(value));
  } catch {
    return null;
  }
}

function isExpired(entry) {
  const raw = entry?.expiresAt;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return numeric <= now();
  const parsed = Date.parse(String(raw || ''));
  if (Number.isFinite(parsed)) return parsed <= now();
  return false;
}

export class SceneGenerationCache {
  constructor({ ttlMs = DEFAULT_TTL_MS } = {}) {
    this.ttlMs = Math.max(1000, Number(ttlMs || DEFAULT_TTL_MS));
  }

  has(key) {
    const fullKey = normalizeKey(key);
    const entry = memoryCache.get(fullKey);
    return Boolean(entry && !isExpired(entry));
  }

  get(key) {
    const fullKey = normalizeKey(key);
    const memoryEntry = memoryCache.get(fullKey);
    if (memoryEntry && !isExpired(memoryEntry)) return memoryEntry;

    const persistent = safeParse(getCachedValue(fullKey, this.ttlMs));
    if (!persistent || isExpired(persistent)) return null;

    memoryCache.set(fullKey, persistent);
    return persistent;
  }

  set(key, value) {
    const fullKey = normalizeKey(key);
    const entry = {
      ...value,
      createdAt: value?.createdAt || new Date().toISOString(),
      expiresAt: value?.expiresAt || new Date(now() + this.ttlMs).toISOString()
    };

    memoryCache.set(fullKey, entry);
    setCachedValue(fullKey, entry, this.ttlMs);
    return entry;
  }

  delete(key) {
    const fullKey = normalizeKey(key);
    memoryCache.delete(fullKey);
    clearCachedValue(fullKey);
  }

  clear() {
    for (const key of memoryCache.keys()) {
      if (String(key).startsWith(CACHE_PREFIX)) {
        memoryCache.delete(key);
        clearCachedValue(key);
      }
    }
  }

  invalidateByLesson(lessonId = '') {
    const target = String(lessonId || '').trim();
    if (!target) return;

    for (const [key, value] of memoryCache.entries()) {
      if (value?.lessonId === target) {
        memoryCache.delete(key);
        clearCachedValue(key);
      }
    }
  }

  invalidateByVersion(version = '') {
    const target = String(version || '').trim();
    if (!target) return;

    for (const [key, value] of memoryCache.entries()) {
      if (value?.schemaVersion === target) {
        memoryCache.delete(key);
        clearCachedValue(key);
      }
    }
  }

  validateCachedScene(entry) {
    const parsed = safeParse(entry);
    if (!parsed || typeof parsed !== 'object') return null;
    if (isExpired(parsed)) return null;
    if (!parsed.scene || typeof parsed.scene !== 'object') return null;

    const repaired = processSceneJsonPipeline(parsed.scene, {
      sourceType: 'cache',
      fallbackTitle: parsed?.scene?.title || 'Cached Scene',
      fallbackSubject: parsed?.scene?.subject || 'General Learning'
    });

    return {
      ...parsed,
      scene: repaired
    };
  }
}

export const sceneGenerationCache = new SceneGenerationCache();
