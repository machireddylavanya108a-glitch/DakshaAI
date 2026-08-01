import { TIMELINE_DEFAULT_TRACK_PURPOSE, isObject, toBoolean } from './TimelineConfig.js';

export function createTimelineTrack(overrides = {}) {
  const source = isObject(overrides) ? overrides : {};
  return {
    id: source.id || '',
    name: source.name || 'Track',
    purpose: source.purpose || TIMELINE_DEFAULT_TRACK_PURPOSE,
    priority: Number.isFinite(Number(source.priority)) ? Number(source.priority) : 0,
    enabled: toBoolean(source.enabled, true),
    events: Array.isArray(source.events) ? source.events : [],
    clips: Array.isArray(source.clips) ? source.clips : [],
    markers: Array.isArray(source.markers) ? source.markers : [],
    dependencies: Array.isArray(source.dependencies) ? source.dependencies : [],
    metadata: isObject(source.metadata) ? source.metadata : {},
    ...source
  };
}
