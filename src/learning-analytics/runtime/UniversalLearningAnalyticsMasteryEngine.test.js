import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TimelineScheduler,
  createTimelineSynchronizationRuntime
} from '../../timeline/runtime/index.js';
import { SceneEventRuntime } from '../../scene-events/index.js';
import { createAdaptiveTeachingRecoveryEngine } from '../../adaptive-learning/index.js';
import { createUniversalAITeacherEngine } from '../../ai-teacher/index.js';
import { createUniversalQuizAdaptiveAssessmentEngine } from '../../assessment-engine/index.js';
import {
  createUniversalLearningAnalyticsMasteryEngine,
  runUniversalLearningAnalyticsMasteryEngine,
  validateUniversalLearningAnalyticsOutput,
  serializeUniversalLearningAnalyticsOutput,
  deserializeUniversalLearningAnalyticsOutput,
  migrateUniversalLearningAnalyticsOutput
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
    timelineId: 'learning-analytics-timeline',
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

function createSessionHistory() {
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  return [
    {
      sessionId: 's1',
      date: now - (2 * day),
      durationMinutes: 35,
      active: true,
      confidence: 0.58,
      engagement: 0.64,
      retention: 0.59,
      conceptsCovered: ['Concept A', 'Concept B'],
      completedItems: 2,
      revisionCount: 1
    },
    {
      sessionId: 's2',
      date: now - day,
      durationMinutes: 42,
      active: true,
      confidence: 0.63,
      engagement: 0.7,
      retention: 0.65,
      conceptsCovered: ['Concept B', 'Concept C'],
      completedItems: 3,
      revisionCount: 1
    },
    {
      sessionId: 's3',
      date: now,
      durationMinutes: 28,
      active: true,
      confidence: 0.69,
      engagement: 0.72,
      retention: 0.68,
      conceptsCovered: ['Concept A', 'Concept C'],
      completedItems: 2,
      revisionCount: 0
    }
  ];
}

function createHarness(options = {}) {
  const adapter = options.persistenceAdapter || createMemoryAdapter();
  const timeline = buildTimelineFixture();
  const scheduler = new TimelineScheduler(timeline, {
    startState: 'Ready',
    persistenceAdapter: adapter
  });

  const runtime = {
    sceneId: 'learning-analytics-scene',
    timelineScheduler: scheduler,
    metadata: {
      title: 'Universal Learning Analytics Lesson',
      language: 'English',
      subject: 'Open Domain',
      lessonGraph: {
        schemaVersion: 'v1',
        lessonId: 'lesson-learning-analytics-1',
        title: 'Universal Learning Analytics Lesson',
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
          nodes: [
            { id: 'n1', kind: 'concept', label: 'Concept A' },
            { id: 'n2', kind: 'concept', label: 'Concept B' },
            { id: 'n3', kind: 'concept', label: 'Concept C' }
          ],
          edges: [
            { from: 'n1', to: 'n2', type: 'relates-to' },
            { from: 'n2', to: 'n3', type: 'relates-to' }
          ]
        }
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
      assessmentAdapter: {
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
        ['learning-analytics-scene', {}],
        ['obj-1', {}],
        ['obj-2', {}]
      ]),
      edges: [{ from: 'learning-analytics-scene', relation: 'Contains', to: 'obj-1' }],
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
    persistenceKey: options.adaptiveKey || 'daksha.learning.analytics.adaptive.test'
  });

  runtime.timelineSynchronizationRuntime = createTimelineSynchronizationRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.timelineKey || 'daksha.learning.analytics.timeline.sync.test'
  });

  runtime.aiTeacherRuntime = createUniversalAITeacherEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.teacherKey || 'daksha.learning.analytics.teacher.test'
  });
  runtime.aiTeacherRuntime.synchronize('test');

  runtime.assessmentRuntime = createUniversalQuizAdaptiveAssessmentEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.assessmentKey || 'daksha.learning.analytics.assessment.test'
  });
  runtime.assessmentRuntime.synchronize('test');

  const analyticsRuntime = createUniversalLearningAnalyticsMasteryEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.analyticsKey || 'daksha.learning.analytics.runtime.test'
  });
  runtime.learningAnalyticsRuntime = analyticsRuntime;

  return {
    runtime,
    scheduler,
    analyticsRuntime,
    adapter
  };
}

