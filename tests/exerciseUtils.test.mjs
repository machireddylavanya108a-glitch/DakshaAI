import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePracticalExercises, calculateCompletionPercentage } from '../src/utils/exerciseUtils.js';

test('normalizes practical exercises with defaults and difficulty labels', () => {
  const exercises = normalizePracticalExercises([
    { title: 'Build a mini project', description: 'Create a small example', difficulty: 'Medium', steps: ['Plan', 'Code'], completed: true },
    { title: 'Reflect on the lesson', difficulty: 'Easy' }
  ], 'React');

  assert.equal(exercises.length, 2);
  assert.equal(exercises[0].difficulty, 'Medium');
  assert.equal(exercises[0].completed, true);
  assert.equal(exercises[1].steps.length, 1);
});

test('calculates completion percentage from completed exercises', () => {
  const exercises = [
    { completed: true },
    { completed: false },
    { completed: true }
  ];

  assert.equal(calculateCompletionPercentage(exercises), 67);
});
