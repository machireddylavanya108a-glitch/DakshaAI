export const VISUALIZATION_TEMPLATE_LATEST_VERSION = 'v1';

export const VISUALIZATION_TEMPLATE_DEFAULT_LIMITS = {
  maxSlots: 250,
  maxRegions: 100,
  maxRelationships: 1000,
  maxConditions: 250,
  maxVariables: 250,
  maxExtensionDepth: 12,
  maxArrayLength: 1000,
  maxStringLength: 4000,
  maxIdentifierLength: 160,
  maxNestingDepth: 20
};

export const VISUALIZATION_TEMPLATE_DEFAULTS = {
  status: 'active',
  source: 'runtime',
  semanticPurpose: 'adaptive-purpose',
  performanceProfiles: ['low', 'balanced', 'high', 'auto']
};

function toPositiveInt(value, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallback;
  return Math.round(numeric);
}

export function normalizeVisualizationTemplateConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const limits = {
    ...VISUALIZATION_TEMPLATE_DEFAULT_LIMITS,
    ...(source.limits && typeof source.limits === 'object' ? source.limits : {})
  };

  return {
    ...VISUALIZATION_TEMPLATE_DEFAULTS,
    ...source,
    limits: {
      maxSlots: toPositiveInt(limits.maxSlots, VISUALIZATION_TEMPLATE_DEFAULT_LIMITS.maxSlots),
      maxRegions: toPositiveInt(limits.maxRegions, VISUALIZATION_TEMPLATE_DEFAULT_LIMITS.maxRegions),
      maxRelationships: toPositiveInt(limits.maxRelationships, VISUALIZATION_TEMPLATE_DEFAULT_LIMITS.maxRelationships),
      maxConditions: toPositiveInt(limits.maxConditions, VISUALIZATION_TEMPLATE_DEFAULT_LIMITS.maxConditions),
      maxVariables: toPositiveInt(limits.maxVariables, VISUALIZATION_TEMPLATE_DEFAULT_LIMITS.maxVariables),
      maxExtensionDepth: toPositiveInt(limits.maxExtensionDepth, VISUALIZATION_TEMPLATE_DEFAULT_LIMITS.maxExtensionDepth),
      maxArrayLength: toPositiveInt(limits.maxArrayLength, VISUALIZATION_TEMPLATE_DEFAULT_LIMITS.maxArrayLength),
      maxStringLength: toPositiveInt(limits.maxStringLength, VISUALIZATION_TEMPLATE_DEFAULT_LIMITS.maxStringLength),
      maxIdentifierLength: toPositiveInt(limits.maxIdentifierLength, VISUALIZATION_TEMPLATE_DEFAULT_LIMITS.maxIdentifierLength),
      maxNestingDepth: toPositiveInt(limits.maxNestingDepth, VISUALIZATION_TEMPLATE_DEFAULT_LIMITS.maxNestingDepth)
    }
  };
}
