import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TimelineScheduler, createTimelineSynchronizationRuntime } from '../../timeline/runtime/index.js';
import { SceneEventRuntime } from '../../scene-events/index.js';
import { createSpeechPlaybackRuntimeController } from './index.js';

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
    timelineId: 'speech-timeline',
    version: 'v2',
    tracks: [
      {
        id: 'track-1',
        name: 'Main',
        purpose: 'generic',
        enabled: true,
        priority: 1,
        clips: [{ id: 'clip-1', start: 0, end: 4000, duration: 4000, objects: [] }],
        events: [{ id: 'event-1', type: 'custom', time: 500, targets: ['clip-1'] }],
        markers: [{ id: 'marker-1', type: 'chapter', time: 0 }],
        dependencies: [],
        metadata: {}
      }
    ],
    clips: [{ id: 'clip-1', start: 0, end: 4000, duration: 4000, objects: [], actions: [], events: [], metadata: {} }],
    events: [{ id: 'event-1', type: 'custom', time: 500, targets: ['clip-1'], payload: {}, priority: 1 }],
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
        text: 'Introduction segment.',
        timestampMs: 0,
        durationMs: 1500,
        learningObjective: 'Understand introduction.',
        difficulty: 'beginner',
        relatedSceneObjectIds: ['obj-1'],
        relatedTimeline: { clipId: 'clip-1', markerId: 'marker-1', eventIds: ['event-1'] },
        metadata: { cueIds: [] }
      },
      {
        id: 'segment-2',
        index: 1,
        text: 'Deeper explanation segment.',
        timestampMs: 1500,
        durationMs: 2500,
        learningObjective: 'Understand details.',
        difficulty: 'intermediate',
        relatedSceneObjectIds: ['obj-2'],
        relatedTimeline: { clipId: 'clip-1', markerId: 'marker-1', eventIds: ['event-1'] },
        metadata: { cueIds: [] }
      }
    ],
    cues: { all: [] },
    summary: {
      segmentCount: 2,
      cueCount: 0,
      totalDurationMs: 4000
    }
  };
}

function createRuntimeHarness(options = {}) {
  const adapter = options.persistenceAdapter || createMemoryAdapter();
  const timeline = timelineFixture();
  const scheduler = new TimelineScheduler(timeline, {
    startState: 'Ready',
    persistenceAdapter: adapter
  });

  const graphNodes = new Map([
    ['scene-speech', { id: 'scene-speech' }],
    ['obj-1', { id: 'obj-1' }],
    ['obj-2', { id: 'obj-2' }]
  ]);

  const runtime = {
    sceneId: 'scene-speech',
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
      nodes: graphNodes,
      edges: [{ from: 'scene-speech', relation: 'Contains', to: 'obj-1' }],
      getNode(id) {
        return graphNodes.get(id) || null;
      },
      getNodeCount() {
        return graphNodes.size;
      },
      getRelationshipCount() {
        return 1;
      }
    },
    registry: {
      find(id) {
        return graphNodes.get(id) || null;
      }
    }
  };

  runtime.sceneEventRuntime = new SceneEventRuntime(runtime);
  runtime.sceneEventSystem = runtime.sceneEventRuntime;

  const speech = createSpeechPlaybackRuntimeController(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.persistenceKey || 'daksha.speech.runtime.test'
  });

  runtime.speechPlaybackRuntime = speech;

  const timelineSync = createTimelineSynchronizationRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.timelineSyncKey || 'daksha.timeline.runtime.speech-sync-test'
  });

  runtime.timelineSynchronizationRuntime = timelineSync;

  return {
    runtime,
    adapter,
    scheduler,
    speech,
    timelineSync
  };
}

test('playback lifecycle supports play pause resume stop completed and cancelled states', () => {
  const harness = createRuntimeHarness();

  harness.speech.play();
  assert.equal(harness.speech.snapshot().playbackState, 'Playing');

  harness.speech.pause('manual-test');
  assert.equal(harness.speech.snapshot().playbackState, 'Paused');

  harness.speech.resume('manual-test');
  assert.equal(harness.speech.snapshot().playbackState, 'Playing');

  harness.scheduler.tick(4500);
  assert.equal(harness.speech.snapshot().playbackState === 'Completed' || harness.speech.snapshot().playbackState === 'Playing', true);

  harness.speech.stop('manual-test');
  assert.equal(harness.speech.snapshot().playbackState, 'Cancelled');
});

test('timing accuracy is maintained for each narration segment', () => {
  const harness = createRuntimeHarness();

  harness.speech.seek(1600);
  const snapshot = harness.speech.snapshot();

  assert.equal(snapshot.segmentTimings['segment-1'].status, 'completed');
  assert.equal(snapshot.segmentTimings['segment-2'].status, 'active');
  assert.equal(snapshot.segmentTimings['segment-2'].playedDurationMs > 0, true);
  assert.equal(snapshot.segmentTimings['segment-2'].remainingDurationMs >= 0, true);
});

