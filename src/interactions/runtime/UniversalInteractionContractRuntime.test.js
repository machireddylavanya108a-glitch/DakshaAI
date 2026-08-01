import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { TimelineScheduler, createTimelineSynchronizationRuntime } from '../../timeline/runtime/index.js';
import { SceneEventRuntime } from '../../scene-events/index.js';
import { createUniversalInteractionContractRuntime } from './index.js';

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
    timelineId: 'interaction-runtime-timeline',
    version: 'v2',
    tracks: [
      {
        id: 'track-1',
        name: 'Main',
        purpose: 'generic',
        enabled: true,
        priority: 1,
        clips: [{ id: 'clip-1', start: 0, end: 6000, duration: 6000, objects: [] }],
        events: [{ id: 'event-1', type: 'custom', time: 200, targets: ['clip-1'] }],
        markers: [{ id: 'marker-1', type: 'chapter', time: 0 }],
        dependencies: [],
        metadata: {}
      }
    ],
    clips: [{ id: 'clip-1', start: 0, end: 6000, duration: 6000, objects: [], actions: [], events: [], metadata: {} }],
    events: [{ id: 'event-1', type: 'custom', time: 200, targets: ['clip-1'], payload: {}, priority: 1 }],
    markers: [{ id: 'marker-1', type: 'chapter', time: 0, metadata: {} }],
    actions: [],
    segments: [],
    groups: [],
    dependencies: [],
    metadata: {}
  };
}

function createInteractionNode(id, properties = {}) {
  return {
    id,
    metadata: {
      sourceKey: 'interactions'
    },
    properties: {
      id,
      ...properties
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

  const graphNodes = new Map([
    ['scene-1', { id: 'scene-1', runtimeData: {}, properties: {}, metadata: {} }],
    ['obj-1', { id: 'obj-1', runtimeData: {}, properties: {}, metadata: { sourceKey: 'objects' } }],
    ['obj-2', { id: 'obj-2', runtimeData: {}, properties: {}, metadata: { sourceKey: 'objects' } }],
    ['interaction-1', createInteractionNode('interaction-1', { type: 'click', targetObjectId: 'obj-1', checkpointPolicy: { onInteract: true } })],
    ['interaction-2', createInteractionNode('interaction-2', { eventType: 'focus', targetObjectIds: ['obj-2'] })]
  ]);

  if (Array.isArray(options.additionalInteractions)) {
    options.additionalInteractions.forEach((item, index) => {
      graphNodes.set(`interaction-extra-${index + 1}`, createInteractionNode(`interaction-extra-${index + 1}`, item));
    });
  }

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
      nodes: graphNodes,
      edges: [{ from: 'scene-1', relation: 'Contains', to: 'obj-1' }],
      getNodeCount() {
        return graphNodes.size;
      },
      getRelationshipCount() {
        return 1;
      },
      toJSON() {
        return {
          nodes: [...graphNodes.values()],
          edges: [{ from: 'scene-1', relation: 'Contains', to: 'obj-1' }]
        };
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

  const interactionRuntime = createUniversalInteractionContractRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.persistenceKey || 'daksha.interaction.contract.test'
  });

  runtime.interactionContractRuntime = interactionRuntime;

  const timelineSync = createTimelineSynchronizationRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: options.timelineSyncKey || 'daksha.timeline.interaction.sync-test'
  });

  runtime.timelineSynchronizationRuntime = timelineSync;

  return {
    runtime,
    scheduler,
    interactionRuntime,
    timelineSync,
    adapter
  };
}

test('interaction contract registration maps contracts to target objects', () => {
  const harness = createHarness();
  const snapshot = harness.interactionRuntime.snapshot();

  assert.equal(snapshot.metrics.contractCount >= 2, true);
  assert.equal(Array.isArray(snapshot.contracts.byObjectId['obj-1']), true);
  assert.equal(snapshot.contracts.byObjectId['obj-1'].some((contract) => contract.type === 'click'), true);
});

test('interaction contract validation rejects missing target object ids', () => {
  const harness = createHarness();

  const validation = harness.interactionRuntime.validateContract({
    id: 'invalid-contract',
    type: 'inspect',
    targetObjectIds: []
  });

  assert.equal(validation.valid, false);
  assert.equal(validation.errors.length >= 1, true);
});

test('unknown interaction types are preserved through generic metadata', () => {
  const harness = createHarness({
    additionalInteractions: [
      {
        id: 'future-interaction-1',
        type: 'gesture-orbit-scan',
        targetObjectId: 'obj-1'
      }
    ]
  });

  const snapshot = harness.interactionRuntime.snapshot();
  assert.equal(snapshot.unknownInteractionTypes.includes('gesture-orbit-scan'), true);
});

