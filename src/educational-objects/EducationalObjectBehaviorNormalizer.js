import {
  createAdaptiveFallbackBehavior,
  createDefaultBehaviorAccessibility,
  createDefaultBehaviorCondition,
  createDefaultBehaviorEffect,
  createDefaultBehaviorLimits,
  createDefaultBehaviorPerformance,
  createDefaultBehaviorScheduling,
  createDefaultBehaviorState,
  createDefaultBehaviorTransition,
  createDefaultBehaviorTrigger,
  createDefaultObjectStateConfiguration
} from './EducationalObjectBehaviorSchema.js';

const DEFAULT_LIMITS = {
  maxStringLength: 2000,
  maxArrayLength: 200,
  maxDepth: 8,
  maxPayloadBytes: 256 * 1024,
  maxEffectsPerDispatch: 100,
  maxStateHistory: 50,
  maxRelationshipDepth: 20,
  maxAutomaticBehaviorChain: 25
};

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isReactElementLike(value) {
  return isObject(value) && ('$typeof' in value || '_owner' in value || '_store' in value || 'props' in value && 'type' in value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function sanitizeString(value, maxLength) {
  const text = String(value ?? '').slice(0, maxLength);
  return text
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/on[a-z]+\s*=\s*"[^"]*"/gi, '')
    .replace(/on[a-z]+\s*=\s*'[^']*'/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
    .trim();
}

function sanitizeIdentifier(value, fallback = '', maxLength = 120) {
  const text = sanitizeString(value, maxLength).replace(/[^a-zA-Z0-9:_-]/g, '-');
  const compact = text.replace(/-+/g, '-').replace(/^-|-$/g, '');
  return compact || fallback;
}

function safeClone(input, options = {}, depth = 0, seen = new WeakMap()) {
  const limits = { ...DEFAULT_LIMITS, ...(options.limits || {}) };

  if (depth > limits.maxDepth) return '[truncated-depth]';
  if (input === null || input === undefined) return input;
  if (typeof input === 'function') return undefined;
  if (typeof input === 'symbol') return undefined;
  if (typeof input === 'bigint') return Number(input);
  if (typeof input === 'string') return sanitizeString(input, limits.maxStringLength);
  if (typeof input !== 'object') return input;
  if (isReactElementLike(input)) return undefined;

  if (seen.has(input)) return '[circular]';

  if (Array.isArray(input)) {
    const output = [];
    seen.set(input, output);
    for (const item of input.slice(0, limits.maxArrayLength)) {
      const next = safeClone(item, options, depth + 1, seen);
      if (next !== undefined) output.push(next);
    }
    return output;
  }

  const output = Object.create(null);
  seen.set(input, output);
  const entries = Object.entries(input).slice(0, limits.maxArrayLength);
  for (const [key, value] of entries) {
    if (key === '__proto__' || key === 'prototype' || key === 'constructor') continue;
    const safeKey = sanitizeIdentifier(key, '', 120);
    if (!safeKey) continue;
    const next = safeClone(value, options, depth + 1, seen);
    if (next === undefined) continue;
    if (typeof next === 'string' && !next.trim()) continue;
    output[safeKey] = next;
  }
  return output;
}

function dedupeById(items = [], key = 'id') {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    if (!isObject(item)) continue;
    const itemId = String(item[key] || '').trim();
    if (!itemId) {
      output.push(item);
      continue;
    }
    if (seen.has(itemId)) continue;
    seen.add(itemId);
    output.push(item);
  }
  return output;
}

function clamp(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(min, Math.min(max, num));
}

