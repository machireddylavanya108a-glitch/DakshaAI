import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UniversalAssetSecurityManager,
  UniversalAssetOptimizationEngine,
  UniversalProceduralAssetGenerator,
  migrateSecurityProfile,
  migrateOptimizationProfile,
  migrateGeneratorProfile
} from './index.js';
import { UniversalAssetLoadingRuntime } from './UniversalAssetLoadingRuntime.js';
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
    persistenceKey: 'asset.security.optimization.registry.fixture'
  });

  registry.register({
    id: 'secure-heart-model',
    version: 'v1',
    type: '3d-model-asset',
    category: 'Human Anatomy',
    metadata: { name: 'Secure Heart', format: 'glb' },
    dependencies: [{ assetId: 'secure-heart-texture', version: 'v1', required: true }]
  }, { allowUpdate: true });

  registry.register({
    id: 'secure-heart-texture',
    version: 'v1',
    type: 'texture-asset',
    category: 'Human Anatomy',
    metadata: { name: 'Secure Texture', format: 'ktx2' }
  }, { allowUpdate: true });

  return registry;
}

function createRuntimeFixture() {
  return {
    sceneId: 'scene-security-optimization-test',
    metadata: {
      visualizationStrategy: {
        schemaVersion: 'v1',
        primaryStrategy: {
          visualizationStyle: 'simulation',
          sceneComplexity: 'medium',
          interactionLevel: 'high'
        }
      },
      assetDiscovery: {
        schemaVersion: 'v1',
        decision: {
          selectedAssets: [
            {
              assetId: 'secure-heart-model',
              version: 'v1',
              type: '3d-model-asset',
              category: 'Human Anatomy',
              rankScore: 0.9,
              qualityLevel: 'high',
              lodLevel: 'high'
            }
          ]
        }
      }
    }
  };
}

test('security manager rejects corrupted assets and checksum mismatch', () => {
  const manager = new UniversalAssetSecurityManager();

  const result = manager.validate({
    assetId: 'bad-asset',
    version: 'v1',
    type: '3d-model-asset',
    metadata: { format: 'glb' },
    corrupted: true,
    checksum: 'abc',
    computedChecksum: 'xyz'
  }, {
    runtimeVersion: 'v1'
  });

  assert.equal(result.secure, false);
  assert.ok(result.report.errors.some((entry) => entry.includes('corrupted')));
  assert.ok(result.report.errors.some((entry) => entry.includes('checksum')));
});

test('security manager flags invalid metadata and blocked formats', () => {
  const manager = new UniversalAssetSecurityManager({
    profile: {
      blockedFormats: ['exe']
    }
  });

  const result = manager.validate({
    assetId: 'unsafe-asset',
    type: 'unknown-asset-type',
    metadata: {},
    format: 'exe'
  });

  assert.equal(result.secure, false);
  assert.ok(result.report.errors.some((entry) => entry.includes('blocked')));
});

test('optimization engine produces adaptive quality and lod profiles', () => {
  const engine = new UniversalAssetOptimizationEngine({
    profile: {
      qualityProfile: 'high-fidelity',
      device: {
        memoryGB: 16,
        cpuScore: 1.5,
        gpuTier: 'high-end'
      }
    }
  });

  const optimized = engine.optimize({
    assetId: 'opt-asset',
    type: '3d-model-asset',
    rankScore: 0.9,
    qualityLevel: 'medium',
    lodLevel: 'medium'
  }, {
    sceneGraph: { nodeCount: 8, relationshipCount: 10 },
    runtimeGraph: { nodeCount: 10, relationshipCount: 12 }
  });

  assert.equal(optimized.optimized.qualityLevel, 'high');
  assert.ok(['high', 'medium'].includes(optimized.optimized.lodLevel));
  assert.ok(optimized.report.optimizationScore > 0);
});

test('optimization engine selects lower quality for constrained devices', () => {
  const engine = new UniversalAssetOptimizationEngine({
    profile: {
      qualityProfile: 'balanced',
      device: {
        memoryGB: 1,
        prefersBatterySavings: true,
        cpuScore: 0.6
      }
    }
  });

  const optimized = engine.optimize({
    assetId: 'mobile-asset',
    type: 'texture-asset',
    rankScore: 0.6,
    qualityLevel: 'high',
    lodLevel: 'high'
  }, {
    sceneGraph: { nodeCount: 140, relationshipCount: 80 },
    runtimeGraph: { nodeCount: 90, relationshipCount: 50 }
  });

  assert.equal(optimized.optimized.qualityLevel, 'low');
  assert.equal(optimized.optimized.lodLevel, 'low');
});

