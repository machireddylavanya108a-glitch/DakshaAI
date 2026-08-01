import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TimelineScheduler,
  createTimelineSynchronizationRuntime
} from '../../timeline/runtime/index.js';
import { SceneEventRuntime } from '../../scene-events/index.js';
import { createAdaptiveTeachingRecoveryEngine } from '../../adaptive-learning/index.js';
import { createUniversalAITeacherEngine } from '../../ai-teacher/index.js';
import {
  createUniversalQuizAdaptiveAssessmentEngine,
  runUniversalQuizAdaptiveAssessmentEngine,
  validateUniversalAssessmentOutput,
  serializeUniversalAssessmentOutput,
  deserializeUniversalAssessmentOutput,
  migrateUniversalAssessmentOutput
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
    timelineId: 'assessment-timeline',
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
      { id: 'clip-1', start: 0, end: 1000, duration: 1000, objects: [], actions: [], events: [], metadata: { title: 'Overview' } },
      { id: 'clip-2', start: 1000, end: 2000, duration: 1000, objects: [], actions: [], events: [], metadata: { title: 'Practice' } },
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

function createHarness(options = {}) {
  const adapter = options.persistenceAdapter || createMemoryAdapter();
  const timeline = buildTimelineFixture();
  const scheduler = new TimelineScheduler(timeline, {
    startState: 'Ready',
    persistenceAdapter: adapter
  });

  const runtime = {
    sceneId: 'assessment-scene',
    timelineScheduler: scheduler,
    metadata: {
      title: 'Universal Assessment Lesson',
      language: 'English',
      subject: 'Open Domain',
      lessonGraph: {
        schemaVersion: 'v1',
        lessonId: 'lesson-assessment-1',
        title: 'Universal Assessment Lesson',
        language: 'English',
        learningObjectives: ['Understand concepts', 'Apply concepts'],
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
        learningObjective: 'Master concept understanding',
        confidenceScore: 0.66,
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
        confidenceScore: 0.62
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
        ['assessment-scene', {}],
        ['obj-1', {}],
        ['obj-2', {}]
      ]),
      edges: [{ from: 'assessment-scene', relation: 'Contains', to: 'obj-1' }],
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
    persistenceKey: options.adaptiveKey || 'daksha.assessment.adaptive.test'
  });

  runtime.timelineSynchronizationRuntime = createTimelineSynchronizationRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.timelineKey || 'daksha.assessment.timeline.sync.test'
  });

  runtime.aiTeacherRuntime = createUniversalAITeacherEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.teacherKey || 'daksha.assessment.teacher.test'
  });
  runtime.aiTeacherRuntime.synchronize('test');

  const assessmentRuntime = createUniversalQuizAdaptiveAssessmentEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.assessmentKey || 'daksha.assessment.runtime.test'
  });
  runtime.assessmentRuntime = assessmentRuntime;

  return {
    runtime,
    scheduler,
    assessmentRuntime,
    adapter
  };
}