function normalizeTriggers(source = [], options = {}) {
  const list = toArray(source);
  if (!list.length) return [createDefaultBehaviorTrigger(0)];
  const normalized = list.map((item, index) => {
    const trigger = isObject(item) ? item : {};
    return {
      triggerId: sanitizeIdentifier(trigger.triggerId || trigger.id || `trigger-${index + 1}`, `trigger-${index + 1}`),
      type: sanitizeString(trigger.type || trigger.trigger_type || 'manual', 120) || 'manual',
      sourceObjectId: sanitizeIdentifier(trigger.sourceObjectId || trigger.source_object_id || '', ''),
      sourceState: sanitizeString(trigger.sourceState || trigger.source_state || '', 120) || null,
      event: sanitizeString(trigger.event || '', 200) || null,
      timelineStepId: sanitizeIdentifier(trigger.timelineStepId || trigger.timeline_step_id || '', ''),
      interactionId: sanitizeIdentifier(trigger.interactionId || trigger.interaction_id || '', ''),
      conditionIds: toArray(trigger.conditionIds || trigger.condition_ids || [])
        .map((id) => sanitizeIdentifier(id, ''))
        .filter(Boolean),
      debounceMs: clamp(trigger.debounceMs, 0, 60000, 0),
      once: trigger.once === true,
      priority: clamp(trigger.priority, 0, 10000, index + 1),
      metadata: safeClone(trigger.metadata || {}, options)
    };
  });
  return dedupeById(normalized, 'triggerId');
}

function normalizeConditions(source = [], options = {}) {
  return dedupeById(toArray(source).map((item, index) => {
    const condition = isObject(item) ? item : {};
    return {
      ...createDefaultBehaviorCondition(index),
      conditionId: sanitizeIdentifier(condition.conditionId || condition.id || `condition-${index + 1}`, `condition-${index + 1}`),
      field: sanitizeString(condition.field || condition.path || 'state.current', 240),
      operator: sanitizeString(condition.operator || 'equals', 120),
      expectedValue: safeClone(condition.expectedValue, options),
      source: sanitizeString(condition.source || 'object-state', 120),
      required: condition.required !== false,
      weight: clamp(condition.weight, 0, 1000, 1),
      metadata: safeClone(condition.metadata || {}, options)
    };
  }), 'conditionId');
}

function normalizeEffects(source = [], options = {}) {
  const list = toArray(source);
  if (!list.length) return [createDefaultBehaviorEffect(0)];
  const normalized = list.map((item, index) => {
    const effect = isObject(item) ? item : {};
    return {
      ...createDefaultBehaviorEffect(index),
      effectId: sanitizeIdentifier(effect.effectId || effect.id || `effect-${index + 1}`, `effect-${index + 1}`),
      type: sanitizeString(effect.type || effect.effect_type || 'no-op', 120),
      targetObjectIds: [...new Set(toArray(effect.targetObjectIds || effect.target_objects || effect.targets || [])
        .map((id) => sanitizeIdentifier(id, ''))
        .filter(Boolean))],
      targetState: sanitizeString(effect.targetState || effect.target_state || '', 120) || null,
      property: sanitizeString(effect.property || effect.path || '', 240) || null,
      value: safeClone(effect.value, options),
      relationshipId: sanitizeIdentifier(effect.relationshipId || effect.relationship_id || '', ''),
      timelineStepId: sanitizeIdentifier(effect.timelineStepId || effect.timeline_step_id || '', ''),
      priority: clamp(effect.priority, 0, 10000, index + 1),
      durationHint: clamp(effect.durationHint, 0, 600000, 0),
      reversible: effect.reversible === true,
      metadata: safeClone(effect.metadata || {}, options)
    };
  });
  return dedupeById(normalized, 'effectId');
}

