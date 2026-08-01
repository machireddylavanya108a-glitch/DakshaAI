export const NARRATION_CUE_TYPES = [
  'pause-point',
  'emphasis-point',
  'quiz-point',
  'recap-point',
  'interaction-point'
];

export const NARRATION_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

export const DEFAULT_NARRATION_CONFIG = {
  wordsPerMinute: 140,
  minSegmentDurationMs: 1200,
  maxSegmentDurationMs: 12000,
  maxSegments: 128,
  maxSentencesPerSegment: 3
};

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function toFiniteNumber(value, fallback = 0) {
  const cast = Number(value);
  return Number.isFinite(cast) ? cast : fallback;
}
