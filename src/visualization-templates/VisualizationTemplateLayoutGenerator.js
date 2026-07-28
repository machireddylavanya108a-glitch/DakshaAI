import { resolveGenerationConfig } from './VisualizationTemplateGenerationConfig.js';

function count(value) {
  return Array.isArray(value) ? value.length : 0;
}

function clamp(min, value, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return min;
  return Math.max(min, Math.min(max, numeric));
}

function chooseLayoutIntent(blueprint = {}, context = {}) {
  const stepCount = Number(blueprint.timelinePlan?.stepCount || 0);
  const relationshipDensity = Number(blueprint.relationshipPlan?.density || 0);
  const depth = Number(blueprint.layoutPlan?.containmentDepth || 0);
  const interactionDepth = String(blueprint.interactionPlan?.depth || '').toLowerCase();
  const spatialRequired = context.visualizationRequirements?.spatialRequirement === true;

  if (spatialRequired && interactionDepth === 'deep') return 'spatial';
  if (stepCount >= 5) return 'flowing';
  if (depth >= 3) return 'nested';
  if (relationshipDensity >= 1.2) return 'network';
  if (relationshipDensity > 0.65) return 'layered';
  if (stepCount > 0) return 'linear';
  return blueprint.layoutPlan?.intentHint || 'adaptive';
}

export function generateTemplateLayout(blueprint = {}, context = {}, options = {}) {
  const config = resolveGenerationConfig(context, options);
  const intent = chooseLayoutIntent(blueprint, context);
  const conceptCount = count(blueprint.conceptPlan?.concepts);
  const relationCount = count(blueprint.relationshipPlan?.relationships);
  const spacingBase = config.profile === 'low' ? 0.9 : config.profile === 'high' ? 1.3 : 1.1;

  const spacing = {
    x: clamp(0.2, spacingBase + conceptCount * 0.02, 4),
    y: clamp(0.2, 1 + relationCount * 0.01, 3),
    z: clamp(0.2, spacingBase, 3)
  };

  return {
    strategy: intent,
    dimensionality: context.runtimeCapabilities?.supportsWebGL === false ? '2d' : 'adaptive',
    direction: blueprint.layoutPlan?.orderingRequired ? 'forward' : 'contextual',
    alignment: 'balanced',
    distribution: relationCount > conceptCount ? 'dense' : 'balanced',
    spacing,
    grouping: [],
    nesting: Number(blueprint.layoutPlan?.containmentDepth || 0) > 1,
    ordering: blueprint.layoutPlan?.orderingRequired ? 'priority' : 'contextual',
    collisionPolicy: 'avoid-overlap',
    overflowPolicy: 'defer-supporting',
    responsiveRules: [{ rule: 'small-screen', behavior: 'stacked' }],
    constraints: [
      { type: 'max-regions', value: config.maximumRegions },
      { type: 'max-slots', value: config.maximumSlots }
    ],
    metadata: {
      intent,
      conceptCount,
      relationCount,
      profile: config.profile,
      accessibilityAware: true
    }
  };
}
