import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdaptiveAssessment } from './adaptiveAssessmentEngine.js';

test('buildAdaptiveAssessment creates personalized assessments with varied formats', () => {
  const assessment = buildAdaptiveAssessment({
    topic: 'React Hooks',
    difficulty: 'Hard',
    questionCount: 6,
    learnerProfile: {
      focus: 'frontend',
      strengths: ['state management'],
      weaknesses: ['effects lifecycle'],
      learningStyle: 'visual',
      goal: 'interview prep'
    }
  });

  assert.equal(assessment.questions.length, 6);
  assert.match(assessment.title, /React Hooks/i);
  assert.ok(assessment.questions.some((question) => question.type === 'MCQ'));
  assert.ok(assessment.questions.some((question) => question.type === 'True/False'));
  assert.ok(assessment.questions.some((question) => question.type === 'Fill Blanks'));
  assert.ok(assessment.questions.some((question) => question.type === 'Coding'));
  assert.ok(assessment.questions.some((question) => question.personalization?.goal === 'interview prep'));
  assert.ok(assessment.questions.every((question) => question.difficulty === 'Hard'));
});

test('buildAdaptiveAssessment escalates expert questions and includes domain-specific cases', () => {
  const assessment = buildAdaptiveAssessment({
    topic: 'Medical imaging AI',
    difficulty: 'Expert',
    questionCount: 5,
    learnerProfile: {
      focus: 'healthcare',
      strengths: ['ethics'],
      weaknesses: ['diagnostics'],
      learningStyle: 'case-based',
      goal: 'career growth'
    }
  });

  assert.ok(assessment.questions.some((question) => question.type === 'Medical Cases'));
  assert.ok(assessment.questions.some((question) => question.type === 'Simulation'));
  assert.ok(assessment.questions.every((question) => question.difficulty === 'Expert'));
  assert.ok(assessment.questions.some((question) => question.personalization?.learningStyle === 'case-based'));
});
