import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSceneEvent,
  validateSceneEvents,
  rankSceneEvents,
  SceneEventTransitionManager,
  SceneEventDiagnostics,
  buildSceneEventSchedule,
  SceneEventDispatcher,
  SceneEventRuntime,
  createSceneEventRuntime
} from './index.js';
import { TimelineScheduler } from '../timeline/runtime/index.js';

function sampleRuntimeScene() {
  const timelineData = {
    timelineId: 'timeline-1',
    version: 'v2',
    events: [
      { id: 'event-a', type: 'custom-a', time: 100, priority: 1, targets: ['obj-1'], payload: {} },
      { id: 'event-b', type: 'custom-b', time: 100, priority: 3, targets: ['obj-2'], payload: {} }
    ],
    markers: [
      { id: 'marker-a', type: 'chapter', time: 50 },
      { id: 'marker-b', type: 'segment', time: 500 }
    ]
  };

  return {
    sceneId: 'scene-1',
    metadata: {
      timelineData
    },
    graph: {
      toJSON() {
        return {
          nodes: [
            {
              id: 'interaction-1',
              metadata: { sourceKey: 'interactions', index: 0 },
              properties: {
                eventType: 'tap',
                targetObjectId: 'obj-1',
                timeMs: 200,
                priority: 2
              }
            }
          ]
        };
      }
    }
  };
}

test('1 normalize scene event keeps unknown type', () => {
  const event = normalizeSceneEvent({ id: 'x', type: 'unknown-type-xyz', time: 10 }, 0, 'timeline-event');
  assert.equal(event.type, 'unknown-type-xyz');
});

test('2 validate scene events normalizes missing fields', () => {
  const result = validateSceneEvents([{ type: 'x' }], { source: 'legacy-scene' });
  assert.equal(result.status === 'valid' || result.status === 'warning', true);
  assert.equal(result.events.length, 1);
  assert.ok(result.events[0].id);
});

test('3 rank scene events uses time then priority', () => {
  const ranked = rankSceneEvents([
    { id: 'a', timeMs: 10, priority: 1 },
    { id: 'b', timeMs: 10, priority: 5 },
    { id: 'c', timeMs: 5, priority: 1 }
  ]);
  assert.deepEqual(ranked.map((item) => item.id), ['c', 'b', 'a']);
});

test('4 transition manager supports unknown state', () => {
  const transitions = new SceneEventTransitionManager();
  const transition = transitions.setState('event-1', 'FutureState');
  assert.equal(transition.knownState, false);
});

test('5 diagnostics counters increment', () => {
  const diagnostics = new SceneEventDiagnostics();
  diagnostics.markScheduled(2);
  diagnostics.markDispatched({ type: 'unknown' });
  diagnostics.markCompleted();
  diagnostics.markSkipped('skip');
  diagnostics.markFailed(new Error('fail'));
  const snapshot = diagnostics.toJSON();
  assert.equal(snapshot.scheduledCount, 2);
  assert.equal(snapshot.dispatchedCount, 1);
  assert.equal(snapshot.unknownTypeCount, 1);
  assert.equal(snapshot.completedCount, 1);
  assert.equal(snapshot.skippedCount, 1);
  assert.equal(snapshot.failedCount, 1);
});

test('6 scheduler builds from timeline and graph interactions only', () => {
  const schedule = buildSceneEventSchedule(sampleRuntimeScene());
  assert.equal(schedule.summary.timelineEvents, 2);
  assert.equal(schedule.summary.markerEvents, 2);
  assert.equal(schedule.summary.interactionEvents, 1);
  assert.equal(schedule.summary.total, 5);
});

test('7 dispatcher supports wildcard and type channels', () => {
  const dispatcher = new SceneEventDispatcher();
  let allCount = 0;
  let typeCount = 0;
  dispatcher.on('*', () => { allCount += 1; });
  dispatcher.on('type:custom-x', () => { typeCount += 1; });
  dispatcher.dispatch({ id: 'event-1', type: 'custom-x' });
  assert.equal(allCount, 1);
  assert.equal(typeCount, 1);
});

test('8 scene event runtime creates schedule and diagnostics', () => {
  const runtime = new SceneEventRuntime(sampleRuntimeScene());
  const snapshot = runtime.snapshot();
  assert.equal(snapshot.eventCount, 5);
  assert.equal(snapshot.scheduleSummary.total, 5);
  assert.equal(snapshot.diagnostics.scheduledCount, 5);
});

