export const UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_SCHEMA_VERSION = 'v1';

export const SUPPORTED_BASE_MENTOR_TYPES = [
  'universal-mentor',
  'universal-coach',
  'universal-interviewer',
  'career-mentor',
  'skill-coach',
  'project-coach',
  'research-mentor',
  'startup-mentor',
  'business-mentor',
  'programming-mentor',
  'soft-skills-coach',
  'leadership-coach',
  'communication-coach',
  'mock-interview',
  'technical-interview',
  'behavioral-interview',
  'hr-interview',
  'case-study-interview',
  'presentation-evaluation',
  'portfolio-review',
  'project-review'
];

export const SUPPORTED_BASE_CAPABILITIES = [
  'mentor',
  'coach',
  'interview',
  'evaluate',
  'guide',
  'motivate',
  'challenge',
  'encourage',
  'recommend',
  'explain',
  'assess',
  'review',
  'score',
  'forecast'
];

export const DEFAULT_UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_CONFIG = {
  schemaVersion: UNIVERSAL_AI_MENTOR_COACH_INTERVIEWER_SCHEMA_VERSION,
  persistenceKey: 'daksha.universal.ai.mentor.coach.interviewer.engine.v1',
  maxItems: 400,
  maxEvents: 1600,
  maxHistory: 1400,
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

export function normalizeMentorType(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      mentorType: 'universal-mentor',
      known: true
    };
  }

  const alias = {
    mentoring: 'universal-mentor',
    coaching: 'universal-coach',
    interviewing: 'universal-interviewer',
    interview: 'mock-interview',
    technical: 'technical-interview',
    behavioral: 'behavioral-interview'
  };

  const mentorType = alias[normalized] || normalized;
  return {
    mentorType,
    known: SUPPORTED_BASE_MENTOR_TYPES.includes(mentorType)
  };
}

export function normalizeCapability(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      capability: 'mentor',
      known: true
    };
  }

  const alias = {
    mentoring: 'mentor',
    coaching: 'coach',
    interviewing: 'interview',
    evaluation: 'evaluate',
    recommendation: 'recommend'
  };

  const capability = alias[normalized] || normalized;
  return {
    capability,
    known: SUPPORTED_BASE_CAPABILITIES.includes(capability)
  };
}
