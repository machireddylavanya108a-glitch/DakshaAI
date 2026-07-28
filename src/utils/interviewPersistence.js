const LEGACY_INTERVIEW_KEYS = [
  'learningInterview',
  'interviewProgress',
  'savedInterview',
  'daksha-learning-interview',
  'learningInterviewDraft'
];

export function toTopicId(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'general';
}

export function buildInterviewStorageKey({ userId = 'guest', flowType = 'skill-first', topicId = 'general' } = {}) {
  const safeUserId = String(userId || 'guest').trim() || 'guest';
  const safeFlowType = flowType === 'skill-first' ? 'skill-first' : 'content-first';
  const safeTopicId = toTopicId(topicId);
  return `daksha-interview:${safeUserId}:${safeFlowType}:${safeTopicId}`;
}

function canUseStorage(storage = null) {
  return Boolean(storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function');
}

export function readInterviewDraft(storage, key) {
  if (!canUseStorage(storage) || !key) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function writeInterviewDraft(storage, key, payload) {
  if (!canUseStorage(storage) || !key) return false;
  try {
    storage.setItem(key, JSON.stringify(payload || {}));
    return true;
  } catch {
    return false;
  }
}

export function removeInterviewDraft(storage, key) {
  if (!canUseStorage(storage) || !key) return false;
  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function removeLegacyInterviewKeys(storage) {
  if (!canUseStorage(storage)) return 0;
  let removed = 0;
  for (const key of LEGACY_INTERVIEW_KEYS) {
    try {
      if (storage.getItem(key) !== null) {
        storage.removeItem(key);
        removed += 1;
      }
    } catch {
      // ignore per-key failures
    }
  }
  return removed;
}

export function shouldRenderInterviewModal({
  flowType = '',
  interviewDecision = '',
  questions = []
} = {}) {
  return flowType === 'skill-first'
    && interviewDecision === 'ADAPTIVE_INTERVIEW'
    && Array.isArray(questions)
    && questions.length > 0;
}

export function shouldOfferResumePrompt({
  flowType = '',
  savedInterview = null,
  currentTopicId = '',
  questions = []
} = {}) {
  if (flowType !== 'skill-first') return false;
  if (!savedInterview || typeof savedInterview !== 'object') return false;

  const savedTopicId = toTopicId(savedInterview.topicId || savedInterview.sourceLabel || savedInterview.topic || '');
  const expectedTopicId = toTopicId(currentTopicId);

  if (!savedTopicId || savedTopicId !== expectedTopicId) return false;
  if (savedInterview.status === 'completed') return false;

  const savedQuestions = Array.isArray(savedInterview.questions) ? savedInterview.questions : [];
  if (savedQuestions.length === 0) return false;

  if (!Array.isArray(questions) || questions.length === 0) return false;
  return true;
}
