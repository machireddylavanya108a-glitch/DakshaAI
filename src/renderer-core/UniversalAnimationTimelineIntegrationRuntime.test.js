import test from 'node:test';
import assert from 'node:assert/strict';
import { TimelineScheduler } from '../timeline/runtime/index.js';
import {
  UniversalAnimationTimelineIntegrationRuntime,
  migrateIntegrationState
} from './UniversalAnimationTimelineIntegrationRuntime.js';

function createTimelineFixture() {
  return {
    timelineId: 'animation-timeline-integration-test',
    version: 'v1',
    clips: [
      {
        id: 'clip-1',
        start: 0,
        end: 1200,
        duration: 1200,
        priority: 2,
        objects: ['obj-1'],
        actions: [],
        events: ['event-1'],
        metadata: {}
      }
    ],
    events: [
      {
        id: 'event-1',
        type: 'object-transform',
        time: 400,
        targets: ['obj-1'],
        payload: {
          targetObjectId: 'obj-1',
          animationType: 'timeline-object-transform',
          priority: 3
        },
        priority: 3,
        conditions: [],
        effects: [],
        metadata: {}
      }
    ],
    actions: [
      {
        id: 'action-1',
        type: 'camera-focus',
        purpose: 'focus',
        targets: ['obj-1'],
        timeMs: 500,
        priority: 4,
        parameters: {
          targetObjectId: 'obj-1'
        },
        metadata: {}
      }
    ],
    markers: [
      {
        id: 'checkpoint-marker-1',
        type: 'checkpoint',
        time: 800,
        label: 'Checkpoint Marker',
        metadata: {}
      }
    ],
    tracks: [],
    dependencies: [],
    segments: [],
    groups: [],
    metadata: {},
    diagnostics: {}
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
    }
  };
}

function createRuntimeFixture(adapter = createMemoryAdapter()) {
  const scheduler = new TimelineScheduler(createTimelineFixture(), {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.timeline.integration-test.scheduler'
  });

  const rendererUpdates = [];
  const rendererCore = {
    update(input = {}) {
      rendererUpdates.push(input);
      return {
        status: 'updated',
        processed: Array.isArray(input.commands) ? input.commands.length : 0
      };
    },
    snapshot() {
      return {
        schemaVersion: 'v1',
        lifecycle: {
          status: 'built'
        }
      };
    }
  };

  return {
    runtime: {
      sceneId: 'scene-animation-integration-1',
      timelineScheduler: scheduler,
      sceneScheduler: scheduler,
      rendererCore,
      interactionContractRuntime: null,
      assetLoadingRuntime: null,
      metadata: {
        rendererAdapter: {},
        aiTeacherAdapter: {},
        interactionEngine: {},
        timeline: {
          timelineId: 'animation-timeline-integration-test',
          version: 'v1',
          trackIds: [],
          clipIds: ['clip-1'],
          markerIds: ['checkpoint-marker-1'],
          eventIds: ['event-1']
        }
      },
      graph: {
        nodes: new Map([['scene-root', {}], ['obj-1', {}]]),
        edges: [{ from: 'scene-root', to: 'obj-1', relation: 'contains' }],
        getNodeCount() {
          return 2;
        },
        getRelationshipCount() {
          return 1;
        }
      }
    },
    scheduler,
    rendererUpdates,
    adapter
  };
}

test('animation runtime playback controls synchronize timeline-driven animation state', () => {
  const { runtime, scheduler } = createRuntimeFixture();
  const integration = new UniversalAnimationTimelineIntegrationRuntime(runtime);

  const built = integration.build();
  assert.equal(built.status, 'built');

  integration.play();
  assert.equal(integration.snapshot().animations.active, true);

  scheduler.tick(450);
  const snapshotAfterTick = integration.snapshot();
  assert.equal(snapshotAfterTick.timeline.timeMs >= 450, true);

  integration.pause('manual');
  assert.equal(integration.snapshot().animations.paused, true);

  integration.seek(300);
  assert.equal(integration.snapshot().timeline.timeMs >= 300, true);

  integration.loop('repeat-lesson');
  assert.equal(integration.snapshot().controls.loopMode, 'repeat-lesson');

  integration.setSpeed(1.5);
  assert.equal(integration.snapshot().controls.speed, 1.5);

  integration.reverse(true);
  assert.equal(integration.snapshot().animations.reversed, true);

  integration.stop('manual');
  assert.equal(integration.snapshot().animations.stopped, true);
});

