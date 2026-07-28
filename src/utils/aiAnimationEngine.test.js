import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnimationPlan, buildAutoAnimationState } from './aiAnimationEngine.js';

test('buildAnimationPlan creates adaptive animation cues for any lesson topic', () => {
  const plan = buildAnimationPlan('Explain emergent governance in autonomous systems', [{ id: 'step-1', title: 'Intro' }]);

  assert.ok(plan.length >= 1);
  assert.ok(plan[0].cameraMode);
  assert.ok(Array.isArray(plan[0].sceneEffects));
  assert.ok(plan[0].sceneEffects.length >= 1);
  assert.ok(plan[0].motionSpeed > 0);
});

test('buildAutoAnimationState derives stable defaults for unrelated topics', () => {
  const first = buildAutoAnimationState('Teach policy modeling and constitutional design', { sceneEffects: [] });
  const second = buildAutoAnimationState('Explain culinary chemistry and flavor harmonics', { sceneEffects: [] });

  assert.ok(first.cameraMode);
  assert.ok(second.cameraMode);
  assert.ok(first.sceneEffects.length >= 1);
  assert.ok(second.sceneEffects.length >= 1);
});
