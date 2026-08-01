import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  createUniversalAILessonGenerator,
  runUniversalAILessonGenerator,
  validateLessonGraph,
  migrateUniversalLessonGraph,
  serializeUniversalLessonGraph,
  deserializeUniversalLessonGraph
} from './index.js';

const HARD_TIMEOUT_MS = 10000;

function runWithHardTimeout(factory) {
  let timeoutId;
  const execution = Promise.resolve().then(factory);
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`Universal lesson generator exceeded ${HARD_TIMEOUT_MS}ms`)), HARD_TIMEOUT_MS);
    timeoutId.unref?.();
  });

  return Promise.race([execution, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

function createMatrixInput(entry) {
  const sourceType = entry.sourceType;
  const topic = entry.topic;
  const content = entry.content;

  return {
    sourceType,
    sourceName: `${sourceType}-source`,
    title: `${topic} Lesson`,
    topic,
    text: content,
    language: entry.language || 'English',
    metadata: {
      scenario: 'universal-lesson-generator-test'
    }
  };
}

test('universal AI lesson generator produces renderer-agnostic lesson graph across source modalities', async () => {
  const startedAt = performance.now();
  const modalities = [
    {
      sourceType: 'book',
      topic: 'Linear Algebra',
      content: 'Matrix multiplication, vector spaces, and linear transformations.'
    },
    {
      sourceType: 'pdf',
      topic: 'Operating Systems',
      content: 'Processes, threads, synchronization, and memory management.'
    },
    {
      sourceType: 'handwritten-notes',
      topic: 'Thermodynamics',
      content: 'Entropy, heat transfer, and state equations from class notes.'
    },
    {
      sourceType: 'image',
      topic: 'Cell Biology',
      content: 'Label the nucleus, membrane, and mitochondria from the captured diagram.'
    },
    {
      sourceType: 'website',
      topic: 'Distributed Systems',
      content: 'Consensus protocols and fault tolerance patterns from online documentation.',
      language: 'English'
    },
    {
      sourceType: 'youtube',
      topic: 'Calculus',
      content: 'Derivatives, integrals, and visual intuition from a lecture walkthrough.'
    },
    {
      sourceType: 'github',
      topic: 'Data Structures',
      content: 'Tree traversals and hash-map implementation details from repository code.'
    },
    {
      sourceType: 'research-paper',
      topic: 'Machine Learning',
      content: 'Bias-variance analysis and regularization techniques with experimental setup.'
    },
    {
      sourceType: 'text',
      topic: 'Historia Universal',
      content: 'Leccion en espanol sobre causas y efectos de la revolucion industrial.',
      language: 'Spanish'
    },
    {
      sourceType: 'future-hologram-stream-v9',
      topic: 'Quantum Networks',
      content: 'Future modality data stream discussing entanglement routing and protocols.'
    }
  ];

  for (const modality of modalities) {
    const result = await runWithHardTimeout(() => runUniversalAILessonGenerator(createMatrixInput(modality), {
      fastMode: true
    }));

    assert.equal(result.validation.valid, true);
    assert.equal(result.lessonGraph.schemaVersion, 'v1');
    assert.equal(Array.isArray(result.lessonGraph.learningObjectives), true);
    assert.equal(Array.isArray(result.lessonGraph.timelineSteps), true);
    assert.equal(Array.isArray(result.lessonGraph.educationalObjects), true);
    assert.equal(Array.isArray(result.lessonGraph.lessonGraph.nodes), true);
    assert.equal(Array.isArray(result.lessonGraph.lessonGraph.edges), true);
    assert.equal(typeof result.lessonGraph.contracts.runtimeGraph.nodeCount, 'number');
    assert.equal(typeof result.lessonGraph.contracts.runtimeGraph.relationshipCount, 'number');
    assert.equal(/webgl|shader|three\.|babylon|unity/i.test(JSON.stringify(result.lessonGraph)), false);
  }

  const elapsedMs = performance.now() - startedAt;
  assert.equal(Number.isFinite(elapsedMs), true);
});

test('lesson generator supports validation, migration, serialization, and state recovery', async () => {
  const runtime = createUniversalAILessonGenerator({
    persistenceAdapter: {
      store: new Map(),
      getItem(key) {
        return this.store.get(key) || null;
      },
      setItem(key, value) {
        this.store.set(key, value);
      },
      removeItem(key) {
        this.store.delete(key);
      }
    },
    persistenceKey: 'daksha.lesson.generator.test'
  });

  const generated = await runWithHardTimeout(() => runtime.generate({
    sourceType: 'pdf',
    sourceName: 'algebra.pdf',
    title: 'Algebra Foundations',
    topic: 'Algebra',
    text: 'Equations, inequalities, and polynomial operations.'
  }, {
    fastMode: true
  }));

  assert.equal(generated.validation.valid, true);

  const validation = validateLessonGraph(generated.lessonGraph);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalLessonGraph(generated.lessonGraph);
  const restored = deserializeUniversalLessonGraph(serialized);
  assert.equal(restored.validation.valid, true);
  assert.equal(restored.lessonGraph.schemaVersion, 'v1');

  const migrated = migrateUniversalLessonGraph({
    id: 'legacy-lesson-id',
    lessonTitle: 'Legacy Lesson',
    sourceType: 'legacy-source',
    objectives: ['Understand legacy objective'],
    concepts: ['Legacy concept'],
    timelineSteps: [{ id: 'legacy-step-1', title: 'Legacy Step', startMs: 0, endMs: 1000, durationMs: 1000 }],
    educationalObjects: [{ id: 'legacy-object', name: 'Legacy Object', type: 'concept-node' }]
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.lessonId, 'legacy-lesson-id');
  assert.equal(Array.isArray(migrated.learningObjectives), true);
  assert.equal(Array.isArray(migrated.keyConcepts), true);

  const snapshotBeforePersist = runtime.snapshot();
  assert.equal(snapshotBeforePersist.diagnostics.runCount >= 1, true);

  const persistResult = runtime.persistSession();
  assert.equal(persistResult, true);

  const recoveredRuntime = createUniversalAILessonGenerator({
    persistenceAdapter: runtime.persistenceAdapter,
    persistenceKey: 'daksha.lesson.generator.test'
  });
  const recoveryResult = recoveredRuntime.recoverSession();
  assert.equal(recoveryResult, true);
  assert.equal(recoveredRuntime.snapshot().diagnostics.recoveries >= 1, true);

  const fallback = deserializeUniversalLessonGraph('invalid-json-payload');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');
});
