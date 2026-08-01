import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { TimelineScheduler } from '../../timeline/runtime/index.js';
import { SceneEventRuntime } from '../../scene-events/index.js';
import { loadScene, destroyScene } from '../../scene-builder/SceneRuntime.js';
import {
  NarrationSceneSynchronizationRuntime,
  createNarrationSceneSynchronizationRuntime
} from './index.js';

function createTimelineFixture() {
  return {
    timelineId: 'narration-sync-timeline',
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
    events: [{ id: 'event-1', type: 'custom', time: 500, targets: ['clip-1'], payload: {}, priority: 1, metadata: {} }],
    markers: [{ id: 'marker-1', type: 'chapter', time: 0, metadata: {} }],
    actions: [],
    segments: [],
    groups: [],
    dependencies: [],
    metadata: {}
  };
}

function createNarrationFixture(overrides = {}) {
  return {
    segments: [
      {
        id: 'segment-1',
        index: 0,
        text: 'Describe object one.',
        timestampMs: 0,
        durationMs: 2000,
        learningObjective: 'Understand object one.',
        difficulty: 'beginner',
        relatedSceneObjectIds: ['obj-1'],
        relatedTimeline: {
          clipId: 'clip-1',
          markerId: 'marker-1',
          eventIds: ['event-1']
        },
        metadata: {
          cueIds: []
        }
      },
      {
        id: 'segment-2',
        index: 1,
        text: 'Summarize and transition.',
        timestampMs: 2000,
        durationMs: 2000,
        learningObjective: 'Recap and continue.',
        difficulty: 'intermediate',
        relatedSceneObjectIds: ['obj-2'],
        relatedTimeline: {
          clipId: 'clip-1',
          markerId: 'marker-1',
          eventIds: ['event-1']
        },
        metadata: {
          cueIds: []
        }
      }
    ],
    cues: {
      all: [
        { id: 'cue-highlight', type: 'emphasis-point', segmentId: 'segment-1', timestampMs: 120, targetObjectIds: ['obj-1'] },
        { id: 'cue-focus', type: 'interaction-point', segmentId: 'segment-1', timestampMs: 260, targetObjectIds: ['obj-1'] },
        { id: 'cue-camera', type: 'camera-focus', segmentId: 'segment-1', timestampMs: 420, targetObjectIds: ['obj-1'] },
        { id: 'cue-reveal', type: 'reveal-hide', segmentId: 'segment-1', timestampMs: 600, targetObjectIds: ['obj-1'] },
        { id: 'cue-label', type: 'label-display', segmentId: 'segment-1', timestampMs: 760, targetObjectIds: ['obj-1'] },
        { id: 'cue-animation', type: 'animation-cue', segmentId: 'segment-1', timestampMs: 920, targetObjectIds: ['obj-1'] },
        { id: 'cue-pause', type: 'pause-point', segmentId: 'segment-1', timestampMs: 1080, targetObjectIds: ['obj-1'] },
        { id: 'cue-quiz', type: 'quiz-point', segmentId: 'segment-1', timestampMs: 1280, targetObjectIds: ['obj-1'] },
        { id: 'cue-recap', type: 'recap-point', segmentId: 'segment-2', timestampMs: 2280, targetObjectIds: ['obj-2'] },
        { id: 'cue-transition', type: 'transition-cue', segmentId: 'segment-2', timestampMs: 2380, targetObjectIds: ['obj-2'] },
        { id: 'cue-unknown', type: 'future.semantic.signal', segmentId: 'segment-2', timestampMs: 2480, targetObjectIds: ['obj-2'] }
      ]
    },
    summary: {
      segmentCount: 2,
      cueCount: 11,
      totalDurationMs: 4000
    },
    ...overrides
  };
}

