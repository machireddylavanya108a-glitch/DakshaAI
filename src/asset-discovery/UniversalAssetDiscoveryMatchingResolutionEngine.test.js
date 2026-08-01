import test from 'node:test';
import assert from 'node:assert/strict';

import {
  UniversalAssetDiscoveryMatchingResolutionEngine,
  analyzeUniversalAssetDiscoveryMatchingResolution,
  migrateAssetDiscoveryMatchingResolutionProfile,
  normalizeAssetDiscoveryMatchingResolutionProfile
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
    persistenceKey: 'asset.discovery.registry.fixture'
  });

  registry.register({
    id: 'cardio-heart-asset',
    version: 'v2',
    type: 'biology-asset',
    category: 'Human Anatomy',
    tags: ['heart', 'ventricle', 'circulation'],
    capabilities: ['inspect', 'highlight'],
    qualityLevels: { low: 0.5, medium: 0.75, high: 0.94, default: 'high' },
    lodSupport: { supported: true, levels: ['high', 'medium', 'low'], defaultLevel: 'high' },
    metadata: { name: 'Cardio Heart', description: 'Interactive heart model' }
  });

  registry.register({
    id: 'blood-flow-overlay',
    version: 'v1',
    type: 'annotation-asset',
    category: 'Human Anatomy',
    tags: ['blood', 'flow'],
    capabilities: ['annotate'],
    dependencies: [{ assetId: 'cardio-heart-asset', version: 'v2', required: true }],
    metadata: { name: 'Blood Flow Overlay', description: 'Flow arrows and labels' }
  });

  registry.register({
    id: 'future-neural-volume',
    version: 'v5',
    type: 'future-neural-field-asset',
    category: 'Future Science',
    tags: ['neural', 'volume', 'field'],
    capabilities: ['dynamic-geometry'],
    metadata: { name: 'Future Neural Volume', description: 'Future unknown type asset' }
  });

  return registry;
}

function baseInput(overrides = {}) {
  return {
    learningIntent: {
      learningIntent: 'Explain heart blood circulation with adaptive walkthrough',
      educationalStrategy: 'guided inquiry',
      reasoningStyle: 'procedural',
      confidenceScore: 0.83
    },
    visualizationStrategy: {
      primaryStrategy: {
        visualizationStyle: 'simulation',
        sceneComplexity: 'medium',
        interactionLevel: 'high'
      }
    },
    capabilityRecommendation: {
      recommendedCapabilities: ['inspect', 'highlight', 'annotate']
    },
    sceneMetadata: {
      lessonTitle: 'Heart circulation flow',
      locale: 'en'
    },
    objectMetadata: [
      {
        id: 'obj-1',
        name: 'Left ventricle',
        category: 'Human Anatomy',
        tags: ['heart', 'blood']
      }
    ],
    sceneGraph: {
      nodeCount: 24,
      relationshipCount: 30
    },
    runtimeGraph: {
      nodeCount: 32,
      relationshipCount: 40
    },
    ...overrides
  };
}

test('asset discovery ranks and resolves best registry assets', () => {
  const registry = createRegistryFixture();
  const engine = new UniversalAssetDiscoveryMatchingResolutionEngine({
    registry,
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.discovery.engine.rank'
  });

  const result = engine.analyze(baseInput());

  assert.equal(result.status, 'resolved');
  assert.equal(result.mode, 'registry');
  assert.ok(result.decision.primaryAsset);
  assert.ok(result.decision.rankedCandidates.length >= 1);
  assert.ok(result.decision.selectedAssets.length >= 1);
  assert.ok(result.confidenceScore > 0);
  assert.ok(result.diagnostics.dependencyResolution);
});

test('asset discovery supports unknown future asset types without code changes', () => {
  const registry = createRegistryFixture();
  const engine = new UniversalAssetDiscoveryMatchingResolutionEngine({
    registry,
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.discovery.engine.future'
  });

  const result = engine.analyze(baseInput({
    learningIntent: {
      learningIntent: 'Model neural volume field dynamics',
      educationalStrategy: 'exploratory',
      reasoningStyle: 'analytical',
      confidenceScore: 0.72
    },
    objectMetadata: [{ id: 'obj-n1', name: 'Neural Field', category: 'Future Science', tags: ['neural', 'volume', 'field'] }]
  }));

  assert.ok(result.decision.rankedCandidates.some((entry) => entry.type === 'future-neural-field-asset'));
});