test('renderer animation commands originate only from timeline events', () => {
  const { runtime, scheduler, rendererUpdates } = createRuntimeFixture();
  const integration = new UniversalAnimationTimelineIntegrationRuntime(runtime);

  integration.build();

  assert.equal(rendererUpdates.length, 0);

  scheduler.play();
  scheduler.tick(600);

  assert.equal(rendererUpdates.length > 0, true);
  const commandBatches = rendererUpdates
    .map((entry) => Array.isArray(entry.commands) ? entry.commands : [])
    .flat();

  assert.equal(commandBatches.length > 0, true);
  assert.equal(commandBatches.every((command) => command?.payload?.source === 'timeline-event'), true);
});

test('interaction runtime tracks selection and unknown future interaction types', () => {
  const { runtime } = createRuntimeFixture();
  const integration = new UniversalAnimationTimelineIntegrationRuntime(runtime);

  integration.build();
  integration.handleInteractionEvent('selection', {
    targetObjectId: 'obj-1'
  });
  integration.handleInteractionEvent('hover', {
    targetObjectId: 'obj-1'
  });
  integration.handleInteractionEvent('inspect', {
    targetObjectId: 'obj-1'
  });
  integration.handleInteractionEvent('future-haptic-neural-interaction', {
    targetObjectId: 'obj-1',
    payload: {
      precision: 0.91
    }
  });

  const snapshot = integration.snapshot();
  assert.equal(snapshot.interactions.selection.includes('obj-1'), true);
  assert.equal(snapshot.interactions.hover.includes('obj-1'), true);
  assert.equal(snapshot.interactions.inspections.includes('obj-1'), true);
  assert.equal(snapshot.interactions.runtimeFeedback.some((entry) => entry.type === 'future-haptic-neural-interaction'), true);
});

test('timeline integration handles unknown animation and unknown runtime events without code changes', () => {
  const { runtime, scheduler, rendererUpdates } = createRuntimeFixture();
  const integration = new UniversalAnimationTimelineIntegrationRuntime(runtime);

  integration.build();

  scheduler.emitRuntimeEvent('EventReady', {
    eventType: 'future-adaptive-morph-animation',
    targetObjectId: 'obj-1',
    priority: 5
  });
  scheduler.emitRuntimeEvent('QuantumRuntimeEvent', {
    eventType: 'future-quantum-runtime-event',
    targetObjectId: 'obj-1'
  });

  const snapshot = integration.snapshot();
  assert.equal(snapshot.animations.processedTriggers.some((entry) => entry.animationType === 'future-adaptive-morph-animation'), true);
  assert.equal(snapshot.animations.processedTriggers.some((entry) => entry.eventName === 'QuantumRuntimeEvent'), true);

  const emittedCommands = rendererUpdates.flatMap((entry) => entry.commands || []);
  assert.equal(emittedCommands.some((entry) => entry?.payload?.animationType === 'future-adaptive-morph-animation'), true);
});

test('runtime recovery and interruption recovery restore synchronized state', () => {
  const adapter = createMemoryAdapter();
  const first = createRuntimeFixture(adapter);
  const integrationOne = new UniversalAnimationTimelineIntegrationRuntime(first.runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.animation.timeline.integration.recovery'
  });

  integrationOne.build();
  first.scheduler.play();
  first.scheduler.tick(900);
  integrationOne.markInterrupted('network-interruption');
  integrationOne.persistSession();

  const second = createRuntimeFixture(adapter);
  const integrationTwo = new UniversalAnimationTimelineIntegrationRuntime(second.runtime, {
    persistenceAdapter: adapter,
    persistenceKey: 'daksha.animation.timeline.integration.recovery'
  });

  const recovered = integrationTwo.recoverSession();
  assert.equal(recovered, true);
  assert.equal(integrationTwo.snapshot().session.recovered, true);
  assert.equal(integrationTwo.snapshot().session.interrupted, true);

  const interruptionRecovered = integrationTwo.recoverFromInterruption();
  assert.equal(interruptionRecovered.status, 'recovered');
  assert.equal(integrationTwo.snapshot().session.interrupted, false);
});

test('migration keeps backward compatibility for legacy integration state', () => {
  const migrated = migrateIntegrationState({
    playbackControls: {
      speed: 1.2,
      direction: 'forward'
    },
    animationRuntime: {
      active: true,
      source: 'timeline-events-only',
      processedTriggers: [{ eventName: 'legacy-event' }]
    },
    interactionRuntime: {
      selection: ['obj-1']
    },
    diagnostics: {
      warnings: ['legacy-animation-integration-state']
    }
  });

  assert.equal(migrated.schemaVersion, 'v1');
  assert.equal(migrated.controls.speed, 1.2);
  assert.equal(migrated.animations.active, true);
  assert.equal(migrated.interactions.selection.includes('obj-1'), true);
  assert.equal(migrated.diagnostics.warnings.includes('legacy-animation-integration-state'), true);
  assert.equal(migrated.diagnostics.warnings.some((entry) => entry.includes('migrated from legacy format')), true);
});