function normalizeStates(stateRequirements = {}, options = {}) {
  const source = isObject(stateRequirements) ? stateRequirements : {};
  const fallback = createDefaultObjectStateConfiguration();
  const availableStates = toArray(source.availableStates || source.available_states || source.states || fallback.availableStates)
    .map((item, index) => {
      const state = isObject(item) ? item : { name: String(item || '') };
      return {
        ...createDefaultBehaviorState(index),
        stateId: sanitizeIdentifier(state.stateId || state.id || `state-${index + 1}`, `state-${index + 1}`),
        name: sanitizeString(state.name || `state-${index + 1}`, 120),
        description: sanitizeString(state.description || '', 500),
        properties: safeClone(state.properties || {}, options),
        availableActions: [...new Set(toArray(state.availableActions || state.available_actions || []).map((value) => sanitizeString(value, 120)).filter(Boolean))],
        entryBehaviors: [...new Set(toArray(state.entryBehaviors || state.entry_behaviors || []).map((value) => sanitizeIdentifier(value, '')).filter(Boolean))],
        exitBehaviors: [...new Set(toArray(state.exitBehaviors || state.exit_behaviors || []).map((value) => sanitizeIdentifier(value, '')).filter(Boolean))],
        persistent: state.persistent !== false,
        terminal: state.terminal === true,
        metadata: safeClone(state.metadata || {}, options)
      };
    });

  const dedupedStates = dedupeById(availableStates, 'stateId');
  const names = new Set(dedupedStates.map((item) => item.name));
  if (!names.has('ready')) {
    dedupedStates.unshift(createDefaultBehaviorState(0));
  }

  const initialState = sanitizeString(source.initialState || source.initial_state || fallback.initialState, 120) || 'ready';
  const currentState = sanitizeString(source.currentState || source.current_state || initialState, 120) || initialState;
  const resetState = sanitizeString(source.resetState || source.reset_state || initialState, 120) || initialState;

  return {
    initialState,
    currentState,
    availableStates: dedupedStates,
    history: toArray(source.history || []).map((item) => safeClone(item, options)).filter((item) => item !== undefined),
    transitions: toArray(source.transitions || []).map((item) => safeClone(item, options)).filter((item) => item !== undefined),
    resetState,
    completed: source.completed === true,
    disabled: source.disabled === true,
    metadata: safeClone(source.metadata || {}, options)
  };
}

function normalizeTransitions(source = [], options = {}) {
  return dedupeById(toArray(source).map((item, index) => {
    const transition = isObject(item) ? item : {};
    return {
      ...createDefaultBehaviorTransition(index),
      transitionId: sanitizeIdentifier(transition.transitionId || transition.id || `transition-${index + 1}`, `transition-${index + 1}`),
      from: sanitizeString(transition.from || transition.sourceState || 'ready', 120),
      to: sanitizeString(transition.to || transition.targetState || 'ready', 120),
      triggerIds: [...new Set(toArray(transition.triggerIds || transition.trigger_ids || []).map((id) => sanitizeIdentifier(id, '')).filter(Boolean))],
      conditionIds: [...new Set(toArray(transition.conditionIds || transition.condition_ids || []).map((id) => sanitizeIdentifier(id, '')).filter(Boolean))],
      effectIds: [...new Set(toArray(transition.effectIds || transition.effect_ids || []).map((id) => sanitizeIdentifier(id, '')).filter(Boolean))],
      priority: clamp(transition.priority, 0, 10000, index + 1),
      reversible: transition.reversible === true,
      allowed: transition.allowed !== false,
      metadata: safeClone(transition.metadata || {}, options)
    };
  }), 'transitionId');
}

function normalizeRelationships(source = [], options = {}) {
  return dedupeById(toArray(source).map((item, index) => {
    const relation = isObject(item) ? item : {};
    return {
      relationshipId: sanitizeIdentifier(relation.relationshipId || relation.relationId || relation.id || `relationship-${index + 1}`, `relationship-${index + 1}`),
      sourceObjectId: sanitizeIdentifier(relation.sourceObjectId || relation.source_object_id || '', ''),
      targetObjectId: sanitizeIdentifier(relation.targetObjectId || relation.target_object_id || '', ''),
      relation: sanitizeString(relation.relation || relation.type || 'references', 120),
      direction: sanitizeString(relation.direction || 'directed', 80),
      weight: clamp(relation.weight, 0, 1, 0.5),
      required: relation.required === true,
      active: relation.active !== false,
      stateDependencies: toArray(relation.stateDependencies || relation.state_dependencies || []).map((value) => sanitizeString(value, 120)).filter(Boolean),
      behaviorDependencies: toArray(relation.behaviorDependencies || relation.behavior_dependencies || []).map((value) => sanitizeIdentifier(value, '')).filter(Boolean),
      timelineDependencies: toArray(relation.timelineDependencies || relation.timeline_dependencies || []).map((value) => sanitizeIdentifier(value, '')).filter(Boolean),
      interactionDependencies: toArray(relation.interactionDependencies || relation.interaction_dependencies || []).map((value) => sanitizeIdentifier(value, '')).filter(Boolean),
      metadata: safeClone(relation.metadata || {}, options)
    };
  }), 'relationshipId');
}

