function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

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

function normalizeWeights(input = {}) {
  const defaults = {
    capabilityCoverage: 1,
    requirementCoverage: 1,
    semanticCompatibility: 1,
    slotCompatibility: 0.8,
    layoutCompatibility: 0.7,
    accessibility: 1,
    performance: 1,
    runtimeSupport: 0.7,
    composition: 0.6,
    confidence: 0.6,
    complexityFit: 0.7,
    unresolvedPenalty: 1
  };

  const merged = { ...defaults, ...(input && typeof input === 'object' ? input : {}) };
  const clamped = Object.fromEntries(Object.entries(merged).map(([key, value]) => [key, clamp(0, value, 10)]));
  const total = Object.values(clamped).reduce((sum, value) => sum + value, 0) || 1;

  return Object.fromEntries(Object.entries(clamped).map(([key, value]) => [key, value / total]));
}

function profileRank(profile) {
  const token = normalizeToken(profile || 'balanced');
  if (token === 'low') return 1;
  if (token === 'balanced' || token === 'auto') return 2;
  if (token === 'high') return 3;
  return 2;
}

export function scoreVisualizationTemplateCandidate(candidate, context = {}, options = {}) {
  const weights = normalizeWeights(options.weights || {});
  const template = candidate?.template || candidate?.registryEntry?.template || {};
  const eligibility = candidate?.eligibility || {};
  const requirementMatches = candidate?.requirementMatches || {};
  const accessibilityMatches = candidate?.accessibilityMatches || {};
  const performanceMatches = candidate?.performanceMatches || {};
  const unresolvedRequirements = toArray(candidate?.unresolvedRequirements);

  const requiredCapabilities = toArray(template.requiredCapabilities).map((item) => normalizeToken(item?.capabilityId)).filter(Boolean);
  const selectedCapabilities = new Set(toArray(context.selectedCapabilities).map((item) => normalizeToken(item?.id || item?.capabilityId)).filter(Boolean));
  const requiredCovered = requiredCapabilities.filter((item) => selectedCapabilities.has(item)).length;
  const optionalCapabilities = toArray(template.optionalCapabilities).map((item) => normalizeToken(item?.capabilityId)).filter(Boolean);
  const optionalCovered = optionalCapabilities.filter((item) => selectedCapabilities.has(item)).length;

  const capabilityCoverage = requiredCapabilities.length
    ? safeRatio(requiredCovered, requiredCapabilities.length, 1)
    : optionalCapabilities.length
      ? safeRatio(optionalCovered, optionalCapabilities.length, 0.5)
      : 0.6;

  const requirementCoverage = clamp(0, Number(requirementMatches.coverage ?? eligibility?.compatibility?.dataCoverage ?? 0.5), 1);

  const preferredPurposes = toArray(context.visualizationRequirements?.preferredCapabilities || context.metadata?.semanticPurposes).map(normalizeToken);
  const semanticPurpose = normalizeToken(template.semanticPurpose || '');
  const semanticCompatibility = preferredPurposes.length
    ? (preferredPurposes.includes(semanticPurpose) ? 1 : 0.35)
    : 0.6;

  const slotCompatibility = template.slots?.length ? 1 : 0;
  const layoutCompatibility = template.layout?.strategy ? 0.9 : 0.4;

  const accessibilityCoverage = clamp(0, Number(accessibilityMatches.coverage ?? eligibility?.compatibility?.accessibilityCoverage ?? 0.5), 1);

  const requestedProfile = normalizeToken(context.performanceProfile || 'balanced');
  const minimumProfile = normalizeToken(template.performance?.minimumProfile || 'low');
  const maximumProfile = normalizeToken(template.performance?.maximumProfile || 'high');
  const profileValue = profileRank(requestedProfile);
  const performanceCompatibility = profileValue < profileRank(minimumProfile)
    ? 0
    : profileValue > profileRank(maximumProfile)
      ? 0.6
      : clamp(0, Number(performanceMatches.coverage ?? 1), 1);

  const runtimeSupport = context.runtimeCapabilities ? 0.8 : 0.6;
  const compositionCompatibility = template.composition?.mode ? 0.8 : 0.5;
  const confidence = clamp(0, Number(candidate?.confidence ?? template.metadata?.confidence ?? 0.6), 1);

  const complexityBudget = context.sceneConstraints?.complexityBudget || context.metadata?.complexityBudget || {};
  const templateComplexity = Number(template.slots?.length || 0) + Number(template.regions?.length || 0);
  const maxComplexity = Number(complexityBudget.maxTemplateComplexity || 24);
  const complexityFit = templateComplexity <= maxComplexity ? 1 : clamp(0, 1 - safeRatio(templateComplexity - maxComplexity, maxComplexity || 1, 0), 1);

  const unresolvedPenalty = clamp(0, safeRatio(unresolvedRequirements.length, 6, 0), 1);

  const components = {
    capabilityCoverage,
    requirementCoverage,
    semanticCompatibility,
    slotCompatibility,
    layoutCompatibility,
    accessibility: accessibilityCoverage,
    performance: performanceCompatibility,
    runtimeSupport,
    composition: compositionCompatibility,
    confidence,
    complexityFit
  };

  let weighted = 0;
  Object.entries(components).forEach(([key, value]) => {
    weighted += value * (weights[key] || 0);
  });

  const penaltyWeight = weights.unresolvedPenalty || 0;
  const penalty = unresolvedPenalty * penaltyWeight;

  const normalizedScore = clamp(0, weighted - penalty, 1);
  const totalScore = clamp(0, normalizedScore * 100, 100);

  const bonuses = [];
  const penalties = [];

  if (capabilityCoverage >= 0.99) bonuses.push('required-capabilities-covered');
  if (accessibilityCoverage >= 0.8) bonuses.push('accessibility-coverage-strong');
  if (performanceCompatibility < 0.5) penalties.push('performance-constraint-pressure');
  if (unresolvedRequirements.length > 0) penalties.push('unresolved-requirements');
  if (eligibility?.hardFailures?.length) penalties.push('eligibility-hard-failures');

  const explanation = [
    `score=${totalScore.toFixed(2)}`,
    `capability=${capabilityCoverage.toFixed(2)}`,
    `requirements=${requirementCoverage.toFixed(2)}`,
    `accessibility=${accessibilityCoverage.toFixed(2)}`,
    `performance=${performanceCompatibility.toFixed(2)}`,
    `unresolvedPenalty=${unresolvedPenalty.toFixed(2)}`
  ].join('; ');

  return {
    totalScore: Number(totalScore.toFixed(3)),
    normalizedScore: Number(normalizedScore.toFixed(6)),
    confidence: Number(confidence.toFixed(6)),
    components,
    bonuses,
    penalties,
    explanation
  };
}
