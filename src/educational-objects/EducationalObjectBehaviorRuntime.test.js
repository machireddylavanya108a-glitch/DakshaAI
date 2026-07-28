import test from 'node:test';
import assert from 'node:assert/strict';
import { buildRuntimeSceneGraph } from '../scene-builder/SceneBuilder.js';
import { createEducationalObjectBehaviorRuntime } from './index.js';

function runtimeSceneInput(overrides = {}) {
  const base = {
    sceneId: 'scene-runtime-behavior-1',
    version: 'v2',
    title: 'Behavior Runtime Scene',
    subject: 'Open Topic',
    educationalObjectInstances: [
      {
        instanceId: 'inst-1',
        objectId: 'obj-1',
        runtimeMetadata: {
          stateRequirements: {
            initialState: 'ready',
            currentState: 'ready',
            availableStates: [
              { stateId: 's1', name: 'ready', terminal: false },
              { stateId: 's2', name: 'active', terminal: false },
              { stateId: 's3', name: 'completed', terminal: true }
            ],
            history: [],
            transitions: [],
            resetState: 'ready',
            completed: false,
            disabled: false,
            metadata: {}
          },
          stateTransitions: [
            { transitionId: 't1', from: 'ready', to: 'active', allowed: true, reversible: true },
            { transitionId: 't2', from: 'active', to: 'completed', allowed: true, reversible: true },
            { transitionId: 't3', from: 'active', to: 'ready', allowed: true, reversible: true }
          ]
        },
        resolvedState: { current: 'ready' }
      },
      {
        instanceId: 'inst-2',
        objectId: 'obj-2',
        runtimeMetadata: {
          stateRequirements: {
            initialState: 'ready',
            currentState: 'ready',
            availableStates: [{ stateId: 's1', name: 'ready', terminal: false }],
            history: [],
            transitions: [],
            resetState: 'ready',
            completed: false,
            disabled: false,
            metadata: {}
          },
          stateTransitions: []
        },
        resolvedState: { current: 'ready' }
      }
    ],
    objectBehaviors: [
      {
        behaviorId: 'behavior-highlight',
        version: 'v1',
        name: 'Highlight',
        purpose: 'concept-emphasis',
        enabled: true,
        priority: 9,
        triggers: [{ triggerId: 'trigger-selection', type: 'selection', sourceObjectId: 'obj-1', priority: 1 }],
        conditions: [{ conditionId: 'condition-1', field: 'signal.type', operator: 'equals', expectedValue: 'selection', required: true }],
        effects: [
          { effectId: 'effect-state', type: 'change-state', targetObjectIds: ['obj-1'], targetState: 'active', reversible: true },
          { effectId: 'effect-highlight', type: 'highlight', targetObjectIds: ['obj-1'], reversible: true }
        ],
        stateRequirements: {
          initialState: 'ready',
          currentState: 'ready',
          availableStates: [
            { stateId: 's1', name: 'ready', terminal: false },
            { stateId: 's2', name: 'active', terminal: false }
          ],
          history: [],
          transitions: [],
          resetState: 'ready',
          completed: false,
          disabled: false,
          metadata: {}
        },
        stateTransitions: [{ transitionId: 'bt1', from: 'ready', to: 'active', allowed: true, reversible: true }],
        relationshipRequirements: [{ relationshipId: 'rel-1', sourceObjectId: 'obj-1', targetObjectId: 'obj-2', relation: 'supports', required: true }],
        accessibility: { reducedMotionAlternative: { type: 'focus' } },
        performance: { maximumEffectsPerDispatch: 2 },
        reversible: true,
        limits: { cooldownMs: 0, maximumExecutions: 2, once: false, repeatable: true, interruptible: true, maximumConcurrentExecutions: 1 },
        metadata: {}
      },
      {
        behaviorId: 'behavior-unknown',
        version: 'v1',
        name: 'Future Behavior',
        purpose: 'future-purpose-x',
        enabled: true,
        priority: 3,
        triggers: [{ triggerId: 'trigger-future', type: 'future-signal', sourceObjectId: 'obj-2' }],
        conditions: [{ conditionId: 'condition-future', field: 'signal.payload.flag', operator: 'unknown-op', expectedValue: true, required: true }],
        effects: [{ effectId: 'effect-future', type: 'future-effect-x', targetObjectIds: ['obj-2'], value: '<script>1</script>' }],
        stateRequirements: {
          initialState: 'ready',
          currentState: 'ready',
          availableStates: [{ stateId: 's1', name: 'ready', terminal: false }],
          history: [],
          transitions: [],
          resetState: 'ready',
          completed: false,
          disabled: false,
          metadata: {}
        },
        stateTransitions: [],
        relationshipRequirements: [],
        metadata: {}
      }
    ],
    objectRelationships: [
      { relationshipId: 'rel-1', sourceObjectId: 'obj-1', targetObjectId: 'obj-2', relation: 'supports', required: true },
      { relationshipId: 'rel-cycle', sourceObjectId: 'obj-2', targetObjectId: 'obj-1', relation: 'feedback', required: false }
    ],
    timeline: [{ id: 'step-1', order: 0, title: 'Step 1', description: '', duration: 0, camera: null, objects: [], animations: [], narration: null, interaction: null, completionRule: { type: 'manual', value: null } }],
    interactions: [{ id: 'interaction-1' }],
    metadata: {}
  };

  return { ...base, ...overrides };
}

