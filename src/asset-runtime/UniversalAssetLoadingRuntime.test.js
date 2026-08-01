import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UniversalAssetLoadingRuntime,
  migrateLoadRequestProfile,
  normalizeLoadRequestProfile
} from './index.js';
import { createUniversalAssetRegistry } from '../asset-registry/index.js';

function createMemoryPersistence() {
  const store = new Map();
  return {
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    getItem(key) {
      return store.get(String(key)) || null;
    },
    removeItem(key) {
      store.delete(String(key));
    }
  };
}

function createRegistryFixture() {
  const registry = createUniversalAssetRegistry({
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.loading.registry.fixture'
  });

  registry.register({
    id: 'heart-model',
    version: 'v2',
    type: '3d-model-asset',
    category: 'Human Anatomy',
    tags: ['heart', 'circulation'],
    source: 'catalog',
    metadata: {
      name: 'Heart Model'
    },
    dependencies: [{ assetId: 'heart-texture', version: 'v1', required: true }],
    fallbackOptions: {
      fallbackAssetIds: ['heart-procedural-safe']
    }
  }, { allowUpdate: true });

  registry.register({
    id: 'heart-texture',
    version: 'v1',
    type: 'texture-asset',
    category: 'Human Anatomy',
    tags: ['texture', 'heart'],
    source: 'catalog',
    metadata: {
      name: 'Heart Texture'
    }
  }, { allowUpdate: true });

  registry.register({
    id: 'heart-procedural-safe',
    version: 'v1',
    type: 'procedural-generated-asset',
    category: 'Human Anatomy',
    tags: ['procedural', 'fallback'],
    source: 'procedural-generator',
    metadata: {
      name: 'Procedural Fallback Heart'
    }
  }, { allowUpdate: true });

  return registry;
}

function createRuntimeFixture(overrides = {}) {
  return {
    sceneId: 'scene-asset-loading-test',
    metadata: {
      assetDiscovery: {
        schemaVersion: 'v1',
        status: 'resolved',
        mode: 'registry',
        decision: {
          selectedAssets: [
            {
              assetId: 'heart-model',
              version: 'v2',
              type: '3d-model-asset',
              category: 'Human Anatomy',
              source: 'catalog',
              rankScore: 0.95,
              qualityLevel: 'high',
              lodLevel: 'high'
            }
          ],
          rankedCandidates: [],
          proceduralFallback: {
            enabled: true,
            placeholderAsset: {
              assetId: 'heart-procedural-safe',
              version: 'v1',
              type: 'procedural-generated-asset',
              category: 'Human Anatomy',
              source: 'procedural-generator'
            }
          }
        }
      }
    },
    ...overrides
  };
}

test('lazy loading resolves primary asset and dependencies', async () => {
  const registry = createRegistryFixture();
  const runtime = createRuntimeFixture();

  const loadingRuntime = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: createMemoryPersistence(),
    cachePolicy: {
      maxMemoryMB: 32,
      persistentCache: true
    }
  });

  const result = await loadingRuntime.lazyLoad({
    requestId: 'lazy-load-1',
    candidates: [
      {
        assetId: 'heart-model',
        version: 'v2',
        type: '3d-model-asset',
        category: 'Human Anatomy',
        qualityLevel: 'high',
        lodLevel: 'medium'
      }
    ],
    loadDependencies: true
  });

  assert.equal(result.status, 'loaded');
  assert.equal(result.entry.assetId, 'heart-model');
  assert.ok(result.diagnostics.dependenciesLoaded.includes('heart-texture'));
  assert.ok(loadingRuntime.snapshot().metrics.dependencyLoads >= 1);
});

test('preloading warms cache and subsequent loads hit cache', async () => {
  const registry = createRegistryFixture();
  const runtime = createRuntimeFixture();

  const loadingRuntime = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: createMemoryPersistence()
  });

  const preloads = await loadingRuntime.preloadAssets([
    {
      requestId: 'preload-1',
      candidates: [{ assetId: 'heart-model', version: 'v2', type: '3d-model-asset', category: 'Human Anatomy' }]
    }
  ]);

  assert.equal(preloads.length, 1);
  assert.equal(preloads[0].status, 'loaded');

  const loaded = await loadingRuntime.load({
    requestId: 'normal-load-after-preload',
    candidates: [{ assetId: 'heart-model', version: 'v2', type: '3d-model-asset', category: 'Human Anatomy' }]
  });

  assert.equal(loaded.status, 'loaded');
  assert.equal(loaded.fromCache, true);
  assert.ok(loadingRuntime.snapshot().cacheStats.cacheHits >= 1);
});

test('duplicate load requests are de-duplicated through inflight map', async () => {
  const registry = createRegistryFixture();
  const runtime = createRuntimeFixture();
  let loadCount = 0;

  const loadingRuntime = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: createMemoryPersistence(),
    loaders: {
      '3d-model-asset': async ({ candidate }) => {
        loadCount += 1;
        return {
          assetId: candidate.assetId,
          payloadType: 'model-binary'
        };
      }
    }
  });

  const request = {
    requestId: 'duplicate-request',
    candidates: [{ assetId: 'heart-model', version: 'v2', type: '3d-model-asset', category: 'Human Anatomy' }],
    cachePolicy: {
      ttlMs: 1
    }
  };

  const [first, second] = await Promise.all([
    loadingRuntime.load(request),
    loadingRuntime.load(request)
  ]);

  assert.equal(first.status, 'loaded');
  assert.equal(second.status, 'loaded');
  assert.equal(loadCount, 1);
  assert.ok(loadingRuntime.snapshot().cacheStats.duplicatePrevented >= 1);
});