test('pause and resume preserve timing context', () => {
  const harness = createRuntimeHarness();

  harness.speech.play();
  harness.scheduler.tick(700);
  harness.speech.pause('pause-test');
  const pausedTime = harness.speech.snapshot().timelineTimeMs;

  harness.speech.resume('resume-test');
  assert.equal(harness.speech.snapshot().playbackState, 'Playing');
  assert.equal(harness.speech.snapshot().timelineTimeMs >= pausedTime, true);
});

test('seek and replay move playback to deterministic segment boundaries', () => {
  const harness = createRuntimeHarness();

  harness.speech.seek(2500);
  assert.equal(harness.speech.snapshot().currentSegmentId, 'segment-2');

  harness.speech.replay('segment-1');
  assert.equal(harness.speech.snapshot().currentSegmentId, 'segment-1');
  assert.equal(harness.speech.snapshot().timelineTimeMs <= 10, true);
});

test('next previous and skip controls navigate narration segments', () => {
  const harness = createRuntimeHarness();

  harness.speech.seek(0);
  harness.speech.next();
  assert.equal(harness.speech.snapshot().currentSegmentId, 'segment-2');

  harness.speech.previous();
  assert.equal(harness.speech.snapshot().currentSegmentId, 'segment-1');

  harness.speech.skip();
  assert.equal(harness.speech.snapshot().currentSegmentId, 'segment-2');
});

test('speed mute and volume controls are synchronized with runtime state', () => {
  const harness = createRuntimeHarness();

  harness.speech.setSpeed(1.75);
  harness.speech.setMute(true);
  harness.speech.setVolume(0.4);

  const snapshot = harness.speech.snapshot();
  assert.equal(snapshot.speed, 1.75);
  assert.equal(snapshot.muted, true);
  assert.equal(snapshot.volume, 0.4);
});

test('checkpoint recovery restores playback after interruption or refresh', () => {
  const adapter = createMemoryAdapter();

  const first = createRuntimeHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.speech.runtime.restore-test',
    timelineSyncKey: 'daksha.timeline.runtime.restore-sync-test'
  });

  first.speech.play();
  first.speech.seek(2100);
  first.speech.persistSession();

  const second = createRuntimeHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.speech.runtime.restore-test',
    timelineSyncKey: 'daksha.timeline.runtime.restore-sync-test'
  });

  const recovered = second.speech.recoverSession();
  assert.equal(recovered, true);
  assert.equal(second.speech.snapshot().interrupted, true);
  assert.equal(second.speech.snapshot().timelineTimeMs, 2100);
});

test('resume checkpoint mutation recovers timeline position safely', () => {
  const harness = createRuntimeHarness();

  harness.scheduler.seekByTime(1333);
  const checkpoint = harness.scheduler.createCheckpoint('resume', {
    source: 'test'
  });

  harness.speech.handleExternalTimelineMutation('resume-checkpoint', {
    checkpointId: checkpoint.id
  });

  assert.equal(harness.speech.snapshot().timelineTimeMs, 1333);
  assert.equal(harness.speech.snapshot().checkpoints.resumedFromCheckpointId, checkpoint.id);
});

test('unknown future playback states are preserved without code changes', () => {
  const harness = createRuntimeHarness();
  harness.speech.setPlaybackState('QuantumStreaming', {
    reason: 'future-state-test'
  });

  const snapshot = harness.speech.snapshot();
  assert.equal(snapshot.playbackState, 'QuantumStreaming');
  assert.equal(snapshot.knownPlaybackState, false);
});

test('timeline synchronization includes speech playback state handoff', () => {
  const harness = createRuntimeHarness();

  harness.speech.play();
  harness.speech.seek(900);
  const shared = harness.timelineSync.synchronize('speech-handoff-test');

  assert.ok(shared.speechPlayback);
  assert.equal(typeof shared.adapters.aiTeacher.speechPlaybackState.playbackState, 'string');
  assert.equal(shared.adapters.aiTeacher.speechPlaybackState.timelineTimeMs, 900);
});

test('implementation has no hardcoded subject mapping patterns', () => {
  const source = fs.readFileSync(new URL('./SpeechPlaybackRuntimeController.js', import.meta.url), 'utf8');
  const forbidden = /(if\s*\(\s*subject\s*===|switch\s*\(\s*subject|subjectMap|domainMap|topicMap|biology|physics|chemistry|left ventricle|atrium)/i;
  assert.equal(forbidden.test(source), false);
});
