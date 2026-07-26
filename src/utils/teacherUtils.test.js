import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeTeacherLesson } from './teacherUtils.js';

test('normalizeTeacherLesson returns teacher-ready sections from payload', () => {
  const lesson = normalizeTeacherLesson(
    {
      topic: 'React Hooks',
      beginner: 'Hooks let you use state in function components.',
      intermediate: 'Use effects to synchronize side effects.',
      advanced: 'Memoization and custom hooks reduce repetition.',
      examples: ['useState example', 'useEffect example'],
      importantPoints: ['State is local to a component.', 'Effects run after render.'],
      commonMistakes: ['Forgetting dependency arrays.']
    },
    'React Hooks'
  );

  assert.equal(lesson.topic, 'React Hooks');
  assert.equal(lesson.beginner, 'Hooks let you use state in function components.');
  assert.equal(lesson.intermediate, 'Use effects to synchronize side effects.');
  assert.equal(lesson.advanced, 'Memoization and custom hooks reduce repetition.');
  assert.deepEqual(lesson.examples, ['useState example', 'useEffect example']);
  assert.deepEqual(lesson.importantPoints, ['State is local to a component.', 'Effects run after render.']);
  assert.deepEqual(lesson.commonMistakes, ['Forgetting dependency arrays.']);
  assert.equal(lesson.summary, 'A strong summary of React Hooks should connect the basics, examples, and the main takeaway.');
});