test('background queue loads assets asynchronously and updates metrics', async () => {
  const registry = createRegistryFixture();
  const runtime = createRuntimeFixture();

  const loadingRuntime = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: createMemoryPersistence(),
    autoProcessBackground: false
  });

  loadingRuntime.queueBackgroundLoad({
    requestId: 'background-load-1',
    candidates: [{ assetId: 'heart-model', version: 'v2', type: '3d-model-asset', category: 'Human Anatomy' }]
  });

  const processed = await loadingRuntime.processBackgroundQueue();

  assert.equal(processed.length, 1);
  assert.equal(processed[0].status, 'loaded');
  assert.equal(loadingRuntime.snapshot().queues.background, 0);
});

test('memory cleanup disposes unused assets and honors active usage', async () => {
  const registry = createRegistryFixture();
  const runtime = createRuntimeFixture();

  const loadingRuntime = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: createMemoryPersistence(),
    cachePolicy: {
      maxMemoryMB: 8,
      idleDisposeMs: 1
    }
  });

  await loadingRuntime.load({
    requestId: 'mem-a',
    candidates: [{ assetId: 'heart-model', version: 'v2', type: '3d-model-asset', category: 'Human Anatomy' }]
  }, { acquire: false });

  await loadingRuntime.load({
    requestId: 'mem-b',
    candidates: [{ assetId: 'heart-texture', version: 'v1', type: 'texture-asset', category: 'Human Anatomy' }]
  }, { acquire: false });

  loadingRuntime.updateAssetUsage({
    visibleAssetIds: ['heart-model'],
    activeAssetIds: ['heart-model']
  });

  loadingRuntime.collectGarbage({
    reason: 'memory-pressure',
    idleDisposeMs: 0
  });

  const snapshot = loadingRuntime.snapshot();
  assert.ok(snapshot.metrics.gcRuns >= 1);
  assert.ok(snapshot.memory.totalEntries >= 1);
  assert.equal(loadingRuntime.disposeAsset('heart-model', 'v2'), true);
});

test('failed loads retry intelligently and then use fallback asset', async () => {
  const registry = createRegistryFixture();
  const runtime = createRuntimeFixture();
  let attempts = 0;

  const loadingRuntime = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: createMemoryPersistence(),
    loaders: {
      '3d-model-asset': async () => {
        attempts += 1;
        throw new Error('network timeout');
      },
      'procedural-generated-asset': async ({ candidate }) => ({
        assetId: candidate.assetId,
        mode: 'procedural-fallback'
      })
    }
  });

  const result = await loadingRuntime.load({
    requestId: 'fallback-load',
    candidates: [{
      assetId: 'heart-model',
      version: 'v2',
      type: '3d-model-asset',
      category: 'Human Anatomy',
      fallbackAssetIds: ['heart-procedural-safe']
    }],
    maxRetries: 2
  });

  assert.equal(result.status, 'loaded');
  assert.equal(result.diagnostics.fallbackUsed, true);
  assert.ok(attempts >= 3);
});

test('unknown future asset types are loaded without renderer-specific paths', async () => {
  const registry = createRegistryFixture();
  const runtime = createRuntimeFixture();

  const loadingRuntime = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: createMemoryPersistence()
  });

  const result = await loadingRuntime.load({
    requestId: 'future-type-load',
    candidates: [
      {
        assetId: 'future-asset-1',
        version: 'v1',
        type: 'future-volumetric-neural-fluid-asset',
        category: 'Future Science'
      }
    ]
  });

  assert.equal(result.status, 'loaded');
  assert.equal(result.entry.type, 'future-volumetric-neural-fluid-asset');
});

test('cache miss is tracked before a first load', async () => {
  const registry = createRegistryFixture();
  const runtime = createRuntimeFixture();

  const loadingRuntime = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: createMemoryPersistence()
  });

  const result = await loadingRuntime.load({
    requestId: 'miss-check',
    candidates: [{ assetId: 'heart-model', version: 'v2', type: '3d-model-asset', category: 'Human Anatomy' }]
  });

  assert.equal(result.status, 'loaded');
  assert.ok(loadingRuntime.snapshot().cacheStats.cacheMisses >= 1);
});

test('serialization, migration, and recovery stay backward compatible', async () => {
  const registry = createRegistryFixture();
  const persistence = createMemoryPersistence();
  const runtime = createRuntimeFixture();

  const loadingRuntime = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: persistence,
    cachePolicy: {
      persistentCache: true,
      diskCache: true
    }
  });

  await loadingRuntime.load({
    requestId: 'persist-load',
    candidates: [{ assetId: 'heart-model', version: 'v2', type: '3d-model-asset', category: 'Human Anatomy' }],
    cachePolicy: {
      persistentCache: true,
      diskCache: true
    }
  });

  loadingRuntime.persistSession();

  const recoveredRuntime = new UniversalAssetLoadingRuntime(createRuntimeFixture(), {
    registry,
    persistenceAdapter: persistence,
    cachePolicy: {
      persistentCache: true,
      diskCache: true
    }
  });

  const snapshot = recoveredRuntime.snapshot();
  assert.ok(snapshot.diagnostics.recoveries >= 1);

  const legacyRequest = migrateLoadRequestProfile({
    schemaVersion: 'legacy',
    id: 'legacy-load',
    selectedAssets: [{ assetId: 'heart-model', type: '3d-model-asset' }],
    cache: { maxMemoryMB: 16 }
  });

  assert.equal(legacyRequest.schemaVersion, 'v1');
  assert.ok(legacyRequest.candidates.length >= 1);

  const normalized = normalizeLoadRequestProfile({
    requestId: 'normalized-load',
    candidates: [{ assetId: 'heart-texture', type: 'texture-asset' }]
  });
  assert.equal(normalized.schemaVersion, 'v1');
});
