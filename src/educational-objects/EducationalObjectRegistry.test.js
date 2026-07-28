import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEducationalObjectRegistry,
  createAdaptiveFallbackEducationalObject,
  serializeEducationalObjectRegistryState,
  restoreEducationalObjectRegistryFromSerialized
} from './index.js';

function makeObject(objectId, overrides = {}) {
  return createAdaptiveFallbackEducationalObject({
    objectId,
    name: `Object ${objectId}`,
    conceptReferences: [{ referenceId: `${objectId}-concept`, conceptId: 'concept-1' }],
    ...overrides
  });
}

test('registry registers, replaces duplicates, and queries entries', () => {
  const registry = createEducationalObjectRegistry({ qualityThreshold: 20 });
  const one = makeObject('obj-reg-1');

  const first = registry.registerEducationalObject(one, {
    concepts: [{ id: 'concept-1' }],
    slotBindings: [{ slotId: 'slot-1' }],
    regionBindings: [{ regionId: 'region-1' }]
  }, {
    allowLowQuality: true,
    source: 'test-source'
  });

  assert.equal(Boolean(first.error), false);
  assert.equal(first.inserted, true);
  assert.equal(registry.size(), 1);

  const updated = makeObject('obj-reg-1', { name: 'Updated Name' });
  const second = registry.registerEducationalObject(updated, {}, {
    allowLowQuality: true,
    conflictStrategy: 'replace',
    source: 'test-source'
  });

  assert.equal(Boolean(second.error), false);
  assert.equal(second.duplicate, true);
  assert.equal(second.replaced, true);

  const selected = registry.get('obj-reg-1', one.version);
  assert.equal(selected.object.name, 'Updated Name');

  const queried = registry.query({ objectIds: ['obj-reg-1'] });
  assert.equal(queried.length, 1);
  assert.equal(queried[0].objectId, 'obj-reg-1');
});

test('registry import/export snapshot and serialized restore work', () => {
  const registry = createEducationalObjectRegistry({ qualityThreshold: 20 });
  registry.registerMany([
    makeObject('obj-reg-2'),
    makeObject('obj-reg-2'),
    makeObject('obj-reg-3')
  ], {}, {
    allowLowQuality: true,
    duplicateStrategy: 'merge-safe'
  });

  const snapshot = registry.exportSnapshot();
  const rehydrated = createEducationalObjectRegistry();
  const imported = rehydrated.importSnapshot(snapshot);
  const reg2Version = snapshot.entries.find((entry) => entry.objectId === 'obj-reg-2')?.version || 'v1';
  const reg3Version = snapshot.entries.find((entry) => entry.objectId === 'obj-reg-3')?.version || 'v1';

  assert.ok(imported.restored >= 2);
  assert.ok(rehydrated.has('obj-reg-2', reg2Version));
  assert.ok(rehydrated.has('obj-reg-3', reg3Version));

  const serialized = serializeEducationalObjectRegistryState(registry);
  const restored = restoreEducationalObjectRegistryFromSerialized(serialized);

  assert.ok(restored.registry.size() >= 2);
  assert.ok(restored.state.entries.length >= 2);
});
