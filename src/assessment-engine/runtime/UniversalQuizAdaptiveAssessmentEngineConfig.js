export const UNIVERSAL_ASSESSMENT_SCHEMA_VERSION = 'v1';

export const SUPPORTED_QUESTION_TYPES = [
  'mcq',
  'multiple-select',
  'true-false',
  'fill-in-the-blank',
  'short-answer',
  'long-answer',
  'match-the-following',
  'ordering',
  'diagram-labeling',
  'code-completion',
  'scenario-based',
  'case-study',
  'simulation',
  'practical-task',
  'oral-question',
  'interactive-object-question'
];

export const SUPPORTED_ASSESSMENT_MODES = [
  'practice-mode',
  'exam-mode',
  'interview-mode',
  'certification-mode',
  'revision-mode'
];

export const SUPPORTED_DIFFICULTY_LEVELS = [
  'beginner',
  'intermediate',
  'advanced',
  'expert'
];

export const DEFAULT_UNIVERSAL_ASSESSMENT_CONFIG = {
  schemaVersion: UNIVERSAL_ASSESSMENT_SCHEMA_VERSION,
  persistenceKey: 'daksha.universal.quiz.adaptive.assessment.v1',
  maxQuestions: 120,
  maxQuestionBank: 300,
  maxHistory: 400,
  defaultLanguage: 'English',
  defaultDifficulty: 'intermediate',
  defaultMode: 'practice-mode'
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

function normalizeToken(value = '') {
  return safeString(value)
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-');
}

export function normalizeQuestionType(value = '') {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return {
      type: 'mcq',
      known: true
    };
  }

  if (SUPPORTED_QUESTION_TYPES.includes(normalized)) {
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

export function normalizeAssessmentMode(value = '') {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return {
      mode: DEFAULT_UNIVERSAL_ASSESSMENT_CONFIG.defaultMode,
      known: true
    };
  }

  if (SUPPORTED_ASSESSMENT_MODES.includes(normalized)) {
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

export function normalizeDifficultyLevel(value = '') {
  const normalized = normalizeToken(value);
  if (!normalized) {
    return {
      level: DEFAULT_UNIVERSAL_ASSESSMENT_CONFIG.defaultDifficulty,
      known: true
    };
  }

  if (SUPPORTED_DIFFICULTY_LEVELS.includes(normalized)) {
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
