export const SUPPORTED_EDUCATIONAL_OBJECT_CAPABILITIES = [
  'inspect',
  'explain',
  'highlight',
  'isolate',
  'hide',
  'show',
  'explode',
  'assemble',
  'cross-section',
  'x-ray',
  'compare',
  'annotate',
  'measure',
  'rotate',
  'zoom',
  'move',
  'duplicate',
  'reset'
];

export const DEFAULT_EDUCATIONAL_INSPECTION_CONFIG = {
  persistenceKey: 'daksha.educational.inspection.runtime.v1',
  maxHistoryEntries: 200,
  maxEventHistory: 500,
  maxWarnings: 200,
  maxAnnotationsPerObject: 200,
  maxMeasurementsPerObject: 200
};

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value, minimum = 0, maximum = 1) {
  return Math.min(Math.max(toFiniteNumber(value, minimum), minimum), maximum);
}

function toKebab(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeCapability(input = 'inspect') {
  const normalized = toKebab(input || 'inspect');

  if (!normalized) {
    return {
      capability: 'inspect',
      known: true
    };
  }

  if (normalized === 'crosssection') {
    return {
      capability: 'cross-section',
      known: true
    };
  }

  if (normalized === 'xray') {
    return {
      capability: 'x-ray',
      known: true
    };
  }

  return {
    capability: normalized,
    known: SUPPORTED_EDUCATIONAL_OBJECT_CAPABILITIES.includes(normalized)
  };
}
