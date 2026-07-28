import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssetManager, searchAssets, recommendAssets } from './assetManager.js';

test('asset manager returns reusable assets for anatomy and robotics', () => {
  const manager = createAssetManager();
  const anatomyAssets = manager.getAssetsByCategory('Human Anatomy');
  const roboticsAssets = manager.getAssetsByCategory('Robots');

  assert.ok(anatomyAssets.length >= 1);
  assert.ok(roboticsAssets.length >= 1);
});

test('asset search and recommendations find relevant 3D assets', () => {
  const matches = searchAssets('heart surgery');
  const recommendations = recommendAssets('robot arm');

  assert.ok(matches.some((asset) => asset.id === 'heart-anatomy'));
  assert.ok(recommendations.some((asset) => asset.id === 'robot-arm'));
});

test('asset planner builds an optimized plan for a lesson topic', () => {
  const manager = createAssetManager();
  const plan = manager.buildAssetPlan('Teach solar system and satellites', 'Space');

  assert.ok(plan.length >= 2);
  assert.ok(plan[0].lod);
  assert.ok(plan[0].compression);
  assert.equal(plan[0].lazyLoading.enabled, true);
});
