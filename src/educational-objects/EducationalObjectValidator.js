import { normalizeEducationalObject } from './EducationalObjectNormalizer.js';
import { normalizeEducationalObjectConfig } from './EducationalObjectConfig.js';
import { runEducationalObjectIntegrityChecks } from './EducationalObjectIntegrity.js';
import { createEducationalObjectDiagnostics } from './EducationalObjectDiagnostics.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function result(normalizedValue, errors = [], warnings = [], diagnostics = null, repairable = true) {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    repairable,
    normalizedValue,
    diagnostics
  };
}

export function validateObjectIdentity(value = {}) {
  const errors = [];
  const warnings = [];
  if (!value.objectId) errors.push('objectId is required.');
  if (!value.version) errors.push('version is required.');
  if (!value.name) warnings.push('name is missing and may be repaired.');
  if (!value.kind) warnings.push('kind is missing and may be repaired.');
  return result(value, errors, warnings, null, true);
}

export function validateObjectConceptReferences(conceptReferences = []) {
  const errors = [];
  const warnings = [];
  const ids = new Set();

  if (!Array.isArray(conceptReferences)) {
    errors.push('conceptReferences must be an array.');
    return result([], errors, warnings, null, true);
  }

  conceptReferences.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push(`conceptReference ${index} must be an object.`);
      return;
    }
    if (!item.referenceId) errors.push(`conceptReference ${index} is missing referenceId.`);
    if (!item.conceptId) warnings.push(`conceptReference ${index} is missing conceptId.`);
    if (ids.has(item.referenceId)) errors.push(`conceptReference duplicate id: ${item.referenceId}`);
    ids.add(item.referenceId);
  });

  return result(conceptReferences, errors, warnings, null, true);
}

export function validateObjectRelationships(relationships = []) {
  const errors = [];
  const warnings = [];
  const ids = new Set();

  if (!Array.isArray(relationships)) {
    errors.push('relationshipReferences must be an array.');
    return result([], errors, warnings, null, true);
  }

  relationships.forEach((item, index) => {
    if (!isObject(item)) {
      errors.push(`relationshipReference ${index} must be an object.`);
      return;
    }
    if (!item.relationId) warnings.push(`relationshipReference ${index} missing relationId.`);
    if (item.sourceObjectId && item.targetObjectId && item.sourceObjectId === item.targetObjectId) {
      errors.push(`relationshipReference ${item.relationId || index} self-reference is not allowed.`);
    }
    if (item.relationId && ids.has(item.relationId)) errors.push(`relationshipReference duplicate relationId: ${item.relationId}`);
    if (item.relationId) ids.add(item.relationId);
  });

  return result(relationships, errors, warnings, null, true);
}

export function validateObjectTemplateBindings(bindings = []) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(bindings)) {
    errors.push('templateBindings must be an array.');
    return result([], errors, warnings, null, true);
  }

  bindings.forEach((binding, index) => {
    if (!isObject(binding)) {
      errors.push(`templateBinding ${index} must be an object.`);
      return;
    }
    if (!binding.slotId && !binding.regionId) warnings.push(`templateBinding ${index} is missing slotId and regionId.`);
  });

  return result(bindings, errors, warnings, null, true);
}

export function validateObjectRepresentation(representation = {}) {
  const errors = [];
  if (!isObject(representation)) errors.push('representation must be an object.');
  return result(representation, errors, [], null, true);
}

export function validateObjectSpatialProperties(spatialProperties = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(spatialProperties)) errors.push('spatialProperties must be an object.');
  if (spatialProperties.relativePosition && (!Array.isArray(spatialProperties.relativePosition) || spatialProperties.relativePosition.length !== 3)) {
    warnings.push('spatialProperties.relativePosition should be a 3-length vector.');
  }
  return result(spatialProperties, errors, warnings, null, true);
}

export function validateObjectTemporalProperties(temporalProperties = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(temporalProperties)) errors.push('temporalProperties must be an object.');
  if (temporalProperties.sequenceIndex !== undefined && !isFiniteNumber(temporalProperties.sequenceIndex)) {
    warnings.push('temporalProperties.sequenceIndex should be numeric.');
  }
  return result(temporalProperties, errors, warnings, null, true);
}

export function validateObjectState(state = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(state)) errors.push('state must be an object.');
  if (!state.initial) warnings.push('state.initial missing.');
  return result(state, errors, warnings, null, true);
}

