export const UNIVERSAL_AI_TEACHER_SCHEMA_VERSION = 'v1';

export const SUPPORTED_TEACHING_ACTIONS = [
  'explain',
  'demonstrate',
  'compare',
  'ask-questions',
  'give-hints',
  'repeat',
  'simplify',
  'deep-dive',
  'summarize',
  'motivate',
  'assess-understanding'
];

export const SUPPORTED_LEARNING_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

export const SUPPORTED_LEARNER_MODES = [
  'weak-learners',
  'fast-learners',
  'visual-learners',
  'practical-learners',
  'revision-mode',
  'interview-mode',
  'exam-mode'
];

export const DEFAULT_AI_TEACHER_ENGINE_CONFIG = {
  schemaVersion: UNIVERSAL_AI_TEACHER_SCHEMA_VERSION,
  persistenceKey: 'daksha.universal.ai.teacher.engine.v1',
  maxNarrationSegments: 80,
  maxExplanationSteps: 120,
  maxCues: 240,
  maxHistory: 400,
  defaultLanguage: 'English',
  defaultLearningLevel: 'intermediate',
  defaultPacing: 1,
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

export function normalizeLearningLevel(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      level: DEFAULT_AI_TEACHER_ENGINE_CONFIG.defaultLearningLevel,
      known: true
    };
  }

  if (SUPPORTED_LEARNING_LEVELS.includes(normalized)) {
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

export function normalizeLearnerMode(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      mode: 'revision-mode',
      known: true
    };
  }

  if (SUPPORTED_LEARNER_MODES.includes(normalized)) {
    return {
      mode: normalized,
      known: true
    };
  }

  return {
    mode: normalized,
    known: false
  };
}

export function normalizeTeachingAction(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      action: 'explain',
      known: true
    };
  }

  if (SUPPORTED_TEACHING_ACTIONS.includes(normalized)) {
    return {
      action: normalized,
      known: true
    };
  }

  return {
    action: normalized,
    known: false
  };
}
