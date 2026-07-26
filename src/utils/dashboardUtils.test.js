import test from 'node:test';
import assert from 'node:assert/strict';
import { summarizeDashboardStats } from './dashboardUtils.js';

test('summarizeDashboardStats builds a rich dashboard snapshot', () => {
  const stats = summarizeDashboardStats({
    lessonSuites: [{ id: '1' }],
    exerciseProgress: [{ exercises: [{ completed: true }, { completed: false }] }],
    quizScores: [{ score: 8, total: 10 }, { score: 6, total: 10 }],
    documentAnalyses: [{ fileName: 'Notes.pdf' }],
    flashcards: [{ id: '1' }, { id: '2' }],
    memoryProfile: { weakConcepts: ['React'], strongConcepts: ['JavaScript'] }
  });

  assert.equal(stats.studyHours > 0, true);
  assert.equal(stats.lessons, 2);
  assert.equal(stats.quizzes, 2);
  assert.equal(stats.accuracy >= 0, true);
  assert.ok(stats.recommendations.length >= 3);
  assert.ok(stats.achievements.length >= 2);
  assert.ok(stats.weeklyData.length >= 4);
});
