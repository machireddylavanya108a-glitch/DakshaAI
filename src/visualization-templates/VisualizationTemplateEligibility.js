import { validateVisualizationTemplate } from './VisualizationTemplateValidator.js';

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function clamp01(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(1, numeric));
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function profileRank(profile) {
  const normalized = normalizeToken(profile || 'balanced');
  if (normalized === 'low') return 1;
  if (normalized === 'balanced' || normalized === 'auto') return 2;
  if (normalized === 'high') return 3;
  return 2;
}

function hasFeature(template = {}, feature = '') {
  const token = normalizeToken(feature);
  if (!token) return false;

  const checks = [
    template.semanticPurpose,
    template.layout?.strategy,
    template.interactionHints?.interactionDepth,
    ...(toArray(template.slots).map((slot) => slot?.purpose)),
    ...(toArray(template.variables).map((variable) => variable?.name)),
    ...(toArray(template.requiredCapabilities).map((item) => item?.capabilityId)),
    ...(toArray(template.optionalCapabilities).map((item) => item?.capabilityId))
  ].map(normalizeToken);

  return checks.includes(token);
}

export function evaluateTemplateEligibility(template, context = {}, options = {}) {
  const normalizedTemplate = template && typeof template === 'object' ? template : {};
  const hardFailures = [];
  const softWarnings = [];
  const satisfiedConstraints = [];
  const unmetConstraints = [];

  const validation = validateVisualizationTemplate(normalizedTemplate, {
    allowFallback: options.allowFallback !== false
  });

  if (!validation.valid) {
    hardFailures.push('template-validation-failed');
    unmetConstraints.push(...validation.errors.slice(0, 10));
  } else {
    satisfiedConstraints.push('template-validation-passed');
  }

  if (options.enabled === false) {
    hardFailures.push('template-disabled');
  }

  if (options.deprecated === true && options.allowDeprecated !== true) {
    hardFailures.push('template-deprecated');
  }

  const requiredCapabilities = toArray(normalizedTemplate.requiredCapabilities).map((item) => normalizeToken(item?.capabilityId)).filter(Boolean);
  const selectedCapabilities = new Set(toArray(context.selectedCapabilities).map((item) => normalizeToken(item?.id || item?.capabilityId)).filter(Boolean));

  requiredCapabilities.forEach((capabilityId) => {
    if (!selectedCapabilities.has(capabilityId)) {
      hardFailures.push(`missing-required-capability:${capabilityId}`);
    } else {
      satisfiedConstraints.push(`required-capability:${capabilityId}`);
    }
  });

  const profile = normalizeToken(context.performanceProfile || context.deviceCapabilities?.performanceProfile || 'balanced');
  const minimum = normalizeToken(normalizedTemplate.performance?.minimumProfile || 'low');
  const maximum = normalizeToken(normalizedTemplate.performance?.maximumProfile || 'high');
  const profileValue = profileRank(profile);

  if (profileValue < profileRank(minimum)) {
    hardFailures.push('performance-profile-too-low');
  } else if (profileValue > profileRank(maximum)) {
    softWarnings.push('performance-profile-higher-than-template-maximum');
  } else {
    satisfiedConstraints.push('performance-profile-compatible');
  }

  const accessibilityNeeds = context.accessibilityNeeds || context.visualizationRequirements?.accessibilityNeeds || {};
  const accessibility = normalizedTemplate.accessibility || {};

  if (accessibilityNeeds.textAlternativeRequired && accessibility.textDescription === '') {
    hardFailures.push('accessibility-text-description-required');
  }

  if (accessibilityNeeds.keyboardCompatible && accessibility.keyboardNavigation === false) {
    hardFailures.push('accessibility-keyboard-required');
  }

  if (accessibilityNeeds.reducedMotionCompatible && accessibility.reducedMotionCompatibility === false) {
    hardFailures.push('accessibility-reduced-motion-required');
  }

  if (!accessibility.textDescription) {
    softWarnings.push('accessibility-text-description-missing');
  }

  const requiredFeatures = toArray(options.requiredFeatures);
  requiredFeatures.forEach((feature) => {
    if (!hasFeature(normalizedTemplate, feature)) {
      hardFailures.push(`required-feature-missing:${feature}`);
    }
  });

  const excludedFeatures = toArray(options.excludedFeatures);
  excludedFeatures.forEach((feature) => {
    if (hasFeature(normalizedTemplate, feature)) {
      hardFailures.push(`excluded-feature-present:${feature}`);
    }
  });

  const slots = toArray(normalizedTemplate.slots);
  const regions = toArray(normalizedTemplate.regions);

  if (!slots.length) hardFailures.push('template-has-no-slots');
  if (!regions.length) hardFailures.push('template-has-no-regions');

  const compatibility = {
    validation: validation.valid ? 1 : 0,
    capabilityCoverage: requiredCapabilities.length
      ? requiredCapabilities.filter((item) => selectedCapabilities.has(item)).length / requiredCapabilities.length
      : 1,
    accessibilityCoverage: clamp01([
      accessibilityNeeds.textAlternativeRequired ? accessibility.textDescription !== '' : true,
      accessibilityNeeds.keyboardCompatible ? accessibility.keyboardNavigation !== false : true,
      accessibilityNeeds.reducedMotionCompatible ? accessibility.reducedMotionCompatibility !== false : true
    ].filter(Boolean).length / 3),
    performanceCoverage: hardFailures.includes('performance-profile-too-low') ? 0 : 1,
    dataCoverage: 1
  };

  return {
    eligible: hardFailures.length === 0,
    hardFailures: [...new Set(hardFailures)],
    softWarnings: [...new Set(softWarnings)],
    satisfiedConstraints,
    unmetConstraints,
    compatibility,
    diagnostics: {
      templateId: normalizedTemplate.templateId || null,
      templateVersion: normalizedTemplate.version || null,
      validationErrors: validation.errors.slice(0, 12),
      validationWarnings: validation.warnings.slice(0, 12)
    }
  };
}
