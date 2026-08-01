import { isObject } from './TimelineConfig.js';

export function createTimelineClip(overrides = {}) {
  const source = isObject(overrides) ? overrides : {};
  const start = Number.isFinite(Number(source.start)) ? Number(source.start) : 0;
  const end = Number.isFinite(Number(source.end)) ? Number(source.end) : start;
  const duration = Number.isFinite(Number(source.duration)) ? Number(source.duration) : Math.max(0, end - start);

  return {
    id: source.id || '',
    start,
    end,
    duration,
    objects: Array.isArray(source.objects) ? source.objects : [],
    actions: Array.isArray(source.actions) ? source.actions : [],
    events: Array.isArray(source.events) ? source.events : [],
    metadata: isObject(source.metadata) ? source.metadata : {},
    ...source
  };
}
