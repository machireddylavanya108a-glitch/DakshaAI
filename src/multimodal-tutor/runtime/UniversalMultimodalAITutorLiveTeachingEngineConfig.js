export const UNIVERSAL_MULTIMODAL_AI_TUTOR_SCHEMA_VERSION = 'v1';

export const SUPPORTED_BASE_TEACHING_MODALITIES = [
  'text',
  'voice-metadata',
  'image-metadata',
  'diagram-metadata',
  'animation-metadata',
  '3d-scene-metadata',
  'interaction-metadata',
  'quiz-metadata'
];

export const SUPPORTED_BASE_TUTOR_CAPABILITIES = [
  'explain',
  'demonstrate',
  'compare',
  'visualize',
  'simplify',
  'expand',
  'ask-questions',
  'give-hints',
  'recap',
  'revise',
  'motivate',
  'challenge',
  'coach'
];

export const DEFAULT_UNIVERSAL_MULTIMODAL_AI_TUTOR_CONFIG = {
  schemaVersion: UNIVERSAL_MULTIMODAL_AI_TUTOR_SCHEMA_VERSION,
  persistenceKey: 'daksha.universal.ai.multimodal.tutor.engine.v1',
  maxPlanSteps: 240,
  maxCues: 400,
  maxPrompts: 300,
  maxEvents: 1500,
  maxHistory: 1200,
  defaultLanguage: 'English'
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

export function uniqueStrings(values = [], max = 500) {
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

export function normalizeTeachingModality(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      modality: 'text',
      known: true
    };
  }

  const alias = {
    voice: 'voice-metadata',
    speech: 'voice-metadata',
    audio: 'voice-metadata',
    image: 'image-metadata',
    diagram: 'diagram-metadata',
    animation: 'animation-metadata',
    '3d': '3d-scene-metadata',
    '3d-scene': '3d-scene-metadata',
    scene: '3d-scene-metadata',
    interaction: 'interaction-metadata',
    quiz: 'quiz-metadata'
  };

  const modality = alias[normalized] || normalized;
  const known = SUPPORTED_BASE_TEACHING_MODALITIES.includes(modality);

  return {
    modality,
    known
  };
}

export function normalizeTutorCapability(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      capability: 'explain',
      known: true
    };
  }

  const alias = {
    explainers: 'explain',
    demonstration: 'demonstrate',
    questions: 'ask-questions',
    hints: 'give-hints',
    summary: 'recap',
    revision: 'revise'
  };

  const capability = alias[normalized] || normalized;
  const known = SUPPORTED_BASE_TUTOR_CAPABILITIES.includes(capability);

  return {
    capability,
    known
  };
}
