import { normalizeVisualizationCapability } from './VisualizationCapabilityNormalizer.js';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function makeValidationResult(normalizedValue, errors = [], warnings = [], repairable = true) {
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    repairable,
    normalizedValue
  };
}

function validateRuleShape(rule, label, index, errors, warnings) {
  if (!isObject(rule)) {
    errors.push(`${label} rule ${index} must be an object.`);
    return;
  }

  if (!rule.id) warnings.push(`${label} rule ${index} has no id.`);
  if (!rule.field) warnings.push(`${label} rule ${index} has no field.`);
  if (!rule.operator) warnings.push(`${label} rule ${index} has no operator.`);
  if (!Number.isFinite(Number(rule.weight))) {
    warnings.push(`${label} rule ${index} weight was normalized.`);
  }
}

export function validateCapabilityRequirements(requirements = []) {
  const normalized = Array.isArray(requirements) ? requirements : [];
  const errors = [];
  const warnings = [];

  normalized.forEach((rule, index) => validateRuleShape(rule, 'Requirement', index, errors, warnings));

  return makeValidationResult(normalized, errors, warnings, true);
}

export function validateCapabilityComposition(composition = {}) {
  const source = isObject(composition) ? composition : {};
  const errors = [];
  const warnings = [];

  const requiredArrays = [
    'selectedCapabilities',
    'supportingCapabilities',
    'optionalCapabilities',
    'compositionOrder',
    'conflicts',
    'dependencies'
  ];

  requiredArrays.forEach((key) => {
    if (!(key in source)) {
      warnings.push(`Composition field ${key} is missing.`);
      return;
    }
    if (!Array.isArray(source[key])) {
      errors.push(`Composition field ${key} must be an array.`);
    }
  });

  return makeValidationResult(source, errors, warnings, true);
}

export function validateVisualizationCapability(input = {}, options = {}) {
  const normalizedValue = normalizeVisualizationCapability(input, options);
  const errors = [];
  const warnings = [];

  if (!normalizedValue.id) errors.push('Capability id is required.');
  if (!normalizedValue.name) errors.push('Capability name is required.');
  if (!normalizedValue.semanticPurpose) warnings.push('semanticPurpose is empty; capability remains valid but less matchable.');

  if (!Array.isArray(normalizedValue.supportedLearningActions)) {
    errors.push('supportedLearningActions must be an array.');
  }

  const requirementValidation = validateCapabilityRequirements(normalizedValue.inputRequirements);
  errors.push(...requirementValidation.errors);
  warnings.push(...requirementValidation.warnings);

  const compositionValidation = validateCapabilityRequirements(normalizedValue.compositionRules);
  errors.push(...compositionValidation.errors);
  warnings.push(...compositionValidation.warnings);

  if (!isObject(normalizedValue.accessibilityProperties)) {
    errors.push('accessibilityProperties must be an object.');
  }

  if (!isObject(normalizedValue.performanceProperties)) {
    errors.push('performanceProperties must be an object.');
  }

  return makeValidationResult(normalizedValue, errors, warnings, true);
}