export function validateObjectAccessibility(accessibility = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(accessibility)) errors.push('accessibility must be an object.');
  if (!accessibility.textDescription) warnings.push('accessibility.textDescription missing.');
  return result(accessibility, errors, warnings, null, true);
}

export function validateObjectPerformance(performance = {}, config = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(performance)) errors.push('performance must be an object.');

  ['geometryBudget', 'materialBudget', 'textureBudget', 'animationBudget', 'interactionBudget'].forEach((key) => {
    if (performance[key] !== undefined && !isFiniteNumber(performance[key])) warnings.push(`performance.${key} should be numeric.`);
  });

  const profiles = new Set(config.performanceProfiles || ['low', 'balanced', 'high', 'auto']);
  if (performance.minimumProfile && !profiles.has(String(performance.minimumProfile))) warnings.push('performance.minimumProfile is unknown but preserved.');
  if (performance.maximumProfile && !profiles.has(String(performance.maximumProfile))) warnings.push('performance.maximumProfile is unknown but preserved.');

  return result(performance, errors, warnings, null, true);
}

export function validateObjectConstraints(constraints = []) {
  const errors = [];
  if (!Array.isArray(constraints)) errors.push('constraints must be an array.');
  return result(constraints, errors, [], null, true);
}

export function validateObjectVariables(variables = []) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  if (!Array.isArray(variables)) {
    errors.push('variables must be an array.');
    return result([], errors, warnings, null, true);
  }

  variables.forEach((variable, index) => {
    if (!isObject(variable)) {
      errors.push(`variable ${index} must be an object.`);
      return;
    }
    if (!variable.id) warnings.push(`variable ${index} missing id.`);
    if (variable.id && ids.has(variable.id)) errors.push(`duplicate variable id: ${variable.id}`);
    if (variable.id) ids.add(variable.id);
  });

  return result(variables, errors, warnings, null, true);
}

export function validateObjectConditions(conditions = []) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  if (!Array.isArray(conditions)) {
    errors.push('conditions must be an array.');
    return result([], errors, warnings, null, true);
  }

  conditions.forEach((condition, index) => {
    if (!isObject(condition)) {
      errors.push(`condition ${index} must be an object.`);
      return;
    }
    if (!condition.id) warnings.push(`condition ${index} missing id.`);
    if (condition.id && ids.has(condition.id)) errors.push(`duplicate condition id: ${condition.id}`);
    if (condition.id) ids.add(condition.id);
  });

  return result(conditions, errors, warnings, null, true);
}

export function validateEducationalObject(input = {}, options = {}) {
  const config = normalizeEducationalObjectConfig(options);
  const started = Date.now();
  const normalized = normalizeEducationalObject(input, config);

  const checks = [
    validateObjectIdentity(normalized),
    validateObjectConceptReferences(normalized.conceptReferences),
    validateObjectRelationships(normalized.relationshipReferences),
    validateObjectTemplateBindings(normalized.templateBindings),
    validateObjectRepresentation(normalized.representation),
    validateObjectSpatialProperties(normalized.spatialProperties),
    validateObjectTemporalProperties(normalized.temporalProperties),
    validateObjectState(normalized.state),
    validateObjectAccessibility(normalized.accessibility),
    validateObjectPerformance(normalized.performance, config),
    validateObjectConstraints(normalized.constraints),
    validateObjectVariables(normalized.variables),
    validateObjectConditions(normalized.conditions)
  ];

  const errors = [];
  const warnings = [];
  checks.forEach((check) => {
    errors.push(...check.errors);
    warnings.push(...check.warnings);
  });

  const integrity = runEducationalObjectIntegrityChecks(normalized, {
    knownObjectIds: options.knownObjectIds || []
  });
  errors.push(...integrity.errors);
  warnings.push(...integrity.warnings);

  const diagnostics = createEducationalObjectDiagnostics({
    objectId: normalized.objectId,
    objectVersion: normalized.version,
    conceptReferenceCount: normalized.conceptReferences.length,
    relationshipReferenceCount: normalized.relationshipReferences.length,
    capabilityReferenceCount: normalized.capabilityReferences.length,
    labelCount: normalized.labels.length,
    variableCount: normalized.variables.length,
    conditionCount: normalized.conditions.length,
    stateCount: Array.isArray(normalized.state?.availableStates) ? normalized.state.availableStates.length : 0,
    extensionCount: Object.keys(normalized.extensions || {}).length,
    brokenReferenceCount: integrity.brokenReferenceCount,
    validationDuration: Date.now() - started,
    warnings,
    errors
  });

  return result(normalized, errors, warnings, diagnostics, true);
}
