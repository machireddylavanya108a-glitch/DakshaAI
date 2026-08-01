import test from 'node:test';
import assert from 'node:assert/strict';
import {
  TimelinePlaybackState,
  TimelineClock,
  TimelineQueue,
  TimelineCursor,
  buildTimelineExecutionPlan,
  TimelineCheckpointManager,
  TimelinePauseManager,
  TimelineResumeManager,
  TimelineSeekManager,
  TimelineSpeedController,
  TimelineLoopController,
  TimelineBranchController,
  TimelinePlaybackDiagnostics,
  TimelineScheduler,
  createTimelineSynchronizationRuntime,
  TimelineSecurityError,
  TIMELINE_PLAYBACK_STATES,
  TIMELINE_RUNTIME_EVENTS
} from './index.js';

function sampleTimeline(overrides = {}) {
  return {
    timelineId: 'runtime-timeline-1',
    version: 'v2',
    tracks: [
      {
        id: 'track-1',
        name: 'Main',
        purpose: 'generic',
        priority: 1,
        enabled: true,
        events: [],
        clips: [],
        markers: [],
        dependencies: [],
        metadata: {}
      }
    ],
    clips: [
      { id: 'clip-1', start: 0, end: 1000, duration: 1000, priority: 1, objects: [], actions: [], events: [], metadata: {} },
      { id: 'clip-2', start: 1000, end: 2000, duration: 1000, priority: 1, objects: [], actions: [], events: [], metadata: {} }
    ],
    events: [
      { id: 'event-1', type: 'custom', time: 500, targets: ['clip-1'], payload: {}, priority: 2, conditions: [], effects: [], metadata: {} },
      { id: 'event-2', type: 'custom', time: 1200, targets: ['clip-2'], payload: {}, priority: 1, conditions: [], effects: [], metadata: {} }
    ],
    actions: [
      { id: 'action-1', type: 'custom', purpose: 'generic', targets: ['clip-1'], timeMs: 600, priority: 1, parameters: {}, metadata: {} }
    ],
    markers: [
      { id: 'chapter-1', type: 'chapter', time: 0, label: 'Chapter 1', metadata: {} },
      { id: 'marker-1', type: 'section', time: 800, label: 'Section A', metadata: {} }
    ],
    segments: [],
    groups: [],
    dependencies: [],
    metadata: {},
    diagnostics: {},
    ...overrides
  };
}

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
    },
    dump() {
      return new Map(store);
    }
  };
}

test('1 playback state supports known defaults', () => {
  const state = new TimelinePlaybackState();
  assert.equal(state.getState(), 'Idle');
  assert.equal(state.isKnown(), true);
});

test('2 playback state supports unknown future states', () => {
  const state = new TimelinePlaybackState('QuantumPaused');
  assert.equal(state.getState(), 'QuantumPaused');
  assert.equal(state.isKnown(), false);
});

test('3 playback state tracks transitions', () => {
  const state = new TimelinePlaybackState();
  state.transition('Playing');
  state.transition('Paused');
  assert.equal(state.previous, 'Playing');
  assert.equal(state.getState(), 'Paused');
});

test('4 playback state serializes and restores', () => {
  const state = new TimelinePlaybackState();
  state.transition('Ready');
  const restored = TimelinePlaybackState.fromJSON(state.toJSON());
  assert.equal(restored.getState(), 'Ready');
});

test('5 runtime state enum includes required states', () => {
  const required = ['Idle', 'Loading', 'Preparing', 'Ready', 'Playing', 'Paused', 'Seeking', 'Waiting', 'Buffering', 'Completed', 'Cancelled', 'Error'];
  required.forEach((item) => assert.ok(TIMELINE_PLAYBACK_STATES.includes(item)));
});

test('6 runtime event enum includes required events', () => {
  const required = ['TimelineStarted', 'TimelinePaused', 'TimelineResumed', 'TimelineStopped', 'TimelineCompleted', 'ClipStarted', 'ClipCompleted', 'MarkerReached', 'EventReady', 'ActionReady', 'CheckpointReached', 'TimelineError'];
  required.forEach((item) => assert.ok(TIMELINE_RUNTIME_EVENTS.includes(item)));
});

test('7 clock play starts running', () => {
  const clock = new TimelineClock();
  clock.play();
  assert.equal(clock.running, true);
});

