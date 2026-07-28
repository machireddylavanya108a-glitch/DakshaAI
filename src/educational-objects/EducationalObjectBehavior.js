import { normalizeEducationalObjectBehavior } from './EducationalObjectBehaviorNormalizer.js';
import { validateEducationalObjectBehavior } from './EducationalObjectBehaviorValidator.js';
import { repairEducationalObjectBehavior } from './EducationalObjectBehaviorRepair.js';

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function buildBehaviorFromObjectHint(object = {}, hint = {}, index = 0) {
  const objectId = String(object.objectId || object.id || `object-${index + 1}`);
  const sourceHint = toObject(hint);
  const behaviorId = String(sourceHint.behaviorId || sourceHint.id || `${objectId}-behavior-${index + 1}`);

  return {
    behaviorId,
    version: sourceHint.version || 'v1',
    name: sourceHint.name || `behavior-${behaviorId}`,
    purpose: sourceHint.purpose || 'adaptive-purpose',
    source: sourceHint.source || 'object-behavior-hint',
    enabled: sourceHint.enabled !== false,
    priority: Number(sourceHint.priority || index + 1),
    triggers: Array.isArray(sourceHint.triggers) && sourceHint.triggers.length ? sourceHint.triggers : [{
      triggerId: `${behaviorId}-trigger-1`,
      type: 'manual',
      sourceObjectId: objectId,
      sourceState: null,
      event: null,
      timelineStepId: null,
      interactionId: null,
      conditionIds: [],
      debounceMs: 0,
      once: false,
      priority: 1,
      metadata: {}
    }],
    conditions: Array.isArray(sourceHint.conditions) ? sourceHint.conditions : [],
    effects: Array.isArray(sourceHint.effects) && sourceHint.effects.length ? sourceHint.effects : [{
      effectId: `${behaviorId}-effect-1`,
      type: 'highlight',
      targetObjectIds: [objectId],
      targetState: null,
      property: null,
      value: null,
      relationshipId: null,
      timelineStepId: null,
      priority: 1,
      durationHint: 0,
      reversible: sourceHint.reversible === true,
      metadata: {}
    }],
    stateRequirements: toObject(sourceHint.stateRequirements).initialState
      ? sourceHint.stateRequirements
      : {
          initialState: String(object?.state?.initial || object?.state?.current || 'ready'),
          currentState: String(object?.state?.current || object?.state?.initial || 'ready'),
          availableStates: toArray(object?.state?.availableStates).length
            ? toArray(object.state.availableStates).map((name, stateIndex) => ({
                stateId: `${behaviorId}-state-${stateIndex + 1}`,
                name: String(name || `state-${stateIndex + 1}`),
                description: '',
                properties: {},
                availableActions: [],
                entryBehaviors: [],
                exitBehaviors: [],
                persistent: true,
                terminal: String(name || '').toLowerCase() === 'completed',
                metadata: {}
              }))
            : [{
                stateId: `${behaviorId}-state-ready`,
                name: 'ready',
                description: '',
                properties: {},
                availableActions: [],
                entryBehaviors: [],
                exitBehaviors: [],
                persistent: true,
                terminal: false,
                metadata: {}
              }],
          history: [],
          transitions: [],
          resetState: String(object?.state?.initial || object?.state?.current || 'ready'),
          completed: object?.state?.completed === true,
          disabled: object?.state?.disabled === true,
          metadata: {}
        },
    stateTransitions: Array.isArray(sourceHint.stateTransitions)
      ? sourceHint.stateTransitions
      : toArray(object?.state?.transitions),
    relationshipRequirements: Array.isArray(sourceHint.relationshipRequirements)
      ? sourceHint.relationshipRequirements
      : toArray(object?.relationshipReferences).map((relation, relationIndex) => ({
          relationshipId: relation?.relationId || `${behaviorId}-relationship-${relationIndex + 1}`,
          sourceObjectId: relation?.sourceObjectId || objectId,
          targetObjectId: relation?.targetObjectId || null,
          relation: relation?.relation || 'references',
          direction: 'directed',
          weight: 0.5,
          required: relation?.required === true,
          active: true,
          stateDependencies: [],
          behaviorDependencies: [],
          timelineDependencies: [],
          interactionDependencies: [],
          metadata: relation?.metadata || {}
        })),
    timelineHints: toObject(sourceHint.timelineHints),
    interactionHints: toObject(sourceHint.interactionHints),
    accessibility: toObject(sourceHint.accessibility),
    performance: toObject(sourceHint.performance),
    reversible: sourceHint.reversible === true,
    repeatable: sourceHint.repeatable !== false,
    interruptible: sourceHint.interruptible !== false,
    cooldown: Number(sourceHint.cooldown || 0),
    limits: toObject(sourceHint.limits),
    metadata: toObject(sourceHint.metadata),
    extensions: toObject(sourceHint.extensions),
    diagnostics: toObject(sourceHint.diagnostics)
  };
}

