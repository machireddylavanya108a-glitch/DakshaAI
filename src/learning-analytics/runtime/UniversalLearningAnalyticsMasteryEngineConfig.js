export const UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION = 'v1';

export const SUPPORTED_ANALYTICS_WINDOWS = [
  'daily',
  'weekly',
  'monthly',
  'yearly',
  'lifetime'
];

export const SUPPORTED_DASHBOARD_AUDIENCES = [
  'learner',
  'teacher',
  'parent',
  'administrator'
];

export const DEFAULT_UNIVERSAL_LEARNING_ANALYTICS_CONFIG = {
  schemaVersion: UNIVERSAL_LEARNING_ANALYTICS_SCHEMA_VERSION,
  persistenceKey: 'daksha.universal.learning.analytics.mastery.v1',
  maxHistory: 800,
  maxRecommendations: 40,
  maxConcepts: 240,
  maxRevisionItems: 80,
  defaultLanguage: 'English',
  defaultLearningLevel: 'intermediate',
  strictRuntimeEventMode: true
};

export function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function asArray(value) {
  return Array.isArray(value) ? value : [];
}

export function safeString(value) {
  return String(value || '').trim();
}

export function toFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function clamp(value, minimum = 0, maximum = 1) {
  const numeric = toFiniteNumber(value, minimum);
  return Math.min(Math.max(numeric, minimum), maximum);
}

function normalizeToken(value = '') {
  return safeString(value)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export function normalizeAnalyticsWindow(value = '') {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return {
      window: 'lifetime',
      known: true
    };
  }

  if (SUPPORTED_ANALYTICS_WINDOWS.includes(normalized)) {
    return {
      window: normalized,
      known: true
    };
  }

  return {
    window: normalized,
    known: false
  };
}

export function normalizeDashboardAudience(value = '') {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return {
      audience: 'learner',
      known: true
    };
  }

  if (SUPPORTED_DASHBOARD_AUDIENCES.includes(normalized)) {
    return {
      audience: normalized,
      known: true
    };
  }

  return {
    audience: normalized,
    known: false
  };
}

export function normalizeLearningLevel(value = '') {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return {
      level: DEFAULT_UNIVERSAL_LEARNING_ANALYTICS_CONFIG.defaultLearningLevel,
      known: true
    };
  }

  return {
    level: normalized,
    known: ['beginner', 'intermediate', 'advanced', 'expert'].includes(normalized)
  };
}
