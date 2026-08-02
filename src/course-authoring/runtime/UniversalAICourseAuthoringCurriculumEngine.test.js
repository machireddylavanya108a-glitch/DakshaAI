import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniversalAICourseAuthoringCurriculumEngine,
  runUniversalAICourseAuthoringCurriculumEngine,
  validateUniversalAICurriculumOutput,
  serializeUniversalAICurriculumOutput,
  deserializeUniversalAICurriculumOutput,
  migrateUniversalAICurriculumOutput
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
      lessonId: 'curriculum-lesson-1',
      sourceType: 'future-domain-stream-v2',
      title: 'Universal Problem Solving',
      language: 'English',
      topics: ['Modeling', 'Optimization', 'Decision Systems'],
      subtopics: ['Foundations', 'Advanced Trade-offs'],
      keyConcepts: ['Modeling', 'Optimization', 'Decision Systems'],
      learningObjectives: ['Understand modeling', 'Apply optimization']
    },
    runtimeGraph: {
      nodes: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
      edges: [{ from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }]
    },
    learningIntent: {
      learningObjective: 'Master universal problem solving methods',
      language: 'English',
      knowledgeDomain: 'future knowledge domains'
    },
    learningAnalytics: {
      output: {
        masteryScore: 0.74
      }
    },
    assessmentResults: {
      output: {
        questionBank: [{ id: 'q1' }, { id: 'q2' }]
      }
    },
    aiTeacherMetadata: {
      teachingPlan: {
        lessonId: 'curriculum-lesson-1'
      }
    },
    userLearningProfile: {
      learningLevel: 'advanced',
      learnerModes: ['visual-learners'],
      language: 'English'
    },
    ...overrides
  };
}

test('complete curriculum generation includes all required structures', () => {
  const runtime = { metadata: {} };
  const engine = createUniversalAICourseAuthoringCurriculumEngine(runtime, {
    persistenceAdapter: createMemoryAdapter(),
    persistenceKey: 'daksha.curriculum.test'
  });

  const result = engine.generate(createFixtureInput());
  assert.equal(result.validation.valid, true);
  assert.equal(typeof result.output.course, 'object');
  assert.equal(Array.isArray(result.output.modules), true);
  assert.equal(Array.isArray(result.output.chapters), true);
  assert.equal(Array.isArray(result.output.units), true);
  assert.equal(Array.isArray(result.output.topics), true);
  assert.equal(Array.isArray(result.output.subtopics), true);
  assert.equal(Array.isArray(result.output.learningObjectives), true);
  assert.equal(Array.isArray(result.output.learningOutcomes), true);
  assert.equal(typeof result.output.estimatedDuration, 'object');
  assert.equal(Array.isArray(result.output.difficultyProgression), true);
  assert.equal(Array.isArray(result.output.practiceSchedule), true);
  assert.equal(Array.isArray(result.output.revisionSchedule), true);
  assert.equal(Array.isArray(result.output.assessments), true);
  assert.equal(Array.isArray(result.output.projects), true);
  assert.equal(typeof result.output.capstone, 'object');
  assert.equal(typeof result.output.certificationPath, 'object');
  assert.equal(typeof result.output.careerPath, 'object');
  assert.equal(Array.isArray(result.output.skillMap), true);
  assert.equal(typeof result.output.knowledgeGraph, 'object');
  assert.equal(Array.isArray(result.output.competencyMatrix), true);
  assert.equal(typeof result.output.courseVersionMetadata, 'object');
});

test('prerequisite graph and learning roadmap structures are generated', () => {
  const result = runUniversalAICourseAuthoringCurriculumEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.prerequisites), true);
  assert.equal(typeof result.output.prerequisiteGraph, 'object');
  assert.equal(Array.isArray(result.output.prerequisiteGraph.edges), true);
  assert.equal(typeof result.output.dependencyGraph, 'object');
  assert.equal(Array.isArray(result.output.dependencyGraph.edges), true);
  assert.equal(typeof result.output.masteryGraph, 'object');
  assert.equal(typeof result.output.revisionGraph, 'object');
});

test('project roadmap and competency mapping are generated', () => {
  const result = runUniversalAICourseAuthoringCurriculumEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(typeof result.output.projectRoadmap, 'object');
  assert.equal(Array.isArray(result.output.projectRoadmap.milestones), true);
  assert.equal(Array.isArray(result.output.competencyMatrix), true);
  assert.equal(result.output.competencyMatrix.length > 0, true);
});

test('multilingual curricula are supported without code changes', () => {
  const result = runUniversalAICourseAuthoringCurriculumEngine(createFixtureInput({
    lessonGraph: {
      ...createFixtureInput().lessonGraph,
      title: 'Resolucion Universal de Problemas',
      language: 'Spanish'
    },
    learningIntent: {
      ...createFixtureInput().learningIntent,
      language: 'Spanish'
    },
    userLearningProfile: {
      ...createFixtureInput().userLearningProfile,
      language: 'Spanish'
    }
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.course.language, 'Spanish');
});

test('unknown curriculum types are preserved in future curriculum modules', () => {
  const result = runUniversalAICourseAuthoringCurriculumEngine(createFixtureInput({
    requestedCurriculumTypes: [
      'holographic-evaluation-path',
      'quantum-practice-simulations'
    ]
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  const types = result.output.futureCurriculumModules.map((entry) => entry.curriculumType);
  assert.equal(types.includes('holographic-evaluation-path'), true);
  assert.equal(types.includes('quantum-practice-simulations'), true);
});

test('validation serialization migration recovery and backward compatibility work', () => {
  const adapter = createMemoryAdapter();
  const engine = createUniversalAICourseAuthoringCurriculumEngine({ metadata: {} }, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.curriculum.compat.test'
  });

  const generated = engine.generate(createFixtureInput());
  assert.equal(generated.validation.valid, true);

  const validation = validateUniversalAICurriculumOutput(generated.output);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalAICurriculumOutput(generated.output);
  const deserialized = deserializeUniversalAICurriculumOutput(serialized);
  assert.equal(deserialized.validation.valid, true);

  const migrated = migrateUniversalAICurriculumOutput({
    id: 'legacy-curriculum-id',
    lessonTitle: 'Legacy Curriculum',
    topics: ['Legacy Topic'],
    learningObjectives: ['Legacy Objective']
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.lessonId, 'legacy-curriculum-id');

  const persisted = engine.persistSession();
  assert.equal(persisted, true);

  const recoveredEngine = createUniversalAICourseAuthoringCurriculumEngine({ metadata: {} }, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.curriculum.compat.test'
  });
  const recovered = recoveredEngine.recoverSession();
  assert.equal(recovered, true);
  assert.equal(recoveredEngine.snapshot().diagnostics.recoveries >= 1, true);

  const fallback = deserializeUniversalAICurriculumOutput('invalid-json-payload');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');
});
