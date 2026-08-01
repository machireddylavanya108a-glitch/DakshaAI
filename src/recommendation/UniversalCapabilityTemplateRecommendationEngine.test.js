import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UniversalCapabilityTemplateRecommendationEngine,
  analyzeCapabilityTemplateRecommendation,
  normalizeCapabilityTemplateRecommendation,
  migrateCapabilityTemplateRecommendation
} from './UniversalCapabilityTemplateRecommendationEngine.js';

function buildInput(overrides = {}) {
  return {
    learningIntent: {
      learningIntent: 'conceptual_mastery',
      knowledgeDomain: 'Computer Science',
      reasoningStyle: 'abductive_reasoning'
    },
    visualizationStrategy: {
      schemaVersion: 'v2',
      confidenceScore: 0.75,
      primaryStrategy: {
        strategyId: 'strategy-1',
        visualizationStyle: 'interactive concept network',
        sceneComplexity: 'medium',
        interactionLevel: 'high',
        animationIntensity: 'medium'
      },
      strategies: []
    },
    lessonMetadata: {
      id: 'lesson-1',
      lessonId: 'lesson-1',
      title: 'Neural Networks',
      topic: 'Neural Networks',
      performanceProfile: 'balanced'
    },
    sceneGraph: {
      sceneId: 'scene-1',
      nodeCount: 4,
      relationshipCount: 3
    },
    runtimeGraph: {
      nodeCount: 4,
      relationshipCount: 3
    },
    timeline: {
      events: [{ id: 'step-1' }, { id: 'step-2' }]
    },
    concepts: [
      { id: 'concept-1', type: 'concept-node', title: 'Neuron' },
      { id: 'concept-2', type: 'concept-node', title: 'Activation Function' }
    ],
    relationships: [
      { id: 'rel-1', sourceId: 'concept-1', targetId: 'concept-2', type: 'dependency' }
    ],
    steps: [
      { id: 'step-1', title: 'Introduce concept' },
      { id: 'step-2', title: 'Compare components' }
    ],
    goals: ['Understand core components', 'Explain interactions'],
    examples: [{ id: 'ex-1', title: 'Image classification' }],
    interactions: [{ id: 'int-1', type: 'click' }],
    ...overrides
  };
}

test('analyzeCapabilityTemplateRecommendation returns normalized recommendation profile', () => {
  const recommendation = analyzeCapabilityTemplateRecommendation(buildInput());

  assert.equal(recommendation.schemaVersion, 'v2');
  assert.ok(Array.isArray(recommendation.recommendedCapabilities));
  assert.ok(Array.isArray(recommendation.recommendedTemplates));
  assert.ok(recommendation.requiredEducationalObjects);
  assert.equal(typeof recommendation.requiredEducationalObjects.objectCountHint, 'number');
  assert.equal(typeof recommendation.confidenceScore, 'number');
  assert.ok(recommendation.fallbackStrategy);
  assert.equal(typeof recommendation.fallbackStrategy.recommendProceduralGeneration, 'boolean');
  assert.equal(recommendation.fallbackStrategy.supportsUnknownFutureTypes, true);
});

test('engine caches and recovers recommendation payloads', () => {
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

  const first = new UniversalCapabilityTemplateRecommendationEngine({
    persistenceAdapter: persistence,
    persistenceKey: 'test.recommendation.cache'
  });

  const one = first.analyze(buildInput({ lessonMetadata: { id: 'lesson-cache-1', lessonId: 'lesson-cache-1' } }));
  const two = first.analyze(buildInput({ lessonMetadata: { id: 'lesson-cache-1', lessonId: 'lesson-cache-1' } }));

  assert.deepEqual(one, two);
  assert.equal(first.snapshot().cacheSize >= 1, true);

  const second = new UniversalCapabilityTemplateRecommendationEngine({
    persistenceAdapter: persistence,
    persistenceKey: 'test.recommendation.cache'
  });

  assert.equal(second.snapshot().cacheSize >= 1, true);
});

test('migration and normalization preserve forward-compatible fallback strategy', () => {
  const migrated = migrateCapabilityTemplateRecommendation({
    schemaVersion: 'v1',
    capabilities: [{ id: 'cap-sequence-flow', confidence: 0.7, score: 0.65 }],
    templates: [{ templateId: 'template-legacy', version: 'v1', confidence: 0.5, score: 0.4 }],
    confidence: 0.6
  });

  const normalized = normalizeCapabilityTemplateRecommendation(migrated);

  assert.equal(normalized.schemaVersion, 'v2');
  assert.ok(Array.isArray(normalized.recommendedCapabilities));
  assert.ok(Array.isArray(normalized.recommendedTemplates));
  assert.equal(normalized.fallbackStrategy.supportsUnknownFutureTypes, true);
});