test('procedural generator creates fallback metadata for unknown future types', () => {
  const generator = new UniversalProceduralAssetGenerator();
  const generated = generator.generate({
    candidate: {
      assetId: 'future-asset',
      type: 'future-holographic-knowledge-field',
      category: 'Future Science',
      rankScore: 0.4
    },
    reason: 'unsupported-asset-type'
  });

  assert.equal(String(generated.generated.type).startsWith('procedural-'), true);
  assert.equal(generated.generated.metadata.supportsUnknownFutureTypes, true);
  assert.ok(Array.isArray(generated.generated.metadata.fallbackVariants));
});

test('loading runtime rejects unsupported format and falls back procedurally without blocking', async () => {
  const registry = createRegistryFixture();
  const runtime = createRuntimeFixture();

  const loader = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: createMemoryPersistence(),
    loaders: {
      '3d-model-asset': async ({ candidate }) => ({
        assetId: candidate.assetId,
        hash: 'x-safe-hash'
      })
    }
  });

  const result = await loader.load({
    requestId: 'unsupported-format-case',
    candidates: [
      {
        assetId: 'secure-heart-model',
        version: 'v1',
        type: '3d-model-asset',
        category: 'Human Anatomy',
        format: 'exe',
        rankScore: 0.9
      }
    ]
  });

  assert.equal(result.status, 'loaded');
  assert.equal(result.diagnostics.fallbackUsed, true);
  assert.ok(loader.snapshot().metrics.proceduralFallbacks >= 1);
});

test('loading runtime tracks duplicate detection and optimization reports', async () => {
  const registry = createRegistryFixture();
  const runtime = createRuntimeFixture();

  const loader = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: createMemoryPersistence()
  });

  await Promise.all([
    loader.load({
      requestId: 'dup-1',
      candidates: [{ assetId: 'secure-heart-model', version: 'v1', type: '3d-model-asset', category: 'Human Anatomy' }],
      cachePolicy: { ttlMs: 1 }
    }),
    loader.load({
      requestId: 'dup-2',
      candidates: [{ assetId: 'secure-heart-model', version: 'v1', type: '3d-model-asset', category: 'Human Anatomy' }],
      cachePolicy: { ttlMs: 1 }
    })
  ]);

  const snapshot = loader.snapshot();
  assert.ok(snapshot.cacheStats.duplicatePrevented >= 1 || snapshot.cacheStats.cacheHits >= 1);
  assert.ok(snapshot.metrics.optimizedAssets >= 1);
  assert.ok(snapshot.optimization.report);
});

test('legacy migration and state recovery remain backward compatible', async () => {
  const security = migrateSecurityProfile({
    schemaVersion: 'legacy',
    runtimeVersion: 'v1',
    disallowedFormats: ['exe']
  });
  const optimization = migrateOptimizationProfile({
    schemaVersion: 'legacy',
    profile: 'performance',
    deviceProfile: { memoryGB: 2 }
  });
  const generator = migrateGeneratorProfile({
    schemaVersion: 'legacy',
    mode: 'adaptive-procedural'
  });

  assert.equal(security.schemaVersion, 'v1');
  assert.equal(optimization.schemaVersion, 'v1');
  assert.equal(generator.schemaVersion, 'v1');

  const registry = createRegistryFixture();
  const persistence = createMemoryPersistence();
  const runtime = createRuntimeFixture();

  const loaderA = new UniversalAssetLoadingRuntime(runtime, {
    registry,
    persistenceAdapter: persistence,
    cachePolicy: {
      persistentCache: true
    }
  });

  await loaderA.load({
    requestId: 'persist-security-optimization',
    candidates: [{ assetId: 'secure-heart-model', version: 'v1', type: '3d-model-asset', category: 'Human Anatomy' }],
    cachePolicy: { persistentCache: true }
  });

  loaderA.persistSession();

  const loaderB = new UniversalAssetLoadingRuntime(createRuntimeFixture(), {
    registry,
    persistenceAdapter: persistence,
    cachePolicy: {
      persistentCache: true
    }
  });

  const recovered = loaderB.snapshot();
  assert.ok(recovered.diagnostics.recoveries >= 1);
  assert.ok(recovered.security.report || recovered.optimization.report || recovered.procedural.report);
});
