import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAdaptiveInterviewQuestions, determineInterviewRequirement } from './learningInterviewUtils.js';
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
  assert.ok(typeof scene.visualizationType === 'string');
  assert.ok(scene.visualizationType.length > 0);
});

test('content-first sources skip interview across text, image, pdf, website and youtube', () => {
  const sources = ['text', 'image', 'pdf', 'website', 'youtube'];
  for (const sourceType of sources) {
    assert.equal(determineInterviewRequirement({ sourceType, topicConfidence: 0.9, learningGoal: 'Uploaded content' }), 'NO_INTERVIEW');
  }
});

test('skill academy python allows adaptive interview', () => {
  const decision = determineInterviewRequirement({ sourceType: 'academy', topicConfidence: 0.2, learningGoal: 'Python skill roadmap' });
  assert.equal(decision, 'ADAPTIVE_INTERVIEW');
});
