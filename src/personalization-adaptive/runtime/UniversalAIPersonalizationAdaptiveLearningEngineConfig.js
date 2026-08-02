export const UNIVERSAL_AI_PERSONALIZATION_SCHEMA_VERSION = 'v1';

export const SUPPORTED_PERSONALIZATION_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

export const DEFAULT_UNIVERSAL_AI_PERSONALIZATION_CONFIG = {
  schemaVersion: UNIVERSAL_AI_PERSONALIZATION_SCHEMA_VERSION,
  persistenceKey: 'daksha.universal.ai.personalization.engine.v1',
  maxPathSteps: 240,
  maxRecommendations: 240,
  maxMilestones: 200,
  maxHistory: 800,
  defaultLanguage: 'English',
  defaultLevel: 'intermediate'
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
  const numberValue = toFiniteNumber(value, minimum);
  return Math.min(Math.max(numberValue, minimum), maximum);
}

export function uniqueStrings(values = [], max = 240) {
  const output = [];
  const seen = new Set();

  asArray(values).forEach((value) => {
    const text = safeString(value);
    if (!text) return;
    const key = text.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    output.push(text);
  });

  return output.slice(0, max);
}

export function normalizePersonalizationLevel(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      level: DEFAULT_UNIVERSAL_AI_PERSONALIZATION_CONFIG.defaultLevel,
      known: true
    };
  }

  if (SUPPORTED_PERSONALIZATION_LEVELS.includes(normalized)) {
    return {
      level: normalized,
      known: true
    };
  }

  return {
    level: normalized,
    known: false
  };
}
