import test from 'node:test';
import assert from 'node:assert/strict';
import { buildAnimationPlan, buildAutoAnimationState } from './aiAnimationEngine.js';

test('buildAnimationPlan creates automatic animation cues for anatomy lessons', () => {
  const plan = buildAnimationPlan('Explain human heart surgery and blood flow', [{ id: 'step-1', title: 'Intro' }]);

  assert.ok(plan.length >= 1);
  assert.ok(plan[0].cameraMode);
  assert.ok(plan[0].sceneEffects.includes('bloodFlow') || plan[0].sceneEffects.includes('particles'));
  assert.ok(plan[0].motionSpeed > 0);
});

test('buildAutoAnimationState derives stable defaults for robotics and astronomy', () => {
  const robotics = buildAutoAnimationState('Teach robot arm movement and automation', { sceneEffects: [] });
  const astronomy = buildAutoAnimationState('Explain solar system planet rotation', { sceneEffects: [] });

  assert.equal(robotics.cameraMode, 'orbit');
  assert.ok(robotics.sceneEffects.includes('laser') || robotics.sceneEffects.includes('particles'));
  assert.equal(astronomy.cameraMode, 'orbit');
  assert.ok(astronomy.sceneEffects.includes('particles') || astronomy.sceneEffects.includes('planetRotation'));
});
