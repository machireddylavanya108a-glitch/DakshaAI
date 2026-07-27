const memoryCache = new Map();
const SCENE_CACHE_PREFIX = 'daksha:scene-cache:';

export function getSceneCacheKey(content = '', sourceType = 'typed-topic') {
  const safe = String(content || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .slice(0, 280);
  return `${SCENE_CACHE_PREFIX}${sourceType}:${safe}`;
}

export function readSceneCache(cacheKey) {
  if (!cacheKey) return null;
  if (memoryCache.has(cacheKey)) return memoryCache.get(cacheKey);

  try {
    const raw = localStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    memoryCache.set(cacheKey, parsed);
    return parsed;
  } catch (error) {
    console.error('Scene cache read error:', error);
    return null;
  }
}

export function writeSceneCache(cacheKey, payload) {
  if (!cacheKey || !payload) return;
  memoryCache.set(cacheKey, payload);

  try {
    localStorage.setItem(cacheKey, JSON.stringify(payload));
  } catch (error) {
    console.error('Scene cache write error:', error);
  }
}
