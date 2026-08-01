import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TimelineScheduler, createTimelineSynchronizationRuntime } from '../../timeline/runtime/index.js';
import { SceneEventRuntime } from '../../scene-events/index.js';
import { createAdaptiveTeachingRecoveryEngine } from './index.js';

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

function timelineFixture() {
  return {
    timelineId: 'adaptive-runtime-timeline',
    version: 'v2',
    tracks: [
      {
        id: 'track-1',
        name: 'Main',
        purpose: 'generic',
        enabled: true,
        priority: 1,
        clips: [{ id: 'clip-1', start: 0, end: 6000, duration: 6000, objects: [] }],
        events: [{ id: 'event-1', type: 'custom', time: 400, targets: ['clip-1'] }],
        markers: [{ id: 'marker-1', type: 'chapter', time: 0 }],
        dependencies: [],
        metadata: {}
      }
    ],
    clips: [{ id: 'clip-1', start: 0, end: 6000, duration: 6000, objects: [], actions: [], events: [], metadata: {} }],
    events: [{ id: 'event-1', type: 'custom', time: 400, targets: ['clip-1'], payload: {}, priority: 1 }],
    markers: [{ id: 'marker-1', type: 'chapter', time: 0, metadata: {} }],
    actions: [],
    segments: [],
    groups: [],
    dependencies: [],
    metadata: {}
  };
}

function narrationFixture() {
  return {
    segments: [
      {
        id: 'segment-1',
        index: 0,
        text: 'Learn base concept.',
        timestampMs: 0,
        durationMs: 2000,
        learningObjective: 'Understand the base concept.',
        difficulty: 'beginner',
        relatedSceneObjectIds: ['obj-1'],
        relatedTimeline: { clipId: 'clip-1', markerId: 'marker-1', eventIds: ['event-1'] },
        metadata: { cueIds: [] }
      },
      {
        id: 'segment-2',
        index: 1,
        text: 'Apply concept in practice.',
        timestampMs: 2000,
        durationMs: 2000,
        learningObjective: 'Apply concept.',
        difficulty: 'intermediate',
        relatedSceneObjectIds: ['obj-2'],
        relatedTimeline: { clipId: 'clip-1', markerId: 'marker-1', eventIds: ['event-1'] },
        metadata: { cueIds: [] }
      },
      {
        id: 'segment-3',
        index: 2,
        text: 'Analyze advanced scenario.',
        timestampMs: 4000,
        durationMs: 2000,
        learningObjective: 'Analyze advanced scenario.',
        difficulty: 'advanced',
        relatedSceneObjectIds: ['obj-3'],
        relatedTimeline: { clipId: 'clip-1', markerId: 'marker-1', eventIds: ['event-1'] },
        metadata: { cueIds: [] }
      }
    ],
    cues: { all: [] },
    summary: {
      segmentCount: 3,
      cueCount: 0,
      totalDurationMs: 6000
    }
  };
}

function createHarness(options = {}) {
  const adapter = options.persistenceAdapter || createMemoryAdapter();
  const timeline = timelineFixture();
  const scheduler = new TimelineScheduler(timeline, {
    startState: 'Ready',
    persistenceAdapter: adapter
  });

  const runtime = {
    sceneId: 'adaptive-scene',
    timelineScheduler: scheduler,
    metadata: {
      narration: narrationFixture(),
      timelineData: timeline,
      timeline: {
        timelineId: timeline.timelineId,
        version: timeline.version,
        trackIds: ['track-1'],
        clipIds: ['clip-1'],
        markerIds: ['marker-1'],
        eventIds: ['event-1']
      },
      rendererAdapter: {
        timeline: {}
      },
      aiTeacherAdapter: {
        timelineState: {}
      },
      interactionEngine: {
        timelineState: {}
      }
    },
    graph: {
      nodes: new Map([['adaptive-scene', {}], ['obj-1', {}], ['obj-2', {}], ['obj-3', {}]]),
      edges: [{ from: 'adaptive-scene', relation: 'Contains', to: 'obj-1' }],
      getNodeCount() {
        return 4;
      },
      getRelationshipCount() {
        return 1;
      }
    },
    registry: {
      find() {
        return null;
      }
    }
  };

  runtime.sceneEventRuntime = new SceneEventRuntime(runtime);
  runtime.sceneEventSystem = runtime.sceneEventRuntime;

  const adaptive = createAdaptiveTeachingRecoveryEngine(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.persistenceKey || 'daksha.adaptive.learning.test'
  });

  runtime.adaptiveTeachingRuntime = adaptive;

  const timelineSync = createTimelineSynchronizationRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.timelineSyncKey || 'daksha.timeline.adaptive.sync-test'
  });

  runtime.timelineSynchronizationRuntime = timelineSync;

  return {
    runtime,
    scheduler,
    adaptive,
    timelineSync,
    adapter
  };
}

test('adaptive difficulty reduces complexity under learner struggle and increases support', () => {
  const harness = createHarness();
  const before = harness.adaptive.snapshot().adaptation.complexity;

  harness.adaptive.evaluate('struggle', {
    quizResults: [
      { questionId: 'q1', correct: false, responseTimeMs: 12000 },
      { questionId: 'q2', correct: false, responseTimeMs: 10000 }
    ],
    interactionHistory: [
      { action: 'skip-segment' },
      { action: 'repeat-section' },
      { action: 'repeat-section' }
    ]
  });

  const after = harness.adaptive.snapshot();
  assert.equal(after.metrics.struggleScore > 0, true);
  assert.equal(after.adaptation.complexity <= before, true);
  assert.equal(after.adaptation.recommendations.includes('use-easier-explanations'), true);
});

