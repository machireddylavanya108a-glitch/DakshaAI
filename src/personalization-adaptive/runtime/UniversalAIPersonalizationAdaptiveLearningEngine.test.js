import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createUniversalAIPersonalizationAdaptiveLearningEngine,
  runUniversalAIPersonalizationAdaptiveLearningEngine,
  validateUniversalAIPersonalizationOutput,
  serializeUniversalAIPersonalizationOutput,
  deserializeUniversalAIPersonalizationOutput,
  migrateUniversalAIPersonalizationOutput
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
      lessonId: 'personalization-lesson-1',
      title: 'Universal Systems Learning',
      language: 'English',
      topics: ['Systems Thinking', 'Optimization', 'Decision Intelligence'],
      keyConcepts: ['Systems Thinking', 'Optimization', 'Decision Intelligence'],
      learningObjectives: ['Understand systems', 'Apply optimization']
    },
    curriculumGraph: {
      curriculumId: 'curriculum-1',
      topics: [
        { id: 'topic-1', title: 'Systems Thinking' },
        { id: 'topic-2', title: 'Optimization' }
      ],
      skillMap: [
        { id: 'skill-1', skill: 'Systems Modeling' },
        { id: 'skill-2', skill: 'Optimization Strategy' }
      ],
      projects: [{ id: 'project-1', title: 'Optimization Project' }],
      careerPath: {
        roles: [{ id: 'role-1', role: 'Systems Analyst', competencyLevel: 'advanced' }]
      }
    },
    runtimeGraph: {
      nodes: [{ id: 'n1' }, { id: 'n2' }],
      edges: [{ from: 'n1', to: 'n2' }]
    },
    learningAnalytics: {
      output: {
        masteryScore: 0.7,
        learningProgress: {
          lessonCompletion: 0.6,
          revisionHistory: {
            totalRevisions: 4
          }
        },
        learningConfidence: 0.68
      }
    },
    assessmentResults: {
      output: {
        masteryScore: 0.72,
        completionScore: 0.62,
        learningConfidence: 0.66,
        mistakes: 2,
        questionBank: [{ id: 'q1' }, { id: 'q2' }]
      }
    },
    aiTeacherEvents: [{ id: 'evt1', type: 'ai-teacher-runtime-event' }],
    timelineEvents: [{ id: 'tm1', type: 'TimelineResumed' }, { id: 'tm2', type: 'CheckpointReached' }],
    userLearningProfile: {
      learningLevel: 'advanced',
      language: 'English',
      learnerModes: ['visual-learners'],
      learningGoals: ['Career growth'],
      futureCognitiveDimensionV2: 'pattern-systems'
    },
    sessionHistory: [{ sessionId: 's1', durationMinutes: 25 }],
    userPreferences: {
      dailyHours: 2,
      learningPace: 1.1,
      studyWindow: 'morning',
      notificationChannels: ['in-app'],
      careerGoals: ['Systems Architect']
    },
    ...overrides
  };
}

test('adaptive learning path and roadmap are generated', () => {
  const result = runUniversalAIPersonalizationAdaptiveLearningEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.personalizedLearningPath), true);
  assert.equal(result.output.personalizedLearningPath.length > 0, true);
  assert.equal(typeof result.output.adaptiveRoadmap, 'object');
  assert.equal(Array.isArray(result.output.dailyStudyPlan), true);
  assert.equal(Array.isArray(result.output.weeklyStudyPlan), true);
  assert.equal(Array.isArray(result.output.monthlyLearningPlan), true);
  assert.equal(Array.isArray(result.output.personalizedObjectives), true);
});

test('personalized recommendations and milestones are generated', () => {
  const result = runUniversalAIPersonalizationAdaptiveLearningEngine(createFixtureInput(), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.recommendedPractice), true);
  assert.equal(Array.isArray(result.output.revisionSchedule), true);
  assert.equal(Array.isArray(result.output.weakConceptRecoveryPlan), true);
  assert.equal(Array.isArray(result.output.skillImprovementPlan), true);
  assert.equal(Array.isArray(result.output.projectRecommendations), true);
  assert.equal(Array.isArray(result.output.careerRecommendations), true);
  assert.equal(Array.isArray(result.output.personalizedMilestones), true);
  assert.equal(typeof result.output.adaptiveNotificationsMetadata, 'object');
});

