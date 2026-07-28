import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEducationalObjectPool,
  createAdaptiveFallbackEducationalObject
} from './index.js';

function createPoolObject(objectId, instanceId, overrides = {}) {
  const base = createAdaptiveFallbackEducationalObject({
    objectId,
    conceptReferences: [{ referenceId: `${objectId}-concept`, conceptId: 'concept-1' }]
  });

  return {
    ...base,
    instanceId,
    objectVersion: base.version,
    runtimeMetadata: {
      ...(base.runtimeMetadata || {}),
      diagnosticsSummary: { status: 'valid' },
      lifecycleState: {
        initialized: true,
        active: true,
        paused: false,
        completed: false,
        destroyed: false,
        quarantined: false
      }
    },
    ...overrides
  };
}

test('pool handles acquire/release with token ownership protection', () => {
  const pool = createEducationalObjectPool({
    policy: {
      maximumEntries: 10,
      maximumReuseCount: 3
    }
  });

  let createdCount = 0;
  const acquire = pool.acquire({
    objectId: 'obj-pool-1',
    objectVersion: 'v2',
    createInstance: () => {
      createdCount += 1;
      return createPoolObject('obj-pool-1', `inst-${createdCount}`);
    }
  });

  assert.equal(acquire.status, 'created');
  assert.ok(acquire.token);

  const denied = pool.release(acquire.entry.poolEntryId, { acquireToken: 'wrong-token' });
  assert.equal(denied.status, 'denied');

  const released = pool.release(acquire.entry.poolEntryId, {
    acquireToken: acquire.token,
    poolThreshold: 10
  });
  assert.equal(released.status === 'released' || released.status === 'expired', true);

  const reused = pool.acquire({
    objectId: 'obj-pool-1',
    objectVersion: acquire.entry.objectVersion,
    createInstance: () => createPoolObject('obj-pool-1', 'inst-never-used')
  });

  assert.equal(reused.status, 'reused');
});

test('pool supports abort handling, quarantine, and eviction policies', () => {
  const pool = createEducationalObjectPool({
    policy: {
      maximumEntries: 1,
      maximumIdleMs: 1,
      quarantineOnResetFailure: true,
      destroyOnQualityFailure: false,
      prewarmLimit: 5
    }
  });

  const abortController = new AbortController();
  abortController.abort();
  const aborted = pool.acquire({
    objectId: 'obj-pool-abort',
    objectVersion: 'v2',
    signal: abortController.signal,
    createInstance: () => createPoolObject('obj-pool-abort', 'inst-abort')
  });
  assert.equal(aborted.status, 'aborted');

  pool.prewarm([
    {
      createInstance: () => createPoolObject('obj-pool-2', 'inst-a')
    },
    {
      createInstance: () => createPoolObject('obj-pool-3', 'inst-b')
    }
  ]);

  assert.ok(pool.list().length <= 1);

  const acquired = pool.acquire({
    objectId: 'obj-pool-4',
    objectVersion: 'v2',
    createInstance: () => createPoolObject('obj-pool-4', 'inst-q', {
      lifecycle: { destroyed: true }
    })
  });

  const quarantined = pool.release(acquired.entry.poolEntryId, {
    acquireToken: acquired.token
  });

  assert.equal(quarantined.status, 'quarantined');

  const evicted = pool.evictExpired();
  assert.equal(typeof evicted, 'number');
});
