export const LEARNING_MODES = [
  'beginner',
  'intermediate',
  'advanced',
  'exam-preparation',
  'interview-preparation',
  'project-based-learning',
  'research-mode'
];

export const DEFAULT_ADAPTIVE_ENGINE_CONFIG = {
  persistenceKey: 'daksha.adaptive.learning.runtime.v1',
  defaultMode: 'intermediate',
  responseTimeTargetMs: 6000,
  highStruggleThreshold: 0.62,
  lowStruggleThreshold: 0.28
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
