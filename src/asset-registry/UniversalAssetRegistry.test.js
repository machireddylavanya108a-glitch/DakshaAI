import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createUniversalAssetRegistry,
  migrateUniversalAssetContract,
  normalizeUniversalAssetContract,
  validateUniversalAssetContract
} from './index.js';

function createMemoryPersistence() {
  const store = new Map();
  return {
    setItem(key, value) {
      store.set(String(key), String(value));
    },
    getItem(key) {
      return store.get(String(key)) || null;
    }
  };
}

test('universal asset contract normalizes and migrates legacy fields', () => {
  const migrated = migrateUniversalAssetContract({
    assetId: 'legacy-lens-1',
    kind: 'optics-asset',
    group: 'Optics',
    labels: ['lens', 'physics'],
    supportedFeatures: ['zoom'],
    provider: 'legacy-provider'
  });

  assert.equal(migrated.id, 'legacy-lens-1');
  assert.equal(migrated.type, 'optics-asset');
  assert.equal(migrated.category, 'Optics');
  assert.ok(migrated.tags.includes('lens'));
  assert.ok(migrated.capabilities.includes('zoom'));

  const normalized = normalizeUniversalAssetContract({
    id: 'adaptive-wave-model',
    type: 'wave-asset',
    category: 'Physics',
    tags: ['wave', 'oscillation'],
    qualityLevels: {
      low: 0.4,
      medium: 0.7,
      high: 0.95,
      default: 'high'
    }
  });

  const validation = validateUniversalAssetContract(normalized);
  assert.equal(validation.valid, true);
  assert.equal(validation.errors.length, 0);
  assert.equal(normalized.qualityLevels.default, 'high');
});

test('universal asset registry supports unknown future types without code changes', () => {
  const registry = createUniversalAssetRegistry({
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.registry.unknown-type.test'
  });

  const registration = registry.register({
    id: 'quantum-foam-visual',
    version: 'v3',
    type: 'future-procedural-hologram-asset',
    category: 'Future Science',
    tags: ['quantum', 'foam'],
    metadata: {
      name: 'Quantum Foam Visual',
      description: 'Generated procedural representation for future topics.'
    },
    capabilities: ['dynamic-geometry']
  });

  assert.equal(registration.status, 'registered');

  const lookup = registry.lookup('quantum-foam-visual', 'latest');
  assert.ok(lookup);
  assert.equal(lookup.type, 'future-procedural-hologram-asset');
});

test('universal asset registry resolves dependencies and reports missing refs', () => {
  const registry = createUniversalAssetRegistry({
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.registry.dependency.test'
  });

  registry.register({
    id: 'heart-core',
    version: 'v1',
    type: 'biology-asset',
    category: 'Human Anatomy',
    tags: ['heart'],
    metadata: { name: 'Heart Core' }
  });

  registry.register({
    id: 'heart-overlay',
    version: 'v2',
    type: 'annotation-asset',
    category: 'Human Anatomy',
    tags: ['overlay'],
    metadata: { name: 'Heart Overlay' },
    dependencies: [
      { assetId: 'heart-core', version: 'v1', required: true },
      { assetId: 'missing-dependency', version: 'latest', required: false }
    ]
  });

  const resolved = registry.resolveDependencies('heart-overlay', 'latest');
  assert.equal(resolved.root.id, 'heart-overlay');
  assert.ok(resolved.resolved.some((entry) => entry.id === 'heart-core'));
  assert.ok(resolved.missing.some((entry) => entry.assetId === 'missing-dependency'));
  assert.equal(resolved.status, 'resolved');
});

test('universal asset registry enforces duplicates unless allowUpdate is enabled', () => {
  const registry = createUniversalAssetRegistry({
    persistenceAdapter: createMemoryPersistence(),
    persistenceKey: 'asset.registry.duplicates.test'
  });

  const first = registry.register({
    id: 'solar-node',
    version: 'v1',
    type: 'astronomy-asset',
    category: 'Space',
    tags: ['solar'],
    metadata: { name: 'Solar Node' }
  });
  assert.equal(first.status, 'registered');

  const duplicate = registry.register({
    id: 'solar-node',
    version: 'v1',
    type: 'astronomy-asset',
    category: 'Space',
    tags: ['solar'],
    metadata: { name: 'Solar Node Duplicate' }
  });
  assert.equal(duplicate.status, 'duplicate');

  const updated = registry.register({
    id: 'solar-node',
    version: 'v1',
    type: 'astronomy-asset',
    category: 'Space',
    tags: ['solar', 'updated'],
    metadata: { name: 'Solar Node Updated' }
  }, { allowUpdate: true });
  assert.equal(updated.status, 'updated');
  assert.ok(registry.lookup('solar-node', 'v1').tags.includes('updated'));
});

test('universal asset registry serializes and recovers snapshot state', () => {
  const persistence = createMemoryPersistence();
  const registry = createUniversalAssetRegistry({
    persistenceAdapter: persistence,
    persistenceKey: 'asset.registry.persistence.test'
  });

  registry.register({
    id: 'robot-arm-pro',
    version: 'v4',
    type: 'robotics-asset',
    category: 'Robots',
    tags: ['robot', 'arm'],
    metadata: { name: 'Robot Arm Pro' }
  });

  registry.persist();

  const recovered = createUniversalAssetRegistry({
    persistenceAdapter: persistence,
    persistenceKey: 'asset.registry.persistence.test'
  });

  const lookup = recovered.lookup('robot-arm-pro', 'latest');
  assert.ok(lookup);
  assert.equal(lookup.version, 'v4');

  const diagnostics = recovered.getDiagnostics();
  assert.ok(diagnostics.recoveries >= 1);
  assert.ok(diagnostics.contractCount >= 1);
});
