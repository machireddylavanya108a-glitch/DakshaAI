import test from 'node:test';
import assert from 'node:assert/strict';
import { buildFallbackLessonPackage, deriveLearningTitle, resolveLearningTopic } from './learningContentUtils.js';
import { buildKnowledgeGraph } from './knowledgeGraphEngine.js';
import { buildSceneBlueprint } from './aiSceneEngine.js';

test('deriveLearningTitle turns uploaded content into a readable lesson title', () => {
  assert.equal(deriveLearningTitle('Explain the solar system with planets and orbits', 'Adaptive lesson'), 'Solar system');
  assert.equal(deriveLearningTitle('react hooks basics', 'Adaptive lesson'), 'React hooks basics');
  assert.equal(deriveLearningTitle('notes.pdf', 'Adaptive lesson'), 'Adaptive lesson');
});

test('fallback lesson package always contains usable learning content', () => {
  const pkg = buildFallbackLessonPackage({ title: 'React Hooks', summary: 'Hooks help compose UI logic' });
  assert.ok(pkg.completeCourse.includes('Hooks help compose UI logic'));
  assert.ok(pkg.learningRoadmap.length > 0);
});

test('knowledge graph falls back to a non-empty structure when content is sparse', () => {
  const graph = buildKnowledgeGraph({ topic: '', prereqs: [], relatedTopics: [], advancedTopics: [], sourceText: '' });
  assert.ok(graph.nodes.length > 0);
  assert.ok(graph.edges.length > 0);
});

test('scene blueprint creates a non-empty fallback scene plan', () => {
  const blueprint = buildSceneBlueprint('', 'typed-topic');
  assert.ok(blueprint.entities.length > 0);
  assert.ok(blueprint.assetPlan.length > 0);
  assert.ok(blueprint.sceneTitle.length > 0);
});

test('resolveLearningTopic prioritizes confirmed user input over filenames', () => {
  const resolved = resolveLearningTopic({
    filename: 'Screenshot (35).png',
    extractedText: 'A lesson about photosynthesis and chloroplasts.',
    interviewTopic: 'Photosynthesis',
    userDescription: 'This image shows a plant cell diagram.'
  });

  assert.equal(resolved.topic, 'Plant cell diagram');
  assert.equal(resolved.confirmed, true);
  assert.equal(resolved.source, 'user-description');
});

test('resolveLearningTopic leaves filename-only topics unconfirmed', () => {
  const resolved = resolveLearningTopic({ filename: 'Screenshot (35).png' });
  assert.equal(resolved.topic, 'Topic not detected yet');
  assert.equal(resolved.confirmed, false);
  assert.equal(resolved.source, 'unknown');
});
