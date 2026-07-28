import { validateVisualizationTemplate } from './VisualizationTemplateValidator.js';
import { runVisualizationTemplateIntegrityChecks } from './VisualizationTemplateIntegrity.js';
import { bindTemplateSlots, bindTemplateRegions, resolveTemplateVariables } from './VisualizationTemplateBinding.js';

function clamp(min, value, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function safeRatio(numerator, denominator, fallback = 0) {
  const n = Number(numerator);
  const d = Number(denominator);
  if (!Number.isFinite(n) || !Number.isFinite(d) || d <= 0) return fallback;
  return n / d;
}

function profileRank(profile = 'balanced') {
  const token = String(profile || 'balanced').toLowerCase();
  if (token === 'low') return 1;
  if (token === 'balanced' || token === 'auto') return 2;
  if (token === 'high') return 3;
  return 2;
}

export function evaluateVisualizationTemplateQuality(template = {}, context = {}, options = {}) {
  const validation = validateVisualizationTemplate(template, options);
  const integrity = runVisualizationTemplateIntegrityChecks(validation.normalizedValue);

  const slotCount = Array.isArray(validation.normalizedValue.slots) ? validation.normalizedValue.slots.length : 0;
  const regionCount = Array.isArray(validation.normalizedValue.regions) ? validation.normalizedValue.regions.length : 0;
  const relationshipCount = Array.isArray(validation.normalizedValue.relationships) ? validation.normalizedValue.relationships.length : 0;

  const selectedCapabilities = Array.isArray(context.selectedCapabilities) ? context.selectedCapabilities : [];
  const requiredCapabilities = Array.isArray(validation.normalizedValue.requiredCapabilities)
    ? validation.normalizedValue.requiredCapabilities
    : [];

  const selectedIds = new Set(selectedCapabilities.map((item) => String(item?.id || item?.capabilityId || '')));
  const requiredCovered = requiredCapabilities.filter((item) => selectedIds.has(String(item?.capabilityId || ''))).length;
  const capabilityCoverage = requiredCapabilities.length ? safeRatio(requiredCovered, requiredCapabilities.length, 1) : 1;

  const conceptCount = Array.isArray(context.concepts) ? context.concepts.length : 0;
  const requirementCoverage = conceptCount ? clamp(0, safeRatio(slotCount, conceptCount, 0.5), 1) : 0.7;

  const accessibility = validation.normalizedValue.accessibility || {};
  const accessibilityChecks = [
    accessibility.textDescription ? 1 : 0,
    accessibility.keyboardNavigation !== false ? 1 : 0,
    accessibility.reducedMotionCompatibility !== false ? 1 : 0,
    accessibility.highContrastCompatibility !== false ? 1 : 0
  ];
  const accessibilityCoverage = safeRatio(accessibilityChecks.reduce((sum, value) => sum + value, 0), accessibilityChecks.length, 0);

  const requestedProfile = profileRank(context.performanceProfile || options.performanceProfile || 'balanced');
  const minProfile = profileRank(validation.normalizedValue.performance?.minimumProfile || 'low');
  const maxProfile = profileRank(validation.normalizedValue.performance?.maximumProfile || 'high');
  const performanceCompatibility = requestedProfile < minProfile ? 0 : requestedProfile > maxProfile ? 0.6 : 1;

  const slotBindings = bindTemplateSlots({
    sourceTemplate: validation.normalizedValue,
    resolvedSlots: validation.normalizedValue.slots,
    resolvedRegions: validation.normalizedValue.regions,
    resolvedVariables: {}
  }, context, options);
  const regionBindings = bindTemplateRegions({
    sourceTemplate: validation.normalizedValue,
    resolvedSlots: validation.normalizedValue.slots,
    resolvedRegions: validation.normalizedValue.regions,
    resolvedVariables: {}
  }, slotBindings, context, options);
  const variableBinding = resolveTemplateVariables({ sourceTemplate: validation.normalizedValue }, context, options);

  const unresolvedRequiredCount = slotBindings.unboundRequiredSlots.length + variableBinding.unresolvedRequiredVariables.length;
  const bindingCoverage = slotCount ? clamp(0, safeRatio(slotCount - slotBindings.unboundRequiredSlots.length, slotCount, 1), 1) : 1;

  const duplicationPenalty = Math.min(1, integrity.duplicateIdCount / 5);
  const fallbackDependence = validation.normalizedValue.metadata?.fallback ? 0.3 : 0;
  const relationshipIntegrity = relationshipCount === 0 ? 1 : clamp(0, 1 - safeRatio(integrity.brokenReferenceCount, relationshipCount, 0), 1);
  const complexityBudget = Number(context.sceneConstraints?.complexityBudget?.maxTemplateComplexity || options.maximumSlots || 40);
  const complexityCurrent = slotCount + regionCount;
  const complexityFit = complexityCurrent <= complexityBudget ? 1 : clamp(0, 1 - safeRatio(complexityCurrent - complexityBudget, complexityBudget || 1, 0), 1);

  const components = {
    schemaValidity: validation.valid ? 1 : 0,
    integrity: integrity.status === 'valid' ? 1 : 0.5,
    capabilityCoverage,
    requirementCoverage,
    slotCoverage: slotCount ? 1 : 0,
    regionCoherence: regionCount ? 1 : 0,
    relationshipIntegrity,
    layoutCoherence: validation.normalizedValue.layout?.strategy ? 1 : 0.5,
    accessibilityCoverage,
    performanceCompatibility,
    bindingReadiness: bindingCoverage,
    timelineCompatibility: context.orderedSteps?.length && validation.normalizedValue.timelineHints?.required === false ? 0.6 : 1,
    interactionCompatibility: validation.normalizedValue.interactionHints ? 1 : 0.6,
    complexityFit,
    fallbackDependence: 1 - fallbackDependence,
    unresolvedPenalty: 1 - Math.min(1, unresolvedRequiredCount / 4),
    duplicationPenalty: 1 - duplicationPenalty,
    determinism: 1
  };

  const weights = {
    schemaValidity: 8,
    integrity: 8,
    capabilityCoverage: 8,
    requirementCoverage: 8,
    slotCoverage: 5,
    regionCoherence: 5,
    relationshipIntegrity: 6,
    layoutCoherence: 5,
    accessibilityCoverage: 9,
    performanceCompatibility: 8,
    bindingReadiness: 7,
    timelineCompatibility: 4,
    interactionCompatibility: 4,
    complexityFit: 6,
    fallbackDependence: 3,
    unresolvedPenalty: 4,
    duplicationPenalty: 3,
    determinism: 2
  };

  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const weighted = Object.entries(components).reduce((sum, [key, value]) => sum + value * (weights[key] || 0), 0);
  const score = Number((weighted / totalWeight * 100).toFixed(3));

  const threshold = Number(options.qualityThreshold || 65);
  const passed = score >= threshold && validation.valid;

  const strengths = [];
  const weaknesses = [];
  if (accessibilityCoverage >= 0.9) strengths.push('strong-accessibility-coverage');
  if (performanceCompatibility >= 1) strengths.push('performance-compatible');
  if (relationshipIntegrity >= 0.9) strengths.push('relationship-integrity-strong');
  if (!validation.valid) weaknesses.push('schema-validation-failed');
  if (unresolvedRequiredCount > 0) weaknesses.push('unresolved-required-items');
  if (complexityFit < 0.8) weaknesses.push('complexity-budget-pressure');

  return {
    score,
    confidence: Number(clamp(0, (components.schemaValidity + components.integrity + components.requirementCoverage) / 3, 1).toFixed(6)),
    passed,
    components,
    strengths,
    weaknesses,
    warnings: [...validation.warnings, ...integrity.warnings],
    recommendations: [
      ...(unresolvedRequiredCount > 0 ? ['improve-required-slot-coverage'] : []),
      ...(complexityFit < 0.9 ? ['simplify-optional-structure'] : []),
      ...(accessibilityCoverage < 1 ? ['improve-accessibility-defaults'] : [])
    ]
  };
}