test('interaction runtime emits structured runtime events only', () => {
  const harness = createHarness();

  const event = harness.interactionRuntime.emitInteractionEvent({
    contractId: 'interaction-1',
    type: 'click',
    targetObjectIds: ['obj-1'],
    payload: {
      sample: true
    }
  });

  assert.equal(typeof event.eventId, 'string');
  assert.equal(event.type, 'click');
  assert.equal(event.metadata.runtime, 'universal-interaction-contract');
  assert.equal(typeof event.payload, 'object');
  assert.equal('function' in event, false);
});

test('interaction runtime creates checkpoints from checkpoint-aware contracts', () => {
  const harness = createHarness();
  const before = harness.scheduler.checkpoints.toJSON().length;

  harness.interactionRuntime.emitInteractionEvent({
    contractId: 'interaction-1',
    type: 'click',
    targetObjectIds: ['obj-1']
  });

  const after = harness.scheduler.checkpoints.toJSON().length;
  assert.equal(after > before, true);
  assert.equal(typeof harness.interactionRuntime.snapshot().recovery.lastCheckpointId, 'string');
});

test('interaction runtime persists and recovers state', () => {
  const adapter = createMemoryAdapter();

  const first = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.interaction.contract.restore',
    timelineSyncKey: 'daksha.timeline.interaction.restore-sync'
  });

  first.scheduler.seekByTime(2550);
  first.interactionRuntime.emitInteractionEvent({
    contractId: 'interaction-2',
    type: 'focus',
    targetObjectIds: ['obj-2']
  });
  first.interactionRuntime.persistSession();

  const second = createHarness({
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.interaction.contract.restore',
    timelineSyncKey: 'daksha.timeline.interaction.restore-sync'
  });

  const recovered = second.interactionRuntime.recoverSession();
  assert.equal(recovered, true);
  assert.equal(second.interactionRuntime.snapshot().timelineTimeMs, 2550);
  assert.equal(second.interactionRuntime.snapshot().recovery.interrupted, true);
  assert.equal(second.interactionRuntime.snapshot().events.recent.length >= 1, true);
});

test('interaction runtime updates timeline synchronization shared state handoff', () => {
  const harness = createHarness();

  harness.interactionRuntime.emitInteractionEvent({
    contractId: 'interaction-2',
    type: 'focus',
    targetObjectIds: ['obj-2']
  });

  const shared = harness.timelineSync.synchronize('interaction-test');

  assert.ok(shared.interactionContract);
  assert.ok(shared.adapters.aiTeacher.interactionContractState);
  assert.ok(shared.adapters.rendererAdapter.interactionContractState);
  assert.ok(shared.adapters.interactionEngine.interactionContractState);
  assert.equal(shared.interactionContract.metrics.eventCount >= 1, true);
});

test('backward compatibility keeps runtime stable when no interaction nodes exist', () => {
  const adapter = createMemoryAdapter();
  const timeline = timelineFixture();
  const scheduler = new TimelineScheduler(timeline, {
    startState: 'Ready',
    persistenceAdapter: adapter
  });

  const runtime = {
    sceneId: 'scene-no-interactions',
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
      nodes: new Map([
        ['scene-no-interactions', { id: 'scene-no-interactions', runtimeData: {}, properties: {}, metadata: {} }],
        ['obj-1', { id: 'obj-1', runtimeData: {}, properties: {}, metadata: { sourceKey: 'objects' } }]
      ]),
      edges: [],
      getNodeCount() {
        return 2;
      },
      getRelationshipCount() {
        return 0;
      },
      toJSON() {
        return {
          nodes: [
            { id: 'scene-no-interactions', runtimeData: {}, properties: {}, metadata: {} },
            { id: 'obj-1', runtimeData: {}, properties: {}, metadata: { sourceKey: 'objects' } }
          ],
          edges: []
        };
      }
    }
  };

  runtime.sceneEventRuntime = new SceneEventRuntime(runtime);
  runtime.sceneEventSystem = runtime.sceneEventRuntime;

  const interactionRuntime = createUniversalInteractionContractRuntime(runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.interaction.contract.empty'
  });

  assert.equal(interactionRuntime.snapshot().metrics.contractCount, 0);
  assert.equal(interactionRuntime.snapshot().coverageScore, 1);
});

test('implementation has no hardcoded subject mapping patterns', () => {
  const source = fs.readFileSync(new URL('./UniversalInteractionContractRuntime.js', import.meta.url), 'utf8');
  const forbiddenPattern = /if\s*\(\s*(?:subject|domain|topic)\s*={0,2}\s*['\"][^'\"]+['\"]\s*\)/i;
  assert.equal(forbiddenPattern.test(source), false);
});