test('8 clock pause stops running', () => {
  const clock = new TimelineClock();
  clock.play();
  clock.pause();
  assert.equal(clock.running, false);
});

test('9 clock resume continues running', () => {
  const clock = new TimelineClock();
  clock.play();
  clock.pause();
  clock.resume();
  assert.equal(clock.running, true);
});

test('10 clock seek updates time', () => {
  const clock = new TimelineClock();
  clock.seek(420);
  assert.equal(clock.timeMs, 420);
});

test('11 clock restart resets and runs', () => {
  const clock = new TimelineClock();
  clock.play(400);
  clock.restart();
  assert.equal(clock.timeMs, 0);
  assert.equal(clock.running, true);
});

test('12 clock stop halts without resetting time', () => {
  const clock = new TimelineClock();
  clock.play(100);
  clock.tick(100);
  clock.stop();
  assert.equal(clock.running, false);
  assert.equal(clock.timeMs >= 100, true);
});

test('13 clock reset clears state', () => {
  const clock = new TimelineClock();
  clock.play(100);
  clock.tick(250);
  clock.reset();
  assert.equal(clock.timeMs, 0);
  assert.equal(clock.tickCount, 0);
});

test('14 clock tick is deterministic by delta and speed', () => {
  const clock = new TimelineClock({ speed: 2 });
  clock.play(0);
  clock.tick(100);
  assert.equal(clock.timeMs, 200);
});

test('15 clock jump adjusts by delta', () => {
  const clock = new TimelineClock();
  clock.jump(300);
  assert.equal(clock.timeMs, 300);
});

test('16 queue enqueues priority-aware order', () => {
  const queue = new TimelineQueue();
  queue.enqueue({ id: 'a', timeMs: 1000, priority: 1 });
  queue.enqueue({ id: 'b', timeMs: 1000, priority: 5 });
  assert.equal(queue.peek().id, 'b');
});

test('17 queue drains by time threshold', () => {
  const queue = new TimelineQueue();
  queue.enqueue({ id: 'a', timeMs: 100 });
  queue.enqueue({ id: 'b', timeMs: 200 });
  const drained = queue.drainUntil(150);
  assert.equal(drained.length, 1);
  assert.equal(drained[0].id, 'a');
});

test('18 queue removeWhere removes matching items', () => {
  const queue = new TimelineQueue();
  queue.enqueue({ id: 'a', kind: 'event' });
  queue.enqueue({ id: 'b', kind: 'clip' });
  const removed = queue.removeWhere((item) => item.kind === 'event');
  assert.equal(removed, 1);
});

test('19 queue clear empties all items', () => {
  const queue = new TimelineQueue();
  queue.enqueue({ id: 'a' });
  queue.clear();
  assert.equal(queue.depth(), 0);
});

test('20 queue builds from timeline', () => {
  const queue = TimelineQueue.fromTimeline(sampleTimeline());
  assert.equal(queue.depth() >= 1, true);
});

test('21 cursor tracks current clip', () => {
  const cursor = new TimelineCursor(sampleTimeline());
  const snapshot = cursor.update(200);
  assert.equal(snapshot.currentClip.id, 'clip-1');
});

test('22 cursor tracks current event', () => {
  const cursor = new TimelineCursor(sampleTimeline());
  const snapshot = cursor.update(1300);
  assert.equal(snapshot.currentEvent.id, 'event-2');
});

test('23 cursor tracks current marker/chapter', () => {
  const cursor = new TimelineCursor(sampleTimeline());
  const snapshot = cursor.update(900);
  assert.equal(snapshot.currentMarker.id, 'marker-1');
  assert.equal(snapshot.currentChapter.id, 'chapter-1');
});

test('24 cursor computes progress and remaining time', () => {
  const cursor = new TimelineCursor(sampleTimeline());
  const snapshot = cursor.update(1000);
  assert.equal(snapshot.progress > 0, true);
  assert.equal(snapshot.remainingTimeMs >= 0, true);
});

test('25 execution plan sorts by time then priority', () => {
  const plan = buildTimelineExecutionPlan(sampleTimeline());
  assert.equal(plan.items[0].timeMs <= plan.items[1].timeMs, true);
});

test('26 execution plan keeps dependency map', () => {
  const plan = buildTimelineExecutionPlan(sampleTimeline({ dependencies: [{ id: 'd1', type: 'requires', from: 'clip-1', to: 'event-2' }] }));
  assert.ok(plan.dependencyMap.has('event-2'));
});

