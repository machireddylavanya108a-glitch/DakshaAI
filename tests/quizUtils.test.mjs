import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateQuizResult, normalizeAnswer } from '../src/utils/quizUtils.js';

test('normalizeAnswer strips punctuation and casing', () => {
  assert.equal(normalizeAnswer('Paris, France!'), 'paris france');
  assert.equal(normalizeAnswer('  React  '), 'react');
});

test('calculateQuizResult returns accurate score summary', () => {
  const result = calculateQuizResult(
    [
      { answer: 'Paris' },
      { answer: '4' },
      { answer: 'True' },
    ],
    [
      { answer: 'Paris' },
      { answer: '4' },
      { answer: 'False' },
    ]
  );

  assert.equal(result.correctAnswers, 2);
  assert.equal(result.wrongAnswers, 1);
  assert.equal(result.score, 2);
  assert.equal(result.percentage, 66.67);
  assert.equal(result.grade, 'B');
});
