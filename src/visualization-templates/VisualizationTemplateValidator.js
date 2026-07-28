import { normalizeVisualizationTemplate } from './VisualizationTemplateNormalizer.js';
import { normalizeVisualizationTemplateConfig } from './VisualizationTemplateConfig.js';
import { runVisualizationTemplateIntegrityChecks } from './VisualizationTemplateIntegrity.js';
import { createVisualizationTemplateDiagnostics } from './VisualizationTemplateDiagnostics.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function withResult(normalizedValue, errors = [], warnings = [], diagnostics = null, repairable = true) {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    repairable,
    normalizedValue,
    diagnostics
  };
}

export function validateTemplateSlots(slots = [], template = {}) {
  const errors = [];
  const warnings = [];
  const ids = new Set();
  const regionIds = new Set((Array.isArray(template.regions) ? template.regions : []).map((item) => item.id));

  if (!Array.isArray(slots)) {
    errors.push('slots must be an array.');
    return { valid: false, errors, warnings, repairable: true, normalizedValue: [] };
  }

  slots.forEach((slot, index) => {
    if (!isObject(slot)) {
      errors.push(`slot ${index} must be an object.`);
      return;
    }
    if (!slot.id) errors.push(`slot ${index} is missing id.`);
    if (ids.has(slot.id)) errors.push(`slot id ${slot.id} is duplicated.`);
    ids.add(slot.id);

    if (slot.regionId && !regionIds.has(slot.regionId)) {
      errors.push(`slot ${slot.id} references missing region ${slot.regionId}.`);
    }

    if (!isFiniteNumber(slot.capacity)) warnings.push(`slot ${slot.id || index} capacity is non-numeric.`);
    if (!isFiniteNumber(slot.priority)) warnings.push(`slot ${slot.id || index} priority is non-numeric.`);
  });

  return { valid: errors.length === 0, errors, warnings, repairable: true, normalizedValue: slots };
}

export function validateTemplateRegions(regions = []) {
  const errors = [];
  const warnings = [];
  const ids = new Set();

  if (!Array.isArray(regions)) {
    errors.push('regions must be an array.');
    return { valid: false, errors, warnings, repairable: true, normalizedValue: [] };
  }

  regions.forEach((region, index) => {
    if (!isObject(region)) {
      errors.push(`region ${index} must be an object.`);
      return;
    }
    if (!region.id) errors.push(`region ${index} is missing id.`);
    if (ids.has(region.id)) errors.push(`region id ${region.id} is duplicated.`);
    ids.add(region.id);

    if (!isObject(region.bounds)) warnings.push(`region ${region.id || index} should have bounds object.`);
  });

  return { valid: errors.length === 0, errors, warnings, repairable: true, normalizedValue: regions };
}

export function validateTemplateRelationships(relationships = [], template = {}) {
  const errors = [];
  const warnings = [];
  const nodeIds = new Set([
    ...(Array.isArray(template.slots) ? template.slots.map((item) => item.id) : []),
    ...(Array.isArray(template.regions) ? template.regions.map((item) => item.id) : [])
  ]);

  if (!Array.isArray(relationships)) {
    errors.push('relationships must be an array.');
    return { valid: false, errors, warnings, repairable: true, normalizedValue: [] };
  }

  relationships.forEach((relationship, index) => {
    if (!isObject(relationship)) {
      errors.push(`relationship ${index} must be an object.`);
      return;
    }

    if (!relationship.id) errors.push(`relationship ${index} missing id.`);
    if (!relationship.sourceId || !relationship.targetId) warnings.push(`relationship ${relationship.id || index} missing source/target.`);
    if (relationship.sourceId === relationship.targetId) errors.push(`relationship ${relationship.id || index} self-reference is not allowed.`);

    if (relationship.sourceId && !nodeIds.has(relationship.sourceId)) warnings.push(`relationship ${relationship.id || index} source unresolved.`);
    if (relationship.targetId && !nodeIds.has(relationship.targetId)) warnings.push(`relationship ${relationship.id || index} target unresolved.`);
  });

  return { valid: errors.length === 0, errors, warnings, repairable: true, normalizedValue: relationships };
}

export function validateTemplateLayout(layout = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(layout)) errors.push('layout must be an object.');
  if (!layout.strategy) warnings.push('layout.strategy is missing.');
  return { valid: errors.length === 0, errors, warnings, repairable: true, normalizedValue: layout };
}

export function validateTemplateVariables(variables = []) {
  const errors = [];
  const warnings = [];
  const ids = new Set();

  if (!Array.isArray(variables)) {
    errors.push('variables must be an array.');
    return { valid: false, errors, warnings, repairable: true, normalizedValue: [] };
  }

  variables.forEach((variable, index) => {
    if (!isObject(variable)) {
      errors.push(`variable ${index} must be an object.`);
      return;
    }
    if (!variable.id) errors.push(`variable ${index} missing id.`);
    if (ids.has(variable.id)) errors.push(`variable id ${variable.id} is duplicated.`);
    ids.add(variable.id);
  });

  return { valid: errors.length === 0, errors, warnings, repairable: true, normalizedValue: variables };
}

