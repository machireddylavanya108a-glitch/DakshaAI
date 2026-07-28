import test from 'node:test';
import assert from 'node:assert/strict';
import { validateEducationalObject } from './index.js';

function validObject() {
  return {
    objectId: 'obj-edu-1',
    version: 'v1',
    name: 'Neuron Body',
    kind: 'concept-node',
    conceptReferences: [{ referenceId: 'c-ref-1', conceptId: 'concept-1' }],
    relationshipReferences: [],
    capabilityReferences: [],
    templateBindings: [{ slotId: 'slot-1', regionId: 'region-1' }],
    variables: [{ id: 'v-1', name: 'intensity' }],
    conditions: [{ id: 'cond-1', expression: 'v-1 > 0' }],
    labels: [{ id: 'label-1', text: 'Neuron', targetObjectId: 'obj-edu-1' }]
  };
}

test('validateEducationalObject returns valid for canonical object', () => {
  const result = validateEducationalObject(validObject());
  assert.equal(result.valid, true);
  assert.equal(result.errors.length, 0);
});

test('validateEducationalObject deduplicates variable ids during normalization', () => {
  const candidate = validObject();
  candidate.variables = [{ id: 'dup' }, { id: 'dup' }];

  const result = validateEducationalObject(candidate);
  assert.equal(result.valid, true);
  assert.equal(Array.isArray(result.normalizedValue.variables), true);
  assert.equal(result.normalizedValue.variables.length, 1);
});
