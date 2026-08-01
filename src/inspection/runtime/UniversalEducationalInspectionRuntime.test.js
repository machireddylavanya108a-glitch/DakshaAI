import test from 'node:test';
import assert from 'node:assert/strict';
import { TimelineScheduler, createTimelineSynchronizationRuntime } from '../../timeline/runtime/index.js';
import { SceneEventRuntime } from '../../scene-events/index.js';
import { createUniversalEducationalInspectionRuntime } from './index.js';

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
    timelineId: 'educational-inspection-runtime-timeline',
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

function createObjectNode(id, extra = {}) {
  return {
    id,
    metadata: {
      sourceKey: 'objects'
    },
    properties: {
      id,
      position: [1, 2, 3],
      inspectionCapabilities: ['inspect', 'highlight', 'crosssection'],
      ...extra
    },
    runtimeData: {
      educationalInspection: {
        capabilities: ['inspect', 'highlight', 'cross-section']
      }
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

  const graphNodes = [
    { id: 'scene-1', metadata: {}, properties: {}, runtimeData: {} },
    createObjectNode('obj-1'),
    createObjectNode('obj-2', { position: [-2, 1, 4], inspectionCapabilities: ['inspect', 'compare', 'xray'] })
  ];

  const runtime = {
    sceneId: 'scene-1',
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
    }
  };

  runtime.sceneEventRuntime = new SceneEventRuntime(runtime);
  runtime.sceneEventSystem = runtime.sceneEventRuntime;

  const educationalInspectionRuntime = createUniversalEducationalInspectionRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.persistenceKey || 'daksha.educational.inspection.runtime.test'
  });

  runtime.educationalInspectionRuntime = educationalInspectionRuntime;

  const timelineSync = createTimelineSynchronizationRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.timelineSyncKey || 'daksha.timeline.educational-inspection.sync-test'
  });

  runtime.timelineSynchronizationRuntime = timelineSync;

  return {
    runtime,
    scheduler,
    educationalInspectionRuntime,
    timelineSync,
    adapter
  };
}

test('object inspection returns normalized object state', () => {
  const harness = createHarness();

  const inspected = harness.educationalInspectionRuntime.inspectObject('obj-1');

  assert.ok(inspected);
  assert.equal(inspected.objectId, 'obj-1');
  assert.equal(Array.isArray(inspected.capabilities), true);
  assert.equal(inspected.capabilities.includes('cross-section'), true);
});

test('metadata inspection returns sanitized metadata snapshot', () => {
  const harness = createHarness();
  const metadata = harness.educationalInspectionRuntime.inspectObjectMetadata('obj-1');

  assert.ok(metadata);
  assert.equal(typeof metadata, 'object');
  assert.equal(metadata.sourceMetadata.sourceKey, 'objects');
});

test('multiple selection is tracked and synchronized', () => {
  const harness = createHarness();

  harness.educationalInspectionRuntime.selectObjects(['obj-1', 'obj-2']);

  const snapshot = harness.educationalInspectionRuntime.snapshot();
  assert.deepEqual(snapshot.objects.selectedIds, ['obj-1', 'obj-2']);
  assert.equal(snapshot.metrics.selectedCount, 2);
});

test('manipulation lifecycle supports highlight rotate annotate measure duplicate compare', () => {
  const harness = createHarness();

  harness.educationalInspectionRuntime.manipulateObject('obj-1', 'highlight', { enabled: true });
  harness.educationalInspectionRuntime.manipulateObject('obj-1', 'rotate', { delta: [0, 30, 0] });
  harness.educationalInspectionRuntime.manipulateObject('obj-1', 'annotate', { text: 'Label A', position: [1, 2, 3] });
  harness.educationalInspectionRuntime.manipulateObject('obj-1', 'measure', { value: 12.5, unit: 'cm' });
  harness.educationalInspectionRuntime.manipulateObject('obj-1', 'duplicate', { metadata: { variant: 'temp' } });
  harness.educationalInspectionRuntime.compareObjects(['obj-1', 'obj-2']);

  const snapshot = harness.educationalInspectionRuntime.snapshot();
  const obj1 = snapshot.objects.byId['obj-1'];

  assert.equal(obj1.highlighted, true);
  assert.equal(obj1.transform.rotation[1] !== 0, true);
  assert.equal(obj1.annotations.length >= 1, true);
  assert.equal(obj1.measurements.length >= 1, true);
  assert.equal(obj1.temporaryDuplicates.length >= 1, true);
  assert.equal(obj1.compareWith.includes('obj-2'), true);
  assert.equal(snapshot.metrics.manipulationCount >= 6, true);
});