test('adaptive quizzes generate expected universal output contract', () => {
  const harness = createHarness();

  const result = harness.assessmentRuntime.generate({
    userLearningProfile: {
      learningLevel: 'intermediate',
      modes: ['practice-mode'],
      confidence: 0.65,
      weakConcepts: ['Concept B']
    },
    progressState: {
      progressPercent: 40,
      responseSpeed: 0.62,
      accuracy: 0.58,
      mistakes: 2,
      previousAttempts: 1,
      weakConcepts: ['Concept B']
    }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(Array.isArray(result.output.questionBank), true);
  assert.equal(result.output.questionBank.length > 0, true);
  assert.equal(Array.isArray(result.output.weakAreaMap), true);
  assert.equal(typeof result.output.masteryScore, 'number');
  assert.equal(typeof result.output.completionScore, 'number');
  assert.equal(typeof result.output.learningConfidence, 'number');
});

test('adaptive difficulty adjusts across beginner to expert conditions', () => {
  const harness = createHarness();

  const low = harness.assessmentRuntime.generate({
    userLearningProfile: {
      learningLevel: 'beginner',
      modes: ['revision-mode'],
      confidence: 0.3
    },
    progressState: {
      progressPercent: 22,
      responseSpeed: 0.3,
      accuracy: 0.35,
      mistakes: 5,
      previousAttempts: 4
    }
  });

  const high = harness.assessmentRuntime.generate({
    userLearningProfile: {
      learningLevel: 'expert',
      modes: ['exam-mode'],
      confidence: 0.9
    },
    progressState: {
      progressPercent: 90,
      responseSpeed: 0.9,
      accuracy: 0.92,
      mistakes: 0,
      previousAttempts: 0
    }
  });

  assert.equal(['beginner', 'intermediate'].includes(low.output.adaptiveDifficultyPlan.level), true);
  assert.equal(['advanced', 'expert'].includes(high.output.adaptiveDifficultyPlan.level), true);
});

test('weak area detection and personalized feedback are generated', () => {
  const harness = createHarness();

  const result = harness.assessmentRuntime.generate({
    userLearningProfile: {
      learningLevel: 'advanced',
      modes: ['practice-mode'],
      weakConcepts: ['Concept B', 'Concept C']
    },
    progressState: {
      progressPercent: 55,
      responseSpeed: 0.5,
      accuracy: 0.52,
      mistakes: 3,
      previousAttempts: 2,
      weakConcepts: ['Concept C']
    }
  });

  assert.equal(result.output.weakAreaMap.length > 0, true);
  assert.equal(result.output.feedbackPlan.instantFeedback.length > 0, true);
  assert.equal(result.output.feedbackPlan.explanations.length > 0, true);
  assert.equal(typeof result.output.feedbackPlan.retryStrategy.maxRetries, 'number');
  assert.equal(result.output.personalizedRevisionPlan.steps.length > 0, true);
});

test('mastery scoring and knowledge gaps remain consistent', () => {
  const harness = createHarness();

  const result = harness.assessmentRuntime.generate({
    userLearningProfile: {
      learningLevel: 'intermediate',
      modes: ['interview-mode'],
      confidence: 0.7
    },
    progressState: {
      progressPercent: 68,
      responseSpeed: 0.74,
      accuracy: 0.76,
      mistakes: 1,
      previousAttempts: 1,
      weakConcepts: ['Concept A']
    }
  });

  assert.equal(result.output.masteryScore >= 0 && result.output.masteryScore <= 1, true);
  assert.equal(result.output.completionScore >= 0 && result.output.completionScore <= 1, true);
  assert.equal(result.output.learningConfidence >= 0 && result.output.learningConfidence <= 1, true);
  assert.equal(Array.isArray(result.output.knowledgeGaps), true);
  assert.equal(typeof result.output.recommendedNextLesson, 'string');
});

test('multilingual quizzes and unknown future assessment types work without code changes', () => {
  const harness = createHarness();

  const result = harness.assessmentRuntime.generate({
    userLearningProfile: {
      learningLevel: 'advanced',
      modes: ['future-holo-evaluation-mode', 'revision-mode'],
      language: 'Spanish',
      confidence: 0.75
    },
    questionTypes: ['mcq', 'future-immersive-assessment'],
    progressState: {
      progressPercent: 71,
      responseSpeed: 0.72,
      accuracy: 0.7,
      mistakes: 1,
      previousAttempts: 1
    }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.language, 'Spanish');
  assert.equal(result.output.mode, 'future-holo-evaluation-mode');
  assert.equal(result.output.diagnostics.unknownAssessmentModes.includes('future-holo-evaluation-mode'), true);
  assert.equal(result.output.diagnostics.unknownQuestionTypes.includes('future-immersive-assessment'), true);
});

test('interruption recovery and lesson resume persist assessment state', () => {
  const harness = createHarness({
    assessmentKey: 'daksha.assessment.interrupt.test',
    timelineKey: 'daksha.assessment.interrupt.timeline.test',
    teacherKey: 'daksha.assessment.interrupt.teacher.test'
  });

  harness.scheduler.seekByTime(1450);
  harness.assessmentRuntime.generate({
    progressState: {
      progressPercent: 58,
      checkpointId: 'checkpoint-1',
      responseSpeed: 0.6,
      accuracy: 0.61,
      mistakes: 2,
      previousAttempts: 2
    }
  });

  const interrupted = harness.assessmentRuntime.markInterrupted('network-disconnect');
  assert.equal(interrupted, true);
  harness.assessmentRuntime.persistSession();

  const restored = createHarness({
    persistenceAdapter: harness.adapter,
    assessmentKey: 'daksha.assessment.interrupt.test',
    timelineKey: 'daksha.assessment.interrupt.timeline.test',
    teacherKey: 'daksha.assessment.interrupt.teacher.test'
  });

  const recovered = restored.assessmentRuntime.recoverSession();
  assert.equal(recovered, true);
  assert.equal(restored.assessmentRuntime.snapshot().recovery.interrupted, true);

  const resumed = restored.assessmentRuntime.resumeFromCheckpoint('checkpoint-1');
  assert.equal(resumed.status, 'Ready');
  assert.equal(restored.assessmentRuntime.snapshot().recovery.interrupted, false);
});

test('serialization, migration, backward compatibility, and runner function are valid', () => {
  const harness = createHarness();

  const result = harness.assessmentRuntime.generate({
    userLearningProfile: {
      learningLevel: 'expert',
      modes: ['certification-mode']
    },
    progressState: {
      progressPercent: 88,
      responseSpeed: 0.85,
      accuracy: 0.89,
      mistakes: 0,
      previousAttempts: 0
    }
  });

  const validation = validateUniversalAssessmentOutput(result.output);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalAssessmentOutput(result.output);
  const restored = deserializeUniversalAssessmentOutput(serialized);
  assert.equal(restored.validation.valid, true);

  const migrated = migrateUniversalAssessmentOutput({
    id: 'legacy-assessment-id',
    lessonTitle: 'Legacy Assessment',
    mode: 'practice-mode',
    level: 'beginner',
    questions: [{ id: 'q1', type: 'mcq' }],
    masteryScore: 0.5,
    completionScore: 0.45,
    learningConfidence: 0.4,
    recommendedNextLesson: 'Revise fundamentals'
  });
  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.lessonId, 'legacy-assessment-id');

  const fallback = deserializeUniversalAssessmentOutput('bad-json');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');

  const quickRun = runUniversalQuizAdaptiveAssessmentEngine(harness.runtime, {
    userLearningProfile: {
      learningLevel: 'advanced',
      modes: ['exam-mode']
    }
  }, {
    persistenceAdapter: harness.adapter,
    persistenceKey: 'daksha.assessment.quick-run'
  });
  assert.equal(quickRun.validation.valid, true);
});
