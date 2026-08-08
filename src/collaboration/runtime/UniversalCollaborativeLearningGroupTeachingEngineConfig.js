export const UNIVERSAL_COLLABORATIVE_LEARNING_SCHEMA_VERSION = 'v1';

export const SUPPORTED_BASE_COLLABORATION_MODELS = [
  'one-teacher-many-students',
  'multiple-teachers',
  'ai-human-teacher',
  'small-study-group',
  'large-classroom',
  'team-learning',
  'project-collaboration',
  'pair-programming',
  'peer-review',
  'debate-session',
  'group-discussion',
  'workshop',
  'lab',
  'future-collaboration-model'
];

export const SUPPORTED_BASE_COLLABORATION_CAPABILITIES = [
  'collaborate',
  'discuss',
  'review',
  'moderate',
  'evaluate',
  'assign',
  'mentor',
  'coach',
  'synchronize',
  'vote',
  'resolve-conflicts',
  'share-progress',
  'coordinate-learning'
];

export const DEFAULT_UNIVERSAL_COLLABORATIVE_LEARNING_CONFIG = {
  schemaVersion: UNIVERSAL_COLLABORATIVE_LEARNING_SCHEMA_VERSION,
  persistenceKey: 'daksha.universal.collaborative.learning.engine.v1',
  maxParticipants: 500,
  maxHistory: 1800,
  maxEvents: 2000,
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

export function uniqueStrings(values = [], max = 600) {
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

export function normalizeCollaborationModel(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      collaborationModel: 'small-study-group',
      known: true
    };
  }

  const alias = {
    classroom: 'large-classroom',
    'teacher-classroom': 'one-teacher-many-students',
    'group-study': 'small-study-group',
    'team-work': 'team-learning',
    'coding-pair': 'pair-programming',
    'peer-review-cycle': 'peer-review',
    workshop: 'workshop',
    lab: 'lab',
    debate: 'debate-session',
    discussion: 'group-discussion',
    'project-team': 'project-collaboration',
    'future-mode': 'future-collaboration-model'
  };

  const collaborationModel = alias[normalized] || normalized;
  return {
    collaborationModel,
    known: SUPPORTED_BASE_COLLABORATION_MODELS.includes(collaborationModel)
  };
}

export function normalizeParticipantType(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      participantType: 'learner',
      known: true
    };
  }

  const alias = {
    tutor: 'ai-tutor',
    teacher: 'teacher',
    mentor: 'mentor',
    facilitator: 'moderator',
    student: 'learner',
    learner: 'learner',
    'peer-reviewer': 'reviewer',
    reviewer: 'reviewer',
    manager: 'project-manager',
    assistant: 'assistant'
  };

  const participantType = alias[normalized] || normalized;
  return {
    participantType,
    known: ['teacher', 'mentor', 'ai-tutor', 'learner', 'reviewer', 'moderator', 'project-manager', 'assistant'].includes(participantType)
  };
}

export function normalizeCapability(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      capability: 'collaborate',
      known: true
    };
  }

  const alias = {
    share: 'share-progress',
    discuss: 'discuss',
    review: 'review',
    moderate: 'moderate',
    assignment: 'assign',
    sync: 'synchronize',
    conflict: 'resolve-conflicts',
    coordination: 'coordinate-learning',
    guidance: 'coach',
    teaching: 'mentor'
  };

  const capability = alias[normalized] || normalized;
  return {
    capability,
    known: SUPPORTED_BASE_COLLABORATION_CAPABILITIES.includes(capability)
  };
}
