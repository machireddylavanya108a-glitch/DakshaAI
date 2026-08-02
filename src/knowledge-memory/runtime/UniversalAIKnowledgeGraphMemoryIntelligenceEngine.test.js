import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniversalAIKnowledgeGraphMemoryIntelligenceEngine,
  runUniversalAIKnowledgeGraphMemoryIntelligenceEngine,
  validateUniversalAIKnowledgeMemoryOutput,
  serializeUniversalAIKnowledgeMemoryOutput,
  deserializeUniversalAIKnowledgeMemoryOutput,
  migrateUniversalAIKnowledgeMemoryOutput,
  verifyUniversalGraphIntegrity
} from './index.js';

function createMemoryAdapter() {
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

function createFixtureInput(overrides = {}) {
  return {
    lessonGraph: {
      schemaVersion: 'v1',
      lessonId: 'knowledge-lesson-1',
      title: 'Universal Intelligence Systems',
      language: 'English',
      topics: ['Reasoning', 'Optimization', 'Inference'],
      keyConcepts: ['Reasoning', 'Optimization', 'Inference'],
      learningObjectives: ['Understand reasoning', 'Apply inference']
    },
    curriculumGraph: {
      curriculumId: 'curriculum-knowledge-1',
      topics: [
        { id: 'topic-1', title: 'Reasoning' },
        { id: 'topic-2', title: 'Optimization' }
      ],
      skillMap: [{ id: 'skill-1', skill: 'Analytical Reasoning' }],
      careerPath: {
        roles: [{ id: 'role-1', role: 'AI Systems Analyst' }]
      }
    },
    runtimeGraph: {
      nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
      edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }]
    },
    learningAnalytics: {
      output: {
        masteryScore: 0.68,
        learningProgress: {
          revisionHistory: {
            totalRevisions: 5
          }
        }
      }
    },
    aiTeacherEvents: [{ id: 'te1', type: 'ai-teacher-runtime-event' }],
    assessmentResults: {
      output: {
        masteryScore: 0.71,
        completionScore: 0.62,
        learningConfidence: 0.67
      }
    },
    userLearningProfile: {
      learningLevel: 'advanced',
      language: 'English'
    },
    sessionHistory: [{ sessionId: 's1', durationMinutes: 30 }],
    interactionEvents: [{ id: 'i1', type: 'interaction-click' }],
    timelineEvents: [{ id: 't1', type: 'TimelineResumed' }],
    learningIntent: {
      knowledgeDomain: 'future knowledge domains',
      language: 'English'
    },
    ...overrides
  };
}

test('graph generation produces all required graph outputs', () => {
  const result = runUniversalAIKnowledgeGraphMemoryIntelligenceEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(typeof result.output.knowledgeGraph, 'object');
  assert.equal(typeof result.output.conceptGraph, 'object');
  assert.equal(typeof result.output.dependencyGraph, 'object');
  assert.equal(typeof result.output.skillGraph, 'object');
  assert.equal(typeof result.output.learningGraph, 'object');
  assert.equal(typeof result.output.memoryGraph, 'object');
  assert.equal(typeof result.output.relationshipGraph, 'object');
  assert.equal(typeof result.output.revisionGraph, 'object');
  assert.equal(typeof result.output.masteryGraph, 'object');
  assert.equal(typeof result.output.learningHistoryGraph, 'object');
  assert.equal(typeof result.output.careerGraph, 'object');
  assert.equal(Array.isArray(result.output.conceptClusters), true);
  assert.equal(Array.isArray(result.output.semanticLinks), true);
  assert.equal(typeof result.output.graphMetadata, 'object');
});

test('relationship creation includes semantic and structural links', () => {
  const result = runUniversalAIKnowledgeGraphMemoryIntelligenceEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  const relationshipEdges = result.output.relationshipGraph.edges;
  assert.equal(Array.isArray(relationshipEdges), true);
  assert.equal(relationshipEdges.length > 0, true);
  assert.equal(Array.isArray(result.output.semanticLinks), true);
  assert.equal(result.output.semanticLinks.length > 0, true);
});

