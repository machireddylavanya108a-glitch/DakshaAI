import test from 'node:test';
import assert from 'node:assert/strict';
import { TimelineScheduler, createTimelineSynchronizationRuntime } from '../../timeline/runtime/index.js';
import { SceneEventRuntime } from '../../scene-events/index.js';
import { createUniversalInputCameraControlRuntime } from './index.js';

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
    timelineId: 'input-camera-runtime-timeline',
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

function createObjectNode(id, position = [0, 0, 0]) {
  return {
    id,
    metadata: {
      sourceKey: 'objects'
    },
    properties: {
      id,
      position,
      interactive: true
    },
    runtimeData: {}
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
    createObjectNode('obj-1', [1, 2, 3]),
    createObjectNode('obj-2', [-2, 1, 4])
  ];

  const runtime = {
    sceneId: 'scene-1',
    timelineScheduler: scheduler,
    metadata: {
      camera: {
        position: [0, 1.8, 5],
        rotation: [0, 0, 0],
        target: [0, 1, 0],
        zoom: 1,
        movement: {
          mode: 'orbit'
        },
        constraints: {
          minDistance: 1,
          maxDistance: 30,
          minZoom: 0.3,
          maxZoom: 5,
          minX: -100,
          maxX: 100,
          minY: -100,
          maxY: 100,
          minZ: -100,
          maxZ: 100
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

  const inputCameraRuntime = createUniversalInputCameraControlRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.persistenceKey || 'daksha.input.camera.control.test'
  });

  runtime.inputCameraControlRuntime = inputCameraRuntime;

  const timelineSync = createTimelineSynchronizationRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.timelineSyncKey || 'daksha.timeline.input-camera.sync-test'
  });

  runtime.timelineSynchronizationRuntime = timelineSync;

  return {
    runtime,
    scheduler,
    inputCameraRuntime,
    timelineSync,
    adapter
  };
}

test('mouse input events register and process correctly', () => {
  const harness = createHarness();

  harness.inputCameraRuntime.processInputEvent({
    deviceType: 'mouse',
    action: 'orbit',
    delta: { x: 12, y: -4 },
    payload: {}
  });

  const snapshot = harness.inputCameraRuntime.snapshot();
  assert.equal(snapshot.inputLayer.registeredTypes.includes('mouse'), true);
  assert.equal(snapshot.metrics.inputEventCount >= 1, true);
});

test('touch input events register and process correctly', () => {
  const harness = createHarness();

  harness.inputCameraRuntime.processInputEvent({
    deviceType: 'touch',
    action: 'pinch-zoom',
    amount: -18,
    payload: {}
  });

  const snapshot = harness.inputCameraRuntime.snapshot();
  assert.equal(snapshot.inputLayer.registeredTypes.includes('touch'), true);
  assert.equal(snapshot.metrics.inputEventCount >= 1, true);
});

test('keyboard input events register and process correctly', () => {
  const harness = createHarness();

  harness.inputCameraRuntime.processInputEvent({
    deviceType: 'keyboard',
    action: 'pan',
    delta: { x: 2, y: 0, z: -1 },
    payload: {}
  });

  const snapshot = harness.inputCameraRuntime.snapshot();
  assert.equal(snapshot.inputLayer.registeredTypes.includes('keyboard'), true);
  assert.equal(snapshot.metrics.inputEventCount >= 1, true);
});

test('camera orbit updates camera position', () => {
  const harness = createHarness();
  const before = harness.inputCameraRuntime.snapshot().camera.position;

  harness.inputCameraRuntime.orbit({ x: 16, y: -6 });

  const after = harness.inputCameraRuntime.snapshot().camera.position;
  assert.equal(JSON.stringify(after) !== JSON.stringify(before), true);
});

test('camera pan updates camera target and position', () => {
  const harness = createHarness();
  const before = harness.inputCameraRuntime.snapshot().camera.target;

  harness.inputCameraRuntime.pan({ x: 12, y: 4, z: -8 });

  const after = harness.inputCameraRuntime.snapshot().camera.target;
  assert.equal(JSON.stringify(after) !== JSON.stringify(before), true);
});

test('camera zoom updates zoom level within constraints', () => {
  const harness = createHarness();
  const before = harness.inputCameraRuntime.snapshot().camera.zoom;

  harness.inputCameraRuntime.zoom(-25);

  const after = harness.inputCameraRuntime.snapshot().camera.zoom;
  assert.equal(after !== before, true);
  assert.equal(after >= 0.3 && after <= 5, true);
});