function createRuntime(overrides = {}) {
  const sceneJson = runtimeSceneInput(overrides);
  const runtimeScene = buildRuntimeSceneGraph(sceneJson);
  return createEducationalObjectBehaviorRuntime({
    ...runtimeScene,
    sceneJson,
    metadata: sceneJson.metadata
  }, {
    maximumEffectsPerDispatch: 2,
    maximumAutomaticBehaviorChain: 4,
    maximumStateHistory: 5,
    maximumRelationshipDepth: 4
  });
}

test('runtime load start dispatch generates declarative effect events and updates state metadata', () => {
  const runtime = createRuntime();
  const loaded = runtime.load();
  assert.equal(loaded.ok, true);

  const started = runtime.start();
  assert.equal(started.ok, true);

  const dispatched = runtime.dispatch({
    signalId: 'signal-1',
    type: 'selection',
    source: 'test',
    sourceObjectId: 'obj-1',
    payload: { unsafe: '<script>alert(1)</script>' }
  });

  assert.equal(dispatched.ok, true);
  assert.equal(dispatched.events.length >= 1, true);
  assert.equal(dispatched.events.every((event) => !String(JSON.stringify(event)).includes('<script>')), true);

  const state = runtime.getObjectState('obj-1');
  assert.equal(state?.state, 'active');

  const diagnostics = runtime.getDiagnostics();
  assert.equal(typeof diagnostics, 'object');
  assert.equal(typeof diagnostics.counters, 'object');
});

test('runtime pause resume reset and destroy safety', () => {
  const runtime = createRuntime();
  runtime.load();
  runtime.start();

  runtime.pause();
  const pausedDispatch = runtime.dispatch({ type: 'selection', sourceObjectId: 'obj-1' });
  assert.equal(pausedDispatch.ok, false);

  runtime.resume();
  const resumedDispatch = runtime.dispatch({ type: 'selection', sourceObjectId: 'obj-1' });
  assert.equal(resumedDispatch.ok, true);

  runtime.reset();
  assert.equal(runtime.getObjectState('obj-1')?.state, 'ready');

  runtime.destroy();
  const postDestroyDispatch = runtime.dispatch({ type: 'selection', sourceObjectId: 'obj-1' });
  assert.equal(postDestroyDispatch.ok, false);
});

test('runtime enforces execution limits cooldown once and maximum effects per dispatch', () => {
  const runtime = createRuntime({
    objectBehaviors: [
      {
        behaviorId: 'behavior-limited',
        version: 'v1',
        name: 'Limited',
        purpose: 'x',
        enabled: true,
        priority: 1,
        triggers: [{ triggerId: 't1', type: 'manual', sourceObjectId: 'obj-1' }],
        conditions: [],
        effects: [
          { effectId: 'e1', type: 'highlight', targetObjectIds: ['obj-1'] },
          { effectId: 'e2', type: 'focus', targetObjectIds: ['obj-1'] },
          { effectId: 'e3', type: 'show', targetObjectIds: ['obj-1'] }
        ],
        stateRequirements: {
          initialState: 'ready',
          currentState: 'ready',
          availableStates: [{ stateId: 's1', name: 'ready', terminal: false }],
          history: [],
          transitions: [],
          resetState: 'ready',
          completed: false,
          disabled: false,
          metadata: {}
        },
        stateTransitions: [],
        relationshipRequirements: [],
        limits: { cooldownMs: 10, maximumExecutions: 1, once: true, repeatable: false, interruptible: true, maximumConcurrentExecutions: 1 },
        performance: { maximumEffectsPerDispatch: 2 }
      }
    ],
    objectRelationships: []
  });

  runtime.load();
  runtime.start();

  const first = runtime.dispatch({ type: 'manual', sourceObjectId: 'obj-1' });
  assert.equal(first.ok, true);
  assert.equal(first.events.length <= 2, true);

  const second = runtime.dispatch({ type: 'manual', sourceObjectId: 'obj-1' });
  assert.equal(second.events.length, 0);
});

test('runtime supports undo redo and history cleanup for reversible effects', () => {
  const runtime = createRuntime();
  runtime.load();
  runtime.start();
  runtime.dispatch({ type: 'selection', sourceObjectId: 'obj-1' });

  assert.equal(runtime.canUndo(), true);
  const undo = runtime.undo();
  assert.equal(typeof undo.ok, 'boolean');

  assert.equal(runtime.canRedo(), true);
  const redo = runtime.redo();
  assert.equal(redo.ok, true);

  runtime.clearHistory();
  assert.equal(runtime.canUndo(), false);
});

test('runtime keeps unknown behavior and unknown operators safe with diagnostics', () => {
  const runtime = createRuntime();
  runtime.load();
  runtime.start();

  const result = runtime.dispatch({
    signalId: 'future-1',
    type: 'future-signal',
    sourceObjectId: 'obj-2',
    payload: { flag: true }
  });

  assert.equal(result.ok, true);
  assert.equal(result.events.length, 0);
  const diagnostics = runtime.getDiagnostics();
  assert.equal(diagnostics.warnings.some((entry) => String(entry).includes('unknown operators')), true);
});

test('runtime graph handoff includes behavior metadata and declarative effect events only', () => {
  const runtime = createRuntime();
  runtime.load();
  runtime.start();
  runtime.dispatch({ type: 'selection', sourceObjectId: 'obj-1' });

  const diagnostics = runtime.getDiagnostics();
  assert.equal(typeof diagnostics.dependencyReport, 'object');
  assert.equal(typeof diagnostics.conflictReport, 'object');

  const events = runtime.getLatestEffectEvents();
  assert.equal(Array.isArray(events), true);
  assert.equal(events.every((event) => typeof event.effectType === 'string'), true);
  assert.equal(events.every((event) => typeof event.sourceBehaviorId === 'string'), true);
  assert.equal(events.every((event) => !('function' in event)), true);
});
