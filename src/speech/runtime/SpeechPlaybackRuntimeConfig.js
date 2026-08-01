export const SPEECH_PLAYBACK_STATES = [
  'Idle',
  'Loading',
  'Buffering',
  'Ready',
  'Playing',
  'Paused',
  'Completed',
  'Cancelled',
  'Error'
];

export const DEFAULT_SPEECH_PLAYBACK_CONFIG = {
  persistenceKey: 'daksha.speech.runtime.v1',
  defaultVolume: 1,
  defaultMuted: false,
  defaultSpeed: 1
};

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

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
