import test from 'node:test';
import assert from 'node:assert/strict';
import { TimelineScheduler, createTimelineSynchronizationRuntime } from '../../timeline/runtime/index.js';
import { SceneEventRuntime } from '../../scene-events/index.js';
import { createUniversalAccessibilityStateRecoveryRuntime } from './index.js';

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
    timelineId: 'accessibility-recovery-runtime-timeline',
    version: 'v2',
    tracks: [
      {
        id: 'track-1',
        name: 'Main',
        purpose: 'generic',
        enabled: true,
        priority: 1,
        clips: [{ id: 'clip-1', start: 0, end: 6000, duration: 6000, objects: [] }],
        events: [{ id: 'event-1', type: 'custom', time: 250, targets: ['clip-1'] }],
        markers: [{ id: 'marker-1', type: 'chapter', time: 0 }],
        dependencies: [],
        metadata: {}
      }
    ],
    clips: [{ id: 'clip-1', start: 0, end: 6000, duration: 6000, objects: [], actions: [], events: [], metadata: {} }],
    events: [{ id: 'event-1', type: 'custom', time: 250, targets: ['clip-1'], payload: {}, priority: 1 }],
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
  const timeline = timelineFixture();
  const scheduler = new TimelineScheduler(timeline, {
    startState: 'Ready',
    persistenceAdapter: adapter
  });

  const graphNodes = [
    { id: 'scene-1', metadata: {}, properties: {}, runtimeData: {} },
    {
      id: 'obj-1',
      metadata: { sourceKey: 'objects' },
      properties: {
        id: 'obj-1',
        name: 'Object One',
        interactive: true,
        clickable: true,
        ariaLabel: 'Object One Label',
        ariaDescription: 'Object one screen reader description'
      },
      runtimeData: {}
    },
    {
      id: 'obj-2',
      metadata: { sourceKey: 'objects' },
      properties: {
        id: 'obj-2',
        name: 'Object Two',
        focusable: true,
        ariaRole: 'button'
      },
      runtimeData: {}
    }
  ];

  const runtime = {
    sceneId: 'scene-1',
    timelineScheduler: scheduler,
    metadata: {
      title: 'Universal Accessibility Lesson',
      narration: {
        segments: [
          { id: 'segment-1', text: 'Intro', timestampMs: 0, durationMs: 2000 },
          { id: 'segment-2', text: 'Details', timestampMs: 2000, durationMs: 2000 }
        ],
        cues: {
          all: [
            { id: 'cue-1', segmentId: 'segment-1', text: 'Caption intro', timeMs: 120 },
            { id: 'cue-2', segmentId: 'segment-2', text: 'Caption details', timeMs: 2300 }
          ]
        },
        summary: {
          segmentCount: 2,
          cueCount: 2,
          totalDurationMs: 4000
        }
      },
      timelineData: timeline,
      timeline: {
        timelineId: timeline.timelineId,
        version: timeline.version,
        trackIds: ['track-1'],
        clipIds: ['clip-1'],
        markerIds: ['marker-1'],
        eventIds: ['event-1']
      },
      userPreferences: {
        language: 'en-US',
        reducedMotion: false
      },
      quizProgress: {
        completion: 40,
        answered: 4,
        total: 10
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
      nodes: new Map(graphNodes.map((node) => [node.id, node])),
      edges: [{ from: 'scene-1', relation: 'Contains', to: 'obj-1' }],
      getNodeCount() {
        return graphNodes.length;
      },
      getRelationshipCount() {
        return 1;
      },
      getNode(nodeId) {
        return this.nodes.get(nodeId) || null;
      },
      toJSON() {
        return {
          nodes: graphNodes,
          edges: [{ from: 'scene-1', relation: 'Contains', to: 'obj-1' }]
        };
      }
    },
    inputCameraControlRuntime: {
      snapshot() {
        return {
          camera: {
            currentMode: 'orbit',
            position: [0, 1.8, 5],
            target: [0, 1, 0],
            zoom: 1
          }
        };
      }
    },
    interactionContractRuntime: {
      snapshot() {
        return {
          schemaVersion: 'v1',
          metrics: {
            contractCount: 2,
            objectCount: 2,
            eventCount: 1
          }
        };
      }
    },
    educationalInspectionRuntime: {
      snapshot() {
        return {
          objects: {
            selectedIds: ['obj-2']
          }
        };
      }
    },
    adaptiveTeachingRuntime: {
      snapshot() {
        return {
          progress: {
            progressPercent: 62,
            completedUnits: 5,
            totalUnits: 8
          }
        };
      }
    }
  };

  runtime.sceneEventRuntime = new SceneEventRuntime(runtime);
  runtime.sceneEventSystem = runtime.sceneEventRuntime;

  const accessibilityRecoveryRuntime = createUniversalAccessibilityStateRecoveryRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.persistenceKey || 'daksha.accessibility.recovery.runtime.test'
  });

  runtime.accessibilityStateRecoveryRuntime = accessibilityRecoveryRuntime;

  const timelineSync = createTimelineSynchronizationRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.timelineSyncKey || 'daksha.timeline.accessibility.sync-test'
  });

  runtime.timelineSynchronizationRuntime = timelineSync;

  return {
    runtime,
    scheduler,
    accessibilityRecoveryRuntime,
    timelineSync,
    adapter
  };
}