export function createEducationalObjectBehavior(input = {}, options = {}) {
  const repaired = repairEducationalObjectBehavior(input, options);
  const normalized = normalizeEducationalObjectBehavior(repaired.behavior, options);
  const validation = validateEducationalObjectBehavior(normalized, options);

  if (validation.valid && repaired.repaired !== true) {
    return {
      behavior: validation.normalizedValue,
      validation,
      repaired: false,
      notes: []
    };
  }

  if (validation.valid && repaired.repaired === true) {
    return {
      behavior: validation.normalizedValue,
      validation,
      repaired: true,
      notes: repaired.notes
    };
  }

  if (options.allowRepair === false) {
    return {
      behavior: validation.normalizedValue,
      validation,
      repaired: repaired.repaired === true,
      notes: repaired.notes
    };
  }

  const repair = repairEducationalObjectBehavior(validation.normalizedValue, options);
  const repairedValidation = validateEducationalObjectBehavior(repair.behavior, options);

  return {
    behavior: repairedValidation.normalizedValue,
    validation: repairedValidation,
    repaired: repair.repaired,
    notes: repair.notes
  };
}

export function ensureSceneEducationalObjectBehaviorMetadata(scene = {}, options = {}) {
  const safeScene = toObject(scene);
  const metadata = toObject(safeScene.metadata);

  const legacyBehaviors = toArray(safeScene.objectBehaviors || safeScene.behaviors || safeScene.actions || safeScene.events);
  const declaredObjects = toArray(safeScene.educationalObjects);

  const generatedBehaviors = [];
  declaredObjects.forEach((object, objectIndex) => {
    const hints = toArray(object?.behaviorHints);
    if (hints.length) {
      hints.forEach((hint, hintIndex) => generatedBehaviors.push(buildBehaviorFromObjectHint(object, hint, hintIndex)));
      return;
    }
    if (options.includeDefaultObjectBehavior === true) {
      generatedBehaviors.push(buildBehaviorFromObjectHint(object, {}, objectIndex));
    }
  });

  const sourceBehaviors = legacyBehaviors.length ? legacyBehaviors : generatedBehaviors;
  const processedBehaviors = sourceBehaviors.map((item) => createEducationalObjectBehavior(item, { allowRepair: true }));

  const objectBehaviors = processedBehaviors.map((item) => item.behavior);
  const behaviorDiagnostics = {
    warningCount: processedBehaviors.reduce((sum, item) => sum + (item.validation?.warnings?.length || 0), 0),
    errorCount: processedBehaviors.reduce((sum, item) => sum + (item.validation?.errors?.length || 0), 0),
    repairedCount: processedBehaviors.filter((item) => item.repaired).length,
    items: processedBehaviors.map((item) => ({
      behaviorId: item.behavior?.behaviorId || null,
      valid: item.validation?.valid === true,
      warnings: item.validation?.warnings || [],
      errors: item.validation?.errors || [],
      repaired: item.repaired === true,
      notes: item.notes || []
    }))
  };

  const objectRelationships = objectBehaviors.flatMap((behavior) => toArray(behavior.relationshipRequirements));
  const objectStateDefinitions = objectBehaviors.map((behavior) => ({
    behaviorId: behavior.behaviorId,
    stateRequirements: behavior.stateRequirements,
    stateTransitions: behavior.stateTransitions
  }));

  return {
    ...safeScene,
    objectBehaviors,
    objectStateDefinitions,
    objectRelationships,
    behaviorDiagnostics,
    metadata: {
      ...metadata,
      objectBehaviors,
      objectStateDefinitions,
      objectRelationships,
      behaviorDiagnostics
    }
  };
}
