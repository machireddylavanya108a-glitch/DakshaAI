import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createAssetManager,
  searchAssets,
  recommendAssets,
  getUniversalAssetRegistryState,
  resolveAssetFromRegistry,
  discoverUniversalAssets,
  registerUniversalAssetContract
} from './assetManager.js';

test('asset manager returns reusable assets for anatomy and robotics', () => {
  const manager = createAssetManager();
  const anatomyAssets = manager.getAssetsByCategory('Human Anatomy');
  const roboticsAssets = manager.getAssetsByCategory('Robots');

  assert.ok(anatomyAssets.length >= 1);
  assert.ok(roboticsAssets.length >= 1);
});

test('asset search and recommendations find relevant 3D assets', () => {
  const matches = searchAssets('heart surgery');
  const recommendations = recommendAssets('robot arm');

  assert.ok(matches.some((asset) => asset.id === 'heart-anatomy'));
  assert.ok(recommendations.some((asset) => asset.id === 'robot-arm'));
});

test('asset planner builds an optimized plan for a lesson topic', () => {
  const manager = createAssetManager();
  const plan = manager.buildAssetPlan('Teach solar system and satellites', 'Space');

  assert.ok(plan.length >= 2);
  assert.ok(plan[0].lod);
  assert.ok(plan[0].compression);
  assert.equal(plan[0].lazyLoading.enabled, true);
});

test('asset manager is backed by universal asset registry metadata', () => {
  const manager = createAssetManager();
  const state = manager.getRegistryState();
  const registrySnapshot = getUniversalAssetRegistryState();
  const heart = resolveAssetFromRegistry('heart-anatomy', 'latest');

  assert.ok(state.entries.length >= 1);
  assert.ok(registrySnapshot.entries.length >= 1);
  assert.equal(heart?.id, 'heart-anatomy');
  assert.ok(Array.isArray(heart?.tags));
});

test('universal asset discovery returns ranked candidates and primary asset', () => {
  const manager = createAssetManager();
  const discovery = manager.discoverAssets({
    query: 'left ventricle blood circulation visual explanation',
    category: 'Human Anatomy',
    learningIntent: {
      learningIntent: 'Teach blood circulation pathway',
      educationalStrategy: 'guided inquiry',
      reasoningStyle: 'procedural',
      confidenceScore: 0.79
    },
    visualizationStrategy: {
      primaryStrategy: {
        visualizationStyle: 'simulation',
        interactionLevel: 'high'
      }
    },
    sceneGraph: {
      nodeCount: 18,
      relationshipCount: 20
    },
    runtimeGraph: {
      nodeCount: 22,
      relationshipCount: 26
    },
    objectMetadata: [
      {
        id: 'obj-heart-1',
        name: 'Left ventricle',
        category: 'Human Anatomy',
        tags: ['heart', 'blood', 'circulation']
      }
    ]
  });

  assert.equal(discovery.profile.status, 'resolved');
  assert.ok(discovery.profile.decision.selectedAssets.length >= 1);
  assert.ok(discovery.rankedCandidates.length >= 1);
  assert.ok(discovery.selectedAssets.length >= 1);
});

test('discovery helper supports future asset types and procedural fallback when needed', () => {
  registerUniversalAssetContract({
    id: 'future-hologram-lattice',
    version: 'v9',
    type: 'future-holographic-lattice-asset',
    category: 'Future Science',
    tags: ['hologram', 'lattice', 'future'],
    capabilities: ['dynamic-geometry'],
    metadata: {
      name: 'Future Hologram Lattice',
      description: 'Future type registration for unknown topic support.'
    }
  }, { allowUpdate: true });

  const futureMatch = discoverUniversalAssets({
    query: 'hologram lattice future field visualization',
    category: 'Future Science',
    learningIntent: {
      learningIntent: 'Model a hologram lattice field',
      educationalStrategy: 'exploratory',
      reasoningStyle: 'analytical',
      confidenceScore: 0.7
    },
    objectMetadata: [
      {
        id: 'future-obj-1',
        name: 'Lattice Field',
        category: 'Future Science',
        tags: ['future', 'lattice']
      }
    ],
    sceneGraph: {
      nodeCount: 12,
      relationshipCount: 14
    },
    runtimeGraph: {
      nodeCount: 18,
      relationshipCount: 22
    }
  });

  assert.equal(futureMatch.profile.status, 'resolved');
  assert.ok(futureMatch.profile.decision.rankedCandidates.some((entry) => entry.type === 'future-holographic-lattice-asset'));

  const proceduralFallback = discoverUniversalAssets({
    query: '',
    category: '',
    learningIntent: {
      learningIntent: '',
      educationalStrategy: '',
      reasoningStyle: '',
      confidenceScore: 0
    },
    visualizationStrategy: {},
    capabilityRecommendation: {},
    sceneMetadata: {},
    objectMetadata: [],
    sceneGraph: {
      nodeCount: 0,
      relationshipCount: 0
    },
    runtimeGraph: {
      nodeCount: 0,
      relationshipCount: 0
    }
  });

  assert.equal(proceduralFallback.profile.status, 'resolved');
  if (proceduralFallback.profile.mode === 'procedural') {
    assert.equal(proceduralFallback.profile.decision.proceduralFallback.enabled, true);
  }
});
