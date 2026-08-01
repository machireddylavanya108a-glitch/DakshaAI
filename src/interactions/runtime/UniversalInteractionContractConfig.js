export const SUPPORTED_INTERACTION_TYPES = [
  'click',
  'double-click',
  'hover',
  'focus',
  'inspect',
  'select',
  'drag',
  'drop',
  'rotate',
  'zoom',
  'pan',
  'expand',
  'collapse',
  'highlight',
  'compare',
  'open-details',
  'custom'
];

export const DEFAULT_INTERACTION_CONTRACT_CONFIG = {
  persistenceKey: 'daksha.interaction.contract.runtime.v1',
  maxEventHistory: 500,
  maxObjectContracts: 1000,
  defaultCheckpointPolicy: {
    onInteract: false,
    checkpointType: 'interaction'
  }
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

export function normalizeInteractionType(input = 'custom') {
  const normalized = toKebab(input || 'custom');

  if (!normalized) {
    return {
      type: 'custom',
      known: true
    };
  }

  if (normalized === 'doubleclick') {
    return {
      type: 'double-click',
      known: true
    };
  }

  if (normalized === 'opendetails') {
    return {
      type: 'open-details',
      known: true
    };
  }

  if (SUPPORTED_INTERACTION_TYPES.includes(normalized)) {
    return {
      type: normalized,
      known: true
    };
  }

  return {
    type: normalized,
    known: false
  };
}