function normalizeLimits(source = {}, options = {}) {
  const limits = { ...createDefaultBehaviorLimits(), ...(isObject(source) ? source : {}) };
  return {
    ...limits,
    cooldownMs: clamp(limits.cooldownMs ?? limits.cooldown ?? 0, 0, 600000, 0),
    maximumExecutions: clamp(limits.maximumExecutions, 0, 100000, 0),
    maximumConcurrentExecutions: clamp(limits.maximumConcurrentExecutions, 1, 100, 1),
    once: limits.once === true,
    repeatable: limits.repeatable !== false,
    interruptible: limits.interruptible !== false,
    timeoutHint: clamp(limits.timeoutHint, 0, 600000, 0),
    metadata: safeClone(limits.metadata || {}, options)
  };
}

function normalizePerformance(source = {}, options = {}) {
  const perf = { ...createDefaultBehaviorPerformance(), ...(isObject(source) ? source : {}) };
  return {
    ...perf,
    maximumConcurrentBehaviors: clamp(perf.maximumConcurrentBehaviors, 1, 100, 3),
    maximumStateHistory: clamp(perf.maximumStateHistory, 1, 500, DEFAULT_LIMITS.maxStateHistory),
    maximumRelationshipDepth: clamp(perf.maximumRelationshipDepth, 1, 100, DEFAULT_LIMITS.maxRelationshipDepth),
    maximumEffectsPerDispatch: clamp(perf.maximumEffectsPerDispatch, 1, 2000, DEFAULT_LIMITS.maxEffectsPerDispatch),
    maximumAutomaticBehaviorChain: clamp(perf.maximumAutomaticBehaviorChain, 1, 500, DEFAULT_LIMITS.maxAutomaticBehaviorChain),
    lowPowerAlternative: perf.lowPowerAlternative !== false,
    mobileSuitability: perf.mobileSuitability !== false,
    metadata: safeClone(perf.metadata || {}, options)
  };
}

function normalizeAccessibility(source = {}, options = {}) {
  const accessibility = { ...createDefaultBehaviorAccessibility(), ...(isObject(source) ? source : {}) };
  return {
    ...accessibility,
    screenReaderAnnouncement: sanitizeString(accessibility.screenReaderAnnouncement || '', 500),
    keyboardEquivalent: sanitizeString(accessibility.keyboardEquivalent || '', 240),
    nonVisualEffectDescription: sanitizeString(accessibility.nonVisualEffectDescription || '', 500),
    focusManagementHint: sanitizeString(accessibility.focusManagementHint || '', 240),
    interactionInstructions: sanitizeString(accessibility.interactionInstructions || '', 1000),
    audioCueAlternative: sanitizeString(accessibility.audioCueAlternative || '', 500),
    highContrastStateHint: sanitizeString(accessibility.highContrastStateHint || '', 240),
    reducedMotionAlternative: isObject(accessibility.reducedMotionAlternative)
      ? safeClone(accessibility.reducedMotionAlternative, options)
      : accessibility.reducedMotionAlternative,
    metadata: safeClone(accessibility.metadata || {}, options)
  };
}

