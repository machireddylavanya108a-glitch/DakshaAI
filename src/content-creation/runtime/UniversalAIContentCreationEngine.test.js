import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniversalAIContentCreationEngine,
  runUniversalAIContentCreationEngine,
  validateUniversalAIContentOutput,
  serializeUniversalAIContentOutput,
  deserializeUniversalAIContentOutput,
  migrateUniversalAIContentOutput
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
      lessonId: 'universal-content-lesson',
      sourceType: 'future-knowledge-stream-v9',
      title: 'Universal Systems Thinking',
      language: 'English',
      learningObjectives: ['Understand systems', 'Apply systems modeling'],
      chapters: ['Foundations', 'Applications'],
      topics: ['Feedback Loops', 'Emergence', 'Optimization'],
      keyConcepts: ['Feedback Loops', 'Emergence', 'Optimization'],
      lessonGraph: {
        nodes: [
          { id: 'node-1', label: 'Feedback Loops' },
          { id: 'node-2', label: 'Emergence' }
        ],
        edges: [
          { id: 'edge-1', from: 'node-1', to: 'node-2', relation: 'influences' }
        ]
      },
      contracts: {
        contentTypes: ['neuro-simulation-briefs']
      }
    },
    runtimeGraph: {
      nodes: [{ id: 'runtime-1' }, { id: 'runtime-2' }],
      edges: [{ from: 'runtime-1', to: 'runtime-2', type: 'Connects' }]
    },
    learningIntent: {
      learningObjective: 'Master systems thinking for cross-domain decision making',
      confidenceScore: 0.78,
      language: 'English',
      knowledgeDomain: 'future knowledge domains',
      requestedContentTypes: ['adaptive-micro-drills']
    },
    visualizationStrategy: {
      primaryStrategy: {
        visualizationStyle: 'adaptive visualization',
        interactionLevel: 'guided',
        sceneComplexity: 'medium'
      }
    },
    userLearningProfile: {
      learningLevel: 'advanced',
      learnerModes: ['visual-learners', 'future-neural-mode'],
      language: 'English'
    },
    aiTeacherMetadata: {
      teachingPlan: {
        lessonId: 'universal-content-lesson'
      }
    },
    requestedContentTypes: ['future-lab-simulations'],
    ...overrides
  };
}

test('universal AI content creation engine generates complete structured course payload', () => {
  const runtime = {
    metadata: {}
  };

  const engine = createUniversalAIContentCreationEngine(runtime, {
    persistenceAdapter: createMemoryAdapter(),
    persistenceKey: 'daksha.content.creation.test'
  });

  const result = engine.generate(createFixtureInput());

  assert.equal(result.validation.valid, true);
  assert.equal(typeof result.output.completeCourse, 'object');
  assert.equal(Array.isArray(result.output.chapters), true);
  assert.equal(Array.isArray(result.output.topics), true);
  assert.equal(Array.isArray(result.output.learningObjectives), true);
  assert.equal(Array.isArray(result.output.explanations), true);
  assert.equal(Array.isArray(result.output.examples), true);
  assert.equal(Array.isArray(result.output.analogies), true);
  assert.equal(Array.isArray(result.output.realWorldApplications), true);
  assert.equal(Array.isArray(result.output.practicalExercises), true);
  assert.equal(Array.isArray(result.output.assignments), true);
  assert.equal(Array.isArray(result.output.cheatSheets), true);
  assert.equal(Array.isArray(result.output.revisionNotes), true);
  assert.equal(typeof result.output.summary, 'object');
  assert.equal(Array.isArray(result.output.skillOutcomes), true);
  assert.equal(typeof result.output.learningRoadmap, 'object');
  assert.equal(Array.isArray(result.output.contentModules), true);
});

test('universal AI content creation engine includes projects quizzes flashcards and mind maps', () => {
  const result = runUniversalAIContentCreationEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.miniProjects.length > 0, true);
  assert.equal(result.output.capstoneProjects.length > 0, true);
  assert.equal(result.output.quizBlueprint.length > 0, true);
  assert.equal(result.output.flashcards.length > 0, true);
  assert.equal(result.output.mindMaps.length > 0, true);
  assert.equal(typeof result.output.knowledgeGraph, 'object');
});

test('universal AI content creation engine supports multilingual content generation', () => {
  const result = runUniversalAIContentCreationEngine(createFixtureInput({
    lessonGraph: {
      ...createFixtureInput().lessonGraph,
      title: 'Introduccion a Sistemas Complejos',
      language: 'Spanish'
    },
    learningIntent: {
      ...createFixtureInput().learningIntent,
      language: 'Spanish',
      learningObjective: 'Comprender sistemas complejos y aplicarlos en problemas reales'
    },
    userLearningProfile: {
      ...createFixtureInput().userLearningProfile,
      language: 'Spanish'
    }
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.language, 'Spanish');
  assert.equal(result.output.completeCourse.language, 'Spanish');
});

test('unknown lesson types and future content types are preserved automatically', () => {
  const result = runUniversalAIContentCreationEngine(createFixtureInput({
    lessonGraph: {
      ...createFixtureInput().lessonGraph,
      sourceType: 'unknown-future-lesson-type-z15'
    },
    requestedContentTypes: [
      'holographic-practice-runs',
      'quantum-dialogue-scenarios'
    ]
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  const futureTypes = result.output.futureContentModules.map((entry) => entry.contentType);
  assert.equal(futureTypes.includes('holographic-practice-runs'), true);
  assert.equal(futureTypes.includes('quantum-dialogue-scenarios'), true);
  assert.equal(futureTypes.includes('neuro-simulation-briefs'), true);
});

test('validation migration serialization and recovery are backward compatible', () => {
  const adapter = createMemoryAdapter();
  const engine = createUniversalAIContentCreationEngine({ metadata: {} }, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.content.creation.compat.test'
  });

  const generated = engine.generate(createFixtureInput());
  assert.equal(generated.validation.valid, true);

  const validation = validateUniversalAIContentOutput(generated.output);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalAIContentOutput(generated.output);
  const deserialized = deserializeUniversalAIContentOutput(serialized);
  assert.equal(deserialized.validation.valid, true);

  const migrated = migrateUniversalAIContentOutput({
    id: 'legacy-content-id',
    lessonTitle: 'Legacy Content',
    topics: ['Legacy Topic A', 'Legacy Topic B'],
    learningObjectives: ['Legacy objective']
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.lessonId, 'legacy-content-id');
  assert.equal(Array.isArray(migrated.topics), true);

  const persisted = engine.persistSession();
  assert.equal(persisted, true);

  const restoredEngine = createUniversalAIContentCreationEngine({ metadata: {} }, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.content.creation.compat.test'
  });

  const recovered = restoredEngine.recoverSession();
  assert.equal(recovered, true);
  assert.equal(restoredEngine.snapshot().diagnostics.recoveries >= 1, true);

  const fallback = deserializeUniversalAIContentOutput('not-valid-json');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');
});