test('accessibility metadata includes keyboard/screen reader/captions/narration defaults', () => {
  const harness = createHarness();
  const snapshot = harness.accessibilityRecoveryRuntime.snapshot();

  assert.equal(snapshot.knownFeatures.includes('keyboard-navigation'), true);
  assert.equal(snapshot.accessibility.keyboardNavigation.enabled, true);
  assert.equal(Object.keys(snapshot.accessibility.screenReader.metadataByObjectId).length >= 2, true);
  assert.equal(snapshot.accessibility.captions.tracks[0].cueCount, 2);
  assert.equal(snapshot.accessibility.narration.segmentCount, 2);
});

test('keyboard navigation updates focus state deterministically', () => {
  const harness = createHarness();

  const before = harness.accessibilityRecoveryRuntime.snapshot().accessibility.keyboardNavigation.activeFocusId;
  harness.accessibilityRecoveryRuntime.navigateFocus('next');
  harness.accessibilityRecoveryRuntime.navigateFocus('previous');
  harness.accessibilityRecoveryRuntime.setFocusById('obj-2');

  const after = harness.accessibilityRecoveryRuntime.snapshot();
  assert.equal(before !== null, true);
  assert.equal(after.accessibility.keyboardNavigation.activeFocusId, 'obj-2');
  assert.equal(after.metrics.focusMoves >= 3, true);
  assert.equal(after.metrics.keyboardActions >= 2, true);
});

test('session persistence stores lesson, timeline, camera, interaction, selected objects, checkpoints and preferences', () => {
  const harness = createHarness();

  harness.scheduler.seekByTime(2450);
  harness.scheduler.createCheckpoint('manual', {
    timeMs: 2450,
    metadata: { source: 'test' }
  });
  harness.accessibilityRecoveryRuntime.synchronize('persistence-coverage');

  const snapshot = harness.accessibilityRecoveryRuntime.snapshot();

  assert.equal(snapshot.session.currentLesson, 'Universal Accessibility Lesson');
  assert.equal(snapshot.session.timelinePosition, 2450);
  assert.equal(typeof snapshot.session.cameraMetadata.currentMode, 'string');
  assert.equal(typeof snapshot.session.interactionState.schemaVersion, 'string');
  assert.deepEqual(snapshot.session.selectedObjects, ['obj-2']);
  assert.equal(snapshot.session.checkpoints.length >= 1, true);
  assert.equal(snapshot.session.quizProgress.completion, 40);
  assert.equal(snapshot.session.learningProgress.progressPercent, 62);
  assert.equal(snapshot.session.userPreferences.language, 'en-US');
});

