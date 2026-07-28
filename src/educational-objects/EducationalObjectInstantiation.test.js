import test from 'node:test';
import assert from 'node:assert/strict';
import { instantiateEducationalObject } from './index.js';

function sourceObject() {
  return {
    objectId: 'obj-inst-1',
    version: 'v1',
    name: 'Signal Flow',
    kind: 'concept-node',
    variables: [
      { id: 'difficulty', name: 'difficulty', defaultValue: 'medium' },
      { id: 'speed', name: 'speed', defaultValue: 1 }
    ],
    conceptReferences: [{ referenceId: 'c-ref-1', conceptId: 'concept-1' }],
    templateBindings: [{ slotId: 'slot-primary', regionId: 'region-main' }],
    state: { initial: 'ready', availableStates: ['ready', 'active'] },
    performance: { geometryBudget: 10, materialBudget: 8, textureBudget: 8, animationBudget: 6, interactionBudget: 6 }
  };
}

test('instantiateEducationalObject creates deterministic scene instance envelope', () => {
  const result = instantiateEducationalObject(sourceObject(), {
    sceneId: 'scene-edu-1',
    difficulty: 'high',
    performanceProfile: 'low',
    concepts: [{ id: 'concept-1' }],
    templateInstance: { instanceId: 'tmpl-inst-1' }
  }, {
    forceFallbackOnInvalid: false
  });

  assert.equal(result.instance.sceneId, 'scene-edu-1');
  assert.equal(result.instance.objectId, 'obj-inst-1');
  assert.equal(result.instance.templateInstanceId, 'tmpl-inst-1');
  assert.equal(result.instance.slotBinding, 'slot-primary');
  assert.equal(result.instance.regionBinding, 'region-main');
  assert.equal(result.instance.resolvedVariables.difficulty, 'high');
  assert.equal(result.instance.resolvedPerformance.geometryBudget <= 10, true);
  assert.equal(Array.isArray(result.instance.runtimeMetadata.conceptBindings), true);
});