test('progress tracking computes universal learning progress and dashboards', () => {
  const harness = createHarness();

  const result = harness.analyticsRuntime.generate({
    userLearningProfile: {
      learningLevel: 'intermediate',
      confidence: 0.66,
      weakConcepts: ['Concept B']
    },
    sessionHistory: createSessionHistory()
  });

  assert.equal(result.validation.valid, true);
  assert.equal(typeof result.output.learningProgress.lessonCompletion, 'number');
  assert.equal(typeof result.output.learningProgress.chapterCompletion, 'number');
  assert.equal(typeof result.output.learningProgress.topicCompletion, 'number');
  assert.equal(typeof result.output.learningProgress.conceptMastery, 'number');
  assert.equal(typeof result.output.masteryScore, 'number');
  assert.equal(Array.isArray(result.output.conceptCoverage), true);
  assert.equal(typeof result.output.dashboards.learner, 'object');
  assert.equal(typeof result.output.dashboards.teacher, 'object');
  assert.equal(typeof result.output.dashboards.parent, 'object');
  assert.equal(typeof result.output.dashboards.administrator, 'object');
});

test('mastery calculation and recommendations adapt with weak areas', () => {
  const harness = createHarness();

  const result = harness.analyticsRuntime.generate({
    userLearningProfile: {
      learningLevel: 'beginner',
      confidence: 0.4,
      weakConcepts: ['Concept B', 'Concept C'],
      learningGoals: ['Improve practical application']
    },
    assessmentResults: {
      masteryScore: 0.42,
      completionScore: 0.53,
      learningConfidence: 0.45,
      questionBank: [{ id: 'q1', concept: 'Concept B', type: 'mcq' }],
      weakAreaMap: [{ concept: 'Concept B', weaknessScore: 0.82, status: 'weak' }],
      knowledgeGaps: [{ concept: 'Concept C', severity: 'weak', gapScore: 0.78 }]
    },
    sessionHistory: createSessionHistory()
  });

  assert.equal(result.output.masteryScore >= 0 && result.output.masteryScore <= 1, true);
  assert.equal(result.output.weakAreas.length > 0, true);
  assert.equal(result.output.personalizedRecommendations.length > 0, true);
  assert.equal(typeof result.output.adaptiveAnalytics.pacing, 'string');
  assert.equal(typeof result.output.adaptiveAnalytics.difficulty, 'string');
});

test('streak tracking and confidence trend are generated', () => {
  const harness = createHarness();

  const result = harness.analyticsRuntime.generate({
    sessionHistory: createSessionHistory(),
    userLearningProfile: {
      learningLevel: 'advanced',
      confidence: 0.71
    }
  });

  assert.equal(result.output.learningProgress.learningStreak >= 1, true);
  assert.equal(Array.isArray(result.output.confidenceTrend.points), true);
  assert.equal(typeof result.output.confidenceTrend.trend, 'string');
});

test('multi-device sync and offline sync are preserved', () => {
  const harness = createHarness();

  harness.analyticsRuntime.synchronizeDevice('device-A', {
    checkpoint: 'cp-1',
    masteryScore: 0.62
  });

  harness.analyticsRuntime.synchronizeOffline([
    { id: 'offline-1', type: 'progress-update', payload: { delta: 0.05 } },
    { id: 'offline-2', type: 'interaction-cache', payload: { count: 3 } }
  ]);

  const result = harness.analyticsRuntime.generate({
    sessionHistory: createSessionHistory()
  });

  assert.equal(result.output.synchronization.multiDeviceSynchronization.deviceCount >= 1, true);
  assert.equal(result.output.synchronization.offlineSynchronization.pendingOperations >= 2, true);
});

