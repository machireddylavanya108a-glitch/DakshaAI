import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateLearningProgress, summarizeDashboardStats } from '../src/utils/dashboardUtils.js';

test('calculates learning progress from completed exercises', () => {
  const progress = [
    { exercises: [{ completed: true }, { completed: false }] },
    { exercises: [{ completed: true }, { completed: true }] }
  ];

  assert.equal(calculateLearningProgress(progress), 75);
});

test('summarizes dashboard stats for courses, quizzes and documents', () => {
  const stats = summarizeDashboardStats({
    lessonSuites: [{ topic: 'AI' }, { topic: 'ML' }],
    exerciseProgress: [{ exercises: [{ completed: true }, { completed: false }] }],
    quizScores: [{ score: 8, total: 10 }, { score: 5, total: 10 }],
    documentAnalyses: [{ fileName: 'one.pdf' }, { fileName: 'two.pdf' }]
  });

  assert.equal(stats.completedLessons, 1);
  assert.equal(stats.savedCourses, 2);
  assert.equal(stats.quizScores, 2);
  assert.equal(stats.learningProgress, 50);
  assert.equal(stats.recentDocuments.length, 2);
});
