import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDynamicLessonPlan } from '../utils/aiTutorUtils.js';

test('buildDynamicLessonPlan creates concrete lessons with objectives, visuals, examples, quiz, practice, assignment, summary, revision, difficulty, and time estimate', () => {
  const lessons = buildDynamicLessonPlan('Trading', { difficulty: 'Beginner', lessonCount: 3 });

  assert.ok(Array.isArray(lessons));
  assert.ok(lessons.length >= 3);

  const firstLesson = lessons[0];
  assert.equal(firstLesson.title, 'Market Basics');
  assert.ok(firstLesson.objectives.length >= 2);
  assert.ok(firstLesson.visuals.length >= 1);
  assert.ok(firstLesson.examples.length >= 1);
  assert.ok(firstLesson.quiz.length >= 1);
  assert.ok(firstLesson.practice.length >= 1);
  assert.ok(firstLesson.assignment);
  assert.ok(firstLesson.summary);
  assert.ok(firstLesson.revision.length >= 1);
  assert.equal(firstLesson.difficulty, 'Beginner');
  assert.match(firstLesson.timeEstimate, /min/i);
});
