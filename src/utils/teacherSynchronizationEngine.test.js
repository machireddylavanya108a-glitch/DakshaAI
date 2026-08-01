import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeacherSynchronizationPlan } from './teacherSynchronizationEngine.js';

test('buildTeacherSynchronizationPlan turns an explanation into camera, highlight, effect, explain, and continue steps', () => {
  const plan = buildTeacherSynchronizationPlan({
    explanation: 'Explain how data enters the pipeline, then validate and transform it. Why is validation important?',
    topic: 'Any topic',
    scene: {
      hotspots: [{ id: 'hotspot-1', label: 'Input Node' }],
      models: [{ id: 'model-1', label: 'Validator' }],
      animations: [{ id: 'anim-1', title: 'Flow' }],
      objects: [{ id: 'obj-input', name: 'Input Node' }]
    }
  });

  assert.ok(plan);
  assert.equal(typeof plan.target, 'string');
  assert.equal(plan.target.length > 0, true);
  assert.ok(plan.steps.some((step) => step.type === 'camera'));
  assert.ok(plan.steps.some((step) => step.type === 'highlight'));
  assert.ok(plan.steps.some((step) => step.type === 'effect'));
  assert.ok(plan.steps.some((step) => step.type === 'explain'));
  assert.ok(plan.steps.some((step) => step.type === 'continue'));
  assert.equal(plan.currentAction.type, 'camera');
  assert.equal(Array.isArray(plan.narrationSegments), true);
  assert.equal(plan.narrationSegments.length >= 1, true);
  assert.equal(Array.isArray(plan.narrationCues.all), true);
  assert.equal(plan.narrationCues.all.length >= 1, true);
});
