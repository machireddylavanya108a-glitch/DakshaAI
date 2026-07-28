import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildInterviewStorageKey,
  removeLegacyInterviewKeys,
  shouldOfferResumePrompt,
  shouldRenderInterviewModal,
  toTopicId
} from './interviewPersistence.js';

function makeStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, value);
    },
    removeItem(key) {
      data.delete(key);
    }
  };
}

test('buildInterviewStorageKey scopes to user flow and topic', () => {
  const key = buildInterviewStorageKey({ userId: 'u1', flowType: 'skill-first', topicId: 'Python Basics' });
  assert.equal(key, 'daksha-interview:u1:skill-first:python-basics');
});

test('content-first never renders adaptive interview modal', () => {
  const shouldRender = shouldRenderInterviewModal({
    flowType: 'content-first',
    interviewDecision: 'ADAPTIVE_INTERVIEW',
    questions: [{ id: 'q1' }]
  });
  assert.equal(shouldRender, false);
});

test('content-first never offers resume prompt', () => {
  const shouldResume = shouldOfferResumePrompt({
    flowType: 'content-first',
    currentTopicId: 'python',
    questions: [{ id: 'q1' }],
    savedInterview: {
      topicId: 'python',
      status: 'in_progress',
      questions: [{ id: 'q1' }]
    }
  });
  assert.equal(shouldResume, false);
});

test('python draft resumes only for python', () => {
  const saved = {
    topicId: 'python',
    status: 'in_progress',
    questions: [{ id: 'q1' }]
  };

  assert.equal(shouldOfferResumePrompt({
    flowType: 'skill-first',
    savedInterview: saved,
    currentTopicId: 'python',
    questions: [{ id: 'q1' }]
  }), true);

  assert.equal(shouldOfferResumePrompt({
    flowType: 'skill-first',
    savedInterview: saved,
    currentTopicId: 'react',
    questions: [{ id: 'q1' }]
  }), false);
});

test('completed interview does not show resume prompt', () => {
  const shouldResume = shouldOfferResumePrompt({
    flowType: 'skill-first',
    currentTopicId: 'python',
    questions: [{ id: 'q1' }],
    savedInterview: {
      topicId: 'python',
      status: 'completed',
      questions: [{ id: 'q1' }]
    }
  });
  assert.equal(shouldResume, false);
});

test('legacy global interview keys are removed safely', () => {
  const storage = makeStorage({
    learningInterview: 'a',
    interviewProgress: 'b',
    savedInterview: 'c',
    'daksha-learning-interview': 'd',
    learningInterviewDraft: 'e',
    keepHistory: 'stay'
  });

  const removed = removeLegacyInterviewKeys(storage);
  assert.equal(removed, 5);
  assert.equal(storage.getItem('learningInterview'), null);
  assert.equal(storage.getItem('interviewProgress'), null);
  assert.equal(storage.getItem('savedInterview'), null);
  assert.equal(storage.getItem('daksha-learning-interview'), null);
  assert.equal(storage.getItem('learningInterviewDraft'), null);
  assert.equal(storage.getItem('keepHistory'), 'stay');
});

test('topic id normalization stays stable across related labels', () => {
  assert.equal(toTopicId('Python  Basics'), 'python-basics');
  assert.equal(toTopicId('  python-basics '), 'python-basics');
});