function createHarness(options = {}) {
  const timeline = createTimelineFixture();
  const scheduler = new TimelineScheduler(timeline, { startState: 'Ready' });

  const graphNodes = new Map([
    ['scene-sync', { id: 'scene-sync' }],
    ['obj-1', { id: 'obj-1' }],
    ['obj-2', { id: 'obj-2' }]
  ]);

  const runtime = {
    sceneId: 'scene-sync',
    timelineScheduler: scheduler,
    metadata: {
      timelineData: timeline,
      timeline: {
        timelineId: timeline.timelineId,
        version: timeline.version,
        trackIds: ['track-1'],
        clipIds: ['clip-1'],
        markerIds: ['marker-1'],
        eventIds: ['event-1']
      },
      narration: createNarrationFixture(options.narrationOverrides),
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
      nodes: graphNodes,
      edges: [{ from: 'scene-sync', relation: 'Contains', to: 'obj-1' }],
      getNode(id) {
        return graphNodes.get(id) || null;
      },
      getNodeCount() {
        return graphNodes.size;
      },
      getRelationshipCount() {
        return 1;
      },
      toJSON() {
        return {
          nodes: [...graphNodes.values()],
          edges: [{ from: 'scene-sync', relation: 'Contains', to: 'obj-1' }]
        };
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

  const narrationSync = createNarrationSceneSynchronizationRuntime(runtime, options.syncOptions || {});
  runtime.narrationSynchronizationRuntime = narrationSync;

  return {
    runtime,
    scheduler,
    narrationSync,
    sceneEventRuntime: runtime.sceneEventRuntime
  };
}

test('cue-to-event mapping emits structured synchronization events across supported cue categories', () => {
  const harness = createHarness({
    syncOptions: {
      skipToleranceMs: 12000
    }
  });
  const seenTypes = new Set();

  harness.sceneEventRuntime.on('SceneEventDispatched', ({ event }) => {
    if (String(event?.type || '').startsWith('narration.')) {
      seenTypes.add(event.type);
    }
  });

  harness.scheduler.seekByTime(5000);
  harness.narrationSync.synchronize('manual-drain');

  const required = [
    'narration.narration-start',
    'narration.narration-end',
    'narration.object-highlight',
    'narration.object-focus',
    'narration.camera-focus',
    'narration.reveal-hide',
    'narration.label-display',
    'narration.animation-cue',
    'narration.interaction-pause',
    'narration.quiz-checkpoint',
    'narration.recap-checkpoint',
    'narration.transition-cue'
  ];

  required.forEach((type) => {
    assert.equal(seenTypes.has(type), true);
  });
});

test('unknown cue types are synchronized through custom metadata without code changes', () => {
  const harness = createHarness({
    syncOptions: {
      skipToleranceMs: 12000
    }
  });
  const unknownEvents = [];

  harness.sceneEventRuntime.on('SceneEventDispatched', ({ event }) => {
    if (event?.metadata?.unknownCueType) {
      unknownEvents.push(event);
    }
  });

  harness.scheduler.seekByTime(5000);
  harness.narrationSync.synchronize('unknown-cue-test');

  assert.equal(unknownEvents.length >= 1, true);
  assert.equal(unknownEvents.some((event) => event.type === 'narration.custom-cue'), true);
});

test('seek synchronization triggers safe narration resynchronization', () => {
  const harness = createHarness();
  const baseline = harness.narrationSync.snapshot().resyncCount;

  harness.scheduler.seekByTime(1800);
  harness.narrationSync.handleExternalTimelineMutation('seek-time', { timeMs: 1800 });

  const snapshot = harness.narrationSync.snapshot();
  assert.equal(snapshot.timelineClockTimeMs, 1800);
  assert.equal(snapshot.resyncCount > baseline, true);
});

test('pause and resume trigger synchronization updates', () => {
  const harness = createHarness();
  const before = harness.narrationSync.snapshot().resyncCount;

  harness.scheduler.play();
  harness.scheduler.pause('test-pause');
  harness.scheduler.resume('test-resume');

  const after = harness.narrationSync.snapshot().resyncCount;
  assert.equal(after > before, true);
});

test('playback speed changes are synchronized safely', () => {
  const harness = createHarness();
  harness.scheduler.setSpeed(2.5);
  harness.narrationSync.handleExternalTimelineMutation('speed-change', { speed: 2.5 });

  const snapshot = harness.narrationSync.snapshot();
  assert.equal(snapshot.speed, 2.5);
});

test('drift detection emits correction and resynchronizes', () => {
  const harness = createHarness({
    syncOptions: {
      driftToleranceMs: 20
    }
  });

  let driftDetected = false;
  harness.narrationSync.on('narration-drift-detected', () => {
    driftDetected = true;
  });

  harness.scheduler.seekByTime(900);
  harness.narrationSync.narrationClockTimeMs = 100;
  harness.narrationSync.synchronize('drift-test');

  assert.equal(driftDetected, true);
  assert.equal(harness.narrationSync.snapshot().resyncCount >= 1, true);
});

test('checkpoint resume path persists quiz and recap cue checkpoints', () => {
  const harness = createHarness({
    syncOptions: {
      skipToleranceMs: 12000
    }
  });

  harness.scheduler.seekByTime(5000);
  harness.narrationSync.synchronize('checkpoint-sync');
  harness.narrationSync.handleExternalTimelineMutation('resume-checkpoint', {
    checkpointId: 'checkpoint-1'
  });

  const checkpoints = harness.scheduler.checkpoints.toJSON();
  assert.equal(checkpoints.some((item) => item.type === 'assessment'), true);
  assert.equal(checkpoints.some((item) => item.type === 'lesson'), true);
});

test('missing object references are surfaced in structured payload metadata', () => {
  const harness = createHarness({
    narrationOverrides: {
      cues: {
        all: [
          {
            id: 'cue-missing',
            type: 'label-display',
            segmentId: 'segment-1',
            timestampMs: 10,
            targetObjectIds: ['unknown-object-id']
          }
        ]
      }
    }
  });

  harness.scheduler.seekByTime(1000);
  harness.narrationSync.synchronize('missing-ref-test');

  const recent = harness.sceneEventRuntime.snapshot().dispatch.recent;
  const cueEvent = recent.find((item) => item?.event?.sourceRefId === 'cue-missing');
  assert.ok(cueEvent);
  assert.equal(cueEvent.event.payload.runtimeReferences.sceneGraph.missingObjectIds.includes('unknown-object-id'), true);
});

test('delayed events are detected and emitted with delay metadata', () => {
  const harness = createHarness({
    syncOptions: {
      delayToleranceMs: 10,
      skipToleranceMs: 1000
    },
    narrationOverrides: {
      cues: {
        all: [
          {
            id: 'cue-delay',
            type: 'animation-cue',
            segmentId: 'segment-1',
            timestampMs: 10,
            targetObjectIds: ['obj-1']
          }
        ]
      }
    }
  });

  let delayedCount = 0;
  harness.narrationSync.on('narration-event-delayed', () => {
    delayedCount += 1;
  });

  harness.scheduler.seekByTime(300);
  harness.narrationSync.synchronize('delay-test');

  assert.equal(delayedCount >= 1, true);
});

test('large seek can skip stale cue and trigger safe resynchronization', () => {
  const harness = createHarness({
    syncOptions: {
      delayToleranceMs: 10,
      skipToleranceMs: 100
    },
    narrationOverrides: {
      cues: {
        all: [
          {
            id: 'cue-skip',
            type: 'camera-focus',
            segmentId: 'segment-1',
            timestampMs: 20,
            targetObjectIds: ['obj-1']
          }
        ]
      }
    }
  });

  const baseResyncCount = harness.narrationSync.snapshot().resyncCount;
  harness.scheduler.seekByTime(2000);
  harness.narrationSync.synchronize('skip-test');

  const snapshot = harness.narrationSync.snapshot();
  assert.equal(snapshot.skippedCueCount >= 1, true);
  assert.equal(snapshot.resyncCount > baseResyncCount, true);
});

test('graph metadata handoff includes narration synchronization state in runtime metadata and shared synchronization state', () => {
  const runtime = loadScene({
    title: 'Narration Graph Handoff',
    lesson: 'Start with object A. Then explain object B and quiz the learner.',
    objects: [
      { id: 'obj-a', name: 'Object A' },
      { id: 'obj-b', name: 'Object B' }
    ],
    timelineTracks: [
      {
        id: 'track-1',
        name: 'Main',
        purpose: 'generic',
        enabled: true,
        priority: 1,
        clips: [{ id: 'clip-1', start: 0, end: 2000, duration: 2000, objects: [] }],
        events: [{ id: 'event-1', type: 'custom', time: 400, targets: ['clip-1'] }],
        markers: [{ id: 'marker-1', type: 'chapter', time: 0 }],
        dependencies: [],
        metadata: {}
      }
    ]
  });

  assert.ok(runtime.metadata.narrationSynchronization);
  assert.ok(runtime.timelineSynchronizationRuntime.getSharedState().narration.synchronization);
  destroyScene();
});

test('implementation has no subject mapping patterns', () => {
  const filename = fileURLToPath(new URL('./NarrationSceneSynchronizationRuntime.js', import.meta.url));
  const source = fs.readFileSync(filename, 'utf8');
  const forbidden = /(if\s*\(\s*subject\s*===|switch\s*\(\s*subject|subjectMap|domainMap|topicMap|biology|physics|chemistry|trading|left ventricle|atrium)/i;

  assert.equal(forbidden.test(source), false);
  assert.equal(path.basename(filename), 'NarrationSceneSynchronizationRuntime.js');
});