test('27 checkpoint manager supports manual checkpoint', () => {
  const manager = new TimelineCheckpointManager();
  const checkpoint = manager.createCheckpoint({ type: 'manual', timeMs: 120 });
  assert.equal(checkpoint.type, 'manual');
});

test('28 checkpoint manager supports automatic checkpoint', () => {
  const manager = new TimelineCheckpointManager({ autoIntervalMs: 100 });
  const one = manager.createAutomaticCheckpoint(200, {});
  assert.ok(one);
});

test('29 checkpoint manager supports unknown checkpoint types', () => {
  const manager = new TimelineCheckpointManager();
  const checkpoint = manager.createCheckpoint({ type: 'future-checkpoint', timeMs: 1 });
  assert.equal(checkpoint.type, 'future-checkpoint');
});

test('30 checkpoint manager restores serialized checkpoints', () => {
  const manager = new TimelineCheckpointManager();
  manager.restore([{ id: 'x', type: 'lesson', timeMs: 50, state: {} }]);
  assert.equal(manager.latest().id, 'x');
});

test('31 pause manager pauses scheduler state', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.play();
  new TimelinePauseManager().pause({ scheduler, reason: 'test' });
  assert.equal(scheduler.playbackState.getState(), 'Paused');
});

test('32 resume manager resumes scheduler state', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.play();
  scheduler.pause();
  new TimelineResumeManager().resume({ scheduler, reason: 'test' });
  assert.equal(scheduler.playbackState.getState(), 'Playing');
});

test('33 seek manager seek by time', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.seekByTime(700);
  assert.equal(scheduler.clock.timeMs, 700);
});

test('34 seek manager seek by marker', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.seekByMarker('marker-1');
  assert.equal(scheduler.clock.timeMs, 800);
});

test('35 seek manager seek by clip', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.seekByClip('clip-2');
  assert.equal(scheduler.clock.timeMs, 1000);
});

test('36 seek manager seek by event', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.seekByEvent('event-2');
  assert.equal(scheduler.clock.timeMs, 1200);
});

test('37 seek manager seek by chapter', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.seekByChapter('chapter-1');
  assert.equal(scheduler.clock.timeMs, 0);
});

test('38 seek manager seek by percentage', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.seekByPercentage(0.5);
  assert.equal(scheduler.clock.timeMs, 1000);
});

test('39 speed controller supports presets and custom', () => {
  const speed = new TimelineSpeedController();
  speed.setSpeed(2);
  assert.equal(speed.isPreset(), true);
  speed.setSpeed(3.25);
  assert.equal(speed.isPreset(), false);
});

test('40 scheduler supports configured speed range values', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 4].forEach((value) => {
    scheduler.setSpeed(value);
    assert.equal(scheduler.clock.speed, value);
  });
});

test('41 loop controller repeat clip mode', () => {
  const loop = new TimelineLoopController();
  loop.setMode('repeat-clip');
  const should = loop.shouldLoop({
    currentClip: { start: 0, end: 10 },
    timeMs: 10,
    remainingTimeMs: 0
  });
  assert.equal(should, true);
});

test('42 loop controller repeat section mode', () => {
  const loop = new TimelineLoopController();
  loop.setMode('repeat-section');
  const should = loop.shouldLoop({
    currentChapter: { time: 5 },
    timeMs: 20,
    remainingTimeMs: 0
  });
  assert.equal(should, true);
});

test('43 loop controller repeat lesson mode', () => {
  const loop = new TimelineLoopController();
  loop.setMode('repeat-lesson');
  assert.equal(loop.shouldLoop({ remainingTimeMs: 0 }), true);
});

test('44 loop controller repeat range mode', () => {
  const loop = new TimelineLoopController();
  loop.setMode('repeat-range', { startMs: 100, endMs: 200 });
  assert.equal(loop.shouldLoop({ timeMs: 201 }), true);
  assert.equal(loop.resolveLoopTime({}), 100);
});

test('45 branch controller supports branch selection', () => {
  const branch = new TimelineBranchController();
  branch.setBranch('branch-a', 'test');
  assert.equal(branch.activeBranchId, 'branch-a');
});

test('46 branch controller filters items by branch', () => {
  const branch = new TimelineBranchController();
  branch.setBranch('b');
  const filtered = branch.filterItemsByBranch([
    { payload: { branch: 'b' } },
    { payload: { branch: 'x' } },
    { payload: {} }
  ]);
  assert.equal(filtered.length, 2);
});

