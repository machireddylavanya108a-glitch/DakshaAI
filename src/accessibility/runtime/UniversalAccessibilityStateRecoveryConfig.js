export const SUPPORTED_ACCESSIBILITY_FEATURES = [
  'keyboard-navigation',
  'screen-reader-metadata',
  'focus-management',
  'high-contrast-mode',
  'scalable-ui',
  'captions-metadata',
  'narration-metadata',
  'reduced-motion',
  'font-scaling',
  'interaction-timing'
];

export const DEFAULT_ACCESSIBILITY_RECOVERY_CONFIG = {
  schemaVersion: 'v2',
  persistenceKey: 'daksha.accessibility.recovery.runtime.v2',
  maxWarnings: 200,
  maxEvents: 600,
  maxFocusHistory: 250,
  maxRecoverableErrors: 100,
  defaultUiScale: 1,
  defaultFontScale: 1,
  defaultInteractionTimingMs: 0,
  defaultReducedMotion: false,
  defaultHighContrastMode: false
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

export function sanitizeString(value, maxLength = 3000) {
  return String(value ?? '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .trim()
    .slice(0, maxLength);
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

export function normalizeAccessibilityFeature(input = 'keyboard-navigation') {
  const normalized = toKebab(input || 'keyboard-navigation');

  if (!normalized) {
    return {
      feature: 'keyboard-navigation',
      known: true
    };
  }

  if (normalized === 'keyboardnavigation') {
    return {
      feature: 'keyboard-navigation',
      known: true
    };
  }

  if (normalized === 'screenreadermetadata') {
    return {
      feature: 'screen-reader-metadata',
      known: true
    };
  }

  if (normalized === 'focusmanagement') {
    return {
      feature: 'focus-management',
      known: true
    };
  }

  if (normalized === 'highcontrastmode') {
    return {
      feature: 'high-contrast-mode',
      known: true
    };
  }

  if (normalized === 'scalableui') {
    return {
      feature: 'scalable-ui',
      known: true
    };
  }

  if (normalized === 'captionsmetadata') {
    return {
      feature: 'captions-metadata',
      known: true
    };
  }

  if (normalized === 'narrationmetadata') {
    return {
      feature: 'narration-metadata',
      known: true
    };
  }

  if (normalized === 'reducedmotion') {
    return {
      feature: 'reduced-motion',
      known: true
    };
  }

  if (normalized === 'fontscaling') {
    return {
      feature: 'font-scaling',
      known: true
    };
  }

  if (normalized === 'interactiontiming') {
    return {
      feature: 'interaction-timing',
      known: true
    };
  }

  return {
    feature: normalized,
    known: SUPPORTED_ACCESSIBILITY_FEATURES.includes(normalized)
  };
}

export function sanitizeMetadata(input = {}, depth = 0) {
  if (depth > 8) return '[truncated-depth]';

  if (input === null || input === undefined) return input;
  if (typeof input === 'function' || typeof input === 'symbol') return undefined;

  if (typeof input === 'string') {
    return sanitizeString(input);
  }

  if (typeof input !== 'object') return input;

  if (Array.isArray(input)) {
    return input
      .slice(0, 500)
      .map((entry) => sanitizeMetadata(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }

  const output = Object.create(null);
  Object.entries(input).forEach(([key, value]) => {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') return;
    const cleaned = sanitizeMetadata(value, depth + 1);
    if (cleaned !== undefined) {
      output[key] = cleaned;
    }
  });

  return output;
}
