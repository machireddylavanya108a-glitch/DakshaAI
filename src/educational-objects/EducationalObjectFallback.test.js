import test from 'node:test';
import assert from 'node:assert/strict';
import { applyEducationalObjectGenerationFallback } from './index.js';

function context(overrides = {}) {
  return {
    sceneId: 'scene-fallback-1',
    templateInstance: { instanceId: 'tmpl-inst-fallback' },
    slotBindings: [{ slotId: 'slot-1', regionId: 'region-1' }],
    regionBindings: [{ regionId: 'region-1', capacity: 2 }],
    concepts: [{ id: 'concept-1', label: 'Concept One' }],
    metadata: { locale: 'en' },
    ...overrides
  };
}

test('fallback levels 1 to 5 always return non-null object sets', () => {
  for (const level of [1, 2, 3, 4, 5]) {
    const result = applyEducationalObjectGenerationFallback(level, { objects: [] }, context(), {
      performanceProfile: 'balanced',
      maximumObjects: 10
    });

    assert.equal(result.fallbackUsed, true);
    assert.equal(result.fallbackLevel, level);
    assert.equal(Array.isArray(result.objects), true);
    assert.equal(result.objects.length >= 1, true);
    assert.equal(Array.isArray(result.objectInstances), true);
    assert.equal(result.objectInstances.length >= 1, true);
  }
});

test('empty context fallback still yields minimal safe object metadata', () => {
  const result = applyEducationalObjectGenerationFallback(5, {}, {}, {
    performanceProfile: 'low',
    maximumObjects: 1
  });

  assert.equal(result.objects.length >= 1, true);
  assert.ok(result.objects[0].objectId);
  assert.equal(Array.isArray(result.objects[0].labels), true);
  assert.equal(typeof result.objects[0].representation, 'object');
  assert.equal(typeof result.objects[0].accessibility, 'object');
  assert.equal(typeof result.objects[0].performance, 'object');
});
