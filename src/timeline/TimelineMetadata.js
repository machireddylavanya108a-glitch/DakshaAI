import { nowIso, isObject } from './TimelineConfig.js';

export function createTimelineMetadata(overrides = {}) {
  const source = isObject(overrides) ? overrides : {};
  return {
    createdAt: source.createdAt || nowIso(),
    updatedAt: source.updatedAt || nowIso(),
    source: source.source || 'unknown',
    sourceType: source.sourceType || 'unknown',
    tags: Array.isArray(source.tags) ? source.tags : [],
    ...source
  };
}