test('47 diagnostics collects scheduler sample metrics', () => {
  const diagnostics = new TimelinePlaybackDiagnostics({ fpsTarget: 30 });
  diagnostics.sample({ schedulerLatencyMs: 7, queueDepth: 10, playbackState: 'Playing', timelineDriftMs: 3, repairCount: 1 });
  assert.equal(diagnostics.toJSON().fpsTarget, 30);
  assert.equal(diagnostics.toJSON().queueDepth, 10);
});

test('48 diagnostics stores warnings and errors', () => {
  const diagnostics = new TimelinePlaybackDiagnostics();
  diagnostics.addWarning('w');
  diagnostics.addError('e');
  assert.equal(diagnostics.warnings.length, 1);
  assert.equal(diagnostics.errors.length, 1);
});

test('49 scheduler play emits TimelineStarted', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  let emitted = false;
  scheduler.on('TimelineStarted', () => { emitted = true; });
  scheduler.play();
  assert.equal(emitted, true);
});

test('50 scheduler pause emits TimelinePaused', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  let emitted = false;
  scheduler.play();
  scheduler.on('TimelinePaused', () => { emitted = true; });
  scheduler.pause();
  assert.equal(emitted, true);
});

test('51 scheduler resume emits TimelineResumed', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  let emitted = false;
  scheduler.play();
  scheduler.pause();
  scheduler.on('TimelineResumed', () => { emitted = true; });
  scheduler.resume();
  assert.equal(emitted, true);
});

test('52 scheduler stop emits TimelineStopped', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  let emitted = false;
  scheduler.play();
  scheduler.on('TimelineStopped', () => { emitted = true; });
  scheduler.stop();
  assert.equal(emitted, true);
});

test('53 scheduler tick emits marker and event and action readiness', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  const received = [];
  scheduler.on('MarkerReached', () => received.push('marker'));
  scheduler.on('EventReady', () => received.push('event'));
  scheduler.on('ActionReady', () => received.push('action'));
  scheduler.play();
  scheduler.tick(900);
  assert.equal(received.includes('marker'), true);
  assert.equal(received.includes('event'), true);
  assert.equal(received.includes('action'), true);
});

test('54 scheduler emits clip transitions', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  let started = 0;
  let completed = 0;
  scheduler.on('ClipStarted', () => { started += 1; });
  scheduler.on('ClipCompleted', () => { completed += 1; });
  scheduler.play();
  scheduler.tick(1200);
  assert.equal(started >= 1, true);
  assert.equal(completed >= 1, true);
});

test('55 scheduler supports unknown runtime events', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  let emitted = false;
  scheduler.on('FutureRuntimeEvent', () => { emitted = true; });
  scheduler.emitRuntimeEvent('FutureRuntimeEvent', { ok: true });
  assert.equal(emitted, true);
});

test('56 scheduler dependency requires blocks unresolved items', () => {
  const scheduler = new TimelineScheduler(sampleTimeline({
    dependencies: [{ id: 'd1', type: 'requires', from: 'clip-missing', to: 'event-1' }]
  }));

  let eventReady = false;
  scheduler.on('EventReady', ({ payload }) => {
    if (payload?.eventId === 'event-1') eventReady = true;
  });

  scheduler.play();
  scheduler.tick(600);
  assert.equal(eventReady, false);
});

test('57 scheduler dependency optional does not block', () => {
  const scheduler = new TimelineScheduler(sampleTimeline({
    dependencies: [{ id: 'd1', type: 'optional', from: 'clip-missing', to: 'event-1' }]
  }));

  let eventReady = false;
  scheduler.on('EventReady', ({ payload }) => {
    if (payload?.eventId === 'event-1') eventReady = true;
  });

  scheduler.play();
  scheduler.tick(600);
  assert.equal(eventReady, true);
});

test('58 scheduler dependency parallel allows scheduling', () => {
  const scheduler = new TimelineScheduler(sampleTimeline({
    dependencies: [{ id: 'd1', type: 'parallel', from: 'clip-missing', to: 'event-1' }]
  }));

  let eventReady = false;
  scheduler.on('EventReady', ({ payload }) => {
    if (payload?.eventId === 'event-1') eventReady = true;
  });

  scheduler.play();
  scheduler.tick(600);
  assert.equal(eventReady, true);
});