test('difficulty and pace adaptation respond to learner performance', () => {
  const result = runUniversalAIPersonalizationAdaptiveLearningEngine(createFixtureInput({
    assessmentResults: {
      output: {
        masteryScore: 0.48,
        completionScore: 0.4,
        learningConfidence: 0.35,
        mistakes: 6
      }
    },
    userPreferences: {
      learningPace: 0.7
    }
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(typeof result.output.difficultyRecommendation, 'object');
  assert.equal(typeof result.output.paceRecommendation, 'object');
  assert.equal(typeof result.output.motivationStrategy, 'object');
  assert.equal(result.output.learningConfidence >= 0 && result.output.learningConfidence <= 1, true);
  assert.equal(result.output.successProbability >= 0 && result.output.successProbability <= 1, true);
});

test('multilingual learners are supported without code changes', () => {
  const result = runUniversalAIPersonalizationAdaptiveLearningEngine(createFixtureInput({
    lessonGraph: {
      ...createFixtureInput().lessonGraph,
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
  assert.equal(result.output.language, 'Spanish');
});

test('offline recovery and multi-device synchronization are preserved', () => {
  const engine = createUniversalAIPersonalizationAdaptiveLearningEngine({ metadata: {} }, {
    persistenceAdapter: createMemoryAdapter(),
    persistenceKey: 'daksha.personalization.sync.test'
  });

  const result = engine.generate(createFixtureInput({
    offlineEvents: [
      { id: 'off1', type: 'offline-learning-event', payload: { durationMinutes: 20 } }
    ],
    deviceSync: {
      deviceId: 'tablet-1',
      snapshot: {
        progress: 0.4
      }
    }
  }));

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.synchronization.offlineSynchronization.pendingOperations >= 1, true);
  assert.equal(result.output.synchronization.multiDeviceSynchronization.totalDevices >= 1, true);
});

test('future learner profiles are preserved through diagnostics', () => {
  const result = runUniversalAIPersonalizationAdaptiveLearningEngine(createFixtureInput({
    userLearningProfile: {
      ...createFixtureInput().userLearningProfile,
      futureNeuroTraitX: 'adaptive-quantum-pattern'
    }
  }), {
    runtime: { metadata: {} }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.diagnostics.futureLearnerAttributes.includes('futureNeuroTraitX'), true);
});

test('validation serialization migration recovery and backward compatibility work', () => {
  const adapter = createMemoryAdapter();
  const engine = createUniversalAIPersonalizationAdaptiveLearningEngine({ metadata: {} }, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.personalization.compat.test'
  });

  const generated = engine.generate(createFixtureInput());
  assert.equal(generated.validation.valid, true);

  const validation = validateUniversalAIPersonalizationOutput(generated.output);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalAIPersonalizationOutput(generated.output);
  const deserialized = deserializeUniversalAIPersonalizationOutput(serialized);
  assert.equal(deserialized.validation.valid, true);

  const migrated = migrateUniversalAIPersonalizationOutput({
    id: 'legacy-personalization',
    lessonId: 'legacy-lesson',
    curriculumId: 'legacy-curriculum',
    personalizedLearningPath: [{ id: 'p1' }]
  });
  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.lessonId, 'legacy-lesson');

  const persisted = engine.persistSession();
  assert.equal(persisted, true);

  const recoveredEngine = createUniversalAIPersonalizationAdaptiveLearningEngine({ metadata: {} }, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.personalization.compat.test'
  });

  const recovered = recoveredEngine.recoverSession();
  assert.equal(recovered, true);
  assert.equal(recoveredEngine.snapshot().diagnostics.recoveries >= 1, true);

  const fallback = deserializeUniversalAIPersonalizationOutput('invalid-json');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');
});