test('unknown future analytics metrics and audiences remain supported without code changes', () => {
  const harness = createHarness();

  const result = harness.analyticsRuntime.generate({
    sessionHistory: createSessionHistory(),
    analyticsWindows: ['daily', 'future-rolling-window-9d'],
    dashboardAudiences: ['learner', 'future-coach-console'],
    analyticsMetrics: {
      emergentMetricAlpha: 0.91,
      emergentSignalBundle: {
        precision: 0.77,
        volatility: 0.22
      }
    }
  });

  assert.equal(result.validation.valid, true);
  assert.equal(result.output.analyticsWindows.includes('future-rolling-window-9d'), true);
  assert.equal(typeof result.output.dashboards['future-coach-console'], 'object');
  assert.equal(result.output.futureMetrics.emergentMetricAlpha, 0.91);
});

test('interruption recovery, migration, serializer, and runner are backward compatible', () => {
  const harness = createHarness({
    analyticsKey: 'daksha.learning.analytics.interrupt.test',
    timelineKey: 'daksha.learning.analytics.interrupt.timeline.test',
    teacherKey: 'daksha.learning.analytics.interrupt.teacher.test',
    assessmentKey: 'daksha.learning.analytics.interrupt.assessment.test'
  });

  harness.scheduler.seekByTime(1320);
  const generated = harness.analyticsRuntime.generate({
    sessionHistory: createSessionHistory(),
    sessionId: 'session-before-interrupt'
  });
  assert.equal(generated.validation.valid, true);

  const interrupted = harness.analyticsRuntime.markInterrupted('network-disconnect');
  assert.equal(interrupted, true);
  harness.analyticsRuntime.persistSession();

  const restoredHarness = createHarness({
    persistenceAdapter: harness.adapter,
    analyticsKey: 'daksha.learning.analytics.interrupt.test',
    timelineKey: 'daksha.learning.analytics.interrupt.timeline.test',
    teacherKey: 'daksha.learning.analytics.interrupt.teacher.test',
    assessmentKey: 'daksha.learning.analytics.interrupt.assessment.test'
  });

  const recovered = restoredHarness.analyticsRuntime.recoverSession();
  assert.equal(recovered, true);
  assert.equal(restoredHarness.analyticsRuntime.snapshot().recovery.interrupted, true);

  const resumed = restoredHarness.analyticsRuntime.resumeFromCheckpoint('checkpoint-1');
  assert.equal(resumed.status, 'Ready');
  assert.equal(restoredHarness.analyticsRuntime.snapshot().recovery.interrupted, false);

  const validation = validateUniversalLearningAnalyticsOutput(generated.output);
  assert.equal(validation.valid, true);

  const serialized = serializeUniversalLearningAnalyticsOutput(generated.output);
  const deserialized = deserializeUniversalLearningAnalyticsOutput(serialized);
  assert.equal(deserialized.validation.valid, true);

  const migrated = migrateUniversalLearningAnalyticsOutput({
    id: 'legacy-learning-analytics-id',
    lessonTitle: 'Legacy Analytics',
    completionScore: 0.55,
    masteryScore: 0.52,
    learningConfidence: 0.57,
    engagement: 0.61,
    retentionPrediction: 0.58,
    weakAreas: [{ concept: 'Legacy Concept', weaknessScore: 0.7 }]
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.lessonId, 'legacy-learning-analytics-id');

  const fallback = deserializeUniversalLearningAnalyticsOutput('bad-json');
  assert.equal(fallback.validation.valid, false);
  assert.equal(fallback.validation.status, 'fallback');

  const quickRun = runUniversalLearningAnalyticsMasteryEngine(harness.runtime, {
    userLearningProfile: {
      learningLevel: 'advanced',
      confidence: 0.76
    },
    sessionHistory: createSessionHistory()
  }, {
    persistenceAdapter: harness.adapter,
    persistenceKey: 'daksha.learning.analytics.quick-run'
  });

  assert.equal(quickRun.validation.valid, true);
});
