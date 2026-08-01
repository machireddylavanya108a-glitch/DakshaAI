import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TimelineScheduler,
  createTimelineSynchronizationRuntime
} from '../../timeline/runtime/index.js';
import { SceneEventRuntime } from '../../scene-events/index.js';
import { createAdaptiveTeachingRecoveryEngine } from '../../adaptive-learning/index.js';
import {
  createUniversalAITeacherEngine,
  runUniversalAITeacherEngine,
  validateUniversalAITeacherPlan,
  serializeUniversalAITeacherPlan,
  deserializeUniversalAITeacherPlan,
  migrateUniversalAITeacherPlan
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

function buildTimelineFixture() {
  return {
    timelineId: 'ai-teacher-timeline',
    version: 'v2',
    tracks: [
      {
        id: 'track-1',
        name: 'Main',
        purpose: 'generic',
        enabled: true,
        priority: 1,
        clips: [
          { id: 'clip-1', start: 0, end: 1000, duration: 1000, objects: [] },
          { id: 'clip-2', start: 1000, end: 2000, duration: 1000, objects: [] },
          { id: 'clip-3', start: 2000, end: 3000, duration: 1000, objects: [] }
        ],
        events: [
          { id: 'event-1', type: 'custom', time: 500, targets: ['clip-1'] },
          { id: 'event-2', type: 'custom', time: 1500, targets: ['clip-2'] }
        ],
        markers: [{ id: 'marker-1', type: 'chapter', time: 0 }],
        dependencies: [],
        metadata: {}
      }
    ],
    clips: [
      { id: 'clip-1', start: 0, end: 1000, duration: 1000, objects: [], actions: [], events: [], metadata: { title: 'Intro' } },
      { id: 'clip-2', start: 1000, end: 2000, duration: 1000, objects: [], actions: [], events: [], metadata: { title: 'Guided Practice' } },
      { id: 'clip-3', start: 2000, end: 3000, duration: 1000, objects: [], actions: [], events: [], metadata: { title: 'Assessment' } }
    ],
    events: [
      { id: 'event-1', type: 'custom', time: 500, targets: ['clip-1'], payload: {}, priority: 1 },
      { id: 'event-2', type: 'custom', time: 1500, targets: ['clip-2'], payload: {}, priority: 1 }
    ],
    markers: [{ id: 'marker-1', type: 'chapter', time: 0, metadata: {} }],
    actions: [],
    segments: [],
    groups: [],
    dependencies: [],
    metadata: {}
  };
}

function buildRuntimeHarness(options = {}) {
  const adapter = options.persistenceAdapter || createMemoryAdapter();
  const timeline = buildTimelineFixture();
  const scheduler = new TimelineScheduler(timeline, {
    startState: 'Ready',
    persistenceAdapter: adapter
  });

  const runtime = {
    sceneId: 'ai-teacher-scene',
    timelineScheduler: scheduler,
    metadata: {
      title: 'Universal AI Teacher Lesson',
      language: 'English',
      subject: 'Open Domain',
      lessonGraph: {
        schemaVersion: 'v1',
        lessonId: 'lesson-1',
        title: 'Universal AI Teacher Lesson',
        language: 'English',
        learningObjectives: ['Understand foundations', 'Apply knowledge'],
        keyConcepts: ['Concept A', 'Concept B', 'Concept C'],
        timelineSteps: [
          { id: 'step-1', title: 'Concept A', order: 1, startMs: 0, endMs: 1000, durationMs: 1000 },
          { id: 'step-2', title: 'Concept B', order: 2, startMs: 1000, endMs: 2000, durationMs: 1000 },
          { id: 'step-3', title: 'Concept C', order: 3, startMs: 2000, endMs: 3000, durationMs: 1000 }
        ],
        educationalObjects: [
          { id: 'obj-1', name: 'Object 1', type: 'concept-node', metadata: {} },
          { id: 'obj-2', name: 'Object 2', type: 'concept-node', metadata: {} }
        ],
        lessonGraph: {
          nodes: [],
          edges: []
        }
      },
      intentProfile: {
        learningObjective: 'Master the concepts',
        confidenceScore: 0.68,
        language: 'English',
        knowledgeDomain: 'General Learning'
      },
      visualizationStrategy: {
        primaryStrategy: {
          visualizationStyle: 'adaptive visualization',
          interactionLevel: 'guided',
          sceneComplexity: 'medium',
          animationIntensity: 'medium',
          narrationStrategy: 'concept-first narration'
        },
        confidenceScore: 0.66
      },
      timeline: {
        timelineId: timeline.timelineId,
        version: timeline.version,
        trackIds: ['track-1'],
        clipIds: ['clip-1', 'clip-2', 'clip-3'],
        markerIds: ['marker-1'],
        eventIds: ['event-1', 'event-2']
      },
      timelineData: timeline,
      aiTeacherAdapter: {
        timelineState: {}
      },
      rendererAdapter: {
        timeline: {}
      },
      interactionEngine: {
        timelineState: {}
      }
    },
    graph: {
      nodes: new Map([
        ['ai-teacher-scene', {}],
        ['obj-1', {}],
        ['obj-2', {}]
      ]),
      edges: [{ from: 'ai-teacher-scene', relation: 'Contains', to: 'obj-1' }],
      toJSON() {
        return {
          nodes: [
            { id: 'obj-1', kind: 'Object', metadata: { sourceKey: 'objects' }, properties: { name: 'Object 1' } },
            { id: 'obj-2', kind: 'Object', metadata: { sourceKey: 'objects' }, properties: { name: 'Object 2' } }
          ],
          edges: [{ from: 'obj-1', to: 'obj-2', type: 'relates-to' }]
        };
      },
      getNodeCount() {
        return 3;
      },
      getRelationshipCount() {
        return 1;
      }
    }
  };

  runtime.sceneEventRuntime = new SceneEventRuntime(runtime);
  runtime.sceneEventSystem = runtime.sceneEventRuntime;

  runtime.adaptiveTeachingRuntime = createAdaptiveTeachingRecoveryEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.adaptivePersistenceKey || 'daksha.ai.teacher.adaptive.test'
  });

  runtime.timelineSynchronizationRuntime = createTimelineSynchronizationRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.timelinePersistenceKey || 'daksha.ai.teacher.timeline.sync.test'
  });

  const aiTeacherRuntime = createUniversalAITeacherEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.teacherPersistenceKey || 'daksha.ai.teacher.runtime.test'
  });

  runtime.aiTeacherRuntime = aiTeacherRuntime;

  return {
    adapter,
    runtime,
    scheduler,
    aiTeacherRuntime
  };
}