export function validateTemplateConditions(conditions = []) {
  const errors = [];
  const warnings = [];
  if (!Array.isArray(conditions)) {
    errors.push('conditions must be an array.');
    return { valid: false, errors, warnings, repairable: true, normalizedValue: [] };
  }

  conditions.forEach((condition, index) => {
    if (!isObject(condition)) {
      errors.push(`condition ${index} must be an object.`);
      return;
    }
    if (!condition.id) warnings.push(`condition ${index} missing id.`);
    if (!condition.operator) warnings.push(`condition ${condition.id || index} missing operator.`);
  });

  return { valid: errors.length === 0, errors, warnings, repairable: true, normalizedValue: conditions };
}

export function validateTemplateAccessibility(accessibility = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(accessibility)) errors.push('accessibility must be an object.');
  if (!accessibility.textDescription) warnings.push('accessibility.textDescription missing.');
  return { valid: errors.length === 0, errors, warnings, repairable: true, normalizedValue: accessibility };
}

export function validateTemplatePerformance(performance = {}, config = {}) {
  const errors = [];
  const warnings = [];
  const profiles = new Set(config.performanceProfiles || ['low', 'balanced', 'high', 'auto']);

  if (!isObject(performance)) errors.push('performance must be an object.');

  const minimumProfile = String(performance?.minimumProfile || 'low');
  const maximumProfile = String(performance?.maximumProfile || 'high');
  if (!profiles.has(minimumProfile)) warnings.push('performance.minimumProfile is unknown but preserved.');
  if (!profiles.has(maximumProfile)) warnings.push('performance.maximumProfile is unknown but preserved.');

  ['objectBudget', 'animationBudget', 'interactionBudget', 'assetBudget'].forEach((key) => {
    if (!isFiniteNumber(performance?.[key])) warnings.push(`performance.${key} should be numeric.`);
  });

  return { valid: errors.length === 0, errors, warnings, repairable: true, normalizedValue: performance };
}

export function validateTemplateComposition(composition = {}) {
  const errors = [];
  const warnings = [];
  if (!isObject(composition)) {
    errors.push('composition must be an object.');
    return { valid: false, errors, warnings, repairable: true, normalizedValue: {} };
  }

  if (!composition.mode) warnings.push('composition.mode missing.');
  if (!Array.isArray(composition.supportingCapabilities)) warnings.push('composition.supportingCapabilities should be an array.');

  return { valid: errors.length === 0, errors, warnings, repairable: true, normalizedValue: composition };
}

export function validateVisualizationTemplate(input = {}, options = {}) {
  const config = normalizeVisualizationTemplateConfig(options);
  const started = Date.now();
  const normalizedValue = normalizeVisualizationTemplate(input, config);
  const errors = [];
  const warnings = [];

  if (!normalizedValue.templateId) errors.push('templateId is required.');
  if (!normalizedValue.version) errors.push('version is required.');
  if (!normalizedValue.name) errors.push('name is required.');

  const slotResult = validateTemplateSlots(normalizedValue.slots, normalizedValue);
  const regionResult = validateTemplateRegions(normalizedValue.regions);
  const relationshipResult = validateTemplateRelationships(normalizedValue.relationships, normalizedValue);
  const layoutResult = validateTemplateLayout(normalizedValue.layout);
  const variableResult = validateTemplateVariables(normalizedValue.variables);
  const conditionResult = validateTemplateConditions(normalizedValue.conditions);
  const accessibilityResult = validateTemplateAccessibility(normalizedValue.accessibility);
  const performanceResult = validateTemplatePerformance(normalizedValue.performance, config);
  const compositionResult = validateTemplateComposition(normalizedValue.composition);

  [
    slotResult,
    regionResult,
    relationshipResult,
    layoutResult,
    variableResult,
    conditionResult,
    accessibilityResult,
    performanceResult,
    compositionResult
  ].forEach((result) => {
    errors.push(...result.errors);
    warnings.push(...result.warnings);
  });

  const integrity = runVisualizationTemplateIntegrityChecks(normalizedValue);
  errors.push(...integrity.errors);
  warnings.push(...integrity.warnings);

  const diagnostics = createVisualizationTemplateDiagnostics({
    templateId: normalizedValue.templateId,
    templateVersion: normalizedValue.version
  });

  diagnostics.validationDuration = Date.now() - started;
  diagnostics.slotCount = Array.isArray(normalizedValue.slots) ? normalizedValue.slots.length : 0;
  diagnostics.regionCount = Array.isArray(normalizedValue.regions) ? normalizedValue.regions.length : 0;
  diagnostics.relationshipCount = Array.isArray(normalizedValue.relationships) ? normalizedValue.relationships.length : 0;
  diagnostics.variableCount = Array.isArray(normalizedValue.variables) ? normalizedValue.variables.length : 0;
  diagnostics.conditionCount = Array.isArray(normalizedValue.conditions) ? normalizedValue.conditions.length : 0;
  diagnostics.extensionCount = Object.keys(normalizedValue.extensions || {}).length;
  diagnostics.duplicateIdCount = integrity.duplicateIdCount;
  diagnostics.brokenReferenceCount = integrity.brokenReferenceCount;

  return withResult(normalizedValue, errors, warnings, diagnostics, true);
}
