function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function normalizeToken(value, fallback) {
  const token = String(value || '').trim();
  return token || fallback;
}

export function selectEducationalObjectRepresentation(concept = {}, relationships = [], capabilities = [], context = {}, options = {}) {
  const relationCount = toArray(relationships).length;
  const capabilityCount = toArray(capabilities).length;
  const orderedSteps = toArray(context.orderedSteps).length;
  const interactionDepth = normalizeToken(context.interactionRequirements?.depth || context.interactionRequirements?.interactionDepth, 'light');
  const importance = Math.max(0, Math.min(1, toNumber(concept.importance, concept.weight ?? 0.5)));
  const performanceProfile = normalizeToken(options.performanceProfile || context.performanceProfile, 'balanced').toLowerCase();
  const reducedMotion = context.accessibilityNeeds?.reducedMotionCompatible === true;

  let mode = 'diagrammatic';
  if (relationCount >= 4 && capabilityCount >= 2) mode = 'hybrid';
  else if (orderedSteps >= 3 && interactionDepth !== 'light') mode = 'procedural';
  else if (relationCount <= 1 && importance <= 0.35) mode = 'symbolic';
  else if (relationCount >= 2) mode = 'spatial';

  let abstractionLevel = 'balanced';
  if (performanceProfile === 'low') abstractionLevel = 'high';
  if (performanceProfile === 'high' && importance >= 0.6) abstractionLevel = 'low';

  const dimensionality = mode === 'symbolic' ? '2d-preferred' : mode === 'spatial' || mode === 'hybrid' ? '3d-friendly' : 'adaptive';
  const visualDensity = relationCount >= 4 ? 'dense' : relationCount >= 2 ? 'balanced' : 'minimal';
  const preferredFidelity = performanceProfile === 'low' ? 'low' : performanceProfile === 'high' ? 'high' : 'balanced';

  const confidence = Math.max(0.25, Math.min(1,
    0.35
    + (importance * 0.25)
    + Math.min(0.15, relationCount * 0.03)
    + Math.min(0.15, capabilityCount * 0.04)
    + (reducedMotion ? 0.05 : 0)
  ));

  return {
    mode,
    dimensionality,
    abstractionLevel,
    proceduralSuitability: mode === 'procedural' || mode === 'hybrid' || mode === 'spatial',
    assetSuitability: preferredFidelity !== 'low',
    fallbackMode: reducedMotion ? 'text-assisted' : 'symbolic',
    preferredFidelity,
    visualDensity,
    labelStrategy: reducedMotion ? 'explicit' : 'contextual',
    confidence: Number(confidence.toFixed(6)),
    rationale: {
      relationCount,
      capabilityCount,
      orderedSteps,
      interactionDepth,
      importance,
      performanceProfile
    }
  };
}
