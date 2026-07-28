import { normalizeEducationalObjectBehavior } from './EducationalObjectBehaviorNormalizer.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function createResult({ valid = true, errors = [], warnings = [], repairable = true, normalizedValue = null, diagnostics = {} } = {}) {
  return {
    valid,
    errors,
    warnings,
    repairable,
    normalizedValue,
    diagnostics
  };
}

function validateIdentifier(value, fieldName, errors) {
  if (!String(value || '').trim()) {
    errors.push(`${fieldName} is required.`);
  }
}

export function validateBehaviorTriggers(triggers = []) {
  const errors = [];
  const warnings = [];
  const seen = new Set();

  toArray(triggers).forEach((trigger, index) => {
    if (!isObject(trigger)) {
      errors.push(`Trigger at index ${index} must be an object.`);
      return;
    }

    validateIdentifier(trigger.triggerId, `Trigger ${index} triggerId`, errors);
    if (seen.has(trigger.triggerId)) errors.push(`Duplicate triggerId detected: ${trigger.triggerId}`);
    seen.add(trigger.triggerId);

    if (!String(trigger.type || '').trim()) warnings.push(`Trigger ${trigger.triggerId} has empty type; treated as manual.`);
    if (Number(trigger.debounceMs) < 0) errors.push(`Trigger ${trigger.triggerId} debounceMs cannot be negative.`);
  });

  return createResult({
    valid: errors.length === 0,
    errors,
    warnings,
    repairable: true,
    normalizedValue: triggers,
    diagnostics: {
      count: toArray(triggers).length,
      duplicateCount: Math.max(0, toArray(triggers).length - seen.size)
    }
  });
}

export function validateBehaviorConditions(conditions = []) {
  const errors = [];
  const warnings = [];
  const seen = new Set();
  const allowedOperators = new Set(['equals', 'not-equals', 'in', 'not-in', 'exists', 'greater-than', 'greater-than-or-equal', 'less-than', 'less-than-or-equal']);

  toArray(conditions).forEach((condition, index) => {
    if (!isObject(condition)) {
      errors.push(`Condition at index ${index} must be an object.`);
      return;
    }

    validateIdentifier(condition.conditionId, `Condition ${index} conditionId`, errors);
    if (seen.has(condition.conditionId)) errors.push(`Duplicate conditionId detected: ${condition.conditionId}`);
    seen.add(condition.conditionId);

    if (!String(condition.field || '').trim()) errors.push(`Condition ${condition.conditionId} is missing field.`);
    if (!String(condition.operator || '').trim()) errors.push(`Condition ${condition.conditionId} is missing operator.`);
    if (!allowedOperators.has(String(condition.operator || ''))) warnings.push(`Condition ${condition.conditionId} uses unknown operator and will be treated as unmet.`);
  });

  return createResult({
    valid: errors.length === 0,
    errors,
    warnings,
    repairable: true,
    normalizedValue: conditions,
    diagnostics: { count: toArray(conditions).length }
  });
}

export function validateBehaviorEffects(effects = []) {
  const errors = [];
  const warnings = [];
  const seen = new Set();

  toArray(effects).forEach((effect, index) => {
    if (!isObject(effect)) {
      errors.push(`Effect at index ${index} must be an object.`);
      return;
    }

    validateIdentifier(effect.effectId, `Effect ${index} effectId`, errors);
    if (seen.has(effect.effectId)) errors.push(`Duplicate effectId detected: ${effect.effectId}`);
    seen.add(effect.effectId);

    if (!String(effect.type || '').trim()) warnings.push(`Effect ${effect.effectId} has empty type and will be treated as no-op.`);
  });

  return createResult({
    valid: errors.length === 0,
    errors,
    warnings,
    repairable: true,
    normalizedValue: effects,
    diagnostics: { count: toArray(effects).length }
  });
}

