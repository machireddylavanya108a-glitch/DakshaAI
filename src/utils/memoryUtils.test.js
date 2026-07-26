import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMemoryProfile, summarizeText } from './memoryUtils.js';

test('summarizeText reduces text to compact tokens', () => {
  const summary = summarizeText('Machine learning is a fascinating topic!');
  assert.equal(summary, 'machine learning is a fascinating topic');
});

test('buildMemoryProfile derives recommendations from history', () => {
  const profile = buildMemoryProfile({
    learningHistory: [
      { title: 'Neural networks', summary: 'Studied backpropagation' },
      { title: 'Quiz', summary: 'Scored 62%' }
    ],
    weakConcepts: ['Backpropagation'],
    strongConcepts: ['Neural networks'],
    statistics: { lessonsCompleted: 2, averageQuizScore: 62 },
    preferences: { language: 'English', teacherStyle: 'friendly' },
  });

  assert.ok(profile.recommendations.length >= 2);
  assert.ok(profile.recommendations[0].includes('Backpropagation'));
});
