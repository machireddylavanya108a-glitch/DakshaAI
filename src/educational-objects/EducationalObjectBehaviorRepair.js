import { createAdaptiveFallbackBehavior } from './EducationalObjectBehaviorSchema.js';
import { normalizeEducationalObjectBehavior } from './EducationalObjectBehaviorNormalizer.js';

function hash(text = '') {
  let value = 0;
  const source = String(text || '');
  for (let index = 0; index < source.length; index += 1) {
    value = ((value << 5) - value + source.charCodeAt(index)) | 0;
  }
  return Math.abs(value).toString(16);
}

export function repairEducationalObjectBehavior(input = {}, options = {}) {
  const notes = [];
  const fallback = createAdaptiveFallbackBehavior();
  const normalized = normalizeEducationalObjectBehavior(input, options);

  if (!String(input?.behaviorId || input?.behavior_id || input?.id || '').trim()) {
    normalized.behaviorId = `behavior-${hash(JSON.stringify(normalized))}`;
    normalized.id = normalized.behaviorId;
    notes.push('Generated missing behaviorId.');
  }

  if (!String(input?.version || '').trim()) {
    normalized.version = fallback.version;
    notes.push('Inserted latest behavior version.');
  }

  if (!String(input?.name || '').trim()) {
    normalized.name = `adaptive-behavior-${normalized.behaviorId}`;
    notes.push('Inserted adaptive behavior name.');
  }

  if (!String(input?.purpose || '').trim()) {
    normalized.purpose = 'adaptive-purpose';
    notes.push('Inserted adaptive behavior purpose.');
  }

  if (!Array.isArray(input?.triggers) || !input.triggers.length) {
    normalized.triggers = fallback.triggers;
    notes.push('Inserted manual trigger fallback.');
  }

  if (!Array.isArray(input?.effects) || !input.effects.length) {
    normalized.effects = [{
      effectId: `effect-noop-${normalized.behaviorId}`,
      type: 'no-op',
      targetObjectIds: [],
      targetState: null,
      property: null,
      value: null,
      relationshipId: null,
      timelineStepId: null,
      priority: 1,
      durationHint: 0,
      reversible: false,
      metadata: { diagnostic: true }
    }];
    notes.push('Inserted safe no-op effect.');
  }

  if (!input?.stateRequirements && !input?.state_requirements && !input?.states) {
    normalized.stateRequirements = fallback.stateRequirements;
    notes.push('Inserted default ready state configuration.');
  }

  const seenTransitionIds = new Set();
  normalized.stateTransitions = normalized.stateTransitions.map((transition, index) => {
    const transitionId = String(transition.transitionId || '').trim() || `transition-${index + 1}`;
    if (!seenTransitionIds.has(transitionId)) {
      seenTransitionIds.add(transitionId);
      return transition;
    }
    const repairedId = `${transitionId}-${index + 1}`;
    notes.push(`Renamed duplicate transition id ${transitionId} to ${repairedId}.`);
    seenTransitionIds.add(repairedId);
    return {
      ...transition,
      transitionId: repairedId
    };
  });

  normalized.conditions = normalized.conditions.map((condition) => {
    if (!String(condition.field || '').trim() || !String(condition.operator || '').trim()) {
      notes.push(`Condition ${condition.conditionId} disabled due to unsafe structure.`);
      return {
        ...condition,
        required: false,
        metadata: {
          ...(condition.metadata || {}),
          disabled: true,
          reason: 'unsafe-condition-structure'
        }
      };
    }
    return condition;
  });

  return {
    behavior: normalized,
    notes,
    repaired: notes.length > 0
  };
}