export function validateBehaviorStates(stateRequirements = {}) {
  const errors = [];
  const warnings = [];
  const source = isObject(stateRequirements) ? stateRequirements : {};
  const states = toArray(source.availableStates);
  const stateNames = new Set();

  states.forEach((state, index) => {
    if (!isObject(state)) {
      errors.push(`State at index ${index} must be an object.`);
      return;
    }

    if (!String(state.name || '').trim()) errors.push(`State ${index} is missing name.`);
    const stateName = String(state.name || '').trim();
    if (stateName) {
      if (stateNames.has(stateName)) errors.push(`Duplicate state name detected: ${stateName}`);
      stateNames.add(stateName);
    }
  });

  if (!String(source.initialState || '').trim()) warnings.push('State requirements initialState is missing and will default to ready.');
  if (!stateNames.has(String(source.initialState || 'ready'))) warnings.push('Initial state is not in availableStates and may be repaired.');

  return createResult({
    valid: errors.length === 0,
    errors,
    warnings,
    repairable: true,
    normalizedValue: source,
    diagnostics: { stateCount: states.length }
  });
}

export function validateBehaviorTransitions(transitions = [], stateRequirements = {}) {
  const errors = [];
  const warnings = [];
  const source = toArray(transitions);
  const availableNames = new Set(toArray(stateRequirements?.availableStates).map((state) => String(state?.name || '').trim()).filter(Boolean));
  const byPair = new Set();
  const byId = new Set();
  const outgoing = new Map();
  const terminalStates = new Set(toArray(stateRequirements?.availableStates).filter((state) => state?.terminal === true).map((state) => String(state.name || '')));

  source.forEach((transition, index) => {
    if (!isObject(transition)) {
      errors.push(`Transition at index ${index} must be an object.`);
      return;
    }

    validateIdentifier(transition.transitionId, `Transition ${index} transitionId`, errors);
    if (byId.has(transition.transitionId)) errors.push(`Duplicate transitionId detected: ${transition.transitionId}`);
    byId.add(transition.transitionId);

    const from = String(transition.from || '').trim();
    const to = String(transition.to || '').trim();

    if (!from || !to) {
      errors.push(`Transition ${transition.transitionId || index} must include from and to states.`);
      return;
    }

    if (availableNames.size) {
      if (!availableNames.has(from)) errors.push(`Transition ${transition.transitionId} source state is unavailable: ${from}`);
      if (!availableNames.has(to)) errors.push(`Transition ${transition.transitionId} target state is unavailable: ${to}`);
    }

    const pairKey = `${from}::${to}`;
    if (byPair.has(pairKey)) warnings.push(`Duplicate transition pair detected: ${pairKey}`);
    byPair.add(pairKey);

    if (terminalStates.has(from) && from !== to) {
      errors.push(`Transition ${transition.transitionId} exits terminal state ${from}.`);
    }

    if (!outgoing.has(from)) outgoing.set(from, []);
    outgoing.get(from).push(to);
  });

  const visited = new Set();
  const stack = new Set();
  let hasCycle = false;
  function walk(node) {
    if (stack.has(node)) {
      hasCycle = true;
      return;
    }
    if (visited.has(node)) return;
    visited.add(node);
    stack.add(node);
    const targets = outgoing.get(node) || [];
    targets.forEach((target) => walk(target));
    stack.delete(node);
  }

  for (const key of outgoing.keys()) walk(key);
  if (hasCycle) warnings.push('Transition cycle detected. Cycles are allowed only when bounded by runtime chain limits.');

  return createResult({
    valid: errors.length === 0,
    errors,
    warnings,
    repairable: true,
    normalizedValue: transitions,
    diagnostics: { transitionCount: source.length, cycleDetected: hasCycle }
  });
}

