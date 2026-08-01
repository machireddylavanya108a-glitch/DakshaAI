import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UniversalConfidenceConflictAdaptiveFallbackEngine,
  analyzeUniversalConfidenceConflictFallback,
  normalizeConfidenceConflictFallbackProfile,
  migrateConfidenceConflictFallbackProfile
} from './UniversalConfidenceConflictAdaptiveFallbackEngine.js';

function buildInput(overrides = {}) {
  return {
    learningIntent: {
      learningIntent: 'conceptual_mastery',
      knowledgeDomain: 'Robotics',
      reasoningStyle: 'causal_reasoning',
      confidenceScore: 0.62,
      learningPathway: [{ id: 'step-1' }, { id: 'step-2' }]
    },
    visualizationStrategy: {
      schemaVersion: 'v2',
      confidenceScore: 0.58,
      primaryStrategy: {
        strategyId: 'strategy-1',
        visualizationStyle: 'interactive concept network',
        sceneComplexity: 'high',
        interactionLevel: 'high',
        animationIntensity: 'high'
      },
      strategies: [
        {
          strategyId: 'strategy-1',
          visualizationStyle: 'interactive concept network',
          confidenceScore: 0.58
        },
        {
          strategyId: 'strategy-2',
          visualizationStyle: 'simulation timeline',
          confidenceScore: 0.49
        }
      ]
    },
    templateRecommendation: {
      schemaVersion: 'v2',
      recommendedCapabilities: [{ id: 'cap-1', confidence: 0.62, score: 0.6 }],
      recommendedTemplates: [
        { templateId: 'template-a', version: 'v1', semanticPurpose: 'process', confidence: 0.45, score: 0.42 },
        { templateId: 'template-b', version: 'v1', semanticPurpose: 'process', confidence: 0.42, score: 0.4 }
      ],
      requiredEducationalObjects: {
        objectCountHint: 2,
        objectTypes: ['concept-node'],
        requiresHierarchy: false,
        requiresRelationshipEdges: true,
        supportsUnknownObjectTypes: true
      },
      confidenceScore: 0.41,
      fallbackStrategy: {
        mode: 'procedural-generation',
        recommendProceduralGeneration: true,
        reason: 'low-recommendation-confidence',
        confidence: 0.41,
        supportsUnknownFutureTypes: true
      }
    },
    sceneGraph: {
      sceneId: 'scene-1',
      nodeCount: 1,
      relationshipCount: 1
    },
    timeline: [
      {
        id: 'step-1',
        title: 'Explain robot actuator',
        duration: 1200,
        narration: { text: 'Actuators convert control into motion.' },
        objects: ['obj-1']
      },
      {
        id: 'step-1',
        title: 'Duplicate id creates conflict',
        duration: 0,
        objects: ['missing-object']
      }
    ],
    runtimeGraph: {
      nodeCount: 0,
      relationshipCount: 0
    },
    aiConfidenceMetadata: {
      confidence: 0.31,
      overallConfidence: 0.31,
      metrics: {
        customMetricAlpha: 0.77,
        customMetricBeta: 0.22
      },
      conflicts: [
        'unknown-future-conflict-type',
        {
          type: 'vendor-runtime-anomaly',
          severity: 'high',
          details: { source: 'vendor' }
        }
      ]
    },
    scene: {
      title: 'Robotics Lesson',
      subject: 'Robotics',
      objects: [{ id: 'obj-1' }],
      educationalObjects: [],
      timeline: [
        {
          id: 'step-1',
          title: 'Explain robot actuator',
          duration: 1200,
          narration: { text: 'Actuators convert control into motion.' },
          objects: ['obj-1']
        },
        {
          id: 'step-1',
          title: 'Duplicate id creates conflict',
          duration: 0,
          objects: ['missing-object']
        }
      ],
      reusableAssets: [],
      metadata: {
        confidence: 0.3,
        reusableAssets: []
      }
    },
    ...overrides
  };
}

