export const TIMELINE_SCHEMA_LATEST_VERSION = 'v2';
export const TIMELINE_SUPPORTED_VERSIONS = ['v1', 'v2'];

export const TIMELINE_DEFAULT_TRACK_PURPOSE = 'generic';

export const KNOWN_MARKER_TYPES = [
  'chapter',
  'section',
  'checkpoint',
  'assessment',
  'camera',
  'focus',
  'narration',
  'interaction',
  'transition'
];

export const KNOWN_DEPENDENCY_TYPES = [
  'before',
  'after',
  'requires',
  'blocks',
  'optional',
  'parallel'
];

export function nowIso() {
  return new Date().toISOString();
}

export function normalizeVersion(version) {
  if (typeof version === 'number' && Number.isFinite(version)) {
    return `v${Math.max(1, Math.trunc(version))}`;
  }

  const text = String(version || '').trim().toLowerCase();
  if (!text) return 'v1';
  if (text.startsWith('v')) return text;
  if (/^\d+$/.test(text)) return `v${text}`;
  return 'v1';
}

export function stableHash(input = '') {
  const text = String(input || '');
  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, '0');
}

export function createDeterministicId(prefix = 'id', seed = '') {
  const hash = stableHash(`${prefix}|${seed}`);
  return `${prefix}-${hash.slice(0, 12)}`;
}

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asArray(value) {
  if (Array.isArray(value)) return value;
  if (value === null || value === undefined) return [];
  return [value];
}

export function toFiniteNumber(value, fallback = 0) {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
}

export function toBoolean(value, fallback = true) {
  if (typeof value === 'boolean') return value;
  return fallback;
}