test('59 scheduler persistence snapshot includes required fields', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.play();
  scheduler.tick(300);
  const snapshot = scheduler.createPersistenceSnapshot();
  assert.equal(typeof snapshot.currentTimeMs, 'number');
  assert.ok('currentClipId' in snapshot);
  assert.ok('progress' in snapshot);
  assert.ok('speed' in snapshot);
  assert.ok('activeMarkerId' in snapshot);
  assert.ok('checkpointId' in snapshot);
  assert.ok('resumePositionMs' in snapshot);
});

test('60 scheduler persists and recovers after refresh/reload/shutdown', () => {
  const adapter = createMemoryAdapter();
  const one = new TimelineScheduler(sampleTimeline(), { persistenceAdapter: adapter });
  one.play();
  one.tick(777);
  one.persist();

  const two = new TimelineScheduler(sampleTimeline(), { persistenceAdapter: adapter });
  const recovered = two.recover();
  assert.equal(recovered, true);
  assert.equal(two.clock.timeMs, 777);
});

test('61 scheduler recover handles invalid checkpoint safely', () => {
  const adapter = createMemoryAdapter();
  const scheduler = new TimelineScheduler(sampleTimeline(), { persistenceAdapter: adapter });
  adapter.setItem('daksha.timeline.runtime.v1', JSON.stringify({ currentTimeMs: 111, checkpointId: 'missing-checkpoint', playbackState: 'Paused' }));
  const recovered = scheduler.recover();
  assert.equal(recovered, true);
  assert.equal(scheduler.diagnostics.warnings.length >= 1, true);
});

test('62 scheduler emits checkpoint reached on manual checkpoint', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  let emitted = false;
  scheduler.on('CheckpointReached', () => { emitted = true; });
  scheduler.createCheckpoint('assessment', { score: 1 });
  assert.equal(emitted, true);
});

test('63 scheduler supports automatic/manual/resume/lesson/assessment checkpoints', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.createCheckpoint('manual');
  scheduler.createCheckpoint('resume');
  scheduler.createCheckpoint('lesson');
  scheduler.createCheckpoint('assessment');
  scheduler.tick(11000);
  assert.equal(scheduler.checkpoints.toJSON().length >= 4, true);
});

test('64 scheduler restart resets completion state and starts again', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.play();
  scheduler.tick(2000);
  scheduler.restart();
  assert.equal(scheduler.clock.timeMs, 0);
  assert.equal(scheduler.playbackState.getState(), 'Playing');
});

test('65 scheduler reset moves to idle', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.play();
  scheduler.tick(500);
  scheduler.reset();
  assert.equal(scheduler.playbackState.getState(), 'Idle');
  assert.equal(scheduler.clock.timeMs, 0);
});

test('66 scheduler seek sets seeking then paused state', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.play();
  scheduler.seekByTime(100);
  assert.equal(scheduler.playbackState.getState(), 'Paused');
});

test('67 scheduler supports unknown playback state persistence', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.applyPersistenceSnapshot({ currentTimeMs: 10, playbackState: 'FutureState' });
  assert.equal(scheduler.playbackState.getState(), 'FutureState');
});

test('68 scheduler supports wildcard listener', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  let count = 0;
  scheduler.on('*', () => { count += 1; });
  scheduler.play();
  assert.equal(count >= 1, true);
});

test('69 scheduler supports custom speed values', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.setSpeed(3.5);
  scheduler.play();
  scheduler.tick(100);
  assert.equal(scheduler.clock.timeMs, 350);
});

test('70 scheduler loop repeat-lesson seeks to start when complete', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.setLoop('repeat-lesson');
  scheduler.play();
  scheduler.tick(2500);
  assert.equal(scheduler.clock.timeMs <= 2000, true);
});

test('71 scheduler handles network interruption style stop and recover', () => {
  const adapter = createMemoryAdapter();
  const scheduler = new TimelineScheduler(sampleTimeline(), { persistenceAdapter: adapter });
  scheduler.play();
  scheduler.tick(900);
  scheduler.persist();
  scheduler.stop('network-interruption');

  const recovered = new TimelineScheduler(sampleTimeline(), { persistenceAdapter: adapter });
  assert.equal(recovered.recover(), true);
  assert.equal(recovered.clock.timeMs, 900);
});

