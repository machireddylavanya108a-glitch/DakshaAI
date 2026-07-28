function clamp(min, value, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

export function generateEducationalObjectVisualProperties(representation = {}, concept = {}, context = {}, options = {}) {
  const importance = clamp(0, Number(concept.importance ?? concept.weight ?? 0.5), 1);
  const profile = String(options.performanceProfile || context.performanceProfile || 'balanced').toLowerCase();
  const reducedMotion = context.accessibilityNeeds?.reducedMotionCompatible === true;
  const highContrast = context.accessibilityNeeds?.highContrastCompatible !== false;

  const highlightPriority = importance >= 0.7 ? 3 : importance >= 0.4 ? 2 : 1;
  const emphasis = highlightPriority === 3 ? 'high' : highlightPriority === 2 ? 'medium' : 'low';

  return {
    emphasis,
    visibility: true,
    opacityHint: highContrast ? 1 : 0.95,
    contrastIntent: highContrast ? 'high-legibility' : 'balanced-legibility',
    highlightPriority,
    labelVisibility: profile !== 'low' || importance >= 0.6,
    outlineIntent: highContrast ? 'strong' : 'soft',
    depthCueIntent: profile === 'low' ? 'minimal' : 'balanced',
    groupingIntent: representation.mode === 'hybrid' ? 'hierarchical' : 'contextual',
    selectionIntent: reducedMotion ? 'inspect' : 'inspect-and-focus',
    stateAppearance: {
      ready: 'neutral',
      active: 'focus',
      completed: 'resolved'
    },
    metadata: {
      accessibilityAware: true,
      profileAware: true
    }
  };
}