test('camera reset restores default camera state', () => {
  const harness = createHarness();

  harness.inputCameraRuntime.pan({ x: 50, y: 50, z: 50 });
  harness.inputCameraRuntime.zoom(40);
  harness.inputCameraRuntime.resetCamera();

  const snapshot = harness.inputCameraRuntime.snapshot();
  assert.deepEqual(snapshot.camera.position, [0, 1.8, 5]);
  assert.deepEqual(snapshot.camera.target, [0, 1, 0]);
  assert.equal(snapshot.camera.zoom, 1);
});

test('camera focus uses runtime graph object metadata', () => {
  const harness = createHarness();

  harness.inputCameraRuntime.focusObject('obj-1', {
    offset: [0.5, 0.8, 2.4]
  });

  const snapshot = harness.inputCameraRuntime.snapshot();
  assert.deepEqual(snapshot.camera.target, [1, 2, 3]);
  assert.equal(snapshot.camera.position[0] > 1, true);
});

test('input camera runtime persists and recovers state', () => {
  const adapter = createMemoryAdapter();

  const first = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.input.camera.control.restore',
    timelineSyncKey: 'daksha.timeline.input-camera.restore-sync'
  });

  first.scheduler.seekByTime(2550);
  first.inputCameraRuntime.processInputEvent({
    deviceType: 'mouse',
    action: 'pan',
    delta: { x: 5, y: 3, z: -2 }
  });
  first.inputCameraRuntime.persistSession();

  const second = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.input.camera.control.restore',
    timelineSyncKey: 'daksha.timeline.input-camera.restore-sync'
  });

  const recovered = second.inputCameraRuntime.recoverSession();
  assert.equal(recovered, true);
  assert.equal(second.inputCameraRuntime.snapshot().timelineTimeMs, 2550);
  assert.equal(second.inputCameraRuntime.snapshot().recovery.interrupted, true);
});

test('unknown input devices are preserved through generic metadata', () => {
  const harness = createHarness();

  harness.inputCameraRuntime.processInputEvent({
    deviceType: 'eye-tracker',
    action: 'focus',
    targetObjectId: 'obj-2'
  });

  const snapshot = harness.inputCameraRuntime.snapshot();
  assert.equal(snapshot.inputLayer.unknownDeviceTypes.includes('eye-tracker'), true);
});

test('unknown camera modes are preserved and synchronized', () => {
  const harness = createHarness();

  harness.inputCameraRuntime.setCameraMode('holographic-dolly-mode');

  const snapshot = harness.inputCameraRuntime.snapshot();
  assert.equal(snapshot.unknownCameraModes.includes('holographic-dolly-mode'), true);
  assert.equal(snapshot.metrics.unknownCameraModeCount >= 1, true);
});

test('timeline synchronization shared state includes input camera control handoff', () => {
  const harness = createHarness();

  harness.inputCameraRuntime.processInputEvent({
    deviceType: 'mouse',
    action: 'orbit',
    delta: { x: 8, y: 2 }
  });

  const shared = harness.timelineSync.synchronize('input-camera-test');
  assert.ok(shared.inputCameraControl);
  assert.ok(shared.adapters.aiTeacher.inputCameraControlState);
  assert.ok(shared.adapters.rendererAdapter.inputCameraControlState);
  assert.ok(shared.adapters.interactionEngine.inputCameraControlState);
});

test('backward compatibility keeps runtime stable without object focus nodes', () => {
  const adapter = createMemoryAdapter();
  const timeline = timelineFixture();
  const scheduler = new TimelineScheduler(timeline, {
    startState: 'Ready',
    persistenceAdapter: adapter
  });

  const runtime = {
    sceneId: 'scene-no-focus',
    timelineScheduler: scheduler,
    metadata: {
      camera: {
        movement: {
          mode: 'orbit'
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
      }
    },
    graph: {
      nodes: new Map([
        ['scene-no-focus', { id: 'scene-no-focus', metadata: {}, properties: {}, runtimeData: {} }]
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
          nodes: [{ id: 'scene-no-focus', metadata: {}, properties: {}, runtimeData: {} }],
          edges: []
        };
      }
    }
  };

  runtime.sceneEventRuntime = new SceneEventRuntime(runtime);
  runtime.sceneEventSystem = runtime.sceneEventRuntime;

  const inputCameraRuntime = createUniversalInputCameraControlRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.input.camera.control.empty'
  });

  assert.equal(typeof inputCameraRuntime.snapshot().camera.currentMode, 'string');
  assert.equal(Object.keys(inputCameraRuntime.snapshot().camera.focusPointsByObjectId).length, 0);
});