test('72 scheduler diagnostics captures queue depth and drift', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.play();
  scheduler.tick(100);
  const diagnostics = scheduler.snapshot().diagnostics;
  assert.equal(typeof diagnostics.queueDepth, 'number');
  assert.equal(typeof diagnostics.timelineDriftMs, 'number');
});

test('73 scheduler rejects function payloads for security', () => {
  assert.throws(
    () => new TimelineScheduler(sampleTimeline({ metadata: { fn: () => {} } })),
    TimelineSecurityError
  );
});

test('74 scheduler rejects eval-like strings for security', () => {
  assert.throws(
    () => new TimelineScheduler(sampleTimeline({ metadata: { bad: 'eval(alert(1))' } })),
    TimelineSecurityError
  );
});

test('75 scheduler rejects script strings for security', () => {
  assert.throws(
    () => new TimelineScheduler(sampleTimeline({ metadata: { bad: '<script>alert(1)</script>' } })),
    TimelineSecurityError
  );
});

test('76 scheduler rejects unsafe callback urls for security', () => {
  assert.throws(
    () => new TimelineScheduler(sampleTimeline({ metadata: { callback: 'javascript:alert(1)' } })),
    TimelineSecurityError
  );
});

test('77 scheduler rejects prototype pollution for security', () => {
  const pollutedMetadata = JSON.parse('{"__proto__":{"polluted":true}}');
  assert.throws(
    () => new TimelineScheduler({ ...sampleTimeline(), metadata: pollutedMetadata }),
    TimelineSecurityError
  );
});

test('78 supported runtime events expose extensible list', () => {
  const events = TimelineScheduler.supportedRuntimeEvents();
  assert.equal(Array.isArray(events), true);
  assert.equal(events.includes('TimelineStarted'), true);
});

test('79 scheduler queue includes clips events markers actions branches dependencies metadata', () => {
  const scheduler = new TimelineScheduler(sampleTimeline({
    dependencies: [{ id: 'd1', type: 'before', from: 'clip-1', to: 'event-2' }]
  }));

  const snapshot = scheduler.snapshot();
  assert.equal(snapshot.queueDepth > 0, true);
  assert.equal(Array.isArray(snapshot.blockedRefs), true);
  assert.equal(Array.isArray(snapshot.completedRefs), true);
});

test('80 scheduler completes timeline and emits completion event', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  let completed = false;
  scheduler.on('TimelineCompleted', () => { completed = true; });
  scheduler.play();
  scheduler.tick(2500);
  assert.equal(completed, true);
  assert.equal(scheduler.playbackState.getState(), 'Completed');
});

test('81 scheduler seek by checkpoint uses checkpoint timeline position', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.play();
  scheduler.seekByTime(650);
  scheduler.createCheckpoint('resume');
  scheduler.seekByTime(1200);
  scheduler.seekByCheckpoint();
  assert.equal(scheduler.clock.timeMs, 650);
});

test('82 scheduler replay starts from provided time', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.replay(300);
  assert.equal(scheduler.clock.timeMs, 300);
  assert.equal(scheduler.playbackState.getState(), 'Playing');
});

test('83 persistence snapshot includes checkpoint list', () => {
  const scheduler = new TimelineScheduler(sampleTimeline());
  scheduler.createCheckpoint('manual', { note: 'checkpoint' });
  const snapshot = scheduler.createPersistenceSnapshot();
  assert.equal(Array.isArray(snapshot.checkpoints), true);
  assert.equal(snapshot.checkpoints.length >= 1, true);
});

