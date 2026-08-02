export const UNIVERSAL_AI_VOICE_CONVERSATION_SCHEMA_VERSION = 'v1';

export const SUPPORTED_BASE_CONVERSATION_TYPES = [
  'one-to-one-ai-tutor',
  'one-to-many-classroom',
  'many-to-many-collaborative-classroom',
  'teacher-and-students',
  'student-groups',
  'peer-learning',
  'discussion-session',
  'live-q-and-a',
  'office-hours',
  'interview-practice',
  'presentation-practice',
  'debate-session',
  'code-review-session',
  'whiteboard-session-metadata'
];

export const SUPPORTED_BASE_CONVERSATION_CAPABILITIES = [
  'explain',
  'answer',
  'ask',
  'clarify',
  'summarize',
  'repeat',
  'simplify',
  'expand',
  'compare',
  'challenge',
  'encourage',
  'coach',
  'moderate',
  'facilitate-discussion'
];

export const DEFAULT_UNIVERSAL_AI_VOICE_CONVERSATION_CONFIG = {
  schemaVersion: UNIVERSAL_AI_VOICE_CONVERSATION_SCHEMA_VERSION,
  persistenceKey: 'daksha.universal.ai.voice.conversation.engine.v1',
  maxParticipants: 500,
  maxTurns: 1500,
  maxEvents: 2000,
  maxQueueEntries: 800,
  maxHistory: 1500,
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

export function normalizeConversationType(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      conversationType: 'one-to-one-ai-tutor',
      known: true
    };
  }

  const alias = {
    tutoring: 'one-to-one-ai-tutor',
    classroom: 'one-to-many-classroom',
    collaborative: 'many-to-many-collaborative-classroom',
    debate: 'debate-session',
    'q-and-a': 'live-q-and-a',
    qa: 'live-q-and-a',
    whiteboard: 'whiteboard-session-metadata'
  };

  const conversationType = alias[normalized] || normalized;
  return {
    conversationType,
    known: SUPPORTED_BASE_CONVERSATION_TYPES.includes(conversationType)
  };
}

export function normalizeConversationCapability(value = '') {
  const normalized = safeString(value).toLowerCase().replace(/[\s_]+/g, '-');
  if (!normalized) {
    return {
      capability: 'explain',
      known: true
    };
  }

  const alias = {
    facilitate: 'facilitate-discussion',
    moderation: 'moderate',
    questioning: 'ask',
    guidance: 'coach'
  };

  const capability = alias[normalized] || normalized;
  return {
    capability,
    known: SUPPORTED_BASE_CONVERSATION_CAPABILITIES.includes(capability)
  };
}