test('restore recovers full session after refresh/restart with persisted payload', () => {
  const adapter = createMemoryAdapter();

  const first = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.accessibility.recovery.restore',
    timelineSyncKey: 'daksha.timeline.accessibility.restore-sync'
  });

  first.scheduler.seekByTime(3120);
  first.accessibilityRecoveryRuntime.setHighContrastMode(true);
  first.accessibilityRecoveryRuntime.setFontScale(1.4);
  first.accessibilityRecoveryRuntime.setInteractionTiming(350);
  first.accessibilityRecoveryRuntime.persistSession();

  const second = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.accessibility.recovery.restore',
    timelineSyncKey: 'daksha.timeline.accessibility.restore-sync'
  });

  const recovered = second.accessibilityRecoveryRuntime.recoverSession();
  const snapshot = second.accessibilityRecoveryRuntime.snapshot();

  assert.equal(recovered, true);
  assert.equal(snapshot.session.timelinePosition, 3120);
  assert.equal(snapshot.accessibility.visual.highContrastMode, true);
  assert.equal(snapshot.accessibility.visual.fontScale, 1.4);
  assert.equal(snapshot.accessibility.timing.interactionTimingMs, 350);
  assert.equal(snapshot.recovery.interrupted, true);
});

test('crash and network interruption recovery marks interrupted and remains restorable', () => {
  const harness = createHarness();

  harness.accessibilityRecoveryRuntime.handleExternalTimelineMutation('unexpected-crash', { source: 'runtime' });
  harness.accessibilityRecoveryRuntime.handleExternalTimelineMutation('network-interruption', { source: 'runtime' });

  const snapshot = harness.accessibilityRecoveryRuntime.snapshot();
  assert.equal(snapshot.recovery.interrupted, true);
  assert.equal(snapshot.recovery.resumeReason, 'network-interruption');
  assert.equal(snapshot.diagnostics.recoverableErrors.length >= 1, true);
});

test('checkpoint recovery uses checkpoint restore flow', () => {
  const harness = createHarness();

  const checkpoint = harness.scheduler.createCheckpoint('resume', {
    timeMs: 1580,
    metadata: { source: 'checkpoint-test' }
  });

  harness.accessibilityRecoveryRuntime.restoreFromCheckpoint(checkpoint.id);

  const snapshot = harness.accessibilityRecoveryRuntime.snapshot();
  assert.equal(snapshot.recovery.checkpointId, checkpoint.id);
  assert.equal(snapshot.metrics.checkpointRestores, 1);
  assert.equal(snapshot.recovery.resumeReason, 'checkpoint-restore');
});

test('version migration recovers legacy payloads without code changes', () => {
  const adapter = createMemoryAdapter();
  const key = 'daksha.accessibility.recovery.migration';

  adapter.setItem(key, JSON.stringify({
    schemaVersion: 'v1',
    currentLesson: 'Legacy Lesson',
    timelineTimeMs: 900,
    uiScale: 1.25,
    fontScale: 1.2,
    highContrastMode: true,
    interactionTimingMs: 180,
    activeFocusId: 'obj-legacy',
    legacy: {
      futureMode: true
    }
  }));

  const harness = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: key,
    timelineSyncKey: 'daksha.timeline.accessibility.migration-sync'
  });

  const recovered = harness.accessibilityRecoveryRuntime.recoverSession();
  const snapshot = harness.accessibilityRecoveryRuntime.snapshot();

  assert.equal(recovered, true);
  assert.equal(snapshot.recovery.migrationApplied, true);
  assert.equal(snapshot.recovery.versionBeforeMigration, 'v1');
  assert.equal(snapshot.accessibility.visual.uiScale, 1.25);
  assert.equal(snapshot.accessibility.visual.fontScale, 1.2);
  assert.equal(snapshot.accessibility.visual.highContrastMode, true);
  assert.equal(snapshot.accessibility.timing.interactionTimingMs, 180);
});

