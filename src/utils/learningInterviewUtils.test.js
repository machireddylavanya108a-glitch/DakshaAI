import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdaptiveInterviewQuestions } from './learningInterviewUtils.js';
import { buildAuto3DSceneForLesson } from './aiSceneEngine.js';

test('buildAdaptiveInterviewQuestions skips redundant questions when profile already knows the basics', () => {
  const questions = buildAdaptiveInterviewQuestions('Python', {
    learnTopic: 'Python',
    preferredLanguage: 'English',
    currentLevel: 'Beginner'
  }, {
    mode: 'skill',
    profile: {
      age: '21',
      education: 'B.Tech',
      dailyStudyTime: '1 hour',
      learningStyle: 'Practice',
      learningSpeed: 'Normal',
      endGoal: 'Get Job',
      preferredLanguage: 'English'
    }
  });

  assert.equal(questions.length, 1);
  assert.equal(questions[0].id, 'reason');
});

test('buildAuto3DSceneForLesson uses a non-3D visualization strategy for programming and business topics', () => {
  const scene = buildAuto3DSceneForLesson('Explain a Python trading strategy with charts and process flow.', 'skill');
  assert.equal(scene.supports3D, false);
  assert.ok(['timeline', 'diagram', 'chart', 'concept-map'].includes(scene.visualizationType));
});
