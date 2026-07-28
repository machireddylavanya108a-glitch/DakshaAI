function toNumber(value, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(min, value, max) {
  return Math.max(min, Math.min(max, Number(value)));
}

function safeArray3(value, fallback = [1, 1, 1]) {
  if (Array.isArray(value) && value.length === 3) {
    const casted = value.map((item) => Number(item));
    if (casted.every((item) => Number.isFinite(item))) {
      return casted.map((item) => Math.max(0.01, item));
    }
  }
  return fallback;
}

export function generateEducationalObjectGeometry(representation = {}, concept = {}, context = {}, options = {}) {
  const importance = clamp(0, toNumber(concept.importance, concept.weight ?? 0.5), 1);
  const profile = String(options.performanceProfile || context.performanceProfile || 'balanced').toLowerCase();
  const mode = String(representation.mode || 'diagrammatic').toLowerCase();
  const lowPower = profile === 'low';

  const relativeScaleBase = lowPower ? 0.8 : profile === 'high' ? 1.2 : 1;
  const importanceScale = 0.8 + importance * 0.8;

  return {
    shapeIntent: mode.includes('symbolic') ? 'iconic-form' : mode.includes('procedural') ? 'process-form' : 'concept-form',
    relativeScale: safeArray3(concept.relativeScale, [
      Number((relativeScaleBase * importanceScale).toFixed(4)),
      Number((relativeScaleBase * importanceScale).toFixed(4)),
      Number((relativeScaleBase * importanceScale).toFixed(4))
    ]),
    proportions: mode.includes('spatial') ? 'volumetric-balanced' : 'compact-balanced',
    orientation: context.spatialRequirements?.orientation || 'contextual',
    volumeIntent: lowPower ? 'low-poly-hint' : 'adaptive-volume-hint',
    surfaceIntent: lowPower ? 'flat-surface-hint' : 'contoured-surface-hint',
    internalVisibility: context.accessibilityNeeds?.reducedMotionCompatible === true,
    crossSectionSuitability: mode.includes('hybrid') || mode.includes('diagrammatic'),
    explodedViewSuitability: mode.includes('spatial') || mode.includes('hybrid'),
    instancingSuitability: importance < 0.65,
    proceduralParameters: {
      detailHint: lowPower ? 'low' : profile === 'high' ? 'high' : 'medium',
      relationHint: Math.min(10, Number(context.relationships?.length || 0))
    },
    constraints: [
      'renderer-independent',
      'no-subject-geometry-rules',
      'no-threejs-geometry'
    ]
  };
}
