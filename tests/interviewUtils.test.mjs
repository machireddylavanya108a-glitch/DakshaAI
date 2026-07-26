import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeInterviewQuestions } from '../src/utils/interviewUtils.js';

test('normalizes interview questions into beginner, intermediate and advanced categories', () => {
  const questions = normalizeInterviewQuestions(['Explain the basics', 'Discuss tradeoffs', 'Share a real-world case'], 'React');

  assert.equal(questions.length, 3);
  assert.equal(questions[0].category, 'Beginner');
  assert.equal(questions[1].category, 'Intermediate');
  assert.equal(questions[2].category, 'Advanced');
  assert.equal(questions[0].questions[0].question.includes('React'), true);
});