test('low-confidence AI output triggers adaptive fallback actions', () => {
  const profile = analyzeUniversalConfidenceConflictFallback(buildInput(), {
    minimumConfidenceThreshold: 0.45
  });

  assert.equal(profile.schemaVersion, 'v2');
  assert.equal(typeof profile.overallConfidence, 'number');
  assert.equal(profile.fallbackPlan.recommended, true);
  assert.ok(profile.fallbackPlan.actions.includes('retry-pipeline'));
  assert.ok(profile.fallbackPlan.actions.includes('switch-procedural-generation'));
  assert.ok(profile.fallbackPlan.actions.includes('switch-adaptive-2d-visualization'));
  assert.equal(profile.fallbackPlan.preserveLearningQuality, true);
});

test('conflict detection includes known and unknown conflict types', () => {
  const profile = analyzeUniversalConfidenceConflictFallback(buildInput());
  const conflictTypes = profile.conflicts.map((entry) => entry.type);

  assert.ok(conflictTypes.includes('multiple-visualization-strategies'));
  assert.ok(conflictTypes.includes('conflicting-templates'));
  assert.ok(conflictTypes.includes('inconsistent-timeline'));
  assert.ok(conflictTypes.includes('invalid-graph-references'));
  assert.ok(conflictTypes.some((value) => value.startsWith('unknown:')));
});

test('missing templates and missing assets reduce confidence safely without failing profile', () => {
  const profile = analyzeUniversalConfidenceConflictFallback(buildInput({
    templateRecommendation: {
      schemaVersion: 'v2',
      recommendedCapabilities: [],
      recommendedTemplates: [],
      requiredEducationalObjects: {
        objectCountHint: 1,
        objectTypes: ['concept-node'],
        requiresHierarchy: false,
        requiresRelationshipEdges: false,
        supportsUnknownObjectTypes: true
      },
      confidenceScore: 0.2,
      fallbackStrategy: {
        mode: 'procedural-generation',
        recommendProceduralGeneration: true,
        reason: 'templates-unavailable',
        confidence: 0.2,
        supportsUnknownFutureTypes: true
      }
    },
    scene: {
      title: 'Sparse lesson',
      subject: 'Open topic',
      objects: [{ id: 'obj-1' }],
      educationalObjects: [],
      timeline: [{ id: 'step-1', title: 'Minimal', duration: 1200, objects: ['obj-1'] }],
      reusableAssets: [],
      metadata: { confidence: 0.25 }
    }
  }));

  assert.equal(profile.templateConfidence < 0.6, true);
  assert.ok(profile.conflicts.some((entry) => entry.type === 'missing-educational-objects'));
  assert.equal(profile.fallbackPlan.recommended, true);
});

test('normalization and migration keep backward compatibility', () => {
  const migrated = migrateConfidenceConflictFallbackProfile({
    schemaVersion: 'v1',
    confidence: 0.52,
    conflicts: ['legacy-conflict-a'],
    fallbackActions: ['retry-pipeline']
  });

  const normalized = normalizeConfidenceConflictFallbackProfile(migrated);
  assert.equal(normalized.schemaVersion, 'v2');
  assert.ok(Array.isArray(normalized.conflicts));
  assert.ok(Array.isArray(normalized.fallbackPlan.actions));
  assert.equal(normalized.fallbackPlan.supportsUnknownFutureFallbackModes, true);
});

test('engine cache persistence and recovery work with deterministic outputs', () => {
  const persistence = (() => {
    const map = new Map();
    return {
      setItem(key, value) {
        map.set(String(key), String(value));
      },
      getItem(key) {
        return map.get(String(key)) || null;
      },
      removeItem(key) {
        map.delete(String(key));
      }
    };
  })();

  const one = new UniversalConfidenceConflictAdaptiveFallbackEngine({
    persistenceAdapter: persistence,
    persistenceKey: 'test.confidence.engine.cache'
  });

  const first = one.analyze(buildInput({ aiConfidenceMetadata: { confidence: 0.5, overallConfidence: 0.5, metrics: {} } }));
  const second = one.analyze(buildInput({ aiConfidenceMetadata: { confidence: 0.5, overallConfidence: 0.5, metrics: {} } }));

  assert.deepEqual(first, second);
  assert.equal(one.snapshot().cacheSize >= 1, true);

  const two = new UniversalConfidenceConflictAdaptiveFallbackEngine({
    persistenceAdapter: persistence,
    persistenceKey: 'test.confidence.engine.cache'
  });

  assert.equal(two.snapshot().cacheSize >= 1, true);
});