export function validateBehaviorRelationships(relationships = []) {
  const errors = [];
  const warnings = [];
  const seen = new Set();

  toArray(relationships).forEach((relationship, index) => {
    if (!isObject(relationship)) {
      errors.push(`Relationship requirement at index ${index} must be an object.`);
      return;
    }
    validateIdentifier(relationship.relationshipId, `Relationship ${index} relationshipId`, errors);
    if (seen.has(relationship.relationshipId)) warnings.push(`Duplicate relationshipId detected: ${relationship.relationshipId}`);
    seen.add(relationship.relationshipId);

    if (!String(relationship.sourceObjectId || '').trim()) warnings.push(`Relationship ${relationship.relationshipId} missing sourceObjectId.`);
    if (!String(relationship.targetObjectId || '').trim()) warnings.push(`Relationship ${relationship.relationshipId} missing targetObjectId.`);
  });

  return createResult({
    valid: errors.length === 0,
    errors,
    warnings,
    repairable: true,
    normalizedValue: relationships,
    diagnostics: { count: toArray(relationships).length }
  });
}

export function validateBehaviorAccessibility(accessibility = {}) {
  const errors = [];
  const warnings = [];
  const source = isObject(accessibility) ? accessibility : {};

  if (source.reducedMotionAlternative !== null && source.reducedMotionAlternative !== undefined && typeof source.reducedMotionAlternative !== 'object' && typeof source.reducedMotionAlternative !== 'string') {
    warnings.push('Accessibility reducedMotionAlternative should be an object or string.');
  }

  return createResult({
    valid: errors.length === 0,
    errors,
    warnings,
    repairable: true,
    normalizedValue: source,
    diagnostics: {}
  });
}

export function validateBehaviorPerformance(performance = {}) {
  const errors = [];
  const warnings = [];
  const source = isObject(performance) ? performance : {};

  const numericFields = [
    'maximumConcurrentBehaviors',
    'maximumStateHistory',
    'maximumRelationshipDepth',
    'maximumEffectsPerDispatch',
    'maximumAutomaticBehaviorChain'
  ];

  numericFields.forEach((field) => {
    const value = source[field];
    if (value !== undefined && (!Number.isFinite(Number(value)) || Number(value) < 0)) {
      errors.push(`Performance ${field} must be a non-negative finite number.`);
    }
  });

  if (Number(source.maximumEffectsPerDispatch || 0) > 1000) {
    warnings.push('Performance maximumEffectsPerDispatch is high and may be clamped at runtime.');
  }

  return createResult({
    valid: errors.length === 0,
    errors,
    warnings,
    repairable: true,
    normalizedValue: source,
    diagnostics: {}
  });
}

export function validateEducationalObjectBehavior(input = {}, options = {}) {
  const normalized = normalizeEducationalObjectBehavior(input, options);

  const errors = [];
  const warnings = [];
  const diagnostics = {};

  validateIdentifier(normalized.behaviorId, 'behaviorId', errors);
  if (!String(normalized.name || '').trim()) errors.push('name is required.');
  if (!String(normalized.version || '').trim()) errors.push('version is required.');

  const triggerValidation = validateBehaviorTriggers(normalized.triggers);
  const conditionValidation = validateBehaviorConditions(normalized.conditions);
  const effectValidation = validateBehaviorEffects(normalized.effects);
  const stateValidation = validateBehaviorStates(normalized.stateRequirements);
  const transitionValidation = validateBehaviorTransitions(normalized.stateTransitions, normalized.stateRequirements);
  const relationshipValidation = validateBehaviorRelationships(normalized.relationshipRequirements);
  const accessibilityValidation = validateBehaviorAccessibility(normalized.accessibility);
  const performanceValidation = validateBehaviorPerformance(normalized.performance);

  const results = [
    triggerValidation,
    conditionValidation,
    effectValidation,
    stateValidation,
    transitionValidation,
    relationshipValidation,
    accessibilityValidation,
    performanceValidation
  ];

  results.forEach((result) => {
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  diagnostics.sections = {
    triggers: triggerValidation.diagnostics,
    conditions: conditionValidation.diagnostics,
    effects: effectValidation.diagnostics,
    states: stateValidation.diagnostics,
    transitions: transitionValidation.diagnostics,
    relationships: relationshipValidation.diagnostics
  };

  return createResult({
    valid: errors.length === 0,
    errors,
    warnings,
    repairable: true,
    normalizedValue: normalized,
    diagnostics
  });
}