test('memory persistence and concept retrieval metadata are generated', () => {
  const result = runUniversalAIKnowledgeGraphMemoryIntelligenceEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(typeof result.output.memoryIntelligence, 'object');
  assert.equal(Array.isArray(result.output.memoryIntelligence.longTermMemory), true);
  assert.equal(Array.isArray(result.output.memoryIntelligence.sessionMemory), true);
  assert.equal(Array.isArray(result.output.memoryIntelligence.shortTermContext), true);
  assert.equal(typeof result.output.memoryIntelligence.conceptRecall, 'object');
  assert.equal(typeof result.output.memoryIntelligence.semanticRetrieval, 'object');
  assert.equal(typeof result.output.memoryIntelligence.contextualRetrieval, 'object');
});

test('revision planning and mastery forecasting metadata are generated', () => {
  const result = runUniversalAIKnowledgeGraphMemoryIntelligenceEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.memoryIntelligence.revisionMemory), true);
  assert.equal(typeof result.output.memoryIntelligence.forgettingPrediction, 'object');
  assert.equal(typeof result.output.memoryIntelligence.reinforcementPlanning, 'object');
  assert.equal(typeof result.output.memoryIntelligence.masteryForecast, 'object');
});

test('future graph types are preserved automatically without code changes', () => {
  const result = runUniversalAIKnowledgeGraphMemoryIntelligenceEngine(createFixtureInput({
    graphTypes: ['quantum-semantic-fabric', 'holographic-memory-links'],
    memoryModels: ['future-contextual-retriever-v2']
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  const unknown = result.output.diagnostics.unknownFutureGraphTypes;
  assert.equal(unknown.includes('quantum-semantic-fabric'), true);
  assert.equal(unknown.includes('holographic-memory-links'), true);
  assert.equal(unknown.includes('future-contextual-retriever-v2'), true);
});

test('graph integrity verification identifies valid graph metadata', () => {
  const result = runUniversalAIKnowledgeGraphMemoryIntelligenceEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  const integrity = verifyUniversalGraphIntegrity(result.output.knowledgeGraph);
  assert.equal(integrity.valid, true);
  assert.equal(Array.isArray(integrity.missingNodeRefs), true);
  assert.equal(Array.isArray(integrity.duplicateNodeIds), true);
});

test('validation serialization migration recovery and backward compatibility work', () => {
  const adapter = createMemoryAdapter();
  const engine = createUniversalAIKnowledgeGraphMemoryIntelligenceEngine({ metadata: {} }, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.knowledge.memory.compat.test'
  });

  const generated = engine.generate(createFixtureInput());
  assert.equal(generated.validation.valid, true);

  const validation = validateUniversalAIKnowledgeMemoryOutput(generated.output);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalAIKnowledgeMemoryOutput(generated.output);
  const deserialized = deserializeUniversalAIKnowledgeMemoryOutput(serialized);
  assert.equal(deserialized.validation.valid, true);

  const migrated = migrateUniversalAIKnowledgeMemoryOutput({
    id: 'legacy-knowledge',
    lessonId: 'legacy-lesson',
    curriculumId: 'legacy-curriculum',
    topics: ['Legacy Topic']
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.lessonId, 'legacy-lesson');

  const persisted = engine.persistSession();
  assert.equal(persisted, true);

  const recoveredEngine = createUniversalAIKnowledgeGraphMemoryIntelligenceEngine({ metadata: {} }, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.knowledge.memory.compat.test'
  });

  const recovered = recoveredEngine.recoverSession();
  assert.equal(recovered, true);
  assert.equal(recoveredEngine.snapshot().diagnostics.recoveries >= 1, true);

  const fallback = deserializeUniversalAIKnowledgeMemoryOutput('invalid-json');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');
});
