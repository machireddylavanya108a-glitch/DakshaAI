import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeacherSynchronizationPlan } from './teacherSynchronizationEngine.js';

test('buildTeacherSynchronizationPlan turns an explanation into camera, highlight, effect, explain, and continue steps', () => {
  const plan = buildTeacherSynchronizationPlan({
    explanation: 'This is the left ventricle.',
    topic: 'Heart anatomy',
    scene: {
      hotspots: [{ id: 'hotspot-1', label: 'Left Ventricle' }],
      models: [{ id: 'model-1', label: 'Heart' }],
      animations: [{ id: 'anim-1', title: 'Blood flow' }]
    }
  });

  assert.ok(plan);
  assert.equal(plan.target, 'left ventricle');
  assert.ok(plan.steps.some((step) => step.type === 'camera'));
  assert.ok(plan.steps.some((step) => step.type === 'highlight'));
  assert.ok(plan.steps.some((step) => step.type === 'effect'));
  assert.ok(plan.steps.some((step) => step.type === 'explain'));
  assert.ok(plan.steps.some((step) => step.type === 'continue'));
  assert.equal(plan.currentAction.type, 'camera');
});