test('9 scene event runtime dispatches by id', () => {
  const runtime = new SceneEventRuntime(sampleRuntimeScene());
  let dispatched = 0;
  runtime.on('SceneEventDispatched', () => { dispatched += 1; });
  runtime.dispatchById('event-a', { trigger: 'test' });
  assert.equal(dispatched, 1);
  assert.equal(runtime.transitions.getState('event-a'), 'completed');
});

test('10 scene event runtime skips unknown ids safely', () => {
  const runtime = new SceneEventRuntime(sampleRuntimeScene());
  const result = runtime.dispatchById('missing-id');
  assert.equal(result, null);
  assert.equal(runtime.snapshot().diagnostics.skippedCount >= 1, true);
});

test('11 scene event runtime tick dispatches due events', () => {
  const runtime = new SceneEventRuntime(sampleRuntimeScene());
  let dispatched = 0;
  runtime.on('SceneEventDispatched', () => { dispatched += 1; });
  runtime.tick(120);
  assert.equal(dispatched >= 3, true);
});

test('12 scene event runtime pause blocks dispatch', () => {
  const runtime = new SceneEventRuntime(sampleRuntimeScene());
  runtime.pause();
  const result = runtime.dispatchById('event-a');
  assert.equal(result, null);
});

test('13 scene event runtime resume allows dispatch again', () => {
  const runtime = new SceneEventRuntime(sampleRuntimeScene());
  runtime.pause();
  runtime.resume();
  const result = runtime.dispatchById('event-a');
  assert.ok(result);
});

test('14 scene event runtime reset re-schedules events', () => {
  const runtime = new SceneEventRuntime(sampleRuntimeScene());
  runtime.tick(1000);
  const before = runtime.snapshot().pendingCount;
  runtime.reset();
  const after = runtime.snapshot().pendingCount;
  assert.equal(before, 0);
  assert.equal(after, 5);
});

test('15 createSceneEventRuntime factory works', () => {
  const runtime = createSceneEventRuntime(sampleRuntimeScene());
  assert.ok(runtime);
  assert.equal(typeof runtime.tick, 'function');
});

test('16 timeline scheduler EventReady triggers scene dispatch', () => {
  const timeline = {
    timelineId: 'timeline-x',
    version: 'v2',
    clips: [{ id: 'clip-1', start: 0, end: 1000, duration: 1000, objects: [], actions: [], events: [], metadata: {} }],
    events: [{ id: 'event-a', type: 'custom-a', time: 100, targets: ['clip-1'], payload: {}, priority: 1, conditions: [], effects: [], metadata: {} }],
    markers: [{ id: 'marker-a', type: 'chapter', time: 0, metadata: {} }]
  };
  const scheduler = new TimelineScheduler(timeline, { startState: 'Ready' });

  const runtimeScene = sampleRuntimeScene();
  runtimeScene.timelineScheduler = scheduler;

  const eventRuntime = new SceneEventRuntime(runtimeScene);
  let dispatched = 0;
  eventRuntime.on('SceneEventDispatched', ({ event }) => {
    if (event.id === 'event-a') dispatched += 1;
  });

  scheduler.play();
  scheduler.tick(150);
  assert.equal(dispatched >= 1, true);
});

test('17 timeline scheduler MarkerReached triggers scene dispatch', () => {
  const timeline = {
    timelineId: 'timeline-y',
    version: 'v2',
    clips: [{ id: 'clip-1', start: 0, end: 1000, duration: 1000, objects: [], actions: [], events: [], metadata: {} }],
    events: [],
    markers: [{ id: 'marker-a', type: 'chapter', time: 0, metadata: {} }]
  };
  const scheduler = new TimelineScheduler(timeline, { startState: 'Ready' });

  const runtimeScene = sampleRuntimeScene();
  runtimeScene.timelineScheduler = scheduler;

  const eventRuntime = new SceneEventRuntime(runtimeScene);
  let dispatched = 0;
  eventRuntime.on('SceneEventDispatched', ({ event }) => {
    if (event.id === 'marker-a') dispatched += 1;
  });

  scheduler.play();
  scheduler.tick(1);
  assert.equal(dispatched >= 1, true);
});

test('18 unknown type dispatch works without code changes', () => {
  const runtime = new SceneEventRuntime(sampleRuntimeScene());
  const event = normalizeSceneEvent({ id: 'future-event', type: 'future.runtime.signal', timeMs: 1, source: 'legacy-scene' });
  let seen = false;
  runtime.on('type:future.runtime.signal', () => {
    seen = true;
  });
  runtime.dispatchEvent(event, { trigger: 'manual' });
  assert.equal(seen, true);
});