test('adaptive teaching produces universal output contract across beginner/intermediate/advanced/expert', () => {
  const harness = buildRuntimeHarness();
  const levels = ['beginner', 'intermediate', 'advanced', 'expert'];

  levels.forEach((level) => {
    const result = harness.aiTeacherRuntime.createPlan({
      userLearningProfile: {
        learningLevel: level,
        learnerModes: ['visual-learners', 'practical-learners'],
        language: 'English'
      },
      progressState: {
        progressPercent: 42,
        completedUnits: 2,
        totalUnits: 5
      }
    });

    assert.equal(result.validation.valid, true);
    assert.equal(Array.isArray(result.teachingPlan.narrationSegments), true);
    assert.equal(Array.isArray(result.teachingPlan.explanationSteps), true);
    assert.equal(Array.isArray(result.teachingPlan.teachingCues), true);
    assert.equal(Array.isArray(result.teachingPlan.visualizationCues), true);
    assert.equal(Array.isArray(result.teachingPlan.interactionCues), true);
    assert.equal(Array.isArray(result.teachingPlan.practicePrompts), true);
    assert.equal(Array.isArray(result.teachingPlan.quizTriggers), true);
    assert.equal(Array.isArray(result.teachingPlan.reflectionPrompts), true);
    assert.equal(Array.isArray(result.teachingPlan.checkpoints), true);
    assert.equal(Array.isArray(result.teachingPlan.revisionPrompts), true);
    assert.equal(result.teachingPlan.learningLevel, level);
  });
});

