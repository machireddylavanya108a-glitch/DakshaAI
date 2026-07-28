import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateEducationalObjectQualityGate,
  createAdaptiveFallbackEducationalObject
} from './index.js';

function baseObject(objectId, overrides = {}) {
  return {
    ...createAdaptiveFallbackEducationalObject({
      objectId,
      conceptReferences: [{ referenceId: `${objectId}-concept`, conceptId: 'concept-1' }]
    }),
    ...overrides
  };
}

test('quality gate passes valid object in registration mode', () => {
  const object = baseObject('obj-gate-1');
  const result = evaluateEducationalObjectQualityGate(object, {
    concepts: [{ id: 'concept-1' }],
    slotBindings: [{ slotId: 'slot-1' }],
    regionBindings: [{ regionId: 'region-1' }]
  }, {
    mode: 'registration',
    registrationThreshold: 20,
    source: 'test-registration'
  });

  assert.equal(result.passed, true);
  assert.equal(result.hardFailures.length, 0);
});

test('quality gate fails unsafe patterns and warns on shared low trust', () => {
  const object = baseObject('obj-gate-2', {
    data: {
      values: ['javascript:alert(1)']
    }
  });

  const failed = evaluateEducationalObjectQualityGate(object, {}, {
    mode: 'registration',
    registrationThreshold: 30,
    trust: { level: 'low' }
  });

  assert.equal(failed.passed, false);
  assert.ok(failed.hardFailures.includes('security-unsafe-pattern'));

  const shared = evaluateEducationalObjectQualityGate(baseObject('obj-gate-3'), {}, {
    mode: 'shared',
    sharedUseThreshold: 10,
    trust: { level: 'low' }
  });

  assert.ok(shared.warnings.includes('insufficient-trust-for-shared-use'));
});