test('84 synchronization runtime updates shared adapter state', () => {
  const scheduler = new TimelineScheduler(sampleTimeline(), {
    persistenceAdapter: createMemoryAdapter()
  });

  const runtime = {
    sceneId: 'scene-sync-1',
    timelineScheduler: scheduler,
    metadata: {
      visualizationStrategy: {
        schemaVersion: 'v2',
        primaryStrategy: {
          strategyId: 'strategy-1',
          visualizationStyle: 'adaptive visualization',
          sceneComplexity: 'medium',
          interactionLevel: 'medium',
          animationIntensity: 'medium',
          cameraStrategy: 'adaptive-context-camera',
          narrationStrategy: 'concept-first narration',
          timelineStrategy: 'checkpoint-driven',
          objectDensity: 'medium',
          renderingPriority: 'balanced',
          simulationRequirements: {
            required: false,
            mode: 'not-required',
            parameters: { supportsUnknownStates: true }
          },
          learningMode: 'guided-learning',
          reasoningStrategy: 'conceptual-reasoning',
          confidenceScore: 0.66
        },
        strategies: [],
        confidenceScore: 0.66
      },
      capabilityTemplateRecommendation: {
        schemaVersion: 'v2',
        recommendedCapabilities: [],
        recommendedTemplates: [],
        requiredEducationalObjects: {
          objectCountHint: 1,
          objectTypes: [],
          requiresHierarchy: false,
          requiresRelationshipEdges: false,
          supportsUnknownObjectTypes: true
        },
        animationCapabilities: [],
        interactionCapabilities: [],
        simulationCapabilities: [],
        assessmentCapabilities: [],
        narrationCapabilities: [],
        confidenceScore: 0.6,
        fallbackStrategy: {
          mode: 'template-recommendation',
          recommendProceduralGeneration: false,
          reason: 'templates-available',
          fallbackTemplateId: '',
          confidence: 0.6,
          supportsUnknownFutureTypes: true
        },
        diagnostics: {},
        metadata: {}
      },
      confidenceConflictFallback: {
        schemaVersion: 'v2',
        overallConfidence: 0.55,
        reasoningConfidence: 0.6,
        visualizationConfidence: 0.58,
        templateConfidence: 0.52,
        interactionConfidence: 0.5,
        narrationConfidence: 0.54,
        recoveryConfidence: 0.63,
        additionalConfidenceMetrics: [],
        conflicts: [],
        conflictResolution: {
          resolutions: [],
          unresolved: [],
          allResolved: true
        },
        fallbackPlan: {
          recommended: false,
          reason: 'confidence-acceptable',
          actions: [],
          preserveLearningQuality: true,
          supportsUnknownFutureFallbackModes: true
        },
        diagnostics: {},
        metadata: {}
      },
      timeline: {
        timelineId: 'runtime-timeline-1',
        version: 'v2',
        trackIds: ['track-1'],
        clipIds: ['clip-1', 'clip-2'],
        markerIds: ['chapter-1', 'marker-1'],
        eventIds: ['event-1', 'event-2']
      },
      rendererAdapter: {
        timeline: {}
      }
    },
    graph: {
      nodes: new Map([['scene-sync-1', {}], ['clip-1', {}]]),
      edges: [{ from: 'scene-sync-1', to: 'clip-1' }],
      getNodeCount() {
        return 2;
      },
      getRelationshipCount() {
        return 1;
      }
    }
  };

  const synchronization = createTimelineSynchronizationRuntime(runtime, {
    persistenceAdapter: scheduler.persistenceAdapter,
    persistenceKey: 'daksha.timeline.runtime.sync-test'
  });

  scheduler.play();
  scheduler.tick(500);
  const state = synchronization.synchronize('test');
  assert.equal(state.adapters.rendererAdapter.timeMs, 500);
  assert.equal(state.adapters.aiTeacher.state, 'Playing');
  assert.equal(state.visualizationStrategy.primaryStrategy.visualizationStyle, 'adaptive visualization');
  assert.equal(state.adapters.aiTeacher.visualizationStrategyState.primaryStrategy.visualizationStyle, 'adaptive visualization');
  assert.equal(state.adapters.rendererAdapter.visualizationStrategyState.primaryStrategy.visualizationStyle, 'adaptive visualization');
  assert.equal(state.adapters.interactionEngine.visualizationStrategyState.primaryStrategy.visualizationStyle, 'adaptive visualization');
  assert.equal(state.capabilityTemplateRecommendation.schemaVersion, 'v2');
  assert.equal(state.adapters.aiTeacher.capabilityTemplateRecommendationState.schemaVersion, 'v2');
  assert.equal(state.adapters.rendererAdapter.capabilityTemplateRecommendationState.schemaVersion, 'v2');
  assert.equal(state.adapters.interactionEngine.capabilityTemplateRecommendationState.schemaVersion, 'v2');
  assert.equal(state.confidenceConflictFallback.schemaVersion, 'v2');
  assert.equal(state.adapters.aiTeacher.confidenceConflictFallbackState.schemaVersion, 'v2');
  assert.equal(state.adapters.rendererAdapter.confidenceConflictFallbackState.schemaVersion, 'v2');
  assert.equal(state.adapters.interactionEngine.confidenceConflictFallbackState.schemaVersion, 'v2');
});

