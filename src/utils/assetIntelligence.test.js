import test from 'node:test';
import assert from 'node:assert/strict';
import { createAssetManager, getAssetRecommendation } from './assetManager.js';
import { buildAuto3DSceneForLesson } from './aiSceneEngine.js';

test('asset intelligence ranks and recommends reusable assets for lesson content', () => {
  const manager = createAssetManager();
  const ranked = manager.rankAssets('heart surgery and blood flow', 'Human Anatomy');
  const recommendation = getAssetRecommendation('robot arm automation', 'Robots');

  assert.ok(ranked.length >= 2);
  assert.ok(ranked[0].assetId === 'heart-anatomy');
  assert.ok(recommendation.match?.assetId === 'robot-arm');
  assert.ok(recommendation.composite.strategy === 'compose' || recommendation.composite.strategy === 'single-asset');
});

test('auto scene generation includes asset intelligence fallback guidance', () => {
  const scene = buildAuto3DSceneForLesson('Explain the left ventricle with blood flow and motion', 'ai-teacher');

  assert.ok(scene.assetIntelligence);
  assert.ok(scene.assetIntelligence.diagramFallback || scene.assetIntelligence.animationFallback);
});
