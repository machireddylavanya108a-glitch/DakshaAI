import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createEducationalObjectBehavior,
  createEducationalObjectBehaviorRegistry,
  normalizeEducationalObjectBehavior,
  validateEducationalObjectBehavior,
  ensureSceneEducationalObjectBehaviorMetadata
} from './index.js';

function behavior(overrides = {}) {
  return {
    behaviorId: 'behavior-1',
    version: 'v1',
    name: 'Adaptive Highlight',
    purpose: 'concept-emphasis',
    source: 'test',
    enabled: true,
    priority: 5,
    triggers: [{ triggerId: 'trigger-1', type: 'selection', sourceObjectId: 'obj-1', priority: 1 }],
    conditions: [{ conditionId: 'condition-1', field: 'signal.type', operator: 'equals', expectedValue: 'selection', required: true, weight: 1 }],
    effects: [{ effectId: 'effect-1', type: 'highlight', targetObjectIds: ['obj-1'], priority: 1, reversible: true }],
    stateRequirements: {
      initialState: 'ready',
      currentState: 'ready',
      availableStates: [
        { stateId: 'state-1', name: 'ready', terminal: false },
        { stateId: 'state-2', name: 'active', terminal: false },
        { stateId: 'state-3', name: 'completed', terminal: true }
      ],
      history: [],
      transitions: [],
      resetState: 'ready',
      completed: false,
      disabled: false,
      metadata: {}
    },
    stateTransitions: [{ transitionId: 'transition-1', from: 'ready', to: 'active', triggerIds: ['trigger-1'], conditionIds: ['condition-1'], effectIds: ['effect-1'], priority: 1, reversible: true, allowed: true }],
    relationshipRequirements: [{ relationshipId: 'rel-1', sourceObjectId: 'obj-1', targetObjectId: 'obj-2', relation: 'supports', required: false }],
    timelineHints: { startHint: 'immediate' },
    interactionHints: { mode: 'inspect' },
    accessibility: { reducedMotionAlternative: { type: 'highlight' } },
    performance: { maximumEffectsPerDispatch: 10 },
    reversible: true,
    repeatable: true,
    interruptible: true,
    cooldown: 0,
    limits: { cooldownMs: 0, maximumExecutions: 0, once: false },
    metadata: {},
    extensions: {},
    diagnostics: {},
    ...overrides
  };
}

test('valid behavior passes normalization and validation', () => {
  const normalized = normalizeEducationalObjectBehavior(behavior());
  const validation = validateEducationalObjectBehavior(normalized);
  assert.equal(validation.valid, true);
  assert.equal(validation.normalizedValue.behaviorId, 'behavior-1');
});

test('unknown purpose trigger effect and state are preserved safely', () => {
  const created = createEducationalObjectBehavior(behavior({
    purpose: 'future-purpose-x',
    triggers: [{ triggerId: 't1', type: 'quantum-signal' }],
    effects: [{ effectId: 'e1', type: 'phase-shift', targetObjectIds: ['obj-1'] }],
    stateTransitions: [{ transitionId: 'proto-transition-1', from: 'proto-state', to: 'proto-state', allowed: true }],
    stateRequirements: {
      initialState: 'proto-state',
      currentState: 'proto-state',
      availableStates: [{ stateId: 's1', name: 'proto-state', terminal: false }],
      history: [],
      transitions: [],
      resetState: 'proto-state',
      completed: false,
      disabled: false,
      metadata: {}
    }
  }));

  assert.equal(created.validation.valid, true);
  assert.equal(created.behavior.purpose, 'future-purpose-x');
  assert.equal(created.behavior.triggers[0].type, 'quantum-signal');
  assert.equal(created.behavior.effects[0].type, 'phase-shift');
  assert.equal(created.behavior.stateRequirements.initialState, 'proto-state');
});

test('missing behavior id trigger effect and state are repaired', () => {
  const created = createEducationalObjectBehavior({
    version: 'v1',
    triggers: [],
    effects: [],
    stateRequirements: {}
  });

  assert.equal(created.validation.valid, true);
  assert.ok(created.behavior.behaviorId);
  assert.equal(created.behavior.triggers.length >= 1, true);
  assert.equal(created.behavior.effects.length >= 1, true);
  assert.equal(Array.isArray(created.behavior.stateRequirements.availableStates), true);
  assert.equal(created.repaired, true);
});

test('normalization removes functions prototype pollution and unsafe script payloads', () => {
  const normalized = normalizeEducationalObjectBehavior({
    behaviorId: 'unsafe-behavior',
    metadata: {
      __proto__: { polluted: true },
      callback: () => 'x',
      html: '<script>alert(1)</script><div onclick="evil()">x</div>',
      url: 'javascript:alert(1)'
    },
    effects: [{ effectId: 'effect-unsafe', type: 'set-property', value: { nested: 'data:text/html;base64,evil' } }]
  });

  assert.equal(({}).polluted, undefined);
  assert.equal(typeof normalized.metadata.callback, 'undefined');
  assert.equal(String(normalized.metadata.html || '').includes('<script>'), false);
  assert.equal(String(normalized.metadata.url || '').includes('javascript:'), false);
  assert.equal(String(normalized.effects[0].value?.nested || '').includes('data:text/html'), false);
});

test('behavior registry supports registration duplicate update enable disable and removal', () => {
  const registry = createEducationalObjectBehaviorRegistry();

  const first = registry.registerBehavior(behavior());
  assert.equal(Boolean(first.entry), true);

  const duplicate = registry.registerBehavior(behavior());
  assert.equal(duplicate.duplicate, true);

  assert.equal(registry.hasBehavior('behavior-1', 'v1'), true);
  assert.equal(registry.findByPurpose('concept-emphasis').length, 1);
  assert.equal(registry.findByTrigger('selection').length, 1);
  assert.equal(registry.findByEffect('highlight').length, 1);

  const disabled = registry.disableBehavior('behavior-1', 'v1');
  assert.equal(disabled, true);
  assert.equal(registry.getBehavior('behavior-1', 'v1').enabled, false);

  const enabled = registry.enableBehavior('behavior-1', 'v1');
  assert.equal(enabled, true);
  assert.equal(registry.getBehavior('behavior-1', 'v1').enabled, true);

  const updated = registry.updateBehavior('behavior-1', 'v1', { priority: 9 });
  assert.equal(updated.updated, true);
  assert.equal(registry.getBehavior('behavior-1', 'v1').priority, 9);

  const removed = registry.unregisterBehavior('behavior-1', 'v1');
  assert.equal(removed, 1);
  assert.equal(registry.hasBehavior('behavior-1', 'v1'), false);
});

test('scene behavior metadata compatibility handles legacy behavior aliases', () => {
  const scene = ensureSceneEducationalObjectBehaviorMetadata({
    sceneId: 'scene-1',
    educationalObjects: [{ objectId: 'obj-1', behaviorHints: [{ id: 'hint-1', purpose: 'x' }] }],
    actions: [{ behaviorId: 'legacy-action-1', version: 'v1', triggers: [{ triggerId: 't1', type: 'manual' }], effects: [{ effectId: 'e1', type: 'highlight' }] }],
    metadata: {}
  });

  assert.equal(Array.isArray(scene.objectBehaviors), true);
  assert.equal(scene.objectBehaviors.length >= 1, true);
  assert.equal(Array.isArray(scene.objectRelationships), true);
  assert.equal(Array.isArray(scene.objectStateDefinitions), true);
  assert.equal(typeof scene.behaviorDiagnostics, 'object');
});