test('personalized pacing accelerates for strong performance and confidence', () => {
  const harness = createHarness();

  harness.adaptive.evaluate('strong-performance', {
    quizResults: [
      { questionId: 'q1', correct: true, responseTimeMs: 1800, score: 1 },
      { questionId: 'q2', correct: true, responseTimeMs: 1600, score: 1 }
    ],
    interactionHistory: []
  });

  const snapshot = harness.adaptive.snapshot();
  assert.equal(snapshot.metrics.confidenceScore > 0.7, true);
  assert.equal(snapshot.adaptation.pacing >= 1, true);
  assert.equal(snapshot.adaptation.recommendations.includes('accelerate-pacing'), true);
});

test('recovery after interruption persists and restores adaptive runtime state', () => {
  const adapter = createMemoryAdapter();

  const first = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.adaptive.learning.restore-test',
    timelineSyncKey: 'daksha.timeline.adaptive.restore-sync-test'
  });

  first.scheduler.seekByTime(2550);
  first.adaptive.markInterrupted('network-disconnect');
  first.adaptive.persistSession();

  const second = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.adaptive.learning.restore-test',
    timelineSyncKey: 'daksha.timeline.adaptive.restore-sync-test'
  });

  const recovered = second.adaptive.recoverSession();
  assert.equal(recovered, true);
  assert.equal(second.adaptive.snapshot().recovery.interrupted, true);
  assert.equal(second.adaptive.snapshot().timelineTimeMs, 2550);
});

test('checkpoint resume applies adaptive recovery plan and seeks timeline', () => {
  const harness = createHarness();

  harness.scheduler.seekByTime(3000);
  const checkpoint = harness.scheduler.createCheckpoint('revision', {
    source: 'test'
  });

  const before = harness.adaptive.snapshot().timelineTimeMs;
  harness.scheduler.seekByTime(100);
  harness.adaptive.resumeFromCheckpoint(checkpoint.id);

  const after = harness.adaptive.snapshot();
  assert.equal(after.timelineTimeMs >= before, true);
  assert.equal(after.recovery.checkpointId, checkpoint.id);
});

test('incorrect answer handling increments mistakes and adds review recommendations', () => {
  const harness = createHarness();

  harness.adaptive.recordQuizResult({
    questionId: 'q-incorrect-1',
    correct: false,
    responseTimeMs: 9000,
    score: 0
  });

  const snapshot = harness.adaptive.snapshot();
  assert.equal(snapshot.metrics.mistakes >= 1, true);
  assert.equal(snapshot.adaptation.recommendations.includes('review-core-concepts'), true);
});

test('repeated mistakes are detected and targeted for revision', () => {
  const harness = createHarness();

  harness.adaptive.evaluate('repeated-mistakes', {
    quizResults: [
      { conceptId: 'concept-a', correct: false, responseTimeMs: 8000 },
      { conceptId: 'concept-a', correct: false, responseTimeMs: 7600 },
      { conceptId: 'concept-b', correct: true, responseTimeMs: 2000 }
    ]
  });

  const snapshot = harness.adaptive.snapshot();
  assert.equal(snapshot.metrics.repeatedMistakes.length >= 1, true);
  assert.equal(snapshot.adaptation.recommendations.includes('target-repeat-mistakes'), true);
});

test('skipped lessons produce recovery guidance', () => {
  const harness = createHarness();

  harness.adaptive.evaluate('skipped-content', {
    interactionHistory: [
      { action: 'skip-segment' },
      { action: 'skip-chapter' },
      { action: 'skip-practice' }
    ]
  });

  const snapshot = harness.adaptive.snapshot();
  assert.equal(snapshot.metrics.skippedCount >= 2, true);
  assert.equal(snapshot.adaptation.recommendations.includes('recover-skipped-lesson-segments'), true);
});

test('unknown learning modes are supported without code changes', () => {
  const harness = createHarness();
  harness.adaptive.setLearningMode('hyper-personalized-lab-mode');

  const snapshot = harness.adaptive.snapshot();
  assert.equal(snapshot.modeProfile.mode, 'hyper-personalized-lab-mode');
  assert.equal(snapshot.modeProfile.knownMode, false);
});

test('adaptive runtime updates timeline synchronization shared state handoff', () => {
  const harness = createHarness();

  harness.adaptive.evaluate('shared-handoff', {
    quizResults: [{ questionId: 'q1', correct: true, responseTimeMs: 2000 }]
  });

  const shared = harness.timelineSync.synchronize('adaptive-handoff-check');
  assert.ok(shared.adaptiveLearning);
  assert.equal(typeof shared.adapters.aiTeacher.adaptiveLearningState.modeProfile.mode, 'string');
});

test('question generation includes comprehension practice recap challenge and revision checkpoints', () => {
  const harness = createHarness();
  const questions = harness.adaptive.snapshot().questions;

  assert.equal(Array.isArray(questions.comprehensionQuestions), true);
  assert.equal(Array.isArray(questions.practiceQuestions), true);
  assert.equal(Array.isArray(questions.recapQuestions), true);
  assert.equal(Array.isArray(questions.challengeQuestions), true);
  assert.equal(Array.isArray(questions.revisionCheckpoints), true);
  assert.equal(questions.comprehensionQuestions.length >= 1, true);
});

test('implementation has no hardcoded subject mapping patterns', () => {
  const source = fs.readFileSync(new URL('./AdaptiveTeachingRecoveryEngine.js', import.meta.url), 'utf8');
  const forbidden = /(if\s*\(\s*subject\s*===|switch\s*\(\s*subject|subjectMap|domainMap|topicMap|biology|physics|chemistry|left ventricle|atrium)/i;
  assert.equal(forbidden.test(source), false);
});
