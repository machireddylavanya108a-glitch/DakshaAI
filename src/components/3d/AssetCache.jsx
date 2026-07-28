import { useMemo } from 'react';
import { readAssetCache, writeAssetCache, getAssetCacheKey } from '../../utils/assetManager.js';

export default function AssetCache({ query = '' }) {
  const cacheKey = useMemo(() => getAssetCacheKey(query), [query]);
  const cached = readAssetCache(cacheKey);

  if (!cached) {
    writeAssetCache(cacheKey, { query, cachedAt: Date.now() });
  }

  return <div className="text-xs text-slate-400">Asset cache key: {cacheKey}</div>;
}
