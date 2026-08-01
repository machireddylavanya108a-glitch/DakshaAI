import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UniversalVisualizationStrategyEngine,
  analyzeVisualizationStrategy,
  normalizeVisualizationStrategyProfile,
  migrateVisualizationStrategyProfile
} from './UniversalVisualizationStrategyEngine.js';

function createMemoryAdapter() {
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

function assertStrategyShape(profile) {
  assert.equal(profile.schemaVersion, 'v2');
  assert.ok(profile.primaryStrategy);
  assert.ok(Array.isArray(profile.strategies));
  assert.ok(profile.strategies.length >= 1);

  const primary = profile.primaryStrategy;
  assert.ok(primary.visualizationStyle.length > 0);
  assert.ok(primary.sceneComplexity.length > 0);
  assert.ok(primary.interactionLevel.length > 0);
  assert.ok(primary.animationIntensity.length > 0);
  assert.ok(primary.cameraStrategy.length > 0);
  assert.ok(primary.narrationStrategy.length > 0);
  assert.ok(primary.timelineStrategy.length > 0);
  assert.ok(primary.objectDensity.length > 0);
  assert.ok(primary.renderingPriority.length > 0);
  assert.equal(typeof primary.simulationRequirements.required, 'boolean');
  assert.ok(primary.learningMode.length > 0);
  assert.ok(primary.reasoningStrategy.length > 0);
  assert.ok(primary.confidenceScore >= 0 && primary.confidenceScore <= 1);
}

test('unknown lesson type produces adaptive strategy without code changes', () => {
  const profile = analyzeVisualizationStrategy({
    sourceType: 'quantum-holo-notes',
    sourceName: 'future.lesson.bundle',
    content: 'Learner wants to reason through emergent states and unknown interaction pathways.'
  });

  assertStrategyShape(profile);
  assert.equal(profile.metadata.supportsUnknownVisualizationTypes, true);
});

test('mixed lesson supports multiple strategies', () => {
  const profile = analyzeVisualizationStrategy({
    sourceType: 'text',
    content: 'Compare two approaches, then follow timeline phases and validate with a simulation.'
  });

  assertStrategyShape(profile);
  assert.ok(profile.strategies.length >= 3);
  assert.ok(profile.strategies.some((entry) => /comparison|timeline|simulation|hybrid visualization/i.test(entry.visualizationStyle)));
});

test('multimodal content supports diagram and adaptive pathways', () => {
  const profile = analyzeVisualizationStrategy({
    sourceType: 'image',
    content: 'Diagram with workflow arrows and timeline markers across system components.',
    visualDescription: 'Annotated process diagram with state transitions.'
  });

  assertStrategyShape(profile);
  assert.ok(profile.strategies.some((entry) => /diagram|workflow|adaptive visualization/i.test(entry.visualizationStyle)));
});

test('research papers produce analytical reasoning strategies', () => {
  const profile = analyzeVisualizationStrategy({
    sourceType: 'research-paper',
    content: 'This paper evaluates evidence, compares baselines, and analyzes outcomes across experiments.'
  });

  assertStrategyShape(profile);
  assert.ok(/analytical|comparative|conceptual/.test(profile.primaryStrategy.reasoningStrategy));
});

test('handwritten notes remain supported with structured output', () => {
  const profile = analyzeVisualizationStrategy({
    sourceType: 'handwritten-notes',
    content: 'Class notes: step 1, step 2, revise concept links and summarize practical actions.'
  });

  assertStrategyShape(profile);
});

test('source code content supports procedural and interactive strategies', () => {
  const profile = analyzeVisualizationStrategy({
    sourceType: 'source-code',
    content: 'Implement queue scheduler. Compare algorithmic complexity and debug state transitions. function run() {}'
  });

  assertStrategyShape(profile);
  assert.ok(profile.strategies.some((entry) => /procedural animation|interactive scene|workflow/i.test(entry.visualizationStyle)));
});

test('multilingual lesson keeps strategy contract valid', () => {
  const profile = analyzeVisualizationStrategy({
    sourceType: 'text',
    content: 'Explain the process in English and Hindi. Compare results, then simulate final step. हिंदी में भी समझाइए।'
  });

  assertStrategyShape(profile);
  assert.ok(profile.metadata.intent);
});

test('adaptive visualization selection includes required strategy fields', () => {
  const profile = analyzeVisualizationStrategy({
    sourceType: 'video',
    content: 'Observe the workflow, compare branches, and practice through interactive checkpoints.'
  });

  assertStrategyShape(profile);
  assert.ok(profile.primaryStrategy.timelineStrategy.length > 0);
  assert.ok(profile.primaryStrategy.narrationStrategy.length > 0);
});

test('serialization, caching, and recovery preserve strategy profiles', () => {
  const adapter = createMemoryAdapter();
  const engineOne = new UniversalVisualizationStrategyEngine({
    persistenceAdapter: adapter,
    persistenceKey: 'viz-strategy-test-cache'
  });

  const first = engineOne.analyze({
    sourceType: 'text',
    content: 'Timeline with comparisons and simulation checkpoints.'
  });
  const second = engineOne.analyze({
    sourceType: 'text',
    content: 'Timeline with comparisons and simulation checkpoints.'
  });

  assert.equal(first.primaryStrategy.visualizationStyle, second.primaryStrategy.visualizationStyle);
  assert.ok(engineOne.snapshot().diagnostics.cacheHits >= 1);

  const serialized = engineOne.serialize(first);
  const deserialized = engineOne.deserialize(serialized);
  assertStrategyShape(deserialized);

  const engineTwo = new UniversalVisualizationStrategyEngine({
    persistenceAdapter: adapter,
    persistenceKey: 'viz-strategy-test-cache'
  });

  const recovered = engineTwo.analyze({
    sourceType: 'text',
    content: 'Timeline with comparisons and simulation checkpoints.'
  });

  assertStrategyShape(recovered);
  assert.ok(engineTwo.snapshot().cacheSize >= 1);
});

test('backward compatibility migration supports legacy profile shape', () => {
  const legacy = {
    schemaVersion: 'v1',
    style: 'timeline',
    sceneComplexity: 'medium',
    interactionLevel: 'medium',
    confidenceScore: 0.52
  };

  const migrated = migrateVisualizationStrategyProfile(legacy);
  const normalized = normalizeVisualizationStrategyProfile(migrated);

  assertStrategyShape(normalized);
  assert.equal(normalized.metadata.migrationApplied, true);
});