function normalizeScheduling(source = {}, options = {}) {
  const scheduling = { ...createDefaultBehaviorScheduling(), ...(isObject(source) ? source : {}) };
  return {
    ...scheduling,
    startHint: sanitizeString(scheduling.startHint || 'immediate', 120),
    durationHint: clamp(scheduling.durationHint, 0, 600000, 0),
    sequenceIndex: clamp(scheduling.sequenceIndex, 0, 100000, 0),
    dependsOnBehaviorIds: [...new Set(toArray(scheduling.dependsOnBehaviorIds || []).map((value) => sanitizeIdentifier(value, '')).filter(Boolean))],
    precedesBehaviorIds: [...new Set(toArray(scheduling.precedesBehaviorIds || []).map((value) => sanitizeIdentifier(value, '')).filter(Boolean))],
    timelineStepIds: [...new Set(toArray(scheduling.timelineStepIds || []).map((value) => sanitizeIdentifier(value, '')).filter(Boolean))],
    pauseWithTimeline: scheduling.pauseWithTimeline !== false,
    seekable: scheduling.seekable !== false,
    reversible: scheduling.reversible === true,
    metadata: safeClone(scheduling.metadata || {}, options)
  };
}

function normalizeAliases(input = {}) {
  const source = isObject(input) ? input : {};
  return {
    ...source,
    behaviorId: source.behaviorId || source.behavior_id || source.id,
    triggers: source.triggers || source.events,
    effects: source.effects || source.actions,
    stateRequirements: source.stateRequirements || source.state_requirements || source.states,
    stateTransitions: source.stateTransitions || source.state_transitions || source.transitions,
    relationshipRequirements: source.relationshipRequirements || source.relationship_requirements || source.relationships || source.links || source.dependencies,
    timelineHints: source.timelineHints || source.timeline,
    interactionHints: source.interactionHints || source.interaction,
    accessibility: source.accessibility || source.a11y,
    performance: source.performance || source.perf
  };
}

export function normalizeEducationalObjectBehavior(input = {}, options = {}) {
  const alias = normalizeAliases(safeClone(input, options) || {});
  const fallback = createAdaptiveFallbackBehavior();

  const behaviorId = sanitizeIdentifier(alias.behaviorId, 'behavior-adaptive');
  const triggers = normalizeTriggers(alias.triggers, options);
  const effects = normalizeEffects(alias.effects, options);
  const conditions = normalizeConditions(alias.conditions, options);
  const stateRequirements = normalizeStates(alias.stateRequirements, options);
  const stateTransitions = normalizeTransitions(alias.stateTransitions, options);
  const relationshipRequirements = normalizeRelationships(alias.relationshipRequirements, options);
  const timelineHints = normalizeScheduling(alias.timelineHints, options);

  const normalized = {
    ...fallback,
    behaviorId,
    id: behaviorId,
    version: sanitizeString(alias.version || fallback.version, 40) || fallback.version,
    name: sanitizeString(alias.name || `behavior-${behaviorId}`, 240) || `behavior-${behaviorId}`,
    purpose: sanitizeString(alias.purpose || 'adaptive-purpose', 120) || 'adaptive-purpose',
    source: sanitizeString(alias.source || fallback.source, 120),
    enabled: alias.enabled !== false,
    priority: clamp(alias.priority, 0, 10000, 1),
    triggers,
    conditions,
    effects,
    stateRequirements,
    stateTransitions,
    relationshipRequirements,
    timelineHints,
    interactionHints: safeClone(alias.interactionHints || {}, options) || {},
    accessibility: normalizeAccessibility(alias.accessibility || {}, options),
    performance: normalizePerformance(alias.performance || {}, options),
    reversible: alias.reversible === true,
    repeatable: alias.repeatable !== false,
    interruptible: alias.interruptible !== false,
    cooldown: clamp(alias.cooldown, 0, 600000, 0),
    limits: normalizeLimits(alias.limits || {}, options),
    metadata: safeClone(alias.metadata || {}, options) || {},
    extensions: safeClone(alias.extensions || {}, options) || {},
    diagnostics: safeClone(alias.diagnostics || {}, options) || {}
  };

  return normalized;
}