test('asset discovery dependency resolution includes required dependency chain', () => {
  const registry = createRegistryFixture();
  const engine = new UniversalAssetDiscoveryMatchingResolutionEngine({
    registry,
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.discovery.engine.deps'
  });

  const result = engine.analyze(baseInput({
    learningIntent: {
      learningIntent: 'Teach blood flow overlay annotation on heart',
      educationalStrategy: 'guided inquiry',
      reasoningStyle: 'procedural',
      confidenceScore: 0.81
    }
  }));

  const dependencyResolution = result.diagnostics.dependencyResolution;
  assert.ok(dependencyResolution);
  assert.ok(Array.isArray(dependencyResolution.resolved));
  assert.ok(dependencyResolution.resolved.some((entry) => entry.id === 'cardio-heart-asset'));
});

test('missing assets trigger procedural fallback and placeholder metadata', () => {
  const emptyRegistry = createUniversalAssetRegistry({
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.discovery.registry.empty'
  });
  const engine = new UniversalAssetDiscoveryMatchingResolutionEngine({
    registry: emptyRegistry,
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.discovery.engine.fallback'
  });

  const result = engine.analyze(baseInput({
    learningIntent: {
      learningIntent: 'Unknown topic with no registry support',
      educationalStrategy: 'adaptive',
      reasoningStyle: 'conceptual',
      confidenceScore: 0.44
    }
  }));

  assert.equal(result.mode, 'procedural');
  assert.equal(result.decision.proceduralFallback.enabled, true);
  assert.ok(result.decision.proceduralFallback.placeholderAsset);
  assert.ok(result.decision.selectedAssets[0].assetId.startsWith('procedural-'));
});

test('asset discovery cache and recovery keep deterministic output', () => {
  const registry = createRegistryFixture();
  const persistence = createMemoryPersistence();
  const engine = new UniversalAssetDiscoveryMatchingResolutionEngine({
    registry,
    persistenceAdapter: persistence,
    persistenceKey: 'asset.discovery.engine.cache'
  });

  const first = engine.analyze(baseInput());
  const second = engine.analyze(baseInput());

  assert.equal(first.cacheKey, second.cacheKey);
  assert.equal(first.decision.primaryAsset.assetId, second.decision.primaryAsset.assetId);
  assert.ok(engine.snapshot().diagnostics.cacheHits >= 1);

  const recovered = new UniversalAssetDiscoveryMatchingResolutionEngine({
    registry,
    persistenceAdapter: persistence,
    persistenceKey: 'asset.discovery.engine.cache'
  });
  const third = recovered.analyze(baseInput());

  assert.equal(third.decision.primaryAsset.assetId, first.decision.primaryAsset.assetId);
  assert.ok(recovered.snapshot().diagnostics.recoveries >= 1);
});

test('asset discovery serialization, validation normalization and legacy migration are backward compatible', () => {
  const normalized = normalizeAssetDiscoveryMatchingResolutionProfile({
    mode: 'registry',
    confidenceScore: 0.77,
    decision: {
      selectedAssets: [{ assetId: 'cardio-heart-asset', rankScore: 0.8 }],
      rankedCandidates: [{ assetId: 'cardio-heart-asset', rankScore: 0.8 }],
      proceduralFallback: { enabled: false, placeholderAsset: null }
    }
  });

  assert.equal(normalized.schemaVersion, 'v1');
  assert.equal(normalized.decision.selectedAssets.length, 1);

  const migrated = migrateAssetDiscoveryMatchingResolutionProfile({
    schemaVersion: 'legacy',
    mode: 'registry',
    selectedAssets: [{ assetId: 'legacy-asset', rankScore: 0.61 }],
    ranked: [{ assetId: 'legacy-asset', rankScore: 0.61 }]
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.decision.selectedAssets[0].assetId, 'legacy-asset');

  const registry = createRegistryFixture();
  const engine = new UniversalAssetDiscoveryMatchingResolutionEngine({
    registry,
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.discovery.engine.serialize'
  });
  const profile = engine.analyze(baseInput());
  const serialized = engine.serialize(profile);
  const deserialized = engine.deserialize(serialized);

  assert.equal(deserialized.decision.primaryAsset.assetId, profile.decision.primaryAsset.assetId);
});

test('default analyzer helper supports procedural mode under empty registry', () => {
  const emptyRegistry = createUniversalAssetRegistry({
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.discovery.helper.empty'
  });
  const engine = new UniversalAssetDiscoveryMatchingResolutionEngine({
    registry: emptyRegistry,
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.discovery.helper.engine'
  });

  const profile = analyzeUniversalAssetDiscoveryMatchingResolution(baseInput({
    learningIntent: {
      learningIntent: 'Totally new lesson context',
      educationalStrategy: 'adaptive',
      reasoningStyle: 'conceptual',
      confidenceScore: 0.5
    }
  }), { engine });

  assert.equal(profile.status, 'resolved');
  assert.equal(profile.mode, 'procedural');
});