test('undo redo and reset operations restore object state', () => {
  const harness = createHarness();

  harness.educationalInspectionRuntime.manipulateObject('obj-1', 'highlight', { enabled: true });
  assert.equal(harness.educationalInspectionRuntime.snapshot().objects.byId['obj-1'].highlighted, true);

  harness.educationalInspectionRuntime.undo();
  assert.equal(harness.educationalInspectionRuntime.snapshot().objects.byId['obj-1'].highlighted, false);

  harness.educationalInspectionRuntime.redo();
  assert.equal(harness.educationalInspectionRuntime.snapshot().objects.byId['obj-1'].highlighted, true);

  harness.educationalInspectionRuntime.resetObject('obj-1');
  assert.equal(harness.educationalInspectionRuntime.snapshot().objects.byId['obj-1'].highlighted, false);

  harness.educationalInspectionRuntime.manipulateObject('obj-2', 'highlight', { enabled: true });
  harness.educationalInspectionRuntime.resetAllObjects();
  assert.equal(harness.educationalInspectionRuntime.snapshot().objects.byId['obj-2'].highlighted, false);
});

test('unknown capabilities are preserved without runtime failure', () => {
  const harness = createHarness();

  harness.educationalInspectionRuntime.manipulateObject('obj-1', 'quantum-disassemble-mode', { phase: 'beta' });

  const snapshot = harness.educationalInspectionRuntime.snapshot();
  const obj1 = snapshot.objects.byId['obj-1'];

  assert.equal(obj1.unknownCapabilities.includes('quantum-disassemble-mode'), true);
  assert.equal(Array.isArray(obj1.capabilityLog), true);
  assert.equal(obj1.capabilityLog.length >= 1, true);
});

test('runtime persists and recovers timeline synchronized inspection session', () => {
  const adapter = createMemoryAdapter();

  const first = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.educational.inspection.runtime.restore',
    timelineSyncKey: 'daksha.timeline.educational-inspection.restore-sync'
  });

  first.scheduler.seekByTime(2350);
  first.educationalInspectionRuntime.manipulateObject('obj-1', 'x-ray', { enabled: true });
  first.educationalInspectionRuntime.persistSession();

  const second = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.educational.inspection.runtime.restore',
    timelineSyncKey: 'daksha.timeline.educational-inspection.restore-sync'
  });

  const recovered = second.educationalInspectionRuntime.recoverSession();
  const snapshot = second.educationalInspectionRuntime.snapshot();

  assert.equal(recovered, true);
  assert.equal(snapshot.timelineTimeMs, 2350);
  assert.equal(snapshot.objects.byId['obj-1'].xRay, true);
  assert.equal(snapshot.recovery.interrupted, true);
});

test('timeline synchronization shared state includes educational inspection handoff', () => {
  const harness = createHarness();

  harness.educationalInspectionRuntime.manipulateObject('obj-2', 'highlight', { enabled: true });

  const shared = harness.timelineSync.synchronize('educational-inspection-test');
  assert.ok(shared.educationalInspection);
  assert.ok(shared.adapters.aiTeacher.educationalInspectionState);
  assert.ok(shared.adapters.rendererAdapter.educationalInspectionState);
  assert.ok(shared.adapters.interactionEngine.educationalInspectionState);
});

test('backward compatibility keeps runtime stable without educational object nodes', () => {
  const adapter = createMemoryAdapter();
  const timeline = timelineFixture();
  const scheduler = new TimelineScheduler(timeline, {
    startState: 'Ready',
    persistenceAdapter: adapter
  });

  const runtime = {
    sceneId: 'scene-no-objects',
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
      }
    },
    graph: {
      nodes: new Map([
        ['scene-no-objects', { id: 'scene-no-objects', metadata: {}, properties: {}, runtimeData: {} }]
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
          nodes: [{ id: 'scene-no-objects', metadata: {}, properties: {}, runtimeData: {} }],
          edges: []
        };
      }
    }
  };

  runtime.sceneEventRuntime = new SceneEventRuntime(runtime);
  runtime.sceneEventSystem = runtime.sceneEventRuntime;

  const educationalInspectionRuntime = createUniversalEducationalInspectionRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.educational.inspection.runtime.empty'
  });

  const snapshot = educationalInspectionRuntime.snapshot();
  assert.equal(typeof snapshot.schemaVersion, 'string');
  assert.equal(Object.keys(snapshot.objects.byId).length, 0);
  assert.equal(snapshot.metrics.objectCount, 0);
});