test('corrupted state recovery falls back safely and remains operational', () => {
  const adapter = createMemoryAdapter();
  const key = 'daksha.accessibility.recovery.corrupt';
  adapter.setItem(key, '{not-json-payload');

  const harness = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: key,
    timelineSyncKey: 'daksha.timeline.accessibility.corrupt-sync'
  });

  const recovered = harness.accessibilityRecoveryRuntime.recoverSession();
  assert.equal(recovered, false);
  assert.equal(harness.accessibilityRecoveryRuntime.snapshot().recovery.corruptionRecovered, true);

  harness.accessibilityRecoveryRuntime.recoverFromCorruptedState('manual');
  const snapshot = harness.accessibilityRecoveryRuntime.snapshot();
  assert.equal(snapshot.recovery.corruptionRecovered, true);
  assert.equal(typeof snapshot.accessibility.keyboardNavigation.enabled, 'boolean');
});

test('unknown accessibility types and state fields are preserved generically', () => {
  const harness = createHarness();

  harness.accessibilityRecoveryRuntime.updateAccessibilitySettings({
    visual: {
      highContrastMode: true
    },
    neuroAdaptiveLatencyProfile: {
      preferred: 'slow-wave'
    },
    hapticNarrationBridge: {
      enabled: true
    }
  });

  const snapshot = harness.accessibilityRecoveryRuntime.snapshot();

  assert.equal(snapshot.unknownFeatures.includes('neuroadaptivelatencyprofile'), true);
  assert.equal(snapshot.accessibility.unknownSettings.neuroAdaptiveLatencyProfile.preferred, 'slow-wave');
  assert.equal(snapshot.accessibility.unknownSettings.hapticNarrationBridge.enabled, true);
});

test('timeline synchronization shared state includes accessibility recovery handoff', () => {
  const harness = createHarness();

  harness.accessibilityRecoveryRuntime.navigateFocus('next');
  const shared = harness.timelineSync.synchronize('accessibility-sync-test');

  assert.ok(shared.accessibilityRecovery);
  assert.ok(shared.adapters.aiTeacher.accessibilityRecoveryState);
  assert.ok(shared.adapters.rendererAdapter.accessibilityRecoveryState);
  assert.ok(shared.adapters.interactionEngine.accessibilityRecoveryState);
});

test('backward compatibility remains stable without focusable nodes', () => {
  const adapter = createMemoryAdapter();
  const timeline = timelineFixture();
  const scheduler = new TimelineScheduler(timeline, {
    startState: 'Ready',
    persistenceAdapter: adapter
  });

  const runtime = {
    sceneId: 'scene-no-focusable',
    timelineScheduler: scheduler,
    metadata: {
      title: 'No Focusable Scene',
      timelineData: timeline,
      timeline: {
        timelineId: timeline.timelineId,
        version: timeline.version,
        trackIds: ['track-1'],
        clipIds: ['clip-1'],
        markerIds: ['marker-1'],
        eventIds: ['event-1']
      },
      narration: {
        segments: [],
        cues: { all: [] },
        summary: { segmentCount: 0, cueCount: 0, totalDurationMs: 0 }
      }
    },
    graph: {
      nodes: new Map([
        ['scene-no-focusable', { id: 'scene-no-focusable', metadata: {}, properties: {}, runtimeData: {} }]
      ]),
      edges: [],
      getNodeCount() {
        return 1;
      },
      getRelationshipCount() {
        return 0;
      },
      toJSON() {
        return {
          nodes: [{ id: 'scene-no-focusable', metadata: {}, properties: {}, runtimeData: {} }],
          edges: []
        };
      }
    }
  };

  runtime.sceneEventRuntime = new SceneEventRuntime(runtime);
  runtime.sceneEventSystem = runtime.sceneEventRuntime;

  const accessibilityRecoveryRuntime = createUniversalAccessibilityStateRecoveryRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.accessibility.recovery.empty'
  });

  const snapshot = accessibilityRecoveryRuntime.snapshot();
  assert.equal(snapshot.accessibility.keyboardNavigation.focusOrder.length, 0);
  assert.equal(snapshot.accessibility.keyboardNavigation.focusIndex, -1);
  assert.equal(typeof snapshot.session.playbackState, 'string');
});
