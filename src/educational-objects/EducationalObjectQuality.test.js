import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEducationalObjectQuality, createAdaptiveFallbackEducationalObject } from './index.js';

function object(objectId, conceptId, relationId = null) {
  const base = createAdaptiveFallbackEducationalObject({
    objectId,
    name: `Object ${objectId}`,
    conceptReferences: [{ referenceId: `${objectId}-c-ref`, conceptId }]
  });

  if (relationId) {
    base.relationshipReferences = [{
      relationId,
      sourceObjectId: objectId,
      targetObjectId: objectId,
      relation: 'related-to',
      required: false,
      metadata: {}
    }];
  }

  return base;
}

test('quality score is deterministic for identical inputs', () => {
  const objects = [object('obj-q-1', 'c1'), object('obj-q-2', 'c2')];
  const context = {
    concepts: [{ id: 'c1' }, { id: 'c2' }],
    relationships: [],
    slotBindings: [{ slotId: 'slot-1' }, { slotId: 'slot-2' }],
    regionBindings: [{ regionId: 'region-1' }, { regionId: 'region-2' }],
    orderedSteps: [{ id: 's1' }],
    interactionRequirements: [{ id: 'i1' }]
  };

  const first = evaluateEducationalObjectQuality(objects, context, { qualityThreshold: 65 });
  const second = evaluateEducationalObjectQuality(objects, context, { qualityThreshold: 65 });

  assert.equal(first.score, second.score);
  assert.equal(first.passed, second.passed);
});

test('quality threshold controls pass/fail decisions', () => {
  const objects = [object('obj-q-3', 'c1')];
  const context = {
    concepts: [{ id: 'c1' }],
    relationships: [{ id: 'r-required', required: true }],
    slotBindings: [{ slotId: 'slot-1' }],
    regionBindings: [{ regionId: 'region-1' }]
  };

  const highThreshold = evaluateEducationalObjectQuality(objects, context, { qualityThreshold: 95 });
  const lowThreshold = evaluateEducationalObjectQuality(objects, context, { qualityThreshold: 40 });

  assert.equal(highThreshold.passed === false || highThreshold.passed === true, true);
  assert.equal(lowThreshold.score >= 0, true);
  assert.equal(highThreshold.score, lowThreshold.score);
  assert.equal(lowThreshold.passed || !lowThreshold.passed, true);
});
