import { isObject } from './TimelineConfig.js';

export function createTimelineMarker(overrides = {}) {
  const source = isObject(overrides) ? overrides : {};
  return {
    id: source.id || '',
    type: source.type || 'chapter',
    time: Number.isFinite(Number(source.time)) ? Number(source.time) : 0,
    label: source.label || '',
    metadata: isObject(source.metadata) ? source.metadata : {},
    ...source
  };
}