test('interruption recovery and lesson resume work through runtime graph events', () => {
  const harness = buildRuntimeHarness({
    teacherPersistenceKey: 'daksha.ai.teacher.interruption.test',
    timelinePersistenceKey: 'daksha.ai.teacher.interruption.timeline.test'
  });

  harness.scheduler.seekByTime(1330);
  const firstPlan = harness.aiTeacherRuntime.createPlan({
    progressState: {
      progressPercent: 50,
      checkpointId: 'checkpoint-1',
      resumeTimeMs: 1330
    }
  });

  assert.equal(firstPlan.validation.valid, true);

  const interrupted = harness.aiTeacherRuntime.markInterrupted('network-interruption');
  assert.equal(interrupted, true);

  harness.aiTeacherRuntime.persistSession();

  const restoredHarness = buildRuntimeHarness({
    persistenceAdapter: harness.adapter,
    teacherPersistenceKey: 'daksha.ai.teacher.interruption.test',
    timelinePersistenceKey: 'daksha.ai.teacher.interruption.timeline.test'
  });

  const recovered = restoredHarness.aiTeacherRuntime.recoverSession();
  assert.equal(recovered, true);
  assert.equal(restoredHarness.aiTeacherRuntime.snapshot().recovery.interrupted, true);

  const resumed = restoredHarness.aiTeacherRuntime.resumeFromCheckpoint('checkpoint-1');
  assert.equal(resumed.status, 'Ready');
  assert.equal(restoredHarness.aiTeacherRuntime.snapshot().recovery.interrupted, false);
});

test('multilingual teaching and future teaching styles remain compatible without code changes', () => {
  const harness = buildRuntimeHarness();

  const result = harness.aiTeacherRuntime.createPlan({
    learningIntent: {
      language: 'Spanish',
      learningObjective: 'Comprender los conceptos'
    },
    userLearningProfile: {
      learningLevel: 'advanced',
      learnerModes: ['future-hybrid-mentoring-mode', 'interview-mode'],
      language: 'Spanish'
    },
    progressState: {
      progressPercent: 78,
      completedUnits: 4,
      totalUnits: 5,
      mistakes: 1
    }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.teachingPlan.language, 'Spanish');
  assert.equal(result.teachingPlan.learnerModes.includes('future-hybrid-mentoring-mode'), true);
  assert.equal(result.teachingPlan.diagnostics.unknownLearnerModes.includes('future-hybrid-mentoring-mode'), true);
});

test('serialization migration and backward compatibility for universal AI teacher plans', () => {
  const harness = buildRuntimeHarness();
  const generated = harness.aiTeacherRuntime.createPlan({
    userLearningProfile: {
      learningLevel: 'intermediate',
      learnerModes: ['exam-mode'],
      language: 'English'
    }
  });

  const validation = validateUniversalAITeacherPlan(generated.teachingPlan);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalAITeacherPlan(generated.teachingPlan);
  const deserialized = deserializeUniversalAITeacherPlan(serialized);
  assert.equal(deserialized.validation.valid, true);

  const migrated = migrateUniversalAITeacherPlan({
    id: 'legacy-plan-id',
    lessonTitle: 'Legacy Plan',
    learningLevel: 'beginner',
    learnerModes: ['legacy-style-mode'],
    steps: [{ id: 'legacy-step', action: 'explain', title: 'Legacy concept' }],
    checkpoints: [{ id: 'legacy-checkpoint', order: 1 }]
  });
  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.lessonId, 'legacy-plan-id');

  const fallback = deserializeUniversalAITeacherPlan('invalid-json');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');

  const quickResult = runUniversalAITeacherEngine(harness.runtime, {
    userLearningProfile: {
      learningLevel: 'expert',
      learnerModes: ['fast-learners']
    }
  }, {
    persistenceAdapter: harness.adapter,
    persistenceKey: 'daksha.ai.teacher.quick-run'
  });

  assert.equal(quickResult.validation.valid, true);
});
