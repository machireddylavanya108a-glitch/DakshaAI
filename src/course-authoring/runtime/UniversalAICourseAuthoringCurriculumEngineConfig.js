export const UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION = 'v1';

export const SUPPORTED_CURRICULUM_LEVELS = ['beginner', 'intermediate', 'advanced', 'expert'];

export const SUPPORTED_BASE_CURRICULUM_TYPES = [
  'course',
  'modules',
  'chapters',
  'units',
  'topics',
  'subtopics',
  'learning-objectives',
  'prerequisites',
  'learning-outcomes',
  'estimated-duration',
  'difficulty-progression',
  'practice-schedule',
  'revision-schedule',
  'assessments',
  'projects',
  'capstone',
  'certification-path',
  'career-path',
  'skill-map',
  'knowledge-graph',
  'competency-matrix',
  'dependency-graph',
  'prerequisite-graph',
  'mastery-graph',
  'revision-graph',
  'project-roadmap',
  'course-version-metadata'
];

export const DEFAULT_UNIVERSAL_AI_CURRICULUM_CONFIG = {
  schemaVersion: UNIVERSAL_AI_CURRICULUM_SCHEMA_VERSION,
  persistenceKey: 'daksha.universal.ai.curriculum.engine.v1',
  maxModules: 20,
  maxChapters: 40,
  maxUnits: 120,
  maxTopics: 200,
  maxHistory: 500,
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
  const numeric = toFiniteNumber(value, minimum);
  return Math.min(Math.max(numeric, minimum), maximum);
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

export function normalizeCurriculumLevel(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      level: DEFAULT_UNIVERSAL_AI_CURRICULUM_CONFIG.defaultLevel,
      known: true
    };
  }

  if (SUPPORTED_CURRICULUM_LEVELS.includes(normalized)) {
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

export function normalizeCurriculumType(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      type: 'generic-curriculum',
      known: false
    };
  }

  return {
    type: normalized,
    known: SUPPORTED_BASE_CURRICULUM_TYPES.includes(normalized)
  };
}
