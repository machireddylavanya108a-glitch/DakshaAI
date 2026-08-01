export const SCENE_EVENT_STATES = [
  'queued',
  'scheduled',
  'dispatched',
  'completed',
  'failed',
  'skipped',
  'cancelled'
];

export const SCENE_EVENT_SOURCES = [
  'timeline-event',
  'timeline-marker',
  'timeline-action',
  'graph-interaction',
  'legacy-scene'
];

export const DEFAULT_SCENE_EVENT_PRIORITY = 0;

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

export function toFiniteNumber(value, fallback = 0) {
  const cast = Number(value);
  return Number.isFinite(cast) ? cast : fallback;
}

export function normalizeEventTimeMs(value, fallback = 0) {
  return Math.max(0, toFiniteNumber(value, fallback));
}
