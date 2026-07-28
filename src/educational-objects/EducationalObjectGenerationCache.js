import { stableHash } from './EducationalObjectGenerationConfig.js';

const generationCache = new Map();
const CACHE_TTL_MS = 1000 * 60 * 30;

function now() {
  return Date.now();
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function isExpired(entry = {}) {
  return Number(entry.expiresAt || 0) <= now();
}

export function createEducationalObjectGenerationCacheKey(fingerprint = {}) {
  return `educational-object-generation:${stableHash(JSON.stringify(fingerprint || {}))}`;
}

export function getCachedEducationalObjectGeneration(cacheKey = '') {
  const key = String(cacheKey || '').trim();
  if (!key) return null;

  const entry = generationCache.get(key);
  if (!entry || isExpired(entry)) {
    generationCache.delete(key);
    return null;
  }

  return clone(entry.value);
}

export function setCachedEducationalObjectGeneration(cacheKey = '', value = {}, ttlMs = CACHE_TTL_MS) {
  const key = String(cacheKey || '').trim();
  if (!key || !value || typeof value !== 'object') return null;

  const entry = {
    expiresAt: now() + Math.max(1000, Number(ttlMs || CACHE_TTL_MS)),
    value: clone(value)
  };
  generationCache.set(key, entry);
  return clone(entry.value);
}

export function invalidateEducationalObjectGenerationCache(cacheKey = '') {
  const key = String(cacheKey || '').trim();
  if (!key) return false;
  return generationCache.delete(key);
}

export function clearEducationalObjectGenerationCache() {
  generationCache.clear();
}
