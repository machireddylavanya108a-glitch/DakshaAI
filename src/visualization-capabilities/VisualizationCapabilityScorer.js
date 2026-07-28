import { DEFAULT_SCORING_WEIGHTS, normalizeVisualizationCapabilityConfig } from './VisualizationCapabilityConfig.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function normalizeToken(value = '') {
  return String(value || '').trim().toLowerCase();
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function getValueByPath(source, path) {
  const parts = String(path || '').split('.').filter(Boolean);
  let current = source;
  for (const part of parts) {
    if (!current || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

function evaluateRule(rule, requirementContext = {}) {
  const fieldValue = getValueByPath(requirementContext, rule.field);
  const expected = rule.expectedValue;
  const operator = normalizeToken(rule.operator || 'exists');

  if (operator === 'exists') return fieldValue !== undefined && fieldValue !== null;
  if (operator === 'truthy') return Boolean(fieldValue);
  if (operator === 'eq') return fieldValue === expected;
  if (operator === 'neq') return fieldValue !== expected;
  if (operator === 'gt') return Number(fieldValue) > Number(expected);
  if (operator === 'gte') return Number(fieldValue) >= Number(expected);
  if (operator === 'lt') return Number(fieldValue) < Number(expected);
  if (operator === 'lte') return Number(fieldValue) <= Number(expected);
  if (operator === 'in') return Array.isArray(expected) ? expected.includes(fieldValue) : false;
  if (operator === 'includes') {
    if (Array.isArray(fieldValue)) return fieldValue.includes(expected);
    return String(fieldValue || '').includes(String(expected || ''));
  }
  if (operator === 'array_min_length') return Array.isArray(fieldValue) && fieldValue.length >= Number(expected || 0);

  return false;
}

export function scoreVisualizationCapabilityMatch(capability, requirements, options = {}) {
  const config = normalizeVisualizationCapabilityConfig(options);
  const weights = {
    ...DEFAULT_SCORING_WEIGHTS,
    ...(config.scoringWeights || {})
  };

  const preferred = toArray(requirements?.preferredCapabilities).map(normalizeToken);
  const actions = toArray(requirements?.requirements)
    .filter((rule) => normalizeToken(rule.field).includes('action'))
    .map((rule) => normalizeToken(rule.expectedValue));

  const semanticPurpose = normalizeToken(capability?.semanticPurpose);
  const semanticScore = preferred.length
    ? (preferred.includes(semanticPurpose) ? 1 : 0)
    : 0.5;

  const capabilityActions = toArray(capability?.supportedLearningActions).map(normalizeToken);
  const actionMatches = actions.length
    ? actions.filter((action) => capabilityActions.includes(action)).length / actions.length
    : (capabilityActions.length ? 0.6 : 0.5);

  const ruleChecks = toArray(capability?.inputRequirements);
  let metRequired = 0;
  let totalRequired = 0;
  let metWeighted = 0;
  let totalWeighted = 0;

  for (const rule of ruleChecks) {
    const weight = clamp(Number(rule.weight || 1), 0, 10);
    const met = evaluateRule(rule, requirements?.contextSummary || {});
    totalWeighted += weight;
    if (met) metWeighted += weight;
    if (rule.required !== false) {
      totalRequired += 1;
      if (met) metRequired += 1;
    }
  }

  const requirementScore = totalWeighted > 0 ? metWeighted / totalWeighted : 0.5;
  const requiredPenalty = totalRequired > 0 ? (1 - metRequired / totalRequired) : 0;

  const accessibilityNeed = requirements?.accessibilityNeeds || {};
  const accessibilityProps = capability?.accessibilityProperties || {};
  const accessibilityChecks = [
    accessibilityNeed.textAlternativeRequired ? accessibilityProps.textAlternativeRequired !== false : true,
    accessibilityNeed.keyboardCompatible ? accessibilityProps.keyboardCompatible !== false : true,
    accessibilityNeed.reducedMotionCompatible ? accessibilityProps.reducedMotionCompatible !== false : true,
    accessibilityNeed.highContrastCompatible ? accessibilityProps.highContrastCompatible !== false : true
  ];
  const accessibilityScore = accessibilityChecks.filter(Boolean).length / accessibilityChecks.length;

  const performanceProfile = normalizeToken(requirements?.performanceNeeds?.profile || 'balanced');
  const minimumProfile = normalizeToken(capability?.performanceProperties?.minimumProfile || 'low');
  const rank = { low: 1, balanced: 2, high: 3, auto: 2 };
  const performanceScore = (rank[performanceProfile] || 2) >= (rank[minimumProfile] || 1) ? 1 : 0.25;

  const spatialScore = capability?.spatialProperties ? 0.7 : 0.4;
  const temporalScore = capability?.temporalProperties ? 0.7 : 0.4;
  const interactionScore = capability?.interactionProperties ? 0.7 : 0.4;
  const compositionScore = Array.isArray(capability?.compositionRules) ? 0.7 : 0.4;
  const confidenceScore = clamp(Number(capability?.confidence || 0.5), 0, 1);

  const raw = (
    semanticScore * weights.semanticCompatibility
    + requirementScore * weights.inputRequirements
    + actionMatches * weights.learningActions
    + spatialScore * weights.spatialCompatibility
    + temporalScore * weights.temporalCompatibility
    + interactionScore * weights.interactionCompatibility
    + accessibilityScore * weights.accessibilityCompatibility
    + performanceScore * weights.performanceCompatibility
    + compositionScore * weights.compositionCompatibility
    + confidenceScore * weights.confidence
  );

  const penaltyPoints = requiredPenalty * 30;
  const bounded = clamp(raw - penaltyPoints, config.scoreRangeMin, config.scoreRangeMax);

  const explanation = [
    `semantic=${semanticScore.toFixed(2)}`,
    `requirements=${requirementScore.toFixed(2)}`,
    `accessibility=${accessibilityScore.toFixed(2)}`,
    `performance=${performanceScore.toFixed(2)}`,
    `requiredPenalty=${requiredPenalty.toFixed(2)}`
  ].join('; ');

  return {
    score: Number(bounded.toFixed(3)),
    confidence: Number(((confidenceScore * 0.6) + (1 - requiredPenalty) * 0.4).toFixed(3)),
    matchedRequirements: metRequired,
    unmetRequirements: Math.max(0, totalRequired - metRequired),
    explanation
  };
}
