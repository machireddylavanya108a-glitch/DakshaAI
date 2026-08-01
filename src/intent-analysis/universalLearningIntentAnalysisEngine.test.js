import test from 'node:test';
import assert from 'node:assert/strict';
import {
  UniversalLearningIntentAnalysisEngine,
  analyzeUniversalLearningIntent,
  normalizeIntentSourceType,
  normalizeIntentOutput
} from './universalLearningIntentAnalysisEngine.js';

test('normalizeIntentSourceType supports known aliases and unknown future types', () => {
  assert.equal(normalizeIntentSourceType('DOC'), 'docx');
  assert.equal(normalizeIntentSourceType('website'), 'website');
  assert.equal(normalizeIntentSourceType('future-custom-modality'), 'future-custom-modality');
});

test('analyzeUniversalLearningIntent returns stable universal intent schema', () => {
  const output = analyzeUniversalLearningIntent({
    sourceType: 'pdf',
    sourceName: 'systems-design.pdf',
    content: 'Learn distributed systems architecture, tradeoffs, scalability patterns, and failure recovery strategies.',
    visualDescription: 'Architecture diagrams and service interaction flow.'
  });

  assert.equal(output.schemaVersion, 'v1');
  assert.ok(output.learningIntent.length > 0);
  assert.ok(output.knowledgeDomain.length > 0);
  assert.ok(output.subDomain.length > 0);
  assert.ok(output.learningObjective.length > 0);
  assert.ok(['low', 'medium', 'high'].includes(output.visualizationComplexity));
  assert.ok(['low', 'medium', 'high'].includes(output.interactionComplexity));
  assert.ok(output.learningPathway.length >= 3);
  assert.ok(output.confidenceScore >= 0 && output.confidenceScore <= 1);
});

test('engine cache and persistence recover from stored state', () => {
  const store = new Map();
  const adapter = {
    setItem(key, value) {
      store.set(key, value);
    },
    getItem(key) {
      return store.get(key) || null;
    }
  };

  const engineA = new UniversalLearningIntentAnalysisEngine({
    persistenceAdapter: adapter,
    persistenceKey: 'intent-cache-test'
  });

  const first = engineA.analyze({
    sourceType: 'source-code',
    content: 'Implement graph traversal, optimize complexity, and debug runtime behavior.'
  });

  const second = engineA.analyze({
    sourceType: 'source-code',
    content: 'Implement graph traversal, optimize complexity, and debug runtime behavior.'
  });

  assert.equal(first.learningIntent, second.learningIntent);
  const snapshotA = engineA.snapshot();
  assert.ok(snapshotA.diagnostics.cacheHits >= 1);

  const engineB = new UniversalLearningIntentAnalysisEngine({
    persistenceAdapter: adapter,
    persistenceKey: 'intent-cache-test'
  });

  const recovered = engineB.analyze({
    sourceType: 'source-code',
    content: 'Implement graph traversal, optimize complexity, and debug runtime behavior.'
  });

  assert.equal(recovered.learningIntent, first.learningIntent);
  assert.ok(engineB.snapshot().cacheSize >= 1);
});

test('intent output normalization and serialization are resilient', () => {
  const engine = new UniversalLearningIntentAnalysisEngine();
  const normalized = normalizeIntentOutput({
    knowledgeDomain: 'Computational Thinking',
    learningPathway: ['Analyze', 'Practice']
  });

  assert.equal(normalized.schemaVersion, 'v1');
  assert.equal(normalized.knowledgeDomain, 'Computational Thinking');
  assert.equal(normalized.learningPathway.length, 2);

  const serialized = engine.serializeIntent(normalized);
  const deserialized = engine.deserializeIntent(serialized);
  assert.equal(deserialized.knowledgeDomain, 'Computational Thinking');
  assert.equal(deserialized.learningPathway.length, 2);

  const fallback = engine.deserializeIntent('{bad-json');
  assert.equal(fallback.schemaVersion, 'v1');
  assert.ok(fallback.learningIntent.length > 0);
});
