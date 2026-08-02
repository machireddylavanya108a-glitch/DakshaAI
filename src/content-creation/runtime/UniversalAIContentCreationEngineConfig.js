export const UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION = 'v1';

export const SUPPORTED_BASE_CONTENT_TYPES = [
  'complete-course',
  'chapters',
  'topics',
  'learning-objectives',
  'explanations',
  'examples',
  'analogies',
  'real-world-applications',
  'practical-exercises',
  'mini-projects',
  'capstone-projects',
  'assignments',
  'cheat-sheets',
  'revision-notes',
  'mind-maps',
  'knowledge-graph',
  'flashcards',
  'quiz-blueprint',
  'interview-questions',
  'viva-questions',
  'coding-challenges',
  'lab-activities',
  'worksheets',
  'case-studies',
  'formula-sheets',
  'glossary',
  'summary',
  'career-applications',
  'skill-outcomes',
  'learning-roadmap'
];

export const DEFAULT_UNIVERSAL_AI_CONTENT_CREATION_CONFIG = {
  schemaVersion: UNIVERSAL_AI_CONTENT_CREATION_SCHEMA_VERSION,
  persistenceKey: 'daksha.universal.ai.content.creation.engine.v1',
  maxChapters: 24,
  maxTopics: 120,
  maxObjectives: 120,
  maxContentItems: 240,
  maxFlashcards: 200,
  maxQuizItems: 200,
  maxHistory: 500,
  defaultLanguage: 'English',
  strictRendererAgnostic: true
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

export function normalizeContentType(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      type: 'generic-content',
      known: false
    };
  }

  return {
    type: normalized,
    known: SUPPORTED_BASE_CONTENT_TYPES.includes(normalized)
  };
}
