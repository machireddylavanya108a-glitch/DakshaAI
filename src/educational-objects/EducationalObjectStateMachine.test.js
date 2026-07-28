import test from 'node:test';
import assert from 'node:assert/strict';
import { createEducationalObjectStateMachine } from './index.js';

function objectInstance(overrides = {}) {
  return {
    objectId: 'obj-state-1',
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
    ...overrides
  };
}

test('state machine initializes and supports valid transition', () => {
  const machine = createEducationalObjectStateMachine(objectInstance());
  const init = machine.initialize();
  assert.equal(init.ok, true);
  assert.equal(machine.getState(), 'ready');

  assert.equal(machine.canTransition('active'), true);
  const transition = machine.transition('active');
  assert.equal(transition.ok, true);
  assert.equal(machine.getState(), 'active');
});

test('invalid transition is denied safely and terminal state exit is blocked', () => {
  const machine = createEducationalObjectStateMachine(objectInstance());
  machine.initialize();

  const invalid = machine.transition('unknown-state');
  assert.equal(invalid.ok, false);

  machine.transition('active');
  machine.transition('completed');
  assert.equal(machine.getState(), 'completed');

  const terminalExit = machine.transition('active');
  assert.equal(terminalExit.ok, false);
});

test('history limit reset pause resume complete disable enable and destroy behavior', () => {
  const machine = createEducationalObjectStateMachine(objectInstance(), { maximumStateHistory: 3 });
  machine.initialize();
  machine.transition('active');
  machine.transition('ready');
  machine.transition('active');
  machine.transition('ready');

  assert.equal(machine.getStateHistory().length <= 3, true);

  machine.pause();
  assert.equal(machine.canTransition('active'), false);

  machine.resume();
  assert.equal(machine.canTransition('active'), true);

  machine.disable();
  assert.equal(machine.canTransition('active'), false);

  machine.enable();
  assert.equal(machine.canTransition('active'), true);

  machine.complete();
  const reset = machine.reset();
  assert.equal(reset.ok, true);
  assert.equal(machine.getState(), 'ready');

  const listener = () => {};
  assert.equal(machine.subscribe(listener), true);
  assert.equal(machine.unsubscribe(listener), true);

  machine.destroy();
  assert.equal(machine.transition('active').ok, false);
});

test('state machine supports dynamic unknown state names safely', () => {
  const machine = createEducationalObjectStateMachine(objectInstance({
    runtimeMetadata: {
      stateRequirements: {
        initialState: 'proto-init',
        currentState: 'proto-init',
        availableStates: [
          { stateId: 's1', name: 'proto-init', terminal: false },
          { stateId: 's2', name: 'proto-mid', terminal: false },
          { stateId: 's3', name: 'proto-end', terminal: true }
        ],
        history: [],
        transitions: [],
        resetState: 'proto-init',
        completed: false,
        disabled: false,
        metadata: {}
      },
      stateTransitions: [
        { transitionId: 'p1', from: 'proto-init', to: 'proto-mid', allowed: true },
        { transitionId: 'p2', from: 'proto-mid', to: 'proto-end', allowed: true }
      ]
    }
  }));

  machine.initialize();
  assert.equal(machine.canTransition('proto-mid'), true);
  assert.equal(machine.transition('proto-mid').ok, true);
  assert.equal(machine.canTransition('proto-end'), true);
  assert.equal(machine.transition('proto-end').ok, true);
});
