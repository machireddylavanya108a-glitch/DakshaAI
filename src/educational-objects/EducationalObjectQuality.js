import { processEducationalObject } from './EducationalObjectVersionManager.js';

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

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

export function evaluateEducationalObjectQuality(objects = [], context = {}, options = {}) {
  const items = toArray(objects);
  const conceptIds = new Set(toArray(context.concepts).map((item) => String(item?.id || item?.conceptId || '')).filter(Boolean));
  const requiredRelations = toArray(context.relationships).filter((item) => item?.required === true);
  const slotBindings = toArray(context.slotBindings).map((item) => String(item?.slotId || '')).filter(Boolean);
  const regionBindings = toArray(context.regionBindings).map((item) => String(item?.regionId || '')).filter(Boolean);

  const processed = items.map((item) => processEducationalObject(item, { allowFallback: true }));
  const validCount = processed.filter((entry) => entry.valid).length;

  const objectConceptCoverageCount = processed.reduce((sum, entry) => {
    const matches = toArray(entry.object?.conceptReferences).filter((reference) => conceptIds.has(String(reference?.conceptId || ''))).length;
    return sum + (matches > 0 ? 1 : 0);
  }, 0);

  const relationIds = new Set(processed.flatMap((entry) => toArray(entry.object?.relationshipReferences).map((relation) => String(relation?.relationId || ''))));
  const requiredRelationshipCoverage = requiredRelations.length
    ? safeRatio(requiredRelations.filter((relation) => relationIds.has(String(relation?.id || relation?.relationId || ''))).length, requiredRelations.length, 0)
    : 1;

  const slotCoverage = slotBindings.length
    ? safeRatio(processed.filter((entry) => slotBindings.includes(String(entry.object?.templateBindings?.[0]?.slotId || ''))).length, slotBindings.length, 0)
    : 1;

  const regionCoverage = regionBindings.length
    ? safeRatio(processed.filter((entry) => regionBindings.includes(String(entry.object?.templateBindings?.[0]?.regionId || ''))).length, regionBindings.length, 0)
    : 1;

  const labelQuality = safeRatio(
    processed.filter((entry) => toArray(entry.object?.labels).length && String(entry.object?.labels?.[0]?.text || '').length <= 140).length,
    Math.max(1, processed.length),
    0
  );

  const narrationUniqueness = (() => {
    const narrationTexts = processed.map((entry) => String(entry.object?.narration?.shortText || entry.object?.narration?.text || '')).filter(Boolean);
    const unique = new Set(narrationTexts.map((item) => item.toLowerCase()));
    return narrationTexts.length ? safeRatio(unique.size, narrationTexts.length, 0) : 0.7;
  })();

  const accessibilityCoverage = safeRatio(
    processed.filter((entry) => {
      const accessibility = entry.object?.accessibility || {};
      return Boolean(accessibility.textDescription)
        && accessibility.keyboardAccessible === true
        && accessibility.focusable === true
        && accessibility.reducedMotionCompatible === true
        && accessibility.highContrastCompatible === true;
    }).length,
    Math.max(1, processed.length),
    0
  );

  const performanceCompatibility = safeRatio(
    processed.filter((entry) => Number(entry.object?.performance?.geometryBudget || 0) >= 0).length,
    Math.max(1, processed.length),
    0
  );

  const duplicationPenalty = (() => {
    const ids = processed.map((entry) => String(entry.object?.objectId || entry.object?.id || ''));
    const unique = new Set(ids);
    return ids.length ? 1 - safeRatio(unique.size, ids.length, 1) : 0;
  })();

  const unresolvedRequiredPenalty = requiredRelations.length > 0 && requiredRelationshipCoverage < 1
    ? 1 - requiredRelationshipCoverage
    : 0;

  const fallbackDependence = safeRatio(processed.filter((entry) => entry.status === 'fallback').length, Math.max(1, processed.length), 0);

  const components = {
    schemaValidity: safeRatio(validCount, Math.max(1, processed.length), 0),
    integrity: safeRatio(processed.filter((entry) => (entry.errors || []).length === 0).length, Math.max(1, processed.length), 0),
    conceptCoverage: conceptIds.size ? safeRatio(objectConceptCoverageCount, Math.max(1, conceptIds.size), 0) : 0.8,
    relationshipCoverage: requiredRelationshipCoverage,
    templateSlotCoverage: slotCoverage,
    regionCoverage,
    labelQuality,
    narrationUniqueness,
    accessibility: accessibilityCoverage,
    performanceCompatibility,
    timelineReadiness: toArray(context.orderedSteps).length ? 1 : 0.8,
    interactionReadiness: toArray(context.interactionRequirements).length ? 1 : 0.8,
    duplicationPenalty: 1 - duplicationPenalty,
    unresolvedRequiredPenalty: 1 - unresolvedRequiredPenalty,
    fallbackDependence: 1 - fallbackDependence,
    determinism: 1
  };

  const weights = {
    schemaValidity: 10,
    integrity: 10,
    conceptCoverage: 8,
    relationshipCoverage: 8,
    templateSlotCoverage: 6,
    regionCoverage: 6,
    labelQuality: 6,
    narrationUniqueness: 5,
    accessibility: 10,
    performanceCompatibility: 8,
    timelineReadiness: 4,
    interactionReadiness: 4,
    duplicationPenalty: 4,
    unresolvedRequiredPenalty: 4,
    fallbackDependence: 4,
    determinism: 3
  };

  const totalWeight = Object.values(weights).reduce((sum, value) => sum + value, 0);
  const weighted = Object.entries(components).reduce((sum, [key, value]) => sum + Number(value || 0) * (weights[key] || 0), 0);
  const score = Number((weighted / totalWeight * 100).toFixed(3));
  const threshold = Number(options.qualityThreshold || 65);
  const passed = score >= threshold && components.schemaValidity >= 0.75;

  const strengths = [];
  const weaknesses = [];
  if (components.accessibility >= 0.95) strengths.push('strong-accessibility-defaults');
  if (components.performanceCompatibility >= 0.95) strengths.push('performance-compatible');
  if (components.conceptCoverage >= 0.85) strengths.push('good-concept-coverage');
  if (components.relationshipCoverage < 0.8) weaknesses.push('relationship-coverage-gap');
  if (components.labelQuality < 0.8) weaknesses.push('label-quality-gap');
  if (components.fallbackDependence < 0.8) weaknesses.push('fallback-dependence-high');

  return {
    score,
    confidence: Number(clamp(0, (components.schemaValidity + components.integrity + components.conceptCoverage) / 3, 1).toFixed(6)),
    passed,
    components,
    strengths,
    weaknesses,
    warnings: [
      ...(components.relationshipCoverage < 1 ? ['required-relationship-coverage-incomplete'] : []),
      ...(components.templateSlotCoverage < 1 ? ['template-slot-coverage-incomplete'] : []),
      ...(components.regionCoverage < 1 ? ['region-coverage-incomplete'] : [])
    ],
    recommendations: [
      ...(components.labelQuality < 0.9 ? ['refine-label-density-and-length'] : []),
      ...(components.narrationUniqueness < 0.85 ? ['diversify-narration-summaries'] : []),
      ...(components.unresolvedRequiredPenalty < 1 ? ['repair-required-relationships'] : [])
    ]
  };
}