test('85 synchronization runtime persists and recovers shared session', () => {
  const adapter = createMemoryAdapter();
  const schedulerOne = new TimelineScheduler(sampleTimeline(), {
    persistenceAdapter: adapter
  });

  const runtimeOne = {
    sceneId: 'scene-sync-recover',
    timelineScheduler: schedulerOne,
    metadata: {
      timeline: {
        timelineId: 'runtime-timeline-1',
        version: 'v2',
        trackIds: ['track-1'],
        clipIds: ['clip-1', 'clip-2'],
        markerIds: ['chapter-1', 'marker-1'],
        eventIds: ['event-1', 'event-2']
      },
      rendererAdapter: {
        timeline: {}
      }
    },
    graph: {
      nodes: new Map([['scene-sync-recover', {}], ['clip-1', {}]]),
      edges: [{ from: 'scene-sync-recover', to: 'clip-1' }],
      getNodeCount() {
        return 2;
      },
      getRelationshipCount() {
        return 1;
      }
    }
  };

  const syncOne = createTimelineSynchronizationRuntime(runtimeOne, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.timeline.runtime.sync-recover'
  });

  schedulerOne.play();
  schedulerOne.seekByTime(880);
  schedulerOne.createCheckpoint('resume');
  syncOne.persistSession();

  const schedulerTwo = new TimelineScheduler(sampleTimeline(), {
    persistenceAdapter: adapter
  });
  const runtimeTwo = {
    ...runtimeOne,
    timelineScheduler: schedulerTwo
  };

  const syncTwo = createTimelineSynchronizationRuntime(runtimeTwo, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.timeline.runtime.sync-recover'
  });

  const recovered = syncTwo.recoverSession();
  assert.equal(recovered, true);
  assert.equal(schedulerTwo.clock.timeMs, 880);
  assert.equal(syncTwo.getSharedState().session.recovered, true);
});

test('86 synchronization runtime propagates animation timeline integration state across adapters', () => {
  const scheduler = new TimelineScheduler(sampleTimeline(), {
    persistenceAdapter: createMemoryAdapter()
  });

  const animationTimelineIntegrationRuntime = {
    on(_channel, listener) {
      listener({
        channel: 'animation-timeline-synchronized',
        payload: {
          reason: 'unit-test'
        }
      });
      return () => {};
    },
    snapshot() {
      return {
        schemaVersion: 'v1',
        timeline: {
          playbackState: 'Playing',
          timeMs: 420
        },
        animations: {
          source: 'timeline-events-only',
          processedTriggers: [{ eventName: 'EventReady' }]
        },
        interactions: {
          selection: ['obj-1']
        }
      };
    }
  };

  const runtime = {
    sceneId: 'scene-sync-animation-runtime',
    timelineScheduler: scheduler,
    animationTimelineIntegrationRuntime,
    metadata: {
      timeline: {
        timelineId: 'runtime-timeline-1',
        version: 'v2',
        trackIds: ['track-1'],
        clipIds: ['clip-1', 'clip-2'],
        markerIds: ['chapter-1', 'marker-1'],
        eventIds: ['event-1', 'event-2']
      },
      rendererAdapter: {},
      aiTeacherAdapter: {}
    },
    graph: {
      nodes: new Map([['scene-sync-animation-runtime', {}], ['obj-1', {}]]),
      edges: [{ from: 'scene-sync-animation-runtime', to: 'obj-1' }],
      getNodeCount() {
        return 2;
      },
      getRelationshipCount() {
        return 1;
      }
    }
  };

  const synchronization = createTimelineSynchronizationRuntime(runtime, {
    persistenceAdapter: scheduler.persistenceAdapter,
    persistenceKey: 'daksha.timeline.runtime.sync-animation-integration'
  });

  const state = synchronization.synchronize('unit-test');
  assert.equal(typeof state.animationTimelineIntegration, 'object');
  assert.equal(state.animationTimelineIntegration.animations.source, 'timeline-events-only');
  assert.equal(typeof state.adapters.rendererAdapter.animationTimelineIntegrationState, 'object');
  assert.equal(typeof state.adapters.aiTeacher.animationTimelineIntegrationState, 'object');
  assert.equal(runtime.metadata.rendererAdapter.animationTimelineIntegrationState.animations.source, 'timeline-events-only');
  assert.equal(runtime.metadata.aiTeacherAdapter.animationTimelineIntegrationState.animations.source, 'timeline-events-only');
});
