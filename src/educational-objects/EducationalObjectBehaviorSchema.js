export const EDUCATIONAL_OBJECT_BEHAVIOR_LATEST_VERSION = 'v1';

function asId(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

export function createDefaultBehaviorTrigger(index = 0) {
  return {
    triggerId: asId('', `trigger-${index + 1}`),
    type: 'manual',
    sourceObjectId: null,
    sourceState: null,
    event: null,
    timelineStepId: null,
    interactionId: null,
    conditionIds: [],
    debounceMs: 0,
    once: false,
    priority: index + 1,
    metadata: {}
  };
}

export function createDefaultBehaviorCondition(index = 0) {
  return {
    conditionId: asId('', `condition-${index + 1}`),
    field: 'state.current',
    operator: 'equals',
    expectedValue: 'ready',
    source: 'object-state',
    required: false,
    weight: 1,
    metadata: {}
  };
}

export function createDefaultBehaviorEffect(index = 0) {
  return {
    effectId: asId('', `effect-${index + 1}`),
    type: 'no-op',
    targetObjectIds: [],
    targetState: null,
    property: null,
    value: null,
    relationshipId: null,
    timelineStepId: null,
    priority: index + 1,
    durationHint: 0,
    reversible: false,
    metadata: {}
  };
}

export function createDefaultBehaviorState(index = 0) {
  const stateName = index === 0 ? 'ready' : `state-${index + 1}`;
  return {
    stateId: asId('', `state-${index + 1}`),
    name: stateName,
    description: '',
    properties: {},
    availableActions: [],
    entryBehaviors: [],
    exitBehaviors: [],
    persistent: true,
    terminal: false,
    metadata: {}
  };
}

export function createDefaultBehaviorTransition(index = 0) {
  return {
    transitionId: asId('', `transition-${index + 1}`),
    from: 'ready',
    to: 'active',
    triggerIds: [],
    conditionIds: [],
    effectIds: [],
    priority: index + 1,
    reversible: false,
    allowed: true,
    metadata: {}
  };
}

export function createDefaultBehaviorAccessibility() {
  return {
    screenReaderAnnouncement: '',
    keyboardEquivalent: '',
    nonVisualEffectDescription: '',
    reducedMotionAlternative: null,
    focusManagementHint: '',
    interactionInstructions: '',
    audioCueAlternative: '',
    highContrastStateHint: '',
    metadata: {}
  };
}

export function createDefaultBehaviorPerformance() {
  return {
    costHint: 'low',
    maximumConcurrentBehaviors: 3,
    maximumStateHistory: 50,
    maximumRelationshipDepth: 20,
    maximumEffectsPerDispatch: 100,
    maximumAutomaticBehaviorChain: 25,
    lowPowerAlternative: true,
    mobileSuitability: true,
    metadata: {}
  };
}

export function createDefaultBehaviorLimits() {
  return {
    cooldownMs: 0,
    maximumExecutions: 0,
    maximumConcurrentExecutions: 1,
    once: false,
    repeatable: true,
    interruptible: true,
    timeoutHint: 0,
    metadata: {}
  };
}

export function createDefaultBehaviorScheduling() {
  return {
    startHint: 'immediate',
    durationHint: 0,
    sequenceIndex: 0,
    dependsOnBehaviorIds: [],
    precedesBehaviorIds: [],
    timelineStepIds: [],
    pauseWithTimeline: true,
    seekable: true,
    reversible: false,
    metadata: {}
  };
}

export function createDefaultObjectStateConfiguration() {
  return {
    initialState: 'ready',
    currentState: 'ready',
    availableStates: [createDefaultBehaviorState(0)],
    history: [],
    transitions: [],
    resetState: 'ready',
    completed: false,
    disabled: false,
    metadata: {}
  };
}

export function createAdaptiveFallbackBehavior(overrides = {}) {
  const behaviorId = asId(overrides.behaviorId || overrides.id, 'behavior-adaptive');
  const defaultTrigger = createDefaultBehaviorTrigger(0);
  const defaultEffect = createDefaultBehaviorEffect(0);
  const defaultStateConfig = createDefaultObjectStateConfiguration();

  return {
    behaviorId,
    id: behaviorId,
    version: String(overrides.version || EDUCATIONAL_OBJECT_BEHAVIOR_LATEST_VERSION),
    name: String(overrides.name || 'adaptive-behavior'),
    purpose: String(overrides.purpose || 'adaptive-purpose'),
    source: String(overrides.source || 'runtime-adaptive'),
    enabled: overrides.enabled !== false,
    priority: Number.isFinite(Number(overrides.priority)) ? Number(overrides.priority) : 1,
    triggers: Array.isArray(overrides.triggers) && overrides.triggers.length ? overrides.triggers : [defaultTrigger],
    conditions: Array.isArray(overrides.conditions) ? overrides.conditions : [],
    effects: Array.isArray(overrides.effects) && overrides.effects.length ? overrides.effects : [defaultEffect],
    stateRequirements: overrides.stateRequirements && typeof overrides.stateRequirements === 'object'
      ? overrides.stateRequirements
      : defaultStateConfig,
    stateTransitions: Array.isArray(overrides.stateTransitions) ? overrides.stateTransitions : [],
    relationshipRequirements: Array.isArray(overrides.relationshipRequirements) ? overrides.relationshipRequirements : [],
    timelineHints: overrides.timelineHints && typeof overrides.timelineHints === 'object'
      ? overrides.timelineHints
      : createDefaultBehaviorScheduling(),
    interactionHints: overrides.interactionHints && typeof overrides.interactionHints === 'object'
      ? overrides.interactionHints
      : {},
    accessibility: {
      ...createDefaultBehaviorAccessibility(),
      ...(overrides.accessibility && typeof overrides.accessibility === 'object' ? overrides.accessibility : {})
    },
    performance: {
      ...createDefaultBehaviorPerformance(),
      ...(overrides.performance && typeof overrides.performance === 'object' ? overrides.performance : {})
    },
    reversible: overrides.reversible === true,
    repeatable: overrides.repeatable !== false,
    interruptible: overrides.interruptible !== false,
    cooldown: Number.isFinite(Number(overrides.cooldown)) ? Number(overrides.cooldown) : 0,
    limits: {
      ...createDefaultBehaviorLimits(),
      ...(overrides.limits && typeof overrides.limits === 'object' ? overrides.limits : {})
    },
    metadata: overrides.metadata && typeof overrides.metadata === 'object' ? overrides.metadata : {},
    extensions: overrides.extensions && typeof overrides.extensions === 'object' ? overrides.extensions : {},
    diagnostics: overrides.diagnostics && typeof overrides.diagnostics === 'object' ? overrides.diagnostics : {}
  };
}
