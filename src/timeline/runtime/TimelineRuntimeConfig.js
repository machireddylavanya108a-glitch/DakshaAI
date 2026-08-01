export const TIMELINE_PLAYBACK_STATES = [
  'Idle',
  'Loading',
  'Preparing',
  'Ready',
  'Playing',
  'Paused',
  'Seeking',
  'Waiting',
  'Buffering',
  'Completed',
  'Cancelled',
  'Error'
];

export const TIMELINE_RUNTIME_EVENTS = [
  'TimelineStarted',
  'TimelinePaused',
  'TimelineResumed',
  'TimelineStopped',
  'TimelineCompleted',
  'ClipStarted',
  'ClipCompleted',
  'MarkerReached',
  'EventReady',
  'ActionReady',
  'CheckpointReached',
  'TimelineError'
];

export const SUPPORTED_SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4];

export const LOOP_MODES = ['none', 'repeat-clip', 'repeat-section', 'repeat-lesson', 'repeat-range'];

export const DEFAULT_RUNTIME_CONFIG = {
  startState: 'Idle',
  initialSpeed: 1,
  maxQueueDepth: 50000,
  driftToleranceMs: 16,
  persistenceKey: 'daksha.timeline.runtime.v1',
  autoCheckpointIntervalMs: 10000,
  fpsTarget: 60
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
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

export function normalizeTimeMs(value, fallback = 0) {
  return Math.max(0, toFiniteNumber(value, fallback));
}
