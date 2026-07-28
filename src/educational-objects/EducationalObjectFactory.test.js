import test from 'node:test';
import assert from 'node:assert/strict';
import { createEducationalObjectFromDescriptor } from './index.js';

function context(overrides = {}) {
  return {
    sceneId: 'scene-factory-1',
    templateInstance: { instanceId: 'tmpl-inst-1' },
    concepts: [{ id: 'concept-1' }, { id: 'concept-2' }],
    relationships: [{ id: 'rel-1' }],
    accessibilityNeeds: { keyboardCompatible: true, reducedMotionCompatible: true, highContrastCompatible: true },
    performanceProfile: 'balanced',
    metadata: {},
    ...overrides
  };
}

test('factory accepts unknown object kind and returns safe instance', () => {
  const result = createEducationalObjectFromDescriptor({
    objectId: 'obj-factory-1',
    name: 'Unknown Structure Node',
    kind: 'unknown-hyper-kind',
    conceptReferences: [{ referenceId: 'c-ref', conceptId: 'concept-1' }],
    templateBindings: [{ slotId: 'slot-1', regionId: 'region-1' }]
  }, context(), {
    fallbackEnabled: true,
    knownObjectIds: ['obj-factory-1']
  });

  assert.ok(result.object.objectId);
  assert.equal(result.object.kind, 'unknown-hyper-kind');
  assert.equal(result.objectInstance.objectId, result.object.objectId);
  assert.equal(result.objectInstance.slotBinding, 'slot-1');
  assert.equal(result.objectInstance.regionBinding, 'region-1');
});

test('factory strips unsafe keys and script urls through processing pipeline', () => {
  const result = createEducationalObjectFromDescriptor({
    objectId: 'obj-factory-2',
    name: '<script>alert(1)</script>Unsafe Name',
    metadata: {
      __proto__: { polluted: true },
      link: 'javascript:alert(2)'
    },
    templateBindings: [{ slotId: 'slot-2', regionId: 'region-2' }]
  }, context(), {
    fallbackEnabled: true,
    knownObjectIds: ['obj-factory-2']
  });

  assert.equal(({}).polluted, undefined);
  assert.equal(result.object.name.includes('<script>'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(result.object.metadata || {}, '__proto__'), false);
});
