import test from 'node:test';
import assert from 'node:assert/strict';
import { build3DSceneFromContent } from './learning3dUtils.js';

test('build3DSceneFromContent matches anatomy topics to supported 3D scenes', () => {
  const scene = build3DSceneFromContent('Explain the human heart and blood flow');

  assert.equal(scene.supports3D, true);
  assert.equal(scene.recommendedModel, 'heart');
  assert.ok(scene.labels.includes('Atria'));
});

test('build3DSceneFromContent falls back to diagram mode for unsupported topics', () => {
  const scene = build3DSceneFromContent('How do I build a better habit tracker?');

  assert.equal(scene.supports3D, false);
  assert.equal(scene.fallbackType, 'diagram');
  assert.ok(scene.summary.includes('interactive diagram'));
});
