import { evaluateTemplateEligibility } from './VisualizationTemplateEligibility.js';
import { scoreVisualizationTemplateCandidate } from './VisualizationTemplateScorer.js';
import { beginSelectionStage, endSelectionStage } from './VisualizationTemplateSelectionDiagnostics.js';

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toEntries(registry, options = {}) {
  if (!registry) return [];
  if (Array.isArray(registry)) return registry;
  if (typeof registry.listTemplates === 'function') {
    return registry.listTemplates({
      includeDisabled: options.includeDisabled === true,
      includeDeprecated: options.includeDeprecated === true
    });
  }
  return [];
}

function buildRequirementCoverage(template = {}, context = {}) {
  const requirements = context.visualizationRequirements || {};
  const preferredCapabilities = new Set(toArray(requirements.preferredCapabilities).map(normalizeToken));
  const capabilityIds = [
    ...toArray(template.requiredCapabilities).map((item) => normalizeToken(item?.capabilityId)),
    ...toArray(template.optionalCapabilities).map((item) => normalizeToken(item?.capabilityId))
  ].filter(Boolean);

  const preferredMatches = capabilityIds.filter((item) => preferredCapabilities.has(item)).length;
  const preferredCoverage = preferredCapabilities.size
    ? preferredMatches / preferredCapabilities.size
    : capabilityIds.length
      ? 0.6
      : 0.5;

  const structures = {
    hasOrderedSteps: Boolean((context.orderedSteps || context.timelineRequirements || []).length),
    hasRelationships: Boolean((context.relationships || []).length),
    hasConcepts: Boolean((context.concepts || []).length)
  };

  const structuralCoverage = [
    structures.hasOrderedSteps ? 1 : 0,
    structures.hasRelationships ? 1 : 0,
    structures.hasConcepts ? 1 : 0
  ].reduce((sum, value) => sum + value, 0) / 3;

  return {
    coverage: Number(((preferredCoverage * 0.6) + (structuralCoverage * 0.4)).toFixed(6)),
    structures,
    preferredMatches,
    preferredTotal: preferredCapabilities.size
  };
}

function buildAccessibilityCoverage(template = {}, context = {}) {
  const needs = context.accessibilityNeeds || context.visualizationRequirements?.accessibilityNeeds || {};
  const accessibility = template.accessibility || {};

  const checks = [
    needs.textAlternativeRequired ? accessibility.textDescription !== '' : true,
    needs.keyboardCompatible ? accessibility.keyboardNavigation !== false : true,
    needs.reducedMotionCompatible ? accessibility.reducedMotionCompatibility !== false : true,
    needs.highContrastCompatible ? accessibility.highContrastCompatibility !== false : true
  ];

  return {
    coverage: Number((checks.filter(Boolean).length / checks.length).toFixed(6)),
    checks
  };
}

function buildPerformanceCoverage(template = {}, context = {}) {
  const profile = normalizeToken(context.performanceProfile || 'balanced');
  const minimum = normalizeToken(template.performance?.minimumProfile || 'low');
  const maximum = normalizeToken(template.performance?.maximumProfile || 'high');
  const rank = { low: 1, balanced: 2, auto: 2, high: 3 };

  const requested = rank[profile] || 2;
  const minRank = rank[minimum] || 1;
  const maxRank = rank[maximum] || 3;

  if (requested < minRank) {
    return { coverage: 0, reason: 'below-minimum-profile' };
  }

  if (requested > maxRank) {
    return { coverage: 0.6, reason: 'above-maximum-profile' };
  }

  return { coverage: 1, reason: 'compatible' };
}

function buildCapabilityCoverage(template = {}, context = {}) {
  const selected = new Set(toArray(context.selectedCapabilities).map((item) => normalizeToken(item?.id || item?.capabilityId)).filter(Boolean));
  const required = toArray(template.requiredCapabilities).map((item) => normalizeToken(item?.capabilityId)).filter(Boolean);
  const optional = toArray(template.optionalCapabilities).map((item) => normalizeToken(item?.capabilityId)).filter(Boolean);

  const requiredCovered = required.filter((item) => selected.has(item));
  const optionalCovered = optional.filter((item) => selected.has(item));

  return {
    requiredCovered,
    optionalCovered,
    requiredTotal: required.length,
    optionalTotal: optional.length,
    coverage: required.length ? Number((requiredCovered.length / required.length).toFixed(6)) : 1
  };
}

export function matchVisualizationTemplates(context = {}, registry, options = {}) {
  const stage = beginSelectionStage();
  const candidates = [];
  const rejected = [];
  const warnings = [];

  const entries = toEntries(registry, options);

  entries.forEach((entry) => {
    const template = entry?.template || {};
    const eligibility = evaluateTemplateEligibility(template, context, {
      enabled: entry.enabled,
      deprecated: entry.deprecated,
      allowDeprecated: options.allowDeprecated === true,
      requiredFeatures: options.requiredFeatures,
      excludedFeatures: options.excludedFeatures
    });

    const capabilityMatches = buildCapabilityCoverage(template, context);
    const requirementMatches = buildRequirementCoverage(template, context);
    const accessibilityMatches = buildAccessibilityCoverage(template, context);
    const performanceMatches = buildPerformanceCoverage(template, context);

    const unresolvedRequirements = [
      ...eligibility.hardFailures,
      ...(capabilityMatches.requiredTotal > capabilityMatches.requiredCovered.length
        ? [`required-capability-gap:${capabilityMatches.requiredTotal - capabilityMatches.requiredCovered.length}`]
        : [])
    ];

    const preliminaryScore = scoreVisualizationTemplateCandidate({
      template,
      registryEntry: entry,
      eligibility,
      capabilityMatches,
      requirementMatches,
      accessibilityMatches,
      performanceMatches,
      unresolvedRequirements,
      confidence: Number(template.metadata?.confidence || entry?.trustLevel || 0.6)
    }, context, options);

    const candidate = {
      template,
      registryEntry: entry,
      eligibility,
      featureMatches: {
        semanticPurpose: template.semanticPurpose,
        slotCount: toArray(template.slots).length,
        regionCount: toArray(template.regions).length
      },
      capabilityMatches,
      requirementMatches,
      accessibilityMatches,
      performanceMatches,
      unresolvedRequirements,
      preliminaryScore,
      score: preliminaryScore,
      confidence: preliminaryScore.confidence,
      explanation: preliminaryScore.explanation
    };

    if (eligibility.eligible) {
      candidates.push(candidate);
    } else {
      rejected.push(candidate);
    }

    warnings.push(...eligibility.softWarnings);
  });

  return {
    candidates,
    rejected,
    warnings: [...new Set(warnings)],
    diagnostics: {
      registrySize: entries.length,
      eligibleCount: candidates.length,
      rejectedCount: rejected.length,
      matchingDuration: endSelectionStage(stage)
    }
  };
}
