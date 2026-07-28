import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEducationalObjectLifecycleManager,
  createAdaptiveFallbackEducationalObject
} from './index.js';

function makeObject(objectId) {
  return createAdaptiveFallbackEducationalObject({
    objectId,
    conceptReferences: [{ referenceId: `${objectId}-concept`, conceptId: 'concept-1' }]
  });
}

test('lifecycle manager registers, activates, releases, and cleans scene instances', () => {
  const manager = createEducationalObjectLifecycleManager({
    registryOptions: {
      qualityThreshold: 20
    },
    poolOptions: {
      policy: {
        maximumEntries: 20,
        maximumReuseCount: 5
      }
    }
  });

  const object = makeObject('obj-life-1');
  const registered = manager.registerObject(object, {
    concepts: [{ id: 'concept-1' }],
    slotBindings: [{ slotId: 'slot-1' }],
    regionBindings: [{ regionId: 'region-1' }]
  }, {
    allowLowQuality: true,
    source: 'lifecycle-test'
  });

  assert.equal(Boolean(registered.error), false);

  let counter = 0;
  const activateOne = manager.activateInstance({
    objectId: 'obj-life-1',
    version: 'v2',
    sceneId: 'scene-life-1'
  }, {
    sceneId: 'scene-life-1'
  }, {
    instantiate: (registryObject) => {
      counter += 1;
      return {
        ...registryObject,
        instanceId: `life-inst-${counter}`,
        sceneId: 'scene-life-1'
      };
    }
  });

  assert.equal(activateOne.status === 'created' || activateOne.status === 'reused', true);
  assert.ok(activateOne.instance.instanceId);

  const released = manager.releaseInstance(activateOne.instance.instanceId, {
    sceneId: 'scene-life-1'
  }, {
    acquireToken: activateOne.token,
    source: 'manual-release'
  });

  assert.equal(['released', 'expired', 'quarantined', 'destroyed'].includes(released.status), true);

  const activateTwo = manager.activateInstance({
    objectId: 'obj-life-1',
    sceneId: 'scene-life-2'
  }, {
    sceneId: 'scene-life-2'
  }, {
    instantiate: (registryObject) => {
      counter += 1;
      return {
        ...registryObject,
        instanceId: `life-inst-${counter}`,
        sceneId: 'scene-life-2'
      };
    }
  });

  assert.equal(Boolean(activateTwo.instance), true);

  const cleanup = manager.cleanupScene('scene-life-2');
  assert.ok(cleanup.releasedCount >= 1);

  const destroyed = manager.destroyAll();
  assert.ok(destroyed.destroyedCount >= 0);
});
