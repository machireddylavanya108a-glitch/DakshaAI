import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSceneBlueprint, buildSceneFromBlueprint } from './aiSceneEngine.js';

test('buildSceneBlueprint detects supported domains and assets', () => {
  const blueprint = buildSceneBlueprint('Explain the human heart, blood flow, and surgery steps');

  assert.equal(blueprint.domain, 'Human Anatomy');
  assert.ok(blueprint.entities.length >= 3);
  assert.ok(blueprint.assetPlan.length >= 1);
  assert.ok(blueprint.assetPlan[0].assetId);
  assert.ok(blueprint.assetPlan[0].lod);
  assert.ok(blueprint.assetPlan[0].compression);
  assert.equal(blueprint.assetPlan[0].lazyLoading.enabled, true);
});

test('buildSceneFromBlueprint returns a complete scene for programming lessons', () => {
  const blueprint = buildSceneBlueprint('Teach Python networking, sockets, and routers');
  const scene = buildSceneFromBlueprint(blueprint);

  assert.equal(blueprint.domain, 'Computer Science');
  assert.ok(scene.objects.length >= 3);
  assert.equal(scene.supports3D, true);
  assert.ok(scene.summary.includes('programming')); 
});
