import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAdaptiveInterviewQuestions,
  determineInterviewRequirement
} from '../src/utils/learningInterviewUtils.js';

test('content-first sources skip the full interview and stay on a lightweight path', () => {
  const decision = determineInterviewRequirement({ sourceType: 'pdf', topicConfidence: 0.9, learningGoal: 'Uploaded PDF' });
  assert.equal(decision, 'NO_INTERVIEW');
});

test('text and website inputs stay lightweight', () => {
  assert.equal(determineInterviewRequirement({ sourceType: 'text', topicConfidence: 0.9, learningGoal: 'Pasted text' }), 'NO_INTERVIEW');
  assert.equal(determineInterviewRequirement({ sourceType: 'website', topicConfidence: 0.9, learningGoal: 'Website article' }), 'NO_INTERVIEW');
});

test('image and audio inputs stay lightweight', () => {
  assert.equal(determineInterviewRequirement({ sourceType: 'image', topicConfidence: 0.9, learningGoal: 'Uploaded image' }), 'NO_INTERVIEW');
  assert.equal(determineInterviewRequirement({ sourceType: 'voice', topicConfidence: 0.9, learningGoal: 'Voice note' }), 'NO_INTERVIEW');
});

test('skill-first learning uses adaptive interview questions', () => {
  const questions = buildAdaptiveInterviewQuestions('Python', {}, { mode: 'skill' });
  assert.ok(questions.length > 0);
  assert.equal(questions[0].id, 'reason');
});

test('profile-aware skill learning asks fewer questions', () => {
  const questions = buildAdaptiveInterviewQuestions('React', { preferredLanguage: 'English', age: '22' }, { mode: 'skill' });
  assert.ok(questions.length <= 3);
  assert.ok(questions.some((question) => question.id === 'reason'));
});
