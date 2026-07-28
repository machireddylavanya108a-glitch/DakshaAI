import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAuto3DSceneForLesson } from '../utils/aiSceneEngine.js';

test('buildAuto3DSceneForLesson creates a synchronized 3D scene plan for visual lessons', () => {
  const scene = buildAuto3DSceneForLesson('The human heart has chambers, valves, and blood flow pathways. Show a cross section and x-ray view.', 'ai-teacher');

  assert.equal(scene.shouldAutoGenerate, true);
  assert.ok(scene.models.length >= 1);
  assert.ok(scene.labels.length >= 1);
  assert.ok(scene.animations.length >= 1);
  assert.ok(scene.hotspots.length >= 1);
  assert.ok(scene.measurements.length >= 1);
  assert.ok(scene.crossSections.length >= 1);
  assert.ok(scene.xRay.length >= 1);
  assert.ok(scene.explodedView.length >= 1);
  assert.ok(scene.timeline.length >= 1);
  assert.equal(scene.replay, true);
});
