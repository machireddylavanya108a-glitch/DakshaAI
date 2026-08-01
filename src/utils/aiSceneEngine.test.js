import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSceneBlueprint, buildSceneFromBlueprint, classifyUniversalSubject } from './aiSceneEngine.js';

test('buildSceneBlueprint emits universal classification and assets', () => {
  const blueprint = buildSceneBlueprint('Explain the human heart, blood flow, and surgery steps');

  assert.ok(blueprint.domain);
  assert.ok(blueprint.subDomain);
  assert.ok(blueprint.classification);
  assert.ok(blueprint.classification.visualization);
  assert.ok(blueprint.classification.objectCategory);
  assert.ok(blueprint.classification.interactionCategory);
  assert.ok(blueprint.classification.learningIntent);
  assert.ok(blueprint.classification.educationalStrategy);
  assert.ok(blueprint.classification.reasoningStyle);
  assert.ok(blueprint.entities.length >= 3);
  assert.ok(blueprint.assetPlan.length >= 1);
  assert.ok(blueprint.assetPlan[0].assetId);
  assert.ok(blueprint.assetPlan[0].lod);
  assert.ok(blueprint.assetPlan[0].compression);
  assert.equal(blueprint.assetPlan[0].lazyLoading.enabled, true);
});

test('buildSceneFromBlueprint returns a complete scene with classification metadata', () => {
  const blueprint = buildSceneBlueprint('Teach Python networking, sockets, and routers');
  const scene = buildSceneFromBlueprint(blueprint);

  assert.ok(scene.domain);
  assert.ok(scene.subDomain);
  assert.ok(scene.classification);
  assert.ok(scene.objects.length >= 3);
  assert.equal(scene.supports3D, true);
  assert.ok(scene.summary.length > 20);
});

test('unknown sparse input uses adaptive custom classification', () => {
  const classification = classifyUniversalSubject('', 'typed-topic');
  assert.equal(classification.domain, 'Custom');
  assert.equal(classification.visualization, 'Adaptive');
  assert.equal(classification.objectCategory, 'Dynamic');
  assert.equal(classification.interactionCategory, 'Generic Exploration');
});
